-- =============================================
-- 云深飞运 数据库RPC函数
-- 创建时间：2026-05-14
-- =============================================

-- =============================================
-- attempt_grab_order: 分层抢单原子操作
-- 使用行级锁 (FOR UPDATE NOWAIT) 保证唯一飞手
-- =============================================
CREATE OR REPLACE FUNCTION attempt_grab_order(
    p_order_id UUID,
    p_pilot_id UUID,
    p_gold_window_minutes INT,
    p_senior_window_minutes INT,
    p_gold_threshold INT,
    p_senior_threshold INT
) RETURNS JSONB AS $$
DECLARE
    v_order orders%ROWTYPE;
    v_pilot pilots%ROWTYPE;
    v_user users%ROWTYPE;
    v_eligible_level VARCHAR(20);
    v_minutes_since_create INT;
BEGIN
    -- 行级锁：锁定订单行
    SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE NOWAIT;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'ORDER_NOT_FOUND');
    END IF;

    -- 检查订单状态
    IF v_order.status NOT IN ('grabbable_gold', 'grabbable_senior', 'grabbable_all') THEN
        RETURN jsonb_build_object('success', false, 'error', 'ORDER_NOT_GRABBABLE', 'current_status', v_order.status);
    END IF;

    -- 获取飞手信息
    SELECT * INTO v_pilot FROM pilots WHERE user_id = p_pilot_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'PILOT_NOT_FOUND');
    END IF;

    IF v_pilot.cert_status != 'approved' THEN
        RETURN jsonb_build_object('success', false, 'error', 'PILOT_NOT_CERTIFIED');
    END IF;

    IF v_pilot.online_status = 'offline' THEN
        RETURN jsonb_build_object('success', false, 'error', 'PILOT_OFFLINE');
    END IF;

    -- 获取用户信用分
    SELECT * INTO v_user FROM users WHERE id = p_pilot_id;

    -- 计算当前抢单阶段
    v_minutes_since_create := EXTRACT(EPOCH FROM (NOW() - v_order.grab_eligible_after)) / 60;

    IF v_minutes_since_create <= p_gold_window_minutes THEN
        v_eligible_level := 'gold';
    ELSIF v_minutes_since_create <= (p_gold_window_minutes + p_senior_window_minutes) THEN
        v_eligible_level := 'senior';
    ELSE
        v_eligible_level := 'all';
    END IF;

    -- 检查飞手等级权限
    IF v_eligible_level = 'gold' AND v_user.credit_score < p_gold_threshold THEN
        RETURN jsonb_build_object('success', false, 'error', 'CREDIT_INSUFFICIENT_FOR_GOLD',
            'required', p_gold_threshold, 'current', v_user.credit_score);
    END IF;

    IF v_eligible_level = 'senior' AND v_user.credit_score < p_senior_threshold THEN
        RETURN jsonb_build_object('success', false, 'error', 'CREDIT_INSUFFICIENT_FOR_SENIOR',
            'required', p_senior_threshold, 'current', v_user.credit_score);
    END IF;

    -- 执行抢单
    UPDATE orders SET
        pilot_id = p_pilot_id,
        status = 'accepted',
        dispatch_type = 'grab',
        current_eligible_level = v_eligible_level,
        updated_at = NOW()
    WHERE id = p_order_id;

    -- 写入派单日志
    INSERT INTO dispatch_logs (order_id, pilot_id, dispatch_type, score_breakdown, dispatch_round, status)
    VALUES (p_order_id, p_pilot_id, 'grab',
        jsonb_build_object('eligible_level', v_eligible_level, 'credit_score', v_user.credit_score),
        0, 'accepted');

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'pilot_id', p_pilot_id,
        'eligible_level', v_eligible_level,
        'minutes_since_create', v_minutes_since_create
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- update_credit_score: 信用分更新（含等级重算）
-- =============================================
CREATE OR REPLACE FUNCTION update_credit_score(
    p_user_id UUID,
    p_change_amount INT,
    p_action VARCHAR(50),
    p_order_id UUID DEFAULT NULL,
    p_reason TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_user users%ROWTYPE;
    v_new_score INT;
    v_new_level VARCHAR(20);
    v_thresholds JSONB;
BEGIN
    SELECT * INTO v_user FROM users WHERE id = p_user_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND');
    END IF;

    -- 计算新分数 (0-100)
    v_new_score := GREATEST(0, LEAST(100, v_user.credit_score + p_change_amount));

    -- 获取等级阈值
    SELECT config_value INTO v_thresholds FROM system_config
    WHERE config_group = 'credit' AND config_key = 'level_thresholds' AND is_active = true;

    -- 重算等级
    IF v_new_score >= COALESCE((v_thresholds->>'gold')::INT, 95) THEN
        v_new_level := 'gold';
    ELSIF v_new_score >= COALESCE((v_thresholds->>'senior')::INT, 85) THEN
        v_new_level := 'senior';
    ELSIF v_new_score >= COALESCE((v_thresholds->>'probation')::INT, 70) THEN
        v_new_level := 'probation';
    ELSIF v_new_score >= COALESCE((v_thresholds->>'restricted')::INT, 60) THEN
        v_new_level := 'restricted';
    ELSE
        v_new_level := 'expelled';
    END IF;

    -- 写入信用分变动日志
    INSERT INTO credit_score_logs (user_id, order_id, action, change_amount, before_score, after_score, reason)
    VALUES (p_user_id, p_order_id, p_action, p_change_amount, v_user.credit_score, v_new_score, p_reason);

    -- 更新用户信用分
    UPDATE users SET credit_score = v_new_score, credit_level = v_new_level, updated_at = NOW()
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'previous_score', v_user.credit_score,
        'new_score', v_new_score,
        'new_level', v_new_level,
        'change_amount', p_change_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- get_config: 获取配置组（热加载）
-- =============================================
CREATE OR REPLACE FUNCTION get_config(p_config_group VARCHAR)
RETURNS TABLE(config_key VARCHAR, config_value JSONB) AS $$
BEGIN
    RETURN QUERY
    SELECT sc.config_key, sc.config_value
    FROM system_config sc
    WHERE sc.config_group = p_config_group AND sc.is_active = true;
END;
$$ LANGUAGE plpgsql;
