-- Database setup with password field
-- Run this script in your Supabase SQL editor

-- Create user table with password
CREATE TABLE IF NOT EXISTS "user" (
    "user_id" SERIAL PRIMARY KEY,
    "user_mail" VARCHAR(255) UNIQUE NOT NULL,
    "user_password" VARCHAR(255) NOT NULL,
    "user_room" JSONB DEFAULT '["rialo", "lighter", "mmt", "cys", "mega", "fgo", "town"]',
    "user_room_data" JSONB DEFAULT '{}',
    "user_token" INTEGER DEFAULT 200000,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payment table
CREATE TABLE IF NOT EXISTS "payment" (
    "id" SERIAL PRIMARY KEY,
    "user_id" INTEGER NOT NULL,
    "arbitrum_txhash" VARCHAR(255) UNIQUE NOT NULL,
    "valueDollar" DECIMAL(10,2) NOT NULL,
    "valueToken" INTEGER NOT NULL,
    "status" VARCHAR(50) DEFAULT 'pending',
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "confirmed_at" TIMESTAMP WITH TIME ZONE
);

-- Create token_ai_usage table
CREATE TABLE IF NOT EXISTS "token_ai_usage" (
    "id" SERIAL PRIMARY KEY,
    "user_id" INTEGER NOT NULL,
    "token_usage" INTEGER NOT NULL,
    "ai_response" TEXT,
    "status_request" VARCHAR(50) DEFAULT 'success',
    "endpoint" VARCHAR(100),
    "room_id" VARCHAR(50),
    "request_data" JSONB,
    "response_data" JSONB,
    "processing_time_ms" INTEGER,
    "ip_address" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraints
ALTER TABLE "payment" ADD CONSTRAINT "fk_payment_user" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE;
ALTER TABLE "token_ai_usage" ADD CONSTRAINT "fk_token_usage_user" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_user_email" ON "user"("user_mail");
CREATE INDEX IF NOT EXISTS "idx_user_active" ON "user"("is_active");
CREATE INDEX IF NOT EXISTS "idx_payment_user" ON "payment"("user_id");
CREATE INDEX IF NOT EXISTS "idx_payment_txhash" ON "payment"("arbitrum_txhash");
CREATE INDEX IF NOT EXISTS "idx_token_usage_user" ON "token_ai_usage"("user_id");
CREATE INDEX IF NOT EXISTS "idx_token_usage_created" ON "token_ai_usage"("created_at");

-- Create RPC functions for token management
CREATE OR REPLACE FUNCTION check_user_tokens(p_user_id INTEGER, p_required_tokens INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (SELECT user_token >= p_required_tokens FROM "user" WHERE user_id = p_user_id AND is_active = true);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION deduct_user_tokens(p_user_id INTEGER, p_tokens_to_deduct INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE "user" 
    SET user_token = user_token - p_tokens_to_deduct,
        updated_at = NOW()
    WHERE user_id = p_user_id AND is_active = true AND user_token >= p_tokens_to_deduct;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION add_user_tokens(p_user_id INTEGER, p_tokens_to_add INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE "user" 
    SET user_token = user_token + p_tokens_to_add,
        updated_at = NOW()
    WHERE user_id = p_user_id AND is_active = true;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Create view for user stats
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    u.user_id,
    u.user_mail,
    u.user_token,
    u.created_at,
    COALESCE(SUM(t.token_usage), 0) as total_tokens_used,
    COALESCE(COUNT(t.id), 0) as total_requests,
    COALESCE(SUM(p.valueToken), 0) as total_tokens_purchased
FROM "user" u
LEFT JOIN token_ai_usage t ON u.user_id = t.user_id
LEFT JOIN payment p ON u.user_id = p.user_id AND p.status = 'confirmed'
WHERE u.is_active = true
GROUP BY u.user_id, u.user_mail, u.user_token, u.created_at;

-- Insert sample data (optional)
-- INSERT INTO "user" (user_mail, user_password, user_token) VALUES 
-- ('test@example.com', 'password123', 200000);

COMMIT;
