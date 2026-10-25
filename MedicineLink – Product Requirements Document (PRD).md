# MedicineLink – Product Requirements Document (PRD)

Version 1.0 · Class project (Creativity, Problem Solving & Innovation) · Written so it can be handed to Google Antigravity to build

## 1. Overview

**One-line pitch:** MedicineLink is a web platform that lets people list sealed, unexpired medicines they no longer need, has a licensed pharmacist verify them, and matches them to NGOs and clinics that need them.

**Problem:** Medicines are a large share of out-of-pocket health spending in India, while safe, unexpired medicines at home are often thrown away. There is no trusted, verified way to pass them on.

**Vision:** A safe, traceable route from the household medicine cabinet to the person who needs it.

**Important scope note:** This build is a **prototype for a class project**. It must run only on dummy or sample data. It must not be used to move real medicines until the legal and licensing questions in Section 12 are resolved with a licensed pharmacy and the relevant regulators.

## 2. Goals and Non-Goals

### Goals (MVP)

- A donor can list a medicine pack with a photo and details in under 2 minutes.
- The system reads expiry and batch from the photo (OCR) and applies automatic eligibility checks.
- A pharmacist can review, approve or reject every item before it can be matched.
- NGOs and clinics can post medicine needs and receive matches.
- The full donation lifecycle is tracked, with an audit log.
- An impact dashboard shows packs verified, rejected, matched and completed.

### Non-goals (not in MVP)

- Real payments, real prescriptions or any real patient data.
- A native mobile app (the web app must simply be mobile-friendly).
- Live volunteer GPS tracking and route optimisation (planned for later).
- Blockchain, IoT sensors, international expansion.

## 3. Users and Personas

| Role | Who they are | What they need |
| --- | --- | --- |
| Donor | Household member with leftover sealed medicines | List a pack quickly, know what is accepted, see where it went |
| Pharmacist (Verifier) | Licensed pharmacist at a partner pharmacy | Review items, see OCR results, approve or reject with a reason |
| NGO / Clinic | Registered NGO or clinic | Post needs, see approved matching medicines, accept or decline, confirm receipt |
| Admin | Project team member | Verify organisations, view all data, see audit log and dashboard |

## 4. User Stories

| ID | As a... | I want to... | So that... |
| --- | --- | --- | --- |
| US-1 | Donor | create an account and log in | I can manage my donations |
| US-2 | Donor | upload a photo of a medicine pack and fill in details | it can be reviewed |
| US-3 | Donor | see instantly if my medicine is eligible | I do not waste time on unacceptable items |
| US-4 | Donor | track the status of each donation | I know what happened to it |
| US-5 | Pharmacist | see a queue of items waiting for review | I can check them one by one |
| US-6 | Pharmacist | approve or reject an item with a reason | only safe medicines move forward |
| US-7 | NGO/Clinic | post the medicines we need and how urgently | matching can prioritise us |
| US-8 | NGO/Clinic | see matched approved medicines and accept or decline | we only take what we can use |
| US-9 | NGO/Clinic | confirm that we received the medicines | the donation is closed and logged |
| US-10 | Admin | approve organisation sign-ups | only verified NGOs, clinics and pharmacies take part |
| US-11 | Admin | see an impact dashboard and audit log | we can show results and traceability |

## 5. Functional Requirements

Priority: **P0** = must have for the demo, **P1** = should have, **P2** = nice to have.

### 5.1 Accounts and roles

- FR-1 (P0): Email and password sign-up and login with roles: donor, pharmacist, ngo, admin.
- FR-2 (P0): Role-based access. Each role only sees its own screens and data.
- FR-3 (P0): NGO, clinic and pharmacy accounts start as "unverified" and need admin approval before they can act.

### 5.2 Donation listing

- FR-4 (P0): Donor creates a donation with one or more items. Each item has: medicine name, strength, form (tablet, capsule, syrup etc.), quantity, batch number, expiry date, photo.
- FR-5 (P0): Donor declares conditions: sealed and unopened, stored at room temperature, original packaging.
- FR-6 (P0): Pickup location (address or map pin) and a preferred pickup time window.
- FR-7 (P1): Donor can edit or cancel an item before it is reviewed.

### 5.3 OCR and automatic eligibility checks

