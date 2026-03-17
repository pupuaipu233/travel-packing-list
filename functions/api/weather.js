// EdgeOne Function: 天气查询 API
// 使用心知天气 API

export default async function (request, env) {
    // 设置 CORS 头
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    // 处理 OPTIONS 请求
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

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
        const sig = await generateSignature(sigStr);

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

// 生成 HMAC-SHA1 签名
async function generateSignature(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        data,
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
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
