const express = require('express');
const cors = require('cors');
const supabase = require('./db');

const app = express();
const PORT = 3000;

// 中间件
app.use(cors());
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

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});