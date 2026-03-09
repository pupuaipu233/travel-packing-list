const { createClient } = require('@supabase/supabase-js');

// Supabase配置
const supabaseUrl = 'https://ritmvwytkgbpkasqulgz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpdG12d3l0a2dicGthc3F1bGd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NDc5NzUsImV4cCI6MjA4ODAyMzk3NX0.-gZbv7mET8XxFw3eILPLaqBGYCkZFus4GvU8tMPyrrM';

// 创建Supabase客户端
const supabase = createClient(supabaseUrl, supabaseKey);

// 导出Supabase客户端
module.exports = supabase;