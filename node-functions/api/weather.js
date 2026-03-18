// EdgeOne Edge Function: 天气查询 API
// 使用心知天气 API

export default function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const destination = url.searchParams.get('destination');
    
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }
    
    if (!destination) {
        return new Response(JSON.stringify({ 
            success: false, 
            error: '请提供目的地参数' 
        }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    
    return handleWeather(destination, env, corsHeaders);
}

async function handleWeather(destination, env, corsHeaders) {
    try {
        const publicKey = env.SENIVERSE_PUBLIC_KEY || 'PL1aBeQc_8_f6qxxj';
        const privateKey = env.SENIVERSE_PRIVATE_KEY || 'SaEVjjmjs5RvzMkuC';
        
        const ts = Math.floor(Date.now() / 1000);
        const ttl = 300;
        const uid = 'user_' + ts;
        const sigStr = `ts=${ts}&ttl=${ttl}&uid=${uid}${privateKey}`;
        
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
        
        const weatherUrl = `https://api.seniverse.com/v3/weather/daily.json?key=${publicKey}&location=${encodeURIComponent(destination)}&language=zh-Hans&unit=c&start=0&days=3&ts=${ts}&ttl=${ttl}&uid=${uid}&sig=${sig}`;
        
        const response = await fetch(weatherUrl);
        const data = await response.json();
        
        if (data.results && data.results[0]) {
            const weatherData = data.results[0];
            const daily = weatherData.daily[0];
            
            return new Response(JSON.stringify({
                success: true,
                data: {
                    destination: weatherData.location.name,
                    weather: daily.text_day,
                    tempRange: `${daily.low}~${daily.high}°C`,
                    humidity: daily.humidity + '%',
                    suggestions: getWeatherSuggestion(daily.text_day),
                    forecast3d: weatherData.daily.map(day => ({
                        date: day.date,
                        weather: day.text_day,
                        tempMin: day.low,
                        tempMax: day.high
                    }))
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        
        return new Response(JSON.stringify({ 
            success: false, 
            error: '天气数据获取失败' 
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
        
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
        '雷阵雨': '有雷阵雨，注意安全',
        '雾': '有雾，能见度低'
    };
    return suggestions[weather] || '天气多变，注意携带合适衣物';
}
