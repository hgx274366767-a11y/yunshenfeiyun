-- =============================================
-- 云深飞运 数据库Schema - MVP 1.0
-- 创建时间：2026-05-14
-- 评审：/plan-eng-review 技术架构评审通过
-- =============================================

-- 启用UUID扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. 用户表 (users)
-- =============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    phone_verified BOOLEAN DEFAULT FALSE,
    wx_openid VARCHAR(100) UNIQUE,
    wx_unionid VARCHAR(100),
    wx_avatar VARCHAR(500),
    wx_nickname VARCHAR(100),
    role VARCHAR(20) NOT NULL CHECK (role IN ('client', 'pilot', 'admin')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned')),
    real_name VARCHAR(100),
    id_card VARCHAR(20),
    credit_score INTEGER DEFAULT 70 CHECK (credit_score >= 0 AND credit_score <= 100),
    credit_level VARCHAR(20) DEFAULT 'probation' CHECK (credit_level IN ('gold', 'senior', 'probation', 'restricted', 'expelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_wx_openid ON users(wx_openid);
CREATE INDEX idx_users_role ON users(role);

-- =============================================
-- 2. 飞手表 (pilots)
-- =============================================
CREATE TABLE pilots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 资质认证
    license_type VARCHAR(50),
    license_no VARCHAR(100),
    license_expire_at DATE,
    license_image_url VARCHAR(500),

    -- 无人机信息
    drone_model VARCHAR(100),
    drone_serial VARCHAR(100),
    drone_reg_no VARCHAR(100),
    drone_insurance_no VARCHAR(100),
    drone_image_url VARCHAR(500),

    -- 实名认证
    id_card_front_url VARCHAR(500),
    id_card_back_url VARCHAR(500),

    -- 认证状态
    cert_status VARCHAR(20) DEFAULT 'pending' CHECK (cert_status IN ('pending', 'approved', 'rejected')),
    cert_reject_reason TEXT,
    cert_reviewed_at TIMESTAMPTZ,
    cert_reviewed_by UUID REFERENCES users(id),

    -- 押金状态
    deposit_status VARCHAR(20) DEFAULT 'unpaid' CHECK (deposit_status IN ('unpaid', 'paid', 'frozen', 'refunded')),
    deposit_amount DECIMAL(10,2) DEFAULT 0,
    deposit_paid_at TIMESTAMPTZ,

    -- 当前GPS位置
    current_lat DECIMAL(10,8),
    current_lng DECIMAL(11,8),
    current_location_updated_at TIMESTAMPTZ,

    -- 接单状态
    online_status VARCHAR(20) DEFAULT 'offline' CHECK (online_status IN ('online', 'busy', 'offline')),
    service_radius_km DECIMAL(5,2) DEFAULT 10,

    -- 统计数据
    total_orders INTEGER DEFAULT 0,
    completed_orders INTEGER DEFAULT 0,
    recent_completed_orders_7d INTEGER DEFAULT 0,
    total_income DECIMAL(12,2) DEFAULT 0,
    avg_rating DECIMAL(3,2) DEFAULT 5.00,

    -- 自动派单相关
    dispatch_reject_count INTEGER DEFAULT 0,
    dispatch_reject_this_month INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pilots_user_id ON pilots(user_id);
CREATE INDEX idx_pilots_cert_status ON pilots(cert_status);
CREATE INDEX idx_pilots_online_status ON pilots(online_status);
CREATE INDEX idx_pilots_location ON pilots(current_lat, current_lng);

-- =============================================
-- 3. 订单表 (orders)
-- =============================================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no VARCHAR(32) UNIQUE NOT NULL,

    -- 关联用户
    user_id UUID NOT NULL REFERENCES users(id),
    pilot_id UUID REFERENCES users(id),

    -- 订单类型（含基建建材吊运 - 2026-05-14 架构评审后新增）
    order_type VARCHAR(30) NOT NULL CHECK (order_type IN ('agri_up', 'agri_down', 'emergency', 'forestry', 'construction')),

    -- 物品信息
    goods_type VARCHAR(50),
    goods_weight DECIMAL(8,2) NOT NULL,
    goods_value DECIMAL(12,2),
    goods_desc TEXT,

    -- 取货点
    pickup_address VARCHAR(500),
    pickup_lat DECIMAL(10,8),
    pickup_lng DECIMAL(11,8),

    -- 送达点
    delivery_address VARCHAR(500),
    delivery_lat DECIMAL(10,8),
    delivery_lng DECIMAL(11,8),

    -- 距离信息
    straight_line_distance DECIMAL(8,2),
    actual_flight_distance DECIMAL(8,2),

    -- 地形类型
    terrain_type VARCHAR(20) DEFAULT 'MOUNTAIN' CHECK (terrain_type IN ('PLAIN', 'HILL', 'MOUNTAIN', 'VALLEY', 'CROSSING')),
    is_crossing_river BOOLEAN DEFAULT FALSE,
    is_precision_required BOOLEAN DEFAULT FALSE,

    -- 价格信息
    base_price DECIMAL(10,2),
    transport_price DECIMAL(10,2),
    insurance_premium DECIMAL(10,2),
    insurance_rate DECIMAL(6,4),
    final_price DECIMAL(10,2) NOT NULL,
    price_valid_until TIMESTAMPTZ,
    price_breakdown JSONB,

    -- 保险信息
    insurance_policy_id UUID,
    insurance_coverage DECIMAL(12,2),

    -- 保证金
    deposit_amount DECIMAL(10,2),
    deposit_type VARCHAR(20) DEFAULT 'cash' CHECK (deposit_type IN ('cash', 'insurance')),
    deposit_paid BOOLEAN DEFAULT FALSE,
    deposit_insurance_policy_id UUID,
    is_large_order BOOLEAN DEFAULT FALSE,

    -- 时效要求
    time_required VARCHAR(20) DEFAULT 'STANDARD' CHECK (time_required IN ('STANDARD', 'URGENT_2H', 'URGENT_4H', 'SAME_DAY')),
    promised_delivery_at TIMESTAMPTZ,

    -- 订单状态
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN (
        'pending', 'paid',
        'grabbable_gold', 'grabbable_senior', 'grabbable_all',
        'dispatch_pending', 'dispatch_sent',
        'accepted', 'departed', 'picked_up', 'in_flight',
        'delivered', 'completed',
        'cancelled', 'refunded', 'expired', 'manual_intervention'
    )),

    -- 分层抢单时间控制
    grab_eligible_after TIMESTAMPTZ,
    current_eligible_level VARCHAR(20),

    -- 自动派单相关
    dispatch_type VARCHAR(20) CHECK (dispatch_type IN ('grab', 'auto')),
    auto_dispatch_at TIMESTAMPTZ,
    auto_dispatch_candidates JSONB,
    auto_dispatch_round INTEGER DEFAULT 0,
    auto_dispatch_confirm_deadline TIMESTAMPTZ,
    current_dispatch_pilot_id UUID,

    -- 取消/退款
    cancel_reason TEXT,
    refund_amount DECIMAL(10,2),
    refund_reason TEXT,

    -- 时间记录
    pilot_arrived_at TIMESTAMPTZ,
    picked_up_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,

    -- 照片记录
    pickup_photo_urls TEXT[],
    delivery_photo_urls TEXT[],

    -- 评价
    has_review BOOLEAN DEFAULT FALSE,

    -- 微信支付
    wx_transaction_id VARCHAR(100),
    wx_out_trade_no VARCHAR(64),
    paid_at TIMESTAMPTZ,

    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_pilot_id ON orders(pilot_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_grab_eligible ON orders(grab_eligible_after);

-- =============================================
-- 4. 派单日志表 (dispatch_logs)
-- =============================================
CREATE TABLE dispatch_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    pilot_id UUID NOT NULL REFERENCES users(id),
    dispatch_type VARCHAR(20) DEFAULT 'auto',
    score_breakdown JSONB NOT NULL,
    dispatch_round INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'accepted', 'rejected', 'expired')),
    reject_reason TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dispatch_logs_order_id ON dispatch_logs(order_id);
CREATE INDEX idx_dispatch_logs_pilot_id ON dispatch_logs(pilot_id);

-- =============================================
-- 5. 飞行记录表 (flight_records)
-- =============================================
CREATE TABLE flight_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    file_url VARCHAR(500) NOT NULL,
    file_format VARCHAR(20) DEFAULT 'csv' CHECK (file_format IN ('csv', 'json', 'log')),
    file_size_bytes INTEGER,
    original_filename VARCHAR(255),
    parsed_data JSONB,
    deviation_max_meters DECIMAL(10,2),
    is_compliant BOOLEAN,
    anomalies JSONB,
    declared_route JSONB,
    declared_max_altitude DECIMAL(8,2),
    declared_flight_time JSONB,
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    review_result VARCHAR(20) CHECK (review_result IN ('approved', 'rejected', 'pending')),
    review_comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_flight_records_order_id ON flight_records(order_id);

-- =============================================
-- 6. 保险保单表 (insurance_policies)
-- =============================================
CREATE TABLE insurance_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    deposit_guarantee_order_id UUID,
    policy_number VARCHAR(50) UNIQUE NOT NULL,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('mock', 'ping_an', 'china_life', 'picc')),
    insured_name VARCHAR(100) NOT NULL,
    insured_id_number VARCHAR(20),
    beneficiary VARCHAR(100),
    beneficiary_type VARCHAR(20) DEFAULT 'platform',
    coverage_type VARCHAR(30) NOT NULL CHECK (coverage_type IN ('cargo', 'liability', 'personal_accident', 'deposit_guarantee')),
    coverage_amount DECIMAL(12,2) NOT NULL,
    premium DECIMAL(10,2) NOT NULL,
    premium_rate DECIMAL(6,4),
    effective_date TIMESTAMPTZ NOT NULL,
    expiry_date TIMESTAMPTZ NOT NULL,
    cargo_description TEXT,
    cargo_value DECIMAL(12,2),
    cargo_weight DECIMAL(8,2),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'claimed', 'expired', 'cancelled', 'pending')),
    claim_id VARCHAR(50),
    claim_amount DECIMAL(12,2),
    claim_reason TEXT,
    claim_status VARCHAR(20),
    claim_resolved_at TIMESTAMPTZ,
    policy_document_url VARCHAR(500),
    provider_response JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_insurance_policies_order_id ON insurance_policies(order_id);
