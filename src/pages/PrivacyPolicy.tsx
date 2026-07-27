import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const SECTIONS = [
  {
    title: '1. Introduction',
    body: `Kacha ("we", "us", "our") operates the Kacha P2P USDT/ETB trading platform available at kacha.io. This Privacy Policy explains how we collect, use, disclose, and protect your personal information when you use our Service. By using Kacha, you consent to the practices described in this policy.`,
  },
  {
    title: '2. Information We Collect',
    subsections: [
      {
        heading: 'a. Account Information',
        text: 'When you register, we collect your full name, email address, and password (stored as a hashed value). We do not store plain-text passwords.',
      },
      {
        heading: 'b. KYC / Identity Verification Data',
        text: 'To comply with Ethiopian financial regulations, we collect government-issued identity document images (front and back), a selfie for liveness verification, and your document number. This data is stored securely and used solely for identity verification.',
      },
      {
        heading: 'c. Transaction Data',
        text: 'We record details of all trades conducted on the platform, including trade amounts, exchange rates, payment methods, timestamps, and counterparty identifiers.',
      },
      {
        heading: 'd. Communications',
        text: 'Chat messages sent within active trades are stored to facilitate dispute resolution. Support emails sent to support@kacha.io are retained for up to 2 years.',
      },
      {
        heading: 'e. Usage & Technical Data',
        text: 'We automatically collect IP addresses, browser type, device identifiers, pages visited, and session duration to improve platform performance and security.',
      },
    ],
  },
  {
    title: '3. How We Use Your Information',
    body: `We use your information to: (a) provide, operate, and improve the Service; (b) verify your identity and prevent fraud; (c) process and settle P2P trades; (d) resolve disputes between traders; (e) comply with applicable Ethiopian laws and regulations; (f) send you transactional notifications and important updates about your account.`,
  },
  {
    title: '4. Legal Basis for Processing',
    body: `We process your personal data on the following legal bases: (a) contractual necessity — to perform the agreement between you and Kacha; (b) legal obligation — to comply with anti-money-laundering and KYC regulations; (c) legitimate interests — to detect fraud, improve security, and ensure platform integrity; (d) consent — where you have explicitly consented to a specific processing activity.`,
  },
  {
    title: '5. Data Sharing & Disclosure',
    body: `We do not sell your personal data. We may share your information with: (a) Supabase Inc. (our cloud infrastructure and database provider), subject to appropriate data processing agreements; (b) regulatory or law enforcement authorities when required by Ethiopian law or a valid legal order; (c) fraud prevention services as needed to protect the platform; (d) professional advisors (lawyers, auditors) under strict confidentiality obligations.`,
  },
  {
    title: '6. Data Retention',
    body: `We retain account and transaction data for a minimum of 5 years after account closure to comply with Ethiopian financial regulations. KYC documents are retained for 7 years. You may request deletion of your account; however, certain data may be retained as required by law.`,
  },
  {
    title: '7. Your Rights',
    body: `You have the right to: (a) access the personal data we hold about you; (b) request correction of inaccurate data; (c) request deletion of your data (subject to legal retention obligations); (d) object to or restrict certain processing; (e) withdraw consent where processing is based on consent. To exercise any of these rights, contact us at support@kacha.io. We will respond within 30 days.`,
  },
  {
    title: '8. Security',
    body: `We implement industry-standard security measures including encryption in transit (TLS 1.3), encryption at rest for sensitive documents, row-level security on our database, and regular security audits. No system is completely secure; you are responsible for keeping your account credentials confidential.`,
  },
  {
    title: '9. Cookies & Local Storage',
    body: `Kacha uses browser local storage to maintain your authentication session and user preferences (such as theme selection). We do not use third-party advertising cookies. You may clear local storage through your browser settings, which will sign you out.`,
  },
  {
    title: '10. Children\'s Privacy',
    body: `The Service is not directed to persons under the age of 18. We do not knowingly collect personal information from minors. If you believe a minor has registered, please contact us immediately at support@kacha.io.`,
  },
  {
    title: '11. Changes to This Policy',
    body: `We may update this Privacy Policy from time to time. We will notify you of significant changes by posting a notice on the platform or by email. Your continued use of the Service after changes constitutes acceptance of the revised policy.`,
  },
  {
    title: '12. Contact Us',
    body: `For privacy-related enquiries, requests, or complaints, please contact our Data Protection contact at: support@kacha.io. Kacha Platform, Addis Ababa, Ethiopia.`,
  },
];

export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl page-enter">
      <div className="mb-10">
        <div className="luminate-rule" />
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-sans mt-4">Legal</p>
        <h1 className="text-3xl md:text-4xl font-heading font-bold mt-2 luminate-title">
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground font-sans mt-3">
          Effective date: 1 January 2026 &nbsp;·&nbsp; Last updated: 1 January 2026
        </p>
      </div>

      <div className="space-y-8 font-sans text-sm leading-relaxed text-foreground/85">
        {SECTIONS.map((s) => (
          <div key={s.title}>
            <h2 className="font-heading font-semibold text-base text-foreground mb-2">{s.title}</h2>
            {s.body && <p>{s.body}</p>}
            {s.subsections && (
              <div className="space-y-3 mt-2">
                {s.subsections.map((sub) => (
                  <div key={sub.heading}>
                    <p className="font-semibold text-foreground/90">{sub.heading}</p>
                    <p className="mt-0.5">{sub.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="text-xs text-muted-foreground font-sans flex-1">
          Your privacy matters to us. We are committed to transparency and the responsible handling of your personal data.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to="/">Back to Home</Link>
        </Button>
      </div>
    </div>
  );
}
