import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock,
  MapPin,
  ShieldAlert,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import { ScanAnimation } from '../../components/illustrations/ScanAnimation';
import { PageTransition } from '../../components/layout/PageTransition';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Stepper } from '../../components/ui/Stepper';
import { SAMPLE_OCR_PRESETS } from '../../mock/seedData';
import { useMockStore } from '../../mock/mockStore';
import { MedicineForm } from '../../types';

// Custom SVG Map Pin for Leaflet so icon images never break
const customPinIcon = L.divIcon({
  className: 'custom-leaflet-pin',
  html: `<div style="width:34px;height:34px;border-radius:999px;background:#0F2F2E;border:3px solid #6FD3BD;display:flex;align-items:center;justify-content:center;color:white;box-shadow:0 6px 16px rgba(15,47,46,0.35);">📍</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
});

const MapClickHandler: React.FC<{ onPick: (lat: number, lng: number) => void }> = ({ onPick }) => {
  useMapEvents({
    click(e) {
      onPick(
        Math.round(e.latlng.lat * 10000) / 10000,
        Math.round(e.latlng.lng * 10000) / 10000
      );
    },
  });
  return null;
};

const WIZARD_STEPS = [
  { id: 1, label: '1. Pack Photo' },
  { id: 2, label: '2. OCR Details' },
  { id: 3, label: '3. Safety Check' },
  { id: 4, label: '4. Pickup' },
];

const PICKUP_WINDOWS = [
  'Morning (9 AM – 12 PM)',
  'Afternoon (1 PM – 4 PM)',
  'Evening (5 PM – 8 PM)',
  'Drop at GreenCross Pharmacy',
];

export const NewDonationPage: React.FC = () => {
  const navigate = useNavigate();
  const { evaluateEligibility, createDonationItem, uploadOcrPhoto, pushToast } = useMockStore();

  const [step, setStep] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(true);
  const [selectedPresetId, setSelectedPresetId] = useState(SAMPLE_OCR_PRESETS[0].id);

  // Form fields
  const [medicineName, setMedicineName] = useState(SAMPLE_OCR_PRESETS[0].medicine_name);
  const [strength, setStrength] = useState(SAMPLE_OCR_PRESETS[0].strength);
  const [form, setForm] = useState<MedicineForm>(SAMPLE_OCR_PRESETS[0].form);
  const [quantity, setQuantity] = useState(SAMPLE_OCR_PRESETS[0].quantity);
  const [batchNo, setBatchNo] = useState(SAMPLE_OCR_PRESETS[0].batch_no);
  const [expiryDate, setExpiryDate] = useState(SAMPLE_OCR_PRESETS[0].expiry_date);
  const [isRxOnly, setIsRxOnly] = useState(SAMPLE_OCR_PRESETS[0].is_rx_only);
  const [declarationSealed, setDeclarationSealed] = useState(
    SAMPLE_OCR_PRESETS[0].declaration_sealed
  );
  const [declarationRoomTemp, setDeclarationRoomTemp] = useState(
    SAMPLE_OCR_PRESETS[0].declaration_room_temp
  );
  const [ocrConfidence, setOcrConfidence] = useState(SAMPLE_OCR_PRESETS[0].ocr_confidence);
  const [ocrText, setOcrText] = useState(SAMPLE_OCR_PRESETS[0].ocr_text);

  // Pickup fields
  const [pickupAddress, setPickupAddress] = useState(
    '14 HAL 2nd Stage, Indiranagar, Bengaluru'
  );
  const [pickupWindow, setPickupWindow] = useState(PICKUP_WINDOWS[2]);
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: 12.9719,
    lng: 77.6412,
  });

  const triggerScanWithPreset = (preset: (typeof SAMPLE_OCR_PRESETS)[number]) => {
    setSelectedPresetId(preset.id);
    setIsScanning(true);
    setHasScanned(false);
    setTimeout(() => {
      setMedicineName(preset.medicine_name);
      setStrength(preset.strength);
      setForm(preset.form);
      setQuantity(preset.quantity);
      setBatchNo(preset.batch_no);
      setExpiryDate(preset.expiry_date);
      setIsRxOnly(preset.is_rx_only);
      setDeclarationSealed(preset.declaration_sealed);
      setDeclarationRoomTemp(preset.declaration_room_temp);
      setOcrConfidence(preset.ocr_confidence);
      setOcrText(preset.ocr_text);
      setIsScanning(false);
      setHasScanned(true);
    }, 1500);
  };

  const handleFileUpload = async (file?: File) => {
    if (!file) return;
    setIsScanning(true);
    setHasScanned(false);

    const ocrData = await uploadOcrPhoto(file);
    if (ocrData) {
      if (ocrData.medicine_name_guess) setMedicineName(ocrData.medicine_name_guess);
      if (ocrData.batch_no) setBatchNo(ocrData.batch_no);
      if (ocrData.expiry_date) setExpiryDate(ocrData.expiry_date);
      if (ocrData.raw_text) setOcrText(ocrData.raw_text);
      if (ocrData.confidence) setOcrConfidence(ocrData.confidence);
      pushToast({
        title: 'Live Backend OCR Completed',
        description: `Extracted ${ocrData.fields_found?.length || 0} field(s) from ${file.name} via Sharp + Tesseract.js.`,
        variant: 'success',
      });
      setIsScanning(false);
      setHasScanned(true);
    } else {
      setTimeout(() => {
        setIsScanning(false);
        setHasScanned(true);
      }, 1500);
    }
  };

  const eligibility = evaluateEligibility({
    medicine_name: medicineName,
    strength,
    form,
    quantity,
    batch_no: batchNo,
    expiry_date: expiryDate,
    is_rx_only: isRxOnly,
    declaration_sealed: declarationSealed,
    declaration_room_temp: declarationRoomTemp,
    ocr_confidence: ocrConfidence,
  });

  const handleFinalSubmit = () => {
    createDonationItem({
      medicine_name: medicineName,
      strength,
      form,
      quantity,
      batch_no: batchNo,
      expiry_date: expiryDate,
      is_rx_only: isRxOnly,
      declaration_sealed: declarationSealed,
      declaration_room_temp: declarationRoomTemp,
      ocr_confidence: ocrConfidence,
      ocr_text: ocrText,
      pickup_address: pickupAddress,
      pickup_window: pickupWindow,
      lat: coords.lat,
      lng: coords.lng,
    });
    navigate('/donor/donations');
  };

  return (
    <PageTransition>
      <div className="max-w-[920px] mx-auto px-4 sm:px-6 py-8 pb-28 md:pb-16">
        {/* Header */}
        <div className="mb-6">
          <span className="text-xs font-bold uppercase tracking-widest text-teal">
            Donor Listing Wizard
          </span>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-ink mt-1">
            Donate a Sealed Medicine Pack
          </h1>
          <p className="text-sm text-muted mt-1">
            Upload a pack photo or pick a sample preset below to test OCR extraction and our 12 eligibility rules.
          </p>
        </div>

        {/* Stepper */}
        <div className="mb-8 bg-white p-5 rounded-card border border-line shadow-soft">
          <Stepper
            steps={WIZARD_STEPS}
            currentStep={step}
            onStepClick={(s) => setStep(s)}
          />
        </div>

        {/* STEP 1: PHOTO & OCR SCAN */}
        {step === 1 && (
          <div className="space-y-6">
            <Card className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl font-heading font-bold text-ink">
                    Step 1: Upload Pack Photo or Choose a Demo Preset
                  </h2>
                  <p className="text-xs text-muted mt-0.5">
                    Tip: Show the printed Batch No. (B.No) and Expiry Date (EXP) clearly under good lighting.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-teal-50 text-teal-700 text-xs font-bold">
                  <Camera className="w-3.5 h-3.5" />
                  JPG, PNG, WebP · Max 5 MB
                </span>
              </div>

              {/* 1-Click Test Case Presets */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2.5">
                  One-Click Demo Pack Presets (Test Good & Blocked Cases)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SAMPLE_OCR_PRESETS.map((preset) => {
                    const active = selectedPresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => triggerScanWithPreset(preset)}
                        className={`p-3.5 rounded-input text-left border transition-all flex items-center justify-between gap-2 ${
                          active
                            ? 'bg-teal-50/70 border-teal ring-2 ring-teal/15'
                            : 'bg-surface border-line hover:border-teal/50'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-heading font-bold text-ink">
                            {preset.label}
                          </p>
                          <p className="text-[11px] text-muted mt-0.5">
                            B.No: {preset.batch_no} · Exp: {preset.expiry_date}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-pill text-[10px] font-bold shrink-0 ${
                            preset.id === 'preset-valid'
                              ? 'bg-teal text-white'
                              : preset.id === 'preset-low-ocr'
                              ? 'bg-amber text-ink'
                              : 'bg-coral text-white'
                          }`}
                        >
                          {preset.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Drag and Drop Area */}
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFileUpload(e.dataTransfer.files?.[0]);
                }}
                className={`cursor-pointer flex flex-col items-center justify-center rounded-card border-2 border-dashed p-7 text-center transition-all ${
                  isDragging
                    ? 'border-teal bg-teal-50 animate-pulse scale-[1.01]'
                    : 'border-line bg-surface/60 hover:border-teal'
                }`}
              >
                <UploadCloud className="w-9 h-9 text-teal mb-2" />
                <span className="font-heading font-bold text-sm text-ink">
                  Drag & drop your medicine strip photo here, or click to browse
                </span>
                <span className="text-xs text-muted mt-1">
                  Automatically runs Sharp contrast clean-up + Tesseract OCR
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => handleFileUpload(e.target.files?.[0])}
                  className="hidden"
                />
              </label>

              {/* Animated Scan Preview */}
              <ScanAnimation
                isScanning={isScanning}
                scannedData={{
                  medicine_name: medicineName,
                  batch_no: batchNo,
                  expiry_date: expiryDate,
                  confidence: ocrConfidence,
                }}
              />
            </Card>
          </div>
        )}

        {/* STEP 2: DETAILS PRE-FILLED BY OCR */}
        {step === 2 && (
          <Card className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-line">
              <div>
                <h2 className="text-xl font-heading font-bold text-ink">
                  Step 2: Confirm OCR Details & Declarations
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Highlighted fields were pre-filled by OCR. You can correct any value before running the safety check.
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-xs font-bold ${
                  ocrConfidence >= 0.6
                    ? 'bg-teal-50 text-teal-700 border border-teal-200'
                    : 'bg-amber-light text-[#9A6700] border border-amber-border'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                OCR Confidence: {Math.round(ocrConfidence * 100)}%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Medicine Brand / Generic Name"
                value={medicineName}
                onChange={(e) => setMedicineName(e.target.value)}
                highlighted={hasScanned}
              />
              <Input
                label="Strength (e.g., 500 mg, 650 mg)"
                value={strength}
                onChange={(e) => setStrength(e.target.value)}
                highlighted={hasScanned}
              />
              <Input
                label="Batch Number (B.No)"
                value={batchNo}
                onChange={(e) => setBatchNo(e.target.value)}
                highlighted={hasScanned}
              />
              <Input
                label="Expiry Date (YYYY-MM-DD)"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                highlighted={hasScanned}
              />
              <div>
                <label className="block text-xs font-semibold text-teal mb-1">
                  Dosage Form
                </label>
                <select
                  value={form}
                  onChange={(e) => setForm(e.target.value as MedicineForm)}
                  className="w-full rounded-input bg-white px-4 py-3.5 text-sm text-ink border border-line focus:border-teal outline-none"
                >
                  <option value="tablet">Tablet (Blister Strip)</option>
                  <option value="capsule">Capsule</option>
                  <option value="syrup">Syrup (Sealed Bottle)</option>
                  <option value="ointment">Ointment / Cream</option>
                  <option value="drops">Eye / Ear Drops</option>
                  <option value="inhaler">Inhaler</option>
                  <option value="powder">Powder Sachet</option>
                  <option value="other">Other / Pen / Vial</option>
                </select>
              </div>
              <Input
                label="Quantity (Tablets / Units)"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </div>

            {/* Mandatory Donor Declarations */}
            <div className="p-4 rounded-xl bg-surface border border-line space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                Mandatory Safety Declarations
              </h3>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={declarationSealed}
                  onChange={(e) => setDeclarationSealed(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-teal rounded"
                />
                <span className="text-sm text-ink">
                  <strong>Factory-sealed and unopened:</strong> The blister foil or bottle seal ring is completely intact.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={declarationRoomTemp}
                  onChange={(e) => setDeclarationRoomTemp(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-teal rounded"
                />
                <span className="text-sm text-ink">
                  <strong>Room-temperature storage:</strong> Stored indoors away from direct sunlight and moisture, and does not require cold-chain refrigeration.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRxOnly}
                  onChange={(e) => setIsRxOnly(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-teal rounded"
                />
                <span className="text-sm text-muted">
                  This pack carries a Schedule H / Prescription-Only warning label.
                </span>
              </label>
            </div>
          </Card>
        )}

        {/* STEP 3: ANIMATED ELIGIBILITY RESULT */}
        {step === 3 && (
          <Card className="space-y-6">
            <div className="flex flex-col items-center text-center py-4">
              {eligibility.passedHardRules ? (
                <div className="w-20 h-20 rounded-full bg-teal-50 border-2 border-teal flex items-center justify-center mb-4">
                  <svg width="42" height="42" viewBox="0 0 42 42" fill="none">
                    <motion.path
                      d="M10 22L18 30L33 13"
                      stroke="#1B9C85"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  </svg>
                </div>
              ) : (
                <motion.div
                  animate={{ x: [0, -8, 8, -6, 6, 0] }}
                  transition={{ duration: 0.45 }}
                  className="w-20 h-20 rounded-full bg-coral-light border-2 border-coral flex items-center justify-center mb-4"
                >
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                    <motion.path
                      d="M12 12L28 28M28 12L12 28"
                      stroke="#D9553A"
                      strokeWidth="4"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5 }}
                    />
                  </svg>
                </motion.div>
              )}

              <h2 className="text-2xl font-heading font-extrabold text-ink">
                {eligibility.passedHardRules
                  ? 'Eligible for Pharmacist Verification!'
                  : 'This pack cannot be accepted'}
              </h2>
              <p className="text-sm text-muted max-w-lg mt-1">
                {eligibility.passedHardRules
                  ? `All 8 hard safety rules passed (${eligibility.monthsRemaining} months shelf life left). Proceed to schedule pickup.`
                  : eligibility.results.find((r) => !r.passed && r.severity === 'hard')?.message}
              </p>
            </div>

            {/* Detailed Rule-by-Rule Breakdown */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                Automated Eligibility Rules Breakdown
              </h3>
              {eligibility.results.map((r) => (
                <div
                  key={r.rule}
                  className={`p-3.5 rounded-input border flex items-start justify-between gap-3 ${
                    r.passed
                      ? 'bg-teal-50/40 border-teal-200 text-ink'
                      : r.severity === 'hard'
                      ? 'bg-coral-light border-coral-border text-coral'
                      : 'bg-amber-light border-amber-border text-[#9A6700]'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {r.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-teal shrink-0 mt-0.5" />
                    ) : r.severity === 'hard' ? (
                      <ShieldAlert className="w-4 h-4 text-coral shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="text-xs font-heading font-bold">{r.rule}</p>
                      <p className="text-xs mt-0.5">{r.message}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white/80 shrink-0">
                    {r.passed ? 'Pass' : r.severity === 'hard' ? 'Hard Block' : 'Soft Flag'}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* STEP 4: PICKUP MAP & TIME WINDOW */}
        {step === 4 && (
          <Card className="space-y-6">
            <div>
              <h2 className="text-xl font-heading font-bold text-ink">
                Step 4: Pickup Location & Time Window
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Click anywhere on the Bengaluru OpenStreetMap below to move your pickup pin, or choose a partner pharmacy drop-off.
              </p>
            </div>

            {/* Interactive Leaflet Map */}
            <div className="h-64 w-full rounded-card overflow-hidden border border-line relative z-10">
              <MapContainer
                center={[coords.lat, coords.lng]}
                zoom={13}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapClickHandler onPick={(lat, lng) => setCoords({ lat, lng })} />
                <Marker position={[coords.lat, coords.lng]} icon={customPinIcon} />
              </MapContainer>
            </div>

            <div className="flex items-center justify-between text-xs text-muted bg-surface px-3.5 py-2 rounded-lg border border-line">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-teal" />
                Selected Coordinates: {coords.lat}, {coords.lng}
              </span>
              <span>Haversine distance ready</span>
            </div>

            <Input
              label="Pickup Street Address / Landmark"
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
            />

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">
                Preferred Handover Window
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PICKUP_WINDOWS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setPickupWindow(w)}
                    className={`p-3 rounded-input text-left text-xs font-semibold border flex items-center gap-2 transition-all ${
                      pickupWindow === w
                        ? 'bg-deep-teal text-white border-deep-teal'
                        : 'bg-surface text-ink border-line hover:border-teal'
                    }`}
                  >
                    <Clock className="w-4 h-4 text-teal shrink-0" />
                    <span>{w}</span>
                  </button>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Fixed Bottom Navigation on Mobile / Standard Footer on Desktop */}
        <div className="fixed bottom-14 md:bottom-0 left-0 right-0 md:static bg-white/95 md:bg-transparent backdrop-blur-md border-t md:border-t-0 border-line p-4 md:px-0 md:pt-6 z-30 flex items-center justify-between gap-4">
          <Button
            variant="outline"
            disabled={step === 1}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Back
          </Button>

          {step < 4 ? (
            <Button
              onClick={() => setStep((s) => Math.min(4, s + 1))}
              disabled={isScanning}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              {step === 1
                ? 'Continue to OCR Details'
                : step === 2
                ? 'Run Eligibility Check'
                : 'Continue to Pickup'}
            </Button>
          ) : (
            <Button
              onClick={handleFinalSubmit}
              icon={<CheckCircle2 className="w-5 h-5" />}
            >
              {eligibility.passedHardRules
                ? 'Submit Pack for Pharmacist Review'
                : 'Record Blocked Pack in Log'}
            </Button>
          )}
        </div>
      </div>
    </PageTransition>
  );
};
