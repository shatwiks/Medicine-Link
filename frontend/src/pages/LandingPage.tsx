import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  HeartHandshake,
  Lock,
  Pause,
  Play,
  QrCode,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Truck,
} from 'lucide-react';
import { FloatingPillsHero } from '../components/illustrations/FloatingPillsHero';
import { StepIllustration } from '../components/illustrations/StepIllustrations';
import { PageTransition } from '../components/layout/PageTransition';
import { MagneticButton } from '../components/motion/MagneticButton';
import { Reveal } from '../components/motion/Reveal';
import { TiltCard } from '../components/motion/TiltCard';
import { Accordion } from '../components/ui/Accordion';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Counter } from '../components/ui/Counter';
import { ScoreRing } from '../components/ui/ScoreRing';
import { Timeline } from '../components/ui/Timeline';
import { useMockStore } from '../mock/mockStore';

const HERO_SLIDES = [
  {
    tag: 'Step 01 · At Home',
    title: 'Unused medicine at home',
    description:
      'Snap a quick photo of a factory-sealed blister strip or bottle. OCR reads the batch number and expiry date in seconds.',
    metric: 'Under 2 mins to list',
  },
  {
    tag: 'Step 02 · Clinical Gatekeeper',
    title: 'Checked by a licensed pharmacist',
    description:
      'Every pack undergoes 12 automated safety rules plus human verification by a registered pharmacist before matching.',
    metric: '100% RPh Verified',
  },
  {
    tag: 'Step 03 · Local Impact',
    title: 'Delivered to someone who needs it',
    description:
      'Our Haversine & urgency matching engine pairs verified packs with nearby NGOs and charitable clinics.',
    metric: 'Full QR Audit Trail',
  },
];

const HOW_IT_WORKS_STEPS = [
  {
    num: '01',
    title: 'List a Sealed Pack',
    desc: 'Confirm the medicine is unopened and stored at room temperature, then upload a clear photo.',
  },
  {
    num: '02',
    title: 'Instant OCR & Safety Scan',
    desc: 'Our OCR extracts batch and expiry dates while 12 eligibility rules block expired, cold-chain, or controlled items.',
  },
  {
    num: '03',
    title: 'Licensed Pharmacist Sign-Off',
    desc: 'A partner pharmacist inspects the pack photo and OCR data, issuing a tamper-evident QR verification code.',
  },
  {
    num: '04',
    title: 'Explainable NGO Matching',
    desc: 'Scored out of 100 across Generic/Strength match (50), Haversine distance (30), and clinical urgency (20).',
  },
  {
    num: '05',
    title: 'Scheduled Volunteer Pickup',
    desc: 'Once an NGO accepts the match, a pickup window is scheduled or the pack is dropped at a partner pharmacy.',
  },
  {
    num: '06',
    title: 'Verified Receipt & Audit Log',
    desc: 'The receiving clinic confirms delivery, updating the live impact dashboard and immutable audit trail.',
  },
];

const ACCEPTED_ITEMS = [
  'Factory-sealed blister strips (tablets & capsules)',
  'Unopened syrups, drops, and ointments with intact seal ring',
  'At least 6 months of remaining shelf life from today',
  'Clearly readable Batch Number (B.No) and Expiry Date (EXP)',
  'Stored at normal household room temperature',
];

const REJECTED_ITEMS = [
  'Expired medicines or packs with less than 6 months left',
  'Cold-chain items (Insulin pens, vaccines, biologics)',
  'Injectable vials, ampoules, or IV infusions',
  'Controlled / narcotic / psychotropic drugs (Tramadol, Diazepam, etc.)',
  'Loose tablets, cut strips missing batch/expiry, or opened bottles',
];

