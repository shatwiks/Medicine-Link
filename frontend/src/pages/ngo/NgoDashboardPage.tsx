import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Building2,
  CheckCircle2,
  Info,
  MapPin,
  PackageCheck,
  Plus,
  QrCode,
  Sparkles,
  Truck,
  XCircle,
} from 'lucide-react';
import { PageTransition } from '../../components/layout/PageTransition';
import { Reveal } from '../../components/motion/Reveal';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { ScoreRing } from '../../components/ui/ScoreRing';
import { Timeline } from '../../components/ui/Timeline';
import { useMockStore } from '../../mock/mockStore';
import { MatchSuggestion } from '../../types';

export const NgoDashboardPage: React.FC = () => {
  const {
    needs,
    matches,
    pickups,
    createNeed,
    respondToMatch,
    schedulePickup,
    advancePickupStatus,
  } = useMockStore();

  const [activeTab, setActiveTab] = useState<'matches' | 'needs' | 'pickups'>('matches');
  const [selectedMatchBreakdown, setSelectedMatchBreakdown] = useState<MatchSuggestion | null>(
    null
  );

  // New Need Modal
  const [needModalOpen, setNeedModalOpen] = useState(false);
  const [medName, setMedName] = useState('');
  const [strength, setStrength] = useState('500 mg');
  const [qtyNeeded, setQtyNeeded] = useState(50);
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>('high');

  // Schedule Pickup Modal
  const [scheduleMatch, setScheduleMatch] = useState<MatchSuggestion | null>(null);
  const [volunteerName, setVolunteerName] = useState('Karthik Rao (Volunteer)');
  const [volunteerPhone, setVolunteerPhone] = useState('+91 98802 33411');
  const [scheduledTime, setScheduledTime] = useState('2026-10-26T15:00');

  // Celebration banner state
  const [completedBanner, setCompletedBanner] = useState<string | null>(null);

  const handleCreateNeed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medName.trim()) return;
    createNeed({
      medicine_name: medName,
      strength,
      quantity_needed: qtyNeeded,
      urgency,
    });
    setMedName('');
    setNeedModalOpen(false);
  };

  const handleSchedulePickupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleMatch) return;
    schedulePickup(scheduleMatch.id, volunteerName, volunteerPhone, scheduledTime);
    setScheduleMatch(null);
    setActiveTab('pickups');
  };

  const handleConfirmReceived = (pickupId: string, medTitle: string) => {
    advancePickupStatus(pickupId, 'received', 'Confirmed intact QR seal and received at clinic.');
    setCompletedBanner(medTitle);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion) {
      confetti({
        particleCount: 65,
        spread: 70,
        origin: { y: 0.65 },
        colors: ['#1B9C85', '#6FD3BD', '#0F2F2E', '#F2B84B'],
      });
    }
  };

  return (
    <PageTransition>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10 pb-24">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-teal">
              <Building2 className="w-3.5 h-3.5" />
              Verified Partner NGO · Asha Health Foundation
            </span>
            <h1 className="text-3xl font-heading font-extrabold text-ink mt-1">
              NGO Needs, Matches & Fulfilment
            </h1>
            <p className="text-sm text-muted mt-0.5">
              Post clinical requirements, inspect 0–100 explainable match scores, and confirm delivery receipt.
            </p>
          </div>

          <Button
            onClick={() => setNeedModalOpen(true)}
            icon={<Plus className="w-5 h-5" />}
          >
            Post a Medicine Need
          </Button>
        </div>

        {/* Celebration Card after Receipt Confirmation */}
        {completedBanner && (
          <div className="mb-8 p-5 rounded-card bg-signature-gradient text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lift">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center text-mint shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-lg">
                  Thank you! {completedBanner} is now marked as RECEIVED.
                </h3>
                <p className="text-xs text-white/80">
                  The donation lifecycle is complete, the donor has been notified, and the impact dashboard has been updated.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCompletedBanner(null)}
              className="text-xs font-bold text-mint underline shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Section Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-8">
          <Chip
            label="Ranked Match Suggestions"
            count={matches.filter((m) => m.status === 'suggested' || m.status === 'accepted').length}
            active={activeTab === 'matches'}
            onClick={() => setActiveTab('matches')}
          />
          <Chip
            label="Posted Medicine Needs"
            count={needs.length}
            active={activeTab === 'needs'}
            onClick={() => setActiveTab('needs')}
          />
          <Chip
            label="Pickups & Receipt Confirmation"
            count={pickups.length}
            active={activeTab === 'pickups'}
            onClick={() => setActiveTab('pickups')}
          />
        </div>

        {/* TAB 1: RANKED MATCHES */}
        {activeTab === 'matches' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {matches.map((match, idx) => (
              <Reveal key={match.id} delay={idx * 0.05}>
                <Card hoverLift className="flex flex-col justify-between h-full space-y-5">
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            status={
                              match.status === 'suggested'
                                ? 'MATCHED'
                                : match.status === 'accepted'
                                ? 'ACCEPTED'
                                : match.status === 'completed'
                                ? 'RECEIVED'
                                : 'CANCELLED'
                            }
                          />
                          {match.verification_code && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-teal-50 text-teal-700 font-mono text-[10px] font-bold">
                              <QrCode className="w-3 h-3" />
                              {match.verification_code}
                            </span>
                          )}
                        </div>
                        <h3 className="text-xl font-heading font-extrabold text-ink pt-1">
                          {match.medicine_name}
                        </h3>
                        <p className="text-xs text-muted">
                          Allocated: <strong className="text-ink">{match.quantity_allocated} {match.form}s</strong> · Strength {match.strength} · Exp {match.expiry_date}
                        </p>
                      </div>

                      {/* Animated Score Ring */}
                      <button
                        type="button"
                        onClick={() => setSelectedMatchBreakdown(match)}
                        title="Click to inspect 0–100 score breakdown"
                        className="group focus:outline-none text-center"
                      >
                        <ScoreRing score={match.score} />
                        <span className="block text-[10px] font-semibold text-teal group-hover:underline mt-1">
                          Why {match.score}/100?
                        </span>
                      </button>
                    </div>

                    {/* Quick Breakdown Pills */}
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2.5 rounded-xl bg-surface border border-line">
                        <span className="text-[10px] text-muted block">Medicine (50)</span>
                        <strong className="text-ink font-heading">
                          +{match.score_breakdown.medicine_score} pts
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-surface border border-line">
                        <span className="text-[10px] text-muted block">
                          Distance ({match.score_breakdown.distance_km} km)
                        </span>
                        <strong className="text-ink font-heading">
                          +{match.score_breakdown.distance_score} pts
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-surface border border-line">
                        <span className="text-[10px] text-muted block capitalize">
                          Urgency ({match.score_breakdown.urgency_level})
                        </span>
                        <strong className="text-ink font-heading">
                          +{match.score_breakdown.urgency_score} pts
                        </strong>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-1.5 text-xs text-muted">
                      <MapPin className="w-3.5 h-3.5 text-teal shrink-0" />
                      <span>Pickup from: {match.pickup_address}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-line flex flex-wrap items-center justify-between gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedMatchBreakdown(match)}
                      icon={<Info className="w-4 h-4" />}
                    >
                      Score Breakdown
                    </Button>

                    {match.status === 'suggested' && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => respondToMatch(match.id, 'decline')}
                          icon={<XCircle className="w-4 h-4 text-coral" />}
                        >
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => respondToMatch(match.id, 'accept')}
                          icon={<CheckCircle2 className="w-4 h-4" />}
                        >
                          Accept Match
                        </Button>
                      </div>
                    )}

                    {match.status === 'accepted' && (
                      <Button
                        size="sm"
                        onClick={() => setScheduleMatch(match)}
                        icon={<Truck className="w-4 h-4" />}
                      >
                        Schedule Pickup
                      </Button>
                    )}
                  </div>
                </Card>
              </Reveal>
            ))}
          </div>
        )}

        {/* TAB 2: NEEDS GRID */}
        {activeTab === 'needs' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {needs.map((need, idx) => {
              const fulfilled = need.quantity_needed - need.quantity_remaining;
              const pct = Math.round((fulfilled / need.quantity_needed) * 100);
              const urgencyColor =
                need.urgency === 'high'
                  ? 'bg-coral-light text-coral border-coral-border'
                  : need.urgency === 'medium'
                  ? 'bg-amber-light text-[#9A6700] border-amber-border'
                  : 'bg-teal-50 text-teal-700 border-teal-200';

              return (
                <Reveal key={need.id} delay={idx * 0.05}>
                  <Card hoverLift className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-3 py-1 rounded-pill text-xs font-bold uppercase border ${urgencyColor}`}
                      >
                        {need.urgency} Urgency
                      </span>
                      <span className="text-xs font-mono text-muted">{need.status}</span>
                    </div>

                    <div>
                      <h3 className="text-xl font-heading font-extrabold text-ink">
                        {need.medicine_name}
                      </h3>
                      <p className="text-xs text-muted">
                        Generic: {need.generic_name} · Strength: {need.strength}
                      </p>
                      <p className="text-xs text-teal font-semibold mt-1">{need.org_name}</p>
                    </div>

                    {/* Fulfilment Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted">Allocated / Needed</span>
                        <strong className="text-ink">
                          {fulfilled} / {need.quantity_needed} units ({pct}%)
                        </strong>
                      </div>
                      <div className="w-full h-2.5 bg-surface rounded-full overflow-hidden border border-line">
                        <div
                          className="h-full bg-teal rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </Card>
                </Reveal>
              );
            })}
          </div>
        )}

        {/* TAB 3: PICKUPS & RECEIVED */}
        {activeTab === 'pickups' && (
          <div className="space-y-5">
            {pickups.map((pku) => {
              const timelineStatus =
                pku.status === 'scheduled'
                  ? 'PICKUP_SCHEDULED'
                  : pku.status === 'picked_up'
                  ? 'PICKED_UP'
                  : pku.status === 'delivered'
                  ? 'DELIVERED'
                  : 'RECEIVED';

              return (
                <Card key={pku.id} className="space-y-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge status={timelineStatus} />
                        {pku.verification_code && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-teal-50 text-teal-700 font-mono text-xs font-bold">
                            <QrCode className="w-3.5 h-3.5" />
                            {pku.verification_code}
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-heading font-extrabold text-ink mt-1.5">
                        {pku.medicine_name} ({pku.quantity} units · {pku.strength})
                      </h3>
                      <p className="text-xs text-muted mt-0.5">
                        Volunteer: <strong className="text-ink">{pku.volunteer_name}</strong> ({pku.volunteer_phone}) · Pickup: {pku.pickup_address}
                      </p>
                    </div>

                    {/* Step Progression Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      {pku.status === 'scheduled' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => advancePickupStatus(pku.id, 'picked_up')}
                          icon={<Truck className="w-4 h-4" />}
                        >
                          Mark Picked Up
                        </Button>
                      )}
                      {(pku.status === 'scheduled' || pku.status === 'picked_up') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => advancePickupStatus(pku.id, 'delivered')}
                          icon={<PackageCheck className="w-4 h-4" />}
                        >
                          Mark Delivered
                        </Button>
                      )}
                      {pku.status !== 'received' && (
                        <Button
                          size="md"
                          onClick={() => handleConfirmReceived(pku.id, pku.medicine_name)}
                          icon={<CheckCircle2 className="w-5 h-5" />}
                        >
                          Confirm Received 🎉
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="px-2">
                    <Timeline status={timelineStatus} />
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Score Breakdown Drawer/Modal */}
        <Modal
          isOpen={Boolean(selectedMatchBreakdown)}
          onClose={() => setSelectedMatchBreakdown(null)}
          title="Explainable Matching Score Breakdown"
          subtitle="Every match suggestion is scored out of 100 using transparent clinical & distance rules."
        >
          {selectedMatchBreakdown && (
            <div className="space-y-5">
              <div className="flex items-center justify-between p-4 rounded-xl bg-surface border border-line">
                <div>
                  <h4 className="font-heading font-extrabold text-lg text-ink">
                    {selectedMatchBreakdown.medicine_name}
                  </h4>
                  <p className="text-xs text-muted">
                    Matched for {selectedMatchBreakdown.org_name}
                  </p>
                </div>
                <ScoreRing score={selectedMatchBreakdown.score} />
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-200 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-heading font-bold text-ink">
                      1. Medicine & Strength Match (Max 50)
                    </p>
                    <p className="text-xs text-muted">
                      {selectedMatchBreakdown.score_breakdown.medicine_reason}
                    </p>
                  </div>
                  <span className="text-lg font-heading font-extrabold text-teal">
                    +{selectedMatchBreakdown.score_breakdown.medicine_score} / 50
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-200 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-heading font-bold text-ink">
                      2. Haversine Straight-Line Distance (Max 30)
                    </p>
                    <p className="text-xs text-muted">
                      {selectedMatchBreakdown.score_breakdown.distance_km} km between donor and NGO (0–3 km = 30 pts)
                    </p>
                  </div>
                  <span className="text-lg font-heading font-extrabold text-teal">
                    +{selectedMatchBreakdown.score_breakdown.distance_score} / 30
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-200 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-heading font-bold text-ink">
                      3. Clinical Urgency Priority (Max 20)
                    </p>
                    <p className="text-xs text-muted capitalize">
                      Need posted with {selectedMatchBreakdown.score_breakdown.urgency_level} urgency
                    </p>
                  </div>
                  <span className="text-lg font-heading font-extrabold text-teal">
                    +{selectedMatchBreakdown.score_breakdown.urgency_score} / 20
                  </span>
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* Post a Need Modal */}
        <Modal
          isOpen={needModalOpen}
          onClose={() => setNeedModalOpen(false)}
          title="Post a Medicine Need"
          subtitle="Our matching engine will immediately check all Pharmacist-Approved packs."
        >
          <form onSubmit={handleCreateNeed} className="space-y-4">
            <Input
              label="Medicine / Generic Name (e.g., Paracetamol, Metformin, Amoxicillin)"
              value={medName}
              onChange={(e) => setMedName(e.target.value)}
              required
            />
            <Input
              label="Required Strength (e.g., 500 mg, 650 mg)"
              value={strength}
              onChange={(e) => setStrength(e.target.value)}
              required
            />
            <Input
              label="Quantity Needed (Units / Tablets)"
              type="number"
              min={1}
              value={qtyNeeded}
              onChange={(e) => setQtyNeeded(Number(e.target.value))}
              required
            />
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">
                Clinical Urgency Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['low', 'medium', 'high'] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUrgency(u)}
                    className={`py-2.5 rounded-input text-xs font-heading font-bold uppercase border ${
                      urgency === u
                        ? 'bg-deep-teal text-white border-deep-teal'
                        : 'bg-surface text-muted border-line'
                    }`}
                  >
                    {u} ({u === 'high' ? '+20 pts' : u === 'medium' ? '+12 pts' : '+5 pts'})
                  </button>
                ))}
              </div>
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setNeedModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" icon={<Plus className="w-4 h-4" />}>
                Publish Need & Run Matching
              </Button>
            </div>
          </form>
        </Modal>

        {/* Schedule Volunteer Pickup Modal */}
        <Modal
          isOpen={Boolean(scheduleMatch)}
          onClose={() => setScheduleMatch(null)}
          title="Assign Volunteer Pickup"
          subtitle={`Schedule collection for ${scheduleMatch?.medicine_name}`}
        >
          <form onSubmit={handleSchedulePickupSubmit} className="space-y-4">
            <Input
              label="Assigned Volunteer Name"
              value={volunteerName}
              onChange={(e) => setVolunteerName(e.target.value)}
              required
            />
            <Input
              label="Volunteer Contact Phone"
              value={volunteerPhone}
              onChange={(e) => setVolunteerPhone(e.target.value)}
              required
            />
            <Input
              label="Scheduled Collection Time"
              type="datetime-local"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              required
            />
            <div className="pt-2 flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setScheduleMatch(null)}>
                Cancel
              </Button>
              <Button type="submit" icon={<Truck className="w-4 h-4" />}>
                Confirm Pickup Schedule
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </PageTransition>
  );
};
