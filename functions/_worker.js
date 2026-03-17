// EdgeOne Pages Function: API Router
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;
        
        // 路由分发
        if (path === '/api/generate' && request.method === 'POST') {
            return handleGenerate(request, env);
        } else if (path === '/api/generate-smart' && request.method === 'POST') {
            return handleGenerateSmart(request, env);
        } else if (path === '/api/history' && request.method === 'GET') {
            return handleHistory(request, env);
        } else if (path === '/api/weather' && request.method === 'GET') {
            return handleWeather(request, env);
        }
        
        // 静态资源请求，继续到静态托管
        return env.ASSETS.fetch(request);
    }
};

// 基础清单生成
async function handleGenerate(request, env) {
    try {
        const body = await request.json();
        const { travel_days, weather, destination } = body;
        
        const supabaseUrl = env.SUPABASE_URL;
        const supabaseKey = env.SUPABASE_KEY;
        
        const listContent = generateBasicList(travel_days, weather);
        
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
                list_content: listContent,
                ai_generated: false
            })
        });
        
        if (!response.ok) {
            const error = await response.text();
            return new Response(JSON.stringify({ error }), { status: 500 });
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

// AI 智能生成
async function handleGenerateSmart(request, env) {
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
        
        if (!travel_days) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: '请提供旅行天数' 
            }), { status: 400 });
        }
        
        const listContent = generateSmartList({
            travel_days,
            destination,
            weather,
            trip_purpose,
            traveler_type,
            preferences
        });
        
        const supabaseUrl = env.SUPABASE_URL;
        const supabaseKey = env.SUPABASE_KEY;
        
        const saveResponse = await fetch(`${supabaseUrl}/rest/v1/packing_lists`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({
                travel_days: parseInt(travel_days),
                destination: destination || null,
                weather: weather || '未指定',
                trip_purpose: trip_purpose || null,
                traveler_type: traveler_type || null,
                preferences: preferences || [],
                list_content: listContent,
                ai_tips: listContent.tips || null,
                ai_generated: true
            })
        });
        
        if (!saveResponse.ok) {
            const errorText = await saveResponse.text();
            return new Response(JSON.stringify({ 
                success: false, 
                error: `数据库保存失败: ${errorText}` 
            }), { status: 500 });
        }
        
        const savedData = await saveResponse.json();
        
        return new Response(JSON.stringify({
            success: true,
            data: savedData[0]
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ 
            success: false, 
            error: `服务器错误: ${error.message}` 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// 获取历史记录
async function handleHistory(request, env) {
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
            return new Response(JSON.stringify({ error }), { status: 500 });
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

// 天气查询
async function handleWeather(request, env) {
    try {
        const url = new URL(request.url);
        const destination = url.searchParams.get('destination');
        
        if (!destination) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: '请提供目的地参数' 
            }), { status: 400 });
        }
        
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

// 基础清单生成逻辑
function generateBasicList(travelDays, weather) {
    const mustHave = ['身份证', '手机', '充电器', '充电宝', `换洗衣物（${travelDays}套）`];
    const optional = ['洗漱用品'];
    
    if (weather === '雨天') {
        mustHave.push('雨具');
        optional.push('雨伞', '防水鞋套');
    } else if (weather === '低温') {
        mustHave.push('厚外套');
        optional.push('围巾', '手套', '帽子');
    } else if (weather === '晴天') {
        optional.push('帽子', '墨镜');
    }
    
    return { must_have: mustHave, optional: optional };
}

// 智能清单生成逻辑
function generateSmartList(params) {
    const { travel_days, destination, weather, trip_purpose, traveler_type, preferences } = params;
    
    const mustHave = ['身份证', '手机', '充电器', '充电宝', `换洗衣物（${travel_days}套）`];
    const optional = ['洗漱用品'];
    let tips = '';
    
    if (destination) {
        const dest = destination.toLowerCase();
        if (dest.includes('三亚') || dest.includes('海') || dest.includes('岛')) {
            mustHave.push('防晒霜', '泳衣', '墨镜');
            optional.push('沙滩拖鞋', '遮阳帽');
            tips = `${destination}阳光强烈，注意防晒。`;
        } else if (dest.includes('北京') || dest.includes('上海')) {
            mustHave.push('雨伞', '舒适步行鞋');
            tips = `${destination}城市游，建议穿舒适的鞋子。`;
        } else if (dest.includes('山') || dest.includes('徒步')) {
            mustHave.push('登山鞋', '背包', '水壶');
            optional.push('登山杖', '护膝');
            tips = '山地徒步注意安全。';
        } else {
            mustHave.push('雨伞');
            tips = `${destination}旅行，请根据实际情况调整清单。`;
        }
    }
    
    if (weather) {
        const w = weather.toLowerCase();
        if (w.includes('雨')) {
            mustHave.push('雨具');
            optional.push('雨伞', '防水鞋套');
        } else if (w.includes('冷') || w.includes('寒')) {
            mustHave.push('厚外套', '保暖内衣');
            optional.push('围巾', '手套');
        } else if (w.includes('晴') || w.includes('热')) {
            mustHave.push('防晒霜');
            optional.push('帽子', '墨镜');
        }
    }
    
    if (trip_purpose) {
        const purpose = trip_purpose.toLowerCase();
        if (purpose.includes('商务')) {
            mustHave.push('正装', '名片');
        } else if (purpose.includes('摄影')) {
            mustHave.push('相机', '备用电池');
            optional.push('三脚架');
        }
    }
    
    if (traveler_type) {
        const type = traveler_type.toLowerCase();
        if (type.includes('亲子')) {
            mustHave.push('儿童常用药品', '零食');
        } else if (type.includes('情侣')) {
            optional.push('相机', '自拍杆');
        }
    }
    
    if (preferences && Array.isArray(preferences)) {
        preferences.forEach(pref => {
            const p = pref.toLowerCase();
            if (p.includes('摄影')) optional.push('相机');
            else if (p.includes('美食')) optional.push('健胃消食片');
        });
    }
    
    return {
        must_have: [...new Set(mustHave)].slice(0, 12),
        optional: [...new Set(optional)].slice(0, 8),
        tips: tips || '请根据实际情况调整清单'
    };
}
