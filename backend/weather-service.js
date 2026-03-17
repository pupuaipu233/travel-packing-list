require('dotenv').config();

const supabase = require('./db');

// 和风天气API配置
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
// 和风天气提供多个API Host，免费版使用 devapi.qweather.com
const API_HOST = 'https://devapi.qweather.com';
const GEO_API_HOST = 'https://geoapi.qweather.com';

// 添加调试日志
console.log('天气服务初始化...');
console.log('API Key状态:', WEATHER_API_KEY ? '已配置' : '未配置');
console.log('API Host:', API_HOST);

/**
 * 获取目的地天气（增强版）
 * @param {string} destination - 目的地名称
 * @param {boolean} useForecast - 是否使用预报数据（默认true）
 * @returns {Promise<Object>} - 天气信息
 */
async function getWeatherByDestination(destination, useForecast = true) {
    try {
        // 1. 先查缓存
        const cached = await checkWeatherCache(destination);
        if (cached && !isCacheExpired(cached)) {
            console.log(`使用缓存的天气数据: ${destination}`);
            return {
                ...cached.weather_data,
                source: 'cache',
                cached: true
            };
        }

        // 2. 调用天气API
        let weatherData;
        if (useForecast) {
            // 使用3天预报API（更准确，包含最高最低温度）
            weatherData = await callWeatherForecastAPI(destination);
        } else {
            // 使用实时天气API
            weatherData = await callWeatherNowAPI(destination);
        }
        
        // 3. 保存缓存
        await saveWeatherCache(destination, weatherData);
        
        return {
            ...weatherData,
            source: 'api',
            cached: false
        };
    } catch (error) {
        console.error(`获取${destination}天气失败:`, error);
        
        // 4. 使用兜底方案：查询映射表
        const fallbackData = await getWeatherFromMapping(destination);
        if (fallbackData) {
            return {
                ...fallbackData,
                source: 'fallback',
                cached: false
            };
        }
        
        // 5. 最终兜底：返回默认天气
        return getDefaultWeather(destination);
    }
}

/**
 * 调用和风天气3天预报API（推荐）
 * @param {string} destination - 目的地名称
 * @returns {Promise<Object>} - 天气数据
 */
async function callWeatherForecastAPI(destination) {
    if (!WEATHER_API_KEY) {
        throw new Error('未配置天气API Key');
    }

    // 1. 先获取城市ID
    const geoUrl = `${GEO_API_HOST}/v2/city/lookup?location=${encodeURIComponent(destination)}&key=${WEATHER_API_KEY}`;
    console.log('调用地理编码API:', geoUrl.replace(WEATHER_API_KEY, '***'));
    
    const geoResponse = await fetch(geoUrl, {
        headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip'  // 和风天气API支持gzip压缩
        }
    });
    
    console.log('地理编码API响应状态:', geoResponse.status);
    
    // 检查响应是否成功
    if (!geoResponse.ok) {
        const errorText = await geoResponse.text();
        console.error('地理编码API HTTP错误:', geoResponse.status, errorText);
        throw new Error(`地理编码API请求失败: HTTP ${geoResponse.status}`);
    }
    
    const geoData = await geoResponse.json();
    console.log('地理编码API返回数据:', JSON.stringify(geoData, null, 2));
    
    // 和风天气API使用code字段表示状态，"200"表示成功
    if (geoData.code !== '200' || !geoData.location || geoData.location.length === 0) {
        throw new Error(`未找到城市: ${destination}, 错误码: ${geoData.code}, 错误信息: ${geoData.message || '未知错误'}`);
    }
    
    const cityId = geoData.location[0].id;
    const cityName = geoData.location[0].name;
    const cityAdm = geoData.location[0].adm1; // 所属省份
    
    // 2. 获取3天预报
    const forecastUrl = `${API_HOST}/v7/weather/3d?location=${cityId}&key=${WEATHER_API_KEY}`;
    console.log('调用天气预报API:', forecastUrl.replace(WEATHER_API_KEY, '***'));
    
    const forecastResponse = await fetch(forecastUrl, {
        headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip'
        }
    });
    
    // 检查响应是否成功
    if (!forecastResponse.ok) {
        const errorText = await forecastResponse.text();
        console.error('天气预报API HTTP错误:', forecastResponse.status, errorText);
        throw new Error(`天气预报API请求失败: HTTP ${forecastResponse.status}`);
    }
    
    const forecastData = await forecastResponse.json();
    console.log('天气预报API返回数据:', JSON.stringify(forecastData, null, 2));
    
    if (forecastData.code !== '200') {
        throw new Error(`天气预报API返回错误: ${forecastData.code}, 错误信息: ${forecastData.message || '未知错误'}`);
    }
    
    // 3. 转换为内部格式（使用今天的预报）
    const today = forecastData.daily[0];
    return convertForecastFormat(cityName, cityAdm, today, forecastData.daily);
}

