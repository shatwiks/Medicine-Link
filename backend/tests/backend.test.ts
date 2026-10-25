import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { SqliteDatabase, setDbForTesting } from '../src/db/connection';
import { seedDatabase } from '../src/db/seed';
import { runExpiryCheckJob, runMatchExpiryJob } from '../src/jobs/jobs';
import { transitionItemStatus } from '../src/modules/donations/stateMachine';
import { calculateMatchScore } from '../src/modules/matching/service';
import { extractFieldsFromOcrText } from '../src/modules/ocr/service';

let db: SqliteDatabase;
const app = createApp();

beforeEach(() => {
  db = new SqliteDatabase(':memory:');
  db.pragma('foreign_keys = ON');
  setDbForTesting(db);
  seedDatabase(db);
});

describe('1. Database Acceptance Checklist (Database PRD Section 12)', () => {
  it('enforces CHECK constraints on status, positive quantity, and expiry_date format', () => {
    // Invalid status
    expect(() => {
      db.prepare(
        `INSERT INTO donation_items (id, donation_id, medicine_name, form, quantity, status)
         VALUES ('bad-1', 'don-seed-1', 'TestMed', 'tablet', 10, 'INVALID_STATUS')`
      ).run();
    }).toThrow();

    // Negative quantity
    expect(() => {
      db.prepare(
        `INSERT INTO donation_items (id, donation_id, medicine_name, form, quantity, status)
         VALUES ('bad-2', 'don-seed-1', 'TestMed', 'tablet', -5, 'LISTED')`
      ).run();
    }).toThrow();

    // Invalid expiry date format (not YYYY-MM-DD)
    expect(() => {
      db.prepare(
        `INSERT INTO donation_items (id, donation_id, medicine_name, form, quantity, expiry_date, status)
         VALUES ('bad-3', 'don-seed-1', 'TestMed', 'tablet', 10, '12/2028', 'LISTED')`
      ).run();
    }).toThrow();
  });

  it('enforces partial unique index ux_matches_one_accepted (first accept wins)', () => {
    db.prepare(
      `INSERT INTO matches (id, item_id, need_id, org_id, score, score_breakdown, quantity_allocated, status)
       VALUES ('m-test-1', 'itm-approved-1', 'need-seed-1', 'org-ngo-1', 90, '{}', 10, 'accepted')`
    ).run();

    expect(() => {
      db.prepare(
        `INSERT INTO matches (id, item_id, need_id, org_id, score, score_breakdown, quantity_allocated, status)
         VALUES ('m-test-2', 'itm-approved-1', 'need-seed-3', 'org-clinic-1', 85, '{}', 10, 'accepted')`
      ).run();
    }).toThrow();
  });

  it('prevents UPDATE and DELETE on audit_log via triggers', () => {
    db.prepare(
      `INSERT INTO audit_log (actor_id, actor_role, action, entity, entity_id)
       VALUES ('usr-admin-1', 'admin', 'TEST_ACTION', 'system', '1')`
    ).run();

    const row = db.prepare('SELECT id FROM audit_log LIMIT 1').get() as { id: number };
    expect(row).toBeDefined();

    expect(() => {
      db.prepare("UPDATE audit_log SET action = 'HACKED' WHERE id = ?").run(row.id);
    }).toThrow(/audit_log is append-only/);

    expect(() => {
      db.prepare('DELETE FROM audit_log WHERE id = ?').run(row.id);
    }).toThrow(/audit_log is append-only/);
  });
});