CREATE INDEX idx_insurance_policies_policy_number ON insurance_policies(policy_number);

-- =============================================
-- 7. 保险提供商配置表 (insurance_providers)
-- =============================================
CREATE TABLE insurance_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_code VARCHAR(20) UNIQUE NOT NULL,
    provider_name VARCHAR(100) NOT NULL,
    provider_logo_url VARCHAR(500),
    api_endpoint VARCHAR(500),
    api_key_encrypted TEXT,
    api_version VARCHAR(20),
    coverage_types JSONB,
    default_rate_cargo DECIMAL(6,4),
    default_rate_liability DECIMAL(6,4),
    default_rate_accident DECIMAL(6,4),
    default_rate_deposit DECIMAL(6,4),
    config JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入保险提供商初始数据
INSERT INTO insurance_providers (provider_code, provider_name, is_active, priority, coverage_types, default_rate_cargo, default_rate_deposit, config) VALUES
('mock', '云深飞运合作保险', TRUE, 1, '["cargo", "deposit_guarantee"]', 0.005, 0.03, '{"enabled": true}'),
('ping_an', '平安保险', FALSE, 2, '["cargo", "liability", "personal_accident", "deposit_guarantee"]', 0.003, 0.02, '{}');

-- =============================================
-- 8. 保证金记录表 (deposits)
-- =============================================
CREATE TABLE deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deposit_type VARCHAR(20) NOT NULL CHECK (deposit_type IN ('user_cash', 'user_insurance', 'pilot')),
    user_id UUID NOT NULL REFERENCES users(id),
    order_id UUID REFERENCES orders(id),
    amount DECIMAL(10,2) NOT NULL,
    percentage DECIMAL(5,2),
    insurance_policy_id UUID REFERENCES insurance_policies(id),
    insurance_premium DECIMAL(10,2),
    insurance_coverage DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'held' CHECK (status IN ('held', 'released', 'forfeited', 'refunded')),
    change_reason VARCHAR(50),
    description TEXT,
    processed_by UUID REFERENCES users(id),
    processed_at TIMESTAMPTZ,
    wx_transaction_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deposits_user_id ON deposits(user_id);
