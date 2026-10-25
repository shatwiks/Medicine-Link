import bcrypt from 'bcryptjs';
import { getDb, SqliteDatabase } from './connection';
import { runMigrations } from './migrate';
import { addDaysToDateString } from '../utils/dates';
import { runEligibilityEngine } from '../modules/eligibility/engine';

export function seedDatabase(db: SqliteDatabase = getDb()): void {
  runMigrations(db);

  const passwordHash = bcrypt.hashSync('Demo@1234', 10);

  const tx = db.transaction(() => {
    // 1. Insert Admin first (so verified_by can reference admin)
    db.prepare(
      `INSERT OR REPLACE INTO users (id, name, email, password_hash, role, phone, city, org_id, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 1)`
    ).run(
      'usr-admin-1',
      'Priya Krishnan (Admin)',
      'admin@medicinelink.demo.org',
      passwordHash,
      'admin',
      '+91 98201 99000',
      'Bengaluru'
    );

    // 2. Organizations (Section 8)
    const orgs = [
      {
        id: 'org-ngo-1',
        name: 'Asha Health Foundation',
        type: 'ngo',
        license_no: 'NGO-KA-2021-8841',
        verified: 1,
        verified_by: 'usr-admin-1',
        verified_at: new Date().toISOString(),
        verification_note: 'Verified 12A/80G registration',
        address: '42 Indiranagar 100ft Road, Bengaluru',
        city: 'Bengaluru',
        lat: 12.9784,
        lng: 77.6408,
        contact_phone: '+91 98201 77889',
      },
      {
        id: 'org-clinic-1',
        name: 'Care Street Clinic',
        type: 'clinic',
        license_no: 'KPME-BLR-44910',
        verified: 1,
        verified_by: 'usr-admin-1',
        verified_at: new Date().toISOString(),
        verification_note: 'Verified KPME clinic license',
        address: '18 Koramangala 4th Block, Bengaluru',
        city: 'Bengaluru',
        lat: 12.9352,
        lng: 77.6245,
        contact_phone: '+91 98450 22334',
      },
      {
        id: 'org-pharm-1',
        name: 'GreenCross Pharmacy',
        type: 'pharmacy',
        license_no: 'DL-KA-BLR-20B-99201',
        verified: 1,
        verified_by: 'usr-admin-1',
        verified_at: new Date().toISOString(),
        verification_note: 'Form 20/21 verified',
        address: '105 MG Road, Bengaluru',
        city: 'Bengaluru',
        lat: 12.9756,
        lng: 77.6066,
        contact_phone: '+91 98201 44556',
      },
      {
        id: 'org-ngo-2',
        name: 'Hope Helpers',
        type: 'ngo',
        license_no: 'NGO-KA-2025-1192',
        verified: 0,
        verified_by: null,
        verified_at: null,
        verification_note: null,
        address: '77 Jayanagar 3rd Block, Bengaluru',
        city: 'Bengaluru',
        lat: 12.9308,
        lng: 77.5838,
        contact_phone: '+91 99001 55667',
      },
    ];

    for (const o of orgs) {
      db.prepare(
        `INSERT OR REPLACE INTO organizations (
          id, name, type, license_no, verified, verified_by, verified_at,
          verification_note, address, city, lat, lng, contact_phone
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        o.id,
        o.name,
        o.type,
        o.license_no,
        o.verified,
        o.verified_by,
        o.verified_at,
        o.verification_note,
        o.address,
        o.city,
        o.lat,
        o.lng,
        o.contact_phone
      );
    }

    // 3. Users (2 donors, 2 pharmacists, 1 NGO user at Asha, 1 clinic user at Care Street, 1 unverified NGO user at Hope Helpers)
    const users = [
      {
        id: 'usr-donor-1',
        name: 'Aarav Sharma',
        email: 'aarav.donor@demo.medicinelink.org',
        role: 'donor',
        phone: '+91 98201 11223',
        city: 'Bengaluru',
        org_id: null,
      },
      {
        id: 'usr-donor-2',
        name: 'Neha Verma',
        email: 'neha.donor@demo.medicinelink.org',
        role: 'donor',
        phone: '+91 98201 22334',
        city: 'Bengaluru',
        org_id: null,
      },
      {
        id: 'usr-pharm-1',
        name: 'Dr. Meera Nair (RPh)',
        email: 'meera.rx@greencross.demo.org',
        role: 'pharmacist',
        phone: '+91 98201 44556',
        city: 'Bengaluru',
        org_id: 'org-pharm-1',
      },
      {
        id: 'usr-pharm-2',
        name: 'Dr. Vivek Kulkarni (RPh)',
        email: 'vivek.rx@greencross.demo.org',
        role: 'pharmacist',
        phone: '+91 98201 44557',
        city: 'Bengaluru',
        org_id: 'org-pharm-1',
      },
      {
        id: 'usr-ngo-1',
        name: 'Rohan Deshmukh',
        email: 'rohan@ashahealth.demo.org',
        role: 'ngo',
        phone: '+91 98201 77889',
        city: 'Bengaluru',
        org_id: 'org-ngo-1',
      },
      {
        id: 'usr-clinic-1',
        name: 'Dr. Ananya Rao',
        email: 'ananya@carestreet.demo.org',
        role: 'ngo',
        phone: '+91 98450 22334',
        city: 'Bengaluru',
        org_id: 'org-clinic-1',
      },
      {
        id: 'usr-ngo-unverified',
        name: 'Sanjay Mehta',
        email: 'sanjay@hopehelpers.demo.org',
        role: 'ngo',
        phone: '+91 99001 55667',
        city: 'Bengaluru',
        org_id: 'org-ngo-2',
      },
    ];

    for (const u of users) {
      db.prepare(
        `INSERT OR REPLACE INTO users (id, name, email, password_hash, role, phone, city, org_id, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
      ).run(u.id, u.name, u.email, passwordHash, u.role, u.phone, u.city, u.org_id);
    }

    // Clear existing demo donations, needs, matches, pickups so seed is idempotent
    db.prepare('DELETE FROM pickups').run();
    db.prepare('DELETE FROM matches').run();
    db.prepare('DELETE FROM item_photos').run();
    db.prepare('DELETE FROM donation_items').run();
    db.prepare('DELETE FROM donations').run();
    db.prepare('DELETE FROM needs').run();

    // 4. Create the 15 Eligibility Test Items (Database PRD Section 8)
    const now = new Date();
    const mDate = (months: number) => addDaysToDateString(Math.round(months * 30.5), now);

    const fifteenCases = [
      {
        caseNo: 1,
        medicine_name: 'Paracetamol',
        strength: '500 mg',
        form: 'tablet',
        quantity: 30,
        batch_no: 'PARA-BATCH-01',
        expiry_date: mDate(18),
        is_rx_only: false,
        sealed: true,
        room_temp: true,
        ocr_confidence: 0.95,
      },
      {
        caseNo: 2,
        medicine_name: 'Amoxicillin',
        strength: '500 mg',
        form: 'capsule',
        quantity: 20,
        batch_no: 'AMOX-BATCH-02',
        expiry_date: mDate(10),
        is_rx_only: true,
        sealed: true,
        room_temp: true,
        ocr_confidence: 0.91,
      },
      {
        caseNo: 3,
        medicine_name: 'Metformin',
        strength: '500 mg',
        form: 'tablet',
        quantity: 30,
        batch_no: 'MET-BATCH-03',
        expiry_date: mDate(7),
        is_rx_only: false,
        sealed: true,
        room_temp: true,
        ocr_confidence: 0.92,
      },
      {
        caseNo: 4,
        medicine_name: 'Cetirizine',
        strength: '10 mg',
        form: 'tablet',
        quantity: 10,
        batch_no: 'CET-BATCH-04',
        expiry_date: mDate(5),
        is_rx_only: false,
        sealed: true,
        room_temp: true,
        ocr_confidence: 0.9,
      },
      {
        caseNo: 5,
        medicine_name: 'Azithromycin',
        strength: '500 mg',
        form: 'tablet',
        quantity: 6,
        batch_no: 'AZI-BATCH-05',
        expiry_date: mDate(-2),
        is_rx_only: true,
        sealed: true,
        room_temp: true,
        ocr_confidence: 0.89,
      },
      {
        caseNo: 6,
        medicine_name: 'Insulin pen',
        strength: '100 IU/ml',
        form: 'other',
        quantity: 1,
        batch_no: 'INS-BATCH-06',
        expiry_date: mDate(12),
        is_rx_only: true,
        sealed: true,
        room_temp: true,
        ocr_confidence: 0.9,
      },
      {
        caseNo: 7,
        medicine_name: 'Ceftriaxone injection',
        strength: '1 g',
        form: 'other',
        quantity: 2,
        batch_no: 'CEF-BATCH-07',
        expiry_date: mDate(12),
        is_rx_only: true,
        sealed: true,
        room_temp: true,
        ocr_confidence: 0.88,
      },
      {
        caseNo: 8,
        medicine_name: 'Tramadol',
        strength: '50 mg',
        form: 'tablet',
        quantity: 10,
        batch_no: 'TRA-BATCH-08',
        expiry_date: mDate(12),
        is_rx_only: true,
        sealed: true,
        room_temp: true,
        ocr_confidence: 0.93,
      },
      {
        caseNo: 9,
        medicine_name: 'Ibuprofen',
        strength: '400 mg',
        form: 'tablet',
        quantity: 15,
        batch_no: null,
        expiry_date: mDate(12),
        is_rx_only: false,
        sealed: true,
        room_temp: true,
        ocr_confidence: 0.85,
      },
      {
        caseNo: 10,
        medicine_name: 'Omeprazole',
        strength: '20 mg',
        form: 'capsule',
        quantity: 15,
        batch_no: 'OME-BATCH-10',
        expiry_date: null,
        is_rx_only: false,
        sealed: true,
        room_temp: true,
        ocr_confidence: 0.85,
      },
      {
        caseNo: 11,
        medicine_name: 'Paracetamol',
        strength: '650 mg',
        form: 'tablet',
        quantity: 15,
        batch_no: 'PARA-UNSEALED-11',
        expiry_date: mDate(12),
        is_rx_only: false,
        sealed: false,
        room_temp: true,
        ocr_confidence: 0.9,
      },
      {
        caseNo: 12,
        medicine_name: 'Cough syrup',
        strength: '100 ml',
        form: 'syrup',
        quantity: 1,
        batch_no: 'SYR-BATCH-12',
        expiry_date: mDate(9),
        is_rx_only: false,
        sealed: true,
        room_temp: true,
        ocr_confidence: 0.45,
      },
      {
        caseNo: 13,
        medicine_name: 'Paracetamol',
        strength: '500 mg',
        form: 'tablet',
        quantity: 30,
        batch_no: 'PARA-BATCH-01', // Duplicate of case 1
        expiry_date: mDate(18),
        is_rx_only: false,
        sealed: true,
        room_temp: true,
        ocr_confidence: 0.94,
      },
      {
        caseNo: 14,
        medicine_name: 'Vitamin C',
        strength: '500 mg',
        form: 'tablet',
        quantity: 500, // Above quantity_unusual_limit (100)
        batch_no: 'VITC-BATCH-14',
        expiry_date: mDate(14),
        is_rx_only: false,
        sealed: true,
        room_temp: true,
        ocr_confidence: 0.92,
      },
      {
        caseNo: 15,
        medicine_name: 'Pantoprazole',
        strength: '40 mg',
        form: 'tablet',
        quantity: 20,
        batch_no: 'PAN-BATCH-15',
        expiry_date: addDaysToDateString(183, now), // Boundary: 6 months
        is_rx_only: false,
        sealed: true,
        room_temp: true,
        ocr_confidence: 0.93,
      },
    ];

    for (const c of fifteenCases) {
      const donId = `don-seed-${c.caseNo}`;
      const itemId = `itm-seed-${c.caseNo}`;

      db.prepare(
        `INSERT INTO donations (
          id, donor_id, pickup_address, lat, lng,
          declaration_sealed, declaration_room_temp, status
        ) VALUES (?, 'usr-donor-1', '14 HAL 2nd Stage, Indiranagar, Bengaluru', 12.9719, 77.6412, ?, ?, ?)`
      ).run(donId, c.sealed ? 1 : 0, c.room_temp ? 1 : 0, 'open');

      const evalRes = runEligibilityEngine(
        {
          itemId,
          medicineName: c.medicine_name,
          strength: c.strength,
          form: c.form,
          quantity: c.quantity,
          batchNo: c.batch_no,
          expiryDate: c.expiry_date,
          isRxOnly: c.is_rx_only,
          declarationSealed: c.sealed,
          declarationRoomTemp: c.room_temp,
          ocrConfidence: c.ocr_confidence,
        },
        db
      );

      const itemStatus = evalRes.passedHardRules ? 'PENDING_REVIEW' : 'AUTO_BLOCKED';

      db.prepare(
        `INSERT INTO donation_items (
          id, donation_id, medicine_name, generic_name, strength, form,
          quantity, batch_no, expiry_date, est_value, is_rx_only,
          status, ocr_confidence, auto_check_result
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        itemId,
        donId,
        c.medicine_name,
        evalRes.genericName,
        c.strength,
        c.form,
        c.quantity,
        c.batch_no,
        c.expiry_date,
        c.quantity * 5,
        c.is_rx_only ? 1 : 0,
        itemStatus,
        c.ocr_confidence,
        JSON.stringify(evalRes.results)
      );
    }

    // 5. Four Open Needs (Database PRD Section 8)
    const seedNeeds = [
      {
        id: 'need-seed-1',
        org_id: 'org-ngo-1',
        created_by: 'usr-ngo-1',
        medicine_name: 'Paracetamol',
        generic_name: 'paracetamol',
        strength: '500 mg',
        quantity_needed: 100,
        quantity_remaining: 100,
        urgency: 'high',
      },
      {
        id: 'need-seed-2',
        org_id: 'org-ngo-1',
        created_by: 'usr-ngo-1',
        medicine_name: 'Metformin',
        generic_name: 'metformin',
        strength: '500 mg',
        quantity_needed: 80,
        quantity_remaining: 80,
        urgency: 'medium',
      },
      {
        id: 'need-seed-3',
        org_id: 'org-clinic-1',
        created_by: 'usr-clinic-1',
        medicine_name: 'Amoxicillin',
        generic_name: 'amoxicillin',
        strength: '500 mg',
        quantity_needed: 60,
        quantity_remaining: 60,
        urgency: 'low',
      },
      {
        id: 'need-seed-4',
        org_id: 'org-clinic-1',
        created_by: 'usr-clinic-1',
        medicine_name: 'Cetirizine',
        generic_name: 'cetirizine',
        strength: '10 mg',
        quantity_needed: 50,
        quantity_remaining: 50,
        urgency: 'medium',
      },
    ];

    for (const n of seedNeeds) {
      db.prepare(
        `INSERT INTO needs (
          id, org_id, created_by, medicine_name, generic_name,
          strength, quantity_needed, quantity_remaining, urgency, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')`
      ).run(
        n.id,
        n.org_id,
        n.created_by,
        n.medicine_name,
        n.generic_name,
        n.strength,
        n.quantity_needed,
        n.quantity_remaining,
        n.urgency
      );
    }

    // 6. Extra items at APPROVED, MATCHED, RECEIVED, and REJECTED so dashboard has rich initial numbers
    db.prepare(
      `INSERT INTO donations (id, donor_id, pickup_address, lat, lng, declaration_sealed, declaration_room_temp, status)
       VALUES ('don-extra-1', 'usr-donor-1', '14 HAL 2nd Stage, Indiranagar, Bengaluru', 12.9719, 77.6412, 1, 1, 'open')`
    ).run();

    db.prepare(
      `INSERT INTO donation_items (
        id, donation_id, medicine_name, generic_name, strength, form, quantity,
        batch_no, expiry_date, est_value, is_rx_only, status, reviewer_id, reviewed_at, verification_code, auto_check_result
      ) VALUES (
        'itm-approved-1', 'don-extra-1', 'Pantocid 40', 'pantoprazole', '40 mg', 'tablet', 30,
        'PN-901', ?, 240, 0, 'APPROVED', 'usr-pharm-1', ?, 'ML-VER-1001', '[]'
      )`
    ).run(mDate(14), new Date().toISOString());

    db.prepare(
      `INSERT INTO donation_items (
        id, donation_id, medicine_name, generic_name, strength, form, quantity,
        batch_no, expiry_date, est_value, is_rx_only, status, reviewer_id, reviewed_at, verification_code, auto_check_result
      ) VALUES (
        'itm-matched-1', 'don-extra-1', 'Glycomet 500', 'metformin', '500 mg', 'tablet', 40,
        'GL-902', ?, 180, 1, 'MATCHED', 'usr-pharm-1', ?, 'ML-VER-1002', '[]'
      )`
    ).run(mDate(12), new Date().toISOString());

    db.prepare(
      `INSERT INTO matches (
        id, item_id, need_id, org_id, score, score_breakdown, quantity_allocated, status, expires_at
      ) VALUES (
        'mtc-seed-1', 'itm-matched-1', 'need-seed-2', 'org-ngo-1', 92,
        '{"medicine_score":50,"distance_score":30,"distance_km":1.4,"urgency_score":12,"total":92}',
        40, 'suggested', ?
      )`
    ).run(addDaysToDateString(2, now) + 'T12:00:00.000Z');

    db.prepare(
      `INSERT INTO donation_items (
        id, donation_id, medicine_name, generic_name, strength, form, quantity,
        batch_no, expiry_date, est_value, is_rx_only, status, reviewer_id, reviewed_at, verification_code, auto_check_result
      ) VALUES (
        'itm-received-1', 'don-extra-1', 'Limcee 500', 'vitamin c', '500 mg', 'tablet', 60,
        'LM-903', ?, 300, 0, 'RECEIVED', 'usr-pharm-1', ?, 'ML-VER-1003', '[]'
      )`
    ).run(mDate(16), new Date().toISOString());

    db.prepare(
      `INSERT INTO donation_items (
        id, donation_id, medicine_name, generic_name, strength, form, quantity,
        batch_no, expiry_date, est_value, is_rx_only, status, reviewer_id, reviewed_at, reject_reason_code, reject_note, auto_check_result
      ) VALUES (
        'itm-rejected-1', 'don-extra-1', 'Azithral 500', 'azithromycin', '500 mg', 'tablet', 6,
        'AZ-904', ?, 120, 1, 'REJECTED', 'usr-pharm-1', ?, 'DAMAGED_PACK', 'Blister foil corner creased', '[]'
      )`
    ).run(mDate(11), new Date().toISOString());
  });

  tx();
}

if (require.main === module) {
  const db = getDb();
  seedDatabase(db);
  const counts = db
    .prepare('SELECT status, COUNT(*) AS total FROM donation_items GROUP BY status')
    .all();
  console.log('Seed complete! Item counts by status:', counts);
}
