-- 创建数据库
CREATE DATABASE IF NOT EXISTS travel_packing;

-- 使用数据库
USE travel_packing;

-- 创建打包清单表
CREATE TABLE IF NOT EXISTS packing_lists (
    id INT AUTO_INCREMENT PRIMARY KEY,
    travel_days INT NOT NULL CHECK (travel_days BETWEEN 1 AND 7),
    weather ENUM('晴天', '雨天', '低温') NOT NULL,
    list_content JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_created_at (created_at),
    INDEX idx_travel_weather (travel_days, weather)
);

-- 插入测试数据
INSERT INTO packing_lists (travel_days, weather, list_content) VALUES
(3, '晴天', '{"must_have": ["身份证", "手机", "充电器", "换洗衣物（3套）", "防晒霜", "充电宝"], "optional": ["帽子", "墨镜", "洗漱用品"]}'),
(5, '雨天', '{"must_have": ["身份证", "手机", "充电器", "换洗衣物（5套）", "雨具", "充电宝"], "optional": ["雨伞", "防水鞋套", "洗漱用品"]}'),
(2, '低温', '{"must_have": ["身份证", "手机", "充电器", "换洗衣物（2套）", "厚外套", "充电宝"], "optional": ["围巾", "手套", "帽子"]}');