CREATE INDEX idx_deposits_order_id ON deposits(order_id);

-- =============================================
-- 9. 订单状态日志表 (order_logs)
-- =============================================
CREATE TABLE order_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    operator_id UUID REFERENCES users(id),
    old_status VARCHAR(30),
    new_status VARCHAR(30),
    remark TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_logs_order_id ON order_logs(order_id);

-- =============================================
-- 10. 评价表 (reviews)
-- =============================================
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id),
    reviewee_id UUID NOT NULL REFERENCES users(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    tags TEXT[],
    comment TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    reply TEXT,
    replied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reviews_order_id ON reviews(order_id);
CREATE INDEX idx_reviews_reviewee_id ON reviews(reviewee_id);

-- =============================================
-- 11. 信用分记录表 (credit_score_logs)
-- =============================================
CREATE TABLE credit_score_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    pilot_id UUID REFERENCES users(id),
    order_id UUID REFERENCES orders(id),
    action VARCHAR(50) NOT NULL,
    change_amount INTEGER NOT NULL,
    before_score INTEGER,
    after_score INTEGER,
    reason TEXT,
    is_dispatched_reject BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_credit_score_logs_user_id ON credit_score_logs(user_id);
CREATE INDEX idx_credit_score_logs_created_at ON credit_score_logs(created_at);

-- =============================================
-- 12. 消息通知表 (messages)
-- =============================================
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('system', 'order', 'dispatch', 'payment', 'insurance')),
    related_order_id UUID REFERENCES orders(id),
    related_pilot_id UUID REFERENCES users(id),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_is_read ON messages(is_read);

