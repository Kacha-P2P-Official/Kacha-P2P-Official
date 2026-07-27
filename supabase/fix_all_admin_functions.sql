-- ============================================
-- MERCHANT APPLICATION FUNCTIONS
-- ============================================

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

-- ============================================
-- MERCHANT DEPOSIT FUNCTIONS
-- ============================================

-- Create function to confirm merchant deposit
CREATE OR REPLACE FUNCTION public.confirm_merchant_deposit(p_deposit_id UUID, p_admin_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_merchant_id UUID;
  v_amount_usdt NUMERIC;
  v_deposit_exists BOOLEAN;
BEGIN
  -- Check if deposit exists and is pending
  SELECT EXISTS(
    SELECT 1 FROM public.merchant_deposits 
    WHERE id = p_deposit_id AND status = 'pending'
  ) INTO v_deposit_exists;
  
  IF NOT v_deposit_exists THEN
    RAISE EXCEPTION 'Deposit not found or already processed';
  END IF;
  
  -- Get merchant details
  SELECT merchant_id, amount_usdt INTO v_merchant_id, v_amount_usdt
  FROM public.merchant_deposits
  WHERE id = p_deposit_id;
  
  -- Update deposit status
  UPDATE public.merchant_deposits
  SET 
    status = 'confirmed',
    reviewed_by = p_admin_id,
    reviewed_at = NOW()
  WHERE id = p_deposit_id;
  
  -- Add funds to merchant balance
  UPDATE public.profiles
  SET balance_usdt = balance_usdt + v_amount_usdt
  WHERE id = v_merchant_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to reject merchant deposit
CREATE OR REPLACE FUNCTION public.reject_merchant_deposit(p_deposit_id UUID, p_admin_id UUID, p_reason TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_deposit_exists BOOLEAN;
BEGIN
  -- Check if deposit exists and is pending
  SELECT EXISTS(
    SELECT 1 FROM public.merchant_deposits 
    WHERE id = p_deposit_id AND status = 'pending'
  ) INTO v_deposit_exists;
  
  IF NOT v_deposit_exists THEN
    RAISE EXCEPTION 'Deposit not found or already processed';
  END IF;
  
  -- Update deposit status
  UPDATE public.merchant_deposits
  SET 
    status = 'rejected',
    reviewed_by = p_admin_id,
    reviewed_at = NOW(),
    rejection_reason = p_reason
  WHERE id = p_deposit_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to transfer funds to merchant
CREATE OR REPLACE FUNCTION public.transfer_to_merchant(p_deposit_id UUID, p_admin_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_merchant_id UUID;
  v_amount_usdt NUMERIC;
  v_deposit_exists BOOLEAN;
BEGIN
  -- Check if deposit exists and is confirmed
  SELECT EXISTS(
    SELECT 1 FROM public.merchant_deposits 
    WHERE id = p_deposit_id AND status = 'confirmed'
  ) INTO v_deposit_exists;
  
  IF NOT v_deposit_exists THEN
    RAISE EXCEPTION 'Deposit not found or not confirmed';
  END IF;
  
  -- Get merchant details
  SELECT merchant_id, amount_usdt INTO v_merchant_id, v_amount_usdt
  FROM public.merchant_deposits
  WHERE id = p_deposit_id;
  
  -- Add funds to merchant balance
  UPDATE public.profiles
  SET balance_usdt = balance_usdt + v_amount_usdt
  WHERE id = v_merchant_id;
  
  -- Update deposit status
  UPDATE public.merchant_deposits
  SET status = 'completed'
  WHERE id = p_deposit_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to refund merchant deposit
CREATE OR REPLACE FUNCTION public.refund_merchant_deposit(p_deposit_id UUID, p_admin_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_deposit_exists BOOLEAN;
BEGIN
  -- Check if deposit exists
  SELECT EXISTS(
    SELECT 1 FROM public.merchant_deposits 
    WHERE id = p_deposit_id
  ) INTO v_deposit_exists;
  
  IF NOT v_deposit_exists THEN
    RAISE EXCEPTION 'Deposit not found';
  END IF;
  
  -- Update deposit status
  UPDATE public.merchant_deposits
  SET 
    status = 'refunded',
    reviewed_by = p_admin_id,
    reviewed_at = NOW()
  WHERE id = p_deposit_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- DISPUTE FUNCTIONS
-- ============================================

-- Create function to resolve disputes
CREATE OR REPLACE FUNCTION public.admin_resolve_dispute(p_dispute_id UUID, p_admin_id UUID, p_resolution TEXT, p_winner TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_dispute_exists BOOLEAN;
  v_trade_id UUID;
BEGIN
  -- Check if dispute exists
  SELECT EXISTS(
    SELECT 1 FROM public.disputes 
    WHERE id = p_dispute_id AND status = 'open'
  ) INTO v_dispute_exists;
  
  IF NOT v_dispute_exists THEN
    RAISE EXCEPTION 'Dispute not found or already resolved';
  END IF;
  
  -- Get trade_id
  SELECT trade_id INTO v_trade_id
  FROM public.disputes
  WHERE id = p_dispute_id;
  
  -- Update dispute status
  UPDATE public.disputes
  SET 
    status = 'resolved',
    resolution = p_resolution,
    winner = p_winner,
    resolved_by = p_admin_id,
    resolved_at = NOW()
  WHERE id = p_dispute_id;
  
  -- Update trade status based on resolution
  IF p_winner = 'buyer' THEN
    UPDATE public.trades
    SET status = 'cancelled'
    WHERE id = v_trade_id;
  ELSIF p_winner = 'seller' THEN
    UPDATE public.trades
    SET status = 'completed'
    WHERE id = v_trade_id;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUND TRANSFER FUNCTIONS
-- ============================================

-- Create function to transfer funds between users
CREATE OR REPLACE FUNCTION public.admin_transfer_funds(p_from_user_id UUID, p_to_user_id UUID, p_amount_usdt NUMERIC, p_admin_id UUID, p_reason TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_from_balance NUMERIC;
BEGIN
  -- Get sender balance
  SELECT balance_usdt INTO v_from_balance
  FROM public.profiles
  WHERE id = p_from_user_id;
  
  IF v_from_balance < p_amount_usdt THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;
  
  -- Deduct from sender
  UPDATE public.profiles
  SET balance_usdt = balance_usdt - p_amount_usdt
  WHERE id = p_from_user_id;
  
  -- Add to recipient
  UPDATE public.profiles
  SET balance_usdt = balance_usdt + p_amount_usdt
  WHERE id = p_to_user_id;
  
  -- Log the transfer (you might want to create a transfer_log table)
  -- For now, we'll just return success
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.approve_merchant_application(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_merchant_application(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_merchant_deposit(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_merchant_deposit(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_to_merchant(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refund_merchant_deposit(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolve_dispute(UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_transfer_funds(UUID, UUID, NUMERIC, UUID, TEXT) TO authenticated;