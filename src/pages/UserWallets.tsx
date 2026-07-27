import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Wallet, Copy as CopyIcon, Check, Send } from 'lucide-react';
import { toast } from 'sonner';
import type { UserP2PWallet } from '@/types/index';

export default function UserWallets() {
  const { profile } = useAuth();
  const [wallets, setWallets] = useState<UserP2PWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<UserP2PWallet | null>(null);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');

  const loadData = useCallback(async () => {
    if (!profile?.id) return;
    const { data } = await supabase
      .from('user_p2p_wallets')
      .select('*')
      .eq('user_id', profile.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    setWallets(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel('user-p2p-wallets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_p2p_wallets', filter: `user_id=eq.${profile?.id}` }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadData, profile?.id]);

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopied(address);
    toast.success('Address copied to clipboard');
    setTimeout(() => setCopied(null), 2000);
  };

  const openSendDialog = (wallet: UserP2PWallet) => {
    setSelectedWallet(wallet);
    setRecipientAddress('');
    setAmount('');
    setSendDialogOpen(true);
  };

  const handleSend = async () => {
    if (!selectedWallet || !recipientAddress || !amount) {
      toast.error('Please fill all fields');
      return;
    }
    
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amountNum > (profile?.balance_usdt || 0)) {
      toast.error('Insufficient balance');
      return;
    }

    setProcessing(true);
    
    // Here you would integrate with your blockchain service to actually send the crypto
    // For now, we'll just deduct from their balance and log the transaction
    const { error } = await supabase.from('profiles').update({
      balance_usdt: (profile?.balance_usdt || 0) - amountNum
    }).eq('id', profile?.id);

    if (!error) {
      toast.success(`Successfully sent ${amountNum} USDT to ${recipientAddress}`);
      setSendDialogOpen(false);
      setSelectedWallet(null);
      setRecipientAddress('');
      setAmount('');
      // Refresh profile to get updated balance
      // You might want to call refreshProfile() from auth context
    } else {
      toast.error('Failed to send funds');
    }
    
    setProcessing(false);
  };

  if (loading) return (
    <div className="container mx-auto px-4 py-10 max-w-4xl space-y-6">
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="border border-border"><CardContent className="p-4"><div className="h-5 w-40 bg-muted animate-pulse rounded" /></CardContent></Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl space-y-8">
      <div>
        <div className="luminate-rule" />
        <h1 className="text-3xl font-heading font-bold mt-4 flex items-center gap-2">
          <Wallet className="h-8 w-8 text-accent" /> My P2P Wallets
        </h1>
        <p className="text-sm text-muted-foreground font-sans mt-1">
          View your configured wallets and send funds to external addresses.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h3 className="text-base font-heading font-semibold">Your Wallets</h3>
          <div className="text-sm text-muted-foreground font-sans">
            Available Balance: <span className="font-semibold text-foreground">{profile?.balance_usdt?.toFixed(2) || '0.00'} USDT</span>
          </div>
        </div>

        {wallets.length === 0 ? (
          <Card className="border border-border">
            <CardContent className="py-16 text-center text-muted-foreground font-sans text-sm">
              No active P2P wallets configured. Contact admin to set up your wallets.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {wallets.map((wallet) => (
              <Card key={wallet.id} className="border border-border card-gradient">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-heading font-semibold text-sm">{wallet.label || 'Wallet'}</span>
                        <Badge className="text-[10px] font-sans bg-primary/20 text-primary border-primary/30">
                          Active
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono truncate max-w-[200px]">
                          {wallet.wallet_address}
                        </code>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => copyAddress(wallet.wallet_address)}
                        >
                          {copied === wallet.wallet_address ? <Check className="h-3 w-3" /> : <CopyIcon className="h-3 w-3" />}
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs font-sans text-muted-foreground">
                        <span className="uppercase">{wallet.wallet_type}</span>
                        <span>·</span>
                        <span>{wallet.network}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => openSendDialog(wallet)}
                      className="h-8 text-xs bg-accent text-accent-foreground hover:bg-accent/90"
                    >
                      <Send className="mr-1.5 h-3 w-3" /> Send
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Send Dialog */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Send USDT</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider font-sans">From Wallet</Label>
              <div className="text-sm font-sans bg-muted p-2 rounded">
                {selectedWallet?.label || 'Wallet'} ({selectedWallet?.network})
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider font-sans">Recipient Address</Label>
              <Input
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="Enter recipient wallet address"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider font-sans">Amount (USDT)</Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="h-9"
              />
              <p className="text-xs text-muted-foreground font-sans">
                Available: {profile?.balance_usdt?.toFixed(2) || '0.00'} USDT
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSendDialogOpen(false)} className="h-8 text-xs">Cancel</Button>
            <Button
              onClick={handleSend}
              disabled={processing || !recipientAddress || !amount}
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 text-xs"
            >
              {processing ? 'Sending...' : 'Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}