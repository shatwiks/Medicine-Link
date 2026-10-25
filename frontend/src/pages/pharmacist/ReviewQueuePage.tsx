import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Keyboard,
  QrCode,
  ShieldAlert,
  Sparkles,
  XCircle,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { PageTransition } from '../../components/layout/PageTransition';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { Modal } from '../../components/ui/Modal';
import { useMockStore } from '../../mock/mockStore';
import { DonationItem, RejectReasonCode } from '../../types';

const REJECT_REASON_CODES: { code: RejectReasonCode; label: string }[] = [
  { code: 'EXPIRY_UNREADABLE', label: 'Expiry date unreadable or blurred' },
  { code: 'BATCH_UNREADABLE', label: 'Batch number unreadable or missing' },
  { code: 'DAMAGED_PACK', label: 'Damaged, crushed, or creased packaging' },
  { code: 'OPENED_PACK', label: 'Opened pack or cut blister strip' },
  { code: 'NOT_ALLOWED_TYPE', label: 'Restricted / cold-chain / injectable form' },
  { code: 'SUSPECTED_TAMPERING', label: 'Suspected seal tampering' },
  { code: 'SHORT_SHELF_LIFE', label: 'Remaining shelf life too short' },
  { code: 'OTHER', label: 'Other clinical safety concern' },
];

