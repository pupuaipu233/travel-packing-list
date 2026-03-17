const express = require('express');
const cors = require('cors');
const supabase = require('./db');
const aiService = require('./ai-service');
const weatherService = require('./seniverse-weather-service');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件 - CORS配置
app.use(cors({
    origin: '*',  // 允许所有来源（开发环境）
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// 生成打包清单的逻辑
function generatePackingList(travelDays, weather) {
    const baseItems = {
        must_have: [
            '身份证',
            '手机',
            '充电器',
            `换洗衣物（${travelDays}套）`,
            '充电宝'
        ],
        optional: [
            '洗漱用品'
        ]
    };
    
    // 根据天气添加特定物品
    switch (weather) {
        case '晴天':
            baseItems.must_have.push('防晒霜');
            baseItems.optional.push('帽子', '墨镜');
            break;
        case '雨天':
            baseItems.must_have.push('雨具');
            baseItems.optional.push('雨伞', '防水鞋套');
            break;
        case '低温':
            baseItems.must_have.push('厚外套');
            baseItems.optional.push('围巾', '手套', '帽子');
            break;
    }
    
    return baseItems;
}

// API接口

// 生成打包清单
app.post('/api/generate', async (req, res) => {
    try {
        const { travel_days, weather } = req.body;
        
        // 验证参数
        if (!travel_days || !weather) {
            return res.status(400).json({ error: '缺少必要参数' });
        }
        
        if (travel_days < 1 || travel_days > 7) {
            return res.status(400).json({ error: '旅行天数必须在1-7天之间' });
        }
        
        const validWeathers = ['晴天', '雨天', '低温'];
        if (!validWeathers.includes(weather)) {
            return res.status(400).json({ error: '天气类型必须是晴天、雨天或低温' });
        }
        
        // 生成清单
        const listContent = generatePackingList(travel_days, weather);
        
        // 保存到Supabase
        const { data, error } = await supabase
            .from('packing_lists')
            .insert({
                travel_days: parseInt(travel_days),
                weather,
                list_content: listContent
            })
            .select();
        
        if (error) {
            throw error;
        }
        
        res.json({
            id: data[0].id,
            travel_days: data[0].travel_days,
            weather: data[0].weather,
            list_content: data[0].list_content,
            created_at: data[0].created_at
        });
    } catch (error) {
        console.error('生成清单失败:', error);
        res.status(500).json({ error: '生成清单失败' });
    }
});

// 获取历史记录
app.get('/api/history', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('packing_lists')
            .select('id, travel_days, weather, list_content, created_at')
            .order('created_at', { ascending: false });
        
        if (error) {
            throw error;
        }
        
        res.json(data);
    } catch (error) {
        console.error('获取历史记录失败:', error);
        res.status(500).json({ error: '获取历史记录失败' });
    }
});

// 获取历史记录详情
app.get('/api/history/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data, error } = await supabase
            .from('packing_lists')
            .select('id, travel_days, weather, list_content, created_at')
            .eq('id', parseInt(id))
            .single();
        
        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: '记录不存在' });
            }
            throw error;
        }
        
        res.json(data);
    } catch (error) {
        console.error('获取历史记录详情失败:', error);
        res.status(500).json({ error: '获取历史记录详情失败' });
    }
});

