-- Create function to approve merchant application
CREATE OR REPLACE FUNCTION public.approve_merchant_application(p_app_id UUID, p_admin_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_application_exists BOOLEAN;
BEGIN
  -- Check if application exists and is pending
  SELECT EXISTS(
    SELECT 1 FROM public.merchant_applications 
    WHERE id = p_app_id AND status = 'pending'
  ) INTO v_application_exists;
  
  IF NOT v_application_exists THEN
    RAISE EXCEPTION 'Application not found or already processed';
  END IF;
  
  -- Get the user_id from the application
  SELECT user_id INTO v_user_id
  FROM public.merchant_applications
  WHERE id = p_app_id;
  
  -- Update application status
  UPDATE public.merchant_applications
  SET 
    status = 'approved',
    reviewed_by = p_admin_id,
    reviewed_at = NOW()
  WHERE id = p_app_id;
  
  -- Grant merchant status to the user
  UPDATE public.profiles
  SET is_merchant = true
  WHERE id = v_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to reject merchant application
CREATE OR REPLACE FUNCTION public.reject_merchant_application(p_app_id UUID, p_admin_id UUID, p_reason TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_application_exists BOOLEAN;
BEGIN
  -- Check if application exists and is pending
  SELECT EXISTS(
    SELECT 1 FROM public.merchant_applications 
    WHERE id = p_app_id AND status = 'pending'
  ) INTO v_application_exists;
  
  IF NOT v_application_exists THEN
    RAISE EXCEPTION 'Application not found or already processed';
  END IF;
  
  -- Update application status
  UPDATE public.merchant_applications
  SET 
    status = 'rejected',
    reviewed_by = p_admin_id,
    reviewed_at = NOW(),
    rejection_reason = p_reason
  WHERE id = p_app_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.approve_merchant_application(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_merchant_application(UUID, UUID, TEXT) TO authenticated;