describe('2. Fifteen Eligibility Seed Cases (Database PRD Section 8 & Backend PRD Section 6)', () => {
  it('evaluates all 15 seed cases to their exact expected status and flags', () => {
    const getCase = (n: number) => {
      const row = db
        .prepare('SELECT status, auto_check_result FROM donation_items WHERE id = ?')
        .get(`itm-seed-${n}`) as { status: string; auto_check_result: string };
      return {
        status: row.status,
        checks: JSON.parse(row.auto_check_result) as {
          rule: string;
          passed: boolean;
          severity: string;
        }[],
      };
    };

    expect(getCase(1).status).toBe('PENDING_REVIEW');

    const c2 = getCase(2);
    expect(c2.status).toBe('PENDING_REVIEW');
    expect(c2.checks.find((r) => r.rule === 'RX_ONLY')?.passed).toBe(false);

    expect(getCase(3).status).toBe('PENDING_REVIEW');

    const c4 = getCase(4);
    expect(c4.status).toBe('AUTO_BLOCKED');
    expect(c4.checks.find((r) => r.rule === 'MIN_SHELF_LIFE')?.passed).toBe(false);

    const c5 = getCase(5);
    expect(c5.status).toBe('AUTO_BLOCKED');
    expect(c5.checks.find((r) => r.rule === 'NOT_EXPIRED')?.passed).toBe(false);

    const c6 = getCase(6);
    expect(c6.status).toBe('AUTO_BLOCKED');
    expect(c6.checks.find((r) => r.rule === 'NOT_BLOCKED')?.passed).toBe(false);

    const c7 = getCase(7);
    expect(c7.status).toBe('AUTO_BLOCKED');
    expect(c7.checks.find((r) => r.rule === 'FORM_ALLOWED')?.passed).toBe(false);

    const c8 = getCase(8);
    expect(c8.status).toBe('AUTO_BLOCKED');
    expect(c8.checks.find((r) => r.rule === 'NOT_BLOCKED')?.passed).toBe(false);

    const c9 = getCase(9);
    expect(c9.status).toBe('AUTO_BLOCKED');
    expect(c9.checks.find((r) => r.rule === 'BATCH_PRESENT')?.passed).toBe(false);

    const c10 = getCase(10);
    expect(c10.status).toBe('AUTO_BLOCKED');
    expect(c10.checks.find((r) => r.rule === 'EXPIRY_PRESENT')?.passed).toBe(false);

    const c11 = getCase(11);
    expect(c11.status).toBe('AUTO_BLOCKED');
    expect(c11.checks.find((r) => r.rule === 'SEALED_DECLARED')?.passed).toBe(false);

    const c12 = getCase(12);
    expect(c12.status).toBe('PENDING_REVIEW');
    expect(c12.checks.find((r) => r.rule === 'LOW_OCR_CONFIDENCE')?.passed).toBe(false);

    const c13 = getCase(13);
    expect(c13.status).toBe('PENDING_REVIEW');
    expect(c13.checks.find((r) => r.rule === 'DUPLICATE_BATCH')?.passed).toBe(false);

    const c14 = getCase(14);
    expect(c14.status).toBe('PENDING_REVIEW');
    expect(c14.checks.find((r) => r.rule === 'QUANTITY_UNUSUAL')?.passed).toBe(false);

    expect(getCase(15).status).toBe('PENDING_REVIEW');
  });
});

describe('3. State Machine & Matching Scoring (Backend PRD Sections 5 & 8)', () => {
  it('rejects disallowed state transitions with 409 INVALID_STATE', () => {
    expect(() => {
      transitionItemStatus(
        {
          itemId: 'itm-seed-1', // Currently PENDING_REVIEW
          toStatus: 'RECEIVED', // Cannot jump directly to RECEIVED
          actorId: 'usr-admin-1',
          actorRole: 'admin',
        },
        db
      );
    }).toThrow(/not allowed/);
  });

  it('calculates exact 0-100 scores across medicine, distance, and urgency', () => {
    // Exact generic + strength (50) + <=3km (30) + high urgency (20) = 100
    const score1 = calculateMatchScore({
      itemGenericName: 'paracetamol',
      itemStrength: '500 mg',
      donorLat: 12.9719,
      donorLng: 77.6412,
      needGenericName: 'paracetamol',
      needStrength: '500 mg',
      orgLat: 12.9784,
      orgLng: 77.6408,
      urgency: 'high',
      maxDistanceKm: 25,
    });
    expect(score1?.total).toBe(100);

    // Same generic, different strength (20) + 3-10km (22) + low urgency (5) = 47
    const score2 = calculateMatchScore({
      itemGenericName: 'paracetamol',
      itemStrength: '650 mg',
      donorLat: 12.9719,
      donorLng: 77.6412,
      needGenericName: 'paracetamol',
      needStrength: '500 mg',
      orgLat: 12.9352,
      orgLng: 77.6245,
      urgency: 'low',
      maxDistanceKm: 25,
    });
    expect(score2?.medicine_score).toBe(20);
    expect(score2?.distance_score).toBe(22);
    expect(score2?.urgency_score).toBe(5);
    expect(score2?.total).toBe(47);
  });
});