/**
 * 调用和风天气实时API（备用）
 * @param {string} destination - 目的地名称
 * @returns {Promise<Object>} - 天气数据
 */
async function callWeatherNowAPI(destination) {
    if (!WEATHER_API_KEY) {
        throw new Error('未配置天气API Key');
    }

    // 1. 先获取城市ID
    const geoResponse = await fetch(
        `${GEO_API_URL}?location=${encodeURIComponent(destination)}&key=${WEATHER_API_KEY}`
    );
    
    if (!geoResponse.ok) {
        throw new Error(`地理编码API请求失败: ${geoResponse.status}`);
    }
    
    const geoData = await geoResponse.json();
    
    if (geoData.code !== '200' || !geoData.location || geoData.location.length === 0) {
        throw new Error(`未找到城市: ${destination}`);
    }
    
    const cityId = geoData.location[0].id;
    const cityName = geoData.location[0].name;
    
    // 2. 获取实时天气
    const weatherResponse = await fetch(
        `${WEATHER_NOW_URL}?location=${cityId}&key=${WEATHER_API_KEY}`
    );
    
    if (!weatherResponse.ok) {
        throw new Error(`天气API请求失败: ${weatherResponse.status}`);
    }
    
    const weatherData = await weatherResponse.json();
    
    if (weatherData.code !== '200') {
        throw new Error(`天气API返回错误: ${weatherData.code}`);
    }
    
    const now = weatherData.now;
    
    // 3. 转换为内部格式
    return convertWeatherFormat(cityName, now);
}

/**
 * 转换预报数据格式
 * @param {string} destination - 目的地
 * @param {string} province - 省份
 * @param {Object} todayData - 今天预报数据
 * @param {Array} dailyData - 3天预报数据
 * @returns {Object} - 标准化的天气数据
 */
function convertForecastFormat(destination, province, todayData, dailyData) {
    const weatherCode = todayData.iconDay;
    const tempMax = parseInt(todayData.tempMax);
    const tempMin = parseInt(todayData.tempMin);
    const temp = Math.round((tempMax + tempMin) / 2); // 平均温度
    
    // 根据天气代码和温度判断天气类型
    let weather = '晴天';
    let weatherType = 'sunny';
    
    // 和风天气图标代码映射
    if (weatherCode >= 100 && weatherCode <= 103) {
        weather = '晴天';
        weatherType = 'sunny';
    } else if (weatherCode >= 150 && weatherCode <= 153) {
        weather = '晴天';
        weatherType = 'sunny';
    } else if (weatherCode >= 300 && weatherCode <= 399) {
        weather = '雨天';
        weatherType = 'rainy';
    } else if (weatherCode >= 400 && weatherCode <= 499) {
        weather = '低温'; // 雪天
        weatherType = 'snowy';
    } else if (weatherCode >= 500 && weatherCode <= 599) {
        weather = '多云';
        weatherType = 'cloudy';
    } else {
        weather = '多云';
        weatherType = 'cloudy';
    }
    
    // 根据温度调整
    if (tempMax >= 30) {
        weather = '炎热';
        weatherType = 'hot';
    } else if (tempMin <= 5) {
        weather = '低温';
        weatherType = 'cold';
    }
    
    // 构建3天预报摘要
    const forecastSummary = dailyData.map(day => ({
        date: day.fxDate,
        weather: day.textDay,
        tempMax: `${day.tempMax}°C`,
        tempMin: `${day.tempMin}°C`,
        icon: day.iconDay
    }));
    
    return {
        destination,
        province,
        weather,
        weatherType,
        temperature: `${temp}°C`,
        tempRange: `${tempMin}°C ~ ${tempMax}°C`,
        humidity: `${todayData.humidity}%`,
        wind: `${todayData.windDirDay} ${todayData.windScaleDay}级`,
        pressure: `${todayData.pressure}hPa`,
        visibility: `${todayData.vis}km`,
        uvIndex: todayData.uvIndex,
        sunrise: todayData.sunrise,
        sunset: todayData.sunset,
        precip: `${todayData.precip}mm`,
        suggestions: generateWeatherSuggestions(weather, temp, todayData),
        forecast3d: forecastSummary,
        updatedAt: new Date().toISOString()
    };
}

