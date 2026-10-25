import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Building2,
  ClipboardCheck,
  HeartHandshake,
  LayoutDashboard,
  Menu,
  Pill,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import { useMockStore } from '../../mock/mockStore';
import { UserRole } from '../../types';

const ROLE_CONFIG: { role: UserRole; label: string; defaultPath: string; icon: React.ReactNode }[] = [
  { role: 'donor', label: 'Donor', defaultPath: '/donor/donations', icon: <HeartHandshake className="w-3.5 h-3.5" /> },
  { role: 'pharmacist', label: 'Pharmacist', defaultPath: '/pharmacist/review', icon: <ClipboardCheck className="w-3.5 h-3.5" /> },
  { role: 'ngo', label: 'NGO', defaultPath: '/ngo/dashboard', icon: <Building2 className="w-3.5 h-3.5" /> },
  { role: 'admin', label: 'Admin', defaultPath: '/admin/dashboard', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
];

export const Navbar: React.FC = () => {
  const { currentUser, switchRole, items, notifications, markAllNotificationsRead } = useMockStore();
  const location = useLocation();
  const navigate = useNavigate();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const pendingReviewCount = items.filter((i) => i.status === 'PENDING_REVIEW').length;
  const unreadNotifs = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    let lastY = window.scrollY;
    const handleScroll = () => {
      const currentY = window.scrollY;
      setIsScrolled(currentY > 40);
      if (currentY > 140 && currentY > lastY + 8) {
        setIsHidden(true);
      } else if (currentY < lastY - 8 || currentY <= 40) {
        setIsHidden(false);
      }
      lastY = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleRoleSwitch = (role: UserRole, path: string) => {
    switchRole(role);
    navigate(path);
    setMobileMenuOpen(false);
  };

  const navLinks = [
    { to: '/', label: 'Home', badge: null },
    { to: '/donor/new', label: 'Donate Pack', badge: null },
    { to: '/donor/donations', label: 'My Donations', badge: null },
    { to: '/pharmacist/review', label: 'RPh Review', badge: pendingReviewCount || null },
    { to: '/ngo/dashboard', label: 'NGO Hub', badge: null },
    { to: '/admin/dashboard', label: 'Impact & Admin', badge: null },
  ];

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        isHidden ? '-translate-y-full' : 'translate-y-0'
      } ${
        isScrolled
          ? 'glass-nav border-b border-line py-2.5 shadow-soft'
          : 'bg-white/95 backdrop-blur-md border-b border-line py-3'
      }`}
    >
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 flex items-center justify-between gap-3">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-10 h-10 rounded-xl bg-deep-teal flex items-center justify-center text-mint shadow-soft group-hover:scale-105 transition-transform">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <span className="font-heading font-extrabold text-lg text-ink tracking-tight block leading-none">
              Medicine<span className="text-teal">Link</span>
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">
              Verified Care Network
            </span>
          </div>
        </Link>

        {/* Main Navigation Links (Desktop) */}
        <nav aria-label="Main navigation" className="hidden xl:flex items-center gap-1">
          {navLinks.map((link) => {
            const active =
              link.to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-2 rounded-pill text-sm whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  active
                    ? 'bg-deep-teal text-white font-semibold shadow-sm'
                    : 'text-ink/80 font-medium hover:text-deep-teal hover:bg-teal-50'
                }`}
              >
                <span>{link.label}</span>
                {link.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber text-ink leading-none">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Controls: Demo Role Switcher + Notifications + Auth */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Demo Persona Switcher */}
          <div
            className="hidden md:flex items-center bg-surface border border-line rounded-pill p-1"
            role="group"
            aria-label="Demo persona switcher"
          >
            {ROLE_CONFIG.map((rc) => {
              const active = currentUser.role === rc.role;
              return (
                <button
                  key={rc.role}
                  type="button"
                  onClick={() => handleRoleSwitch(rc.role, rc.defaultPath)}
                  title={`Switch demo persona to ${rc.label}`}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-xs font-semibold whitespace-nowrap transition-all ${
                    active
                      ? 'bg-teal text-white shadow-sm'
                      : 'text-ink/75 hover:text-ink'
                  }`}
                >
                  {rc.icon}
                  <span>{rc.label}</span>
                </button>
              );
            })}
          </div>

          {/* Notification Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setNotifOpen(!notifOpen);
                if (!notifOpen) markAllNotificationsRead();
              }}
              aria-label="Open notifications"
              className="relative w-10 h-10 rounded-full bg-white border border-line flex items-center justify-center text-ink hover:border-teal transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifs > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-coral ring-2 ring-white" />
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-card bg-white border border-line shadow-lift p-4 z-50">
                <div className="flex items-center justify-between pb-2.5 border-b border-line">
                  <span className="font-heading font-bold text-sm text-ink">
                    Activity Notifications
                  </span>
                  <button
                    type="button"
                    onClick={() => setNotifOpen(false)}
                    className="text-xs text-teal font-semibold"
                  >
                    Close
                  </button>
                </div>
                <div className="divide-y divide-line max-h-64 overflow-y-auto mt-2">
                  {notifications.map((n) => (
                    <div key={n.id} className="py-2.5">
                      <p className="text-xs font-heading font-bold text-ink">{n.title}</p>
                      <p className="text-xs text-muted mt-0.5">{n.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Login / Account Pill */}
          <Link
            to="/auth"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-pill bg-teal-50 text-deep-teal border border-teal-200 text-xs font-bold hover:bg-teal-100 transition-colors whitespace-nowrap"
          >
            <UserCheck className="w-3.5 h-3.5 text-teal" />
            <span>{currentUser.name.split(' ')[0]}</span>
          </Link>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="xl:hidden w-10 h-10 rounded-full bg-white border border-line flex items-center justify-center text-ink"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Slide-Down Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-white border-b border-line px-4 pt-3 pb-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {ROLE_CONFIG.map((rc) => (
              <button
                key={rc.role}
                type="button"
                onClick={() => handleRoleSwitch(rc.role, rc.defaultPath)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-input text-xs font-semibold border ${
                  currentUser.role === rc.role
                    ? 'bg-deep-teal text-white border-deep-teal'
                    : 'bg-surface text-ink border-line'
                }`}
              >
                {rc.icon}
                <span>Demo: {rc.label}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-input text-sm font-semibold text-ink hover:bg-surface flex items-center justify-between"
              >
                <span>{link.label}</span>
                {link.badge && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-amber text-ink">
                    {link.badge}
                  </span>
                )}
              </Link>
            ))}
            <Link
              to="/auth"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-input text-sm font-semibold text-teal hover:bg-surface flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Account & Role Sign-In</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
