import { supabase } from '@/db/supabase';

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  referral_code: string;
  status: 'pending' | 'completed' | 'cancelled';
  completed_at?: string;
  bonus_amount: number;
  created_at: string;
}

export interface ReferralCode {
  id: string;
  user_id: string;
  code: string;
  total_earnings: number;
  total_referrals: number;
  active_referrals: number;
  created_at: string;
  updated_at: string;
}

export interface AffiliateEarning {
  id: string;
  referral_id: string;
  referrer_id: string;
  trade_id: string;
  commission_rate: number;
  commission_amount: number;
  status: 'pending' | 'available' | 'paid';
  paid_at?: string;
  created_at: string;
}

export interface AffiliateSettings {
  id: string;
  commission_rate: number;
  bonus_per_referral: number;
  minimum_payout: number;
  max_commission_per_trade: number;
  created_at: string;
  updated_at: string;
}

export class AffiliateService {
  // Generate a unique referral code for a user
  static async createReferralCode(userId: string): Promise<ReferralCode | null> {
    const { data, error } = await supabase.rpc('create_referral_code', {
      user_id_param: userId,
    });

    if (error) {
      console.error('Failed to create referral code:', error);
      return null;
    }

    // Fetch the created code
    const { data: codeData } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('user_id', userId)
      .single();

    return codeData;
  }

  // Get user's referral code
  static async getReferralCode(userId: string): Promise<ReferralCode | null> {
    const { data, error } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Failed to get referral code:', error);
      return null;
    }

    return data;
  }

  // Validate and use a referral code
  static async useReferralCode(
    referrerId: string,
    referredId: string,
    code: string
  ): Promise<boolean> {
    // Check if code exists and belongs to referrer
    const { data: referrerCode } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('code', code)
      .eq('user_id', referrerId)
      .single();

    if (!referrerCode) {
      console.error('Invalid referral code');
      return false;
    }

    // Check if referred user already has a referral
    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('id')
      .eq('referred_id', referredId)
      .single();

    if (existingReferral) {
      console.error('User already has a referral');
      return false;
    }

    // Create referral record
    const { error } = await supabase.from('referrals').insert({
      referrer_id: referrerId,
      referred_id: referredId,
      referral_code: code,
      status: 'pending',
    });

    if (error) {
      console.error('Failed to create referral:', error);
      return false;
    }

    return true;
  }

  // Complete a referral (when referred user completes first trade)
  static async completeReferral(referralId: string): Promise<boolean> {
    const settings = await this.getSettings();
    if (!settings) return false;

    const { error } = await supabase
      .from('referrals')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        bonus_amount: settings.bonus_per_referral,
      })
      .eq('id', referralId);

    if (error) {
      console.error('Failed to complete referral:', error);
      return false;
    }

    // Update referral code stats
    const referral = await this.getReferralById(referralId);
    if (referral) {
      // Get current stats first
      const { data: currentCode } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('user_id', referral.referrer_id)
        .single();
      
      if (currentCode) {
        await supabase
          .from('referral_codes')
          .update({
            total_referrals: (currentCode.total_referrals || 0) + 1,
            active_referrals: (currentCode.active_referrals || 0) + 1,
            total_earnings: (currentCode.total_earnings || 0) + settings.bonus_per_referral,
          })
          .eq('user_id', referral.referrer_id);
      }
    }

    return true;
  }

  // Get user's referrals
  static async getUserReferrals(userId: string): Promise<Referral[]> {
    const { data, error } = await supabase
      .from('referrals')
      .select('*, profiles!referrals_referred_id_fkey(full_name, email)')
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get user referrals:', error);
      return [];
    }

    return data || [];
  }

  // Get user's affiliate earnings
  static async getUserEarnings(userId: string): Promise<AffiliateEarning[]> {
    const { data, error } = await supabase
      .from('affiliate_earnings')
      .select('*, trades(amount_usdt)')
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get user earnings:', error);
      return [];
    }

    return data || [];
  }

  // Get available balance for withdrawal
  static async getAvailableBalance(userId: string): Promise<number> {
    const { data, error } = await supabase
      .from('affiliate_earnings')
      .select('commission_amount')
      .eq('referrer_id', userId)
      .eq('status', 'available');

    if (error) {
      console.error('Failed to get available balance:', error);
      return 0;
    }

    return data.reduce((sum, item) => sum + Number(item.commission_amount), 0);
  }

  // Request payout
  static async requestPayout(userId: string): Promise<boolean> {
    const settings = await this.getSettings();
    if (!settings) return false;

    const availableBalance = await this.getAvailableBalance(userId);

    if (availableBalance < settings.minimum_payout) {
      console.error('Insufficient balance for payout');
      return false;
    }

    // Mark earnings as paid
    const { error } = await supabase
      .from('affiliate_earnings')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('referrer_id', userId)
      .eq('status', 'available');

    if (error) {
      console.error('Failed to request payout:', error);
      return false;
    }

    return true;
  }

  // Get affiliate settings
  static async getSettings(): Promise<AffiliateSettings | null> {
    const { data, error } = await supabase
      .from('affiliate_settings')
      .select('*')
      .single();

    if (error) {
      console.error('Failed to get affiliate settings:', error);
      return null;
    }

    return data;
  }

  // Get referral by ID
  private static async getReferralById(referralId: string): Promise<Referral | null> {
    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('id', referralId)
      .single();

    if (error) {
      console.error('Failed to get referral:', error);
      return null;
    }

    return data;
  }

  // Get referral stats
  static async getReferralStats(userId: string): Promise<{
    totalReferrals: number;
    activeReferrals: number;
    completedReferrals: number;
    totalEarnings: number;
    availableBalance: number;
  }> {
    const referralCode = await this.getReferralCode(userId);
    const earnings = await this.getUserEarnings(userId);
    const referrals = await this.getUserReferrals(userId);

    const totalEarnings = referralCode?.total_earnings || 0;
    const availableBalance = await this.getAvailableBalance(userId);
    const completedReferrals = referrals.filter((r) => r.status === 'completed').length;

    return {
      totalReferrals: referralCode?.total_referrals || 0,
      activeReferrals: referralCode?.active_referrals || 0,
      completedReferrals,
      totalEarnings,
      availableBalance,
    };
  }
}
