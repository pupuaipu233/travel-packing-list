-- 智能清单生成功能数据库扩展脚本
-- 执行时间: 2026-03-09
-- 功能: 为packing_lists表添加AI生成相关字段

-- 1. 添加新字段
-- 目的地
ALTER TABLE packing_lists 
ADD COLUMN IF NOT EXISTS destination VARCHAR(100);

-- 出行目的
ALTER TABLE packing_lists 
ADD COLUMN IF NOT EXISTS trip_purpose VARCHAR(50);

-- 旅行者类型
ALTER TABLE packing_lists 
ADD COLUMN IF NOT EXISTS traveler_type VARCHAR(50);

-- 个人偏好（JSON数组格式）
ALTER TABLE packing_lists 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '[]';

-- AI生成的特别提醒
ALTER TABLE packing_lists 
ADD COLUMN IF NOT EXISTS ai_tips TEXT;

-- 是否由AI生成
ALTER TABLE packing_lists 
ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false;

-- 2. 添加注释
COMMENT ON COLUMN packing_lists.destination IS '旅行目的地';
COMMENT ON COLUMN packing_lists.trip_purpose IS '出行目的（度假/商务/探亲/户外等）';
COMMENT ON COLUMN packing_lists.traveler_type IS '旅行者类型（单人/情侣/亲子/朋友等）';
COMMENT ON COLUMN packing_lists.preferences IS '个人偏好（JSON数组，如["摄影", "美食"]）';
COMMENT ON COLUMN packing_lists.ai_tips IS 'AI生成的特别提醒和建议';
COMMENT ON COLUMN packing_lists.ai_generated IS '标记该清单是否由AI生成';

-- 3. 创建索引（提高查询性能）
-- 按目的地查询
CREATE INDEX IF NOT EXISTS idx_packing_lists_destination 
ON packing_lists(destination);

-- 按AI生成标记查询
CREATE INDEX IF NOT EXISTS idx_packing_lists_ai_generated 
ON packing_lists(ai_generated);

-- 按出行目的查询
CREATE INDEX IF NOT EXISTS idx_packing_lists_trip_purpose 
ON packing_lists(trip_purpose);

-- 4. 更新现有数据（将旧数据标记为非AI生成）
UPDATE packing_lists 
SET ai_generated = false 
WHERE ai_generated IS NULL;

-- 5. 验证更新结果
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM 
    information_schema.columns 
WHERE 
    table_name = 'packing_lists'
ORDER BY 
    ordinal_position;

-- 6. 查看表结构
-- \d packing_lists
