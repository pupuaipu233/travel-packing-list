// EdgeOne Edge Function: AI 智能生成清单 API
// 使用智谱 GLM-4 API

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

export function onRequestPost(context) {
    return handleRequest(context);
}

export function onRequest(context) {
    const { request } = context;
    
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }
    
    return handleRequest(context);
}

async function handleRequest(context) {
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

        if (!travel_days || !destination) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: '请提供旅行天数和目的地' 
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const apiKey = env.GLM_API_KEY || '175790c2e5924b7292a1644e2b2d6347.0wDQoz1XI7GoZ0Wu';
        const model = env.GLM_MODEL || 'glm-4-flash';

        if (!apiKey) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'AI 服务未配置' 
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const prompt = buildPrompt({
            travel_days,
            destination,
            weather,
            trip_purpose,
            traveler_type,
            preferences
        });

        const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: '你是一个专业的旅行打包清单助手。请根据用户提供的信息，生成一份详细的旅行打包清单。返回 JSON 格式：{"must_have": ["物品1", "物品2"], "optional": ["物品1", "物品2"], "tips": "提醒建议"}'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`GLM API 错误: ${errorData}`);
        }

        const aiData = await response.json();
        const aiContent = aiData.choices[0].message.content;

        let listContent;
        try {
            listContent = JSON.parse(aiContent);
        } catch (e) {
            const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                listContent = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('AI 返回格式错误');
            }
        }

        if (!listContent.must_have || !Array.isArray(listContent.must_have)) {
            listContent.must_have = [];
        }
        if (!listContent.optional || !Array.isArray(listContent.optional)) {
            listContent.optional = [];
        }
        if (!listContent.tips) {
            listContent.tips = '请根据实际情况调整清单';
        }

        return new Response(JSON.stringify({
            success: true,
            data: {
                list_content: listContent,
                ai_tips: listContent.tips,
                ai_generated: true
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('AI 生成错误:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message 
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

function buildPrompt(params) {
    const { travel_days, destination, weather, trip_purpose, traveler_type, preferences } = params;
    
    let prompt = `请为以下行程生成打包清单：\n\n`;
    prompt += `- 旅行天数：${travel_days}天\n`;
    prompt += `- 目的地：${destination}\n`;
    
    if (weather) {
        prompt += `- 天气情况：${weather}\n`;
    }
    if (trip_purpose) {
        prompt += `- 出行目的：${trip_purpose}\n`;
    }
    if (traveler_type) {
        prompt += `- 旅行者类型：${traveler_type}\n`;
    }
    if (preferences && preferences.length > 0) {
        prompt += `- 个人偏好：${preferences.join(', ')}\n`;
    }
    
    prompt += `\n请生成一份详细的打包清单，包含：\n`;
    prompt += `1. must_have: 必带物品（最多15件，包含证件、电子设备、衣物等必需品）\n`;
    prompt += `2. optional: 可选物品（最多10件，根据行程特点推荐）\n`;
    prompt += `3. tips: 特别提醒（针对此行程的打包建议）\n`;
    prompt += `\n请以 JSON 格式返回。`;
    
    return prompt;
}
