export type UserRole = 'donor' | 'pharmacist' | 'ngo' | 'admin';

export type ItemStatus =
  | 'LISTED'
  | 'AUTO_BLOCKED'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'MATCHED'
  | 'ACCEPTED'
  | 'PICKUP_SCHEDULED'
  | 'PICKED_UP'
  | 'DELIVERED'
  | 'RECEIVED'
  | 'CANCELLED'
  | 'EXPIRED';

export type MedicineForm =
  | 'tablet'
  | 'capsule'
  | 'syrup'
  | 'ointment'
  | 'drops'
  | 'inhaler'
  | 'powder'
  | 'other';

export type RejectReasonCode =
  | 'EXPIRY_UNREADABLE'
  | 'BATCH_UNREADABLE'
  | 'DAMAGED_PACK'
  | 'OPENED_PACK'
  | 'NOT_ALLOWED_TYPE'
  | 'SUSPECTED_TAMPERING'
  | 'SHORT_SHELF_LIFE'
  | 'OTHER';

export interface EligibilityRuleResult {
  rule: string;
  passed: boolean;
  severity: 'hard' | 'soft';
  message: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  city: string;
  org_id?: string;
  org_name?: string;
  org_verified?: boolean;
}

export interface Organization {
  id: string;
  name: string;
  type: 'ngo' | 'clinic' | 'pharmacy';
  license_no: string;
  verified: boolean;
  verified_at?: string;
  verification_note?: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  contact_phone: string;
  created_at: string;
}

export interface DonationItem {
  id: string;
  donation_id: string;
  donor_id: string;
  donor_name: string;
  medicine_name: string;
  generic_name: string;
  strength: string;
  form: MedicineForm;
  quantity: number;
  batch_no: string;
  expiry_date: string;
  est_value: number;
  is_rx_only: boolean;
  declaration_sealed: boolean;
  declaration_room_temp: boolean;
  status: ItemStatus;
  ocr_text?: string;
  ocr_confidence?: number;
  auto_check_result: EligibilityRuleResult[];
  reviewer_id?: string;
  reviewer_name?: string;
  reviewed_at?: string;
  reject_reason_code?: RejectReasonCode;
  reject_note?: string;
  verification_code?: string;
  pickup_address: string;
  pickup_window?: string;
  lat: number;
  lng: number;
  created_at: string;
  updated_at: string;
}

export interface Need {
  id: string;
  org_id: string;
  org_name: string;
  medicine_name: string;
  generic_name: string;
  strength: string;
  quantity_needed: number;
  quantity_remaining: number;
  urgency: 'low' | 'medium' | 'high';
  status: 'open' | 'partially_fulfilled' | 'fulfilled' | 'cancelled';
  created_at: string;
}

export interface ScoreBreakdown {
  medicine_score: number;
  medicine_reason: string;
  distance_score: number;
  distance_km: number;
  urgency_score: number;
  urgency_level: 'low' | 'medium' | 'high';
}

export interface MatchSuggestion {
  id: string;
  item_id: string;
  need_id: string;
  org_id: string;
  org_name: string;
  medicine_name: string;
  generic_name: string;
  strength: string;
  form: MedicineForm;
  quantity_allocated: number;
  expiry_date: string;
  batch_no: string;
  verification_code?: string;
  pickup_address: string;
  score: number;
  score_breakdown: ScoreBreakdown;
  status: 'suggested' | 'accepted' | 'declined' | 'expired' | 'cancelled' | 'completed';
  expires_at: string;
  created_at: string;
}

export interface PickupRecord {
  id: string;
  match_id: string;
  item_id: string;
  medicine_name: string;
  strength: string;
  quantity: number;
  donor_name: string;
  pickup_address: string;
  org_name: string;
  volunteer_name: string;
  volunteer_phone: string;
  scheduled_at: string;
  status: 'scheduled' | 'picked_up' | 'delivered' | 'received' | 'failed';
  verification_code?: string;
  notes?: string;
  updated_at: string;
}

export interface AuditEntry {
  id: number;
  actor_name: string;
  actor_role: UserRole | 'system';
  action: string;
  entity: string;
  entity_id: string;
  details: string;
  created_at: string;
}

export interface AppSettings {
  min_shelf_life_months: number;
  match_expiry_hours: number;
  max_distance_km: number;
  ocr_low_confidence: number;
  quantity_unusual_limit: number;
}

export interface NotificationItem {
  id: string;
  user_role: UserRole | 'all';
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  created_at: string;
}
