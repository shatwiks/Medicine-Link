# MedicineLink — Verified Surplus Medicine Redistribution Platform

> **⚠️ Educational Prototype Notice:** MedicineLink is a class-project prototype (*Creativity, Problem Solving & Innovation*) and runs strictly on **dummy / sample data**. Do not use this software to handle real medicines, real prescriptions, or real patient data.

---

## 1. Architecture Overview

| Layer | Stack | Port |
| --- | --- | --- |
| **Frontend (`frontend/`)** | React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Lenis Smooth Scroll, Embla Carousel, Recharts, Leaflet (OpenStreetMap), `qrcode.react`, `canvas-confetti` | `http://localhost:5173` |
| **Backend (`backend/`)** | Node.js, Express, TypeScript, Native SQLite (`node:sqlite` / `SqliteDatabase`), Zod, JWT + bcryptjs, Multer, Sharp + Tesseract.js OCR, `node-cron`, Pino, Swagger OpenAPI (`/api/docs`) | `http://localhost:4000` |
| **Database (`backend/db/migrations/`)** | `001_init.sql` (15 tables & CHECK constraints), `002_indexes_triggers.sql` (16 indexes, `ux_matches_one_accepted`, append-only `audit_log` triggers), `003_seed_lookups.sql` (`settings`, `blocked_medicines`, `medicine_aliases`) | `./data/medicinelink.db` |

---

## 2. Quick Start

### ⚡ One-Click Startup (Windows)
Simply double-click `start.bat` in the project root (or run `.\start.bat` in terminal).
This automatically:
1. Validates Node.js and npm
2. Creates `backend/.env` from `.env.example` (if missing)
3. Installs backend & frontend dependencies if needed
4. Runs database migrations and seeds sample data (if first run)
5. Launches both backend (`:4000`) and frontend (`:5173`) in dedicated windows
6. Opens your browser at `http://localhost:5173`

---

### Manual Startup

#### Backend API (`http://localhost:4000`)
```bash
cd backend
npm install
npm run db:migrate
npm run db:seed
npm run dev
```
- **Health Check:** `http://localhost:4000/api/v1/health`
- **Swagger OpenAPI Docs:** `http://localhost:4000/api/docs`
- **Run Backend Test Suite (Vitest + Supertest):** `npm test`

### Start the Frontend Web App (`http://localhost:5173`)
```bash
cd frontend
npm install
npm run dev
```

---

## 3. Demo Accounts (Password for all: `Demo@1234`)

| Role | Name | Email | Organisation | Verified |
| --- | --- | --- | --- | --- |
| **Donor** | Aarav Sharma | `aarav.donor@demo.medicinelink.org` | *(Household)* | — |
| **Pharmacist** | Dr. Meera Nair (RPh) | `meera.rx@greencross.demo.org` | GreenCross Pharmacy | ✅ Yes |
| **NGO / Clinic** | Rohan Deshmukh | `rohan@ashahealth.demo.org` | Asha Health Foundation | ✅ Yes |
| **Clinic** | Dr. Ananya Rao | `ananya@carestreet.demo.org` | Care Street Clinic | ✅ Yes |
| **Unverified NGO** | Sanjay Mehta | `sanjay@hopehelpers.demo.org` | Hope Helpers | ❌ No (for testing Admin verification) |
| **Admin** | Priya Krishnan | `admin@medicinelink.demo.org` | *(Platform Admin)* | — |

---

## 4. 3-Minute Live Demo Script

1. **Landing Page (`/`):** Explore the floating 3D capsule parallax hero, 3-slide autoplay showcase, animated problem counters, 6-step scroll-driven *"How It Works"*, and self-drawing SVG *"What We Accept"* cards.
2. **Donor Wizard (`/donor/new`):**
   - Click the **Valid Pack (Dolo 650 · 18m left)** preset to see the sweeping teal laser scan animation extract Batch & Expiry.
   - Try the **Short Expiry (Cetirizine · 3m left)** and **Cold-Chain (Insulin Pen)** presets in Step 3 to see hard rules automatically block them with plain-English explanations.
   - Submit the valid pack with a Bengaluru OpenStreetMap pickup pin.
3. **Pharmacist Review (`/pharmacist/review`):**
   - Switch persona to **Pharmacist** in the top navbar.
   - Inspect the zoomable blister pack photo and 12 automated safety check rows.
   - Press **`A`** (or click **Approve & Generate QR**) to issue a cryptographic QR verification code (`ML-VER-...`).
4. **NGO Matching & Receipt (`/ngo/dashboard`):**
   - Switch persona to **NGO / Clinic**.
   - Click the animated **Score Ring (`100/100`)** to inspect the breakdown (`Medicine Match 50 + Distance 30 + Urgency 20`).
   - Click **Accept Match**, schedule a volunteer pickup, and click **Confirm Received 🎉** in the Pickups tab to trigger the completion confetti burst.
5. **Admin Impact & Audit Trail (`/admin/dashboard`):**
   - Switch persona to **Admin** to view the Bento stat counters, Recharts weekly bar chart & rejection donut chart, verify **Hope Helpers Trust**, search the append-only Audit Log, or export the CSV report.