- FR-8 (P0): On photo upload, run OCR to suggest batch number and expiry date. The donor can correct the suggestions. If OCR fails, manual entry still works.
- FR-9 (P0): Apply automatic rules (Section 7). Items that fail a hard rule are blocked with a clear message.
- FR-10 (P1): Show OCR confidence and flag low-confidence items for extra pharmacist attention.
- FR-11 (P1): Freshness indicator showing months of shelf life left.

### 5.4 Pharmacist review

- FR-12 (P0): Review queue listing items with status "Pending review", oldest first.
- FR-13 (P0): Review screen shows the photo, entered details, OCR text and the result of the automatic checks.
- FR-14 (P0): Pharmacist can Approve or Reject. Rejection needs a reason from a list plus optional note.
- FR-15 (P0): Approved items get a unique verification code (shown as a QR code) that stays with the pack.

### 5.5 Needs and matching

- FR-16 (P0): NGO or clinic posts needs: medicine name, quantity, urgency (low, medium, high).
- FR-17 (P0): Matching engine scores approved items against open needs (Section 6.3) and creates match suggestions.
- FR-18 (P0): NGO or clinic sees match suggestions and can Accept or Decline.
- FR-19 (P1): Notify users on key events (in-app notifications; email optional).

### 5.6 Pickup and completion

- FR-20 (P0): After acceptance, a pickup record is created with a scheduled time and a volunteer name entered by the admin or NGO.
- FR-21 (P0): Status updates: Picked up, Delivered, Received (confirmed by the NGO or clinic).
- FR-22 (P1): Donor can choose to drop the pack at a partner pharmacy instead of home pickup.

### 5.7 Dashboard and audit

- FR-23 (P0): Impact dashboard: total items listed, approved, rejected (with top reasons), matched, completed, and estimated medicine value saved (using entered price or a simple estimate).
- FR-24 (P0): Audit log that records every status change with who, what and when.
- FR-25 (P2): Export dashboard data as CSV.

## 6. Core Flow and Rules

### 6.1 Donation item lifecycle

Listed → Auto-checked → Pending review → Approved or Rejected → Matched → Accepted by NGO/clinic → Pickup scheduled → Picked up → Delivered → Received (completed).

Other end states: Cancelled by donor, Expired while waiting, Declined (re-enters matching).

### 6.2 Expiry handling

A daily job marks any approved or waiting item whose remaining shelf life drops below the minimum threshold as **Expired** and removes it from matching.

### 6.3 Matching score (simple and explainable)

Score out of 100 for each (item, need) pair:

- **Medicine match (50):** exact generic name match = 50, same name different strength = 20, otherwise 0 (no match).
- **Distance (30):** closer is higher, using straight-line distance between donor and organisation.
- **Urgency (20):** high = 20, medium = 12, low = 5.

Only pairs with a medicine match above 0 are suggested. Show the score breakdown so the logic can be explained in the demo.

## 7. Safety and Eligibility Rules

Hard rules (automatic block):

- Expiry date must be at least **6 months** away \[adjustable setting\].
- Donor must confirm the pack is sealed and unopened.
- Not accepted: injectables, cold-chain products (insulin, vaccines etc.), controlled or narcotic drugs, opened or loose tablets, damaged packaging.
- Not accepted if batch number or expiry date is unreadable.

Soft rules (flag for pharmacist attention):

- Low OCR confidence.
- Prescription-only medicine (needs a prescription at dispensing).
- Same batch number listed twice.

Implementation note: keep the blocked-medicine list in a configuration file or database table so it can be edited without changing code.

## 8. Data Model

| Table | Key fields |
| --- | --- |
| users | id, name, email, password\_hash, role, phone, city, created\_at |
| organizations | id, name, type (ngo, clinic, pharmacy), license\_no, verified, address, lat, lng, owner\_user\_id |
| donations | id, donor\_id, status, pickup\_address, lat, lng, pickup\_window, created\_at |
| donation\_items | id, donation\_id, medicine\_name, strength, form, quantity, batch\_no, expiry\_date, photo\_url, ocr\_text, ocr\_confidence, is\_rx\_only, review\_status, reviewer\_id, reject\_reason, verification\_code |
| needs | id, org\_id, medicine\_name, strength, quantity\_needed, urgency, status, created\_at |
| matches | id, item\_id, need\_id, org\_id, score, score\_breakdown, status |
| pickups | id, donation\_id, volunteer\_name, scheduled\_at, status |
| notifications | id, user\_id, message, read, created\_at |
| audit\_log | id, actor\_id, action, entity, entity\_id, details, created\_at |
| blocked\_medicines | id, keyword, category, reason |

