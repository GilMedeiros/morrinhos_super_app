-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    -- 'unique', 'scheduled'
    contacts UUID [] DEFAULT ARRAY []::UUID [],
    status VARCHAR(50) DEFAULT 'draft',
    -- 'draft', 'dispatched', 'completed'
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    dispatched_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW()
);
-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    tags VARCHAR(255),
    -- semicolon-separated tags
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- Create message_logs table
CREATE TABLE IF NOT EXISTS message_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    message_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    -- 'queued', 'sent', 'delivered', 'read', 'failed'
    error TEXT,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
-- Create indexes for performance
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_message_logs_campaign ON message_logs(campaign_id);
CREATE INDEX idx_message_logs_contact ON message_logs(contact_id);
CREATE INDEX idx_message_logs_status ON message_logs(status);