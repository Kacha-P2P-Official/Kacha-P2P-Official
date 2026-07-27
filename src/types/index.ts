export interface Option {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  withCount?: boolean;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: 'user' | 'admin';
  is_kyc_verified: boolean;
  kyc_status: 'pending' | 'approved' | 'rejected' | 'under_review' | null;
  is_banned: boolean;
  is_merchant: boolean;
  balance_usdt: number;
  balance_etb: number;
  total_trades: number;
  completed_trades: number;
  completion_rate: number;
  average_rating: number;
  total_reviews: number;
  last_seen_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ActiveMerchant {
  id: string;
  full_name: string;
  avatar_url: string | null;
  average_rating: number;
  total_reviews: number;
  completion_rate: number;
  total_trades: number;
  completed_trades: number;
  is_kyc_verified: boolean;
  last_seen_at: string;
  is_online: boolean;
}

export interface KycApplication {
  id: string;
  user_id: string;
  full_name: string;
  document_type: 'national_id' | 'passport' | 'driver_license';
  document_number: string;
  id_document_url: string | null;
  back_document_url: string | null;
  selfie_url: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'under_review';
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Pick<Profile, 'full_name' | 'email'>;
}

export interface Offer {
  id: string;
  user_id: string;
  type: 'buy' | 'sell';
  amount_usdt: number;
  exchange_rate: number;
  min_limit_etb: number;
  max_limit_etb: number;
  payment_methods: string[];
  account_name: string | null;
  terms_conditions: string | null;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  profiles?: Pick<Profile, 'full_name' | 'total_trades' | 'completion_rate'>;
}

export interface Trade {
  id: string;
  offer_id: string;
  buyer_id: string;
  seller_id: string;
  amount_usdt: number;
  amount_etb: number;
  exchange_rate: number;
  payment_method: string | null;
  payment_proof_url: string | null;
  status: 'initiated' | 'payment_pending' | 'payment_confirmed' | 'completed' | 'cancelled' | 'disputed';
  escrow_status: 'held' | 'released' | 'refunded';
  created_at: string;
  updated_at: string;
  buyer?: Pick<Profile, 'full_name'>;
  seller?: Pick<Profile, 'full_name'>;
}

export interface TradeMessage {
  id: string;
  trade_id: string;
  sender_id: string | null;
  content: string;
  is_system_message: boolean;
  created_at: string;
  profiles?: Pick<Profile, 'full_name'>;
}

export interface Dispute {
  id: string;
  trade_id: string;
  opened_by: string;
  reason: string;
  status: 'open' | 'resolved' | 'closed';
  outcome: 'release_to_buyer' | 'refund_to_seller' | null;
  resolution_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  trades?: Pick<Trade, 'amount_usdt' | 'amount_etb' | 'status'>;
  profiles?: Pick<Profile, 'full_name'>;
}

export interface MerchantApplication {
  id: string;
  user_id: string;
  business_name: string;
  business_description: string | null;
  trading_volume_usdt: number;
  preferred_payment_methods: string[];
  status: 'pending' | 'approved' | 'rejected' | 'under_review';
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Pick<Profile, 'full_name' | 'email'>;
}

export interface AdminWallet {
  id: string;
  wallet_address: string;
  wallet_type: 'usdt_trc20' | 'usdt_erc20' | 'btc' | 'eth';
  network: string;
  label: string;
  is_active: boolean;
  balance_usdt: number;
  created_at: string;
  updated_at: string;
}

export interface MerchantDeposit {
  id: string;
  merchant_id: string;
  admin_wallet_id: string;
  amount_usdt: number;
  transaction_hash: string | null;
  status: 'pending' | 'confirmed' | 'rejected' | 'refunded';
  proof_url: string | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
  rejection_reason: string | null;
  admin_reviewed_by: string | null;
  admin_reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Pick<Profile, 'full_name'>;
  admin_wallets?: Pick<AdminWallet, 'wallet_address' | 'label'>;
}

export interface UserP2PWallet {
  id: string;
  user_id: string;
  wallet_address: string;
  wallet_type: 'trc20' | 'erc20' | 'bep20' | 'native';
  network: string;
  label: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface ExternalWallet {
  id: string;
  user_id: string;
  wallet_type: string;
  wallet_address: string;
  network: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  profiles?: Pick<Profile, 'full_name' | 'email'>;
}
