import LandingPage from '@/pages/LandingPage';
import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Marketplace from '@/pages/Marketplace';
import CreateOffer from '@/pages/CreateOffer';
import ActiveTrade from '@/pages/ActiveTrade';
import KYCVerification from '@/pages/KYCVerification';
import MerchantApplication from '@/pages/MerchantApplication';
import Profile from '@/pages/Profile';
import AdminDashboard from '@/pages/AdminDashboard';
import Settings from '@/pages/Settings';
import TermsOfService from '@/pages/TermsOfService';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import type { ReactNode } from 'react';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  public?: boolean;
}

export const routes: RouteConfig[] = [
  { name: 'Landing', path: '/', element: <LandingPage />, public: true },
  { name: 'Login', path: '/login', element: <Login />, public: true },
  { name: 'Register', path: '/register', element: <Register />, public: true },
  { name: 'Dashboard', path: '/dashboard', element: <Dashboard /> },
  { name: 'Marketplace', path: '/marketplace', element: <Marketplace /> },
  { name: 'Create Offer', path: '/marketplace/create', element: <CreateOffer /> },
  { name: 'Active Trade', path: '/marketplace/trade/:id', element: <ActiveTrade /> },
  { name: 'KYC Verification', path: '/kyc', element: <KYCVerification /> },
  { name: 'Merchant Application', path: '/merchant-application', element: <MerchantApplication /> },
  { name: 'Profile', path: '/profile', element: <Profile /> },
  { name: 'Settings', path: '/settings', element: <Settings /> },
  { name: 'Admin Dashboard', path: '/admin', element: <AdminDashboard /> },
  { name: 'Terms of Service', path: '/terms', element: <TermsOfService />, public: true },
  { name: 'Privacy Policy', path: '/privacy', element: <PrivacyPolicy />, public: true },
];
