import { supabase } from '@/db/supabase';

export interface BiometricCredential {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  device_type?: string;
  device_name?: string;
  last_used_at?: string;
  created_at: string;
}

export class BiometricAuthService {
  // Check if WebAuthn is supported
  static isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'credentials' in navigator &&
      'PublicKeyCredential' in window
    );
  }

  // Register a new biometric credential
  static async registerCredential(
    userId: string,
    username: string,
    deviceName?: string
  ): Promise<BiometricCredential | null> {
    if (!this.isSupported()) {
      console.error('WebAuthn is not supported');
      return null;
    }

    try {
      // Create credential
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32),
          rp: {
            name: 'Kacha P2P',
            id: window.location.hostname,
          },
          user: {
            id: new TextEncoder().encode(userId),
            name: username,
            displayName: username,
          },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
        },
      }) as PublicKeyCredential;

      if (!credential) {
        console.error('Failed to create credential');
        return null;
      }

      const response = credential.response as AuthenticatorAttestationResponse;
      const publicKey = btoa(
        String.fromCharCode(...new Uint8Array(response.getPublicKey() || new ArrayBuffer(0)))
      );

      // Save to database
      const { data, error } = await supabase
        .from('biometric_credentials')
        .insert({
          user_id: userId,
          credential_id: credential.id,
          public_key: publicKey,
          device_type: this.getDeviceType(),
          device_name: deviceName || this.getDeviceName(),
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to save biometric credential:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Biometric registration failed:', error);
      return null;
    }
  }

  // Authenticate with biometric credential
  static async authenticate(userId: string): Promise<boolean> {
    if (!this.isSupported()) {
      console.error('WebAuthn is not supported');
      return false;
    }

    try {
      // Get user's credentials from database
      const { data: credentials, error } = await supabase
        .from('biometric_credentials')
        .select('credential_id')
        .eq('user_id', userId);

      if (error || !credentials || credentials.length === 0) {
        console.error('No biometric credentials found');
        return false;
      }

      // Use the first credential for authentication
      const credentialId = credentials[0].credential_id;

      // Convert credential ID from base64 to ArrayBuffer
      const credentialIdBuffer = this.base64ToArrayBuffer(credentialId);

      // Get credential
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32),
          allowCredentials: [
            {
              id: credentialIdBuffer,
              type: 'public-key',
            },
          ],
          userVerification: 'required',
          timeout: 60000,
        },
      });

      if (!assertion) {
        console.error('Authentication failed');
        return false;
      }

      // Update last used timestamp
      await this.updateLastUsed(credentialId);

      return true;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return false;
    }
  }

  // Get user's biometric credentials
  static async getUserCredentials(userId: string): Promise<BiometricCredential[]> {
    const { data, error } = await supabase
      .from('biometric_credentials')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get biometric credentials:', error);
      return [];
    }

    return data || [];
  }

  // Delete a biometric credential
  static async deleteCredential(credentialId: string): Promise<boolean> {
    const { error } = await supabase
      .from('biometric_credentials')
      .delete()
      .eq('credential_id', credentialId);

    if (error) {
      console.error('Failed to delete biometric credential:', error);
      return false;
    }

    return true;
  }

  // Update last used timestamp
  private static async updateLastUsed(credentialId: string): Promise<void> {
    await supabase
      .from('biometric_credentials')
      .update({ last_used_at: new Date().toISOString() })
      .eq('credential_id', credentialId);
  }

  // Get device type
  private static getDeviceType(): string {
    const ua = navigator.userAgent;
    if (/Android/i.test(ua)) return 'Android';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
    if (/Windows/i.test(ua)) return 'Windows';
    if (/Mac/i.test(ua)) return 'macOS';
    if (/Linux/i.test(ua)) return 'Linux';
    return 'Unknown';
  }

  // Get device name
  private static getDeviceName(): string {
    const ua = navigator.userAgent;
    const platform = navigator.platform;
    return `${platform} (${this.getDeviceType()})`;
  }

  // Convert base64 to ArrayBuffer
  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
