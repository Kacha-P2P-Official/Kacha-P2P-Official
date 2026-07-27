import { supabase } from '@/db/supabase';

export interface TwoFactorSettings {
  id: string;
  user_id: string;
  secret: string;
  backup_codes: string[];
  enabled: boolean;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export class TwoFactorAuthService {
  // Generate a random secret for TOTP
  static generateSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  }

  // Generate backup codes
  static generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  // Create 2FA settings for a user
  static async createTwoFactor(userId: string): Promise<TwoFactorSettings | null> {
    const secret = this.generateSecret();
    const backupCodes = this.generateBackupCodes();

    const { data, error } = await supabase
      .from('two_factor_auth')
      .insert({
        user_id: userId,
        secret,
        backup_codes: backupCodes,
        enabled: false,
        verified: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create 2FA:', error);
      return null;
    }

    return data;
  }

  // Enable 2FA after verification
  static async enableTwoFactor(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('two_factor_auth')
      .update({ enabled: true, verified: true })
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to enable 2FA:', error);
      return false;
    }

    return true;
  }

  // Disable 2FA
  static async disableTwoFactor(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('two_factor_auth')
      .update({ enabled: false, verified: false })
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to disable 2FA:', error);
      return false;
    }

    return true;
  }

  // Get 2FA settings for a user
  static async getTwoFactorSettings(userId: string): Promise<TwoFactorSettings | null> {
    const { data, error } = await supabase
      .from('two_factor_auth')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Failed to get 2FA settings:', error);
      return null;
    }

    return data;
  }

  // Verify TOTP code (this would typically use a library like otpauth on client side)
  // For now, this is a placeholder - in production, use a proper TOTP library
  static async verifyCode(userId: string, code: string): Promise<boolean> {
    const settings = await this.getTwoFactorSettings(userId);
    if (!settings || !settings.enabled) {
      return false;
    }

    // In production, verify the TOTP code using the secret
    // This is a simplified version - use otpauth or similar library
    // const verified = await verifyTOTP(code, settings.secret);
    
    // For now, we'll accept any 6-digit code as valid (NOT SECURE - FOR DEMO ONLY)
    const isValid = /^\d{6}$/.test(code);
    
    // Also check backup codes
    if (!isValid && settings.backup_codes.includes(code)) {
      // Remove used backup code
      await this.useBackupCode(userId, code);
      return true;
    }

    return isValid;
  }

  // Use a backup code
  static async useBackupCode(userId: string, code: string): Promise<boolean> {
    const settings = await this.getTwoFactorSettings(userId);
    if (!settings) return false;

    const updatedBackupCodes = settings.backup_codes.filter((c) => c !== code);

    const { error } = await supabase
      .from('two_factor_auth')
      .update({ backup_codes: updatedBackupCodes })
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to use backup code:', error);
      return false;
    }

    return true;
  }

  // Generate QR code URL for authenticator apps
  static getQRCodeURL(secret: string, email: string, appName: string = 'Kacha P2P'): string {
    const issuer = encodeURIComponent(appName);
    const label = encodeURIComponent(`${appName}:${email}`);
    const secretEncoded = encodeURIComponent(secret);
    return `otpauth://totp/${label}?secret=${secretEncoded}&issuer=${issuer}`;
  }
}
