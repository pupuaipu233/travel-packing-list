// EdgeOne Edge Function: 天气查询 API
// 使用 OpenWeatherMap API

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
    
    return handleWeather(request, destination, env, corsHeaders);
}

// 请求超时控制
async function fetchWithTimeout(url, options = {}, timeout = 8000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('API 请求超时');
        }
        throw error;
    }
}

// 请求频率控制
const requestCounts = new Map();
const RATE_LIMIT = 60; // 每分钟请求数
const WINDOW_MS = 60 * 1000; // 时间窗口

function checkRateLimit(ip) {
    const now = Date.now();
    const key = `rate_${ip}`;
    
    if (!requestCounts.has(key)) {
        requestCounts.set(key, {
            count: 1,
            timestamp: now
        });
        return true;
    }
    
    const data = requestCounts.get(key);
    if (now - data.timestamp > WINDOW_MS) {
        // 时间窗口已过，重置计数器
        requestCounts.set(key, {
            count: 1,
            timestamp: now
        });
        return true;
    }
    
    if (data.count >= RATE_LIMIT) {
        return false;
    }
    
    // 增加计数
    data.count++;
    requestCounts.set(key, data);
    return true;
}

async function handleWeather(request, destination, env, corsHeaders) {
    try {
        // 获取客户端 IP
        const ip = request.headers.get('X-Forwarded-For') || 'unknown';
        
        // 检查速率限制
        if (!checkRateLimit(ip)) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: '请求过于频繁，请稍后再试' 
            }), {
                status: 429,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
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
        
        // 使用 OpenWeatherMap API，它更简单可靠
        const apiKey = env.OPENWEATHER_API_KEY;
        
        if (!apiKey) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: '缺少 OpenWeatherMap API 密钥配置' 
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        
        try {
            // 先通过地理编码 API 获取城市的经纬度
            const geocodeUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(destination)}&limit=1&appid=${apiKey}`;
            
            console.log('地理编码 API 请求 URL:', geocodeUrl);
            
            const geocodeResponse = await fetchWithTimeout(geocodeUrl);
            console.log('地理编码 API 响应状态:', geocodeResponse.status);
            
            if (!geocodeResponse.ok) {
                const errorData = await geocodeResponse.text();
                throw new Error(`地理编码 API 错误: ${errorData}`);
            }
            
            const geocodeData = await geocodeResponse.json();
            console.log('地理编码 API 响应数据:', JSON.stringify(geocodeData));
            
            if (!geocodeData || geocodeData.length === 0) {
                throw new Error('未找到该目的地');
            }
            
            const { lat, lon, name, country } = geocodeData[0];
            
            // 使用经纬度获取天气数据
            const weatherUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=zh_cn&appid=${apiKey}`;
            
            console.log('天气 API 请求 URL:', weatherUrl);
            
            const weatherResponse = await fetchWithTimeout(weatherUrl);
            console.log('天气 API 响应状态:', weatherResponse.status);
            
            if (!weatherResponse.ok) {
                const errorData = await weatherResponse.text();
                throw new Error(`天气 API 错误: ${errorData}`);
            }
            
            const weatherData = await weatherResponse.json();
            console.log('天气 API 响应数据:', JSON.stringify(weatherData));
            
            if (weatherData.list && weatherData.list.length > 0) {
                // 处理天气数据
                const currentWeather = weatherData.list[0];
                const forecast3d = [];
                
                // 提取未来3天的天气数据（每天取中午的数据）
                for (let i = 0; i < weatherData.list.length; i++) {
                    const item = weatherData.list[i];
                    const date = new Date(item.dt * 1000);
                    if (date.getHours() === 12) {
                        forecast3d.push({
                            date: date.toISOString().split('T')[0],
                            weather: item.weather[0].description,
                            tempMin: Math.round(item.main.temp_min),
                            tempMax: Math.round(item.main.temp_max)
                        });
                        if (forecast3d.length === 3) break;
                    }
                }
                
                // 如果没有足够的中午数据，使用其他时间的数据
                if (forecast3d.length < 3) {
                    for (let i = 0; i < weatherData.list.length && forecast3d.length < 3; i++) {
                        const item = weatherData.list[i];
                        const date = new Date(item.dt * 1000);
                        const dateStr = date.toISOString().split('T')[0];
                        
                        // 检查是否已经有该日期的数据
                        if (!forecast3d.some(f => f.date === dateStr)) {
                            forecast3d.push({
                                date: dateStr,
                                weather: item.weather[0].description,
                                tempMin: Math.round(item.main.temp_min),
                                tempMax: Math.round(item.main.temp_max)
                            });
                        }
                    }
                }
                
                return new Response(JSON.stringify({
                    success: true,
                    data: {
                        destination: `${name}, ${country}`,
                        weather: currentWeather.weather[0].description,
                        tempRange: `${Math.round(currentWeather.main.temp_min)}~${Math.round(currentWeather.main.temp_max)}°C`,
                        humidity: currentWeather.main.humidity + '%',
                        suggestions: getWeatherSuggestion(currentWeather.weather[0].main),
                        forecast3d: forecast3d
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
            if (error.name === 'AbortError') {
                return new Response(JSON.stringify({ 
                    success: false, 
                    error: 'API 请求超时' 
                }), {
                    status: 504,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            throw error;
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

function getWeatherSuggestion(weather) {
    const suggestions = {
        'Clear': '天气晴朗，注意防晒',
        'Clouds': '天气多云，适合出行',
        'Rain': '有雨，记得带伞',
        'Drizzle': '有小雨，记得带伞',
        'Thunderstorm': '有雷阵雨，注意安全',
        'Snow': '有雪，注意保暖',
        'Mist': '有雾，能见度低',
        'Fog': '有雾，能见度低',
        'Haze': '有霾，注意防护'
    };
    return suggestions[weather] || '天气多变，注意携带合适衣物';
}
