# MedicineLink – UI/UX Design Document and Build Prompt

Version 1.0 · Companion to the PRD · Written so Google Antigravity can build a modern, animated front end

## 1. Design Vision

**Feeling:** calm, trustworthy, modern. It should look like a premium health-tech product, not a school project. Clean and clinical, but friendly.

**Design words:** Clear. Fresh. Safe. Alive (gentle motion everywhere, never noisy).

**Key ideas**

- **Trust first:** health is a sensitive topic, so show verification, pharmacist sign-off and safety rules clearly and often.
- **Motion with meaning:** every animation explains something (a pack being scanned, a status moving forward). No animation for decoration only.
- **Fast and simple:** a donor should finish a listing in under 2 minutes, on a phone.
- **Mobile first:** design for a 390px phone first, then scale up.

## 2. Visual Style

### 2.1 Colour tokens

| Token | Hex | Use |
| --- | --- | --- |
| ink | #14302E | Main text |
| deep-teal | #0F2F2E | Dark sections, hero, footer |
| teal | #1B9C85 | Primary buttons, links, highlights |
| mint | #6FD3BD | Accents on dark, glows, charts |
| surface | #F5F7F4 | Page background |
| card | #FFFFFF | Cards |
| line | #DDE5E1 | Borders |
| muted | #5B6B69 | Secondary text |
| coral | #D9553A | Rejected, errors, warnings |
| amber | #F2B84B | Pending, attention |
| success | #1B9C85 | Approved, completed |