## 9. API Endpoints (REST)

| Method and path | Purpose | Roles |
| --- | --- | --- |
| POST /auth/register, /auth/login | Sign up and log in | all |
| GET /me | Current user | all |
| POST /donations | Create donation with items | donor |
| GET /donations, GET /donations/:id | List and view own donations | donor |
| POST /items/:id/ocr | Upload photo, return OCR suggestions | donor |
| GET /review/queue | Items waiting for review | pharmacist |
| POST /items/:id/review | Approve or reject with reason | pharmacist |
| POST /needs, GET /needs | Post and list needs | ngo |
| GET /matches | Match suggestions for my organisation | ngo |
| POST /matches/:id/respond | Accept or decline | ngo |
| POST /pickups, PATCH /pickups/:id | Schedule and update pickup | admin, ngo |
| POST /donations/:id/confirm-received | Confirm receipt | ngo |
| GET /admin/organizations, POST /admin/organizations/:id/verify | Verify organisations | admin |
| GET /dashboard/stats | Impact numbers | admin, all (limited) |
| GET /audit | Audit log | admin |

## 10. Screens

1. Landing page (what it is, what is accepted, sign up).
2. Login and sign up (with role choice).
3. Donor home: my donations and statuses.
4. New donation form: photo upload, OCR suggestions, eligibility result.
5. Donation detail with status timeline.
6. Pharmacist review queue and review screen.
7. NGO/clinic home: post a need, see matches.
8. Match detail with accept and decline.
9. Pickup and receipt confirmation.
10. Admin: organisation verification, audit log.
11. Impact dashboard.

