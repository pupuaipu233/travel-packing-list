// EdgeOne Function: 基础清单生成
export async function onRequestPost(context) {
    const { request, env } = context;
    
    try {
        const body = await request.json();
        const { travel_days, weather, destination, list_content } = body;
        
        // 保存到 Supabase
        const supabaseUrl = env.SUPABASE_URL;
        const supabaseKey = env.SUPABASE_KEY;
        
        const response = await fetch(`${supabaseUrl}/rest/v1/packing_lists`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({
                travel_days: parseInt(travel_days),
                weather: weather || '未指定',
                destination: destination || null,
                list_content: list_content || generateBasicList(travel_days, weather),
                ai_generated: false
            })
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(error);
        }
        
        const data = await response.json();
        
        return new Response(JSON.stringify(data[0]), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

function generateBasicList(travelDays, weather) {
    const mustHave = ['身份证', '手机', '充电器', '充电宝'];
    const optional = ['洗漱用品'];
    
    // 根据天数添加衣物
    mustHave.push(`换洗衣物（${travelDays}套）`);
    
    // 根据天气添加物品
    if (weather === '雨天') {
        mustHave.push('雨具');
        optional.push('雨伞', '防水鞋套');
    } else if (weather === '低温') {
        mustHave.push('厚外套');
        optional.push('围巾', '手套', '帽子');
    } else if (weather === '晴天') {
        optional.push('帽子', '墨镜');
    }
    
    return {
        must_have: mustHave,
        optional: optional
    };
}
