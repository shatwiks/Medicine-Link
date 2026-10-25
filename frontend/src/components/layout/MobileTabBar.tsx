import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Building2, ClipboardCheck, LayoutDashboard, PackagePlus } from 'lucide-react';

export const MobileTabBar: React.FC = () => {
  const location = useLocation();

  const tabs = [
    { to: '/donor/new', label: 'Donate', icon: <PackagePlus className="w-5 h-5" /> },
    { to: '/pharmacist/review', label: 'RPh Check', icon: <ClipboardCheck className="w-5 h-5" /> },
    { to: '/ngo/dashboard', label: 'NGO Hub', icon: <Building2 className="w-5 h-5" /> },
    { to: '/admin/dashboard', label: 'Impact', icon: <LayoutDashboard className="w-5 h-5" /> },
  ];

  return (
    <nav
      aria-label="Mobile quick navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-nav border-t border-line px-2 py-1.5 flex items-center justify-around shadow-lift"
    >
      {tabs.map((tab) => {
        const active = location.pathname.startsWith(tab.to);
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={`flex flex-col items-center justify-center min-w-[68px] min-h-[44px] rounded-xl px-2 py-1 text-[11px] font-semibold transition-colors ${
              active ? 'text-teal bg-teal-50' : 'text-muted hover:text-ink'
            }`}
          >
            {tab.icon}
            <span className="mt-0.5">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
