// EdgeOne Function: AI 智能清单生成
export async function onRequestPost(context) {
    const { request, env } = context;
    
    try {
        const body = await request.json();
        const { 
            travel_days, 
            destination, 
            weather, 
            trip_purpose, 
            traveler_type, 
            preferences 
        } = body;
        
        // 检查必要参数
        if (!travel_days) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: '请提供旅行天数' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // 调用 GLM API 生成清单
        const glmApiKey = env.GLM_API_KEY;
        const glmModel = env.GLM_MODEL || 'GLM-4-FlashX-250414';
        
        // 检查 API Key
        if (!glmApiKey || glmApiKey === '你的_glm_key') {
            // 使用默认清单
            const listContent = generateDefaultList(travel_days, destination, weather);
            return await saveToDatabase(context, {
                travel_days, destination, weather, trip_purpose, traveler_type, preferences, listContent
            });
        }
        
        const prompt = generatePrompt({
            travel_days,
            destination,
            weather,
            trip_purpose,
            traveler_type,
            preferences
        });
        
        try {
            const glmResponse = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${glmApiKey}`
                },
                body: JSON.stringify({
                    model: glmModel,
                    messages: [
                        { role: 'system', content: '你是一个专业的旅行打包清单助手，根据用户的行程信息生成个性化的打包清单。' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.7,
                    max_tokens: 2000
                })
            });
            
            if (!glmResponse.ok) {
                // GLM API 调用失败，使用默认清单
                console.log('GLM API 调用失败，使用默认清单');
                const listContent = generateDefaultList(travel_days, destination, weather);
                return await saveToDatabase(context, {
                    travel_days, destination, weather, trip_purpose, traveler_type, preferences, listContent
                });
            }
            
            const responseText = await glmResponse.text();
            
            if (!responseText || responseText.trim() === '') {
                // 空响应，使用默认清单
                console.log('GLM API 返回空响应，使用默认清单');
                const listContent = generateDefaultList(travel_days, destination, weather);
                return await saveToDatabase(context, {
                    travel_days, destination, weather, trip_purpose, traveler_type, preferences, listContent
                });
            }
            
            let glmData;
            try {
                glmData = JSON.parse(responseText);
            } catch (parseError) {
                console.log('GLM API 返回无效 JSON，使用默认清单');
                const listContent = generateDefaultList(travel_days, destination, weather);
                return await saveToDatabase(context, {
                    travel_days, destination, weather, trip_purpose, traveler_type, preferences, listContent
                });
            }
            
            if (!glmData.choices || !glmData.choices[0] || !glmData.choices[0].message) {
                console.log('GLM API 返回格式错误，使用默认清单');
                const listContent = generateDefaultList(travel_days, destination, weather);
                return await saveToDatabase(context, {
                    travel_days, destination, weather, trip_purpose, traveler_type, preferences, listContent
                });
            }
            
            const aiContent = glmData.choices[0].message.content;
            
            // 解析 AI 返回的内容
            const listContent = parseAIResponse(aiContent);
            
            return await saveToDatabase(context, {
                travel_days, destination, weather, trip_purpose, traveler_type, preferences, listContent
            });
            
        } catch (apiError) {
            console.log('GLM API 调用异常，使用默认清单:', apiError.message);
            const listContent = generateDefaultList(travel_days, destination, weather);
            return await saveToDatabase(context, {
                travel_days, destination, weather, trip_purpose, traveler_type, preferences, listContent
            });
        }
        
    } catch (error) {
        console.error('AI生成错误:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function saveToDatabase(context, params) {
    const { env } = context;
    const { travel_days, destination, weather, trip_purpose, traveler_type, preferences, listContent } = params;
    
    // 保存到 Supabase
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase 配置缺失');
    }
    
    const saveResponse = await fetch(`${supabaseUrl}/rest/v1/packing_lists`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
            travel_days: parseInt(travel_days),
            destination: destination || null,
            weather: weather || '未指定',
            trip_purpose: trip_purpose || null,
            traveler_type: traveler_type || null,
            preferences: preferences || [],
            list_content: listContent,
            ai_tips: listContent.tips || null,
            ai_generated: true
        })
    });
    
    if (!saveResponse.ok) {
        const error = await saveResponse.text();
        throw new Error(error);
    }
    
    const savedData = await saveResponse.json();
    
    return new Response(JSON.stringify({
        success: true,
        data: savedData[0]
    }), {
        headers: { 'Content-Type': 'application/json' }
    });
}

function generateDefaultList(travelDays, destination, weather) {
    const mustHave = ['身份证', '手机', '充电器', '充电宝', `换洗衣物（${travelDays}套）`];
    const optional = ['洗漱用品'];
    
    // 根据目的地添加特色物品
    if (destination) {
        const dest = destination.toLowerCase();
        if (dest.includes('三亚') || dest.includes('海') || dest.includes('岛')) {
            mustHave.push('防晒霜', '泳衣', '墨镜');
            optional.push('沙滩拖鞋', '遮阳帽');
        } else if (dest.includes('北京') || dest.includes('上海') || dest.includes('城市')) {
            mustHave.push('雨伞');
            optional.push('舒适步行鞋');
        } else if (dest.includes('山') || dest.includes('徒步')) {
            mustHave.push('登山鞋', '背包');
            optional.push('登山杖', '护膝');
        }
    }
    
    // 根据天气添加物品
    if (weather === '雨天') {
        mustHave.push('雨具');
        optional.push('雨伞', '防水鞋套');
    } else if (weather === '低温' || weather === '寒冷') {
        mustHave.push('厚外套', '保暖内衣');
        optional.push('围巾', '手套', '帽子');
    } else if (weather === '晴天' || weather === '炎热') {
        mustHave.push('防晒霜');
        optional.push('帽子', '墨镜', '水壶');
    }
    
    return {
        must_have: mustHave,
        optional: optional,
        tips: destination ? `${destination}旅行，请根据实际情况调整清单` : '请根据实际情况调整清单'
    };
}

function generatePrompt(params) {
    const { travel_days, destination, weather, trip_purpose, traveler_type, preferences } = params;
    
    return `请为以下行程生成打包清单：

行程信息：
- 旅行天数：${travel_days}天
- 目的地：${destination || '未指定'}
- 天气：${weather || '未指定'}
- 出行目的：${trip_purpose || '未指定'}
- 旅行者类型：${traveler_type || '未指定'}
- 个人偏好：${preferences?.join(', ') || '无'}

请生成 JSON 格式的清单，包含以下字段：
{
    "must_have": ["必带物品1", "必带物品2", ...],
    "optional": ["可选物品1", "可选物品2", ...],
    "tips": "针对这个行程的特别提醒（50字以内）"
}

要求：
1. must_have 包含 8-12 个必带物品
2. optional 包含 4-6 个可选物品
3. 物品要具体实用
4. 考虑目的地特色和天气
5. 只返回 JSON，不要其他文字`;
}

function parseAIResponse(content) {
    try {
        // 尝试提取 JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            // 验证必要字段
            if (parsed.must_have && Array.isArray(parsed.must_have)) {
                return parsed;
            }
        }
        
        // 如果无法解析，返回默认结构
        return {
            must_have: ['身份证', '手机', '充电器'],
            optional: ['洗漱用品'],
            tips: '请根据实际情况调整清单'
        };
    } catch (e) {
        return {
            must_have: ['身份证', '手机', '充电器'],
            optional: ['洗漱用品'],
            tips: '请根据实际情况调整清单'
        };
    }
}
