require('dotenv').config();

const supabase = require('./db');
const crypto = require('crypto');

// 心知天气API配置
const SENIVERSE_PUBLIC_KEY = process.env.SENIVERSE_PUBLIC_KEY;
const SENIVERSE_PRIVATE_KEY = process.env.SENIVERSE_PRIVATE_KEY;
const SENIVERSE_API_URL = 'https://api.seniverse.com/v3';

// 添加调试日志
console.log('心知天气服务初始化...');
console.log('公钥状态:', SENIVERSE_PUBLIC_KEY ? '已配置' : '未配置');

/**
 * 生成心知天气API签名 (HMAC-SHA1)
 * @param {string} publicKey - 公钥
 * @param {string} privateKey - 私钥
 * @returns {Object} - 包含ts和sig的对象
 */
function generateSignature(publicKey, privateKey) {
    const ts = Math.floor(Date.now() / 1000).toString();
    const ttl = '300'; // 5分钟有效期
    
    // 1. 构造验证参数字符串（按参数名字典升序排列）
    const paramsStr = `ts=${ts}&ttl=${ttl}&uid=${publicKey}`;
    
    // 2. 使用 HMAC-SHA1 方式，以私钥对参数字符串进行加密
    const hmac = crypto.createHmac('sha1', privateKey);
    hmac.update(paramsStr);
    
    // 3. 将加密结果用 Base64 编码，并做 URLEncode
    const sig = encodeURIComponent(hmac.digest('base64'));
    
    return { ts, ttl, sig };
}

/**
 * 获取目的地天气（心知天气版本）
 * @param {string} destination - 目的地名称
 * @returns {Promise<Object>} - 天气信息
 */
async function getWeatherByDestination(destination) {
    try {
        // 1. 先查缓存
        const cached = await checkWeatherCache(destination);
        if (cached && !isCacheExpired(cached)) {
            console.log(`使用缓存的天气数据: ${destination}`);
            return {
                ...cached.weather_data,
                source: 'cache',
                cached: true
            };
        }

        // 2. 调用心知天气API
        const weatherData = await callSeniverseAPI(destination);
        
        // 3. 保存缓存
        await saveWeatherCache(destination, weatherData);
        
        return {
            ...weatherData,
            source: 'api',
            cached: false
        };
    } catch (error) {
        console.error(`获取${destination}天气失败:`, error);
        
        // 4. 使用兜底方案：查询映射表
        const fallbackData = await getWeatherFromMapping(destination);
        if (fallbackData) {
            return {
                ...fallbackData,
                source: 'fallback',
                cached: false
            };
        }
        
        // 5. 最终兜底：返回默认天气
        return getDefaultWeather(destination);
    }
}

/**
 * 调用心知天气API
 * @param {string} destination - 目的地名称
 * @returns {Promise<Object>} - 天气数据
 */
async function callSeniverseAPI(destination) {
    if (!SENIVERSE_PUBLIC_KEY || !SENIVERSE_PRIVATE_KEY) {
        throw new Error('未配置心知天气API Key');
    }

    // 生成签名
    const { ts, ttl, sig } = generateSignature(SENIVERSE_PUBLIC_KEY, SENIVERSE_PRIVATE_KEY);
    
    // 构建API URL (心知天气V3版本)
    const apiUrl = `${SENIVERSE_API_URL}/weather/daily.json?location=${encodeURIComponent(destination)}&days=3&ts=${ts}&ttl=${ttl}&uid=${SENIVERSE_PUBLIC_KEY}&sig=${sig}`;
    
    console.log('调用心知天气API:', apiUrl.replace(sig, '***'));
    
    const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
            'Accept': 'application/json'
        }
    });
    
    console.log('心知天气API响应状态:', response.status);
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error('心知天气API错误:', errorText);
        throw new Error(`心知天气API请求失败: HTTP ${response.status}`);
    }
    
    const data = await response.json();
    console.log('心知天气API返回数据:', JSON.stringify(data, null, 2));
    
    // 检查响应状态
    if (!data.results || data.results.length === 0) {
        throw new Error('心知天气API返回数据为空');
    }
    
    // 转换为内部格式
    return convertSeniverseFormat(data.results[0]);
}

/**
 * 转换心知天气数据格式
 * @param {Object} result - 心知天气返回的结果
 * @returns {Object} - 标准化的天气数据
 */
function convertSeniverseFormat(result) {
    const location = result.location;
    const today = result.daily[0]; // 今天的预报
    
    const tempMax = parseInt(today.high);
    const tempMin = parseInt(today.low);
    const temp = Math.round((tempMax + tempMin) / 2);
    
    // 根据天气代码判断天气类型
    const weatherCode = parseInt(today.code_day);
    let weather = '晴天';
    let weatherType = 'sunny';
    
    // 心知天气代码映射（部分）
    if (weatherCode === 0 || weatherCode === 1 || weatherCode === 2 || weatherCode === 3) {
        weather = '晴天';
        weatherType = 'sunny';
    } else if (weatherCode === 4 || weatherCode === 5 || weatherCode === 6 || weatherCode === 7 || weatherCode === 8) {
        weather = '多云';
        weatherType = 'cloudy';
    } else if (weatherCode >= 9 && weatherCode <= 19) {
        weather = '雨天';
        weatherType = 'rainy';
    } else if (weatherCode >= 20 && weatherCode <= 26) {
        weather = '低温'; // 雪天
        weatherType = 'snowy';
    } else {
        weather = '多云';
        weatherType = 'cloudy';
    }
    
    // 根据温度调整
    if (tempMax >= 30) {
        weather = '炎热';
        weatherType = 'hot';
    } else if (tempMin <= 5) {
        weather = '低温';
        weatherType = 'cold';
    }
    
    // 构建3天预报
    const forecast3d = result.daily.map(day => ({
        date: day.date,
        weather: day.text_day,
        tempMax: `${day.high}°C`,
        tempMin: `${day.low}°C`,
        icon: day.code_day
    }));
    
    return {
        destination: location.name,
        province: location.path.split(',')[1] || null,
        weather,
        weatherType,
        temperature: `${temp}°C`,
        tempRange: `${tempMin}°C ~ ${tempMax}°C`,
        humidity: today.humidity ? `${today.humidity}%` : null,
        wind: today.wind_direction ? `${today.wind_direction} ${today.wind_scale}级` : null,
        precip: today.rainfall ? `${today.rainfall}mm` : null,
        suggestions: generateWeatherSuggestions(weather, temp, today),
        forecast3d,
        updatedAt: new Date().toISOString()
    };
}

