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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Wallet, Plus, Copy as CopyIcon, Check, Trash2, PauseCircle, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { UserP2PWallet } from '@/types/index';

export default function UserWallets() {
  const { profile } = useAuth();
  const [wallets, setWallets] = useState<UserP2PWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Form state
  const [walletAddress, setWalletAddress] = useState('');
  const [walletType, setWalletType] = useState<'trc20' | 'erc20' | 'bep20' | 'native'>('trc20');
  const [network, setNetwork] = useState('');
  const [label, setLabel] = useState('');

  const loadData = useCallback(async () => {
    if (!profile?.id) return;
    const { data } = await supabase
      .from('user_p2p_wallets')
      .select('*')
      .eq('user_id', profile.id)
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

  const handleAddWallet = async () => {
    if (!walletAddress || !network) {
      toast.error('Please fill all required fields');
      return;
    }
    setProcessing(true);
    const { error } = await supabase.from('user_p2p_wallets').insert({
      user_id: profile?.id,
      wallet_address: walletAddress.trim(),
      wallet_type: walletType,
      network: network.trim(),
      label: label.trim() || null,
    });
    if (!error) {
      toast.success('P2P wallet added successfully');
      setAddDialogOpen(false);
      setWalletAddress('');
      setNetwork('');
      setLabel('');
      loadData();
    } else {
      toast.error(error.message);
    }
    setProcessing(false);
  };

  const toggleActive = async (wallet: UserP2PWallet) => {
    const { error } = await supabase
      .from('user_p2p_wallets')
      .update({ is_active: !wallet.is_active })
      .eq('id', wallet.id);
    if (!error) {
      toast.success(`Wallet ${wallet.is_active ? 'deactivated' : 'activated'}`);
      loadData();
    } else {
      toast.error(error.message);
    }
  };

  const deleteWallet = async (wallet: UserP2PWallet) => {
    if (!confirm('Are you sure you want to delete this wallet?')) return;
    const { error } = await supabase.from('user_p2p_wallets').delete().eq('id', wallet.id);
    if (!error) {
      toast.success('Wallet deleted');
      loadData();
    } else {
      toast.error(error.message);
    }
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
          Manage your cryptocurrency wallets for P2P trading.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h3 className="text-base font-heading font-semibold">Your Wallets</h3>
          <Button size="sm" onClick={() => setAddDialogOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 border-0 shadow-[0_0_15px_rgba(16,185,129,0.35)] h-8 text-xs">
            <Plus className="mr-1.5 h-3 w-3" /> Add Wallet
          </Button>
        </div>

        {wallets.length === 0 ? (
          <Card className="border border-border">
            <CardContent className="py-16 text-center text-muted-foreground font-sans text-sm">
              No P2P wallets configured. Add your first wallet to start trading.
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
                        <Badge className={`text-[10px] font-sans ${wallet.is_active ? 'bg-primary/20 text-primary border-primary/30' : 'bg-muted text-muted-foreground border-border'}`}>
                          {wallet.is_active ? 'Active' : 'Inactive'}
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
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => toggleActive(wallet)}
                      >
                        {wallet.is_active ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteWallet(wallet)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Wallet Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Add P2P Wallet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider font-sans">Wallet Type</Label>
              <Select value={walletType} onValueChange={(value: any) => setWalletType(value)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trc20">TRC20 (Tron)</SelectItem>
                  <SelectItem value="erc20">ERC20 (Ethereum)</SelectItem>
                  <SelectItem value="bep20">BEP20 (BSC)</SelectItem>
                  <SelectItem value="native">Native</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider font-sans">Network</Label>
              <Input
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                placeholder="e.g., Tron, Ethereum, BSC"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider font-sans">Wallet Address</Label>
              <Input
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="Enter wallet address"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider font-sans">Label (Optional)</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g., Main Trading Wallet"
                className="h-9"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} className="h-8 text-xs">Cancel</Button>
            <Button
              onClick={handleAddWallet}
              disabled={processing || !walletAddress || !network}
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 text-xs"
            >
              {processing ? 'Adding...' : 'Add Wallet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}