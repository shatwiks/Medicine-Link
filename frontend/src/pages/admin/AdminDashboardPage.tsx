import React, { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Building2,
  CheckCircle2,
  Download,
  FileSearch,
  LayoutDashboard,
  Search,
  Settings,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { PageTransition } from '../../components/layout/PageTransition';
import { Reveal } from '../../components/motion/Reveal';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { Counter } from '../../components/ui/Counter';
import { RangeSlider } from '../../components/ui/RangeSlider';
import { REJECTION_REASONS_DATA, WEEKLY_CHART_DATA } from '../../mock/seedData';
import { useMockStore } from '../../mock/mockStore';

export const AdminDashboardPage: React.FC = () => {
  const {
    items,
    organizations,
    auditLog,
    settings,
    verifyOrganization,
    updateSettings,
    pushToast,
  } = useMockStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'orgs' | 'audit' | 'settings'>(
    'overview'
  );
  const [auditSearch, setAuditSearch] = useState('');
  const [auditRoleFilter, setAuditRoleFilter] = useState<string>('all');

  // Dynamic counts combined with historical baseline so numbers update live when user acts
  const listedCount = 228 + items.length;
  const approvedCount =
    181 +
    items.filter((i) =>
      [
        'APPROVED',
        'MATCHED',
        'ACCEPTED',
        'PICKUP_SCHEDULED',
        'PICKED_UP',
        'DELIVERED',
        'RECEIVED',
      ].includes(i.status)
    ).length;
  const rejectedCount =
    42 +
    items.filter((i) => ['REJECTED', 'AUTO_BLOCKED'].includes(i.status)).length;
  const matchedCount =
    162 +
    items.filter((i) =>
      ['MATCHED', 'ACCEPTED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'DELIVERED', 'RECEIVED'].includes(
        i.status
      )
    ).length;
  const completedCount =
    154 + items.filter((i) => i.status === 'RECEIVED').length;
  const totalValueSaved =
    34200 +
    items
      .filter((i) => i.status !== 'AUTO_BLOCKED' && i.status !== 'REJECTED')
      .reduce((acc, cur) => acc + cur.est_value, 0);

  const filteredAudit = auditLog.filter((entry) => {
    const matchesRole = auditRoleFilter === 'all' || entry.actor_role === auditRoleFilter;
    const q = auditSearch.toLowerCase();
    const matchesQuery =
      !q ||
      entry.actor_name.toLowerCase().includes(q) ||
      entry.action.toLowerCase().includes(q) ||
      entry.entity_id.toLowerCase().includes(q) ||
      entry.details.toLowerCase().includes(q);
    return matchesRole && matchesQuery;
  });

  const handleExportCsv = () => {
    const headers = ['ID,Medicine,Generic,Strength,Quantity,Batch,Expiry,Status,ValueINR'];
    const rows = items.map(
      (i) =>
        `${i.id},"${i.medicine_name}",${i.generic_name},${i.strength},${i.quantity},${i.batch_no},${i.expiry_date},${i.status},${i.est_value}`
    );
    const csv = [...headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'medicinelink-impact-report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    pushToast({
      title: 'Impact Report Exported (CSV)',
      description: 'Downloaded medicinelink-impact-report.csv',
      variant: 'success',
    });
  };

  return (
    <PageTransition>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10 pb-24">
        {/* Header with Signature Gradient Banner */}
        <div className="rounded-card bg-signature-gradient bg-grain text-white p-6 sm:p-8 mb-8 shadow-lift flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-mint">
              Governance, Analytics & Compliance
            </span>
            <h1 className="text-2xl sm:text-4xl font-heading font-extrabold mt-1">
              Impact Dashboard & Audit Trail
            </h1>
            <p className="text-xs sm:text-sm text-white/80 mt-1">
              Real-time metrics across verification, NGO matching, organisation licensing, and append-only audit logs.
            </p>
          </div>
          <Button
            variant="white"
            onClick={handleExportCsv}
            icon={<Download className="w-4 h-4 text-teal" />}
            className="shrink-0"
          >
            Export CSV Report
          </Button>
        </div>

        {/* Navigation Chips */}
        <div className="flex flex-wrap items-center gap-2 mb-8">
          <Chip
            label="Impact Overview (Bento)"
            active={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
            icon={<LayoutDashboard className="w-4 h-4" />}
          />
          <Chip
            label="Organisation Verification"
            count={organizations.filter((o) => !o.verified).length}
            active={activeTab === 'orgs'}
            onClick={() => setActiveTab('orgs')}
            icon={<Building2 className="w-4 h-4" />}
          />
          <Chip
            label="Immutable Audit Log"
            count={auditLog.length}
            active={activeTab === 'audit'}
            onClick={() => setActiveTab('audit')}
            icon={<FileSearch className="w-4 h-4" />}
          />
          <Chip
            label="Safety & Matching Settings"
            active={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
            icon={<Settings className="w-4 h-4" />}
          />
        </div>

        {/* TAB 1: BENTO IMPACT OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 6 Bento Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card variant="bento" className="p-5">
                <span className="text-xs font-semibold text-muted">Total Listed</span>
                <div className="text-2xl sm:text-3xl font-heading font-extrabold text-ink mt-1">
                  <Counter end={listedCount} />
                </div>
                <span className="text-[11px] text-teal font-semibold mt-1 block">
                  Packs scanned
                </span>
              </Card>

              <Card variant="bento" className="p-5">
                <span className="text-xs font-semibold text-muted">RPh Approved</span>
                <div className="text-2xl sm:text-3xl font-heading font-extrabold text-teal mt-1">
                  <Counter end={approvedCount} />
                </div>
                <span className="text-[11px] text-muted mt-1 block">QR codes issued</span>
              </Card>

              <Card variant="bento" className="p-5">
                <span className="text-xs font-semibold text-muted">Blocked / Rejected</span>
                <div className="text-2xl sm:text-3xl font-heading font-extrabold text-coral mt-1">
                  <Counter end={rejectedCount} />
                </div>
                <span className="text-[11px] text-coral font-semibold mt-1 block">
                  Safety filtered
                </span>
              </Card>

              <Card variant="bento" className="p-5">
                <span className="text-xs font-semibold text-muted">NGO Matched</span>
                <div className="text-2xl sm:text-3xl font-heading font-extrabold text-ink mt-1">
                  <Counter end={matchedCount} />
                </div>
                <span className="text-[11px] text-teal font-semibold mt-1 block">
                  Ranked &gt; 75/100
                </span>
              </Card>

              <Card variant="bento" className="p-5">
                <span className="text-xs font-semibold text-muted">Completed</span>
                <div className="text-2xl sm:text-3xl font-extrabold font-heading text-deep-teal mt-1">
                  <Counter end={completedCount} />
                </div>
                <span className="text-[11px] text-teal font-semibold mt-1 block">
                  Confirmed received
                </span>
              </Card>

              <Card variant="dark" className="p-5">
                <span className="text-xs font-semibold text-mint">Est. Value Saved</span>
                <div className="text-2xl sm:text-3xl font-heading font-extrabold text-white mt-1">
                  <Counter end={totalValueSaved} prefix="₹" />
                </div>
                <span className="text-[11px] text-white/75 mt-1 block">
                  Simulated impact
                </span>
              </Card>
            </div>

            {/* Bento Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Weekly Bar Chart */}
              <Reveal className="lg:col-span-7">
                <Card className="h-full space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-heading font-extrabold text-ink">
                        Weekly Packs Flow (Last 8 Weeks)
                      </h2>
                      <p className="text-xs text-muted">
                        Comparison of packs listed vs. pharmacist-approved vs. received by NGOs
                      </p>
                    </div>
                  </div>

                  <div className="h-72 w-full" aria-label="Bar chart of weekly medicine packs">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={WEEKLY_CHART_DATA} barGap={4}>
                        <defs>
                          <linearGradient id="barTeal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#1B9C85" />
                            <stop offset="100%" stopColor="#0F2F2E" />
                          </linearGradient>
                          <linearGradient id="barMint" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6FD3BD" />
                            <stop offset="100%" stopColor="#1B9C85" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#DDE5E1" vertical={false} />
                        <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#5B6B69' }} />
                        <YAxis tick={{ fontSize: 12, fill: '#5B6B69' }} />
                        <Tooltip
                          contentStyle={{
                            borderRadius: '12px',
                            border: '1px solid #DDE5E1',
                            fontSize: '12px',
                          }}
                        />
                        <Bar
                          dataKey="listed"
                          name="Listed"
                          fill="#DDE5E1"
                          radius={[6, 6, 0, 0]}
                        />
                        <Bar
                          dataKey="approved"
                          name="RPh Approved"
                          fill="url(#barMint)"
                          radius={[6, 6, 0, 0]}
                        />
                        <Bar
                          dataKey="completed"
                          name="Received by NGO"
                          fill="url(#barTeal)"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </Reveal>

              {/* Top Rejection Reasons Donut Chart */}
              <Reveal delay={0.1} className="lg:col-span-5">
                <Card className="h-full space-y-4">
                  <div>
                    <h2 className="text-lg font-heading font-extrabold text-ink">
                      Top Block & Rejection Reasons
                    </h2>
                    <p className="text-xs text-muted">
                      Why unsafe packs were stopped before matching
                    </p>
                  </div>

                  <div className="h-52 w-full" aria-label="Donut chart of rejection reasons">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={REJECTION_REASONS_DATA}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={52}
                          outerRadius={80}
                          paddingAngle={3}
                        >
                          {REJECTION_REASONS_DATA.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2 pt-1">
                    {REJECTION_REASONS_DATA.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="flex items-center gap-2 text-ink">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          {item.name}
                        </span>
                        <strong className="font-heading text-ink">{item.value}%</strong>
                      </div>
                    ))}
                  </div>
                </Card>
              </Reveal>
            </div>

            {/* Recent Activity Feed */}
            <Card className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-heading font-extrabold text-ink">
                  Recent Platform Activity Feed
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('audit')}
                  className="text-xs font-bold text-teal hover:underline"
                >
                  View Full Audit Log →
                </button>
              </div>
              <div className="divide-y divide-line">
                {auditLog.slice(0, 5).map((entry) => (
                  <div
                    key={entry.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-700 font-mono font-bold">
                        {entry.action}
                      </span>
                      <span className="text-ink font-medium">{entry.details}</span>
                    </div>
                    <span className="text-muted font-mono shrink-0">
                      {entry.actor_name} · {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* TAB 2: ORGANISATION VERIFICATION TABLE */}
        {activeTab === 'orgs' && (
          <Card className="space-y-5">
            <div>
              <h2 className="text-xl font-heading font-extrabold text-ink">
                Partner Organisation Licensing & Verification
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Unverified NGOs, clinics, and pharmacies cannot post needs, receive matches, or review items until approved here.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wider text-muted">
                    <th className="py-3 px-3">Organisation</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">License / Reg No.</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {organizations.map((org) => (
                    <tr key={org.id} className="hover:bg-surface/60">
                      <td className="py-4 px-3">
                        <p className="font-heading font-bold text-ink">{org.name}</p>
                        <p className="text-xs text-muted">{org.address}</p>
                      </td>
                      <td className="py-4 px-3 uppercase text-xs font-bold text-teal">
                        {org.type}
                      </td>
                      <td className="py-4 px-3 font-mono text-xs text-ink">
                        {org.license_no}
                      </td>
                      <td className="py-4 px-3">
                        {org.verified ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-teal-50 text-teal-700 text-xs font-bold border border-teal-200">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-amber-light text-[#9A6700] text-xs font-bold border border-amber-border">
                            Pending Admin Check
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-3 text-right">
                        {org.verified ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              verifyOrganization(
                                org.id,
                                false,
                                `Revoked verification for ${org.name}`
                              )
                            }
                            icon={<XCircle className="w-3.5 h-3.5 text-coral" />}
                          >
                            Revoke
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() =>
                              verifyOrganization(
                                org.id,
                                true,
                                `Approved license ${org.license_no} for ${org.name}`
                              )
                            }
                            icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                          >
                            Approve & Verify
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* TAB 3: SEARCHABLE IMMUTABLE AUDIT LOG */}
        {activeTab === 'audit' && (
          <Card className="space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-heading font-extrabold text-ink">
                  Append-Only System Audit Log
                </h2>
                <p className="text-xs text-muted">
                  Protected by SQLite BEFORE UPDATE and BEFORE DELETE triggers in production.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-muted absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    placeholder="Search actor, action, ID..."
                    aria-label="Search audit log"
                    className="pl-9 pr-4 py-2 rounded-pill bg-surface border border-line text-xs text-ink focus:border-teal outline-none w-56"
                  />
                </div>
                <select
                  value={auditRoleFilter}
                  onChange={(e) => setAuditRoleFilter(e.target.value)}
                  aria-label="Filter audit log by role"
                  className="px-3 py-2 rounded-pill bg-surface border border-line text-xs font-semibold text-ink outline-none"
                >
                  <option value="all">All Roles</option>
                  <option value="donor">Donor</option>
                  <option value="pharmacist">Pharmacist</option>
                  <option value="ngo">NGO / Clinic</option>
                  <option value="admin">Admin</option>
                  <option value="system">System Engine</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-line uppercase tracking-wider text-muted">
                    <th className="py-3 px-3">Log #</th>
                    <th className="py-3 px-3">Timestamp</th>
                    <th className="py-3 px-3">Actor & Role</th>
                    <th className="py-3 px-3">Action</th>
                    <th className="py-3 px-3">Entity</th>
                    <th className="py-3 px-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredAudit.map((row) => (
                    <tr key={row.id} className="hover:bg-surface/60">
                      <td className="py-3 px-3 font-mono font-bold text-muted">#{row.id}</td>
                      <td className="py-3 px-3 font-mono text-muted whitespace-nowrap">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-3">
                        <strong className="text-ink block">{row.actor_name}</strong>
                        <span className="uppercase text-[10px] text-teal font-bold">
                          {row.actor_role}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-700 font-mono font-bold">
                          {row.action}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-ink">
                        {row.entity} ({row.entity_id})
                      </td>
                      <td className="py-3 px-3 text-ink max-w-md">{row.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* TAB 4: SETTINGS SLIDERS */}
        {activeTab === 'settings' && (
          <Card className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-xl font-heading font-extrabold text-ink">
                Eligibility & Matching Engine Settings
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Adjusting these sliders immediately updates the live rules engine in the Donor Wizard.
              </p>
            </div>

            <div className="space-y-6">
              <RangeSlider
                label="Minimum Remaining Shelf Life"
                description="Hard rule MIN_SHELF_LIFE blocks any pack expiring sooner than this threshold."
                value={settings.min_shelf_life_months}
                min={3}
                max={12}
                step={1}
                unit="months"
                onChange={(val) => updateSettings({ min_shelf_life_months: val })}
              />

              <RangeSlider
                label="Maximum Matching Distance Radius"
                description="NGOs farther than this Haversine distance are excluded from suggestions."
                value={settings.max_distance_km}
                min={5}
                max={50}
                step={5}
                unit="km"
                onChange={(val) => updateSettings({ max_distance_km: val })}
              />

              <RangeSlider
                label="Match Suggestion Expiry Window"
                description="How long an NGO has to accept a match before it rotates to the next clinic."
                value={settings.match_expiry_hours}
                min={12}
                max={96}
                step={12}
                unit="hours"
                onChange={(val) => updateSettings({ match_expiry_hours: val })}
              />

              <RangeSlider
                label="Unusual Quantity Soft-Flag Limit"
                description="Quantities above this number trigger a soft flag for pharmacist bulk verification."
                value={settings.quantity_unusual_limit}
                min={30}
                max={250}
                step={10}
                unit="units"
                onChange={(val) => updateSettings({ quantity_unusual_limit: val })}
              />
            </div>
          </Card>
        )}
      </div>
    </PageTransition>
  );
};
