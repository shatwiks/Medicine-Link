import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { DisclaimerBanner } from './components/layout/DisclaimerBanner';
import { Footer } from './components/layout/Footer';
import { MobileTabBar } from './components/layout/MobileTabBar';
import { Navbar } from './components/layout/Navbar';
import { ScrollProgress } from './components/layout/ScrollProgress';
import { SmoothScroll } from './components/motion/SmoothScroll';
import { Skeleton } from './components/ui/Skeleton';
import { ToastContainer } from './components/ui/Toast';
import { MockStoreProvider } from './mock/mockStore';
import { LandingPage } from './pages/LandingPage';

const AuthPage = lazy(() =>
  import('./pages/AuthPage').then((m) => ({ default: m.AuthPage }))
);
const NewDonationPage = lazy(() =>
  import('./pages/donor/NewDonationPage').then((m) => ({ default: m.NewDonationPage }))
);
const MyDonationsPage = lazy(() =>
  import('./pages/donor/MyDonationsPage').then((m) => ({ default: m.MyDonationsPage }))
);
const ReviewQueuePage = lazy(() =>
  import('./pages/pharmacist/ReviewQueuePage').then((m) => ({ default: m.ReviewQueuePage }))
);
const NgoDashboardPage = lazy(() =>
  import('./pages/ngo/NgoDashboardPage').then((m) => ({ default: m.NgoDashboardPage }))
);
const AdminDashboardPage = lazy(() =>
  import('./pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage }))
);

const RouteFallback: React.FC = () => (
  <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 space-y-4">
    <Skeleton className="h-10 w-64" />
    <Skeleton className="h-48 w-full rounded-card" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Skeleton className="h-56 w-full rounded-card" />
      <Skeleton className="h-56 w-full rounded-card" />
    </div>
  </div>
);

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);
  return null;
};

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<RouteFallback />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/donor/new" element={<NewDonationPage />} />
          <Route path="/donor/donations" element={<MyDonationsPage />} />
          <Route path="/pharmacist/review" element={<ReviewQueuePage />} />
          <Route path="/ngo/dashboard" element={<NgoDashboardPage />} />
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
};

export const App: React.FC = () => {
  return (
    <MockStoreProvider>
      <BrowserRouter>
        <SmoothScroll>
          <ScrollToTop />
          <ScrollProgress />
          <div className="min-h-screen flex flex-col bg-surface text-ink">
            <DisclaimerBanner />
            <Navbar />
            <ToastContainer />
            <main className="flex-1">
              <AnimatedRoutes />
            </main>
            <Footer />
            <MobileTabBar />
          </div>
        </SmoothScroll>
      </BrowserRouter>
    </MockStoreProvider>
  );
};

export default App;
