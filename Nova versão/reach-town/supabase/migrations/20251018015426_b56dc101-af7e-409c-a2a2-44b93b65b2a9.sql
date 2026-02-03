-- Drop the current insert policy
DROP POLICY IF EXISTS "Admin secretaria can insert tags" ON conversation_tags;

-- Recreate insert policy to allow both admin_secretaria and atendente to create tags
CREATE POLICY "Admin and atendente can insert tags"
ON conversation_tags
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be admin_secretaria or atendente
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin_secretaria'::app_role, 'atendente'::app_role)
  )
  AND (
    -- Either creating a global tag (null)
    secretaria_id IS NULL
    OR
    -- Or creating a tag for a secretaria they belong to
    secretaria_id IN (
      SELECT secretaria_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin_secretaria'::app_role, 'atendente'::app_role)
    )
  )
);

-- Update the update policy to include atendentes
DROP POLICY IF EXISTS "Admin secretaria can update their tags" ON conversation_tags;

CREATE POLICY "Admin and atendente can update their tags"
ON conversation_tags
FOR UPDATE
TO authenticated
USING (
  secretaria_id IN (
    SELECT secretaria_id FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin_secretaria'::app_role, 'atendente'::app_role)
  )
);

-- Update the delete policy to include atendentes
DROP POLICY IF EXISTS "Admin secretaria can delete their tags" ON conversation_tags;

CREATE POLICY "Admin and atendente can delete their tags"
ON conversation_tags
FOR DELETE
TO authenticated
USING (
  secretaria_id IN (
    SELECT secretaria_id FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin_secretaria'::app_role, 'atendente'::app_role)
  )
);