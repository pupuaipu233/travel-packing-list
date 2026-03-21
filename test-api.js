// API 测试脚本

const testWeatherAPI = async () => {
    console.log('=== 测试天气 API ===');
    
    try {
        const response = await fetch('/api/weather?destination=北京');
        const data = await response.json();
        
        console.log('响应状态:', response.status);
        console.log('响应数据:', data);
        
        if (response.ok && data.success) {
            console.log('✅ 天气 API 测试通过');
        } else {
            console.log('❌ 天气 API 测试失败:', data.error);
        }
    } catch (error) {
        console.log('❌ 天气 API 测试异常:', error.message);
    }
};

const testAIGenerateAPI = async () => {
    console.log('\n=== 测试 AI 生成 API ===');
    
    try {
        const response = await fetch('/api/generate-smart', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                travel_days: 3,
                destination: '北京',
                weather: '晴',
                trip_purpose: '度假',
                traveler_type: '单人',
                preferences: ['摄影', '美食']
            })
        });
        
        const data = await response.json();
        
        console.log('响应状态:', response.status);
        console.log('响应数据:', data);
        
        if (response.ok && data.success) {
            console.log('✅ AI 生成 API 测试通过');
        } else {
            console.log('❌ AI 生成 API 测试失败:', data.error);
        }
    } catch (error) {
        console.log('❌ AI 生成 API 测试异常:', error.message);
    }
};

const testDestinationItemsAPI = async () => {
    console.log('\n=== 测试目的地物品 API ===');
    
    try {
        const response = await fetch('/api/destination-items?destination=北京&weather=晴');
        const data = await response.json();
        
        console.log('响应状态:', response.status);
        console.log('响应数据:', data);
        
        if (response.ok && data.success) {
            console.log('✅ 目的地物品 API 测试通过');
        } else {
            console.log('❌ 目的地物品 API 测试失败:', data.error);
        }
    } catch (error) {
        console.log('❌ 目的地物品 API 测试异常:', error.message);
    }
};

// 运行所有测试
const runTests = async () => {
    console.log('开始 API 测试...\n');
    
    await testWeatherAPI();
    await testAIGenerateAPI();
    await testDestinationItemsAPI();
    
    console.log('\n测试完成！');
};

// 导出测试函数
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runTests, testWeatherAPI, testAIGenerateAPI, testDestinationItemsAPI };
} else {
    // 在浏览器中运行
    window.runAPITests = runTests;
}
