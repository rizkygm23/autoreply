-- =============================================
-- Database Setup for Gemini Auto Reply System
-- SIMPLIFIED VERSION - Run this first
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. USER TABLE (Create first)
-- =============================================
CREATE TABLE IF NOT EXISTS "user" (
    user_id SERIAL PRIMARY KEY,
    user_mail TEXT UNIQUE NOT NULL,
    user_room JSONB NOT NULL DEFAULT '["rialo", "lighter", "mmt", "cys", "mega", "fgo", "town"]'::jsonb,
    user_room_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    user_token NUMERIC NOT NULL DEFAULT 200000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- =============================================
-- 2. PAYMENT TABLE (Create without foreign key first)
-- =============================================
CREATE TABLE IF NOT EXISTS payment (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    arbitrum_txhash TEXT UNIQUE NOT NULL,
    valueDollar INTEGER NOT NULL CHECK (valueDollar >= 5),
    valueToken NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    network TEXT DEFAULT 'arbitrum',
    block_number BIGINT,
    gas_used BIGINT
);

-- =============================================
-- 3. TOKEN_AI_USAGE TABLE (Create without foreign key first)
-- =============================================
CREATE TABLE IF NOT EXISTS token_ai_usage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token_usage INTEGER NOT NULL CHECK (token_usage > 0),
    ai_response TEXT,
    status_request TEXT DEFAULT 'success' CHECK (status_request IN ('success', 'failed', 'error')),
    endpoint TEXT NOT NULL,
    room_id TEXT,
    request_data JSONB,
    response_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processing_time_ms INTEGER,
    ip_address INET,
    user_agent TEXT
);

-- =============================================
-- 4. ADD FOREIGN KEY CONSTRAINTS (After all tables exist)
-- =============================================

-- Add foreign key for payment table
ALTER TABLE payment 
ADD CONSTRAINT fk_payment_user_id 
FOREIGN KEY (user_id) REFERENCES "user"(user_id) ON DELETE CASCADE;

-- Add foreign key for token_ai_usage table
ALTER TABLE token_ai_usage 
ADD CONSTRAINT fk_token_usage_user_id 
FOREIGN KEY (user_id) REFERENCES "user"(user_id) ON DELETE CASCADE;

-- =============================================
-- 5. INDEXES FOR PERFORMANCE
-- =============================================

-- User table indexes
CREATE INDEX IF NOT EXISTS idx_user_mail ON "user"(user_mail);
CREATE INDEX IF NOT EXISTS idx_user_active ON "user"(is_active);
CREATE INDEX IF NOT EXISTS idx_user_created ON "user"(created_at);

-- Payment table indexes
CREATE INDEX IF NOT EXISTS idx_payment_user_id ON payment(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_txhash ON payment(arbitrum_txhash);
CREATE INDEX IF NOT EXISTS idx_payment_status ON payment(status);
CREATE INDEX IF NOT EXISTS idx_payment_created ON payment(created_at);

-- Token usage table indexes
CREATE INDEX IF NOT EXISTS idx_token_usage_user_id ON token_ai_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_created ON token_ai_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_token_usage_endpoint ON token_ai_usage(endpoint);
CREATE INDEX IF NOT EXISTS idx_token_usage_room_id ON token_ai_usage(room_id);

-- =============================================
-- 6. TRIGGERS FOR UPDATED_AT
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for user table
DROP TRIGGER IF EXISTS update_user_updated_at ON "user";
CREATE TRIGGER update_user_updated_at
    BEFORE UPDATE ON "user"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 7. FUNCTIONS FOR TOKEN MANAGEMENT
-- =============================================

-- Function to check if user has enough tokens
CREATE OR REPLACE FUNCTION check_user_tokens(p_user_id INTEGER, p_required_tokens INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    current_tokens NUMERIC;
BEGIN
    SELECT user_token INTO current_tokens
    FROM "user"
    WHERE user_id = p_user_id AND is_active = TRUE;
    
    IF current_tokens IS NULL THEN
        RETURN FALSE;
    END IF;
    
    RETURN current_tokens >= p_required_tokens;
END;
$$ LANGUAGE plpgsql;

-- Function to deduct tokens from user
CREATE OR REPLACE FUNCTION deduct_user_tokens(p_user_id INTEGER, p_tokens_to_deduct INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    current_tokens NUMERIC;
BEGIN
    -- Check if user has enough tokens
    IF NOT check_user_tokens(p_user_id, p_tokens_to_deduct) THEN
        RETURN FALSE;
    END IF;
    
    -- Deduct tokens
    UPDATE "user"
    SET user_token = user_token - p_tokens_to_deduct,
        updated_at = NOW()
    WHERE user_id = p_user_id AND is_active = TRUE;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to add tokens to user (for payments)
CREATE OR REPLACE FUNCTION add_user_tokens(p_user_id INTEGER, p_tokens_to_add NUMERIC)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE "user"
    SET user_token = user_token + p_tokens_to_add,
        updated_at = NOW()
    WHERE user_id = p_user_id AND is_active = TRUE;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 8. VIEWS FOR ANALYTICS
-- =============================================

-- View for user statistics
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    u.user_id,
    u.user_mail,
    u.user_token,
    u.created_at,
    COUNT(p.id) as total_payments,
    COALESCE(SUM(p.valueToken), 0) as total_tokens_purchased,
    COUNT(t.id) as total_ai_requests,
    COALESCE(SUM(t.token_usage), 0) as total_tokens_used,
    COALESCE(SUM(CASE WHEN t.created_at >= CURRENT_DATE THEN t.token_usage ELSE 0 END), 0) as tokens_used_today
FROM "user" u
LEFT JOIN payment p ON u.user_id = p.user_id AND p.status = 'confirmed'
LEFT JOIN token_ai_usage t ON u.user_id = t.user_id
WHERE u.is_active = TRUE
GROUP BY u.user_id, u.user_mail, u.user_token, u.created_at;

-- View for payment analytics
CREATE OR REPLACE VIEW payment_analytics AS
SELECT 
    DATE_TRUNC('day', created_at) as payment_date,
    COUNT(*) as total_payments,
    SUM(valueDollar) as total_dollar_value,
    SUM(valueToken) as total_tokens_sold,
    AVG(valueDollar) as avg_payment_amount
FROM payment
WHERE status = 'confirmed'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY payment_date DESC;

-- =============================================
-- 9. ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_ai_usage ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 10. COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE "user" IS 'Stores user information and token balances';
COMMENT ON TABLE payment IS 'Records USDC payments and token purchases';
COMMENT ON TABLE token_ai_usage IS 'Logs AI token usage for each request';

COMMENT ON COLUMN "user".user_room IS 'JSON array of available rooms for the user';
COMMENT ON COLUMN "user".user_room_data IS 'JSON object containing room-specific data from data folder';
COMMENT ON COLUMN "user".user_token IS 'Current token balance (starts with 200,000 free tokens)';

COMMENT ON COLUMN payment.arbitrum_txhash IS 'Transaction hash from Arbitrum network';
COMMENT ON COLUMN payment.valueDollar IS 'Dollar value of payment (minimum $5)';
COMMENT ON COLUMN payment.valueToken IS 'Tokens received for this payment';

COMMENT ON COLUMN token_ai_usage.token_usage IS 'Number of tokens consumed in this request';
COMMENT ON COLUMN token_ai_usage.endpoint IS 'API endpoint that was called';
COMMENT ON COLUMN token_ai_usage.room_id IS 'Room ID used for the request';

-- =============================================
-- SUCCESS MESSAGE
-- =============================================
SELECT 'Database setup completed successfully!' as status;
