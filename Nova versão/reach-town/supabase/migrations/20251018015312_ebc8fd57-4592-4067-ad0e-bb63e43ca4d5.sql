-- Drop the problematic insert policy
DROP POLICY IF EXISTS "Admin secretaria can insert tags" ON conversation_tags;

-- Recreate insert policy with correct logic
-- Admin secretaria can insert tags for their secretaria or global tags (null)
CREATE POLICY "Admin secretaria can insert tags"
ON conversation_tags
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be admin_secretaria
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin_secretaria'::app_role
  )
  AND (
    -- Either creating a global tag (null)
    secretaria_id IS NULL
    OR
    -- Or creating a tag for a secretaria they belong to
    secretaria_id IN (
      SELECT secretaria_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin_secretaria'::app_role
    )
  )
);