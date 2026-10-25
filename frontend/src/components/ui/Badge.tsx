import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Link2,
  PackageCheck,
  ShieldAlert,
  Sparkles,
  Truck,
  XCircle,
} from 'lucide-react';
import { ItemStatus } from '../../types';

interface BadgeProps {
  status: ItemStatus | string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, className = '' }) => {
  const normalized = status.toUpperCase();

  const config: Record<
    string,
    { label: string; classes: string; icon: React.ReactNode }
  > = {
    LISTED: {
      label: 'Listed',
      classes: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    PENDING_REVIEW: {
      label: 'Pending Review',
      classes: 'bg-amber-light text-[#9A6700] border-amber-border',
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    APPROVED: {
      label: 'Verified by RPh',
      classes: 'bg-teal-50 text-teal-700 border-teal-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
    REJECTED: {
      label: 'Rejected',
      classes: 'bg-coral-light text-coral border-coral-border',
      icon: <XCircle className="w-3.5 h-3.5" />,
    },
    AUTO_BLOCKED: {
      label: 'Safety Blocked',
      classes: 'bg-coral-light text-coral border-coral-border',
      icon: <ShieldAlert className="w-3.5 h-3.5" />,
    },
    MATCHED: {
      label: 'Matched to NGO',
      classes: 'bg-cyan-50 text-cyan-800 border-cyan-200',
      icon: <Sparkles className="w-3.5 h-3.5" />,
    },
    ACCEPTED: {
      label: 'NGO Accepted',
      classes: 'bg-teal-100 text-deep-teal border-teal-300',
      icon: <Link2 className="w-3.5 h-3.5" />,
    },
    PICKUP_SCHEDULED: {
      label: 'Pickup Scheduled',
      classes: 'bg-mint/25 text-deep-teal border-mint',
      icon: <Truck className="w-3.5 h-3.5" />,
    },
    PICKED_UP: {
      label: 'In Transit',
      classes: 'bg-mint/30 text-deep-teal border-mint',
      icon: <Truck className="w-3.5 h-3.5" />,
    },
    DELIVERED: {
      label: 'Delivered',
      classes: 'bg-teal-100 text-deep-teal border-teal-300',
      icon: <PackageCheck className="w-3.5 h-3.5" />,
    },
    RECEIVED: {
      label: 'Received ✓',
      classes: 'bg-deep-teal text-white border-deep-teal',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-mint" />,
    },
    EXPIRED: {
      label: 'Expired',
      classes: 'bg-slate-100 text-slate-500 border-slate-300 line-through',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
    },
    CANCELLED: {
      label: 'Cancelled',
      classes: 'bg-slate-100 text-slate-500 border-slate-200',
      icon: <XCircle className="w-3.5 h-3.5" />,
    },
  };

  const item = config[normalized] || {
    label: status,
    classes: 'bg-teal-50 text-teal-700 border-teal-200',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-xs font-semibold border ${item.classes} ${className}`}
    >
      {item.icon}
      <span>{item.label}</span>
    </span>
  );
};