export const ReviewQueuePage: React.FC = () => {
  const { items, reviewItemDecision } = useMockStore();

  const [tab, setTab] = useState<'queue' | 'history'>('queue');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [photoSlide, setPhotoSlide] = useState<'front' | 'back'>('front');
  const [isZoomed, setIsZoomed] = useState(false);

  // Reject Modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState<RejectReasonCode>('DAMAGED_PACK');
  const [rejectNote, setRejectNote] = useState('');

  // Approved QR Moment Modal state
  const [approvedItemModal, setApprovedItemModal] = useState<DonationItem | null>(null);

  // Queue oldest first
  const queueItems = items
    .filter((i) => i.status === 'PENDING_REVIEW')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const historyItems = items.filter(
    (i) => i.status !== 'PENDING_REVIEW' && i.status !== 'LISTED' && i.reviewer_id
  );

  const activeItem = queueItems[selectedIndex] || queueItems[0] || null;

  const handleApprove = () => {
    if (!activeItem) return;
    const updated = reviewItemDecision(activeItem.id, 'approve');
    if (updated) {
      setApprovedItemModal(updated);
      setSelectedIndex(0);
    }
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem) return;
    reviewItemDecision(activeItem.id, 'reject', rejectReason, rejectNote);
    setRejectModalOpen(false);
    setRejectNote('');
    setSelectedIndex(0);
  };

  // Keyboard shortcuts: A to approve, R to reject, Left/Right arrows for next item
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || rejectModalOpen) return;
      if (tab !== 'queue' || !activeItem) return;

      if (e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleApprove();
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        setRejectModalOpen(true);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, queueItems.length));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev - 1 < 0 ? Math.max(0, queueItems.length - 1) : prev - 1
        );
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <PageTransition>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10 pb-24">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-teal">
              Licensed Pharmacist Workspace · GreenCross Pharmacy
            </span>
            <h1 className="text-3xl font-heading font-extrabold text-ink mt-1">
              Pharmacist Verification Queue
            </h1>
            <p className="text-sm text-muted mt-0.5">
              Oldest submissions appear first. Inspect pack integrity, OCR fields, and automated safety flags.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Chip
              label="Pending Queue"
              count={queueItems.length}
              active={tab === 'queue'}
              onClick={() => setTab('queue')}
            />
            <Chip
              label="Past Decisions"
              count={historyItems.length}
              active={tab === 'history'}
              onClick={() => setTab('history')}
            />
          </div>
        </div>

        {/* Keyboard Shortcut Bar */}
        {tab === 'queue' && queueItems.length > 0 && (
          <div className="mb-6 px-4 py-2.5 rounded-input bg-white border border-line flex flex-wrap items-center justify-between gap-2 text-xs text-muted shadow-sm">
            <span className="flex items-center gap-2 font-medium text-ink">
              <Keyboard className="w-4 h-4 text-teal" />
              Fast Clinical Review Shortcuts:
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <span>
                <kbd className="px-2 py-0.5 bg-surface border border-line rounded font-mono font-bold text-ink">
                  A
                </kbd>{' '}
                Approve & Issue QR
              </span>
              <span>
                <kbd className="px-2 py-0.5 bg-surface border border-line rounded font-mono font-bold text-ink">
                  R
                </kbd>{' '}
                Reject with Reason
              </span>
              <span>
                <kbd className="px-2 py-0.5 bg-surface border border-line rounded font-mono font-bold text-ink">
                  ←
                </kbd>{' '}
                <kbd className="px-2 py-0.5 bg-surface border border-line rounded font-mono font-bold text-ink">
                  →
                </kbd>{' '}
                Switch Item
              </span>
            </div>
          </div>
        )}

        {tab === 'queue' ? (
          queueItems.length === 0 ? (
            <Card className="text-center py-16 max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-heading font-bold text-ink">
                All Pending Packs Reviewed!
              </h2>
              <p className="text-sm text-muted mt-1">
                The verification queue is clear. Check Past Decisions to see your approved QR codes.
              </p>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Horizontal Queue Selector Strip */}
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {queueItems.map((qItem, idx) => {
                  const isSelected = activeItem?.id === qItem.id;
                  const lowOcr = (qItem.ocr_confidence ?? 1) < 0.6;
                  return (
                    <button
                      key={qItem.id}
                      type="button"
                      onClick={() => setSelectedIndex(idx)}
                      className={`shrink-0 p-3.5 rounded-card border text-left transition-all min-w-[230px] ${
                        isSelected
                          ? 'bg-deep-teal text-white border-deep-teal shadow-soft'
                          : 'bg-white text-ink border-line hover:border-teal'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-mono opacity-75">
                          #{idx + 1} · {qItem.id}
                        </span>
                        {lowOcr && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill bg-amber text-ink text-[10px] font-bold">
                            <AlertTriangle className="w-3 h-3" />
                            Low OCR
                          </span>
                        )}
                      </div>
                      <p className="font-heading font-bold text-sm mt-1 truncate">
                        {qItem.medicine_name}
                      </p>
                      <p className="text-xs opacity-75 mt-0.5">
                        Exp: {qItem.expiry_date} · Qty: {qItem.quantity}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Split-Screen Review Layout */}
              {activeItem && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* LEFT: Zoomable Pack Photo Slider */}
                  <div className="lg:col-span-6 space-y-4">
                    <Card className="p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPhotoSlide('front')}
                            className={`px-3 py-1.5 rounded-pill text-xs font-bold transition-colors ${
                              photoSlide === 'front'
                                ? 'bg-deep-teal text-white'
                                : 'bg-surface text-muted hover:text-ink'
                            }`}
                          >
                            Slide 1: Front Blister Pack
                          </button>
                          <button
                            type="button"
                            onClick={() => setPhotoSlide('back')}
                            className={`px-3 py-1.5 rounded-pill text-xs font-bold transition-colors ${
                              photoSlide === 'back'
                                ? 'bg-deep-teal text-white'
                                : 'bg-surface text-muted hover:text-ink'
                            }`}
                          >
                            Slide 2: Foil Stamp (B.No / EXP)
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsZoomed(!isZoomed)}
                          aria-label={isZoomed ? 'Zoom out pack photo' : 'Zoom in pack photo'}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-surface border border-line text-xs font-semibold text-ink hover:border-teal"
                        >
                          {isZoomed ? (
                            <>
                              <ZoomOut className="w-3.5 h-3.5 text-teal" />
                              Reset
                            </>
                          ) : (
                            <>
                              <ZoomIn className="w-3.5 h-3.5 text-teal" />
                              Inspect 1.35x
                            </>
                          )}
                        </button>
                      </div>

                      {/* Simulated High-Contrast Pack Inspection Viewport */}
                      <div
                        onClick={() => setIsZoomed(!isZoomed)}
                        className="cursor-zoom-in rounded-card bg-deep-teal p-6 overflow-hidden border border-line flex items-center justify-center min-h-[300px]"
                      >
                        <motion.div
                          animate={{ scale: isZoomed ? 1.32 : 1 }}
                          transition={{ type: 'spring', stiffness: 220, damping: 22 }}
                          className="w-full max-w-md rounded-xl bg-white p-5 text-ink shadow-lift border-2 border-teal/40"
                        >
                          {photoSlide === 'front' ? (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between border-b border-line pb-3">
                                <div>
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-teal">
                                    Factory Sealed Blister Strip
                                  </span>
                                  <h3 className="text-lg font-heading font-extrabold text-ink">
                                    {activeItem.medicine_name}
                                  </h3>
                                  <p className="text-xs text-muted">
                                    Generic: {activeItem.generic_name.toUpperCase()} · {activeItem.strength}
                                  </p>
                                </div>
                                {activeItem.is_rx_only && (
                                  <span className="px-2 py-1 rounded border border-coral text-coral text-[10px] font-bold uppercase">
                                    Rx Schedule H
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-5 gap-2 py-2">
                                {Array.from({ length: 10 }).map((_, i) => (
                                  <div
                                    key={i}
                                    className="h-9 rounded-full bg-gradient-to-b from-teal-50 to-teal-200 border border-teal-400 flex items-center justify-center text-[9px] font-bold text-deep-teal"
                                  >
                                    {activeItem.strength}
                                  </div>
                                ))}
                              </div>

                              <div className="text-[11px] text-muted flex justify-between pt-2 border-t border-line">
                                <span>Seal Status: Unbroken Aluminum Foil</span>
                                <span>Qty: {activeItem.quantity} units</span>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4 font-mono">
                              <div className="text-xs text-muted border-b border-line pb-2">
                                BACK FOIL STAMP EMBOSSING (MACRO VIEW)
                              </div>
                              <div className="p-3 rounded-lg bg-teal-50 border-2 border-dashed border-teal">
                                <span className="text-[10px] text-muted block">
                                  DETECTED BATCH NO:
                                </span>
                                <strong className="text-base text-deep-teal">
                                  B.No. {activeItem.batch_no}
                                </strong>
                              </div>
                              <div className="p-3 rounded-lg bg-teal-50 border-2 border-dashed border-teal">
                                <span className="text-[10px] text-muted block">
                                  DETECTED EXPIRY DATE:
                                </span>
                                <strong className="text-base text-deep-teal">
                                  EXP {activeItem.expiry_date}
                                </strong>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      </div>

                      {/* Raw OCR Text Box */}
                      <div className="p-3.5 rounded-input bg-surface border border-line font-mono text-xs">
                        <div className="flex items-center justify-between text-muted mb-1">
                          <span>TESSERACT RAW OCR TRANSCRIPT</span>
                          <span
                            className={`font-sans font-bold ${
                              (activeItem.ocr_confidence ?? 1) < 0.6
                                ? 'text-coral'
                                : 'text-teal'
                            }`}
                          >
                            Confidence: {Math.round((activeItem.ocr_confidence ?? 0.92) * 100)}%
                          </span>
                        </div>
                        <p className="text-ink break-words">{activeItem.ocr_text}</p>
                      </div>
                    </Card>
                  </div>

                  {/* RIGHT: Details, Auto-Check Rows & Decision Controls */}
                  <div className="lg:col-span-6 space-y-5">
                    <Card className="space-y-5">
                      <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
                        <div>
                          <span className="text-xs font-mono text-muted">
                            Donor: {activeItem.donor_name} · Listed{' '}
                            {new Date(activeItem.created_at).toLocaleDateString()}
                          </span>
                          <h2 className="text-2xl font-heading font-extrabold text-ink mt-0.5">
                            {activeItem.medicine_name}
                          </h2>
                        </div>
                        <Badge status={activeItem.status} />
                      </div>

                      {/* Key Structured Fields */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        <div className="p-3 rounded-input bg-surface border border-line">
                          <span className="text-muted block">Generic Name</span>
                          <strong className="text-ink text-sm capitalize">
                            {activeItem.generic_name}
                          </strong>
                        </div>
                        <div className="p-3 rounded-input bg-surface border border-line">
                          <span className="text-muted block">Strength & Form</span>
                          <strong className="text-ink text-sm">
                            {activeItem.strength} · {activeItem.form}
                          </strong>
                        </div>
                        <div className="p-3 rounded-input bg-surface border border-line">
                          <span className="text-muted block">Quantity</span>
                          <strong className="text-ink text-sm">
                            {activeItem.quantity} units
                          </strong>
                        </div>
                        <div className="p-3 rounded-input bg-surface border border-line">
                          <span className="text-muted block">Batch No.</span>
                          <strong className="text-ink text-sm font-mono">
                            {activeItem.batch_no}
                          </strong>
                        </div>
                        <div className="p-3 rounded-input bg-surface border border-line">
                          <span className="text-muted block">Expiry Date</span>
                          <strong className="text-teal text-sm font-mono">
                            {activeItem.expiry_date}
                          </strong>
                        </div>
                        <div className="p-3 rounded-input bg-surface border border-line">
                          <span className="text-muted block">Est. Value</span>
                          <strong className="text-ink text-sm">₹{activeItem.est_value}</strong>
                        </div>
                      </div>

                      {/* Automated Check Results (Green or Red/Amber rows) */}
                      <div className="space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                          Automated Eligibility & Safety Flags
                        </h3>
                        {activeItem.auto_check_result.map((check, i) => (
                          <div
                            key={i}
                            className={`p-3 rounded-input border text-xs flex items-start gap-2.5 ${
                              check.passed
                                ? 'bg-teal-50/50 border-teal-200 text-ink'
                                : check.severity === 'hard'
                                ? 'bg-coral-light border-coral-border text-coral'
                                : 'bg-amber-light border-amber-border text-[#9A6700]'
                            }`}
                          >
                            {check.passed ? (
                              <CheckCircle2 className="w-4 h-4 text-teal shrink-0 mt-0.5" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-amber shrink-0 mt-0.5" />
                            )}
                            <div>
                              <strong className="font-mono">{check.rule}: </strong>
                              <span>{check.message}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Approve / Reject Decision Buttons */}
                      <div className="pt-4 border-t border-line flex flex-col sm:flex-row items-center gap-3">
                        <Button
                          fullWidth
                          size="lg"
                          onClick={handleApprove}
                          icon={<CheckCircle2 className="w-5 h-5" />}
                        >
                          Approve & Generate QR (A)
                        </Button>
                        <Button
                          fullWidth
                          size="lg"
                          variant="danger"
                          onClick={() => setRejectModalOpen(true)}
                          icon={<XCircle className="w-5 h-5" />}
                        >
                          Reject Pack (R)
                        </Button>
                      </div>
                    </Card>
                  </div>
                </div>
              )}
            </div>
          )
        ) : (
          /* REVIEW HISTORY TAB */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {historyItems.map((hItem) => (
              <Card key={hItem.id} className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge status={hItem.status} />
                    <span className="text-xs font-mono text-muted">{hItem.id}</span>
                  </div>
                  <h3 className="text-lg font-heading font-bold text-ink">
                    {hItem.medicine_name}
                  </h3>
                  <p className="text-xs text-muted">
                    Batch: {hItem.batch_no} · Exp: {hItem.expiry_date} · Reviewed by{' '}
                    {hItem.reviewer_name}
                  </p>
                  {hItem.reject_reason_code && (
                    <p className="text-xs text-coral font-semibold">
                      Reject code: {hItem.reject_reason_code} — {hItem.reject_note}
                    </p>
                  )}
                </div>
                {hItem.verification_code && (
                  <div className="p-2 rounded-xl bg-surface border border-line text-center shrink-0">
                    <QRCodeSVG value={hItem.verification_code} size={56} />
                    <span className="block text-[9px] font-mono font-bold text-deep-teal mt-1">
                      {hItem.verification_code}
                    </span>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Reject Reason Modal */}
        <Modal
          isOpen={rejectModalOpen}
          onClose={() => setRejectModalOpen(false)}
          title="Reject Medicine Pack"
          subtitle="Select a standardized clinical rejection code for the audit log."
        >
          <form onSubmit={handleConfirmReject} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">
                Rejection Reason Code
              </label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value as RejectReasonCode)}
                className="w-full rounded-input bg-white px-4 py-3 text-sm text-ink border border-line focus:border-teal outline-none"
              >
                {REJECT_REASON_CODES.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.code} — {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">
                Pharmacist Note (Shown to Donor)
              </label>
              <textarea
                rows={3}
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Explain what was visible on the pack photo..."
                className="w-full rounded-input bg-white p-3.5 text-sm text-ink border border-line focus:border-teal outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRejectModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="danger" icon={<XCircle className="w-4 h-4" />}>
                Confirm Rejection
              </Button>
            </div>
          </form>
        </Modal>

        {/* Animated QR Code Approval Moment Modal */}
        <Modal
          isOpen={Boolean(approvedItemModal)}
          onClose={() => setApprovedItemModal(null)}
          title="Pack Verified & QR Issued!"
          subtitle="This verification code stays attached to the medicine pack through NGO handover."
        >
          {approvedItemModal && (
            <div className="flex flex-col items-center text-center space-y-5 py-2">
              <motion.div
                initial={{ scale: 0.6, opacity: 0, rotate: -6 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 220, damping: 16 }}
                className="p-5 rounded-card bg-white border-2 border-teal shadow-glow"
              >
                <QRCodeSVG
                  value={approvedItemModal.verification_code || 'ML-VERIFIED'}
                  size={150}
                />
              </motion.div>

              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-teal-50 text-teal-700 text-xs font-bold">
                  <QrCode className="w-3.5 h-3.5" />
                  Verification Code Generated
                </span>
                <h3 className="text-2xl font-mono font-extrabold text-deep-teal mt-2">
                  {approvedItemModal.verification_code}
                </h3>
                <p className="text-xs text-muted mt-1">
                  {approvedItemModal.medicine_name} · Batch {approvedItemModal.batch_no} · Status:{' '}
                  <strong>{approvedItemModal.status}</strong>
                </p>
              </div>

              <Button fullWidth onClick={() => setApprovedItemModal(null)}>
                Continue Reviewing Queue
              </Button>
            </div>
          )}
        </Modal>
      </div>
    </PageTransition>
  );
};
