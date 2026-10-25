import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  ClipboardCheck,
  HeartHandshake,
  LayoutDashboard,
  Lock,
  Sparkles,
} from 'lucide-react';
import { PageTransition } from '../components/layout/PageTransition';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { DEMO_USERS } from '../mock/seedData';
import { useMockStore } from '../mock/mockStore';
import { UserRole } from '../types';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, switchRole, pushToast } = useMockStore();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [selectedRole, setSelectedRole] = useState<UserRole>('donor');
  const [email, setEmail] = useState('aarav.donor@demo.medicinelink.org');
  const [password, setPassword] = useState('Demo@1234');
  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [licenseNo, setLicenseNo] = useState('');

  const roleRoutes: Record<UserRole, string> = {
    donor: '/donor/donations',
    pharmacist: '/pharmacist/review',
    ngo: '/ngo/dashboard',
    admin: '/admin/dashboard',
  };

  const handleQuickDemoLogin = (role: UserRole) => {
    switchRole(role);
    navigate(roleRoutes[role]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    switchRole(selectedRole);
    pushToast({
      title: mode === 'login' ? 'Signed in to Demo Account' : 'Demo Registration Complete',
      description:
        selectedRole === 'ngo' || selectedRole === 'pharmacist'
          ? 'Note: New organisations start as unverified until Admin approval.'
          : 'Welcome to MedicineLink prototype.',
      variant: 'success',
    });
    navigate(roleRoutes[selectedRole]);
  };

  return (
    <PageTransition>
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: 1-Click Demo Persona Switcher */}
          <div className="lg:col-span-5 space-y-5">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-teal">
                Instant Demo Access
              </span>
              <h1 className="text-3xl font-heading font-extrabold text-ink mt-1">
                One-Click Persona Sign-In
              </h1>
              <p className="text-sm text-muted mt-1">
                All demo accounts use password <code className="font-mono text-ink font-semibold">Demo@1234</code>. Click any role below to jump straight into its screen.
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  role: 'donor' as UserRole,
                  title: 'Household Donor',
                  user: DEMO_USERS.donor,
                  desc: 'Upload pack photo, run OCR, test 12 eligibility rules, track timeline.',
                  icon: <HeartHandshake className="w-5 h-5 text-teal" />,
                },
                {
                  role: 'pharmacist' as UserRole,
                  title: 'Partner Pharmacist (Verifier)',
                  user: DEMO_USERS.pharmacist,
                  desc: 'Inspect queue, verify OCR vs photo, approve with QR code or reject.',
                  icon: <ClipboardCheck className="w-5 h-5 text-teal" />,
                },
                {
                  role: 'ngo' as UserRole,
                  title: 'Verified NGO / Clinic',
                  user: DEMO_USERS.ngo,
                  desc: 'Post medicine needs, inspect 0–100 score ring breakdown, confirm receipt.',
                  icon: <Building2 className="w-5 h-5 text-teal" />,
                },
                {
                  role: 'admin' as UserRole,
                  title: 'Platform Admin',
                  user: DEMO_USERS.admin,
                  desc: 'View Bento impact charts, verify organisations, inspect audit log & settings.',
                  icon: <LayoutDashboard className="w-5 h-5 text-teal" />,
                },
              ].map((item) => {
                const isCurrent = currentUser.role === item.role;
                return (
                  <Card
                    key={item.role}
                    hoverLift
                    onClick={() => handleQuickDemoLogin(item.role)}
                    className={`p-4 border-2 transition-all ${
                      isCurrent ? 'border-teal bg-teal-50/40' : 'border-line'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-heading font-bold text-ink text-sm">
                            {item.title}
                          </h3>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-pill bg-teal text-white text-[10px] font-bold">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-medium text-deep-teal mt-0.5">{item.user.name}</p>
                        <p className="text-xs text-muted mt-1">{item.desc}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Right: Standard Login / Sign-Up Form */}
          <div className="lg:col-span-7">
            <Card className="p-6 sm:p-8">
              <div className="flex items-center gap-2 border-b border-line pb-4 mb-6">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`px-4 py-2 rounded-pill text-sm font-heading font-bold transition-colors ${
                    mode === 'login' ? 'bg-deep-teal text-white' : 'text-muted hover:text-ink'
                  }`}
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className={`px-4 py-2 rounded-pill text-sm font-heading font-bold transition-colors ${
                    mode === 'register' ? 'bg-deep-teal text-white' : 'text-muted hover:text-ink'
                  }`}
                >
                  Create Account
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">
                    Select Role
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['donor', 'pharmacist', 'ngo', 'admin'] as UserRole[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          setSelectedRole(r);
                          setEmail(DEMO_USERS[r].email);
                        }}
                        className={`py-2.5 px-3 rounded-input text-xs font-heading font-bold uppercase border transition-all ${
                          selectedRole === r
                            ? 'bg-teal text-white border-teal shadow-sm'
                            : 'bg-surface text-muted border-line hover:text-ink'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {mode === 'register' && (
                  <Input
                    label="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                )}

                <Input
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                <Input
                  label="Password (minimum 8 characters)"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                {mode === 'register' && (selectedRole === 'ngo' || selectedRole === 'pharmacist') && (
                  <div className="p-4 rounded-xl bg-surface border border-line space-y-3">
                    <p className="text-xs font-semibold text-deep-teal flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-teal" />
                      Organisation Details (Requires Admin Verification before acting)
                    </p>
                    <Input
                      label="Organisation / Pharmacy Name"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      required
                    />
                    <Input
                      label="Registration / Drug License Number"
                      value={licenseNo}
                      onChange={(e) => setLicenseNo(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className="pt-2">
                  <Button
                    type="submit"
                    fullWidth
                    size="lg"
                    icon={<Lock className="w-4 h-4" />}
                  >
                    {mode === 'login'
                      ? `Continue as ${selectedRole.toUpperCase()}`
                      : 'Register Demo Account'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};
