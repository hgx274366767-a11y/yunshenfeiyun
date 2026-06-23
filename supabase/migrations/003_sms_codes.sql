-- 创建短信验证码表
CREATE TABLE IF NOT EXISTS sms_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(10) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_sms_codes_phone ON sms_codes(phone);
CREATE INDEX idx_sms_codes_expires ON sms_codes(expires_at);

-- 设置 RLS（行级安全策略）
ALTER TABLE sms_codes ENABLE ROW LEVEL SECURITY;

-- 允许服务角色访问（Edge Functions 使用 service_role key）
CREATE POLICY "Service role can manage sms_codes" ON sms_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 清理过期验证码的函数
CREATE OR REPLACE FUNCTION cleanup_expired_sms_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM sms_codes WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;
