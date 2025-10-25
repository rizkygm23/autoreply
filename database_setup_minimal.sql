-- =============================================
-- Database Setup for Gemini Auto Reply System
-- MINIMAL VERSION - Step by step
-- =============================================

-- Step 1: Create user table first
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

-- Step 2: Create payment table
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

-- Step 3: Create token_ai_usage table
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

-- Step 4: Add foreign key constraints
ALTER TABLE payment 
ADD CONSTRAINT fk_payment_user_id 
FOREIGN KEY (user_id) REFERENCES "user"(user_id) ON DELETE CASCADE;

ALTER TABLE token_ai_usage 
ADD CONSTRAINT fk_token_usage_user_id 
FOREIGN KEY (user_id) REFERENCES "user"(user_id) ON DELETE CASCADE;

-- Step 5: Create indexes
CREATE INDEX IF NOT EXISTS idx_user_mail ON "user"(user_mail);
CREATE INDEX IF NOT EXISTS idx_user_active ON "user"(is_active);
CREATE INDEX IF NOT EXISTS idx_payment_user_id ON payment(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_txhash ON payment(arbitrum_txhash);
CREATE INDEX IF NOT EXISTS idx_token_usage_user_id ON token_ai_usage(user_id);

-- Step 6: Create functions
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

CREATE OR REPLACE FUNCTION deduct_user_tokens(p_user_id INTEGER, p_tokens_to_deduct INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    current_tokens NUMERIC;
BEGIN
    IF NOT check_user_tokens(p_user_id, p_tokens_to_deduct) THEN
        RETURN FALSE;
    END IF;
    
    UPDATE "user"
    SET user_token = user_token - p_tokens_to_deduct,
        updated_at = NOW()
    WHERE user_id = p_user_id AND is_active = TRUE;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

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

-- Step 7: Create trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 8: Create trigger
CREATE TRIGGER update_user_updated_at
    BEFORE UPDATE ON "user"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'Database setup completed successfully!' as status;
