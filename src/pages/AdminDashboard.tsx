import { useEffect, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ShieldCheck, UserX, CheckCircle2, XCircle, Eye, Settings2, Ban, Trash2, PauseCircle, PlayCircle, Building2, Wallet, ArrowRight, Plus, Copy as CopyIcon, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { KycApplication, Profile, Dispute, Offer, Trade, MerchantApplication, MerchantDeposit, UserP2PWallet, ExternalWallet } from '@/types/index';

/* ── User P2P Wallets Tab ───────────────────────────────── */
function UserP2PWalletsTab({ adminId }: { adminId: string }) {
  const [wallets, setWallets] = useState<UserP2PWallet[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Form state
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [walletAddress, setWalletAddress] = useState('');
  const [walletType, setWalletType] = useState<'trc20' | 'erc20' | 'bep20' | 'native'>('trc20');
  const [network, setNetwork] = useState('');
  const [label, setLabel] = useState('');

  const loadData = useCallback(async () => {
    const [walletsRes, usersRes] = await Promise.all([
      supabase
        .from('user_p2p_wallets')
        .select('*, profiles!user_p2p_wallets_user_id_fkey(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase.from('profiles').select('*').eq('is_kyc_verified', true).limit(100),
    ]);
    setWallets(Array.isArray(walletsRes.data) ? walletsRes.data : []);
    setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel('user-p2p-wallets-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_p2p_wallets' }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopied(address);
    toast.success('Address copied to clipboard');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleAddWallet = async () => {
    if (!selectedUser || !walletAddress || !network) {
      toast.error('Please fill all required fields');
      return;
    }
    setProcessing(true);
    const { error } = await supabase.from('user_p2p_wallets').insert({
      user_id: selectedUser,
      wallet_address: walletAddress.trim(),
      wallet_type: walletType,
      network: network.trim(),
      label: label.trim() || null,
      created_by: adminId,
    });
    if (!error) {
      toast.success('P2P wallet added successfully');
      setAddDialogOpen(false);
      setSelectedUser('');
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
      .update({ is_active: !wallet.is_active, updated_by: adminId })
      .eq('id', wallet.id);
    if (!error) {
      toast.success(`Wallet ${wallet.is_active ? 'deactivated' : 'activated'}`);
      loadData();
    } else {
      toast.error(error.message);
    }
  };

  const deleteWallet = async (wallet: UserP2PWallet) => {
    const { error } = await supabase.from('user_p2p_wallets').delete().eq('id', wallet.id);
    if (!error) {
      toast.success('Wallet deleted');
      loadData();
    } else {
      toast.error(error.message);
    }
  };

  if (loading) return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="border border-border"><CardContent className="p-4"><Skeleton className="h-5 w-40" /></CardContent></Card>
      ))}
    </div>
  );

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h3 className="text-base font-heading font-semibold">User P2P Wallets</h3>
          <Button size="sm" onClick={() => setAddDialogOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 border-0 shadow-[0_0_15px_rgba(16,185,129,0.35)]">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Wallet
          </Button>
        </div>

        {wallets.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground font-sans text-sm">
            No P2P wallets configured.
          </div>
        ) : (
          wallets.map((wallet) => (
            <Card key={wallet.id} className="border border-border card-gradient">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-heading font-semibold text-sm">{wallet.profiles?.full_name ?? '—'}</span>
                      <Badge className={`text-[10px] font-sans ${wallet.is_active ? 'bg-primary/20 text-primary border-primary/30' : 'bg-muted text-muted-foreground border-border'}`}>
                        {wallet.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-sans">{wallet.profiles?.email}</p>
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
                      {wallet.label && <span>· {wallet.label}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <Button
                      size="sm" variant="outline"
                      onClick={() => toggleActive(wallet)}
                      className="border-primary/30 text-primary hover:bg-primary/10"
                    >
                      {wallet.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      size="sm" variant="outline"
                      onClick={() => deleteWallet(wallet)}
                      className="border-destructive/40 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Wallet Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Add P2P Wallet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider font-sans">User (KYC Verified)</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="font-sans bg-background/50 border-primary/30">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name} ({u.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider font-sans">Wallet Type</Label>
              <Select value={walletType} onValueChange={(v: any) => setWalletType(v)}>
                <SelectTrigger className="font-sans bg-background/50 border-primary/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trc20">TRC20</SelectItem>
                  <SelectItem value="erc20">ERC20</SelectItem>
                  <SelectItem value="bep20">BEP20</SelectItem>
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
                className=" font-sans bg-background/50 border-primary/30"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider font-sans">Wallet Address</Label>
              <Input
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="Enter wallet address"
                className="font-sans bg-background/50 border-primary/30"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider font-sans">Label (Optional)</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g., Main Trading Wallet"
                className="font-sans bg-background/50 border-primary/30"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 border-t border-border mt-6 pt-4">
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} className="font-sans border-primary/30 text-primary hover:bg-primary/10">Cancel</Button>
            <Button
              onClick={handleAddWallet}
              disabled={processing || !selectedUser || !walletAddress || !network}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-sans shadow-[0_0_15px_rgba(16,185,129,0.3)] border-0"
            >
              {processing ? 'Adding...' : 'Add Wallet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── External Wallets Tab (Bybit, Binance, etc.) ───────────────────────── */
function ExternalWalletsTab({ adminId }: { adminId: string }) {
  const [wallets, setWallets] = useState<ExternalWallet[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Add form state
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [walletAddress, setWalletAddress] = useState<string>('');

  const loadData = useCallback(async () => {
    const [walletsRes, usersRes] = await Promise.all([
      supabase
        .from('external_wallets')
        .select('*, profiles!external_wallets_user_id_fkey(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('profiles').select('*').eq('is_kyc_verified', true),
    ]);
    setWallets(Array.isArray(walletsRes.data) ? walletsRes.data : []);
    setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const ch = supabase.channel('external-wallets-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'external_wallets' }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadData]);

  const handleAddWallet = async () => {
    if (!selectedUser || !walletAddress) return;
    setProcessing(true);
    const { error } = await supabase.from('external_wallets').insert({
      user_id: selectedUser,
      wallet_type: 'External',
      wallet_address: walletAddress,
      network: null,
    });
    setProcessing(false);
    if (error) toast.error(error.message);
    else {
      toast.success('External wallet added successfully');
      setAddDialogOpen(false);
      setSelectedUser('');
      setWalletAddress('');
      loadData();
    }
  };

  const handleDeleteWallet = async (id: string) => {
    const { error } = await supabase.from('external_wallets').delete().eq('id', id);
    if (error) toast.error(error.message);
    else toast.success('External wallet deleted');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return <div className="p-6"><Skeleton className="h-32 w-full" /></div>;
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-heading font-semibold">External Wallets (Bybit, Binance, etc.)</h2>
        <Button size="sm" onClick={() => setAddDialogOpen(true)} className="font-sans bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" /> Add Wallet
        </Button>
      </div>

      <div className="grid gap-4">
        {wallets.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground font-sans">No external wallets configured</div>
        ) : (
          wallets.map((wallet) => (
            <Card key={wallet.id} className="border border-border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-semibold">{wallet.profiles?.full_name || 'Unknown'}</span>
                      <Badge className={`font-sans text-xs ${wallet.is_active ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                        {wallet.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">Address</p>
                        <div className="flex items-center gap-2">
                          <p className="font-sans font-mono text-xs bg-muted/50 p-2 rounded break-all">{wallet.wallet_address}</p>
                          <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => copyToClipboard(wallet.wallet_address)}>
                            {copied === wallet.wallet_address ? <Check className="h-3 w-3 text-green-600" /> : <CopyIcon className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button size="icon" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleDeleteWallet(wallet.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Add External Wallet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider font-sans">User (KYC Verified Only)</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="font-sans">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name} ({u.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider font-sans">Wallet Address</Label>
              <Input value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} placeholder="Enter wallet address" className="font-sans font-mono" />
            </div>
          </div>
          <DialogFooter className="gap-2 border-t border-border mt-6 pt-4">
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} className="font-sans border-primary/30 text-primary hover:bg-primary/10">Cancel</Button>
            <Button
              onClick={handleAddWallet}
              disabled={processing || !selectedUser || !walletAddress}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-sans shadow-[0_0_15px_rgba(16,185,129,0.3)] border-0"
            >
              {processing ? 'Adding...' : 'Add Wallet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Merchant Deposits &amp; Transfers Tab ───────────────────────── */
function MerchantDepositsTab({ adminId }: { adminId: string }) {
  const [deposits, setDeposits] = useState<MerchantDeposit[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [merchants, setMerchants] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<MerchantDeposit | null>(null);

  // Transfer form state
  const [selectedMerchant, setSelectedMerchant] = useState<string>('');
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [refundReason, setRefundReason] = useState('');

  const loadData = useCallback(async () => {
    const [depositsRes, walletsRes, merchantsRes] = await Promise.all([
      supabase
        .from('merchant_deposits')
        .select('*, profiles!merchant_deposits_merchant_id_fkey(full_name), admin_wallets!merchant_deposits_admin_wallet_id_fkey(label)')
        .in('status', ['pending', 'confirmed'])
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('admin_wallets').select('*').eq('is_active', true),
      supabase.from('profiles').select('*').eq('is_merchant', true),
    ]);
    setDeposits(Array.isArray(depositsRes.data) ? depositsRes.data : []);
    setWallets(Array.isArray(walletsRes.data) ? walletsRes.data : []);
    setMerchants(Array.isArray(merchantsRes.data) ? merchantsRes.data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel('merchant-deposits-admin')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'merchant_deposits' }, () => loadData())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'merchant_deposits' }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  const confirmDeposit = async (deposit: MerchantDeposit) => {
    setProcessing(true);
    const { error } = await supabase.rpc('confirm_merchant_deposit', {
      p_deposit_id: deposit.id,
      p_admin_id: adminId,
    });
    if (!error) {
      toast.success('Deposit confirmed');
      loadData();
    } else {
      toast.error(error.message);
    }
    setProcessing(false);
  };

  const rejectDeposit = async (deposit: MerchantDeposit) => {
    setProcessing(true);
    const { error } = await supabase.rpc('reject_merchant_deposit', {
      p_deposit_id: deposit.id,
      p_admin_id: adminId,
      p_reason: 'Deposit rejected by admin',
    });
    if (!error) {
      toast.success('Deposit rejected');
      loadData();
    } else {
      toast.error(error.message);
    }
    setProcessing(false);
  };

  const handleTransfer = async () => {
    if (!selectedMerchant || !selectedWallet || !transferAmount) {
      toast.error('Please fill all fields');
      return;
    }
    setProcessing(true);
    const { error } = await supabase.rpc('transfer_to_merchant', {
      p_admin_id: adminId,
      p_merchant_id: selectedMerchant,
      p_admin_wallet_id: selectedWallet,
      p_amount_usdt: parseFloat(transferAmount),
      p_notes: transferNotes || null,
    });
    if (!error) {
      toast.success('Transfer completed');
      setTransferDialogOpen(false);
      setSelectedMerchant('');
      setSelectedWallet('');
      setTransferAmount('');
      setTransferNotes('');
      loadData();
    } else {
      toast.error(error.message);
    }
    setProcessing(false);
  };

  const handleRefund = async () => {
    if (!selectedDeposit || !refundReason) {
      toast.error('Please provide a reason');
      return;
    }
    setProcessing(true);
    const { error } = await supabase.rpc('refund_merchant_deposit', {
      p_admin_id: adminId,
      p_deposit_id: selectedDeposit.id,
      p_reason: refundReason,
    });
    if (!error) {
      toast.success('Refund processed');
      setRefundDialogOpen(false);
      setSelectedDeposit(null);
      setRefundReason('');
      loadData();
    } else {
      toast.error(error.message);
    }
    setProcessing(false);
  };

  if (loading) return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="border border-border"><CardContent className="p-4"><Skeleton className="h-5 w-40" /></CardContent></Card>
      ))}
    </div>
  );

  const statusColors = {
    pending: 'bg-warning/20 text-warning border-warning/30',
    confirmed: 'bg-primary/20 text-primary border-primary/30',
    rejected: 'bg-destructive/20 text-destructive border-destructive/30',
    refunded: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h3 className="text-base font-heading font-semibold">Merchant Deposits</h3>
          <Button size="sm" onClick={() => setTransferDialogOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 border-0 shadow-[0_0_15px_rgba(16,185,129,0.35)]">
            <Wallet className="mr-1.5 h-3.5 w-3.5" /> Transfer to Merchant
          </Button>
        </div>

        {deposits.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground font-sans text-sm">
            No merchant deposits found.
          </div>
        ) : (
          deposits.map((deposit) => (
            <Card key={deposit.id} className="border border-border card-gradient">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-heading font-semibold text-sm">{deposit.profiles?.full_name ?? '—'}</span>
                      <Badge className={`text-[10px] font-sans border ${statusColors[deposit.status]}`}>{deposit.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-sans">
                      {deposit.amount_usdt} USDT · {deposit.admin_wallets?.label}
                    </p>
                    <p className="text-xs text-muted-foreground font-sans font-mono truncate max-w-[200px]">
                      {deposit.transaction_hash}
                    </p>
                    {deposit.proof_url && (
                      <a href={deposit.proof_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-sans underline">
                        View Proof
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {deposit.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => confirmDeposit(deposit)}
                          disabled={processing}
                          className="bg-primary text-primary-foreground hover:bg-primary/90 border-0 shadow-[0_0_15px_rgba(16,185,129,0.35)]"
                        >
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Confirm
                        </Button>
                        <Button
                          size="sm" variant="outline"
                          onClick={() => rejectDeposit(deposit)}
                          disabled={processing}
                          className="border-destructive/40 text-destructive hover:bg-destructive/10 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                        >
                          <XCircle className="mr-1.5 h-3.5 w-3.5" /> Reject
                        </Button>
                      </>
                    )}
                    {deposit.status === 'confirmed' && (
                      <Button
                        size="sm" variant="outline"
                        onClick={() => { setSelectedDeposit(deposit); setRefundDialogOpen(true); }}
                        disabled={processing}
                        className="border-warning/40 text-warning hover:bg-warning/10"
                      >
                        Refund
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Transfer Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Transfer to Merchant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider font-sans">Merchant</Label>
              <Select value={selectedMerchant} onValueChange={setSelectedMerchant}>
                <SelectTrigger className="font-sans bg-background/50 border-primary/30">
                  <SelectValue placeholder="Select merchant" />
                </SelectTrigger>
                <SelectContent>
                  {merchants.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.full_name} ({m.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider font-sans">Source Wallet</Label>
              <Select value={selectedWallet} onValueChange={setSelectedWallet}>
                <SelectTrigger className="font-sans bg-background/50 border-primary/30">
                  <SelectValue placeholder="Select wallet" />
                </SelectTrigger>
                <SelectContent>
                  {wallets.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.label} ({w.balance_usdt} USDT)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider font-sans">Amount (USDT)</Label>
              <Input
                type="number"
                step="0.01"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="100.00"
                className="font-sans bg-background/50 border-primary/30"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider font-sans">Notes (Optional)</Label>
              <Textarea
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                placeholder="Transfer notes..."
                rows={3}
                className="resize-none font-sans bg-background/50 border-primary/30"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 border-t border-border mt-6 pt-4">
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)} className="font-sans border-primary/30 text-primary hover:bg-primary/10">Cancel</Button>
            <Button
              onClick={handleTransfer}
              disabled={processing || !selectedMerchant || !selectedWallet || !transferAmount}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-sans shadow-[0_0_15px_rgba(16,185,129,0.3)] border-0"
            >
              {processing ? 'Processing...' : 'Transfer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Refund Deposit</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground font-sans">
              Refund {selectedDeposit?.amount_usdt} USDT to {selectedDeposit?.profiles?.full_name}
            </p>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider font-sans">Refund Reason</Label>
              <Textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Reason for refund..."
                rows={4}
                className="resize-none font-sans bg-background/50 border-primary/30"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 border-t border-border mt-6 pt-4">
            <Button variant="outline" onClick={() => setRefundDialogOpen(false)} className="font-sans border-primary/30 text-primary hover:bg-primary/10">Cancel</Button>
            <Button
              onClick={handleRefund}
              disabled={processing || !refundReason}
              className="bg-warning text-warning-foreground hover:bg-warning/90 font-sans shadow-[0_0_15px_rgba(234,179,8,0.3)] border-0"
            >
              {processing ? 'Processing...' : 'Confirm Refund'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Merchant Applications Tab ───────────────────────────────── */
function MerchantTab({ adminId }: { adminId: string }) {
  const [applications, setApplications] = useState<MerchantApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [selected, setSelected] = useState<MerchantApplication | null>(null);

  const loadApps = useCallback(async () => {
    const { data } = await supabase
      .from('merchant_applications')
      .select('*, profiles!merchant_applications_user_id_fkey(full_name, email)')
      .in('status', ['pending', 'under_review'])
      .order('created_at', { ascending: true })
      .limit(50);
    setApplications(Array.isArray(data) ? (data as MerchantApplication[]) : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadApps();
    const channel = supabase
      .channel('merchant-apps-admin')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'merchant_applications' }, (payload) => {
        const app = payload.new as MerchantApplication;
        if (app.status === 'pending' || app.status === 'under_review') {
          setApplications((prev) => [app, ...prev]);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'merchant_applications' }, (payload) => {
        const updated = payload.new as MerchantApplication;
        if (updated.status !== 'pending' && updated.status !== 'under_review') {
          setApplications((prev) => prev.filter((a) => a.id !== updated.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadApps]);

  const approve = async (app: MerchantApplication) => {
    setProcessing(true);
    const { error } = await supabase.rpc('approve_merchant_application', {
      p_app_id: app.id,
      p_admin_id: adminId,
    });
    if (!error) {
      toast.success(`Merchant application approved for ${app.profiles?.full_name ?? 'user'}`);
      setApplications((prev) => prev.filter((a) => a.id !== app.id));
    } else {
      toast.error(error.message);
    }
    setProcessing(false);
  };

  const openReject = (app: MerchantApplication) => {
    setSelected(app);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const confirmReject = async () => {
    if (!selected || !rejectReason.trim()) return;
    setProcessing(true);
    const { error } = await supabase.rpc('reject_merchant_application', {
      p_app_id: selected.id,
      p_admin_id: adminId,
      p_reason: rejectReason.trim(),
    });
    if (!error) {
      toast.success(`Merchant application rejected for ${selected.profiles?.full_name ?? 'user'}`);
      setApplications((prev) => prev.filter((a) => a.id !== selected.id));
      setRejectDialogOpen(false);
      setSelected(null);
    } else {
      toast.error(error.message);
    }
    setProcessing(false);
  };

  if (loading) return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="border border-border"><CardContent className="p-4 space-y-2">
          <Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-60" />
        </CardContent></Card>
      ))}
    </div>
  );

  return (
    <>
      <div className="space-y-3">
        {applications.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground font-sans text-sm">
            No pending merchant applications.
          </div>
        ) : (
          applications.map((app) => (
            <Card key={app.id} className="border border-border card-gradient">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <p className="font-heading font-semibold">{app.profiles?.full_name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground font-sans">{app.profiles?.email}</p>
                    <div className="flex flex-wrap gap-2 text-xs font-sans text-muted-foreground">
                      <span>{app.business_name}</span>
                      <span>·</span>
                      <span>{app.trading_volume_usdt} USDT/month</span>
                      <span>·</span>
                      <span>{new Date(app.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {app.preferred_payment_methods.map((m) => (
                        <Badge key={m} variant="secondary" className="text-[10px] font-sans">{m}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <Button
                      size="sm"
                      onClick={() => approve(app)}
                      disabled={processing}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 border-0 shadow-[0_0_15px_rgba(16,185,129,0.35)]"
                    >
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button
                      size="sm" variant="outline"
                      onClick={() => openReject(app)}
                      disabled={processing}
                      className="border-destructive/40 text-destructive hover:bg-destructive/10 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                    >
                      <XCircle className="mr-1.5 h-3.5 w-3.5" /> Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Rejection Reason</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground font-sans">
              Provide a reason that will be shown to the applicant.
            </p>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Insufficient trading volume, please reapply with higher volume."
              rows={4}
              className="resize-none font-sans bg-background/50 border-primary/30 focus-visible:ring-primary"
            />
          </div>
          <DialogFooter className="gap-2 border-t border-border mt-6 pt-4">
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)} className="font-sans border-primary/30 text-primary hover:bg-primary/10">Cancel</Button>
            <Button
              onClick={confirmReject}
              disabled={processing || !rejectReason.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-sans shadow-[0_0_15px_rgba(239,68,68,0.3)] border-0"
            >
              {processing ? 'Processing…' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── KYC Tab ───────────────────────────────────────────────── */
function KycTab({ adminId }: { adminId: string }) {
  const [applications, setApplications] = useState<KycApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<KycApplication | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const loadApps = useCallback(async () => {
    const { data } = await supabase
      .from('kyc_applications')
      .select('*, profiles!kyc_applications_user_id_fkey(full_name, email)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(50);
    setApplications(Array.isArray(data) ? (data as KycApplication[]) : []);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The 'kyc' bucket is private (holds national ID / passport / selfie photos),
  // so id_document_url/back_document_url/selfie_url are storage PATHS, not
  // public links. Resolve them to short-lived signed URLs only while an admin
  // actually has this application open for review.
  useEffect(() => {
    if (!selected) { setSignedUrls({}); return; }
    let cancelled = false;
    const paths = [selected.id_document_url, selected.back_document_url, selected.selfie_url]
      .filter((p): p is string => !!p);
    Promise.all(paths.map((p) => supabase.storage.from('kyc').createSignedUrl(p, 300))).then((results) => {
      if (cancelled) return;
      const map: Record<string, string> = {};
      results.forEach((r, i) => { if (r.data?.signedUrl) map[paths[i]] = r.data.signedUrl; });
      setSignedUrls(map);
    });
    return () => { cancelled = true; };
  }, [selected]);

  useEffect(() => {
    loadApps();

    // Fix: subscribe to ALL inserts on kyc_applications (no status filter — Supabase
    // realtime does NOT support column filters on INSERT events, only on UPDATE/DELETE).
    // We filter in-memory after receiving the event.
    const channel = supabase
      .channel('kyc-admin-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'kyc_applications' },
        (payload) => {
          const app = payload.new as KycApplication;
          // Only add to list if status is pending
          if (app.status === 'pending') {
            setApplications((prev) => [app, ...prev]);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'kyc_applications' },
        (payload) => {
          const updated = payload.new as KycApplication;
          // Remove from pending list when status changes away from pending
          if (updated.status !== 'pending') {
            setApplications((prev) => prev.filter((a) => a.id !== updated.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadApps]);

  const approve = async (app: KycApplication) => {
    setProcessing(true);
    const { error: e1 } = await supabase
      .from('kyc_applications')
      .update({ status: 'approved', reviewed_by: adminId, reviewed_at: new Date().toISOString() })
      .eq('id', app.id);
    if (!e1) {
      await supabase.from('profiles').update({ is_kyc_verified: true }).eq('id', app.user_id);
      toast.success(`KYC approved for ${app.profiles?.full_name ?? 'user'}`);
      setApplications((prev) => prev.filter((a) => a.id !== app.id));
      if (selected?.id === app.id) setSelected(null);
    } else {
      toast.error(e1.message);
    }
    setProcessing(false);
  };

  const openReject = (app: KycApplication) => {
    setSelected(app);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const confirmReject = async () => {
    if (!selected || !rejectReason.trim()) return;
    setProcessing(true);
    const { error } = await supabase
      .from('kyc_applications')
      .update({
        status: 'rejected',
        rejection_reason: rejectReason.trim(),
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', selected.id);
    if (!error) {
      toast.success(`KYC rejected for ${selected.profiles?.full_name ?? 'user'}`);
      setApplications((prev) => prev.filter((a) => a.id !== selected.id));
      setRejectDialogOpen(false);
      setSelected(null);
    } else {
      toast.error(error.message);
    }
    setProcessing(false);
  };

  if (loading) return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="border border-border"><CardContent className="p-4 space-y-2">
          <Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-60" />
        </CardContent></Card>
      ))}
    </div>
  );

  return (
    <>
      <div className="space-y-3">
        {applications.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground font-sans text-sm">
            No pending KYC applications.
          </div>
        ) : (
          applications.map((app) => (
            <Card key={app.id} className="border border-border card-gradient">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <p className="font-heading font-semibold">{app.profiles?.full_name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground font-sans">{app.profiles?.email}</p>
                    <div className="flex flex-wrap gap-2 text-xs font-sans text-muted-foreground">
                      <span className="capitalize">{app.document_type.replace(/_/g, ' ')}</span>
                      <span>·</span>
                      <span>{app.document_number}</span>
                      <span>·</span>
                      <span>{new Date(app.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <Button
                    size="sm" variant="outline"
                    onClick={() => setSelected(app)}
                    className="border-primary/40 text-primary hover:bg-primary/10"
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5" /> View
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => approve(app)}
                    disabled={processing}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 border-0 shadow-[0_0_15px_rgba(16,185,129,0.35)]"
                  >
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Approve
                  </Button>
                  <Button
                    size="sm" variant="outline"
                    onClick={() => openReject(app)}
                    disabled={processing}
                    className="border-destructive/40 text-destructive hover:bg-destructive/10 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                  >
                    <XCircle className="mr-1.5 h-3.5 w-3.5" /> Reject
                  </Button>
                </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Document preview dialog */}
      {selected && !rejectDialogOpen && (
        <Dialog open onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading">
                KYC Review — {selected.profiles?.full_name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm font-sans">
                <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Full Name</p><p>{selected.full_name}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Document</p><p className="capitalize">{selected.document_type.replace(/_/g, ' ')}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Doc Number</p><p>{selected.document_number}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Submitted</p><p>{new Date(selected.created_at).toLocaleString()}</p></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { label: 'ID Front', path: selected.id_document_url },
                  { label: 'ID Back', path: selected.back_document_url },
                  { label: 'Selfie', path: selected.selfie_url },
                ].filter((d): d is { label: string; path: string } => !!d.path).map(({ label, path }) => {
                  const url = signedUrls[path];
                  return (
                    <div key={label} className="space-y-1">
                      <p className="text-xs text-muted-foreground font-sans uppercase tracking-wider">{label}</p>
                      {url ? (
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt={label} className="w-full rounded-lg border border-border object-cover aspect-video hover:opacity-90 transition-opacity" />
                        </a>
                      ) : (
                        <div className="w-full rounded-lg border border-border aspect-video bg-muted animate-pulse" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <DialogFooter className="gap-2 flex-wrap mt-6 border-t border-border pt-4">
              <Button variant="outline" onClick={() => setSelected(null)} className="font-sans border-primary/30 text-primary hover:bg-primary/10">Close</Button>
              <Button
                onClick={() => approve(selected)} disabled={processing}
                className="bg-primary text-primary-foreground hover:bg-primary/90 border-0 font-sans shadow-[0_0_15px_rgba(16,185,129,0.35)]"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
              </Button>
              <Button
                variant="outline" onClick={() => openReject(selected)} disabled={processing}
                className="border-destructive/40 text-destructive hover:bg-destructive/10 font-sans shadow-[0_0_15px_rgba(239,68,68,0.2)]"
              >
                <XCircle className="mr-2 h-4 w-4" /> Reject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Rejection reason dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
              <DialogTitle className="font-heading">Rejection Reason</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground font-sans">
                Provide a reason that will be shown to the applicant so they can resubmit.
              </p>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Document is blurry, please resubmit a clearer photo."
                rows={4}
                className="resize-none font-sans bg-background/50 border-primary/30 focus-visible:ring-primary"
              />
            </div>
            <DialogFooter className="gap-2 border-t border-border mt-6 pt-4">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)} className="font-sans border-primary/30 text-primary hover:bg-primary/10">Cancel</Button>
              <Button
                onClick={confirmReject}
                disabled={processing || !rejectReason.trim()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-sans shadow-[0_0_15px_rgba(239,68,68,0.3)] border-0"
              >
                {processing ? 'Processing…' : 'Confirm Rejection'}
              </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Manage User Dialog (full admin control) ──────────────── */
function ManageUserDialog({ user, onUpdated }: { user: Profile; onUpdated: (u: Profile) => void }) {
  const [open, setOpen] = useState(false);
  const [balanceUsdt, setBalanceUsdt] = useState(String(user.balance_usdt));
  const [balanceEtb, setBalanceEtb] = useState(String(user.balance_etb));
  const [kycVerified, setKycVerified] = useState(user.is_kyc_verified);
  const [role, setRole] = useState<'user' | 'admin'>(user.role);
  const [fullName, setFullName] = useState(user.full_name);
  const [totalTrades, setTotalTrades] = useState(String(user.total_trades));
  const [completedTrades, setCompletedTrades] = useState(String(user.completed_trades));
  const [completionRate, setCompletionRate] = useState(String(user.completion_rate));
  const [averageRating, setAverageRating] = useState(String(user.average_rating));
  const [saving, setSaving] = useState(false);

  // Reset local form state whenever a fresh user record is opened
  useEffect(() => {
    if (open) {
      setBalanceUsdt(String(user.balance_usdt));
      setBalanceEtb(String(user.balance_etb));
      setKycVerified(user.is_kyc_verified);
      setRole(user.role);
      setFullName(user.full_name);
      setTotalTrades(String(user.total_trades));
      setCompletedTrades(String(user.completed_trades));
      setCompletionRate(String(user.completion_rate));
      setAverageRating(String(user.average_rating));
    }
  }, [open, user]);

  const save = async () => {
    setSaving(true);
    const updates = {
      balance_usdt: parseFloat(balanceUsdt) || 0,
      balance_etb: parseFloat(balanceEtb) || 0,
      is_kyc_verified: kycVerified,
      role,
      full_name: fullName,
      total_trades: parseInt(totalTrades) || 0,
      completed_trades: parseInt(completedTrades) || 0,
      completion_rate: parseFloat(completionRate) || 0,
      average_rating: parseFloat(averageRating) || 0,
    };
    const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
    setSaving(false);
    if (!error) {
      toast.success(`${user.full_name}'s account updated`);
      onUpdated({ ...user, ...updates });
      setOpen(false);
    } else {
      toast.error(error.message);
    }
  };

  return (
    <>
      <Button
        size="sm" variant="outline"
        onClick={() => setOpen(true)}
        className="border-accent/40 text-accent hover:bg-accent/10"
      >
        <Settings2 className="mr-1.5 h-3.5 w-3.5" /> Manage
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Manage {user.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider font-sans">Full Name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="font-sans" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider font-sans">Balance USDT</Label>
                <Input value={balanceUsdt} onChange={(e) => setBalanceUsdt(e.target.value)} className="font-sans" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider font-sans">Balance ETB</Label>
                <Input value={balanceEtb} onChange={(e) => setBalanceEtb(e.target.value)} className="font-sans" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider font-sans">Total Trades</Label>
                <Input value={totalTrades} onChange={(e) => setTotalTrades(e.target.value)} className="font-sans" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider font-sans">Completed</Label>
                <Input value={completedTrades} onChange={(e) => setCompletedTrades(e.target.value)} className="font-sans" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider font-sans">Completion %</Label>
                <Input value={completionRate} onChange={(e) => setCompletionRate(e.target.value)} className="font-sans" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider font-sans">Avg Rating</Label>
                <Input value={averageRating} onChange={(e) => setAverageRating(e.target.value)} className="font-sans" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider font-sans">Role</Label>
                <Select value={role} onValueChange={(v: 'user' | 'admin') => setRole(v)}>
                  <SelectTrigger className="font-sans">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <Label className="text-sm font-sans">KYC Verified</Label>
              <Switch checked={kycVerified} onCheckedChange={setKycVerified} />
            </div>
          </div>
          <DialogFooter className="gap-2 border-t border-border mt-6 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)} className="font-sans">Cancel</Button>
            <Button onClick={save} disabled={saving} className="font-sans">
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Users Tab ─────────────────────────────────────────────── */
function UsersTab() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setUsers(Array.isArray(data) ? (data as Profile[]) : []);
        setLoading(false);
      });
  }, []);

  const toggleBan = async (u: Profile) => {
    const next = !u.is_banned;
    const { error } = await supabase.from('profiles').update({ is_banned: next }).eq('id', u.id);
    if (!error) {
      toast.success(`User ${next ? 'banned' : 'unbanned'}`);
      setUsers((prev) => prev.map((p) => p.id === u.id ? { ...p, is_banned: next } : p));
    } else toast.error(error.message);
  };

  const handleUpdated = (updated: Profile) => {
    setUsers((prev) => prev.map((p) => p.id === updated.id ? updated : p));
  };

  const filtered = users.filter((u) =>
    !search || u.full_name.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <Card key={i} className="border border-border"><CardContent className="p-4"><Skeleton className="h-5 w-48" /></CardContent></Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search by name or email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="font-sans max-w-sm"
      />
      <div className="space-y-2">
        {filtered.map((u) => (
          <Card key={u.id} className="border border-border card-gradient">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-0 space-y-0.5">
                  <p className="font-heading font-semibold text-sm">{u.full_name}</p>
                  <p className="text-xs text-muted-foreground font-sans truncate">{u.email}</p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {u.is_kyc_verified && (
                      <Badge className="text-xs font-sans bg-primary/20 text-primary border border-primary/30 gap-1">
                        <ShieldCheck className="h-3 w-3 text-primary" /> Verified
                      </Badge>
                    )}
                    {u.role === 'admin' && (
                      <Badge className="text-xs font-sans bg-accent/20 text-accent border border-accent/30">Admin</Badge>
                    )}
                    {u.is_banned && (
                      <Badge variant="destructive" className="text-xs font-sans shadow-[0_0_10px_rgba(239,68,68,0.3)]">Banned</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                <ManageUserDialog user={u} onUpdated={handleUpdated} />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm" variant="outline"
                      className={u.is_banned
                        ? 'border-muted-foreground/30 text-muted-foreground hover:bg-muted'
                        : 'border-destructive/40 text-destructive hover:bg-destructive/10'
                      }
                    >
                      <UserX className="mr-1.5 h-3.5 w-3.5" />
                      {u.is_banned ? 'Unban' : 'Ban'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-heading">{u.is_banned ? 'Unban' : 'Ban'} {u.full_name}?</AlertDialogTitle>
                      <AlertDialogDescription className="font-sans">
                        {u.is_banned
                          ? 'This will restore the user\'s access to the platform.'
                          : 'This will prevent the user from trading until unbanned.'}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="font-sans">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className={u.is_banned
                          ? 'font-sans'
                          : 'bg-destructive text-destructive-foreground hover:bg-destructive/90 font-sans'
                        }
                        onClick={() => toggleBan(u)}
                      >
                        Confirm
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ── Disputes Tab ──────────────────────────────────────────── */
function DisputesTab({ adminId }: { adminId: string }) {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('disputes')
      .select('*, profiles!disputes_opened_by_fkey(full_name), trades(amount_usdt, amount_etb, status)')
      .eq('status', 'open')
      .order('created_at', { ascending: true })
      .limit(50)
      .then(({ data }) => {
        setDisputes(Array.isArray(data) ? (data as Dispute[]) : []);
        setLoading(false);
      });
  }, []);

  const resolve = async (d: Dispute, outcome: 'release_to_buyer' | 'refund_to_seller', notes: string) => {
    // Real settlement — releases escrowed USDT to the buyer or refunds the seller,
    // and closes out the trade, instead of just marking the ticket resolved.
    const { error } = await supabase.rpc('admin_resolve_dispute', {
      p_dispute_id: d.id,
      p_outcome: outcome,
      p_notes: notes,
    });
    if (!error) {
      toast.success('Dispute resolved and escrow settled');
      setDisputes((prev) => prev.filter((x) => x.id !== d.id));
    } else toast.error(error.message);
  };

  if (loading) return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="border border-border"><CardContent className="p-4"><Skeleton className="h-5 w-48" /></CardContent></Card>
      ))}
    </div>
  );

  if (disputes.length === 0) return (
    <div className="py-16 text-center text-muted-foreground font-sans text-sm">
      No open disputes.
    </div>
  );

  return (
    <div className="space-y-3">
      {disputes.map((d) => (
        <DisputeCard key={d.id} dispute={d} onResolve={resolve} />
      ))}
    </div>
  );
}

function DisputeCard({ dispute, onResolve }: { dispute: Dispute; onResolve: (d: Dispute, outcome: 'release_to_buyer' | 'refund_to_seller', notes: string) => void }) {
  const [notes, setNotes] = useState('');
  const [outcome, setOutcome] = useState<'release_to_buyer' | 'refund_to_seller' | null>(null);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!outcome) return;
    setSubmitting(true);
    await onResolve(dispute, outcome, notes);
    setSubmitting(false);
    setOpen(false);
  };

  return (
    <Card className="border border-border card-gradient">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-heading font-semibold">Opened by: {dispute.profiles?.full_name ?? '—'}</p>
            <p className="text-xs text-muted-foreground font-sans">{dispute.reason}</p>
            {dispute.trades && (
              <p className="text-xs font-sans">
                Trade: {dispute.trades.amount_usdt} USDT / {dispute.trades.amount_etb} ETB
              </p>
            )}
          </div>
          <Button size="sm" onClick={() => setOpen(true)} className="shrink-0">Resolve</Button>
        </div>
      </CardContent>
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setOutcome(null); setNotes(''); } }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Resolve Dispute</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground font-sans">
              Choose who receives the escrowed {dispute.trades?.amount_usdt ?? ''} USDT. This settles the trade immediately.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                type="button"
                variant={outcome === 'release_to_buyer' ? 'default' : 'outline'}
                className="font-sans justify-start h-auto py-3"
                onClick={() => setOutcome('release_to_buyer')}
              >
                Release USDT to Buyer
              </Button>
              <Button
                type="button"
                variant={outcome === 'refund_to_seller' ? 'default' : 'outline'}
                className="font-sans justify-start h-auto py-3"
                onClick={() => setOutcome('refund_to_seller')}
              >
                Refund USDT to Seller
              </Button>
            </div>
            <Label className="text-xs uppercase tracking-wider font-sans">Resolution Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe the resolution…"
              rows={4}
              className="resize-none font-sans"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="font-sans">Cancel</Button>
            <Button
              disabled={!notes.trim() || !outcome || submitting}
              onClick={handleConfirm}
              className="font-sans"
            >
              {submitting ? 'Settling…' : 'Confirm Resolution'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ── Manual Operations Tab ─────────────────────────────────── */
function ManualOpsTab() {
  const [fromEmail, setFromEmail] = useState('');
  const [toEmail, setToEmail] = useState('');
  const [amountUsdt, setAmountUsdt] = useState('');
  const [amountEtb, setAmountEtb] = useState('');
  const [loading, setLoading] = useState(false);

  const transfer = async () => {
    setLoading(true);
    // Lookup user IDs by email
    const [fromRes, toRes] = await Promise.all([
      supabase.from('profiles').select('id').eq('email', fromEmail).maybeSingle(),
      supabase.from('profiles').select('id').eq('email', toEmail).maybeSingle(),
    ]);
    if (!fromRes.data) { toast.error(`Sender not found: ${fromEmail}`); setLoading(false); return; }
    if (!toRes.data) { toast.error(`Recipient not found: ${toEmail}`); setLoading(false); return; }
    const { error } = await supabase.rpc('admin_transfer_funds', {
      p_from_user: fromRes.data?.id ?? null,
      p_to_user: toRes.data?.id ?? null,
      p_amount_usdt: parseFloat(amountUsdt) || 0,
      p_amount_etb: parseFloat(amountEtb) || 0,
      p_reason: 'Manual admin transfer',
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success('Transfer completed'); setFromEmail(''); setToEmail(''); setAmountUsdt(''); setAmountEtb(''); }
  };

  return (
    <Card className="border border-border card-gradient max-w-md">
      <CardHeader>
        <CardTitle className="text-base font-heading">Manual Fund Transfer</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {[
          { label: 'From (email)', value: fromEmail, set: setFromEmail, placeholder: 'sender@example.com' },
          { label: 'To (email)', value: toEmail, set: setToEmail, placeholder: 'recipient@example.com' },
          { label: 'Amount USDT', value: amountUsdt, set: setAmountUsdt, placeholder: '0.00' },
          { label: 'Amount ETB', value: amountEtb, set: setAmountEtb, placeholder: '0.00' },
        ].map(({ label, value, set, placeholder }) => (
          <div key={label} className="space-y-1">
            <Label className="text-xs uppercase tracking-wider font-sans">{label}</Label>
            <Input
              value={value}
              onChange={(e) => set(e.target.value)}
              placeholder={placeholder}
              className="font-sans"
            />
          </div>
        ))}
        <Button onClick={transfer} disabled={loading} className="w-full">
          {loading ? 'Processing…' : 'Execute Transfer'}
        </Button>
      </CardContent>
    </Card>
  );
}

/* ── Offers Tab: admin can pause, reactivate, or delete ANY offer ── */
function OffersTab() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    supabase
      .from('offers')
      .select('*, profiles!offers_user_id_fkey(full_name, total_trades, completion_rate)')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setOffers(Array.isArray(data) ? (data as Offer[]) : []);
        setLoading(false);
      });
  }, []);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (o: Offer, status: Offer['status']) => {
    const { error } = await supabase.from('offers').update({ status }).eq('id', o.id);
    if (!error) {
      toast.success(`Offer ${status}`);
      setOffers((prev) => prev.map((x) => x.id === o.id ? { ...x, status } : x));
    } else toast.error(error.message);
  };

  const remove = async (o: Offer) => {
    const { error } = await supabase.from('offers').delete().eq('id', o.id);
    if (!error) {
      toast.success('Offer deleted');
      setOffers((prev) => prev.filter((x) => x.id !== o.id));
    } else toast.error(error.message);
  };

  if (loading) return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="border border-border"><CardContent className="p-4"><Skeleton className="h-5 w-48" /></CardContent></Card>
      ))}
    </div>
  );

  if (offers.length === 0) return (
    <div className="py-16 text-center text-muted-foreground font-sans text-sm">No offers yet.</div>
  );

  const statusColor: Record<Offer['status'], string> = {
    active: 'bg-primary/20 text-primary border-primary/30',
    paused: 'bg-warning/20 text-warning border-warning/30',
    completed: 'bg-muted text-muted-foreground border-border',
    cancelled: 'bg-destructive/20 text-destructive border-destructive/30',
  };

  return (
    <div className="space-y-3">
      {offers.map((o) => (
        <Card key={o.id} className="border border-border card-gradient">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-heading font-semibold text-sm">{o.profiles?.full_name ?? '—'}</span>
                  <Badge className={`text-[10px] font-sans border ${statusColor[o.status]}`}>{o.status}</Badge>
                  <Badge variant="secondary" className="text-[10px] font-sans capitalize">{o.type}</Badge>
                </div>
                <p className="text-xs text-muted-foreground font-sans">
                  {o.amount_usdt} USDT @ {o.exchange_rate} ETB · Limits {o.min_limit_etb}–{o.max_limit_etb} ETB
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {o.status === 'active' ? (
                  <Button size="sm" variant="outline" onClick={() => setStatus(o, 'paused')} className="border-warning/40 text-warning hover:bg-warning/10">
                    <PauseCircle className="mr-1.5 h-3.5 w-3.5" /> Pause
                  </Button>
                ) : o.status === 'paused' ? (
                  <Button size="sm" variant="outline" onClick={() => setStatus(o, 'active')} className="border-primary/40 text-primary hover:bg-primary/10">
                    <PlayCircle className="mr-1.5 h-3.5 w-3.5" /> Reactivate
                  </Button>
                ) : null}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10">
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-heading">Delete this offer?</AlertDialogTitle>
                      <AlertDialogDescription className="font-sans">This permanently removes the offer from the marketplace.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="font-sans">Cancel</AlertDialogCancel>
                      <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-sans" onClick={() => remove(o)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ── Trades Tab: admin can force-complete or force-cancel ANY trade ── */
function TradesTab() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    supabase
      .from('trades')
      .select('*, buyer:profiles!trades_buyer_id_fkey(full_name), seller:profiles!trades_seller_id_fkey(full_name)')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setTrades(Array.isArray(data) ? (data as Trade[]) : []);
        setLoading(false);
      });
  }, []);

  useEffect(() => { load(); }, [load]);

  const forceStatus = async (t: Trade, status: 'completed' | 'cancelled') => {
    // Direct update — admin RLS + the settlement trigger handle escrow correctly either way.
    const { error } = await supabase.from('trades').update({ status }).eq('id', t.id);
    if (!error) {
      toast.success(`Trade force-${status}`);
      setTrades((prev) => prev.map((x) => x.id === t.id ? { ...x, status } : x));
    } else toast.error(error.message);
  };

  if (loading) return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="border border-border"><CardContent className="p-4"><Skeleton className="h-5 w-48" /></CardContent></Card>
      ))}
    </div>
  );

  if (trades.length === 0) return (
    <div className="py-16 text-center text-muted-foreground font-sans text-sm">No trades yet.</div>
  );

  const canForce = (t: Trade) => t.status !== 'completed' && t.status !== 'cancelled';

  return (
    <div className="space-y-3">
      {trades.map((t) => (
        <Card key={t.id} className="border border-border card-gradient">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-heading font-semibold text-sm">
                    {t.buyer?.full_name ?? 'Buyer'} <span className="text-muted-foreground font-normal">buys from</span> {t.seller?.full_name ?? 'Seller'}
                  </span>
                  <Badge variant="secondary" className="text-[10px] font-sans capitalize">{t.status.replace('_', ' ')}</Badge>
                  <Badge variant="secondary" className="text-[10px] font-sans capitalize">escrow: {t.escrow_status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground font-sans">
                  {t.amount_usdt} USDT / {t.amount_etb} ETB @ {t.exchange_rate}
                </p>
              </div>
              {canForce(t) && (
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => forceStatus(t, 'completed')} className="border-primary/40 text-primary hover:bg-primary/10">
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Force Complete
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => forceStatus(t, 'cancelled')} className="border-destructive/40 text-destructive hover:bg-destructive/10">
                    <Ban className="mr-1.5 h-3.5 w-3.5" /> Force Cancel
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ── Main AdminDashboard ───────────────────────────────────── */
export default function AdminDashboard() {
  const { profile, loading, profileLoading } = useAuth();

  const skeletonUI = (
    <div className="container mx-auto px-4 py-10 max-w-5xl space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="flex gap-2"><Skeleton className="h-9 w-28" /><Skeleton className="h-9 w-28" /><Skeleton className="h-9 w-28" /></div>
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border border-border"><CardContent className="p-4 space-y-2">
            <Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-64" />
          </CardContent></Card>
        ))}
      </div>
    </div>
  );

  // Show skeleton while session OR profile is still loading — never redirect
  // before we know the role, which lives in the profile DB row fetched after
  // the Supabase session resolves.
  if (loading || profileLoading) return skeletonUI;
  if (!profile || profile.role !== 'admin') return <Navigate to="/dashboard" replace />;

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl space-y-8 page-enter">
      <div>
        <div className="luminate-rule" />
        <h1 className="text-3xl font-heading font-bold mt-4 luminate-title">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground font-sans mt-1">
          Platform management and oversight tools.
        </p>
      </div>

      <Tabs defaultValue="kyc">
        <TabsList className="grid grid-cols-3 sm:grid-cols-10 w-full md:w-auto md:inline-flex bg-background/50 border border-primary/20 shadow-[0_0_15px_rgba(16,185,129,0.06)] h-auto">
          <TabsTrigger value="kyc" className="font-sans text-xs md:text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-none rounded-sm">KYC Review</TabsTrigger>
          <TabsTrigger value="merchants" className="font-sans text-xs md:text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-none rounded-sm">Merchants</TabsTrigger>
          <TabsTrigger value="deposits" className="font-sans text-xs md:text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-none rounded-sm">Deposits</TabsTrigger>
          <TabsTrigger value="p2p-wallets" className="font-sans text-xs md:text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-none rounded-sm">P2P Wallets</TabsTrigger>
          <TabsTrigger value="external-wallets" className="font-sans text-xs md:text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-none rounded-sm">Ext. Wallets</TabsTrigger>
          <TabsTrigger value="disputes" className="font-sans text-xs md:text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-none rounded-sm">Disputes</TabsTrigger>
          <TabsTrigger value="users" className="font-sans text-xs md:text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-none rounded-sm">Users</TabsTrigger>
          <TabsTrigger value="offers" className="font-sans text-xs md:text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-none rounded-sm">Offers</TabsTrigger>
          <TabsTrigger value="trades" className="font-sans text-xs md:text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-none rounded-sm">Trades</TabsTrigger>
          <TabsTrigger value="ops" className="font-sans text-xs md:text-sm data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-none rounded-sm">Operations</TabsTrigger>
        </TabsList>

        <TabsContent value="kyc" className="mt-6">
          <KycTab adminId={profile.id} />
        </TabsContent>
        <TabsContent value="merchants" className="mt-6">
          <MerchantTab adminId={profile.id} />
        </TabsContent>
        <TabsContent value="deposits" className="mt-6">
          <MerchantDepositsTab adminId={profile.id} />
        </TabsContent>
        <TabsContent value="p2p-wallets" className="mt-6">
          <UserP2PWalletsTab adminId={profile.id} />
        </TabsContent>
        <TabsContent value="external-wallets" className="mt-6">
          <ExternalWalletsTab adminId={profile.id} />
        </TabsContent>
        <TabsContent value="disputes" className="mt-6">
          <DisputesTab adminId={profile.id} />
        </TabsContent>
        <TabsContent value="users" className="mt-6">
          <UsersTab />
        </TabsContent>
        <TabsContent value="offers" className="mt-6">
          <OffersTab />
        </TabsContent>
        <TabsContent value="trades" className="mt-6">
          <TradesTab />
        </TabsContent>
        <TabsContent value="ops" className="mt-6">
          <ManualOpsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