describe('4. Background Jobs Idempotency & OCR Regex Extraction', () => {
  it('runs expiry and match expiry jobs twice idempotently', () => {
    // Insert an approved item expiring in 2 months
    db.prepare(
      `INSERT INTO donation_items (
        id, donation_id, medicine_name, generic_name, strength, form, quantity,
        batch_no, expiry_date, status
      ) VALUES ('itm-exp-soon', 'don-extra-1', 'Paracetamol', 'paracetamol', '500 mg', 'tablet', 10, 'B1', '2026-12-01', 'APPROVED')`
    ).run();

    const firstRun = runExpiryCheckJob(db);
    expect(firstRun).toBe(1);

    const secondRun = runExpiryCheckJob(db);
    expect(secondRun).toBe(0);

    // Match expiry idempotency
    const mFirst = runMatchExpiryJob(db);
    const mSecond = runMatchExpiryJob(db);
    expect(mFirst).toBe(0);
    expect(mSecond).toBe(0);
  });

  it('extracts expiry date and batch number on at least 8 of 10 sample OCR strings', () => {
    const samples = [
      { text: 'DOLO 650 B.No. DL8842K EXP 04/2028', exp: '2028-04-30', batch: 'DL8842K' },
      { text: 'MOX 500 Batch No: MX2094A Expiry: 08/2027', exp: '2027-08-31', batch: 'MX2094A' },
      { text: 'GLYCOMET B.No GL4412M Use before 15/09/2027', exp: '2027-09-15', batch: 'GL4412M' },
      { text: 'PAN 40 LOT: PN7731B EXP NOV 2027', exp: '2027-11-30', batch: 'PN7731B' },
      { text: 'LIMCEE Batch: LM5582C Exp Date: 01-2028', exp: '2028-01-31', batch: 'LM5582C' },
      { text: 'ZYRTEC B.No: ZR1049 EXP 02/28', exp: '2028-02-29', batch: 'ZR1049' },
      { text: 'AZITHRAL 500 BATCH AZ1902 EXP AUG 27', exp: '2027-08-31', batch: 'AZ1902' },
      { text: 'CROCIN PAIN RELIEF B.No CR901 EXP 12/2027', exp: '2027-12-31', batch: 'CR901' },
      { text: 'OMEZ 20 Lot No OM442 Expiry 06/2028', exp: '2028-06-30', batch: 'OM442' },
      { text: 'BRUFEN 400 B.No BR112 EXP 10/2027', exp: '2027-10-31', batch: 'BR112' },
    ];

    let correctCount = 0;
    for (const s of samples) {
      const res = extractFieldsFromOcrText(s.text);
      if (res.expiry_date === s.exp && res.batch_no === s.batch) {
        correctCount++;
      }
    }
    expect(correctCount).toBeGreaterThanOrEqual(8);
  });
});

