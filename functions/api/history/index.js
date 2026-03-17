// EdgeOne Function: 获取历史记录列表
export async function onRequestGet(context) {
    const { env } = context;
    
    try {
        const supabaseUrl = env.SUPABASE_URL;
        const supabaseKey = env.SUPABASE_KEY;
        
        const response = await fetch(`${supabaseUrl}/rest/v1/packing_lists?select=*&order=created_at.desc`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(error);
        }
        
        const data = await response.json();
        
        return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