-- =============================================
-- 13. 公告表 (announcements)
-- =============================================
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'info' CHECK (type IN ('info', 'warning', 'urgent')),
    target_roles TEXT[] DEFAULT ARRAY['client', 'pilot'],
    is_pinned BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    published_by UUID REFERENCES users(id),
    published_at TIMESTAMPTZ,
    expired_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_announcements_is_active ON announcements(is_active);

-- =============================================
-- 14. 系统配置表 (system_config)
-- =============================================
-- 原则：所有可能变更的规则、阈值、系数都存数据库，不能硬编码
CREATE TABLE system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_group VARCHAR(50) NOT NULL,
    config_key VARCHAR(100) NOT NULL,
    config_value JSONB NOT NULL,
    value_type VARCHAR(20) DEFAULT 'json',
    description TEXT,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(config_group, config_key)
);

CREATE INDEX idx_system_config_group ON system_config(config_group);
CREATE INDEX idx_system_config_active ON system_config(is_active);

-- =============================================
-- 15. 定价配置表 (pricing_config)
-- =============================================
CREATE TABLE pricing_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(50) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 16. 保险配置表 (insurance_config)
-- =============================================
CREATE TABLE insurance_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(50) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 17. 飞行异常规则表 (flight_anomaly_rules)
-- =============================================
CREATE TABLE flight_anomaly_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_code VARCHAR(50) UNIQUE NOT NULL,
    rule_name VARCHAR(100) NOT NULL,
    params JSONB NOT NULL,
    severity VARCHAR(20) DEFAULT 'warning',
    auto_flag BOOLEAN DEFAULT TRUE,
    require_review BOOLEAN DEFAULT FALSE,
    auto_action VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 初始化系统配置数据
-- =============================================

-- 保证金/支付配置
INSERT INTO system_config (config_group, config_key, config_value, value_type, description) VALUES
('payment', 'deposit_ratio', '{"value": 0.5}', 'number', '客户保证金比例（订单总价的50%）'),
('payment', 'large_order_threshold', '{"value": 5000}', 'number', '大额订单阈值-单次运费（元）'),
('payment', 'large_order_trigger', '{"condition": "运费>=5000", "description": "单次运费≥5000元触发保证金险"}', 'json', '大额订单触发条件'),

-- 保险配置
('insurance', 'cargo_rate_min', '{"value": 0.003}', 'number', '货物险费率下限（0.3%）'),
('insurance', 'cargo_rate_max', '{"value": 0.01}', 'number', '货物险费率上限（1%）'),
('insurance', 'coverage_multiplier', '{"value": 1.2}', 'number', '保额倍数（货物价值的120%）'),
('insurance', 'deposit_guarantee_rate_min', '{"value": 0.02}', 'number', '保证金险费率下限（2%）'),
('insurance', 'deposit_guarantee_rate_max', '{"value": 0.05}', 'number', '保证金险费率上限（5%）'),

-- 分层抢单配置
('grab', 'gold_window_minutes', '{"value": 5}', 'number', '金牌飞手优先窗口（分钟）'),
('grab', 'senior_window_minutes', '{"value": 5}', 'number', '资深飞手可抢窗口（分钟）'),
('grab', 'basic_order_max_weight', '{"value": 50}', 'number', '基础订单最大载重（kg）'),
('grab', 'basic_order_max_distance', '{"value": 1}', 'number', '基础订单最大距离（km）'),

-- 自动派单配置
('dispatch', 'auto_dispatch_hours', '{"value": 48}', 'number', '无人接单后触发自动派单的小时数'),
('dispatch', 'confirm_timeout_minutes', '{"value": 15}', 'number', '派单确认超时时间（分钟）'),
('dispatch', 'reject_free_count_monthly', '{"value": 3}', 'number', '每月免扣分的拒绝派单次数'),
('dispatch', 'reject_deduction', '{"value": 2}', 'number', '超限后每次拒绝扣分'),
('dispatch', 'score_weights', '{"distance": 0.4, "credit": 0.3, "activity": 0.2, "experience": 0.1}', 'json', '派单评分权重(距离40%+信用30%+活跃度20%+经验10%)'),

