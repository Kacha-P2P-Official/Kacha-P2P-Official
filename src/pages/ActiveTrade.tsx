import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Send, Lock, CheckCircle2, AlertTriangle, Upload, X, Copy as CopyIcon, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useSupabaseUpload } from '@/hooks/use-supabase-upload';
import type { Trade, TradeMessage, Profile } from '@/types/index';

const STATUS_STEPS: Record<Trade['status'], number> = {
  initiated: 0,
  payment_pending: 1,
  payment_confirmed: 2,
  completed: 3,
  cancelled: 3,
  disputed: 3,
};

const STATUS_LABELS: Record<Trade['status'], string> = {
  initiated: 'Initiated',
  payment_pending: 'Payment Pending',
  payment_confirmed: 'Payment Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  disputed: 'Disputed',
};

export default function ActiveTrade() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [trade, setTrade] = useState<Trade | null>(null);
  const [counterparty, setCounterparty] = useState<Profile | null>(null);
  const [offer, setOffer] = useState<any>(null);
  const [messages, setMessages] = useState<TradeMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const endRef = useRef<HTMLDivElement>(null);

  // Load trade
  useEffect(() => {
    if (!id) return;
    // Load trade and messages in parallel; setLoading(false) only after both finish
    const tradePromise = supabase.from('trades').select('*').eq('id', id).maybeSingle().then(({ data }) => {
      if (!data) { navigate('/marketplace'); return; }
      setTrade(data as Trade);
      // load counterparty
      const cpId = data.buyer_id === profile?.id ? data.seller_id : data.buyer_id;
      supabase.from('profiles').select('*').eq('id', cpId).maybeSingle().then(({ data: cp }) => {
        setCounterparty(cp);
      });
      // load offer to get payment details
      if (data.offer_id) {
        supabase.from('offers').select('*').eq('id', data.offer_id).maybeSingle().then(({ data: offerData }) => {
          setOffer(offerData);
        });
      }
    });
    // load messages
    const messagesPromise = supabase.from('trade_messages')
      .select('*, profiles!trade_messages_sender_id_fkey(full_name)')
      .eq('trade_id', id)
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data }) => {
        setMessages(Array.isArray(data) ? (data as TradeMessage[]) : []);
      });

    // Only mark loading done after both requests complete
    Promise.all([tradePromise, messagesPromise]).finally(() => setLoading(false));
    // realtime messages
    const channel = supabase.channel(`trade-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trade_messages', filter: `trade_id=eq.${id}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new as TradeMessage]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, profile?.id]);

  // Also realtime for trade status changes
  useEffect(() => {
    if (!id) return;
    const ch = supabase.channel(`trade-status-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trades', filter: `id=eq.${id}` }, (payload) => {
        setTrade((prev) => prev ? { ...prev, ...(payload.new as Trade) } : null);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isBuyer = trade?.buyer_id === profile?.id;

  // 15-minute payment timer for buyers
  useEffect(() => {
    if (!trade || !isBuyer || trade.status !== 'initiated') {
      setTimeRemaining(0);
      return;
    }
    
    const tradeCreatedAt = new Date(trade.created_at).getTime();
    const deadline = tradeCreatedAt + 15 * 60 * 1000; // 15 minutes in ms
    
    const calculateRemaining = () => {
      const now = Date.now();
      const remaining = Math.max(0, deadline - now);
      setTimeRemaining(remaining);
    };
    
    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);
    
    return () => clearInterval(interval);
  }, [trade, isBuyer]);

  const sendMessage = async () => {
    if (!msg.trim() || !id || !profile) return;
    setSending(true);
    const { error } = await supabase.from('trade_messages').insert({ trade_id: id, sender_id: profile.id, content: msg.trim() });
    if (error) toast.error(`Failed to send message: ${error.message}`);
    else setMsg('');
    setSending(false);
  };

  const updateTradeStatus = async (newStatus: Trade['status']) => {
    if (!trade) return;
    const { error } = await supabase.from('trades').update({ status: newStatus }).eq('id', trade.id);
    if (error) toast.error(`Failed to update trade: ${error.message}`);
    else toast.success(`Trade status updated to "${STATUS_LABELS[newStatus]}"`);
  };

  // Opening a dispute creates a real row admins can see and act on —
  // the DB automatically flips the trade to "disputed" once this insert succeeds.
  const submitDispute = async () => {
    if (!trade || !profile || !disputeReason.trim()) return;
    setSubmittingDispute(true);
    const { error } = await supabase.from('disputes').insert({
      trade_id: trade.id,
      opened_by: profile.id,
      reason: disputeReason.trim(),
    });
    setSubmittingDispute(false);
    if (error) {
      toast.error(`Failed to open dispute: ${error.message}`);
    } else {
      toast.success('Dispute submitted — an admin will review this trade shortly.');
      setDisputeReason('');
    }
  };

  const handlePaymentProofUpload = async () => {
    if (!trade || !profile) return;
    setUploadingProof(true);
    await upload.onUpload();
    if (upload.isSuccess && upload.files.length > 0) {
      const fileName = upload.files[0].name;
      const filePath = profile.id ? `${profile.id}/${trade.id}/${fileName}` : fileName;
      const { data: { publicUrl } } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(filePath);
      
      const { error } = await supabase.from('trades').update({
        payment_proof_url: publicUrl,
      }).eq('id', trade.id);
      
      if (error) {
        toast.error(`Failed to save payment proof: ${error.message}`);
      } else {
        toast.success('Payment proof uploaded successfully');
        upload.setFiles([]);
      }
    } else if (upload.errors.length > 0) {
      toast.error(`Upload failed: ${upload.errors[0].message}`);
    }
    setUploadingProof(false);
  };

  // Payment proof upload hook
  const upload = useSupabaseUpload({
    bucketName: 'payment-proofs',
    path: profile?.id ? `${profile.id}/${trade?.id}` : undefined,
    allowedMimeTypes: ['image/*'],
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxFiles: 1,
    supabase,
  });

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-3xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!trade) return null;

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <div className="luminate-rule" />
        <div className="flex items-center justify-between gap-4 mt-4 flex-wrap">
          <h1 className="text-2xl font-heading font-bold">Active Trade</h1>
          <Badge className={`font-sans text-xs ${
            trade.status === 'completed' ? 'bg-muted text-foreground' :
            trade.status === 'disputed' ? 'bg-destructive/10 text-destructive' :
            'bg-muted text-foreground'
          }`}>
            {STATUS_LABELS[trade.status]}
          </Badge>
        </div>
      </div>

      {/* Modern Stepper */}
      <div className="p-6 md:p-8 bg-muted/20 border border-border rounded-xl">
        <div className="flex items-center justify-between relative">
          {/* Connecting line */}
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-border -translate-y-1/2 z-0" />
          <div 
            className="absolute top-1/2 left-0 h-1 bg-accent -translate-y-1/2 z-0 transition-all duration-700" 
            style={{ width: `${(STATUS_STEPS[trade.status] / 3) * 100}%` }} 
          />
          
          {['Initiated', 'Paying', 'Confirmed', 'Complete'].map((label, idx) => {
            const currentStep = STATUS_STEPS[trade.status];
            const isCompleted = currentStep > idx || trade.status === 'completed';
            const isCurrent = currentStep === idx && trade.status !== 'completed';
            
            return (
              <div key={label} className="relative z-10 flex flex-col items-center gap-3 bg-background/50 px-2 rounded-lg">
                <div className={`h-10 w-10 md:h-12 md:w-12 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  isCompleted ? 'bg-accent text-accent-foreground scale-105' :
                  isCurrent ? 'bg-background border-2 border-accent text-accent shadow-[0_0_20px_rgba(245,158,11,0.6)] scale-110' :
                  'bg-muted text-muted-foreground border border-border'
                }`}>
                  {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : idx + 1}
                </div>
                <span className={`text-[10px] md:text-xs font-sans hidden sm:block whitespace-nowrap ${isCurrent ? 'text-accent font-semibold' : 'text-muted-foreground'}`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trade details */}
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <Lock className="h-4 w-4 text-accent" /> Trade Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm font-sans">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">Amount</p>
              <p className="font-heading font-semibold text-base">{trade.amount_usdt} USDT</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">Total ETB</p>
              <p className="font-heading font-semibold text-base">{trade.amount_etb} ETB</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">Rate</p>
              <p>{trade.exchange_rate} ETB/USDT</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">Payment</p>
              <p>{trade.payment_method ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">Your Role</p>
              <p>{isBuyer ? 'Buyer' : 'Seller'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">Counterparty</p>
              <p>{counterparty?.full_name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">Escrow</p>
              <p className="flex items-center gap-1.5 capitalize">
                <Lock className="h-3 w-3 text-accent" />
                {trade.escrow_status === 'held' ? 'USDT Held in Escrow' : trade.escrow_status}
              </p>
            </div>
          </div>

          {/* Progress steps */}
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground font-sans text-center">
              Please use the Trade Chat below to coordinate payment.
            </p>
          </div>
        </CardContent>
      </Card>

          {/* Payment Proof Section for Buyer */}
          {isBuyer && (trade.status === 'initiated' || trade.status === 'payment_pending') && (
            <Card className="border border-border">
              <CardHeader>
                <CardTitle className="text-base font-heading flex items-center gap-2">
                  <Upload className="h-4 w-4 text-accent" /> Payment Proof
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {timeRemaining > 0 && trade.status === 'initiated' && (
                  <div className={`p-3 rounded-lg border ${timeRemaining < 5 * 60 * 1000 ? 'bg-destructive/10 border-destructive/30 text-destructive' : 'bg-accent/10 border-accent/30 text-accent'}`}>
                    <p className="text-sm font-sans font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Payment deadline: {Math.floor(timeRemaining / 60000)}:{Math.floor((timeRemaining % 60000) / 1000).toString().padStart(2, '0')} remaining
                    </p>
                  </div>
                )}
                <p className="text-sm text-muted-foreground font-sans">
                  Please deposit {trade.amount_etb} ETB to the seller's bank account and upload a screenshot of the payment confirmation.
                </p>
                
                {/* Seller's Payment Details */}
                <div className="mt-4 p-4 bg-gradient-to-br from-muted/40 to-muted/20 rounded-xl border border-border shadow-[var(--shadow-sm)]">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-lg bg-accent/20 flex items-center justify-center border border-accent/30">
                      <Lock className="h-4 w-4 text-accent" />
                    </div>
                    <p className="text-sm font-heading font-bold text-accent">Seller's Payment Details</p>
                  </div>
                  {offer?.payment_details && Object.keys(offer.payment_details).length > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(offer.payment_details).map(([method, details]: [string, any]) => (
                        <div key={method} className="p-3 bg-background/50 rounded-lg border border-border hover:border-accent/50 transition-colors">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                              <CheckCircle2 className="h-3 w-3 text-primary" />
                            </div>
                            <p className="text-sm font-heading font-semibold">{method}</p>
                          </div>
                          {details?.account_number && (
                            <div className="mb-2">
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans mb-1">Account Number</p>
                              <div className="flex items-center gap-2">
                                <code className="text-sm font-mono bg-background px-3 py-1.5 rounded border border-border flex-1 font-semibold text-foreground">
                                  {details.account_number}
                                </code>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 shrink-0"
                                  onClick={() => {
                                    navigator.clipboard.writeText(details.account_number);
                                    toast.success('Account number copied to clipboard');
                                  }}
                                >
                                  <CopyIcon className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                          {details?.holder_name && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans mb-1">Account Holder</p>
                              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                                <UserCircle className="h-4 w-4 text-accent" />
                                {details.holder_name}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground font-sans">
                        No payment details available from the seller's offer.
                      </p>
                    </div>
                  )}
                </div>
                
                {trade.payment_proof_url ? (
                  <div className="relative">
                    <img 
                      src={trade.payment_proof_url} 
                      alt="Payment proof" 
                      className="w-full rounded-lg border border-border"
                    />
                    <p className="text-xs text-green-600 font-sans mt-2 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Payment proof uploaded
                    </p>
                  </div>
                ) : (
                  <div>
                    <div
                      {...upload.getRootProps()}
                      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                        upload.isDragActive ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
                      }`}
                    >
                      <input {...upload.getInputProps()} />
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-sans text-muted-foreground">
                        {upload.isDragActive
                          ? 'Drop the screenshot here'
                          : 'Drag & drop a screenshot, or click to select'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Max file size: 5MB</p>
                    </div>
                    
                    {upload.files.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {upload.files.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-muted/30 p-2 rounded-lg">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-sans truncate max-w-[200px]">{file.name}</span>
                              {upload.errors.find(e => e.name === file.name) && (
                                <span className="text-xs text-destructive font-sans">
                                  {upload.errors.find(e => e.name === file.name)?.message}
                                </span>
                              )}
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => {
                                const newFiles = upload.files.filter((_, i) => i !== idx);
                                upload.setFiles(newFiles);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          size="sm"
                          onClick={handlePaymentProofUpload}
                          disabled={uploadingProof || upload.loading || upload.errors.length > 0}
                          className="w-full"
                        >
                          {uploadingProof ? 'Uploading...' : 'Upload Payment Proof'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Payment Proof View for Seller */}
          {!isBuyer && trade.payment_proof_url && (
            <Card className="border border-border">
              <CardHeader>
                <CardTitle className="text-base font-heading flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" /> Buyer's Payment Proof
                </CardTitle>
              </CardHeader>
              <CardContent>
                <img 
                  src={trade.payment_proof_url} 
                  alt="Payment proof" 
                  className="w-full rounded-lg border border-border"
                />
              </CardContent>
            </Card>
          )}

          {/* Actions */}
      {trade.status !== 'completed' && trade.status !== 'cancelled' && trade.status !== 'disputed' && (
        <div className="flex flex-wrap gap-2">
          {isBuyer && trade.status === 'initiated' && (
            <Button size="sm" onClick={() => updateTradeStatus('payment_pending')} className="h-8 text-xs">
              I've Sent Payment
            </Button>
          )}
          {!isBuyer && trade.status === 'payment_pending' && (
            <Button size="sm" onClick={() => updateTradeStatus('payment_confirmed')} className="h-8 text-xs">
              Confirm Payment Received
            </Button>
          )}
          {!isBuyer && trade.status === 'payment_confirmed' && (
            <Button size="sm" onClick={() => updateTradeStatus('completed')} className="h-8 text-xs">
              Release USDT
            </Button>
          )}
          {isBuyer && trade.status === 'initiated' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 text-xs">
                  Cancel Trade
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-heading">Cancel this trade?</AlertDialogTitle>
                  <AlertDialogDescription className="font-sans">
                    The seller's escrowed USDT will be refunded and this trade will be closed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="font-sans">Keep Trade</AlertDialogCancel>
                  <AlertDialogAction
                    className="font-sans"
                    onClick={() => updateTradeStatus('cancelled')}
                  >
                    Cancel Trade
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <AlertDialog onOpenChange={(open) => { if (!open) setDisputeReason(''); }}>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 h-8 text-xs">
                <AlertTriangle className="mr-2 h-3 w-3" /> Dispute
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-heading">Open a Dispute?</AlertDialogTitle>
                <AlertDialogDescription className="font-sans">
                  This will flag the trade for admin review. Only use this if there is a genuine problem —
                  describe what happened so the admin can resolve it quickly.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Input
                placeholder="e.g. Seller hasn't released USDT after payment confirmation"
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                className="font-sans h-9"
              />
              <AlertDialogFooter>
                <AlertDialogCancel className="font-sans">Cancel</AlertDialogCancel>
                {/* Use a plain Button instead of AlertDialogAction so the dialog
                    stays open when submission fails (AlertDialogAction always closes). */}
                <Button
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-sans"
                  disabled={!disputeReason.trim() || submittingDispute}
                  onClick={submitDispute}
                >
                  {submittingDispute ? 'Submitting…' : 'Open Dispute'}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Chat */}
      <Card className="border border-border">
        <CardHeader className="border-b border-border bg-muted/20">
          <CardTitle className="text-base font-heading">Trade Chat</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-96 overflow-y-auto p-4 space-y-4 bg-background/50">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground font-sans text-center py-12">
                No messages yet. Start the conversation.
              </p>
            )}
            {messages.map((m) => {
              const isOwn = m.sender_id === profile?.id;
              return (
                <div key={m.id} className={`flex gap-3 max-w-[85%] ${isOwn ? 'ml-auto justify-end' : 'justify-start'}`}>
                  {!isOwn && !m.is_system_message && (
                    <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0 border border-accent/30 mt-1">
                      <span className="text-xs font-bold text-accent-foreground">{counterparty?.full_name?.charAt(0) ?? 'U'}</span>
                    </div>
                  )}
                  <div className={`rounded-2xl px-4 py-2.5 text-sm font-sans relative ${
                    m.is_system_message
                      ? 'bg-muted/50 border border-border text-muted-foreground text-center w-full max-w-full text-xs mx-auto'
                      : isOwn
                      ? 'bg-accent text-accent-foreground rounded-tr-sm shadow-sm'
                      : 'bg-muted text-foreground border border-border/50 rounded-tl-sm shadow-sm'
                  }`}>
                    <p>{m.content}</p>
                    <p className={`text-[10px] mt-1 ${isOwn ? 'text-accent-foreground/70 text-right' : 'text-muted-foreground/70'}`}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
          <div className="border-t border-border p-3 flex gap-2 bg-muted/20">
            <Input
              placeholder="Type your message…"
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              className="font-sans bg-background focus-visible:ring-accent h-9"
              disabled={trade.status === 'completed' || trade.status === 'cancelled'}
            />
            <Button size="icon" onClick={sendMessage} disabled={sending || !msg.trim()} className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm h-9 w-9">
              <Send className="h-3.5 w-3.5" />
              <span className="sr-only">Send</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
