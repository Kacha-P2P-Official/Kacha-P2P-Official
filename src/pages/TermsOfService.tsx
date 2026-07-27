import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: `By accessing or using the Kacha P2P USDT/ETB trading platform ("Kacha", "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Service. Kacha reserves the right to update these Terms at any time. Continued use after changes constitutes acceptance of the revised Terms.`,
  },
  {
    title: '2. Eligibility',
    body: `You must be at least 18 years of age and a resident of Ethiopia to use the Service. By registering, you represent that you meet these eligibility requirements. Kacha may require identity verification (KYC) before permitting trading activity.`,
  },
  {
    title: '3. Account Registration & KYC',
    body: `You agree to provide accurate, complete, and current information during registration and KYC verification. You are responsible for maintaining the confidentiality of your account credentials. Kacha reserves the right to suspend or terminate accounts that provide false information or fail to complete KYC within a reasonable timeframe.`,
  },
  {
    title: '4. P2P Trading & Escrow',
    body: `Kacha provides a peer-to-peer marketplace that connects independent buyers and sellers of USDT. All trades are facilitated through an escrow mechanism: seller's USDT is locked in escrow upon trade initiation and released to the buyer only after the seller confirms receipt of Ethiopian Birr payment. Kacha is not a party to any trade and does not guarantee the performance of any counterparty.`,
  },
  {
    title: '5. Fees',
    body: `Kacha may charge a platform fee on completed trades. Current fees are displayed in the trading interface prior to confirmation. Kacha reserves the right to modify fees with notice to users.`,
  },
  {
    title: '6. Prohibited Activities',
    body: `You agree not to: (a) use the Service for money laundering, fraud, or any illegal activity; (b) manipulate prices or trade with yourself; (c) harass or threaten other users; (d) attempt to circumvent security controls; (e) use automated bots without written permission. Violations may result in immediate account termination and reporting to relevant authorities.`,
  },
  {
    title: '7. Dispute Resolution',
    body: `In the event of a trade dispute, users may open a dispute through the Active Trade page. Kacha administrators will review the evidence provided by both parties and issue a resolution decision. Kacha's decision on disputes is final. Kacha is not liable for losses arising from disputed trades resolved in the counterparty's favour.`,
  },
  {
    title: '8. Risk Disclosure',
    body: `Cryptocurrency trading involves significant financial risk. The value of USDT and other digital assets can fluctuate substantially. You acknowledge that you understand and accept these risks and that Kacha is not responsible for any losses resulting from trading activity.`,
  },
  {
    title: '9. Limitation of Liability',
    body: `To the maximum extent permitted by applicable law, Kacha and its officers, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service. Kacha's total aggregate liability shall not exceed the fees paid by you to Kacha in the 30 days preceding the claim.`,
  },
  {
    title: '10. Governing Law',
    body: `These Terms shall be governed by and construed in accordance with the laws of the Federal Democratic Republic of Ethiopia. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts of Addis Ababa, Ethiopia.`,
  },
  {
    title: '11. Contact',
    body: `For questions about these Terms, please contact us at support@kacha.io.`,
  },
];

export default function TermsOfService() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl page-enter">
      <div className="mb-10">
        <div className="luminate-rule" />
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-sans mt-4">Legal</p>
        <h1 className="text-3xl md:text-4xl font-heading font-bold mt-2 luminate-title">
          Terms of Service
        </h1>
        <p className="text-sm text-muted-foreground font-sans mt-3">
          Effective date: 1 January 2026 &nbsp;·&nbsp; Last updated: 1 January 2026
        </p>
      </div>

      <div className="space-y-8 font-sans text-sm leading-relaxed text-foreground/85">
        {SECTIONS.map((s) => (
          <div key={s.title}>
            <h2 className="font-heading font-semibold text-base text-foreground mb-2">{s.title}</h2>
            <p>{s.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="text-xs text-muted-foreground font-sans flex-1">
          By using Kacha, you acknowledge that you have read, understood, and agree to these Terms of Service.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to="/">Back to Home</Link>
        </Button>
      </div>
    </div>
  );
}
