const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase配置 - 从环境变量读取
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// 验证环境变量
if (!supabaseUrl || !supabaseKey) {
    console.error('错误：缺少 Supabase 环境变量');
    console.error('请确保 .env 文件中包含 SUPABASE_URL 和 SUPABASE_KEY');
    process.exit(1);
}

// 创建Supabase客户端
const supabase = createClient(supabaseUrl, supabaseKey);

// 导出Supabase客户端
module.exports = supabase;