/**
 * 转换实时天气数据格式
 * @param {string} destination - 目的地
 * @param {Object} apiData - API返回的原始数据
 * @returns {Object} - 标准化的天气数据
 */
function convertWeatherFormat(destination, apiData) {
    const weatherCode = apiData.icon;
    const temp = parseInt(apiData.temp);
    
    // 根据天气代码和温度判断天气类型
    let weather = '晴天';
    let weatherType = 'sunny';
    
    // 和风天气图标代码映射
    if (weatherCode >= 100 && weatherCode <= 103) {
        weather = '晴天';
        weatherType = 'sunny';
    } else if (weatherCode >= 150 && weatherCode <= 153) {
        weather = '晴天';
        weatherType = 'sunny';
    } else if (weatherCode >= 300 && weatherCode <= 399) {
        weather = '雨天';
        weatherType = 'rainy';
    } else if (weatherCode >= 400 && weatherCode <= 499) {
        weather = '低温'; // 雪天
        weatherType = 'snowy';
    } else if (weatherCode >= 500 && weatherCode <= 599) {
        weather = '多云';
        weatherType = 'cloudy';
    } else {
        weather = '多云';
        weatherType = 'cloudy';
    }
    
    // 根据温度调整
    if (temp >= 30) {
        weather = '炎热';
        weatherType = 'hot';
    } else if (temp <= 5) {
        weather = '低温';
        weatherType = 'cold';
    }
    
    return {
        destination,
        weather,
        weatherType,
        temperature: `${temp}°C`,
        feelsLike: `${apiData.feelsLike}°C`,
        humidity: `${apiData.humidity}%`,
        wind: `${apiData.windDir} ${apiData.windScale}级`,
        pressure: `${apiData.pressure}hPa`,
        visibility: `${apiData.vis}km`,
        suggestions: generateWeatherSuggestions(weather, temp),
        updatedAt: new Date().toISOString()
    };
}

/**
 * 生成天气建议（增强版）
 * @param {string} weather - 天气类型
 * @param {number} temp - 温度
 * @param {Object} todayData - 详细天气数据（可选）
 * @returns {string} - 建议文本
 */
function generateWeatherSuggestions(weather, temp, todayData = null) {
    const suggestions = [];
    
    // 基于天气类型的建议
    if (weather === '炎热' || temp >= 30) {
        suggestions.push('天气炎热，注意防暑降温');
        suggestions.push('建议携带防晒霜、墨镜、遮阳帽');
        if (todayData && todayData.uvIndex >= 8) {
            suggestions.push(`紫外线强度${todayData.uvIndex}级，注意防晒`);
        }
    } else if (weather === '低温' || temp <= 5) {
        suggestions.push('天气较冷，注意保暖');
        suggestions.push('建议携带厚外套、围巾、手套');
    } else if (weather === '雨天') {
        suggestions.push('有雨，记得带伞');
        suggestions.push('建议穿防水鞋');
        if (todayData && parseFloat(todayData.precip) > 10) {
            suggestions.push('降水量较大，注意防雨');
        }
    } else if (weather === '雪天') {
        suggestions.push('有雪，注意防寒防滑');
        suggestions.push('建议穿防滑鞋');
    } else if (weather === '多云') {
        suggestions.push('多云天气，适合出行');
    } else if (weather === '晴天') {
        suggestions.push('天气晴朗，适合出行');
        suggestions.push('注意防晒');
    }
    
    // 基于湿度的建议
    if (todayData && todayData.humidity) {
        const humidity = parseInt(todayData.humidity);
        if (humidity > 80) {
            suggestions.push('湿度较高，注意防潮');
        } else if (humidity < 30) {
            suggestions.push('空气干燥，注意保湿');
        }
    }
    
    // 基于风力的建议
    if (todayData && todayData.windScaleDay) {
        const windScale = parseInt(todayData.windScaleDay);
        if (windScale >= 6) {
            suggestions.push('风力较大，注意安全');
        }
    }
    
    return suggestions.join('；');
}

