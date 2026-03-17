// EdgeOne Function: AI 智能清单生成（简化版）
export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        
        // 解析请求体
        let body;
        try {
            body = await request.json();
        } catch (e) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: '无效的请求体' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        const { 
            travel_days, 
            destination, 
            weather, 
            trip_purpose, 
            traveler_type, 
            preferences 
        } = body;
        
        // 检查必要参数
        if (!travel_days) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: '请提供旅行天数' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // 生成清单（简化版，不使用 AI）
        const listContent = generateSmartList({
            travel_days,
            destination,
            weather,
            trip_purpose,
            traveler_type,
            preferences
        });
        
        // 保存到 Supabase
        const supabaseUrl = env.SUPABASE_URL;
        const supabaseKey = env.SUPABASE_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: '数据库配置缺失' 
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
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
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
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

function generateSmartList(params) {
    const { travel_days, destination, weather, trip_purpose, traveler_type, preferences } = params;
    
    const mustHave = ['身份证', '手机', '充电器', '充电宝', `换洗衣物（${travel_days}套）`];
    const optional = ['洗漱用品'];
    let tips = '';
    
    // 根据目的地添加物品
    if (destination) {
        const dest = destination.toLowerCase();
        
        if (dest.includes('三亚') || dest.includes('海') || dest.includes('岛') || dest.includes('滩')) {
            mustHave.push('防晒霜', '泳衣', '墨镜');
            optional.push('沙滩拖鞋', '遮阳帽', '防水手机袋');
            tips = `${destination}阳光强烈，注意防晒。建议携带高倍数防晒霜。`;
        } else if (dest.includes('北京') || dest.includes('上海') || dest.includes('广州') || dest.includes('深圳')) {
            mustHave.push('雨伞', '舒适步行鞋');
            optional.push('口罩', '充电宝');
            tips = `${destination}城市游，建议穿舒适的鞋子，准备应对天气变化。`;
        } else if (dest.includes('山') || dest.includes('徒步') || dest.includes('登山')) {
            mustHave.push('登山鞋', '背包', '水壶');
            optional.push('登山杖', '护膝', '头灯');
            tips = '山地徒步注意安全，准备充足的水和应急物品。';
        } else if (dest.includes('雪') || dest.includes('哈尔滨') || dest.includes('东北')) {
            mustHave.push('厚羽绒服', '保暖内衣', '手套', '围巾', '帽子');
            optional.push('暖宝宝', '雪地靴', '保温杯');
            tips = '寒冷地区注意保暖，建议多层穿衣。';
        } else {
            mustHave.push('雨伞');
            optional.push('舒适步行鞋', '常用药品');
            tips = `${destination}旅行，请根据实际情况调整清单。`;
        }
    }
    
    // 根据天气添加物品
    if (weather) {
        const w = weather.toLowerCase();
        if (w.includes('雨')) {
            mustHave.push('雨具', '防水袋');
            optional.push('雨伞', '防水鞋套', '备用袜子');
        } else if (w.includes('低温') || w.includes('冷') || w.includes('寒')) {
            mustHave.push('厚外套', '保暖内衣');
            optional.push('围巾', '手套', '帽子', '暖宝宝');
        } else if (w.includes('晴') || w.includes('热') || w.includes('晒')) {
            mustHave.push('防晒霜', '墨镜');
            optional.push('帽子', '遮阳伞', '水壶');
        }
    }
    
    // 根据出行目的添加物品
    if (trip_purpose) {
        const purpose = trip_purpose.toLowerCase();
        if (purpose.includes('商务')) {
            mustHave.push('正装', '名片');
            optional.push('笔记本电脑', '转换插头');
        } else if (purpose.includes('摄影')) {
            mustHave.push('相机', '备用电池');
            optional.push('三脚架', '存储卡', '镜头清洁套装');
        } else if (purpose.includes('户外')) {
            mustHave.push('背包', '水壶', '急救包');
            optional.push('指南针', '多功能刀', '防虫喷雾');
        }
    }
    
    // 根据旅行者类型添加物品
    if (traveler_type) {
        const type = traveler_type.toLowerCase();
        if (type.includes('亲子') || type.includes('儿童')) {
            mustHave.push('儿童常用药品', '零食');
            optional.push('玩具', '儿童防晒霜');
        } else if (type.includes('情侣')) {
            optional.push('相机', '自拍杆');
        } else if (type.includes('老年')) {
            mustHave.push('常用药品', '舒适鞋子');
            optional.push('拐杖', '血压计');
        }
    }
    
    // 根据偏好添加物品
    if (preferences && Array.isArray(preferences)) {
        preferences.forEach(pref => {
            const p = pref.toLowerCase();
            if (p.includes('摄影') && !mustHave.includes('相机')) {
                optional.push('相机', '三脚架');
            } else if (p.includes('美食')) {
                optional.push('健胃消食片', '牙签');
            } else if (p.includes('购物')) {
                optional.push('折叠购物袋', '备用行李箱');
            } else if (p.includes('运动')) {
                optional.push('运动装备', '护具');
            }
        });
    }
    
    // 去重
    const uniqueMustHave = [...new Set(mustHave)];
    const uniqueOptional = [...new Set(optional)];
    
    // 限制数量
    const finalMustHave = uniqueMustHave.slice(0, 12);
    const finalOptional = uniqueOptional.slice(0, 8);
    
    return {
        must_have: finalMustHave,
        optional: finalOptional,
        tips: tips || '请根据实际情况调整清单'
    };
}