-- 信用分配置
('credit', 'level_thresholds', '{"gold": 95, "senior": 85, "probation": 70, "restricted": 60}', 'json', '信用等级分数阈值'),
('credit', 'commission_rates', '{"gold": 0.10, "senior": 0.12, "probation": 0.15}', 'json', '佣金比例'),
('credit', 'deposit_rates', '{"gold": 0.05, "senior": 0.10, "probation": 0.20}', 'json', '保证金比例'),
('credit', 'bonus_on_time', '{"value": 1, "monthly_cap": 10}', 'json', '准时交付加分'),
('credit', 'bonus_five_star', '{"value": 2, "monthly_cap": 20}', 'json', '5星好评加分'),
('credit', 'bonus_dispatch_reject_free', '{"value": 3, "description": "每月免扣分次数"}', 'json', '拒绝派单免扣次数');

-- 初始化定价配置
INSERT INTO pricing_config (config_key, config_value, description) VALUES
('unit_price', '{"value": 3.5, "unit": "元/km"}', '单价基准'),
('weight_coefficients', '{"tiers": [{"max": 50, "coefficient": 1.0}, {"max": 100, "coefficient": 1.2}, {"max": 200, "coefficient": 1.5}, {"max": null, "coefficient": 2.0}]}', '载重系数表'),
('terrain_factors', '{"PLAIN": 0, "HILL": 0.10, "MOUNTAIN": 0.15, "VALLEY": 0.12, "CROSSING": 0.15}', '地形修正因子'),
('demand_factors', '{"BALANCED": 0, "DEMAND_HIGH": 0.15, "DEMAND_LOW": -0.10}', '供需修正因子'),
('time_factors', '{"STANDARD": 0, "URGENT_2H": 0.30, "URGENT_4H": 0.20, "SAME_DAY": 0.10}', '时效修正因子'),
('price_validity_minutes', '{"value": 15}', '价格有效期（分钟）'),
('price_floor', '{"value": 0.7}', '价格下限（最低7折）'),
('price_ceiling', '{"value": 3.0}', '价格上限（最高3倍）');

-- 初始化飞行异常规则
INSERT INTO flight_anomaly_rules (rule_code, rule_name, params, severity, auto_flag, auto_action) VALUES
('ROUTE_DEVIATION', '航线偏离', '{"type": "route_deviation", "threshold_meters": 50}', 'warning', TRUE, 'deduct_credit'),
('ALTITUDE_EXCEED', '高度超限', '{"type": "altitude_exceed", "threshold_meters": 120}', 'error', TRUE, 'notify_pilot'),
('TIME_MISMATCH', '时段不符', '{"type": "time_mismatch"}', 'warning', TRUE, 'none'),
('NO_FLY_ZONE', '进入禁飞区', '{"type": "no_fly_zone"}', 'critical', TRUE, 'deduct_credit');

-- =============================================
-- 触发器
-- =============================================

-- 自动更新 updated_at 列
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pilots_updated_at BEFORE UPDATE ON pilots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_insurance_policies_updated_at BEFORE UPDATE ON insurance_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deposits_updated_at BEFORE UPDATE ON deposits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 订单号自动生成 (YS + 日期 + 随机10位)
CREATE OR REPLACE FUNCTION generate_order_no()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_no IS NULL OR NEW.order_no = '' THEN
        NEW.order_no := 'YS' || TO_CHAR(NOW(), 'YYYYMMDD') || SUBSTR(MD5(RANDOM()::TEXT), 1, 10);
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER generate_order_no_trigger BEFORE INSERT ON orders
    FOR EACH ROW EXECUTE FUNCTION generate_order_no();

-- 保单号自动生成 (YF-PO-日期时间-4位随机)
CREATE OR REPLACE FUNCTION generate_policy_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.policy_number IS NULL OR NEW.policy_number = '' THEN
        NEW.policy_number := 'YF-PO-' || TO_CHAR(NOW(), 'YYYYMMDDHH24MISS') || '-' || SUBSTR(MD5(RANDOM()::TEXT), 1, 4);
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER generate_policy_number_trigger BEFORE INSERT ON insurance_policies
    FOR EACH ROW EXECUTE FUNCTION generate_policy_number();