**Signature gradient:** linear-gradient(135deg, #0F2F2E 0%, #1B9C85 100%). Use for the hero, key buttons and the dashboard header. Add soft blurred mint and teal "mesh blobs" behind hero and dark sections for depth.

### 2.2 Typography

- **Headings:** Plus Jakarta Sans (600 and 800). **Body:** Inter (400 and 500).
- Scale: 14, 16, 18, 24, 32, 48, 72 px. Hero headline 56 to 72px on desktop, 40px on mobile.
- Line height 1.1 to 1.2 for headings, 1.5 to 1.6 for body.
- Use simple, short sentences everywhere.

### 2.3 Shape, depth and spacing

- Radius: 12px for inputs, 20px for cards, 999px for pills and badges.
- Shadows: soft and layered, for example 0 10px 30px rgba(15,47,46,0.08). Cards lift on hover.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 96. Generous white space between sections (96px desktop, 64px mobile).
- Layout: 12-column grid, max width 1200px, **bento grid** (cards of mixed sizes) for feature and dashboard areas.
- Glass effect (blur plus translucent white) only on the sticky navbar and floating cards over the hero. Do not overuse.

### 2.4 Graphics and illustration (no stock photos needed)

- **Custom SVG illustrations** in the brand colours: 3D-style capsules and tablets, a medicine box, a heart, a map pin, a shield with a tick, hands passing a pack.
- **Floating pills hero:** 6 to 10 capsule and tablet shapes (CSS or SVG with soft gradients and shadows) floating at different depths, reacting to mouse movement and scroll (parallax).
- **Gradient mesh and grain:** blurred mint, teal and soft white blobs with a subtle noise overlay.
- **Icons:** Lucide icon set, 1.75px stroke, in rounded containers (48px circles or squircles with a tinted background).
- **Data graphics:** rounded bar charts, donut charts and ring progress for the dashboard (Recharts), with gradient fills.
- **Lottie or CSS animations** for key moments: scanning a pack, approval tick, delivery truck, confetti-lite on completion.
- All illustrations must be inline SVG or CSS so nothing is blocked and everything scales without blur.

## 3. Motion and Animation System

### 3.1 Principles

- Animate only **transform and opacity** for smoothness. Target 60 fps.
- Timing: micro-interactions 150 to 250 ms, reveals 500 to 700 ms, hero entrance up to 1 s.
- Easing: cubic-bezier(0.22, 1, 0.36, 1) for entrances, ease-in-out for loops.
- Stagger children by 80 to 120 ms.
- **Respect prefers-reduced-motion:** turn off parallax, autoplay and big movements, and keep simple fades.

### 3.2 Scroll animations

| Where | Effect |
| --- | --- |
| Whole site | Smooth, inertial scrolling (Lenis) |
| Top of page | Scroll progress bar in teal under the navbar |
| Navbar | Becomes glass and shrinks slightly after 40px of scroll; hides when scrolling down, shows when scrolling up |
| Section content | Fade up and slide 24px, staggered, triggered when 20 percent visible (once) |
| Hero | Floating pills move at different speeds (parallax) as you scroll; headline gently fades and scales down |
| How It Works | **Scroll-driven story:** the section is pinned, and as you scroll the 6 steps highlight one by one while the illustration on the right changes (list, scan, verify, match, pickup, received) |
| Numbers | Counters count up from 0 when they enter the screen |
| Safety section | Check marks and cross marks draw themselves (SVG stroke animation) as the cards appear |
| Footer or final call to action | Big gradient section with slow-moving blobs and a magnetic button |

### 3.3 Sliders and carousels

1. **Hero showcase slider (landing page):** three slides that explain the idea in pictures: "Unused medicine at home", "Checked by a pharmacist", "Delivered to someone who needs it". Auto-advances every 5 s, pauses on hover and touch, has dots with a progress fill, and supports swipe and keyboard arrows. Slides cross-fade with a slight zoom.
2. **Impact stories slider:** card carousel with drag and snap, partial next card visible (peek), momentum scrolling, and arrows on desktop. Use sample stories marked clearly as examples.
3. **Pack photo gallery slider (donor form and review screen):** swipe between photos, pinch to zoom on mobile.
4. **Settings sliders:** range slider with animated thumb and live value label (for example minimum shelf life 3 to 12 months, search distance 1 to 25 km).
5. **Partner marquee:** slow, infinite horizontal logo or name strip that pauses on hover.

### 3.4 Micro-interactions

- Buttons: slight lift and glow on hover, press-down scale 0.97, magnetic effect on the main call to action (desktop only).
- Cards: soft 3D tilt toward the cursor (max 6 degrees) and shadow growth on hover.
- Inputs: label floats up, border animates to teal, error shakes once.
- Upload: drag area pulses when a file is dragged over it.
- **Scanning animation:** when a photo is uploaded, a teal scan line sweeps across the image, then detected fields (batch, expiry) pop in with highlight boxes drawn around the text.
- **Eligibility result:** green circle with a drawn tick (accepted) or coral circle with a cross and a small shake (blocked), with a plain reason.
- **Status timeline:** the line fills with teal as the donation moves forward; the current step pulses.
- **Completion:** lightweight confetti burst and a thank-you card when an NGO confirms receipt.
- Page transitions: quick cross-fade and 16px slide between routes.
- Loading: skeleton shimmer placeholders instead of spinners; toasts slide in from the top right.

## 4. Information Architecture

- **Public:** Home, How It Works, What We Accept, About, Login, Sign Up.
- **Donor:** My Donations, New Donation, Donation Detail, Profile.
- **Pharmacist:** Review Queue, Review Item, History.
- **NGO or Clinic:** Needs, Matches, Pickups, Received.
- **Admin:** Organisations, Dashboard, Audit Log, Settings.

**Navigation:** top glass navbar on desktop. On mobile, a bottom tab bar with 4 icons for logged-in users and a slide-in menu for visitors. A persistent slim banner says: "Prototype for educational purposes. Do not use for real medicines."

## 5. Page-by-Page Design

### 5.1 Landing page (most important, designed to impress)

1. **Hero:** deep-teal gradient with mesh blobs and floating pills. Headline: "Turn unused medicines into care." Subtext: "Safe, verified and simple." Two buttons: "Donate medicines" and "I represent an NGO". A glass card floats on the right showing a live-looking status timeline.
2. **Hero showcase slider** (Section 3.3, item 1) directly below or inside the hero.
3. **Problem in numbers:** 3 big animated counters (40 to 50 percent, 21 percent, 38 million) with short plain captions and a small source line.
4. **How it works:** pinned scroll story with 6 steps (Section 3.2).
5. **What we accept:** two-column card pair with drawn check and cross icons.
6. **Trust and safety:** pharmacist sign-off, tamper-evident label, QR code, audit trail, shown as a bento grid with small animated illustrations.
7. **Impact dashboard preview:** blurred screenshot-style mock with animated bars and rings.
8. **Impact stories slider** (sample content, clearly labelled).
9. **Partner marquee** and **FAQ accordion** (smooth height animation).
10. **Final call to action** with gradient, blobs and a magnetic button, then footer with the disclaimer.

### 5.2 Donor: New Donation (stepper wizard, 4 steps)

1. **Photo:** big camera or upload area, tips with icons ("Show the batch and expiry clearly"). On upload, run the scan animation.
2. **Details:** form pre-filled by OCR with highlighted fields; confidence shown as a small badge. Easy edit.
3. **Check:** animated eligibility result; blocked items explain exactly why and what to do instead.
4. **Pickup:** map with a draggable pin (Leaflet), time-window chips, then Submit.

- A thin progress bar and step dots at the top; the Next button stays fixed at the bottom on mobile.

### 5.3 Donor: My Donations

Cards with a medicine thumbnail, name, quantity, status badge and a mini timeline. Filter chips (All, Pending, Approved, Rejected, Completed). Empty state with an illustration and a button to donate.

### 5.4 Pharmacist: Review

- **Queue:** list with urgency based on oldest first, expiry chips and a flag icon for low OCR confidence.
- **Review screen:** split layout. Left: zoomable photo slider. Right: details, OCR text, automatic check results (green or red rows), and decision buttons. Keyboard shortcuts: A to approve, R to reject, arrows for next item.
- **Approval moment:** QR code animates into place and a verification code appears.

### 5.5 NGO or Clinic: Needs and Matches

- Needs as a card grid with urgency pills (low, medium, high) and quantity bars.
- Matches as cards with a **score ring** that animates to its value and a tap-to-open breakdown (medicine match, distance, urgency). Buttons: Accept, Decline.
- Pickup and Received tabs with the status timeline and a "Confirm received" button that triggers the completion animation.

### 5.6 Admin: Dashboard

- **Bento grid** of stat cards with counters (listed, approved, rejected, matched, completed, value saved), a donut chart for rejection reasons, a bar chart for items per week, and a recent activity feed.
- Organisation verification table with approve and reject actions. Audit log with search and filters.

## 6. Component Library

Button (primary, secondary, ghost, danger), Input and floating label, Select, Chips, Badge (status), Card (flat, glass, bento), Modal and Drawer, Toast, Tabs, Stepper, Timeline, Accordion, Carousel, Range slider, Score ring, Counter, Skeleton, Empty state, Navbar and bottom tab bar, Banner, Upload area, QR display, Map picker, Chart wrappers.

**Status badges:** Listed (grey), Pending review (amber), Approved (teal), Rejected (coral), Matched (blue-teal), In transit (mint), Received (deep teal with tick), Expired (grey with strike).

## 7. UX Writing

Use simple English and a warm, calm tone.

- Good: "This pack expires in 3 months. We need at least 6 months so it stays useful."
- Avoid: "Validation failed: shelf life threshold not met."
- Empty state: "No donations yet. Got a sealed medicine you do not need? Let's put it to good use."
- Success: "Thank you! Your medicine is now with a pharmacist for checking."

## 8. Accessibility and Quality Rules

- Text contrast at least 4.5:1 (3:1 for large text). Do not use colour alone for status; add icons and text.
- Tap targets at least 44 by 44 px. Visible focus rings on every control. Full keyboard use.
- Alt text and ARIA labels, including on sliders and charts. Pause control for autoplay.
- prefers-reduced-motion respected everywhere.
- Performance: Lighthouse score 90 or more, images lazy-loaded, animations GPU-friendly, no layout shift.
- Responsive breakpoints: 390, 768, 1024, 1280 px.
- Optional: dark mode using the deep-teal palette.

## 9. Recommended Front-End Stack

| Need | Library |
| --- | --- |
| Framework and styling | React, Vite, Tailwind CSS, shadcn/ui |
| Animation | Framer Motion (reveals, layout, gestures) |
| Smooth scroll | Lenis |
| Scroll-pinned story (optional) | GSAP and ScrollTrigger, or Framer Motion useScroll |
| Sliders | Embla Carousel (with autoplay plugin) |
| Icons | Lucide React |
| Charts | Recharts |
| Counters | react-countup or a small custom hook |
| Map | Leaflet and OpenStreetMap |
| Confetti | canvas-confetti |
| Fonts | Plus Jakarta Sans and Inter (Google Fonts) |

## 10. Ready-to-Paste Prompts for Antigravity

Save this file and the PRD in your project folder as UIUX.md and PRD.md. Use the master prompt first, then the page prompts one at a time.

### 10.1 Master prompt (design system and landing page)

```
Read PRD.md and UIUX.md in this project. We are building the front end of
MedicineLink, a class-project prototype that uses dummy data only.

Goal: a modern, premium health-tech UI that feels alive, with smooth
scroll animation, sliders and beautiful graphics.

Stack: React + Vite + Tailwind CSS + shadcn/ui, Framer Motion, Lenis for
smooth scrolling, Embla Carousel with autoplay, Lucide icons, Recharts.

First show me a short plan and the folder structure. Then build, in this order:
1. The design system from UIUX.md Section 2: Tailwind theme with the colour
   tokens, Plus Jakarta Sans + Inter fonts, radius, shadows, spacing, and
   reusable components (Button, Card, Badge, Input, Chip, Modal, Toast,
   Stepper, Timeline, Accordion, Skeleton, ScoreRing, Counter).
2. Global motion setup: Lenis smooth scroll, a scroll progress bar, a
   reusable <Reveal> component (fade up + stagger, once), page transitions,
   and full support for prefers-reduced-motion.
3. The full landing page from UIUX.md Section 5.1: deep-teal gradient hero
   with floating capsule/tablet SVG illustrations that move with parallax
   and mouse movement, a hero showcase slider (3 slides, autoplay 5s,
   pause on hover, swipe, dots with progress fill), animated counters, a
   pinned scroll-driven "How it works" section with 6 steps whose
   illustration changes as you scroll, a "What we accept" section with
   self-drawing check and cross icons, a bento grid trust section, a
   dashboard preview, an impact stories carousel (sample content labelled
   as examples), a partner marquee, an FAQ accordion, and a gradient final
   call to action with a magnetic button.
4. A glass navbar that shrinks on scroll and hides on scroll-down, a mobile
   bottom tab bar, and the slim disclaimer banner: "Prototype for
   educational purposes. Do not use for real medicines."

Rules: all graphics must be inline SVG or CSS (no external image hosting).
Animate only transform and opacity. Keep it mobile-first and accessible
(contrast 4.5:1, focus rings, keyboard support, aria labels, pause control
for autoplay). Use mock data in a /src/mock folder for now.

When finished, run the app, check it at 390px and 1280px widths, and tell
me what to look at.
```

### 10.2 Donor pages prompt

```
Using the design system already built, create the donor pages from
UIUX.md Sections 5.2 and 5.3: a 4-step New Donation wizard (photo, details,
check, pickup) with a drag-and-drop upload area, a scanning animation
(teal scan line sweeping the image, detected batch and expiry fields
popping in with highlight boxes), floating-label inputs, an animated
eligibility result (drawn green tick or coral cross with a shake and a
plain-English reason), a Leaflet map with a draggable pin, and a fixed
bottom Next button on mobile. Then build My Donations with status badges,
mini timelines, filter chips and an empty state. Use mock data and a fake
1.5s OCR delay for now.
```

### 10.3 Pharmacist and NGO pages prompt

```
Build the pharmacist and NGO pages from UIUX.md Sections 5.4 and 5.5:
- Review queue and a split-screen review page with a zoomable photo slider,
  OCR text, green/red automatic check rows, Approve and Reject buttons,
  keyboard shortcuts (A, R, arrows), and an animated QR code on approval.
- NGO Needs as cards with urgency pills and quantity bars.
- Matches as cards with an animated score ring and a breakdown drawer,
  Accept and Decline buttons.
- Pickups and Received tabs with an animated status timeline and a
  "Confirm received" button that triggers a canvas-confetti burst.
Use mock data only.
```

### 10.4 Admin dashboard prompt

```
Build the admin pages from UIUX.md Section 5.6: a bento-grid dashboard with
count-up stat cards, a donut chart of rejection reasons, a bar chart of
items per week (gradient fills, rounded bars, animated on load), a recent
activity feed, an organisation verification table, and a searchable audit
log. Add skeleton loaders and empty states.
```

### 10.5 Polish and quality prompt

```
Do a polish pass across the whole app: check contrast, focus states,
keyboard navigation, aria labels, reduced-motion behaviour and responsive
layouts at 390, 768, 1024 and 1280 px. Remove any layout shift, make sure
only transform and opacity are animated, lazy-load heavy parts, and aim for
a Lighthouse score of 90+. List anything you changed.
```

### 10.6 Connect to the real backend (after the PRD backend phases)

```
Replace the mock data with calls to the Express API described in PRD.md
Section 9. Keep loading skeletons, error toasts and optimistic updates for
status changes. Do not remove the disclaimer banner.
```

## 11. Tips for Best Results in Antigravity

1. Ask for a plan first, then approve it before code is written.
2. Build the front end with mock data first so you can see and love the design early, then connect the backend.
3. After each prompt, run the app and look at it on a phone-sized window and a laptop-sized window.
4. If something looks off, give precise feedback, for example: "The hero pills move too fast. Halve the parallax speed and add a soft shadow."
5. Commit to Git after every working step.
6. For extra wow, record a short screen capture of the scroll animations for your presentation.
