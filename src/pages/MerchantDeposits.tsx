import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wallet, Upload, CheckCircle2, XCircle, Clock, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useSupabaseUpload } from '@/hooks/use-supabase-upload';
import type { AdminWallet, MerchantDeposit } from '@/types/index';

export default function MerchantDeposits() {
  const { profile } = useAuth();
  const [wallets, setWallets] = useState<AdminWallet[]>([]);
  const [deposits, setDeposits] = useState<MerchantDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWallet, setSelectedWallet] = useState<AdminWallet | null>(null);
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const upload = useSupabaseUpload({
    bucketName: 'merchant-deposits',
    path: profile?.id ? `${profile.id}` : undefined,
    allowedMimeTypes: ['image/*'],
    maxFileSize: 5 * 1024 * 1024,
    maxFiles: 1,
    supabase,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [walletsRes, depositsRes] = await Promise.all([
      supabase.from('admin_wallets').select('*').eq('is_active', true),
      profile ? supabase
        .from('merchant_deposits')
        .select('*, admin_wallets!merchant_deposits_admin_wallet_id_fkey(wallet_address, label)')
        .eq('merchant_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50) : Promise.resolve({ data: null }),
    ]);
    setWallets(Array.isArray(walletsRes.data) ? walletsRes.data : []);
    setDeposits(Array.isArray(depositsRes.data) ? depositsRes.data : []);
    setLoading(false);
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopied(address);
    toast.success('Address copied to clipboard');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSubmitDeposit = async () => {
    if (!selectedWallet || !amount || !txHash || upload.files.length === 0) {
      toast.error('Please fill all fields and upload proof');
      return;
    }
    setSubmitting(true);
    await upload.onUpload();
    if (upload.isSuccess && upload.files.length > 0) {
      const fileName = upload.files[0].name;
      const filePath = profile?.id ? `${profile.id}/${fileName}` : fileName;
      const { data: { publicUrl } } = supabase.storage
        .from('merchant-deposits')
        .getPublicUrl(filePath);

      const { error } = await supabase.from('merchant_deposits').insert({
        merchant_id: profile?.id,
        admin_wallet_id: selectedWallet.id,
        amount_usdt: parseFloat(amount),
        transaction_hash: txHash,
        proof_url: publicUrl,
      });

      if (error) {
        toast.error(`Failed to submit deposit: ${error.message}`);
      } else {
        toast.success('Deposit submitted for review');
        setSelectedWallet(null);
        setAmount('');
        setTxHash('');
        upload.setFiles([]);
        loadData();
      }
    } else if (upload.errors.length > 0) {
      toast.error(`Upload failed: ${upload.errors[0].message}`);
    }
    setSubmitting(false);
  };

  if (loading) return (
    <div className="container mx-auto px-4 py-10 max-w-4xl space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="border border-border"><CardContent className="p-4"><Skeleton className="h-5 w-40" /></CardContent></Card>
        ))}
      </div>
    </div>
  );

  if (!profile?.is_merchant) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <Alert>
          <AlertDescription className="font-sans">
            Merchant status required to access deposit features.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const statusColors = {
    pending: 'bg-warning/20 text-warning border-warning/30',
    confirmed: 'bg-primary/20 text-primary border-primary/30',
    rejected: 'bg-destructive/20 text-destructive border-destructive/30',
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl space-y-8">
      <div>
        <div className="luminate-rule" />
        <h1 className="text-3xl font-heading font-bold mt-4 flex items-center gap-2">
          <Wallet className="h-8 w-8 text-accent" /> Merchant Deposits
        </h1>
        <p className="text-sm text-muted-foreground font-sans mt-1">
          Deposit USDT to admin wallets to fund your merchant account.
        </p>
      </div>

      {/* Available Admin Wallets */}
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="text-base font-heading">Available Deposit Wallets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {wallets.length === 0 ? (
            <p className="text-sm text-muted-foreground font-sans">No active deposit wallets available.</p>
          ) : (
            wallets.map((wallet) => (
              <div
                key={wallet.id}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  selectedWallet?.id === wallet.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedWallet(wallet)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <p className="font-heading font-semibold text-sm">{wallet.label}</p>
                    <p className="text-xs text-muted-foreground font-sans uppercase">{wallet.wallet_type}</p>
                    <p className="text-xs text-muted-foreground font-sans">{wallet.network}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono truncate max-w-[200px]">
                        {wallet.wallet_address}
                      </code>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={(e) => { e.stopPropagation(); copyAddress(wallet.wallet_address); }}
                      >
                        {copied === wallet.wallet_address ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                  <Badge className="text-xs font-sans bg-primary/20 text-primary border border-primary/30">
                    {wallet.balance_usdt} USDT
                  </Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Deposit Form */}
      {selectedWallet && (
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-base font-heading">Submit Deposit to {selectedWallet.label}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider font-sans">Amount (USDT)</Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="100.00"
                className="font-sans"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider font-sans">Transaction Hash</Label>
              <Input
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="Enter transaction hash from blockchain"
                className="font-sans"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider font-sans">Deposit Proof (Screenshot)</Label>
              <div
                {...upload.getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  upload.isDragActive ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
                }`}
              >
                <input {...upload.getInputProps()} />
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-sans text-muted-foreground">
                  {upload.isDragActive ? 'Drop the screenshot here' : 'Drag & drop a screenshot, or click to select'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Max file size: 5MB</p>
              </div>
              {upload.files.length > 0 && (
                <div className="mt-2 space-y-2">
                  {upload.files.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-muted/30 p-2 rounded-lg">
                      <span className="text-sm font-sans truncate max-w-[200px]">{file.name}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => {
                          const newFiles = upload.files.filter((_, i) => i !== idx);
                          upload.setFiles(newFiles);
                        }}
                      >
                        <XCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button
              onClick={handleSubmitDeposit}
              disabled={submitting || upload.loading || upload.errors.length > 0}
              className="w-full"
            >
              {submitting ? 'Submitting...' : 'Submit Deposit'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Deposit History */}
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="text-base font-heading">Deposit History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {deposits.length === 0 ? (
            <p className="text-sm text-muted-foreground font-sans">No deposit history.</p>
          ) : (
            deposits.map((deposit) => (
              <div key={deposit.id} className="p-4 rounded-lg border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-semibold text-sm">{deposit.amount_usdt} USDT</span>
                    <Badge className={`text-xs font-sans border ${statusColors[deposit.status]}`}>
                      {deposit.status}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground font-sans">
                    {new Date(deposit.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-sans">
                  <span>Wallet: {deposit.admin_wallets?.label}</span>
                  <span>·</span>
                  <span className="font-mono truncate max-w-[150px]">{deposit.transaction_hash}</span>
                </div>
                {deposit.status === 'rejected' && deposit.rejection_reason && (
                  <p className="text-xs text-destructive font-sans">Reason: {deposit.rejection_reason}</p>
                )}
                {deposit.proof_url && (
                  <a href={deposit.proof_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-sans underline">
                    View Proof
                  </a>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
