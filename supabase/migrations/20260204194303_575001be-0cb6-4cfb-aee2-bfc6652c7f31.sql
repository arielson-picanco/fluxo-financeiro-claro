-- Create function to insert system log
CREATE OR REPLACE FUNCTION public.insert_system_log(
  p_user_id uuid,
  p_user_name text,
  p_action text,
  p_entity_type text,
  p_entity_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT NULL,
  p_status text DEFAULT 'success'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.system_logs (user_id, user_name, action, entity_type, entity_id, details, status)
  VALUES (p_user_id, p_user_name, p_action, p_entity_type, p_entity_id, p_details, p_status)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;