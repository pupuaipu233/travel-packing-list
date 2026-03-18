// EdgeOne Edge Function: 目的地物品推荐 API
// 使用 Supabase 数据库

export default function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const destination = url.searchParams.get('destination');
    const weather = url.searchParams.get('weather');
    
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }
    
    return handleRequest(request, destination, weather, env, corsHeaders);
}

async function handleRequest(request, destination, weather, env, corsHeaders) {
    try {
        if (!destination) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: '请提供目的地参数' 
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        
        // 模拟目的地物品数据
        // 实际项目中，这里应该连接到 Supabase 数据库
        const destinationItems = {
            '北京': {
                must_have: ['身份证', '手机', '充电器', '充电宝', '舒适步行鞋', '保湿护肤品', '口罩'],
                optional: ['自拍杆', '折叠伞', '润唇膏'],
                tips: '北京景点多为步行游览，建议穿舒适的鞋子。'
            },
            '三亚': {
                must_have: ['身份证', '手机', '充电器', '充电宝', '防晒霜(SPF50+)', '泳衣/泳裤', '墨镜', '沙滩拖鞋', '遮阳帽'],
                optional: ['浮潜装备', '防水手机袋', '沙滩巾', '驱蚊液'],
                tips: '三亚阳光强烈，紫外线指数高，务必做好防晒措施。'
            },
            '上海': {
                must_have: ['身份证', '手机', '充电器', '充电宝', '雨伞', '舒适步行鞋'],
                optional: ['地铁卡/交通卡', '相机', '时尚配饰'],
                tips: '上海天气多变，建议随身携带雨伞。'
            },
            '成都': {
                must_have: ['身份证', '手机', '充电器', '充电宝', '雨伞', '舒适步行鞋'],
                optional: ['火锅底料', '熊猫周边', '川菜食谱'],
                tips: '成都多雨，记得带伞。'
            },
            '广州': {
                must_have: ['身份证', '手机', '充电器', '充电宝', '雨伞', '轻薄衣物'],
                optional: ['凉茶', '粤式点心指南', '防晒衣'],
                tips: '广州天气炎热潮湿，建议穿轻薄透气的衣物。'
            }
        };
        
        // 获取目的地物品
        const items = destinationItems[destination] || {
            must_have: ['身份证', '手机', '充电器', '充电宝'],
            optional: ['洗漱用品', '毛巾'],
            tips: '请根据实际情况调整清单。'
        };
        
        return new Response(JSON.stringify({
            success: true,
            data: {
                destination: destination,
                weather: weather || '未知',
                items: items
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('获取目的地物品错误:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message 
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}