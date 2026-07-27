import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ShieldCheck, FileText, Camera, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { KycApplication } from '@/types/index';

const schema = z.object({
  full_name: z.string().min(2, 'At least 2 characters'),
  document_type: z.enum(['national_id', 'passport', 'driver_license']),
  document_number: z.string().min(3, 'Enter document number'),
  id_document: z.instanceof(FileList).refine((f) => f.length > 0, 'Front photo required'),
  back_document: z.instanceof(FileList).optional(),
  selfie: z.instanceof(FileList).refine((f) => f?.length > 0, 'Selfie required'),
});

const STATUS_STYLES: Record<KycApplication['status'], string> = {
  pending: 'bg-muted text-muted-foreground',
  under_review: 'bg-muted text-foreground',
  approved: 'bg-muted text-foreground',
  rejected: 'bg-destructive/10 text-destructive',
};

export default function KYCVerification() {
  const { profile, refreshProfile } = useAuth();
  const [existing, setExisting] = useState<KycApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: profile?.full_name ?? '', document_type: 'national_id', document_number: '' },
  });

  useEffect(() => {
    if (!profile?.id) return;
    // .maybeSingle() must be the terminal call — don't chain after limit()
    supabase.from('kyc_applications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        setExisting(Array.isArray(data) && data.length > 0 ? data[0] : null);
        setLoading(false);
      });
  }, [profile?.id]);

  // The 'kyc' bucket is private (contains national ID / passport / selfie
  // photos), so we store the storage PATH, not a public URL. A public URL
  // would let anyone who ever saw it view the document forever with no
  // auth check. Admins resolve the path to a short-lived signed URL only
  // when actually viewing a document (see AdminDashboard.tsx).
  const uploadFile = async (file: File, path: string): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const filePath = `${profile!.id}/${path}_${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage.from('kyc').upload(filePath, file, { contentType: file.type });
    if (error) return null;
    return data.path;
  };

  const onSubmit = async (values: z.infer<typeof schema>) => {
    setSubmitting(true);
    setError(null);

    const [idUrl, backUrl, selfieUrl] = await Promise.all([
      uploadFile(values.id_document[0], 'id_front'),
      values.back_document?.[0] ? uploadFile(values.back_document[0], 'id_back') : Promise.resolve(null),
      uploadFile(values.selfie[0], 'selfie'),
    ]);

    if (!idUrl || !selfieUrl) {
      setError('File upload failed. Please try again.');
      setSubmitting(false);
      return;
    }

    const { error: err } = await supabase.from('kyc_applications').insert({
      user_id: profile!.id,
      full_name: values.full_name,
      document_type: values.document_type,
      document_number: values.document_number,
      id_document_url: idUrl,
      back_document_url: backUrl,
      selfie_url: selfieUrl,
      status: 'pending',
    });

    setSubmitting(false);
    if (err) { setError(err.message); return; }
    toast.success('KYC submitted successfully. We\'ll review within 1–2 hours.');
    refreshProfile();
    // Reload existing — limit(1) then pick first element
    const { data } = await supabase.from('kyc_applications')
      .select('*').eq('user_id', profile!.id).order('created_at', { ascending: false }).limit(1);
    setExisting(Array.isArray(data) && data.length > 0 ? data[0] : null);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-xl">
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-muted rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-xl space-y-8">
      <div>
        <div className="luminate-rule" />
        <h1 className="text-3xl font-heading font-bold mt-4 flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-accent" />
          KYC Verification
        </h1>
        <p className="text-sm text-muted-foreground font-sans mt-1">
          Identity verification is required to trade on Kacha.
        </p>
      </div>

      {/* Status card if already submitted */}
      {existing && (
        <Card className="border border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-heading">Verification Status</CardTitle>
              <Badge className={`text-xs font-sans ${STATUS_STYLES[existing.status]}`}>
                {existing.status.replace(/_/g, ' ')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="text-sm font-sans space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Submitted</span>
              <span>{new Date(existing.created_at).toLocaleDateString()}</span>
            </div>
            {existing.rejection_reason && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Rejection reason:</strong> {existing.rejection_reason}
                </AlertDescription>
              </Alert>
            )}
            {existing.status === 'approved' && (
              <div className="flex items-center gap-2 text-foreground font-medium">
                <ShieldCheck className="h-4 w-4 text-accent" />
                Your identity has been verified. You can now trade freely.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Show form if not submitted or rejected */}
      {(!existing || existing.status === 'rejected') && (
        <>
          {error && (
            <Alert variant="destructive">
              <AlertDescription className="font-sans text-sm">{error}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              <FormField control={form.control} name="full_name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider font-sans">Full Legal Name</FormLabel>
                  <FormControl>
                    <Input placeholder="As on your ID document" {...field} className="font-sans" />
                  </FormControl>
                  <FormMessage className="font-sans text-xs" />
                </FormItem>
              )} />

              <FormField control={form.control} name="document_type" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider font-sans">Document Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="font-sans">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="national_id">National ID</SelectItem>
                      <SelectItem value="passport">Passport</SelectItem>
                      <SelectItem value="driver_license">Driver's License</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="font-sans text-xs" />
                </FormItem>
              )} />

              <FormField control={form.control} name="document_number" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider font-sans">Document Number</FormLabel>
                  <FormControl>
                    <Input placeholder="ID / Passport number" {...field} className="font-sans" />
                  </FormControl>
                  <FormMessage className="font-sans text-xs" />
                </FormItem>
              )} />

              {[
                { name: 'id_document' as const, label: 'Front of ID Document', icon: FileText },
                { name: 'back_document' as const, label: 'Back of ID (optional)', icon: FileText },
                { name: 'selfie' as const, label: 'Selfie Holding Document', icon: Camera },
              ].map(({ name, label, icon: Icon }) => (
                <FormField key={name} control={form.control} name={name} render={({ field: { onChange, ref } }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider font-sans flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept="image/*"
                        className="font-sans cursor-pointer"
                        ref={ref}
                        onChange={(e) => onChange(e.target.files)}
                      />
                    </FormControl>
                    <FormMessage className="font-sans text-xs" />
                  </FormItem>
                )} />
              ))}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading…</>
                  : 'Submit KYC Application'
                }
              </Button>
            </form>
          </Form>
        </>
      )}
    </div>
  );
}