/**
 * 检查天气缓存
 * @param {string} destination - 目的地
 * @returns {Promise<Object|null>} - 缓存数据
 */
async function checkWeatherCache(destination) {
    try {
        const { data, error } = await supabase
            .from('weather_api_cache')
            .select('*')
            .eq('destination', destination)
            .single();
        
        if (error || !data) {
            return null;
        }
        
        return data;
    } catch (error) {
        console.error('检查天气缓存失败:', error);
        return null;
    }
}

/**
 * 保存天气缓存
 * @param {string} destination - 目的地
 * @param {Object} weatherData - 天气数据
 */
async function saveWeatherCache(destination, weatherData) {
    try {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1); // 缓存1小时
        
        const { error } = await supabase
            .from('weather_api_cache')
            .upsert({
                destination,
                weather_data: weatherData,
                cached_at: new Date().toISOString(),
                expires_at: expiresAt.toISOString()
            });
        
        if (error) {
            console.error('保存天气缓存失败:', error);
        }
    } catch (error) {
        console.error('保存天气缓存失败:', error);
    }
}

/**
 * 检查缓存是否过期
 * @param {Object} cacheData - 缓存数据
 * @returns {boolean} - 是否过期
 */
function isCacheExpired(cacheData) {
    if (!cacheData.expires_at) {
        return true;
    }
    
    const expiresAt = new Date(cacheData.expires_at);
    return new Date() > expiresAt;
}

/**
 * 从映射表获取天气（兜底方案）
 * @param {string} destination - 目的地
 * @returns {Promise<Object|null>} - 天气数据
 */
async function getWeatherFromMapping(destination) {
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
            destination: data.destination,
            province: null,
            weather: data.default_weather,
            weatherType: mapWeatherToType(data.default_weather),
            temperature: data.default_temp_range,
            tempRange: data.default_temp_range,
            source: 'mapping',
            suggestions: `${data.destination}属于${data.destination_type}，${data.default_weather}，建议做好准备`
        };
    } catch (error) {
        console.error('从映射表获取天气失败:', error);
        return null;
    }
}

/**
 * 获取默认天气（最终兜底）
 * @param {string} destination - 目的地
 * @returns {Object} - 默认天气数据
 */
function getDefaultWeather(destination) {
    return {
        destination,
        province: null,
        weather: '晴天',
        weatherType: 'sunny',
        temperature: '20-25°C',
        tempRange: '20-25°C',
        source: 'default',
        suggestions: '无法获取准确天气，默认按晴天准备，建议出发前查看最新天气预报'
    };
}

/**
 * 映射天气文本到类型
 * @param {string} weather - 天气文本
 * @returns {string} - 天气类型
 */
function mapWeatherToType(weather) {
    const mapping = {
        '炎热': 'hot',
        '高温': 'hot',
        '晴天': 'sunny',
        '多云': 'cloudy',
        '阴天': 'cloudy',
        '雨天': 'rainy',
        '下雨': 'rainy',
        '低温': 'cold',
        '寒冷': 'cold',
        '雪天': 'snowy',
        '干燥': 'dry',
        '湿润': 'humid'
    };
    
    return mapping[weather] || 'sunny';
}

module.exports = {
    getWeatherByDestination,
    callWeatherForecastAPI,
    callWeatherNowAPI,
    convertForecastFormat,
    convertWeatherFormat,
    generateWeatherSuggestions
};
