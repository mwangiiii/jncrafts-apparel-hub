-- Fix function search path security issue
-- The update_conversation_on_message function needs a secure search_path

CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  UPDATE public.conversations 
  SET updated_at = NEW.created_at 
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$function$;