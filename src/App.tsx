import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TransactionProvider } from './context/TransactionContext';
import { Header } from './components/common/Header';
import { TopNav } from './components/common/TopNav';
import { BottomNav } from './components/common/BottomNav';

import { Home } from './components/pages/Home';
import { PayHub } from './components/pages/PayHub';
import { Activity } from './components/pages/Activity';
import { TransactionDetail } from './components/pages/TransactionDetail';
import { SafetyCenter } from './components/pages/SafetyCenter';
import { Contacts } from './components/pages/Contacts';
import { Profile } from './components/pages/Profile';
import { SentinelIntelligence } from './components/pages/SentinelIntelligence';
import { QRScannerModal } from './components/pay/QRScannerModal';
import { PushNotificationToast } from './components/common/PushNotificationToast';

import { LoginPage } from './components/auth/LoginPage';
import { SignupPage } from './components/auth/SignupPage';
import { VerifyOtpPage } from './components/auth/VerifyOtpPage';
import { ForgotPasswordPage } from './components/auth/ForgotPasswordPage';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { StartupLoader } from './components/common/StartupLoader';
import { Shield } from 'lucide-react';

function MainApp() {
  const { user, loading, isAuthenticated, onboardingCompleted } = useAuth();
  const [currentRoute, setCurrentRoute] = useState<string>('/');
  const [isQRModalOpen, setIsQRModalOpen] = useState<boolean>(false);
  const [prefilledPhone, setPrefilledPhone] = useState<string>('');

  const handleNavigate = (route: string) => {
    if (route.startsWith('/pay?phone=')) {
      try {
        const url = new URL(`https://sentinelfin.local${route}`);
        const phone = url.searchParams.get('phone');
        if (phone) {
          setPrefilledPhone(phone);
        }
      } catch (e) {
        // Param parsing
      }
      setCurrentRoute('/pay');
    } else {
      setCurrentRoute(route);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQRScanSelect = (qrData: { name: string; phone: string; amount?: number }) => {
    setPrefilledPhone(qrData.phone);
    setCurrentRoute('/pay');
  };

  if (loading) {
    return <StartupLoader statusText="Restoring encrypted session & threat engine..." />;
  }

  // 1. Unauthenticated Users Routing
  if (!isAuthenticated) {
    if (currentRoute === '/signup') {
      return <SignupPage onNavigate={handleNavigate} />;
    }
    if (currentRoute.startsWith('/verify')) {
      let target = '';
      let channel: 'email' | 'phone' = 'phone';
      if (currentRoute.includes('target=')) {
        try {
          const url = new URL(`https://sentinelfin.local${currentRoute}`);
          target = url.searchParams.get('target') || '';
          channel = (url.searchParams.get('channel') as any) || 'phone';
        } catch (e) {
          // Param
        }
      }
      return <VerifyOtpPage onNavigate={handleNavigate} target={target} channel={channel} />;
    }
    if (currentRoute === '/forgot-password') {
      return <ForgotPasswordPage onNavigate={handleNavigate} />;
    }
    return <LoginPage onNavigate={handleNavigate} />;
  }

  // 2. Authenticated but Onboarding Incomplete Routing
  if (!onboardingCompleted || currentRoute === '/onboarding') {
    return (
      <div className="min-h-screen bg-[#F5F1E8] text-black font-sans py-6">
        <OnboardingWizard onNavigate={handleNavigate} />
      </div>
    );
  }

  // 3. Fully Authenticated Main App Pages
  const renderContent = () => {
    if (currentRoute === '/') {
      return (
        <Home
          onNavigate={handleNavigate}
          onOpenQR={() => setIsQRModalOpen(true)}
        />
      );
    }

    if (currentRoute === '/pay') {
      return (
        <PayHub
          onNavigate={handleNavigate}
          onOpenQR={() => setIsQRModalOpen(true)}
          prefilledPhone={prefilledPhone}
        />
      );
    }

    if (currentRoute === '/activity') {
      return <Activity onNavigate={handleNavigate} />;
    }

    if (currentRoute.startsWith('/activity/')) {
      const id = currentRoute.replace('/activity/', '');
      return <TransactionDetail transactionId={id} onNavigate={handleNavigate} />;
    }

    if (currentRoute === '/safety') {
      return <SafetyCenter onNavigate={handleNavigate} />;
    }

    if (currentRoute === '/contacts') {
      return <Contacts onNavigate={handleNavigate} />;
    }

    if (currentRoute === '/profile') {
      return <Profile onNavigate={handleNavigate} />;
    }

    if (
      currentRoute === '/insights' ||
      currentRoute === '/admin' ||
      currentRoute === '/analytics' ||
      currentRoute === '/ai-insights' ||
      currentRoute === '/ml-dashboard' ||
      currentRoute === '/model-insights' ||
      currentRoute === '/risk-intelligence' ||
      currentRoute.startsWith('/insights?')
    ) {
      let txId: string | undefined = undefined;
      if (currentRoute.includes('transaction=')) {
        txId = currentRoute.split('transaction=')[1];
      }
      return <SentinelIntelligence initialTransactionId={txId} onNavigate={handleNavigate} />;
    }

    return (
      <Home
        onNavigate={handleNavigate}
        onOpenQR={() => setIsQRModalOpen(true)}
      />
    );
  };

  return (
    <div className="min-h-screen bg-[#F5F1E8] text-black font-sans flex flex-col pb-20 md:pb-12">
      <Header onNavigate={handleNavigate} currentRoute={currentRoute} />
      <TopNav currentRoute={currentRoute} onNavigate={handleNavigate} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderContent()}
      </main>

      <BottomNav currentRoute={currentRoute} onNavigate={handleNavigate} />

      <PushNotificationToast />

      <QRScannerModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        onSelectQR={handleQRScanSelect}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TransactionProvider>
        <MainApp />
      </TransactionProvider>
    </AuthProvider>
  );
}
