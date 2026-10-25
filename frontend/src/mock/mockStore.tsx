import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  AppSettings,
  AuditEntry,
  DonationItem,
  EligibilityRuleResult,
  MatchSuggestion,
  MedicineForm,
  Need,
  NotificationItem,
  Organization,
  PickupRecord,
  RejectReasonCode,
  User,
  UserRole,
} from '../types';
import {
  BLOCKED_MEDICINES,
  DEMO_USERS,
  INITIAL_AUDIT_LOG,
  INITIAL_ITEMS,
  INITIAL_MATCHES,
  INITIAL_NEEDS,
  INITIAL_NOTIFICATIONS,
  INITIAL_ORGANIZATIONS,
  INITIAL_PICKUPS,
  INITIAL_SETTINGS,
  MEDICINE_ALIASES,
} from './seedData';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: 'success' | 'error' | 'warning' | 'info';
}

interface NewDonationInput {
  medicine_name: string;
  strength: string;
  form: MedicineForm;
  quantity: number;
  batch_no: string;
  expiry_date: string;
  is_rx_only: boolean;
  declaration_sealed: boolean;
  declaration_room_temp: boolean;
  ocr_confidence?: number;
  ocr_text?: string;
  pickup_address: string;
  pickup_window: string;
  lat: number;
  lng: number;
}

interface MockStoreContextType {
  currentUser: User;
  switchRole: (role: UserRole) => void;
  items: DonationItem[];
  organizations: Organization[];
  needs: Need[];
  matches: MatchSuggestion[];
  pickups: PickupRecord[];
  auditLog: AuditEntry[];
  settings: AppSettings;
  notifications: NotificationItem[];
  toasts: ToastMessage[];
  pushToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
  evaluateEligibility: (input: Partial<NewDonationInput>) => {
    passedHardRules: boolean;
    results: EligibilityRuleResult[];
    monthsRemaining: number;
  };
  createDonationItem: (input: NewDonationInput) => DonationItem;
  cancelDonationItem: (itemId: string) => void;
  reviewItemDecision: (
    itemId: string,
    decision: 'approve' | 'reject',
    rejectReason?: RejectReasonCode,
    note?: string
  ) => DonationItem | undefined;
  createNeed: (input: {
    medicine_name: string;
    strength: string;
    quantity_needed: number;
    urgency: 'low' | 'medium' | 'high';
  }) => void;
  respondToMatch: (matchId: string, response: 'accept' | 'decline') => void;
  schedulePickup: (matchId: string, volunteerName: string, volunteerPhone: string, scheduledAt: string) => void;
  advancePickupStatus: (pickupId: string, nextStatus: 'picked_up' | 'delivered' | 'received', notes?: string) => void;
  verifyOrganization: (orgId: string, verified: boolean, note: string) => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
  markAllNotificationsRead: () => void;
  uploadOcrPhoto: (file: File) => Promise<{
    expiry_date: string | null;
    batch_no: string | null;
    medicine_name_guess: string | null;
    raw_text: string;
    confidence: number;
  } | null>;
}

const MockStoreContext = createContext<MockStoreContextType | null>(null);

function resolveGenericName(name: string): string {
  const cleaned = name.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
  for (const [alias, generic] of Object.entries(MEDICINE_ALIASES)) {
    if (cleaned.includes(alias)) return generic;
  }
  return cleaned.split(' ')[0] || cleaned;
}

function monthsFromNow(expiryDateStr?: string): number {
  if (!expiryDateStr) return -1;
  const now = new Date('2026-10-25T00:00:00Z');
  const exp = new Date(expiryDateStr);
  if (isNaN(exp.getTime())) return -1;
  const diffDays = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return Math.round((diffDays / 30.44) * 10) / 10;
}

const API_BASE = 'http://localhost:4000/api/v1';

