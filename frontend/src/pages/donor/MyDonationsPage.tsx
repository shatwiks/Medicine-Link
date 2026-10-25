import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  Calendar,
  Eye,
  MapPin,
  PackagePlus,
  Pill,
  QrCode,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { PageTransition } from '../../components/layout/PageTransition';
import { Reveal } from '../../components/motion/Reveal';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { Modal } from '../../components/ui/Modal';
import { Timeline } from '../../components/ui/Timeline';
import { useMockStore } from '../../mock/mockStore';
import { DonationItem } from '../../types';

type FilterType = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

export const MyDonationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, cancelDonationItem } = useMockStore();
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [selectedItem, setSelectedItem] = useState<DonationItem | null>(null);

  const matchesFilter = (item: DonationItem, f: FilterType) => {
    if (f === 'ALL') return true;
    if (f === 'PENDING') return item.status === 'LISTED' || item.status === 'PENDING_REVIEW';
    if (f === 'APPROVED')
      return (
        item.status === 'APPROVED' ||
        item.status === 'MATCHED' ||
        item.status === 'ACCEPTED' ||
        item.status === 'PICKUP_SCHEDULED' ||
        item.status === 'PICKED_UP' ||
        item.status === 'DELIVERED'
      );
    if (f === 'REJECTED')
      return item.status === 'REJECTED' || item.status === 'AUTO_BLOCKED' || item.status === 'CANCELLED';
    if (f === 'COMPLETED') return item.status === 'RECEIVED';
    return true;
  };

  const filteredItems = items.filter((i) => matchesFilter(i, filter));

  return (
    <PageTransition>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10 pb-24">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-teal">
              Donor Portal
            </span>
            <h1 className="text-3xl font-heading font-extrabold text-ink mt-1">
              My Medicine Donations
            </h1>
            <p className="text-sm text-muted mt-0.5">
              Track every pack from OCR listing and pharmacist verification to NGO receipt.
            </p>
          </div>
          <Button
            onClick={() => navigate('/donor/new')}
            icon={<PackagePlus className="w-5 h-5" />}
          >
            Donate Another Pack
          </Button>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 mb-8">
          {(
            [
              { key: 'ALL', label: 'All Packs' },
              { key: 'PENDING', label: 'Pending Review' },
              { key: 'APPROVED', label: 'Approved & Active' },
              { key: 'COMPLETED', label: 'Completed (Received)' },
              { key: 'REJECTED', label: 'Blocked / Rejected' },
            ] as { key: FilterType; label: string }[]
          ).map((tab) => (
            <Chip
              key={tab.key}
              label={tab.label}
              active={filter === tab.key}
              count={items.filter((i) => matchesFilter(i, tab.key)).length}
              onClick={() => setFilter(tab.key)}
            />
          ))}
        </div>

        {/* Empty State */}
        {filteredItems.length === 0 ? (
          <Card className="text-center py-14 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal flex items-center justify-center mx-auto mb-4">
              <Pill className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-heading font-bold text-ink">
              No donations in this filter yet
            </h3>
            <p className="text-sm text-muted mt-1 max-w-sm mx-auto">
              No donations yet. Got a sealed medicine you do not need? Let's put it to good use.
            </p>
            <div className="mt-6">
              <Button
                onClick={() => navigate('/donor/new')}
                icon={<PackagePlus className="w-4 h-4" />}
              >
                List a Medicine Pack
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredItems.map((item, idx) => (
              <Reveal key={item.id} delay={idx * 0.04}>
                <Card hoverLift className="flex flex-col justify-between h-full space-y-5">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal shrink-0">
                          <Pill className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-muted">{item.id}</span>
                            {item.verification_code && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-teal-50 text-teal-700 px-2 py-0.5 rounded">
                                <QrCode className="w-3 h-3" />
                                {item.verification_code}
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-heading font-extrabold text-ink">
                            {item.medicine_name}
                          </h3>
                          <p className="text-xs text-muted">
                            {item.quantity} {item.form}s · Strength {item.strength} · Batch{' '}
                            <strong className="text-ink">{item.batch_no}</strong>
                          </p>
                        </div>
                      </div>
                      <Badge status={item.status} />
                    </div>

                    {/* Mini Timeline */}
                    <div className="mt-5 px-2">
                      <Timeline status={item.status} />
                    </div>

                    {/* Reason if rejected or blocked */}
                    {(item.status === 'AUTO_BLOCKED' || item.status === 'REJECTED') && (
                      <div className="mt-3 p-3 rounded-xl bg-coral-light border border-coral-border text-xs text-coral">
                        <strong>Reason: </strong>
                        {item.reject_note ||
                          item.auto_check_result.find((r) => !r.passed)?.message ||
                          item.reject_reason_code}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-line flex items-center justify-between gap-3 text-xs text-muted">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-teal" />
                        Exp: {item.expiry_date}
                      </span>
                      <span className="hidden sm:flex items-center gap-1 truncate max-w-[190px]">
                        <MapPin className="w-3.5 h-3.5 text-teal shrink-0" />
                        {item.pickup_address}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {(item.status === 'LISTED' || item.status === 'PENDING_REVIEW') && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => cancelDonationItem(item.id)}
                          icon={<XCircle className="w-3.5 h-3.5 text-coral" />}
                          className="!text-coral hover:!bg-coral-light"
                        >
                          Cancel
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedItem(item)}
                        icon={<Eye className="w-3.5 h-3.5" />}
                      >
                        Details
                      </Button>
                    </div>
                  </div>
                </Card>
              </Reveal>
            ))}
          </div>
        )}

        {/* Donation Detail Modal */}
        <Modal
          isOpen={Boolean(selectedItem)}
          onClose={() => setSelectedItem(null)}
          title={selectedItem?.medicine_name || 'Donation Details'}
          subtitle={`Pack ID: ${selectedItem?.id} · Batch: ${selectedItem?.batch_no}`}
        >
          {selectedItem && (
            <div className="space-y-5">
              <div className="flex items-center justify-between bg-surface p-4 rounded-xl border border-line">
                <div>
                  <span className="text-xs text-muted block">Current Lifecycle Status</span>
                  <strong className="text-base font-heading text-ink">
                    {selectedItem.status}
                  </strong>
                </div>
                <Badge status={selectedItem.status} />
              </div>

              <Timeline status={selectedItem.status} />

              {selectedItem.verification_code && (
                <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-teal">
                      <ShieldCheck className="w-4 h-4" />
                      Pharmacist Verified QR Label
                    </span>
                    <p className="font-mono font-bold text-base text-deep-teal">
                      {selectedItem.verification_code}
                    </p>
                    <p className="text-xs text-muted">
                      Verified by {selectedItem.reviewer_name || 'Licensed RPh'}
                    </p>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-line shrink-0">
                    <QRCodeSVG value={selectedItem.verification_code} size={74} />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                  Automated Safety Check Log
                </h4>
                {selectedItem.auto_check_result.map((r, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-surface border border-line text-xs flex items-center justify-between"
                  >
                    <span>
                      <strong>{r.rule}:</strong> {r.message}
                    </span>
                    <span
                      className={`font-bold ${
                        r.passed ? 'text-teal' : 'text-coral'
                      }`}
                    >
                      {r.passed ? 'PASS' : 'FLAG'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Modal>
      </div>
    </PageTransition>
  );
};
