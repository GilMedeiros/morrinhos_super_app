-- Drop existing policies for conversation_tags
DROP POLICY IF EXISTS "Admin geral can manage tags" ON conversation_tags;
DROP POLICY IF EXISTS "Admin geral can view all tags" ON conversation_tags;
DROP POLICY IF EXISTS "Admin secretaria can manage their tags" ON conversation_tags;
DROP POLICY IF EXISTS "Users can view tags from their secretaria" ON conversation_tags;

-- Admin geral can do everything
CREATE POLICY "Admin geral can manage all tags"
ON conversation_tags
FOR ALL
TO authenticated
USING (is_admin_geral())
WITH CHECK (is_admin_geral());

-- Admin secretaria can insert tags with their secretaria_id OR global tags (null)
CREATE POLICY "Admin secretaria can insert tags"
ON conversation_tags
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin_secretaria'::app_role
    AND (
      secretaria_id IS NULL  -- Allow creating global tags
      OR secretaria_id = conversation_tags.secretaria_id  -- Or tags for their secretaria
    )
  )
);

-- Admin secretaria can update/delete tags from their secretaria
CREATE POLICY "Admin secretaria can update their tags"
ON conversation_tags
FOR UPDATE
TO authenticated
USING (
  secretaria_id IN (
    SELECT secretaria_id FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin_secretaria'::app_role
  )
);

CREATE POLICY "Admin secretaria can delete their tags"
ON conversation_tags
FOR DELETE
TO authenticated
USING (
  secretaria_id IN (
    SELECT secretaria_id FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin_secretaria'::app_role
  )
);

-- Users can view tags from their secretaria or global tags
CREATE POLICY "Users can view accessible tags"
ON conversation_tags
FOR SELECT
TO authenticated
USING (
  is_admin_geral()
  OR secretaria_id IS NULL  -- Global tags visible to all
  OR secretaria_id IN (
    SELECT secretaria_id FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin_secretaria'::app_role, 'atendente'::app_role)
  )
);