async function getRoleJwtToken(roleEmail: string): Promise<string | null> {
  try {
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: roleEmail, password: 'Demo@1234' }),
    });
    if (!loginRes.ok) return null;
    const loginJson = await loginRes.json();
    const token = loginJson?.data?.accessToken || null;
    if (token) {
      localStorage.setItem('medicinelink_jwt', token);
    }
    return token;
  } catch {
    return null;
  }
}

async function syncWithBackendApi(
  roleEmail: string,
  endpoint: string,
  method: string,
  body?: unknown
) {
  try {
    const token = await getRoleJwtToken(roleEmail);
    if (!token) return null;

    const res = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return await res.json();
  } catch {
    // Graceful fallback to in-memory store if backend server is stopped
    return null;
  }
}

export const MockStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialRole =
    (localStorage.getItem('medicinelink_active_role') as UserRole) || 'donor';
  const [currentUser, setCurrentUser] = useState<User>(
    DEMO_USERS[initialRole] || DEMO_USERS.donor
  );
  const [items, setItems] = useState<DonationItem[]>(INITIAL_ITEMS);
  const [organizations, setOrganizations] = useState<Organization[]>(INITIAL_ORGANIZATIONS);
  const [needs, setNeeds] = useState<Need[]>(INITIAL_NEEDS);
  const [matches, setMatches] = useState<MatchSuggestion[]>(INITIAL_MATCHES);
  const [pickups, setPickups] = useState<PickupRecord[]>(INITIAL_PICKUPS);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>(INITIAL_AUDIT_LOG);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const hydrateFromBackend = useCallback(async (email: string) => {
    const res = await syncWithBackendApi(email, '/state/sync', 'GET');
    if (res?.success && res?.data) {
      if (Array.isArray(res.data.items) && res.data.items.length > 0) {
        setItems(res.data.items);
      }
      if (Array.isArray(res.data.organizations) && res.data.organizations.length > 0) {
        setOrganizations(res.data.organizations);
      }
      if (Array.isArray(res.data.needs) && res.data.needs.length > 0) {
        setNeeds(res.data.needs);
      }
      if (Array.isArray(res.data.matches) && res.data.matches.length > 0) {
        setMatches(res.data.matches);
      }
      if (Array.isArray(res.data.pickups) && res.data.pickups.length > 0) {
        setPickups(res.data.pickups);
      }
      if (Array.isArray(res.data.auditLog) && res.data.auditLog.length > 0) {
        setAuditLog(res.data.auditLog);
      }
      if (res.data.settings) {
        setSettings(res.data.settings);
      }
    }
  }, []);

  useEffect(() => {
    void hydrateFromBackend(currentUser.email);
  }, [currentUser.email, hydrateFromBackend]);

  const pushToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const addAudit = (
    actorName: string,
    actorRole: UserRole | 'system',
    action: string,
    entity: string,
    entityId: string,
    details: string
  ) => {
    setAuditLog((prev) => [
      {
        id: (prev[0]?.id || 1000) + 1,
        actor_name: actorName,
        actor_role: actorRole,
        action,
        entity,
        entity_id: entityId,
        details,
        created_at: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const switchRole = (role: UserRole) => {
    localStorage.setItem('medicinelink_active_role', role);
    setCurrentUser(DEMO_USERS[role]);
    pushToast({
      title: `Switched to ${DEMO_USERS[role].name}`,
      description: `Now viewing MedicineLink as ${role.toUpperCase()}.`,
      variant: 'info',
    });
  };

  const uploadOcrPhoto = async (file: File) => {
    try {
      const token = await getRoleJwtToken(DEMO_USERS.donor.email);
      if (!token) return null;
      const formData = new FormData();
      formData.append('photo', file);
      const res = await fetch(`${API_BASE}/items/ocr`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json?.data || null;
    } catch {
      return null;
    }
  };

  const evaluateEligibility = (input: Partial<NewDonationInput>) => {
    const results: EligibilityRuleResult[] = [];
    const months = monthsFromNow(input.expiry_date);
    const medLower = (input.medicine_name || '').toLowerCase();

    // 1. EXPIRY_PRESENT
    const hasValidExpiry = Boolean(input.expiry_date && months !== -1);
    results.push({
      rule: 'EXPIRY_PRESENT',
      passed: hasValidExpiry,
      severity: 'hard',
      message: hasValidExpiry
        ? `Expiry date ${input.expiry_date} is clearly readable.`
        : 'Please provide a readable expiry date on the pack.',
    });

    // 2. NOT_EXPIRED
    const notExpired = hasValidExpiry && months > 0;
    results.push({
      rule: 'NOT_EXPIRED',
      passed: notExpired,
      severity: 'hard',
      message: notExpired
        ? 'Medicine pack is unexpired.'
        : 'This pack has already expired. Please dispose of it safely at a pharmacy drop-box.',
    });

    // 3. MIN_SHELF_LIFE
    const meetsShelfLife = notExpired && months >= settings.min_shelf_life_months;
    results.push({
      rule: 'MIN_SHELF_LIFE',
      passed: meetsShelfLife,
      severity: 'hard',
      message: meetsShelfLife
        ? `${months} months of shelf life left (meets the ${settings.min_shelf_life_months}-month minimum).`
        : `This pack expires in ${Math.max(0, months)} months. We need at least ${settings.min_shelf_life_months} months so it stays useful.`,
    });

    // 4. BATCH_PRESENT
    const hasBatch = Boolean(input.batch_no && input.batch_no.trim().length >= 3);
    results.push({
      rule: 'BATCH_PRESENT',
      passed: hasBatch,
      severity: 'hard',
      message: hasBatch
        ? `Batch number ${input.batch_no} is recorded for traceability.`
        : 'Batch number is missing or unreadable.',
    });

    // 5. SEALED_DECLARED
    const isSealed = Boolean(input.declaration_sealed);
    results.push({
      rule: 'SEALED_DECLARED',
      passed: isSealed,
      severity: 'hard',
      message: isSealed
        ? 'Confirmed factory-sealed and unopened.'
        : 'Only factory-sealed, unopened packs can be accepted.',
    });

    // 6. ROOM_TEMP_DECLARED
    const isRoomTemp = Boolean(input.declaration_room_temp);
    results.push({
      rule: 'ROOM_TEMP_DECLARED',
      passed: isRoomTemp,
      severity: 'hard',
      message: isRoomTemp
        ? 'Confirmed stored at safe room temperature.'
        : 'Medicines requiring refrigeration or exposed to heat cannot be verified.',
    });

    // 7. FORM_ALLOWED & 8. NOT_BLOCKED
    const blockedMatch = BLOCKED_MEDICINES.find((b) => medLower.includes(b.keyword));
    const formAllowed = !medLower.includes('injection') && !medLower.includes('vial');
    results.push({
      rule: 'FORM_ALLOWED',
      passed: formAllowed,
      severity: 'hard',
      message: formAllowed
        ? `Dosage form (${input.form || 'tablet'}) is eligible.`
        : 'Injectable vials and ampoules are not accepted.',
    });

    results.push({
      rule: 'NOT_BLOCKED',
      passed: !blockedMatch,
      severity: 'hard',
      message: blockedMatch
        ? `Not accepted: ${blockedMatch.reason} (${blockedMatch.keyword}).`
        : 'Not on the controlled, cold-chain, or restricted substance list.',
    });

    // Soft rules
    const ocrConf = input.ocr_confidence ?? 0.92;
    if (ocrConf < settings.ocr_low_confidence) {
      results.push({
        rule: 'LOW_OCR_CONFIDENCE',
        passed: false,
        severity: 'soft',
        message: `Low scan confidence (${Math.round(ocrConf * 100)}%). Flagged for closer pharmacist inspection.`,
      });
    }

    if (input.is_rx_only) {
      results.push({
        rule: 'RX_ONLY',
        passed: false,
        severity: 'soft',
        message: 'Prescription-only medicine: will be dispensed only against a valid doctor prescription.',
      });
    }

    const dupBatch = items.some(
      (i) =>
        i.batch_no.toLowerCase() === (input.batch_no || '').toLowerCase() &&
        i.medicine_name.toLowerCase() === medLower
    );
    if (dupBatch) {
      results.push({
        rule: 'DUPLICATE_BATCH',
        passed: false,
        severity: 'soft',
        message: 'Same batch number was already listed earlier — flagged for pharmacist check.',
      });
    }

    if ((input.quantity || 0) > settings.quantity_unusual_limit) {
      results.push({
        rule: 'QUANTITY_UNUSUAL',
        passed: false,
        severity: 'soft',
        message: `Large quantity (${input.quantity} units) flagged for bulk source verification.`,
      });
    }

    const passedHardRules = results.filter((r) => r.severity === 'hard').every((r) => r.passed);
    return { passedHardRules, results, monthsRemaining: months };
  };

  const createDonationItem = (input: NewDonationInput): DonationItem => {
    const { passedHardRules, results } = evaluateEligibility(input);
    const newStatus = passedHardRules ? 'PENDING_REVIEW' : 'AUTO_BLOCKED';
    const newItem: DonationItem = {
      id: `itm-${Math.floor(200 + Math.random() * 799)}`,
      donation_id: `don-${Math.floor(200 + Math.random() * 799)}`,
      donor_id: currentUser.id,
      donor_name: currentUser.name,
      medicine_name: input.medicine_name,
      generic_name: resolveGenericName(input.medicine_name),
      strength: input.strength,
      form: input.form,
      quantity: input.quantity,
      batch_no: input.batch_no,
      expiry_date: input.expiry_date,
      est_value: Math.round(input.quantity * 6.5),
      is_rx_only: input.is_rx_only,
      declaration_sealed: input.declaration_sealed,
      declaration_room_temp: input.declaration_room_temp,
      status: newStatus,
      ocr_text: input.ocr_text || `${input.medicine_name.toUpperCase()} | B.NO ${input.batch_no} | EXP ${input.expiry_date}`,
      ocr_confidence: input.ocr_confidence ?? 0.94,
      auto_check_result: results,
      pickup_address: input.pickup_address,
      pickup_window: input.pickup_window,
      lat: input.lat,
      lng: input.lng,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setItems((prev) => [newItem, ...prev]);

    // Sync with live SQLite backend API in background
    void syncWithBackendApi(DEMO_USERS.donor.email, '/donations', 'POST', {
      pickup_address: input.pickup_address,
      lat: input.lat,
      lng: input.lng,
      declaration_sealed: input.declaration_sealed,
      declaration_room_temp: input.declaration_room_temp,
      items: [
        {
          medicine_name: input.medicine_name,
          strength: input.strength,
          form: input.form,
          quantity: input.quantity,
          batch_no: input.batch_no,
          expiry_date: input.expiry_date,
          is_rx_only: input.is_rx_only,
          ocr_confidence: input.ocr_confidence,
          ocr_text: input.ocr_text,
        },
      ],
    });

    addAudit(
      currentUser.name,
      'donor',
      passedHardRules ? 'ITEM_LISTED_PENDING_REVIEW' : 'ITEM_AUTO_BLOCKED',
      'donation_item',
      newItem.id,
      `${newItem.medicine_name} (${newItem.quantity} units, B.No ${newItem.batch_no}) -> ${newStatus}`
    );

    pushToast({
      title: passedHardRules
        ? 'Thank you! Your medicine is now with a pharmacist for checking.'
        : 'Pack automatically blocked by safety rules',
      description: passedHardRules
        ? `${newItem.medicine_name} added to the pharmacist verification queue.`
        : results.find((r) => !r.passed && r.severity === 'hard')?.message,
      variant: passedHardRules ? 'success' : 'error',
    });

    return newItem;
  };

  const cancelDonationItem = (itemId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, status: 'CANCELLED', updated_at: new Date().toISOString() } : item
      )
    );
    addAudit(currentUser.name, currentUser.role, 'ITEM_CANCELLED', 'donation_item', itemId, 'Donor cancelled listing.');
    pushToast({
      title: 'Donation cancelled',
      description: `Item ${itemId} has been marked as cancelled.`,
      variant: 'info',
    });
  };

  const reviewItemDecision = (
    itemId: string,
    decision: 'approve' | 'reject',
    rejectReason?: RejectReasonCode,
    note?: string
  ) => {
    let updatedItem: DonationItem | undefined;
    const verCode =
      decision === 'approve'
        ? `ML-VER-${Math.floor(1000 + Math.random() * 8999)}-${itemId.slice(-2).toUpperCase()}`
        : undefined;

    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        // Check if an open need matches this item immediately
        const matchingNeed = needs.find(
          (n) =>
            n.status !== 'fulfilled' &&
            n.status !== 'cancelled' &&
            n.generic_name.toLowerCase() === item.generic_name.toLowerCase()
        );
        const nextStatus =
          decision === 'approve' ? (matchingNeed ? 'MATCHED' : 'APPROVED') : 'REJECTED';

        updatedItem = {
          ...item,
          status: nextStatus,
          reviewer_id: DEMO_USERS.pharmacist.id,
          reviewer_name: DEMO_USERS.pharmacist.name,
          reviewed_at: new Date().toISOString(),
          verification_code: verCode,
          reject_reason_code: decision === 'reject' ? rejectReason || 'OTHER' : undefined,
          reject_note: note,
          updated_at: new Date().toISOString(),
        };

        if (decision === 'approve' && matchingNeed) {
          const sameStrength = matchingNeed.strength.toLowerCase() === item.strength.toLowerCase();
          const medScore = sameStrength ? 50 : 20;
          const distScore = 30;
          const urgScore =
            matchingNeed.urgency === 'high' ? 20 : matchingNeed.urgency === 'medium' ? 12 : 5;
          const newMatch: MatchSuggestion = {
            id: `mtc-${Math.floor(400 + Math.random() * 500)}`,
            item_id: item.id,
            need_id: matchingNeed.id,
            org_id: matchingNeed.org_id,
            org_name: matchingNeed.org_name,
            medicine_name: item.medicine_name,
            generic_name: item.generic_name,
            strength: item.strength,
            form: item.form,
            quantity_allocated: Math.min(item.quantity, matchingNeed.quantity_remaining),
            expiry_date: item.expiry_date,
            batch_no: item.batch_no,
            verification_code: verCode,
            pickup_address: item.pickup_address,
            score: medScore + distScore + urgScore,
            score_breakdown: {
              medicine_score: medScore,
              medicine_reason: sameStrength
                ? `Exact generic (${item.generic_name}) & strength (${item.strength}) match`
                : `Same generic (${item.generic_name}), different strength`,
              distance_score: distScore,
              distance_km: 1.8,
              urgency_score: urgScore,
              urgency_level: matchingNeed.urgency,
            },
            status: 'suggested',
            expires_at: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
            created_at: new Date().toISOString(),
          };
          setMatches((mPrev) => [newMatch, ...mPrev]);
        }

        return updatedItem;
      })
    );

    if (updatedItem) {
      void syncWithBackendApi(
        DEMO_USERS.pharmacist.email,
        `/review/items/${itemId}/decision`,
        'POST',
        {
          decision,
          reject_reason_code: decision === 'reject' ? rejectReason || 'OTHER' : undefined,
          note,
        }
      ).then(() => hydrateFromBackend(currentUser.email));

      addAudit(
        DEMO_USERS.pharmacist.name,
        'pharmacist',
        decision === 'approve' ? 'REVIEW_APPROVED' : 'REVIEW_REJECTED',
        'donation_item',
        itemId,
        decision === 'approve'
          ? `Approved ${updatedItem.medicine_name}; code ${verCode}`
          : `Rejected ${updatedItem.medicine_name}: ${rejectReason} (${note || 'no note'})`
      );

      pushToast({
        title: decision === 'approve' ? `Pack Approved (${verCode})` : 'Pack Rejected',
        description:
          decision === 'approve'
            ? `${updatedItem.medicine_name} is now verified and entered matching.`
            : `${updatedItem.medicine_name} rejected with reason ${rejectReason}.`,
        variant: decision === 'approve' ? 'success' : 'warning',
      });
    }

    return updatedItem;
  };

  const createNeed = (input: {
    medicine_name: string;
    strength: string;
    quantity_needed: number;
    urgency: 'low' | 'medium' | 'high';
  }) => {
    const generic = resolveGenericName(input.medicine_name);
    const newNeed: Need = {
      id: `need-${Math.floor(300 + Math.random() * 600)}`,
      org_id: 'org-ngo-1',
      org_name: 'Asha Health Foundation',
      medicine_name: input.medicine_name,
      generic_name: generic,
      strength: input.strength,
      quantity_needed: input.quantity_needed,
      quantity_remaining: input.quantity_needed,
      urgency: input.urgency,
      status: 'open',
      created_at: new Date().toISOString(),
    };

    setNeeds((prev) => [newNeed, ...prev]);

    void syncWithBackendApi(DEMO_USERS.ngo.email, '/needs', 'POST', {
      medicine_name: input.medicine_name,
      strength: input.strength,
      quantity_needed: input.quantity_needed,
      urgency: input.urgency,
    });

    // Check if any APPROVED item matches this new need
    const approvedItem = items.find(
      (i) => i.status === 'APPROVED' && i.generic_name.toLowerCase() === generic.toLowerCase()
    );
    if (approvedItem) {
      const sameStrength = approvedItem.strength.toLowerCase() === input.strength.toLowerCase();
      const medScore = sameStrength ? 50 : 20;
      const distScore = 30;
      const urgScore = input.urgency === 'high' ? 20 : input.urgency === 'medium' ? 12 : 5;
      const newMatch: MatchSuggestion = {
        id: `mtc-${Math.floor(400 + Math.random() * 500)}`,
        item_id: approvedItem.id,
        need_id: newNeed.id,
        org_id: newNeed.org_id,
        org_name: newNeed.org_name,
        medicine_name: approvedItem.medicine_name,
        generic_name: approvedItem.generic_name,
        strength: approvedItem.strength,
        form: approvedItem.form,
        quantity_allocated: Math.min(approvedItem.quantity, newNeed.quantity_remaining),
        expiry_date: approvedItem.expiry_date,
        batch_no: approvedItem.batch_no,
        verification_code: approvedItem.verification_code,
        pickup_address: approvedItem.pickup_address,
        score: medScore + distScore + urgScore,
        score_breakdown: {
          medicine_score: medScore,
          medicine_reason: sameStrength
            ? `Exact generic (${generic}) & strength (${input.strength}) match`
            : `Same generic (${generic}), different strength`,
          distance_score: distScore,
          distance_km: 1.9,
          urgency_score: urgScore,
          urgency_level: input.urgency,
        },
        status: 'suggested',
        expires_at: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      };
      setMatches((prev) => [newMatch, ...prev]);
      setItems((prev) =>
        prev.map((i) => (i.id === approvedItem.id ? { ...i, status: 'MATCHED' } : i))
      );
    }

    addAudit(
      DEMO_USERS.ngo.name,
      'ngo',
      'NEED_CREATED',
      'need',
      newNeed.id,
      `Posted need for ${input.quantity_needed}x ${input.medicine_name} (${input.urgency} urgency).`
    );

    pushToast({
      title: 'Medicine Need Posted',
      description: `Matching engine scanned approved packs for ${input.medicine_name}.`,
      variant: 'success',
    });
  };

  const respondToMatch = (matchId: string, response: 'accept' | 'decline') => {
    const targetMatch = matches.find((m) => m.id === matchId);
    if (!targetMatch) return;

    void syncWithBackendApi(
      DEMO_USERS.ngo.email,
      `/matches/${matchId}/respond`,
      'POST',
      { response }
    ).then(() => hydrateFromBackend(currentUser.email));

    setMatches((prev) =>
      prev.map((m) => {
        if (m.id === matchId) {
          return { ...m, status: response === 'accept' ? 'accepted' : 'declined' };
        }
        if (response === 'accept' && m.item_id === targetMatch.item_id && m.status === 'suggested') {
          return { ...m, status: 'cancelled' };
        }
        return m;
      })
    );

    if (response === 'accept') {
      setItems((prev) =>
        prev.map((i) => (i.id === targetMatch.item_id ? { ...i, status: 'ACCEPTED' } : i))
      );
      setNeeds((prev) =>
        prev.map((n) => {
          if (n.id !== targetMatch.need_id) return n;
          const rem = Math.max(0, n.quantity_remaining - targetMatch.quantity_allocated);
          return {
            ...n,
            quantity_remaining: rem,
            status: rem === 0 ? 'fulfilled' : 'partially_fulfilled',
          };
        })
      );
      addAudit(
        DEMO_USERS.ngo.name,
        'ngo',
        'MATCH_ACCEPTED',
        'match',
        matchId,
        `Accepted ${targetMatch.medicine_name} (${targetMatch.quantity_allocated} units) for ${targetMatch.org_name}.`
      );
      pushToast({
        title: 'Match Accepted!',
        description: 'You can now schedule a volunteer pickup in the Pickups tab.',
        variant: 'success',
      });
    } else {
      setItems((prev) =>
        prev.map((i) => (i.id === targetMatch.item_id ? { ...i, status: 'APPROVED' } : i))
      );
      addAudit(
        DEMO_USERS.ngo.name,
        'ngo',
        'MATCH_DECLINED',
        'match',
        matchId,
        `Declined match for ${targetMatch.medicine_name}; item returned to matching pool.`
      );
      pushToast({
        title: 'Match Declined',
        description: 'Pack returned to the pool for other clinics and NGOs.',
        variant: 'info',
      });
    }
  };

  const schedulePickup = (
    matchId: string,
    volunteerName: string,
    volunteerPhone: string,
    scheduledAt: string
  ) => {
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;

    const newPickup: PickupRecord = {
      id: `pku-${Math.floor(500 + Math.random() * 400)}`,
      match_id: match.id,
      item_id: match.item_id,
      medicine_name: match.medicine_name,
      strength: match.strength,
      quantity: match.quantity_allocated,
      donor_name: 'Aarav Sharma',
      pickup_address: match.pickup_address,
      org_name: match.org_name,
      volunteer_name: volunteerName,
      volunteer_phone: volunteerPhone,
      scheduled_at: scheduledAt,
      status: 'scheduled',
      verification_code: match.verification_code,
      updated_at: new Date().toISOString(),
    };

    setPickups((prev) => [newPickup, ...prev]);
    setItems((prev) =>
      prev.map((i) => (i.id === match.item_id ? { ...i, status: 'PICKUP_SCHEDULED' } : i))
    );

    addAudit(
      currentUser.name,
      currentUser.role,
      'PICKUP_SCHEDULED',
      'pickup',
      newPickup.id,
      `Scheduled volunteer ${volunteerName} for ${match.medicine_name}.`
    );

    pushToast({
      title: 'Pickup Scheduled',
      description: `${volunteerName} assigned for collection.`,
      variant: 'success',
    });
  };

  const advancePickupStatus = (
    pickupId: string,
    nextStatus: 'picked_up' | 'delivered' | 'received',
    notes?: string
  ) => {
    const target = pickups.find((p) => p.id === pickupId);
    if (!target) return;

    setPickups((prev) =>
      prev.map((p) =>
        p.id === pickupId
          ? { ...p, status: nextStatus, notes: notes || p.notes, updated_at: new Date().toISOString() }
          : p
      )
    );

    const itemStatusMap: Record<'picked_up' | 'delivered' | 'received', DonationItem['status']> = {
      picked_up: 'PICKED_UP',
      delivered: 'DELIVERED',
      received: 'RECEIVED',
    };

    setItems((prev) =>
      prev.map((i) =>
        i.id === target.item_id
          ? { ...i, status: itemStatusMap[nextStatus], updated_at: new Date().toISOString() }
          : i
      )
    );

    if (nextStatus === 'received') {
      setMatches((prev) =>
        prev.map((m) => (m.id === target.match_id ? { ...m, status: 'completed' } : m))
      );
    }

    addAudit(
      currentUser.name,
      currentUser.role,
      `PICKUP_${nextStatus.toUpperCase()}`,
      'pickup',
      pickupId,
      `${target.medicine_name} marked as ${nextStatus.toUpperCase()}.`
    );

    pushToast({
      title:
        nextStatus === 'received'
          ? 'Medicine Pack Received & Completed!'
          : `Status updated to ${nextStatus.replace('_', ' ')}`,
      description: `${target.medicine_name} lifecycle and audit trail updated.`,
      variant: 'success',
    });
  };

  const verifyOrganization = (orgId: string, verified: boolean, note: string) => {
    void syncWithBackendApi(
      DEMO_USERS.admin.email,
      `/admin/organizations/${orgId}/verify`,
      'POST',
      { verified, note }
    );
    setOrganizations((prev) =>
      prev.map((org) =>
        org.id === orgId
          ? {
              ...org,
              verified,
              verified_at: verified ? new Date().toISOString() : undefined,
              verification_note: note,
            }
          : org
      )
    );

    addAudit(
      DEMO_USERS.admin.name,
      'admin',
      verified ? 'ORG_VERIFIED' : 'ORG_UNVERIFIED',
      'organization',
      orgId,
      note
    );

    pushToast({
      title: verified ? 'Organisation Verified' : 'Organisation Verification Revoked',
      description: note,
      variant: verified ? 'success' : 'warning',
    });
  };

  const updateSettings = (partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      return next;
    });
    addAudit(
      DEMO_USERS.admin.name,
      'admin',
      'SETTINGS_UPDATED',
      'settings',
      'global',
      `Updated thresholds: ${JSON.stringify(partial)}`
    );
    pushToast({
      title: 'Safety & Matching Settings Saved',
      description: 'New rules apply immediately to incoming donations.',
      variant: 'success',
    });
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  return (
    <MockStoreContext.Provider
      value={{
        currentUser,
        switchRole,
        items,
        organizations,
        needs,
        matches,
        pickups,
        auditLog,
        settings,
        notifications,
        toasts,
        pushToast,
        dismissToast,
        evaluateEligibility,
        createDonationItem,
        cancelDonationItem,
        reviewItemDecision,
        createNeed,
        respondToMatch,
        schedulePickup,
        advancePickupStatus,
        verifyOrganization,
        updateSettings,
        markAllNotificationsRead,
        uploadOcrPhoto,
      }}
    >
      {children}
    </MockStoreContext.Provider>
  );
};

export const useMockStore = () => {
  const ctx = useContext(MockStoreContext);
  if (!ctx) throw new Error('useMockStore must be used inside MockStoreProvider');
  return ctx;
};
