-- Create logs table for centralized application logging
CREATE TABLE IF NOT EXISTS logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level VARCHAR(20) NOT NULL CHECK (
        level IN ('info', 'warning', 'error', 'debug', 'success')
    ),
    module VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE
    SET NULL
);
-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_logs_module ON logs(module);
CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_module_level ON logs(module, level);
-- Set up row level security
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
-- Allow authenticated users to insert their own logs
CREATE POLICY "Users can insert logs" ON logs FOR
INSERT WITH CHECK (auth.role() = 'authenticated');
-- Allow authenticated users to view logs (for debugging)
CREATE POLICY "Users can view logs" ON logs FOR
SELECT USING (auth.role() = 'authenticated');