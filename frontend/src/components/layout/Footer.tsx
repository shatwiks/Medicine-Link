import React from 'react';
import { Link } from 'react-router-dom';
import { Pill, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-deep-teal text-white/80 border-t border-white/10 pb-20 md:pb-12 pt-14">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-white/10">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal flex items-center justify-center text-white">
                <Pill className="w-5 h-5" />
              </div>
              <span className="font-heading font-extrabold text-xl text-white">
                Medicine<span className="text-mint">Link</span>
              </span>
            </div>
            <p className="text-sm text-white/70 max-w-md leading-relaxed">
              A safe, pharmacist-verified bridge connecting sealed household surplus medicines with registered NGOs and charitable clinics.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-white/10 text-mint text-xs font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>Class Project Prototype (Creativity, Problem Solving & Innovation)</span>
            </div>
          </div>

          <div>
            <h4 className="font-heading font-bold text-white text-sm uppercase tracking-wider mb-3">
              Platform Roles
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/donor/new" className="hover:text-mint transition-colors">
                  Donor — List a Pack
                </Link>
              </li>
              <li>
                <Link to="/donor/donations" className="hover:text-mint transition-colors">
                  Donor — Track Donations
                </Link>
              </li>
              <li>
                <Link to="/pharmacist/review" className="hover:text-mint transition-colors">
                  Pharmacist — Review Queue
                </Link>
              </li>
              <li>
                <Link to="/ngo/dashboard" className="hover:text-mint transition-colors">
                  NGO & Clinic — Needs & Matches
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-bold text-white text-sm uppercase tracking-wider mb-3">
              Governance & Audit
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/admin/dashboard" className="hover:text-mint transition-colors">
                  Impact Dashboard
                </Link>
              </li>
              <li>
                <Link to="/admin/dashboard" className="hover:text-mint transition-colors">
                  Organisation Verification
                </Link>
              </li>
              <li>
                <Link to="/admin/dashboard" className="hover:text-mint transition-colors">
                  Immutable Audit Trail
                </Link>
              </li>
              <li>
                <Link to="/auth" className="hover:text-mint transition-colors">
                  Switch Demo Persona
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/60">
          <p>
            ⚠️ <strong>Prototype for educational purposes. Do not use for real medicines.</strong> Runs strictly on dummy sample data.
          </p>
          <p>© 2026 MedicineLink Academic Prototype · Built with React, Tailwind & Framer Motion</p>
        </div>
      </div>
    </footer>
  );
};
