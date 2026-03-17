// EdgeOne Function: 查询目的地天气
export async function onRequestGet(context) {
    const { request, env } = context;
    
    try {
        const url = new URL(request.url);
        const destination = url.searchParams.get('destination');
        
        if (!destination) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: '请提供目的地参数' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // 使用心知天气 API
        const publicKey = env.SENIVERSE_PUBLIC_KEY;
        const privateKey = env.SENIVERSE_PRIVATE_KEY;
        
        // 如果没有配置天气 API，返回模拟数据
        if (!publicKey || !privateKey || publicKey === '你的_心知公钥') {
            return new Response(JSON.stringify({
                success: true,
                data: {
                    destination: destination,
                    weather: '未知',
                    temperature: '未知',
                    note: '天气服务未配置'
                }
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // 调用心知天气 API
        try {
            const ts = Math.floor(Date.now() / 1000);
            const params = `location=${encodeURIComponent(destination)}&ts=${ts}`;
            const signature = await generateSignature(params, privateKey);
            
            const weatherUrl = `https://api.seniverse.com/v3/weather/now.json?${params}&public_key=${publicKey}&sig=${signature}`;
            
            const response = await fetch(weatherUrl);
            
            if (!response.ok) {
                // API 调用失败，返回模拟数据
                return new Response(JSON.stringify({
                    success: true,
                    data: {
                        destination: destination,
                        weather: '未知',
                        temperature: '未知',
                        note: '天气服务暂时不可用'
                    }
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            const data = await response.json();
            
            if (data.results && data.results[0]) {
                const weather = data.results[0];
                return new Response(JSON.stringify({
                    success: true,
                    data: {
                        destination: destination,
                        weather: weather.now.text,
                        temperature: `${weather.now.temperature}°C`,
                        location: weather.location.name
                    }
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            } else {
                // 未找到天气数据，返回模拟数据
                return new Response(JSON.stringify({
                    success: true,
                    data: {
                        destination: destination,
                        weather: '未知',
                        temperature: '未知',
                        note: '未找到该目的地天气'
                    }
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        } catch (apiError) {
            // API 调用异常，返回模拟数据
            return new Response(JSON.stringify({
                success: true,
                data: {
                    destination: destination,
                    weather: '未知',
                    temperature: '未知',
                    note: '天气服务调用失败'
                }
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
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

async function generateSignature(params, privateKey) {
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(params);
        const key = encoder.encode(privateKey);
        
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            key,
            { name: 'HMAC', hash: 'SHA-1' },
            false,
            ['sign']
        );
        
        const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
        return btoa(String.fromCharCode(...new Uint8Array(signature)));
    } catch (e) {
        throw new Error('签名生成失败');
    }
}
