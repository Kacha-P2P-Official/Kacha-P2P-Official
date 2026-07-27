# Requirements Document

## 1. Application Overview

**Application Name**: Kacha P2P USDT/ETB Trading Platform (Upgrade)

**Description**: Kacha is a peer-to-peer cryptocurrency trading platform enabling Ethiopian users to buy and sell USDT against Ethiopian Birr (ETB) through escrow-protected transactions. This PRD focuses on: (1) manual KYC verification via admin dashboard with approval/rejection workflows, (2) Supabase realtime subscription fix for new KYC applications, (3) Google OAuth integration, (4) trade initiation success toast, (5) Live Rates widget, (6) Deep Crypto Dark UI redesign with neon accents, and (7) APK-ready PWA improvements.

## 2. Users and Usage Scenarios

**Target Users**:
- Platform administrators responsible for KYC review
- Ethiopian cryptocurrency traders requiring KYC verification

**Core Usage Scenarios**:
- Users submit KYC verification with identity documents
- Administrators review pending KYC submissions in real-time via admin dashboard
- Administrators approve or reject KYC applications with mandatory rejection reason
- System updates user KYC status and notifies user of decision
- Users log in via Google OAuth
- Users view live exchange rates and initiate trades
- Users install PWA on mobile devices

## 3. Page Structure and Functionality

### 3.1 Page Hierarchy

```
Kacha Platform
├── Public Pages
│   ├── Landing Page (hero with Live Rates widget)
│   ├── Login Page (with Google OAuth)
│   └── Register Page (with Google OAuth)
├── Authenticated Pages
│   ├── Dashboard
│   ├── Marketplace (with Live Rates widget sidebar/banner)
│   ├── Create Offer
│   ├── Active Trade
│   └── KYC Verification (User Submission)
└── Admin Pages (admin role only)
    └── Admin Dashboard
        └── KYC Review Tab
```

### 3.2 Page-by-Page Functionality

#### 3.2.1 Landing Page

**Purpose**: Introduce platform and display live exchange rates

