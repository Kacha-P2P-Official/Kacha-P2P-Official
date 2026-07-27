import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const PAYMENT_OPTIONS = ['CBE Birr', 'Telebirr', 'Amhara Bank', 'Awash Bank', 'Abyssinia Bank', 'Cooperative Bank', 'M-PESA'];

const schema = z.object({
  type: z.enum(['buy', 'sell']),
  amount_usdt: z.coerce.number().positive('Amount must be positive'),
  exchange_rate: z.coerce.number().positive(),
  min_limit_etb: z.coerce.number().min(0),
  max_limit_etb: z.coerce.number().min(0),
  payment_methods: z.array(z.string()).min(1, 'Select at least one payment method'),
  payment_details: z.record(z.object({
    account_number: z.string().optional(),
    holder_name: z.string().optional(),
  })).optional(),
  terms_conditions: z.string().optional(),
}).superRefine((d, ctx) => {
  if (d.type === 'buy' && (d.exchange_rate < 180 || d.exchange_rate > 182)) {
    ctx.addIssue({ code: 'custom', path: ['exchange_rate'], message: 'Buy rate must be 180–182 ETB/USDT' });
  }
  if (d.type === 'sell' && (d.exchange_rate < 183 || d.exchange_rate > 186)) {
    ctx.addIssue({ code: 'custom', path: ['exchange_rate'], message: 'Sell rate must be 183–186 ETB/USDT' });
  }
  if (d.max_limit_etb < d.min_limit_etb) {
    ctx.addIssue({ code: 'custom', path: ['max_limit_etb'], message: 'Max limit must be ≥ min limit' });
  }
  // Require payment details for each selected payment method
  if (d.payment_methods && d.payment_methods.length > 0) {
    d.payment_methods.forEach((method) => {
      const details = d.payment_details?.[method];
      const accountNumber = details?.account_number?.trim();
      const holderName = details?.holder_name?.trim();
      if (!accountNumber) {
        ctx.addIssue({
          code: 'custom',
          path: ['payment_details', method, 'account_number'],
          message: `Please provide an account number for ${method}`,
        });
      }
      if (!holderName) {
        ctx.addIssue({
          code: 'custom',
          path: ['payment_details', method, 'holder_name'],
          message: `Please provide the account holder name for ${method}`,
        });
      }
    });
  }
});
  // Require payment details for selected payment methods
  if (d.payment_methods && d.payment_methods.length > 0) {
    d.payment_methods.forEach((method) => {
      const details = d.payment_details?.[method] || '';
      if (!details || details.trim() === '') {
        ctx.addIssue({ 
          code: 'custom', 
          path: ['payment_details'], 
          message: `Please provide account details for ${method}` 
        });
      }
    });
  }
});

