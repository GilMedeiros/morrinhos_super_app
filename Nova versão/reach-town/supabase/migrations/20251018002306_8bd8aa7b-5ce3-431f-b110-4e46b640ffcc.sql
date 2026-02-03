-- Function to auto-open conversation when customer sends message
CREATE OR REPLACE FUNCTION public.auto_open_conversation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If message is from customer and conversation is closed, reopen it
  IF NEW.is_from_customer = true THEN
    UPDATE public.whatsapp_conversations
    SET 
      status = 'aberto',
      updated_at = now()
    WHERE id = NEW.conversation_id
      AND status = 'fechado';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-open conversations
DROP TRIGGER IF EXISTS trigger_auto_open_conversation ON public.whatsapp_messages;

CREATE TRIGGER trigger_auto_open_conversation
  AFTER INSERT ON public.whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_open_conversation();