**Functionality**:
- Full-viewport dark gradient hero section (#0B0E14 to #1A1F2E) with floating animated orbs (CSS-based, electric cyan #00F0FF glow)
- Large serif headline using Playfair Display with neon purple gradient text effect (#A855F7 to #EC4899)
- Live Rates widget integrated in hero section:
  - Header: 「Live Rates — Updated now」 with pulsing electric cyan dot animation
  - Exchange Rate display:
    - Buy range: 180–182 ETB / USDT (animated number display in cyan #00F0FF)
    - Sell range: 183–186 ETB / USDT (animated number display in neon purple #A855F7)
  - Payment methods: CBE Birr, Telebirr with icons/badges
  - Settlement time: < 15 minutes
  - Security: Escrow with shield icon
  - 「Create Buy Offer」 CTA button linking to /marketplace/create?type=buy (electric cyan background with glow)
  - Widget styled with glassmorphism card (backdrop-blur, semi-transparent dark background #1A1F2E/80, electric cyan accent border #00F0FF, neon glow)
- Stats section with animated count-up and dramatic entrance animation (text in cyan/purple gradient)
- Trust badges bar displaying: Licensed, Escrow Protected, 24/7 Support, 28,000+ Traders (badges with dark background and cyan borders)
- Smooth page transitions using Framer Motion
- Typography: larger, bolder headings with neon gradient text effects

#### 3.2.2 Login Page

**Purpose**: Allow users to authenticate via credentials or Google OAuth

**Functionality**:
- Left decorative panel: animated dark gradient background (#0B0E14 to #1A1F2E) with floating orbs (cyan/purple glow)
- Right form panel: glassmorphism card (dark background #1A1F2E/90) containing:
  - Logo/brand mark at top (cyan accent)
  - Email input field (dark input #0B0E14, cyan border on focus)
  - Password input field (dark input #0B0E14, cyan border on focus)
  - Login button (electric cyan background #00F0FF with glow effect)
  - Google OAuth button:
    - Display Google logo SVG icon
    - Dark button background #1A1F2E with cyan border
    - On click: call `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/dashboard' } })`
  - Link to Register page (cyan text)

#### 3.2.3 Register Page

**Purpose**: Allow new users to create account via credentials or Google OAuth

**Functionality**:
- Left decorative panel: animated dark gradient background (#0B0E14 to #1A1F2E) with floating orbs (cyan/purple glow)
- Right form panel: glassmorphism card (dark background #1A1F2E/90) containing:
  - Logo/brand mark at top (cyan accent)
  - Email input field (dark input #0B0E14, cyan border on focus)
  - Password input field (dark input #0B0E14, cyan border on focus)
  - Confirm password input field (dark input #0B0E14, cyan border on focus)
  - Register button (electric cyan background #00F0FF with glow effect)
  - Google OAuth button:
    - Display Google logo SVG icon
    - Dark button background #1A1F2E with cyan border
    - On click: call `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/dashboard' } })`
  - Link to Login page (cyan text)

#### 3.2.4 Dashboard

**Purpose**: Display user portfolio and trade history

**Functionality**:
- Dark background #0B0E14
- Portfolio overview section with gradient balance cards (dark #1A1F2E background, cyan/purple gradient borders)
- Trade history list with status color coding:
  - Pending: neon purple #A855F7
  - Completed: electric cyan #00F0FF
  - Cancelled: red #EF4444
- Quick action buttons with hover glow effects (Create Offer, View Marketplace) - cyan background with neon glow

#### 3.2.5 Marketplace

**Purpose**: Display available buy/sell offers and allow users to initiate trades

**Functionality**:
- Dark background #0B0E14
- Live Rates widget:
  - Desktop: sidebar card on right side (dark glassmorphism card)
  - Mobile: top banner
  - Same content and styling as Landing Page widget
- Filter bar with animated active states:
  - Buy/Sell toggle (active state: cyan background #00F0FF)
  - Payment method filters (dark chips with cyan borders)
- Offer cards redesigned with:
  - Dark card background #1A1F2E
  - Cyan/purple gradient border on hover
  - Trader avatar circle (cyan border)
  - Trust score bar (cyan fill)
  - Verified badge (cyan glow)
  - Payment method chips (dark background, cyan text)
  - Exchange rate prominently displayed (large cyan text)
  - Amount available (purple text)
  - 「Trade」 button (electric cyan background with glow)
- On 「Trade」 button click:
  - Display sonner toast.success(\"Trade initiated! Connecting you with your trading partner…\")
  - Navigate to Active Trade page

#### 3.2.6 Active Trade

**Purpose**: Facilitate communication and transaction completion between trading partners

**Functionality**:
- Dark background #0B0E14
- Trade progress bar: animated stepper with cyan glow on active step (Initiated → Payment → Confirmation → Completed)
- Status banner with contextual color:
  - Active: cyan #00F0FF
  - Completed: green #10B981
  - Disputed: red #EF4444
- Chat interface:
  - Modern chat bubbles (dark background #1A1F2E, cyan border for user messages, purple border for partner messages)
  - Avatars with cyan/purple borders
  - Message input field (dark input #0B0E14, cyan border on focus)
  - Send button (cyan background with glow)
- Trade action buttons:
  - Mark as Paid (cyan background)
  - Release Funds (purple background)
  - Dispute (red background)

#### 3.2.7 KYC Verification Page (Authenticated Users)

**Purpose**: Allow users to submit identity documents for KYC verification

**Functionality**:
- Dark background #0B0E14
- Display current KYC status with color coding:
  - not_submitted: gray #6B7280
  - pending: neon purple #A855F7
  - approved: electric cyan #00F0FF
  - rejected: red #EF4444
- KYC submission form (dark glassmorphism card #1A1F2E/90) containing:
  - Full name input field (dark input #0B0E14, cyan border on focus)
  - Identity document type selection (dark dropdown, cyan accent)
  - Identity document number input field (dark input #0B0E14, cyan border on focus)
  - Document photo upload (front side) - dark upload area with cyan dashed border
  - Document photo upload (back side, if applicable) - dark upload area with cyan dashed border
  - Selfie photo upload holding document - dark upload area with cyan dashed border
- Submit button (electric cyan background #00F0FF with glow effect)
- Display rejection reason in red text box if status is rejected
- Disable form and show approval message in cyan if status is approved
- Show pending message in purple if status is pending

**Data Storage**:
- KYC submission stored in backend database with fields: user_id, full_name, document_type, document_number, front_photo_url, back_photo_url, selfie_photo_url, status (pending/approved/rejected), rejection_reason, submitted_at, reviewed_at, reviewed_by_admin_id

#### 3.2.8 Admin Dashboard - KYC Review Tab (Admin Only)

**Purpose**: Enable administrators to review and process KYC applications manually

**Functionality**:

**Page Layout**:
- Dark background #0B0E14
- Top navigation bar (dark #1A1F2E with cyan accent)
- Sidebar menu with KYC Review Tab highlighted (cyan glow when active)
- Main content area with dark glassmorphism cards

**KYC Applications List**:
- Display table of all KYC submissions with dark theme:
  - Table header: dark background #1A1F2E with cyan text
  - Table rows: alternating dark backgrounds (#0B0E14 / #1A1F2E)
  - Hover state: cyan glow border
  - Columns:
    - User ID (cyan text)
    - Full Name (white text)
    - Document Type (gray text)
    - Submission Date (gray text)
    - Status badge:
      - Pending: purple badge #A855F7 with glow
      - Approved: cyan badge #00F0FF with glow
      - Rejected: red badge #EF4444
    - Actions: View Details button (cyan background with glow)
- Filter options displayed as dark chips with cyan borders:
  - All (active state: cyan background)
  - Pending (active state: purple background)
  - Approved (active state: cyan background)
  - Rejected (active state: red background)
- Search bar: dark input #0B0E14 with cyan border on focus, cyan search icon
- Sort dropdown: dark background with cyan accent
- Real-time updates: new pending KYC applications appear with subtle cyan flash animation

**KYC Detail Review Interface**:
- Dark glassmorphism modal overlay (backdrop-blur with dark background #0B0E14/95)
- Modal card with dark background #1A1F2E and cyan border glow
- Header section:
  - User ID and username (cyan text)
  - Submission timestamp (gray text)
  - Close button (cyan icon)
- Information section (dark card #0B0E14):
  - Full name (white text)
  - Document type and number (gray text)
- Photo gallery section:
  - Three photo cards in grid layout
  - Each card: dark background #1A1F2E, cyan border
  - Labels: \"Front Side\", \"Back Side\", \"Selfie with Document\" (cyan text)
  - Click to zoom: full-screen overlay with dark background, cyan close button
- Action section at bottom:
  - Rejection reason textarea (dark input #0B0E14, cyan border on focus, placeholder in gray)
  - Button group:
    - Approve button: electric cyan background #00F0FF with glow, white text
    - Reject button: red background #EF4444 with glow, white text
    - Back to list button: dark background #1A1F2E with cyan border, cyan text

**Approval Workflow**:
1. Administrator clicks View Details on pending KYC application
2. Modal opens with dark theme and cyan accents
3. Administrator reviews submitted documents and photos in zoomable gallery
4. Administrator clicks Approve button (cyan with glow)
5. System updates KYC status to approved
6. System records reviewed_at timestamp and reviewed_by_admin_id
7. Success toast appears (cyan background): \"KYC application approved successfully\"
8. Modal closes automatically
9. KYC list updates in real-time, status badge changes to cyan \"Approved\"
10. User can now access full trading capabilities

**Rejection Workflow**:
1. Administrator clicks View Details on pending KYC application
2. Modal opens with dark theme and cyan accents
3. Administrator reviews submitted documents and identifies issues
4. Administrator enters rejection reason in textarea (minimum 10 characters)
5. Administrator clicks Reject button (red with glow)
6. System validates rejection reason length
7. System updates KYC status to rejected
8. System stores rejection_reason in database
9. System records reviewed_at timestamp and reviewed_by_admin_id
10. Success toast appears (red background): \"KYC application rejected\"
11. Modal closes automatically
12. KYC list updates in real-time, status badge changes to red \"Rejected\"
13. User sees rejection reason on KYC Verification page and can resubmit

**Realtime Subscription Fix**:
- Current Issue: Supabase realtime subscription filtered by `status=eq.pending` on INSERT events does not work due to Supabase limitation (filters not applied to INSERT events)
- Solution: Use unfiltered INSERT subscription on KYC submissions table
- Implementation:
  - Subscribe to all INSERT events on kyc_submissions table without status filter
  - When new INSERT event received, check if status is pending in client-side code
  - If status is pending, add new submission to pending KYC list with cyan flash animation
  - If status is not pending, ignore the event
- Result: Administrators see new pending KYC applications appear in list immediately without page refresh

### 3.3 Mobile Browser Experience

**Purpose**: Provide optimized mobile web experience

**Functionality**:
- Dark theme maintained across all mobile views
- Smooth 60fps scroll on all pages
- Touch-optimized tap targets (minimum 48x48px)
- Bottom safe area handling for iOS notch and Android navigation bar
- Swipe-friendly offer cards on Marketplace (dark cards with cyan borders)
- PWA install prompt:
  - Display as prominent bottom sheet on Android Chrome
  - Dark background #1A1F2E with cyan accent border
  - Show app icon, name \"Kacha\", \"Add to Home Screen\" button (cyan background)
  - Include \"Not now\" dismissible link (gray text)
  - More visible than current banner implementation

### 3.4 PWA Configuration

**Purpose**: Enable installation as native-like app and offline capability

**Functionality**:
- manifest.json configuration:
  - `\"display\": \"standalone\"`
  - `\"orientation\": \"portrait\"`
  - `\"theme_color\": \"#00F0FF\"`
  - `\"background_color\": \"#0B0E14\"`
  - `\"start_url\": \"/\"`
  - Icon sizes: 72px, 96px, 128px, 144px, 152px, 192px, 384px, 512px
- index.html meta tags:
  - `<meta name=\"mobile-web-app-capable\" content=\"yes\">`
  - Apple PWA meta tags for iOS compatibility
- Service worker:
  - Cache all static assets for offline capability
  - Work correctly when opened from TWA (Trusted Web Activity) / APK wrapper

## 4. Business Rules and Logic

### 4.1 Color Scheme Rules
- Force dark mode as default and only mode
- Primary background: #0B0E14
- Secondary background: #1A1F2E
- Primary accent: electric cyan #00F0FF
- Secondary accent: neon purple #A855F7
- Success state: cyan #00F0FF
- Error state: red #EF4444
- Warning state: orange #F59E0B
- Text colors:
  - Primary text: white #FFFFFF
  - Secondary text: gray #9CA3AF
  - Accent text: cyan #00F0FF
- No white backgrounds allowed anywhere in the application

### 4.2 KYC Submission Rules
- Users can only have one active KYC submission at a time
- Users with approved KYC cannot submit new applications
- Users with rejected KYC can resubmit after reviewing rejection reason
- All photo uploads must be in JPEG or PNG format
- Document photos must clearly show all text and photo on document

### 4.3 KYC Review Rules
- Only users with admin role can access KYC Review Tab
- Administrators must provide rejection reason when rejecting applications
- Rejection reason must be at least 10 characters long
- Once approved, KYC status cannot be changed back to pending or rejected
- Once rejected, user must submit new KYC application (previous submission remains in history)

### 4.4 KYC Status Flow
- not_submitted → pending (user submits KYC)
- pending → approved (admin approves)
- pending → rejected (admin rejects with reason)
- rejected → pending (user resubmits new KYC)

### 4.5 Trading Restrictions
- Users with not_submitted or pending KYC status have limited trading capabilities
- Users with approved KYC status have full trading capabilities
- Users with rejected KYC status have limited trading capabilities until resubmission and approval

### 4.6 Authentication Rules
- Users can log in via email/password or Google OAuth
- Google OAuth redirects to /dashboard after successful authentication
- Existing sessions remain valid across page refreshes

### 4.7 Live Rates Display Rules
- Exchange rates update in real-time
- Buy range displayed in cyan #00F0FF
- Sell range displayed in neon purple #A855F7
- Animated number transitions when rates change
- Pulsing cyan dot indicates live data

### 4.8 Trade Initiation Rules
- Success toast must display before navigation to Active Trade page
- Toast message: \"Trade initiated! Connecting you with your trading partner…\"
- Toast styled with cyan background and white text
- Navigation occurs after toast is shown

## 5. Exceptions and Edge Cases

| Scenario | Handling |
|----------|----------|
| User attempts to submit KYC while previous submission is pending | Display error toast (red background): \"You already have a pending KYC application\" |
| Administrator attempts to approve already approved KYC | Display error toast (red background): \"This KYC application is already approved\" |
| Administrator clicks Reject without entering rejection reason | Display validation error below textarea (red text): \"Rejection reason is required\" |
| Administrator enters rejection reason shorter than 10 characters | Display validation error below textarea (red text): \"Rejection reason must be at least 10 characters\" |
| Realtime subscription receives INSERT event for non-pending KYC | Client-side code ignores the event, does not update list |
| User uploads photo larger than 5MB | Display error toast (red background): \"Photo size must be less than 5MB\" |
| User uploads non-image file | Display error toast (red background): \"Only JPEG and PNG formats are supported\" |
| Network error during KYC submission | Display error toast (red background): \"Submission failed, please try again\" |
| Network error during admin approval/rejection | Display error toast (red background): \"Action failed, please try again\" |
| Multiple administrators review same KYC simultaneously | First action succeeds, second action displays error toast (red background): \"This KYC has already been processed\" |
| Google OAuth fails or user cancels | Display error toast (red background): \"Google sign-in failed, please try again\" |
| Live Rates API unavailable | Display last known rates with \"Last updated\" timestamp in gray text |
| User clicks Trade button multiple times rapidly | Disable button after first click, show single toast |
| PWA install prompt dismissed by user | Do not show again for 7 days |
| Service worker fails to cache assets | App continues to work online, displays offline message (red toast) when network unavailable |

## 6. Acceptance Criteria

1. User opens any page of the application and sees deep dark background (#0B0E14) with electric cyan (#00F0FF) and neon purple (#A855F7) accents, with no white backgrounds anywhere
2. Administrator logs in with admin role, navigates to Admin Dashboard, clicks KYC Review Tab, and sees dark-themed table with pending KYC applications listed with purple status badges
3. Administrator clicks View Details on pending KYC application, sees dark modal with cyan border, reviews uploaded identity documents and selfie in zoomable gallery, enters rejection reason in dark textarea, clicks Reject button (red with glow), and sees success toast with red background
4. Administrator clicks View Details on another pending KYC application, reviews documents, clicks Approve button (cyan with glow), sees success toast with cyan background, and observes status badge change to cyan \"Approved\" in real-time
5. User submits new KYC application, administrator sees new pending application appear in KYC list immediately with cyan flash animation without page refresh
6. User opens Login page, sees dark gradient background with floating cyan/purple orbs, clicks Google OAuth button with dark background and cyan border, completes Google authentication, and is redirected to dark-themed /dashboard
7. User navigates to Marketplace with dark background, clicks Trade button (cyan with glow) on an offer, sees success toast with cyan background \"Trade initiated! Connecting you with your trading partner…\", and is then navigated to dark-themed Active Trade page
8. User opens Landing Page, sees dark gradient hero section with Live Rates widget displaying buy range in cyan, sell range in purple, pulsing cyan dot, and \"Create Buy Offer\" button with cyan background and glow
9. User opens Marketplace on desktop, sees Live Rates widget in right sidebar with dark glassmorphism styling and cyan border glow
10. User opens Kacha on Android Chrome, sees prominent bottom sheet PWA install prompt with dark background, cyan accent border, and \"Add to Home Screen\" button with cyan background

## 7. Out of Scope for This Release

- Light mode or theme toggle
- Automated KYC verification using third-party services
- Bulk approval/rejection of multiple KYC applications
- KYC expiration and renewal process
- Advanced document verification (OCR, face recognition)
- Email or push notifications for KYC status changes
- KYC audit log and history tracking
- Multi-level KYC tiers (basic, intermediate, advanced)
- Video call verification for high-risk users
- Integration with government identity databases
- KYC analytics dashboard for administrators
- Real-time exchange rate API integration (rates are static in this release)
- Advanced animation libraries for UI effects (CSS-only animations)
- Multi-language support
- Desktop native app builds