**Design direction:** clean and clinical. Dark teal (#0F2F2E) and a bright teal accent (#1B9C85) on a light off-white background, a coral accent (#D9553A) for warnings and rejections, Inter font, large readable text, mobile-first layout. This matches the presentation deck.

## 11. Technical Approach

| Layer | Recommended choice | Why |
| --- | --- | --- |
| Frontend | React with Vite and Tailwind CSS | Fast to build, easy for Antigravity to generate |
| Backend | Node.js with Express | Simple REST API |
| Database | SQLite for MVP (upgrade path to PostgreSQL) | Zero setup |
| Auth | JWT with hashed passwords (bcrypt) | Simple and standard |
| OCR | Tesseract.js (free), with manual entry fallback; optionally a vision AI API | No paid key needed |
| Maps and distance | Leaflet with OpenStreetMap and a Haversine distance function | No API key needed |
| Image storage | Local uploads folder for MVP | Simple |
| Jobs | node-cron for the daily expiry check | Simple |
| Deployment | Frontend on Vercel or Netlify, backend on Render or Railway | Free tiers available |

**Architecture:** React web app calls the Express REST API. The API talks to the database, runs OCR and matching, and writes to the audit log. A scheduled job handles expiry.

## 12. Legal, Ethical and Compliance Notes

- In India, drug distribution is regulated through licensed channels under the Drugs and Cosmetics Act, 1940 and Rules, 1945, and there is no formal framework yet for redistributing household medicines.
- Therefore this build is a **demonstration with dummy data only**. Do not use it to handle real medicines.
- Show a clear disclaimer banner on every screen: "Prototype for educational purposes. Do not use for real medicines."
- Design assumes a real pilot would involve only licensed pharmacies and registered NGOs or clinics, with a registered pharmacist or doctor dispensing, and early consultation with state drug regulators.
- Store as little personal data as possible. No real prescriptions, no health records.

## 13. Non-Functional Requirements

- **Security:** hashed passwords, JWT expiry, role checks on every endpoint, input validation, file type and size limits on uploads (images only, max 5 MB).
- **Privacy:** minimal personal data, no real patient data.
- **Performance:** pages load in under 3 seconds on a normal mobile connection; OCR result in under 10 seconds.
- **Usability:** works on phones, readable fonts, clear error messages in simple English.
- **Reliability:** all state changes recorded in the audit log.
- **Accessibility:** sufficient colour contrast, labelled form fields, keyboard friendly.

## 14. Success Metrics (for the demo)

- A donor can complete a listing in under 2 minutes.
- OCR correctly suggests expiry on at least 7 of 10 clear sample photos.
- 100% of items are blocked or approved according to the written rules (test with 15 sample cases).
- A full end-to-end donation (listed to received) can be shown live in under 3 minutes.
- Dashboard numbers update correctly after each step.

## 15. Build Plan (Phases)

| Phase | Scope | Done when |
| --- | --- | --- |
| 1. Foundation | Project setup, database, auth, roles, base layout and theme | Users can register, log in and see role-based home pages |
| 2. Donations | Donation form, photo upload, OCR suggestions, eligibility rules | Donor can list items and see accept or block results |
| 3. Review | Pharmacist queue, approve and reject, verification code and QR | Items move to Approved or Rejected with reasons |
| 4. Needs and matching | Needs posting, scoring, match suggestions, accept and decline | NGO sees ranked matches |
| 5. Fulfilment | Pickup scheduling, status updates, receipt confirmation, notifications | An item reaches Received status |
| 6. Insights and polish | Dashboard, audit log, admin verification, disclaimer banner, seed data, testing | Full demo runs smoothly |

## 16. Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| OCR misreads expiry dates | Donor can correct, pharmacist always confirms, show confidence |
| Legal concerns about real use | Dummy data only, disclaimer, pilot design with licensed partners |
| Scope too big for the time | Build in phases, P0 first, cut P2 items |
| Tampered or unsafe packs in a real pilot | Pharmacist inspection, tamper-evident labels, verification codes |
| Low adoption | Partner with a few NGOs and a pharmacy first |

## 17. Working With Google Antigravity

Tips for getting good results:

1. Start a new project folder and add this PRD as a file (for example PRD.md) so the agent can refer to it.
2. Ask the agent to **make a plan first** and show it to you before writing code. Check that the plan follows the phases in Section 15.
3. Build **one phase at a time**. After each phase, run the app, test it yourself, and only then move to the next phase.
4. Ask for **seed data** early (sample donors, a pharmacist, two NGOs, a clinic, and 15 sample medicines including bad cases) so you can test every rule.
5. Commit to Git after each working phase so you can roll back.
6. Keep API keys in a .env file and never put them in code.

### Starter prompt (paste into Antigravity)

```
Read PRD.md in this project. We are building MedicineLink, a class-project
prototype (dummy data only). First, produce a short implementation plan
for Phase 1 only (project setup, SQLite database, JWT auth with roles
donor/pharmacist/ngo/admin, base layout with the teal theme from the PRD).
Show me the plan and the folder structure before writing any code.
Use React + Vite + Tailwind for the frontend and Node + Express for the
backend. Add a disclaimer banner on every page: "Prototype for
educational purposes. Do not use for real medicines." After I approve
the plan, implement it, run the app, and tell me how to test it.
```

### Follow-up prompts, one per phase

- "Now implement Phase 2 from the PRD: the donation form with photo upload, Tesseract.js OCR suggestions, and the eligibility rules in Section 7. Put the blocked-medicine list in a database table. Add seed data covering both accepted and blocked cases."
- "Now implement Phase 3: the pharmacist review queue, approve and reject with reasons, and a verification code with a QR image for approved items."
- "Now implement Phase 4: needs posting and the matching score exactly as described in Section 6.3, showing the score breakdown."
- "Now implement Phase 5: pickup scheduling, status updates, receipt confirmation and in-app notifications."
- "Now implement Phase 6: the impact dashboard, audit log, admin organisation verification, and polish. Then write a short README with setup steps and a demo script."

## 18. Demo Script (3 minutes)

1. Log in as a donor and list a sealed pack with a clear photo. Show OCR filling expiry and batch.
2. Try listing an expired pack and an injectable. Show them being blocked with clear messages.
3. Log in as the pharmacist, open the queue, and approve the good item (show the QR code).
4. Log in as an NGO, post a matching need, and show the ranked match with the score breakdown.
5. Accept the match, schedule pickup, and confirm receipt.
6. Open the dashboard and audit log to show the results and the trail.

## 19. Open Questions

- Which city and which partner pharmacy and NGO will be used for the story in the presentation?
- Should the minimum shelf life be 6 months or longer?
- Is a volunteer login needed in the MVP, or is an admin-entered volunteer name enough?
- Will email notifications be needed, or are in-app notifications enough for the demo?
