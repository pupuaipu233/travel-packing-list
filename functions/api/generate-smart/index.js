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
        
        // 调用 GLM API 生成清单
        const glmApiKey = env.GLM_API_KEY;
        const glmModel = env.GLM_MODEL || 'GLM-4-FlashX-250414';
        
        const prompt = generatePrompt({
            travel_days,
            destination,
            weather,
            trip_purpose,
            traveler_type,
            preferences
        });
        
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
            const error = await glmResponse.text();
            throw new Error(`GLM API 错误: ${error}`);
        }
        
        const glmData = await glmResponse.json();
        const aiContent = glmData.choices[0].message.content;
        
        // 解析 AI 返回的内容
        const listContent = parseAIResponse(aiContent);
        
        // 保存到 Supabase
        const supabaseUrl = env.SUPABASE_URL;
        const supabaseKey = env.SUPABASE_KEY;
        
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
    } catch (error) {
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
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
            return JSON.parse(jsonMatch[0]);
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
