import { supabase } from '@/db/supabase';

export interface InsuranceFund {
  id: string;
  fund_name: string;
  total_balance: number;
  available_balance: number;
  reserved_balance: number;
  contribution_rate: number;
  max_coverage_per_trade: number;
  created_at: string;
  updated_at: string;
}

export interface InsuranceClaim {
  id: string;
  trade_id: string;
  user_id: string;
  claim_amount: number;
  claim_reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  evidence_urls: string[];
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

export interface InsuranceContribution {
  id: string;
  trade_id: string;
  user_id: string;
  amount: number;
  contribution_rate: number;
  created_at: string;
}

export class InsuranceService {
  // Get insurance fund information
  static async getFundInfo(): Promise<InsuranceFund | null> {
    const { data, error } = await supabase
      .from('escrow_insurance_fund')
      .select('*')
      .single();

    if (error) {
      console.error('Failed to get insurance fund info:', error);
      return null;
    }

    return data;
  }

  // Calculate insurance contribution for a trade amount
  static async calculateContribution(tradeAmount: number): Promise<number> {
    const { data, error } = await supabase.rpc('calculate_insurance_contribution', {
      trade_amount: tradeAmount,
    });

    if (error) {
      console.error('Failed to calculate contribution:', error);
      return 0;
    }

    return data || 0;
  }

  // Submit an insurance claim
  static async submitClaim(
    tradeId: string,
    userId: string,
    claimAmount: number,
    claimReason: string,
    evidenceUrls: string[] = []
  ): Promise<InsuranceClaim | null> {
    // Check if claim already exists for this trade
    const { data: existingClaim } = await supabase
      .from('insurance_claims')
      .select('id')
      .eq('trade_id', tradeId)
      .single();

    if (existingClaim) {
      console.error('Claim already exists for this trade');
      return null;
    }

    const { data, error } = await supabase
      .from('insurance_claims')
      .insert({
        trade_id: tradeId,
        user_id: userId,
        claim_amount: claimAmount,
        claim_reason: claimReason,
        evidence_urls: evidenceUrls,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to submit insurance claim:', error);
      return null;
    }

    return data;
  }

  // Get user's insurance claims
  static async getUserClaims(userId: string): Promise<InsuranceClaim[]> {
    const { data, error } = await supabase
      .from('insurance_claims')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get user claims:', error);
      return [];
    }

    return data || [];
  }

  // Get all insurance claims (admin only)
  static async getAllClaims(): Promise<InsuranceClaim[]> {
    const { data, error } = await supabase
      .from('insurance_claims')
      .select('*, profiles(full_name, email)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get all claims:', error);
      return [];
    }

    return data || [];
  }

  // Get pending claims (admin only)
  static async getPendingClaims(): Promise<InsuranceClaim[]> {
    const { data, error } = await supabase
      .from('insurance_claims')
      .select('*, profiles(full_name, email)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get pending claims:', error);
      return [];
    }

    return data || [];
  }

  // Approve an insurance claim (admin only)
  static async approveClaim(
    claimId: string,
    adminId: string,
    adminNotes?: string
  ): Promise<boolean> {
    const { error } = await supabase
      .from('insurance_claims')
      .update({
        status: 'approved',
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        admin_notes: adminNotes,
      })
      .eq('id', claimId);

    if (error) {
      console.error('Failed to approve claim:', error);
      return false;
    }

    return true;
  }

  // Reject an insurance claim (admin only)
  static async rejectClaim(
    claimId: string,
    adminId: string,
    adminNotes?: string
  ): Promise<boolean> {
    const { error } = await supabase
      .from('insurance_claims')
      .update({
        status: 'rejected',
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        admin_notes: adminNotes,
      })
      .eq('id', claimId);

    if (error) {
      console.error('Failed to reject claim:', error);
      return false;
    }

    return true;
  }

  // Mark claim as paid (admin only)
  static async markClaimAsPaid(claimId: string): Promise<boolean> {
    const { error } = await supabase
      .from('insurance_claims')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('id', claimId);

    if (error) {
      console.error('Failed to mark claim as paid:', error);
      return false;
    }

    return true;
  }

  // Get user's insurance contributions
  static async getUserContributions(userId: string): Promise<InsuranceContribution[]> {
    const { data, error } = await supabase
      .from('insurance_contributions')
      .select('*, trades(amount_usdt)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get user contributions:', error);
      return [];
    }

    return data || [];
  }

  // Get total contribution amount for a user
  static async getTotalContribution(userId: string): Promise<number> {
    const { data, error } = await supabase
      .from('insurance_contributions')
      .select('amount')
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to get total contribution:', error);
      return 0;
    }

    return data.reduce((sum, item) => sum + Number(item.amount), 0);
  }

  // Check if trade is eligible for insurance coverage
  static async checkCoverageEligibility(tradeAmount: number): Promise<{
    eligible: boolean;
    maxCoverage: number;
    contributionRequired: number;
  }> {
    const fundInfo = await this.getFundInfo();
    if (!fundInfo) {
      return { eligible: false, maxCoverage: 0, contributionRequired: 0 };
    }

    const contributionRequired = await this.calculateContribution(tradeAmount);
    const maxCoverage = Math.min(tradeAmount, fundInfo.max_coverage_per_trade);
    const eligible = fundInfo.available_balance >= maxCoverage;

    return {
      eligible,
      maxCoverage,
      contributionRequired,
    };
  }
}