/**
 * 生成天气建议
 * @param {string} weather - 天气类型
 * @param {number} temp - 温度
 * @param {Object} today - 详细天气数据
 * @returns {string} - 建议文本
 */
function generateWeatherSuggestions(weather, temp, today) {
    const suggestions = [];
    
    if (weather === '炎热' || temp >= 30) {
        suggestions.push('天气炎热，注意防暑降温');
        suggestions.push('建议携带防晒霜、墨镜、遮阳帽');
    } else if (weather === '低温' || temp <= 5) {
        suggestions.push('天气较冷，注意保暖');
        suggestions.push('建议携带厚外套、围巾、手套');
    } else if (weather === '雨天') {
        suggestions.push('有雨，记得带伞');
        suggestions.push('建议穿防水鞋');
    } else if (weather === '雪天') {
        suggestions.push('有雪，注意防寒防滑');
        suggestions.push('建议穿防滑鞋');
    } else if (weather === '多云') {
        suggestions.push('多云天气，适合出行');
    } else if (weather === '晴天') {
        suggestions.push('天气晴朗，适合出行');
        suggestions.push('注意防晒');
    }
    
    if (today && today.humidity) {
        const humidity = parseInt(today.humidity);
        if (humidity > 80) {
            suggestions.push('湿度较高，注意防潮');
        } else if (humidity < 30) {
            suggestions.push('空气干燥，注意保湿');
        }
    }
    
    return suggestions.join('；');
}

/**
 * 检查天气缓存
 * @param {string} destination - 目的地
 * @returns {Promise<Object|null>} - 缓存数据
 */
async function checkWeatherCache(destination) {
    try {
        const { data, error } = await supabase
            .from('weather_api_cache')
            .select('*')
            .eq('destination', destination)
            .single();
        
        if (error || !data) {
            return null;
        }
        
        return data;
    } catch (error) {
        console.error('检查天气缓存失败:', error);
        return null;
    }
}

/**
 * 保存天气缓存
 * @param {string} destination - 目的地
 * @param {Object} weatherData - 天气数据
 */
async function saveWeatherCache(destination, weatherData) {
    try {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1); // 缓存1小时
        
        const { error } = await supabase
            .from('weather_api_cache')
            .upsert({
                destination,
                weather_data: weatherData,
                cached_at: new Date().toISOString(),
                expires_at: expiresAt.toISOString()
            });
        
        if (error) {
            console.error('保存天气缓存失败:', error);
        }
    } catch (error) {
        console.error('保存天气缓存失败:', error);
    }
}

/**
 * 检查缓存是否过期
 * @param {Object} cacheData - 缓存数据
 * @returns {boolean} - 是否过期
 */
function isCacheExpired(cacheData) {
    if (!cacheData.expires_at) {
        return true;
    }
    
    const expiresAt = new Date(cacheData.expires_at);
    return new Date() > expiresAt;
}

/**
 * 从映射表获取天气（兜底方案）
 * @param {string} destination - 目的地
 * @returns {Promise<Object|null>} - 天气数据
 */
async function getWeatherFromMapping(destination) {
    try {
        const { data, error } = await supabase
            .from('destination_weather')
            .select('*')
            .eq('destination', destination)
            .single();
        
        if (error || !data) {
            return null;
        }
        
        return {
            destination: data.destination,
            province: null,
            weather: data.default_weather,
            weatherType: mapWeatherToType(data.default_weather),
            temperature: data.default_temp_range,
            tempRange: data.default_temp_range,
            source: 'mapping',
            suggestions: `${data.destination}属于${data.destination_type}，${data.default_weather}，建议做好准备`
        };
    } catch (error) {
        console.error('从映射表获取天气失败:', error);
        return null;
    }
}

/**
 * 获取默认天气（最终兜底）
 * @param {string} destination - 目的地
 * @returns {Object} - 默认天气数据
 */
function getDefaultWeather(destination) {
    return {
        destination,
        province: null,
        weather: '晴天',
        weatherType: 'sunny',
        temperature: '20-25°C',
        tempRange: '20-25°C',
        source: 'default',
        suggestions: '无法获取准确天气，默认按晴天准备，建议出发前查看最新天气预报'
    };
}

/**
 * 映射天气文本到类型
 * @param {string} weather - 天气文本
 * @returns {string} - 天气类型
 */
function mapWeatherToType(weather) {
    const mapping = {
        '炎热': 'hot',
        '高温': 'hot',
        '晴天': 'sunny',
        '多云': 'cloudy',
        '阴天': 'cloudy',
        '雨天': 'rainy',
        '下雨': 'rainy',
        '低温': 'cold',
        '寒冷': 'cold',
        '雪天': 'snowy',
        '干燥': 'dry',
        '湿润': 'humid'
    };
    
    return mapping[weather] || 'sunny';
}

module.exports = {
    getWeatherByDestination,
    callSeniverseAPI,
    convertSeniverseFormat,
    generateWeatherSuggestions,
    generateSignature
};