// AI智能生成打包清单
app.post('/api/generate-smart', async (req, res) => {
    console.log('收到AI生成请求:', JSON.stringify(req.body));
    try {
        const {
            travel_days,
            destination,
            weather,
            trip_purpose,
            traveler_type,
            preferences
        } = req.body;

        // 验证参数
        if (!travel_days) {
            console.log('验证失败: 缺少旅行天数');
            return res.status(400).json({ error: '缺少必要参数：旅行天数' });
        }

        // 使用AI服务验证参数
        const validation = aiService.validateParams({
            travel_days,
            destination,
            trip_purpose,
            traveler_type,
            preferences
        });

        if (!validation.valid) {
            return res.status(400).json({ error: validation.errors.join(', ') });
        }

        // 调用AI生成清单
        const aiResult = await aiService.generateSmartPackingList({
            travel_days,
            destination,
            weather,
            trip_purpose,
            traveler_type,
            preferences
        });

        if (!aiResult.success) {
            console.error('AI生成失败:', aiResult.error);
            return res.status(500).json({ 
                error: `AI生成清单失败: ${aiResult.error || '未知错误'}` 
            });
        }

        // 保存到Supabase
        const { data, error } = await supabase
            .from('packing_lists')
            .insert({
                travel_days: parseInt(travel_days),
                weather: weather || '未知',
                destination: destination || null,
                trip_purpose: trip_purpose || null,
                traveler_type: traveler_type || null,
                preferences: preferences || [],
                list_content: aiResult.data,
                ai_tips: aiResult.data.tips || null,
                ai_generated: true
            })
            .select();

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            data: {
                id: data[0].id,
                travel_days: data[0].travel_days,
                destination: data[0].destination,
                weather: data[0].weather,
                trip_purpose: data[0].trip_purpose,
                traveler_type: data[0].traveler_type,
                preferences: data[0].preferences,
                list_content: data[0].list_content,
                ai_tips: data[0].ai_tips,
                ai_generated: data[0].ai_generated,
                created_at: data[0].created_at
            }
        });
    } catch (error) {
        console.error('智能生成清单失败 - 详细错误:', error);
        console.error('错误消息:', error.message);
        console.error('错误堆栈:', error.stack);
        res.status(500).json({ error: `智能生成清单失败: ${error.message}` });
    }
});

// 获取目的地天气
app.get('/api/weather', async (req, res) => {
    try {
        const { destination } = req.query;
        
        if (!destination) {
            return res.status(400).json({ error: '缺少目的地参数' });
        }
        
        const weatherData = await weatherService.getWeatherByDestination(destination);
        
        res.json({
            success: true,
            data: weatherData
        });
    } catch (error) {
        console.error('获取天气失败:', error);
        res.status(500).json({ error: '获取天气失败' });
    }
});

// 获取目的地推荐物品
app.get('/api/destination-items', async (req, res) => {
    try {
        const { destination, weather } = req.query;
        
        if (!destination) {
            return res.status(400).json({ error: '缺少目的地参数' });
        }
        
        // 查询目的地特色物品
        let query = supabase
            .from('destination_items')
            .select('*')
            .eq('destination', destination)
            .order('priority', { ascending: false });
        
        // 如果提供了天气条件，筛选适用物品
        if (weather) {
            query = query.or(`weather_condition.eq.${weather},weather_condition.is.null`);
        }
        
        const { data: items, error } = await query;
        
        if (error) {
            throw error;
        }
        
        // 获取目的地信息
        const { data: destInfo } = await supabase
            .from('destination_weather')
            .select('*')
            .eq('destination', destination)
            .single();
        
        // 分类整理物品
        const categorizedItems = {
            must_have: items.filter(item => item.item_category === '必备'),
            optional: items.filter(item => item.item_category === '可选'),
            special: items.filter(item => item.item_category === '特殊')
        };
        
        res.json({
            success: true,
            data: {
                destination,
                destination_type: destInfo?.destination_type || '未知',
                default_weather: destInfo?.default_weather || null,
                items: categorizedItems,
                total_count: items.length
            }
        });
    } catch (error) {
        console.error('获取目的地物品失败:', error);
        res.status(500).json({ error: '获取目的地物品失败' });
    }
});

// 删除历史记录
app.delete('/api/history/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const { error } = await supabase
            .from('packing_lists')
            .delete()
            .eq('id', parseInt(id));
        
        if (error) {
            throw error;
        }
        
        res.json({ success: true, message: '删除成功' });
    } catch (error) {
        console.error('删除历史记录失败:', error);
        res.status(500).json({ error: '删除历史记录失败' });
    }
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});