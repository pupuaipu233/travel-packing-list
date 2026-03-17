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
        
        // 返回模拟数据（心知天气 API 需要正确配置密钥）
        return new Response(JSON.stringify({
            success: true,
            data: {
                destination: destination,
                weather: '未知',
                temperature: '未知',
                note: '天气服务配置中'
            }
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
