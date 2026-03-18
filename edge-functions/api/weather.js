// EdgeOne Edge Function: 天气查询 API
// 使用 Open-Meteo 免费天气 API

// 设置 CORS 头
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

export function onRequestGet(context) {
    const { request, env } = context;
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
    
    return handleWeather(destination);
}

export function onRequest(context) {
    const { request } = context;
    
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }
    
    return onRequestGet(context);
}

async function handleWeather(destination) {
    try {
        const cityCoordinates = {
            '北京': { lat: 39.9042, lon: 116.4074 },
            '上海': { lat: 31.2304, lon: 121.4737 },
            '广州': { lat: 23.1291, lon: 113.2644 },
            '深圳': { lat: 22.5431, lon: 114.0579 },
            '成都': { lat: 30.5728, lon: 104.0668 },
            '杭州': { lat: 30.2741, lon: 120.1551 },
            '南京': { lat: 32.0603, lon: 118.7969 },
            '西安': { lat: 34.3416, lon: 108.9398 },
            '重庆': { lat: 29.4316, lon: 106.9123 },
            '三亚': { lat: 18.2528, lon: 109.5119 },
            '香港': { lat: 22.3193, lon: 114.1694 },
            '台北': { lat: 25.0330, lon: 121.5654 },
            '东京': { lat: 35.6762, lon: 139.6503 },
            '大阪': { lat: 34.6937, lon: 135.5023 },
            '首尔': { lat: 37.5665, lon: 126.9780 },
            '曼谷': { lat: 13.7563, lon: 100.5018 },
            '新加坡': { lat: 1.3521, lon: 103.8198 },
            '巴黎': { lat: 48.8566, lon: 2.3522 },
            '纽约': { lat: 40.7128, lon: -74.0060 },
            '伦敦': { lat: 51.5074, lon: -0.1278 },
            '悉尼': { lat: -33.8688, lon: 151.2093 }
        };
        
        const coords = cityCoordinates[destination];
        if (!coords) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: '未找到该城市的天气信息' 
            }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FShanghai`;
        
        const response = await fetch(weatherUrl);
        const data = await response.json();
        
        if (data.daily) {
            const daily = data.daily;
            const todayCode = daily.weathercode[0];
            
            return new Response(JSON.stringify({
                success: true,
                data: {
                    destination: destination,
                    weather: getWeatherFromCode(todayCode),
                    tempRange: `${daily.temperature_2m_min[0]}~${daily.temperature_2m_max[0]}°C`,
                    humidity: daily.precipitation_probability_max[0] + '%',
                    suggestions: getWeatherSuggestion(getWeatherFromCode(todayCode)),
                    forecast3d: daily.time.slice(0, 3).map((date, i) => ({
                        date: date,
                        weather: getWeatherFromCode(daily.weathercode[i]),
                        tempMin: daily.temperature_2m_min[i],
                        tempMax: daily.temperature_2m_max[i]
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

function getWeatherFromCode(code) {
    const weatherMap = {
        0: '晴天', 1: '晴间多云', 2: '多云', 3: '阴天',
        45: '雾', 48: '雾',
        51: '小雨', 53: '中雨', 55: '大雨',
        61: '小雨', 63: '中雨', 65: '大雨',
        71: '小雪', 73: '中雪', 75: '大雪',
        77: '雪粒', 80: '阵雨', 81: '阵雨', 82: '暴雨',
        85: '小雪', 86: '大雪',
        95: '雷暴', 96: '雷暴', 99: '雷暴'
    };
    return weatherMap[code] || '多云';
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
        '雷暴': '有雷暴，注意安全',
        '雾': '有雾，能见度低'
    };
    return suggestions[weather] || '天气多变，注意携带合适衣物';
}
