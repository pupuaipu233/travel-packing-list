// EdgeOne Pages Function: API Router
// 统一处理所有 API 请求

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;
        
        // 设置 CORS 头
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        // 处理 OPTIONS 请求
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }
        
        // 路由分发
        if (path === '/api/weather' && request.method === 'GET') {
            return handleWeather(request, env, corsHeaders);
        } else if (path === '/api/generate-smart' && request.method === 'POST') {
            return handleGenerateSmart(request, env, corsHeaders);
        }
        
        // 静态资源请求，继续到静态托管
        return env.ASSETS.fetch(request);
    }
};

// 天气查询处理
async function handleWeather(request, env, corsHeaders) {
    try {
        const url = new URL(request.url);
        const destination = url.searchParams.get('destination');
        
        if (!destination) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: '请提供目的地参数' 
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 心知天气 API 配置
        const publicKey = env.SENIVERSE_PUBLIC_KEY;
        const privateKey = env.SENIVERSE_PRIVATE_KEY;
        
        if (!publicKey || !privateKey) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: '天气服务未配置' 
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 生成签名
        const ts = Math.floor(Date.now() / 1000);
        const ttl = 300;
        const uid = 'user_' + ts;
        const sigStr = `ts=${ts}&ttl=${ttl}&uid=${uid}${privateKey}`;
        
        // 使用 Web Crypto API 生成 HMAC-SHA1
        const encoder = new TextEncoder();
        const keyData = encoder.encode(privateKey);
        const msgData = encoder.encode(sigStr);
        
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-1' },
            false,
            ['sign']
        );
        
        const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
        const sig = btoa(String.fromCharCode(...new Uint8Array(signature)));

        // 调用心知天气 API
        const weatherUrl = `https://api.seniverse.com/v3/weather/daily.json?key=${publicKey}&location=${encodeURIComponent(destination)}&language=zh-Hans&unit=c&start=0&days=3&ts=${ts}&ttl=${ttl}&uid=${uid}&sig=${sig}`;
        
        const response = await fetch(weatherUrl);
        const data = await response.json();
        
        if (data.results && data.results[0]) {
            const weatherData = data.results[0];
            const daily = weatherData.daily[0];
            
            // 格式化未来3天预报
            const forecast3d = weatherData.daily.map(day => ({
                date: day.date,
                weather: day.text_day,
                tempMin: day.low,
                tempMax: day.high
            }));

            return new Response(JSON.stringify({
                success: true,
                data: {
                    destination: weatherData.location.name,
                    weather: daily.text_day,
                    tempRange: `${daily.low}~${daily.high}°C`,
                    humidity: daily.humidity + '%',
                    suggestions: getWeatherSuggestion(daily.text_day),
                    forecast3d: forecast3d
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } else {
            throw new Error('天气数据获取失败');
        }
        
    } catch (error) {
        console.error('天气查询错误:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message 
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

// AI 智能生成处理
async function handleGenerateSmart(request, env, corsHeaders) {
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

        // GLM API 配置
        const apiKey = env.GLM_API_KEY;
        const model = env.GLM_MODEL || 'GLM-4-FlashX-250414';

        if (!apiKey) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'AI 服务未配置' 
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 构建提示词
        const prompt = buildPrompt({
            travel_days,
            destination,
            weather,
            trip_purpose,
            traveler_type,
            preferences
        });

        // 调用 GLM API
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

        // 解析 AI 返回的 JSON
        let listContent;
        try {
            // 尝试直接解析
            listContent = JSON.parse(aiContent);
        } catch (e) {
            // 如果直接解析失败，尝试提取 JSON 部分
            const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                listContent = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('AI 返回格式错误');
            }
        }

        // 确保格式正确
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

// 构建提示词
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

// 根据天气给出建议
function getWeatherSuggestion(weather) {
    const suggestions = {
        '晴': '天气晴朗，注意防晒',
        '多云': '天气舒适，适合出行',
        '阴': '天气阴沉，建议带件外套',
        '雨': '有雨，记得带伞',
        '小雨': '有小雨，记得带伞',
        '中雨': '有中雨，记得带伞',
        '大雨': '有大雨，尽量减少外出',
        '雪': '有雪，注意保暖',
        '雷阵雨': '有雷阵雨，注意安全'
    };
    return suggestions[weather] || '天气多变，注意携带合适衣物';
}