describe('5. End-to-End API Flow & RBAC Verification (Backend PRD Section 15)', () => {
  it('blocks unverified NGOs from posting needs and completes full E2E lifecycle from donor listing to NGO receipt', async () => {
    // 1. Unverified NGO login -> forbidden from posting needs
    const unverifiedLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'sanjay@hopehelpers.demo.org', password: 'Demo@1234' });
    expect(unverifiedLogin.status).toBe(200);
    const unverifiedToken = unverifiedLogin.body.data.accessToken;

    const blockedNeedRes = await request(app)
      .post('/api/v1/needs')
      .set('Authorization', `Bearer ${unverifiedToken}`)
      .send({ medicine_name: 'Paracetamol', strength: '500 mg', quantity_needed: 20, urgency: 'high' });
    expect(blockedNeedRes.status).toBe(403);

    // 2. Donor login & create donation with a valid Paracetamol pack
    const donorLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'aarav.donor@demo.medicinelink.org', password: 'Demo@1234' });
    const donorToken = donorLogin.body.data.accessToken;

    const createDonRes = await request(app)
      .post('/api/v1/donations')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        pickup_address: '14 Indiranagar, Bengaluru',
        lat: 12.9719,
        lng: 77.6412,
        declaration_sealed: true,
        declaration_room_temp: true,
        items: [
          {
            medicine_name: 'Dolo (Paracetamol)',
            strength: '500 mg',
            form: 'tablet',
            quantity: 25,
            batch_no: 'E2E-BATCH-99',
            expiry_date: '2028-05-31',
            is_rx_only: false,
            ocr_confidence: 0.95,
          },
        ],
      });
    expect(createDonRes.status).toBe(201);
    const createdItem = createDonRes.body.data.items[0];
    expect(createdItem.status).toBe('PENDING_REVIEW');

    // 3. Pharmacist login & approve the item -> generates verification code + triggers matching
    const pharmLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'meera.rx@greencross.demo.org', password: 'Demo@1234' });
    const pharmToken = pharmLogin.body.data.accessToken;

    const reviewRes = await request(app)
      .post(`/api/v1/review/items/${createdItem.id}/decision`)
      .set('Authorization', `Bearer ${pharmToken}`)
      .send({ decision: 'approve', note: 'Clear foil stamp and intact blister.' });
    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.data.item.verification_code).toMatch(/^ML-VER-/);
    expect(reviewRes.body.data.item.status).toBe('MATCHED');

    // 4. Verified NGO login -> sees match suggestion and accepts it
    const ngoLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'rohan@ashahealth.demo.org', password: 'Demo@1234' });
    const ngoToken = ngoLogin.body.data.accessToken;

    const matchesRes = await request(app)
      .get('/api/v1/matches')
      .set('Authorization', `Bearer ${ngoToken}`);
    expect(matchesRes.status).toBe(200);
    const targetMatch = matchesRes.body.data.matches.find(
      (m: any) => m.item_id === createdItem.id
    );
    expect(targetMatch).toBeDefined();
    expect(targetMatch.score).toBe(100);

    const acceptRes = await request(app)
      .post(`/api/v1/matches/${targetMatch.id}/respond`)
      .set('Authorization', `Bearer ${ngoToken}`)
      .send({ response: 'accept' });
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.match.status).toBe('accepted');

    // 5. Schedule pickup -> mark picked_up -> mark delivered -> confirm received
    const pickupRes = await request(app)
      .post('/api/v1/pickups')
      .set('Authorization', `Bearer ${ngoToken}`)
      .send({
        match_id: targetMatch.id,
        volunteer_name: 'Karthik Volunteer',
        volunteer_phone: '+91 98800 00000',
        scheduled_at: '2026-10-26T10:00:00Z',
      });
    expect(pickupRes.status).toBe(201);
    const pickupId = pickupRes.body.data.pickup.id;

    await request(app)
      .patch(`/api/v1/pickups/${pickupId}`)
      .set('Authorization', `Bearer ${ngoToken}`)
      .send({ status: 'picked_up' })
      .expect(200);

    await request(app)
      .patch(`/api/v1/pickups/${pickupId}`)
      .set('Authorization', `Bearer ${ngoToken}`)
      .send({ status: 'delivered' })
      .expect(200);

    const confirmRes = await request(app)
      .post(`/api/v1/pickups/${pickupId}/confirm-received`)
      .set('Authorization', `Bearer ${ngoToken}`)
      .send({ notes: 'Received intact with QR code verified.' });
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.item.status).toBe('RECEIVED');

    // 6. Verify dashboard stats & admin audit trail
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@medicinelink.demo.org', password: 'Demo@1234' });
    const adminToken = adminLogin.body.data.accessToken;

    const statsRes = await request(app)
      .get('/api/v1/dashboard/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(statsRes.status).toBe(200);
    expect(statsRes.body.data.byStatus.RECEIVED).toBeGreaterThanOrEqual(2);

    const auditRes = await request(app)
      .get('/api/v1/admin/audit')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data.audit.length).toBeGreaterThan(5);

    // 7. Verify /api/v1/state/sync returns full hydrated SQLite state
    const syncRes = await request(app)
      .get('/api/v1/state/sync')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(syncRes.status).toBe(200);
    expect(syncRes.body.data.items.length).toBeGreaterThanOrEqual(19);
    expect(syncRes.body.data.organizations.length).toBe(4);

    // 8. Verify Refresh Token Reuse Detection revokes all sessions on replay of rotated token
    const stolenRefreshToken = donorLogin.body.data.refreshToken;
    const firstRefresh = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: stolenRefreshToken });
    expect(firstRefresh.status).toBe(200);

    // Replaying the already-rotated refresh token must fail with 401 and revoke the newly rotated token too
    const replayRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: stolenRefreshToken });
    expect(replayRes.status).toBe(401);
    expect(replayRes.body.error.message).toMatch(/reuse detected/i);

    const legitimateNextRefresh = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: firstRefresh.body.data.refreshToken });
    expect(legitimateNextRefresh.status).toBe(401);
  });
});