export default function CreateOffer() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: (searchParams.get('type') as 'buy' | 'sell') || 'sell',
      amount_usdt: 0,
      exchange_rate: 0,
      min_limit_etb: 0,
      max_limit_etb: 0,
      payment_methods: [],
      payment_details: {},
      terms_conditions: '',
    },
  });

  const offerType = form.watch('type');

  const onSubmit = async (values: z.infer<typeof schema>) => {
    if (!profile?.is_kyc_verified) {
      setError('KYC verification required before creating offers.');
      return;
    }
    if (values.type === 'sell' && !profile.is_merchant) {
      setError('Merchant status required to create sell offers. Please apply for merchant status first.');
      return;
    }
    setLoading(true);
    setError(null);
    
    // Set online status to 8 hours from now for sellers
    if (values.type === 'sell') {
      const eightHoursFromNow = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
      await supabase.from('profiles').update({ online_until: eightHoursFromNow }).eq('id', profile.id);
    }
    
    const { error: err } = await supabase.from('offers').insert({
      user_id: profile.id,
      ...values,
      payment_details: values.payment_details || {},
      terms_conditions: values.terms_conditions || null,
    });
    setLoading(false);
    if (err) { 
      console.error('Offer creation error:', err);
      setError(err.message); 
      return; 
    }
    toast.success('Offer created successfully');
    navigate('/marketplace');
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-xl space-y-8">
      <div>
        <div className="luminate-rule" />
        <h1 className="text-3xl font-heading font-bold mt-4">Create Offer</h1>
        <p className="text-sm text-muted-foreground font-sans mt-1">
          Post your offer to the marketplace. Exchange rates are validated against platform policy.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription className="font-sans text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {offerType === 'sell' && !profile?.is_merchant && (
        <Alert>
          <AlertDescription className="font-sans text-sm">
            <Building2 className="h-4 w-4 inline mr-2" />
            Merchant status required to create sell offers. 
            <Link to="/merchant-application" className="underline font-medium ml-1">Apply for merchant status</Link>
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          {/* Type */}
          <FormField control={form.control} name="type" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-wider font-sans">Offer Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="font-sans h-9">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="buy">Buy USDT (you pay ETB)</SelectItem>
                  <SelectItem value="sell">Sell USDT (you receive ETB)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage className="font-sans text-xs" />
            </FormItem>
          )} />

          {/* Amount */}
          <FormField control={form.control} name="amount_usdt" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-wider font-sans">Amount (USDT)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="100" {...field} className="font-sans h-9" />
              </FormControl>
              <FormMessage className="font-sans text-xs" />
            </FormItem>
          )} />

          {/* Exchange rate */}
          <FormField control={form.control} name="exchange_rate" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-wider font-sans">Exchange Rate (ETB/USDT)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder={offerType === 'buy' ? '181' : '184'} {...field} className="font-sans h-9" />
              </FormControl>
              <FormDescription className="font-sans text-xs">
                {offerType === 'buy' ? 'Allowed: 180–182 ETB/USDT' : 'Allowed: 183–186 ETB/USDT'}
              </FormDescription>
              <FormMessage className="font-sans text-xs" />
            </FormItem>
          )} />

          {/* Limits */}
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="min_limit_etb" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs uppercase tracking-wider font-sans">Min Limit (ETB)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="500" {...field} className="font-sans h-9" />
                </FormControl>
                <FormMessage className="font-sans text-xs" />
              </FormItem>
            )} />
            <FormField control={form.control} name="max_limit_etb" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs uppercase tracking-wider font-sans">Max Limit (ETB)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="10000" {...field} className="font-sans h-9" />
                </FormControl>
                <FormMessage className="font-sans text-xs" />
              </FormItem>
            )} />
          </div>

          {/* Payment methods */}
          <FormField control={form.control} name="payment_methods" render={() => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-wider font-sans">Payment Methods</FormLabel>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {PAYMENT_OPTIONS.map((m) => (
                  <FormField key={m} control={form.control} name="payment_methods" render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value.includes(m)}
                          onCheckedChange={(checked) => {
                            const next = checked
                              ? [...field.value, m]
                              : field.value.filter((v) => v !== m);
                            field.onChange(next);
                          }}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-sans font-normal cursor-pointer">{m}</FormLabel>
                    </FormItem>
                  )} />
                ))}
              </div>
              <FormMessage className="font-sans text-xs" />
            </FormItem>
          )} />

          {/* Payment Details for selected methods */}
          {form.watch('payment_methods').map((method) => (
            <div key={method} className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border">
              <h4 className="text-sm font-heading font-semibold">{method} Details</h4>
              <FormField
                control={form.control}
                name={`payment_details.${method}.account_number`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider font-sans">Account Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter account number"
                        {...field}
                        className="font-sans h-9"
                      />
                    </FormControl>
                    <FormMessage className="font-sans text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`payment_details.${method}.holder_name`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider font-sans">Account Holder Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter account holder name"
                        {...field}
                        className="font-sans h-9"
                      />
                    </FormControl>
                    <FormMessage className="font-sans text-xs" />
                  </FormItem>
                )}
              />
            </div>
          ))}

          {/* Terms */}
          <FormField control={form.control} name="terms_conditions" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-wider font-sans">Terms & Conditions (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any specific instructions for your trading partner…"
                  className="resize-none font-sans"
                  rows={2}
                  {...field}
                />
              </FormControl>
              <FormMessage className="font-sans text-xs" />
            </FormItem>
          )} />

          <Button type="submit" className="w-full h-9 text-xs" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : 'Post Offer'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