const IMPACT_STORIES = [
  {
    tag: 'Sample Example Story · Bengaluru',
    quote:
      'After my father’s hypertension prescription changed, we had three sealed strips of Amlodipine with 14 months left. Listing took 90 seconds.',
    author: 'Ritu M., Household Donor (Example)',
    outcome: 'Matched 2.1 km away to Care Street Clinic',
  },
  {
    tag: 'Sample Example Story · Partner RPh',
    quote:
      'Having OCR pre-highlight the batch and expiry alongside the 12 automated safety checks lets me verify a pack in under 30 seconds.',
    author: 'Dr. Vivek K., Licensed Pharmacist (Example)',
    outcome: '48 packs verified in pilot simulation',
  },
  {
    tag: 'Sample Example Story · Charitable NGO',
    quote:
      'The 0–100 score ring shows us exact generic match and distance before we accept. Every accepted pack arrives with a verification QR.',
    author: 'Ananya S., Asha Health Coordinator (Example)',
    outcome: '₹18,400 simulated medicine value saved',
  },
];

const FAQ_ITEMS = [
  {
    id: 'faq-1',
    question: 'Is MedicineLink used for real medicines right now?',
    answer:
      'No. MedicineLink is an educational class-project prototype running strictly on dummy data. In India, medicine distribution is governed by the Drugs and Cosmetics Act, 1940, and any real-world pilot requires licensed pharmacies, registered medical practitioners, and regulatory approval.',
  },
  {
    id: 'faq-2',
    question: 'How does the automatic eligibility check work?',
    answer:
      'Every item runs through 8 hard rules (minimum 6-month shelf life, not expired, sealed declaration, room-temperature declaration, allowed dosage form, not on the blocked controlled/cold-chain list, batch present, expiry present) and 4 soft flags (low OCR confidence, prescription-only, duplicate batch, unusual quantity).',
  },
  {
    id: 'faq-3',
    question: 'How is the 0–100 matching score calculated?',
    answer:
      'Medicine Match contributes up to 50 points (50 for exact generic and strength, 20 for same generic with different strength). Distance contributes up to 30 points using the Haversine formula (30 for 0–3 km, 22 for 3–10 km, 12 for 10–25 km). Clinical Urgency contributes up to 20 points (High = 20, Medium = 12, Low = 5).',
  },
  {
    id: 'faq-4',
    question: 'What if the OCR misreads my medicine pack photo?',
    answer:
      'You can freely edit every OCR-suggested field in Step 2 of the donation wizard. If OCR confidence is below 60%, the system automatically flags the item so the reviewing pharmacist checks the photo extra carefully.',
  },
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { switchRole } = useMockStore();
  const [activeStep, setActiveStep] = useState(0);

  // Hero Showcase Carousel
  const [isPlaying, setIsPlaying] = useState(true);
  const [heroEmblaRef, heroEmblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true }),
  ]);
  const [selectedHeroSlide, setSelectedHeroSlide] = useState(0);

  const onHeroSelect = useCallback(() => {
    if (!heroEmblaApi) return;
    setSelectedHeroSlide(heroEmblaApi.selectedScrollSnap());
  }, [heroEmblaApi]);

  useEffect(() => {
    if (!heroEmblaApi) return;
    onHeroSelect();
    heroEmblaApi.on('select', onHeroSelect);
  }, [heroEmblaApi, onHeroSelect]);

  const toggleAutoplay = () => {
    const autoplay = heroEmblaApi?.plugins()?.autoplay;
    if (!autoplay) return;
    if (isPlaying) {
      autoplay.stop();
      setIsPlaying(false);
    } else {
      autoplay.play();
      setIsPlaying(true);
    }
  };

  // Impact Stories Carousel
  const [storiesRef, storiesApi] = useEmblaCarousel({ align: 'start', loop: true });

  return (
    <PageTransition>
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-signature-gradient bg-grain text-white pt-12 pb-20 md:py-24">
        <FloatingPillsHero />

        <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Headline & CTAs */}
            <div className="lg:col-span-7 space-y-6">
              <Reveal>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-pill bg-white/10 border border-white/20 backdrop-blur-md text-mint text-xs font-semibold tracking-wide">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Pharmacist-Verified Surplus Medicine Redistribution</span>
                </div>
              </Reveal>

              <Reveal delay={0.08}>
                <h1 className="font-heading font-extrabold text-[40px] sm:text-6xl lg:text-[66px] leading-[1.08] tracking-tight text-white">
                  Turn unused medicines{' '}
                  <span className="text-mint underline decoration-teal-400/50 decoration-wavy underline-offset-8">
                    into care.
                  </span>
                </h1>
              </Reveal>

              <Reveal delay={0.16}>
                <p className="text-lg sm:text-xl text-white/90 max-w-xl leading-relaxed font-normal">
                  Safe, verified and simple. List sealed household medicines in under 2 minutes, have a licensed pharmacist verify them, and match them to local NGOs and clinics.
                </p>
              </Reveal>

              <Reveal delay={0.24}>
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <MagneticButton>
                    <Button
                      size="lg"
                      variant="white"
                      onClick={() => {
                        switchRole('donor');
                        navigate('/donor/new');
                      }}
                      icon={<HeartHandshake className="w-5 h-5 text-teal" />}
                    >
                      Donate medicines
                    </Button>
                  </MagneticButton>

                  <Button
                    size="lg"
                    variant="glass"
                    onClick={() => {
                      switchRole('ngo');
                      navigate('/ngo/dashboard');
                    }}
                    icon={<Building2 className="w-5 h-5 text-mint" />}
                  >
                    I represent an NGO
                  </Button>
                </div>
              </Reveal>

              <Reveal delay={0.32}>
                <div className="pt-4 flex flex-wrap items-center gap-6 text-xs font-medium text-white/90">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-mint" />
                    6+ Months Shelf Life Rule
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-mint" />
                    Licensed Pharmacist Sign-Off
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-mint" />
                    QR Traceability
                  </span>
                </div>
              </Reveal>
            </div>

            {/* Right Column: Floating Glass Live Status Timeline Card */}
            <div className="lg:col-span-5">
              <Reveal delay={0.2}>
                <TiltCard className="rounded-card glass-dark border border-white/20 p-6 sm:p-7 shadow-lift text-white space-y-5">
                  <div className="flex items-center justify-between border-b border-white/15 pb-4">
                    <div>
                      <span className="text-[11px] uppercase tracking-widest text-mint font-semibold">
                        Live Traceability Preview
                      </span>
                      <h3 className="text-lg font-heading font-bold text-white mt-0.5">
                        Glycomet 500 (Metformin)
                      </h3>
                      <p className="text-xs text-white/70">
                        40 Tablets · Batch GL4412M · Exp 09/2027
                      </p>
                    </div>
                    <Badge status="MATCHED" />
                  </div>

                  {/* OCR & Verification Summary */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-white/10 border border-white/10">
                      <span className="text-white/60 block">OCR Confidence</span>
                      <strong className="text-mint text-sm font-heading">96% Verified</strong>
                    </div>
                    <div className="p-3 rounded-xl bg-white/10 border border-white/10">
                      <span className="text-white/60 block">Pharmacist QR</span>
                      <strong className="text-white text-sm font-mono">ML-VER-9042</strong>
                    </div>
                  </div>

                  {/* Interactive Timeline */}
                  <div className="bg-white/95 rounded-xl p-4 text-ink">
                    <Timeline status="MATCHED" />
                  </div>

                  <div className="flex items-center justify-between text-xs text-white/80 pt-1">
                    <span>Matched to: Asha Health Foundation (1.4 km)</span>
                    <span className="px-2.5 py-1 rounded-pill bg-mint/20 text-mint font-bold">
                      100/100 Match
                    </span>
                  </div>
                </TiltCard>
              </Reveal>
            </div>
          </div>

          {/* 2. HERO SHOWCASE SLIDER (3 slides, autoplay 5s, pause control, dots) */}
          <Reveal delay={0.35} className="mt-14">
            <div className="rounded-card bg-white/10 backdrop-blur-md border border-white/15 p-5 sm:p-6">
              <div className="overflow-hidden" ref={heroEmblaRef}>
                <div className="flex">
                  {HERO_SLIDES.map((slide, i) => (
                    <div key={i} className="flex-[0_0_100%] min-w-0 px-2">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <span className="text-xs font-bold uppercase tracking-widest text-mint">
                            {slide.tag}
                          </span>
                          <h2 className="text-xl sm:text-2xl font-heading font-bold text-white">
                            {slide.title}
                          </h2>
                          <p className="text-sm text-white/80 max-w-2xl">{slide.description}</p>
                        </div>
                        <div className="shrink-0">
                          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-pill bg-teal text-white font-heading font-bold text-xs shadow-glow">
                            <Sparkles className="w-3.5 h-3.5" />
                            {slide.metric}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Slider Controls & Progress Dots */}
              <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {HERO_SLIDES.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => heroEmblaApi?.scrollTo(idx)}
                      aria-label={`Go to showcase slide ${idx + 1}`}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        selectedHeroSlide === idx ? 'w-10 bg-mint' : 'w-2.5 bg-white/30'
                      }`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleAutoplay}
                    aria-label={isPlaying ? 'Pause showcase slider' : 'Play showcase slider'}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => heroEmblaApi?.scrollPrev()}
                    aria-label="Previous slide"
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => heroEmblaApi?.scrollNext()}
                    aria-label="Next slide"
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 3. PROBLEM IN NUMBERS (3 animated counters) */}
      <section className="py-16 md:py-24 max-w-[1200px] mx-auto px-4 sm:px-6">
        <Reveal>
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-teal">
              Why MedicineLink Exists
            </span>
            <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-ink mt-2">
              Millions in safe medicine sits unused while families pay out of pocket
            </h2>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Reveal delay={0.05}>
            <Card hoverLift className="text-center p-8">
              <div className="text-4xl sm:text-5xl font-heading font-extrabold text-teal">
                <Counter end={45} suffix="%" />
              </div>
              <p className="font-heading font-bold text-ink mt-3 text-lg">
                Out-of-Pocket Health Spend
              </p>
              <p className="text-sm text-muted mt-1">
                40–50% of household health expenditure in India goes directly toward buying medicines.
              </p>
            </Card>
          </Reveal>

          <Reveal delay={0.12}>
            <Card hoverLift className="text-center p-8">
              <div className="text-4xl sm:text-5xl font-heading font-extrabold text-deep-teal">
                <Counter end={21} suffix="%" />
              </div>
              <p className="font-heading font-bold text-ink mt-3 text-lg">
                Household Packs Unused
              </p>
              <p className="text-sm text-muted mt-1">
                Over a fifth of purchased household strips remain sealed and unused after treatment changes.
              </p>
            </Card>
          </Reveal>

          <Reveal delay={0.2}>
            <Card hoverLift className="text-center p-8">
              <div className="text-4xl sm:text-5xl font-heading font-extrabold text-coral">
                <Counter end={38} suffix="M" />
              </div>
              <p className="font-heading font-bold text-ink mt-3 text-lg">
                Pushed Into Care Hardship
              </p>
              <p className="text-sm text-muted mt-1">
                People annually affected by high out-of-pocket drug costs (NSSO / WHO health financing estimates).
              </p>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* 4. HOW IT WORKS (Scroll-driven / Interactive 6-step story) */}
      <section className="py-16 md:py-24 bg-white border-y border-line">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <Reveal>
            <div className="max-w-2xl mb-12">
              <span className="text-xs font-bold uppercase tracking-widest text-teal">
                6-Step Traceable Workflow
              </span>
              <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-ink mt-2">
                How MedicineLink moves a pack from cabinet to clinic
              </h2>
              <p className="text-muted mt-2 text-base">
                Click or scroll through each stage to see how safety rules and pharmacist sign-off protect every step.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: 6 interactive steps */}
            <div className="lg:col-span-7 space-y-3">
              {HOW_IT_WORKS_STEPS.map((s, idx) => {
                const active = activeStep === idx;
                return (
                  <motion.div
                    key={s.num}
                    onViewportEnter={() => setActiveStep(idx)}
                    viewport={{ amount: 0.6 }}
                    onClick={() => setActiveStep(idx)}
                    className={`cursor-pointer rounded-card p-5 border transition-all duration-300 ${
                      active
                        ? 'bg-teal-50/70 border-teal shadow-soft'
                        : 'bg-surface/60 border-line hover:border-teal/40'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <span
                        className={`w-10 h-10 rounded-xl font-heading font-extrabold text-sm flex items-center justify-center shrink-0 transition-colors ${
                          active ? 'bg-deep-teal text-mint' : 'bg-white text-muted border border-line'
                        }`}
                      >
                        {s.num}
                      </span>
                      <div>
                        <h3 className="font-heading font-bold text-lg text-ink">{s.title}</h3>
                        <p className="text-sm text-muted mt-1 leading-relaxed">{s.desc}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Right: Sticky changing illustration */}
            <div className="lg:col-span-5 lg:sticky lg:top-28 space-y-4">
              <StepIllustration stepIndex={activeStep} />
              <Card className="bg-surface border-line">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase text-teal">
                      Active Stage {HOW_IT_WORKS_STEPS[activeStep].num}
                    </span>
                    <h4 className="font-heading font-bold text-ink">
                      {HOW_IT_WORKS_STEPS[activeStep].title}
                    </h4>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => navigate('/donor/new')}
                    icon={<ArrowRight className="w-4 h-4" />}
                  >
                    Try It Live
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* 5. WHAT WE ACCEPT (Two-column card pair with self-drawing SVG check and cross icons) */}
      <section className="py-16 md:py-24 max-w-[1200px] mx-auto px-4 sm:px-6">
        <Reveal>
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-teal">
              Strict Eligibility Engine
            </span>
            <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-ink mt-2">
              What we accept — and what we automatically block
            </h2>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Accepted Card */}
          <Reveal delay={0.05}>
            <Card className="border-2 border-teal/30 h-full">
              <div className="flex items-center gap-3 pb-4 border-b border-line">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <motion.path
                      d="M6 14.5L11.5 20L22 8.5"
                      stroke="#1B9C85"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      whileInView={{ pathLength: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </svg>
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-teal">
                    Eligible for Pharmacist Review
                  </span>
                  <h3 className="text-xl font-heading font-extrabold text-ink">
                    Accepted Medicines
                  </h3>
                </div>
              </div>
              <ul className="mt-5 space-y-3.5">
                {ACCEPTED_ITEMS.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-ink">
                    <span className="w-5 h-5 rounded-full bg-teal/15 text-teal flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                      ✓
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </Reveal>

          {/* Blocked Card */}
          <Reveal delay={0.15}>
            <Card className="border-2 border-coral/30 h-full">
              <div className="flex items-center gap-3 pb-4 border-b border-line">
                <div className="w-12 h-12 rounded-2xl bg-coral-light flex items-center justify-center text-coral">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <motion.path
                      d="M8 8L20 20M20 8L8 20"
                      stroke="#D9553A"
                      strokeWidth="3"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      whileInView={{ pathLength: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </svg>
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-coral">
                    Hard Safety Block
                  </span>
                  <h3 className="text-xl font-heading font-extrabold text-ink">
                    Never Accepted
                  </h3>
                </div>
              </div>
              <ul className="mt-5 space-y-3.5">
                {REJECTED_ITEMS.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-ink">
                    <span className="w-5 h-5 rounded-full bg-coral/15 text-coral flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                      ✕
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* 6. TRUST & SAFETY BENTO GRID */}
      <section className="py-16 md:py-24 bg-deep-teal text-white relative overflow-hidden">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 relative z-10">
          <Reveal>
            <div className="max-w-2xl mb-12">
              <span className="text-xs font-bold uppercase tracking-widest text-mint">
                Clinical Governance First
              </span>
              <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-white mt-2">
                Four layers of verification before a medicine pack is ever matched
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <Reveal className="md:col-span-7">
              <div className="rounded-card bg-white/10 border border-white/15 p-7 h-full flex flex-col justify-between">
                <div className="w-12 h-12 rounded-2xl bg-teal/30 border border-mint/40 flex items-center justify-center text-mint mb-5">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-heading font-bold text-white">
                    1. Licensed Pharmacist Sign-Off
                  </h3>
                  <p className="text-sm text-white/75 mt-2 leading-relaxed">
                    No pack can be matched to an NGO directly from a donor. A verified pharmacist inspects the high-resolution pack photo, confirms batch & expiry against OCR, and records a formal decision.
                  </p>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.1} className="md:col-span-5">
              <div className="rounded-card bg-white/10 border border-white/15 p-7 h-full flex flex-col justify-between">
                <div className="w-12 h-12 rounded-2xl bg-teal/30 border border-mint/40 flex items-center justify-center text-mint mb-5">
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-heading font-bold text-white">
                    2. Unique QR Verification Code
                  </h3>
                  <p className="text-sm text-white/75 mt-2 leading-relaxed">
                    Approved packs receive a unique cryptographic code (e.g., <code className="text-mint">ML-VER-9042-GL</code>) rendered as a scannable QR label for physical handover.
                  </p>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.15} className="md:col-span-5">
              <div className="rounded-card bg-white/10 border border-white/15 p-7 h-full flex flex-col justify-between">
                <div className="w-12 h-12 rounded-2xl bg-teal/30 border border-mint/40 flex items-center justify-center text-mint mb-5">
                  <ScanLine className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-heading font-bold text-white">
                    3. 12-Rule Automated Gatekeeper
                  </h3>
                  <p className="text-sm text-white/75 mt-2 leading-relaxed">
                    Instant server-enforced rules block expired packs, cold-chain biologics, injectables, and controlled substances before they even enter the review queue.
                  </p>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.2} className="md:col-span-7">
              <div className="rounded-card bg-white/10 border border-white/15 p-7 h-full flex flex-col justify-between">
                <div className="w-12 h-12 rounded-2xl bg-teal/30 border border-mint/40 flex items-center justify-center text-mint mb-5">
                  <FileSearch className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-heading font-bold text-white">
                    4. Append-Only Audit Log & Verified NGOs
                  </h3>
                  <p className="text-sm text-white/75 mt-2 leading-relaxed">
                    Every status transition, pharmacist decision, and NGO receipt confirmation is permanently recorded in an immutable SQLite audit table protected by database triggers.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 7. IMPACT DASHBOARD PREVIEW */}
      <section className="py-16 md:py-24 max-w-[1200px] mx-auto px-4 sm:px-6">
        <Reveal>
          <div className="rounded-card bg-white border border-line shadow-lift p-6 sm:p-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-line">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-teal">
                  Real-Time Transparency
                </span>
                <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-ink mt-1">
                  Live Impact & Matching Preview
                </h2>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  switchRole('admin');
                  navigate('/admin/dashboard');
                }}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Open Full Impact Dashboard
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
              <div className="p-5 rounded-card bg-surface border border-line">
                <span className="text-xs font-semibold text-muted">Packs Listed (Demo)</span>
                <div className="text-3xl font-heading font-extrabold text-ink mt-1">
                  <Counter end={236} />
                </div>
                <span className="text-xs text-teal font-semibold mt-1 block">
                  +18% this week
                </span>
              </div>
              <div className="p-5 rounded-card bg-surface border border-line">
                <span className="text-xs font-semibold text-muted">Pharmacist Approved</span>
                <div className="text-3xl font-heading font-extrabold text-teal mt-1">
                  <Counter end={186} />
                </div>
                <span className="text-xs text-muted mt-1 block">78.8% pass rate</span>
              </div>
              <div className="p-5 rounded-card bg-surface border border-line">
                <span className="text-xs font-semibold text-muted">Completed Deliveries</span>
                <div className="text-3xl font-heading font-extrabold text-deep-teal mt-1">
                  <Counter end={155} />
                </div>
                <span className="text-xs text-teal font-semibold mt-1 block">
                  Zero safety incidents
                </span>
              </div>
              <div className="p-5 rounded-card bg-surface border border-line flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-muted">Avg Match Score</span>
                  <div className="text-2xl font-heading font-extrabold text-ink mt-1">
                    94 / 100
                  </div>
                  <span className="text-xs text-muted">Under 4 km radius</span>
                </div>
                <ScoreRing score={94} size={60} />
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* 8. IMPACT STORIES CAROUSEL (Clearly labelled as sample examples) */}
      <section className="py-14 bg-surface border-t border-line">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-teal">
                Illustrative Scenarios (Sample Data)
              </span>
              <h2 className="text-3xl font-heading font-extrabold text-ink mt-1">
                How each persona experiences MedicineLink
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => storiesApi?.scrollPrev()}
                aria-label="Previous story"
                className="w-10 h-10 rounded-full bg-white border border-line flex items-center justify-center text-ink hover:border-teal"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => storiesApi?.scrollNext()}
                aria-label="Next story"
                className="w-10 h-10 rounded-full bg-white border border-line flex items-center justify-center text-ink hover:border-teal"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="overflow-hidden" ref={storiesRef}>
            <div className="flex -ml-4">
              {IMPACT_STORIES.map((story, idx) => (
                <div
                  key={idx}
                  className="pl-4 flex-[0_0_90%] sm:flex-[0_0_50%] lg:flex-[0_0_33.333%] min-w-0"
                >
                  <Card className="h-full flex flex-col justify-between">
                    <div className="space-y-3">
                      <span className="inline-block px-2.5 py-1 rounded-pill bg-teal-50 text-teal-700 text-[11px] font-bold">
                        {story.tag}
                      </span>
                      <p className="text-sm text-ink leading-relaxed italic">
                        “{story.quote}”
                      </p>
                    </div>
                    <div className="pt-4 mt-6 border-t border-line">
                      <p className="text-sm font-heading font-bold text-ink">{story.author}</p>
                      <p className="text-xs text-teal font-semibold mt-0.5">{story.outcome}</p>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 9. PARTNER MARQUEE & FAQ ACCORDION */}
      <section className="py-12 bg-white border-y border-line overflow-hidden">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 mb-6 text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted">
            Simulated Partner Network (Demo Organisations)
          </span>
        </div>
        <div className="relative flex overflow-x-hidden group">
          <div className="flex animate-marquee group-hover:[animation-play-state:paused] whitespace-nowrap gap-12 py-2">
            {[
              'Asha Health Foundation (NGO)',
              'GreenCross Partner Pharmacy',
              'Care Street Community Clinic',
              'Hope Helpers Charitable Trust',
              'Bengaluru Jan Aushadhi Network (Demo)',
              'Asha Health Foundation (NGO)',
              'GreenCross Partner Pharmacy',
              'Care Street Community Clinic',
              'Hope Helpers Charitable Trust',
              'Bengaluru Jan Aushadhi Network (Demo)',
            ].map((name, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-pill bg-surface border border-line text-sm font-heading font-bold text-muted"
              >
                <ShieldCheck className="w-4 h-4 text-teal" />
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 max-w-[900px] mx-auto px-4 sm:px-6">
        <Reveal>
          <div className="text-center mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-teal">
              Frequently Asked Questions
            </span>
            <h2 className="text-3xl font-heading font-extrabold text-ink mt-2">
              Safety, compliance & prototype scope
            </h2>
          </div>
          <Accordion items={FAQ_ITEMS} />
        </Reveal>
      </section>

      {/* 10. FINAL CALL TO ACTION */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-[1200px] mx-auto rounded-card bg-signature-gradient bg-grain text-white p-8 sm:p-14 text-center relative overflow-hidden shadow-lift">
          <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-mint/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-teal/30 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl sm:text-5xl font-heading font-extrabold leading-tight">
              Ready to explore the full 3-minute live demo?
            </h2>
            <p className="text-white/85 text-base sm:text-lg">
              Test listing a medicine pack with simulated OCR, approve it as a pharmacist with a QR code, and accept the match as an NGO.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <MagneticButton>
                <Button
                  size="lg"
                  variant="white"
                  onClick={() => {
                    switchRole('donor');
                    navigate('/donor/new');
                  }}
                  icon={<HeartHandshake className="w-5 h-5 text-teal" />}
                >
                  Start Step 1: Donate a Pack
                </Button>
              </MagneticButton>
              <Button
                size="lg"
                variant="glass"
                onClick={() => {
                  switchRole('pharmacist');
                  navigate('/pharmacist/review');
                }}
              >
                Open Pharmacist Queue
              </Button>
            </div>
          </div>
        </div>
      </section>
    </PageTransition>
  );
};
