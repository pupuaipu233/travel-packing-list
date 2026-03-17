require('dotenv').config();

const weatherService = require('./seniverse-weather-service');
const destinationItemsService = require('./destination-items-service');

// GLM API配置
const GLM_API_KEY = process.env.GLM_API_KEY;
const GLM_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

/**
 * 生成智能打包清单 - 使用GLM API（增强版）
 * @param {Object} params - 行程参数
 * @param {number} params.travel_days - 旅行天数
 * @param {string} params.destination - 目的地
 * @param {string} params.weather - 天气（可选，会自动识别）
 * @param {string} params.trip_purpose - 出行目的
 * @param {string} params.traveler_type - 旅行者类型
 * @param {string[]} params.preferences - 个人偏好
 * @returns {Promise<Object>} - 生成的清单
 */
async function generateSmartPackingList(params) {
    let { travel_days, destination, weather, trip_purpose, traveler_type, preferences } = params;

    // 1. 自动识别天气（如果未提供且提供了目的地）
    let weatherData = null;
    if (!weather && destination) {
        try {
            weatherData = await weatherService.getWeatherByDestination(destination);
            weather = weatherData.weather;
            console.log(`自动识别天气: ${destination} -> ${weather}`);
        } catch (error) {
            console.error('自动识别天气失败:', error);
        }
    }

    // 2. 获取目的地特色物品
    let destinationItems = null;
    if (destination) {
        try {
            destinationItems = await destinationItemsService.getItemsByDestination(destination, weather);
            console.log(`获取到${destination}的特色物品:`, 
                destinationItems.must_have.length + destinationItems.optional.length, '项');
        } catch (error) {
            console.error('获取目的地物品失败:', error);
        }
    }

    // 3. 构建增强Prompt
    const prompt = buildEnhancedPrompt({
        travel_days,
        destination,
        weather,
        weatherData,
        trip_purpose,
        traveler_type,
        preferences,
        destinationItems
    });

    // 尝试调用GLM-4-FlashX-250414模型
    console.log('开始调用GLM-4-FlashX-250414 API...');
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20秒超时
        
        const response = await fetch(GLM_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GLM_API_KEY}`
            },
            body: JSON.stringify({
                model: 'GLM-4-FlashX-250414',
                messages: [
                    {
                        role: 'system',
                        content: '你是一个专业的旅行打包专家，擅长根据行程信息生成实用、个性化的打包清单。'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 800
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        console.log('GLM API响应状态:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('GLM API错误响应:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('GLM API返回数据成功');
        
        // 解析AI响应
        const content = data.choices[0].message.content;
        console.log('AI原始响应:', content.substring(0, 200) + '...');
        
        const result = parseAIResponse(content);
        console.log('解析后的结果:', JSON.stringify(result, null, 2));

        return {
            success: true,
            data: result,
            raw_response: content
        };
    } catch (error) {
        console.error('GLM API调用失败，使用本地智能生成:', error.message);
        
        // 使用本地智能生成作为fallback
        const localResult = generateLocalList({
            travel_days,
            destination,
            weather,
            weatherData,
            trip_purpose,
            traveler_type,
            preferences,
            destinationItems
        });
        
        return {
            success: true,
            data: localResult,
            raw_response: '本地智能生成（GLM API失败）'
        };
    }
}

/**
 * 构建增强版Prompt
 * @param {Object} params - 行程参数
 * @returns {string} - Prompt字符串
 */
function buildEnhancedPrompt(params) {
    const { 
        travel_days, 
        destination, 
        weather, 
        weatherData, 
        trip_purpose, 
        traveler_type, 
        preferences,
        destinationItems 
    } = params;

    // 构建天气信息文本
    let weatherInfo = weather || '未指定';
    if (weatherData) {
        weatherInfo += `（${weatherData.temperature}`;
        if (weatherData.humidity) {
            weatherInfo += `，湿度${weatherData.humidity}`;
        }
        if (weatherData.suggestions) {
            weatherInfo += `，${weatherData.suggestions}`;
        }
        weatherInfo += '）';
    }

    // 构建目的地特色物品文本
    let itemsInfo = '';
    if (destinationItems) {
        if (destinationItems.must_have && destinationItems.must_have.length > 0) {
            itemsInfo += `\n【必带特色物品】${destinationItems.must_have.map(i => i.item_name).join('、')}`;
        }
        if (destinationItems.optional && destinationItems.optional.length > 0) {
            itemsInfo += `\n【可选特色物品】${destinationItems.optional.slice(0, 5).map(i => i.item_name).join('、')}`;
        }
        if (destinationItems.special && destinationItems.special.length > 0) {
            itemsInfo += `\n【特殊物品】${destinationItems.special.map(i => i.item_name).join('、')}`;
        }
    }

    // 详细特色物品信息
    let itemsText = '';
    if (destinationItems) {
        const mustItems = destinationItems.must_have?.slice(0, 8).map(i => i.item_name).join('、') || '';
        const optItems = destinationItems.optional?.slice(0, 8).map(i => i.item_name).join('、') || '';
        const specItems = destinationItems.special?.slice(0, 5).map(i => i.item_name).join('、') || '';
        if (mustItems) itemsText += `必带特色：${mustItems}。`;
        if (optItems) itemsText += `可选特色：${optItems}。`;
        if (specItems) itemsText += `特殊物品：${specItems}。`;
    }

    // 衣物数量计算
    const underwearCount = travel_days + 1;
    const socksCount = travel_days + 1;
    const outfitsCount = Math.min(travel_days, 7);

    // 根据出行目的添加专业物品
    let purposeItems = '';
    switch(trip_purpose) {
        case '商务':
            purposeItems = '正装衬衫、西装外套、领带（可选）、名片、笔记本电脑、充电线、便携鼠标、文件夹';
            break;
        case '度假':
            purposeItems = '泳衣、沙滩裤、太阳镜、防晒霜、凉拖、遮阳帽、泳镜、耳塞';
            break;
        case '户外':
            purposeItems = '登山鞋、冲锋衣、登山包、头灯、登山杖、多功能刀具、指南针、急救包';
            break;
        case '探亲':
            purposeItems = '礼物、特产、红包（可选）、家庭照片、常用药品';
            break;
        case '文化':
            purposeItems = '相机、充电宝、笔记本、笔、地图、导览APP、折叠凳';
            break;
        case '购物':
            purposeItems = '购物袋、现金、信用卡、充电宝、清单APP';
            break;
    }

    // 根据旅行者类型添加特殊物品
    let travelerItems = '';
    switch(traveler_type) {
        case '单人':
            travelerItems = '自拍杆、充电宝';
            break;
        case '情侣':
            travelerItems = '情侣装（可选）、充电宝、自拍杆';
            break;
        case '亲子':
            travelerItems = '儿童零食、玩具、绘本、iPad、常用药、体温计、湿纸巾、备用衣物';
            break;
        case '朋友':
            travelerItems = '充电宝、游戏设备、相机';
            break;
        case '老年':
            travelerItems = '常用药品、血压计、舒适鞋子、拐杖（可选）、老花镜';
            break;
    }

    // 简化K-shot示例，只保留格式
    const kshotExample = `示例格式：
必带：身份证、手机充电器、具体物品（数量）
可选：物品1、物品2
电子设备：手机、充电宝
洗漱用品：牙刷、牙膏
证件：身份证
提醒：具体建议+APP推荐`;

    return `作为旅行打包专家，为${destination || '目的地'}${travel_days}天行程生成清单。

【参考格式】${kshotExample}

【行程信息】
天数：${travel_days}天 | 目的地：${destination} | 天气：${weatherInfo}
目的：${trip_purpose || '旅游'} | 类型：${traveler_type || '个人'} | 偏好：${preferences?.join('、') || '无'}

【知识库】${itemsText ? itemsText.substring(0, 200) : '无'}
目的专用：${purposeItems.substring(0, 100)}
类型专用：${travelerItems.substring(0, 100)}

【衣物】内衣${underwearCount}件，袜子${socksCount}双，外套${outfitsCount}套

【输出JSON】
{"must_have":["具体物品"],"optional":["物品"],"tech_electronics":["设备"],"personal_care":["洗漱"],"documents":["证件"],"tips":"提醒"}`;
}

/**
 * 构建基础Prompt（兼容旧版本）
 * @param {Object} params - 行程参数
 * @returns {string} - Prompt字符串
 */
function buildPrompt(params) {
    const { travel_days, destination, weather, trip_purpose, traveler_type, preferences } = params;

    return `作为旅行打包专家，请为以下行程生成个性化打包清单：

行程信息：
- 天数：${travel_days}天
- 目的地：${destination || '未指定'}
- 天气：${weather || '未指定'}
- 出行目的：${trip_purpose || '未指定'}
- 旅行者类型：${traveler_type || '未指定'}
- 个人偏好：${preferences && preferences.length > 0 ? preferences.join('、') : '无'}

请生成：
1. 必带物品（${Math.min(5 + Math.floor(travel_days / 2), 12)}项，根据天数${travel_days}天调整）
2. 可选物品（3-8项）
3. 特别提醒（天气、目的地特殊注意事项，100字以内）

输出要求：
- 物品要具体实用，不要笼统
- 考虑目的地特色和当地天气
- 考虑旅行者类型和出行目的的特殊需求
- 考虑个人偏好的相关物品
- 必须是有效的JSON格式

输出格式：
{
    "must_have": ["物品1", "物品2", ...],
    "optional": ["物品1", "物品2", ...],
    "tips": "特别提醒内容"
}`;
}

/**
 * 本地智能生成清单（GLM API失败时的fallback）
 * @param {Object} params - 行程参数
 * @returns {Object} - 生成的清单
 */
function generateLocalList(params) {
    const { travel_days, destination, weather, weatherData, trip_purpose, traveler_type, preferences, destinationItems } = params;
    
    const mustHave = ['身份证', '手机', '充电器', '充电宝'];
    const optional = ['洗漱用品', '纸巾', '零食'];
    
    // 根据天数添加衣物
    const clothingCount = Math.min(travel_days, 7);
    mustHave.push(`${clothingCount}套换洗衣物`);
    
    // 根据天气添加物品
    if (weather === '低温' || weather === '寒冷') {
        mustHave.push('厚外套', '保暖内衣');
        optional.push('围巾', '手套', '暖宝宝');
    } else if (weather === '炎热' || weather === '晴天') {
        mustHave.push('防晒霜');
        optional.push('墨镜', '遮阳帽');
    } else if (weather === '雨天') {
        mustHave.push('雨伞');
        optional.push('防水鞋套');
    }
    
    // 添加目的地特色物品
    if (destinationItems?.must_have?.length > 0) {
        destinationItems.must_have.slice(0, 5).forEach(item => {
            if (!mustHave.includes(item.item_name)) {
                mustHave.push(item.item_name);
            }
        });
    }
    
    if (destinationItems?.optional?.length > 0) {
        destinationItems.optional.slice(0, 3).forEach(item => {
            if (!optional.includes(item.item_name)) {
                optional.push(item.item_name);
            }
        });
    }
    
    // 生成tips
    let tips = `${destination || '目的地'}${travel_days}天行程，天气${weather || '未知'}。`;
    if (weatherData?.suggestions) {
        tips += weatherData.suggestions;
    }
    
    return {
        must_have: mustHave.slice(0, 10),
        optional: optional.slice(0, 8),
        tips: tips
    };
}

/**
 * 解析AI响应
 * @param {string} content - AI返回的内容
 * @returns {Object} - 解析后的结果
 */
function parseAIResponse(content) {
    try {
        // 尝试直接解析JSON
        return JSON.parse(content);
    } catch (e) {
        // 如果直接解析失败，尝试提取JSON部分
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            } catch (e2) {
                console.error('JSON解析失败:', e2);
            }
        }

        // 如果都失败，返回默认结构
        console.error('无法解析AI响应:', content);
        return {
            must_have: ['身份证', '手机', '充电器', '换洗衣物', '充电宝'],
            optional: ['洗漱用品'],
            tips: '请检查行李清单，确保重要物品不遗漏。'
        };
    }
}

/**
 * 验证行程参数
 * @param {Object} params - 行程参数
 * @returns {Object} - 验证结果
 */
function validateParams(params) {
    const errors = [];

    if (!params.travel_days || params.travel_days < 1 || params.travel_days > 30) {
        errors.push('旅行天数必须在1-30天之间');
    }

    if (params.destination && params.destination.length > 100) {
        errors.push('目的地名称过长');
    }

    if (params.trip_purpose && params.trip_purpose.length > 50) {
        errors.push('出行目的描述过长');
    }

    if (params.traveler_type && params.traveler_type.length > 50) {
        errors.push('旅行者类型描述过长');
    }

    if (params.preferences && !Array.isArray(params.preferences)) {
        errors.push('个人偏好必须是数组');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

module.exports = {
    generateSmartPackingList,
    validateParams
};
