const supabase = require('./db');

/**
 * 根据目的地获取推荐物品
 * @param {string} destination - 目的地名称
 * @param {string} weather - 天气条件（可选）
 * @returns {Promise<Object>} - 推荐物品列表
 */
async function getItemsByDestination(destination, weather = null) {
    try {
        // 1. 查询目的地特定物品
        let query = supabase
            .from('destination_items')
            .select('*')
            .eq('destination', destination)
            .order('priority', { ascending: false });
        
        // 如果提供了天气条件，筛选适用物品
        if (weather) {
            query = query.or(`weather_condition.eq.${weather},weather_condition.is.null`);
        }
        
        const { data: specificItems, error } = await query;
        
        if (error) {
            throw error;
        }
        
        // 2. 如果没有找到特定物品，尝试查找同类型目的地的物品
        let finalItems = specificItems || [];
        
        if (finalItems.length === 0) {
            // 获取目的地类型
            const { data: destInfo } = await supabase
                .from('destination_weather')
                .select('destination_type')
                .eq('destination', destination)
                .single();
            
            if (destInfo?.destination_type) {
                // 查找同类型的其他目的地物品作为参考
                const { data: similarItems } = await supabase
                    .from('destination_items')
                    .select('*')
                    .in('destination', getSimilarDestinations(destInfo.destination_type))
                    .order('priority', { ascending: false })
                    .limit(10);
                
                if (similarItems && similarItems.length > 0) {
                    finalItems = similarItems;
                }
            }
        }
        
        // 3. 获取通用物品
        const generalItems = await getGeneralItems(weather);
        
        // 4. 合并去重
        const mergedItems = mergeItems(finalItems, generalItems);
        
        // 5. 分类整理
        return categorizeItems(mergedItems);
    } catch (error) {
        console.error('获取目的地物品失败:', error);
        // 返回默认物品
        return getDefaultItems();
    }
}

/**
 * 获取通用物品
 * @param {string} weather - 天气条件
 * @returns {Promise<Array>} - 通用物品列表
 */
async function getGeneralItems(weather) {
    const generalItems = [
        { item_name: '身份证', item_description: '必备证件', priority: 10, item_category: '必备' },
        { item_name: '手机', item_description: '通讯工具', priority: 10, item_category: '必备' },
        { item_name: '充电器', item_description: '手机充电', priority: 10, item_category: '必备' },
        { item_name: '充电宝', item_description: '应急电源', priority: 9, item_category: '必备' },
        { item_name: '洗漱用品', item_description: '牙刷、牙膏、毛巾', priority: 8, item_category: '可选' }
    ];
    
    // 根据天气添加通用物品
    if (weather === '炎热' || weather === '晴天') {
        generalItems.push(
            { item_name: '防晒霜', item_description: '防晒必备', priority: 9, item_category: '必备' },
            { item_name: '墨镜', item_description: '保护眼睛', priority: 8, item_category: '可选' },
            { item_name: '帽子', item_description: '遮阳', priority: 8, item_category: '可选' }
        );
    } else if (weather === '雨天') {
        generalItems.push(
            { item_name: '雨伞', item_description: '防雨', priority: 9, item_category: '必备' },
            { item_name: '防水鞋套', item_description: '保护鞋子', priority: 7, item_category: '可选' }
        );
    } else if (weather === '低温') {
        generalItems.push(
            { item_name: '厚外套', item_description: '保暖', priority: 9, item_category: '必备' },
            { item_name: '围巾', item_description: '颈部保暖', priority: 8, item_category: '可选' },
            { item_name: '手套', item_description: '手部保暖', priority: 8, item_category: '可选' }
        );
    }
    
    return generalItems;
}

/**
 * 合并物品列表（去重）
 * @param {Array} specificItems - 特定物品
 * @param {Array} generalItems - 通用物品
 * @returns {Array} - 合并后的物品列表
 */
function mergeItems(specificItems, generalItems) {
    const itemMap = new Map();
    
    // 先添加通用物品
    generalItems.forEach(item => {
        itemMap.set(item.item_name, item);
    });
    
    // 再添加特定物品（会覆盖通用物品）
    specificItems.forEach(item => {
        itemMap.set(item.item_name, item);
    });
    
    return Array.from(itemMap.values());
}

/**
 * 分类整理物品
 * @param {Array} items - 物品列表
 * @returns {Object} - 分类后的物品
 */
function categorizeItems(items) {
    return {
        must_have: items.filter(item => item.item_category === '必备' || item.priority >= 8),
        optional: items.filter(item => item.item_category === '可选' || (item.priority >= 5 && item.priority < 8)),
        special: items.filter(item => item.item_category === '特殊' || item.priority < 5)
    };
}

/**
 * 获取相似目的地
 * @param {string} destinationType - 目的地类型
 * @returns {Array} - 相似目的地列表
 */
function getSimilarDestinations(destinationType) {
    const similarMap = {
        '海边': ['三亚', '青岛', '厦门', '海口'],
        '城市': ['北京', '上海', '成都', '广州'],
        '高原': ['拉萨', '西宁', '香格里拉'],
        '山区': ['张家界', '黄山', '桂林'],
        '干燥': ['北京', '西安', '兰州'],
        '湿润': ['成都', '杭州', '广州']
    };
    
    return similarMap[destinationType] || ['北京', '上海'];
}

/**
 * 获取默认物品
 * @returns {Object} - 默认物品列表
 */
function getDefaultItems() {
    return {
        must_have: [
            { item_name: '身份证', item_description: '必备证件', priority: 10 },
            { item_name: '手机', item_description: '通讯工具', priority: 10 },
            { item_name: '充电器', item_description: '手机充电', priority: 10 },
            { item_name: '充电宝', item_description: '应急电源', priority: 9 }
        ],
        optional: [
            { item_name: '洗漱用品', item_description: '牙刷、牙膏、毛巾', priority: 8 }
        ],
        special: []
    };
}

/**
 * 获取目的地信息
 * @param {string} destination - 目的地名称
 * @returns {Promise<Object>} - 目的地信息
 */
async function getDestinationInfo(destination) {
    try {
        const { data, error } = await supabase
            .from('destination_weather')
            .select('*')
            .eq('destination', destination)
            .single();
        
        if (error || !data) {
            return null;
        }
        
        return {
            name: data.destination,
            type: data.destination_type,
            defaultWeather: data.default_weather,
            tempRange: data.default_temp_range,
            seasonRules: data.season_rules
        };
    } catch (error) {
        console.error('获取目的地信息失败:', error);
        return null;
    }
}

/**
 * 格式化物品为Prompt文本
 * @param {Object} items - 分类后的物品
 * @returns {string} - 格式化文本
 */
function formatItemsForPrompt(items) {
    let text = '';
    
    if (items.must_have && items.must_have.length > 0) {
        text += '必带物品：' + items.must_have.map(i => i.item_name).join('、') + '\n';
    }
    
    if (items.optional && items.optional.length > 0) {
        text += '可选物品：' + items.optional.map(i => i.item_name).join('、') + '\n';
    }
    
    if (items.special && items.special.length > 0) {
        text += '特殊物品：' + items.special.map(i => i.item_name).join('、') + '\n';
    }
    
    return text || '无特殊物品建议';
}

module.exports = {
    getItemsByDestination,
    getGeneralItems,
    getDestinationInfo,
    formatItemsForPrompt,
    categorizeItems
};
