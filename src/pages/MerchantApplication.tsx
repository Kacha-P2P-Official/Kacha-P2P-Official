import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Building2 } from 'lucide-react';
import { toast } from 'sonner';

const PAYMENT_OPTIONS = ['CBE Birr', 'Telebirr', 'Amhara Bank', 'Awash Bank', 'Abyssinia Bank', 'Cooperative Bank'];

const schema = z.object({
  business_name: z.string().min(2, 'Business name must be at least 2 characters'),
  business_description: z.string().optional(),
  trading_volume_usdt: z.coerce.number().positive('Trading volume must be positive'),
  preferred_payment_methods: z.array(z.string()).min(1, 'Select at least one payment method'),
});

export default function MerchantApplication() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      business_name: '',
      business_description: '',
      trading_volume_usdt: 0,
      preferred_payment_methods: [],
    },
  });

  const onSubmit = async (values: z.infer<typeof schema>) => {
    if (!profile?.is_kyc_verified) {
      setError('KYC verification required before applying for merchant status.');
      return;
    }
    setLoading(true);
    setError(null);
    
    const { error: err } = await supabase.from('merchant_applications').insert({
      user_id: profile.id,
      business_name: values.business_name,
      business_description: values.business_description || null,
      trading_volume_usdt: values.trading_volume_usdt,
      preferred_payment_methods: values.preferred_payment_methods,
    });
    
    setLoading(false);
    if (err) { 
      setError(err.message); 
      return; 
    }
    toast.success('Merchant application submitted successfully');
    navigate('/marketplace');
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-xl space-y-8">
      <div>
        <div className="luminate-rule" />
        <h1 className="text-3xl font-heading font-bold mt-4 flex items-center gap-2">
          <Building2 className="h-8 w-8 text-accent" /> Merchant Application
        </h1>
        <p className="text-sm text-muted-foreground font-sans mt-1">
          Apply to become a USDT merchant and sell on the platform.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription className="font-sans text-sm">{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          <FormField control={form.control} name="business_name" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-wider font-sans">Business Name</FormLabel>
              <FormControl>
                <Input placeholder="Your business name" {...field} className="font-sans" />
              </FormControl>
              <FormMessage className="font-sans text-xs" />
            </FormItem>
          )} />

          <FormField control={form.control} name="business_description" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-wider font-sans">Business Description (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe your business and trading experience..."
                  className="resize-none font-sans"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage className="font-sans text-xs" />
            </FormItem>
          )} />

          <FormField control={form.control} name="trading_volume_usdt" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-wider font-sans">Expected Monthly Trading Volume (USDT)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="1000" {...field} className="font-sans" />
              </FormControl>
              <FormDescription className="font-sans text-xs">
                Estimated amount of USDT you plan to trade monthly
              </FormDescription>
              <FormMessage className="font-sans text-xs" />
            </FormItem>
          )} />

          <FormField control={form.control} name="preferred_payment_methods" render={() => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-wider font-sans">Preferred Payment Methods</FormLabel>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {PAYMENT_OPTIONS.map((m) => (
                  <FormField key={m} control={form.control} name="preferred_payment_methods" render={({ field }) => (
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

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Submit Application'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
