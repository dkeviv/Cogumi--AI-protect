**I Modernization Spec (No Feature Changes)**

**Scope**

* Update styling/layout only.
* Keep all data flow, component props, and behavior unchanged.
* No new screens, no new API calls, no new state logic.
* Existing components must render the same information.

---

## 0) Global Design System

**Typography**

* Primary: **Space Grotesk** (or **IBM Plex Sans** if you prefer)
* Monospace: **IBM Plex Mono**
* If font load fails, fallback to **system-ui**.

**Color Palette**

* Background base: **#0E1116** (dark) or **#F6F7FB** (light) — pick one and apply consistently.
  If unsure, use **light** for MVP.
* Primary text: **#0C0F14**
* Secondary text: **#576071**
* Card background: **#FFFFFF**
* Border: **#E6E8ED**
* Accent (primary CTA): **#2563EB**
* Severity:
  * Critical: **#DC2626**
  * High: **#F97316**
  * Medium: **#EAB308**
  * Low: **#3B82F6**
  * Info: **#6B7280**

**Shadows**

* Card: [0 8px 24px rgba(0,0,0,0.06)](app://-/index.html# "0 8px 24px rgba(0,0,0,0.06)")
* Drawer: [0 12px 40px rgba(0,0,0,0.12)](app://-/index.html# "0 12px 40px rgba(0,0,0,0.12)")

**Spacing**

* Base grid: 8px
* Section padding: 24px
* Card padding: 20px

---

## 1) Dashboard ([page.tsx](app://-/index.html# "apps/ui/src/app/dashboard/page.tsx"))

**Goal:** Cleaner, more premium header + cards.

**Changes**

* Header height: 64px, add subtle background blur.
* Project list section title should be larger (text-2xl).
* Add subtle card background around **ProjectsList**.

**Do not change** logic for **session**, **signOut**, or **ProjectsList**.

---

## 2) Run Page Layout ([page.tsx](app://-/index.html# "apps/ui/src/app/runs/[runId]/page.tsx"))

**Goal:** Make it look premium and modern, no structural changes.

**Changes**

* Replace **h-screen** with **min-h-screen** + **bg** wrapper.
* Add subtle gradient background behind the three columns.
* Add **gap** between columns (currently zero).
* Use consistent column padding and card elevation.

**Keep** the same components and prop wiring.

---

## 3) Run Header ([RunHeader.tsx](app://-/index.html# "apps/ui/src/components/run/RunHeader.tsx"))

**Goal:** Modern command‑bar style.

**Changes**

* Replace current large block with:
  * Left: Run ID, timestamp, status pill.
  * Right: Risk score, duration, and report button.
* Increase hierarchy: run ID text‑lg, status in pill with border.
* Replace large colored badges with  **small pills** .

**Do not change** the report generation logic.

---

## 4) Exploit Feed ([ExploitFeed.tsx](app://-/index.html# "apps/ui/src/components/run/ExploitFeed.tsx"))

**Goal:** Premium feed cards.

**Changes**

* Remove emoji icons. Use colored dot + label.
* Replace “border‑2 highlight” with left accent strip:
  * Example: **border-l-4 border-red-500**
* Card background: **#FFF**, hover shadow.
* Severity badge → small “chip” top‑right with muted background.

**Do not change** the sorting or selection behavior.

---

## 5) Timeline Scrubber ([TimelineScrubber.tsx](app://-/index.html# "apps/ui/src/components/run/TimelineScrubber.tsx"))

**Goal:** Minimal, modern timeline.

**Changes**

* Replace slider styling with a custom thumb.
* Reduce legend size; make markers more subtle.
* Add **min-height** so it doesn’t collapse.

**No logic changes** to markers or **onChangeSeq**.

---

## 6) Evidence Tabs ([EvidenceTabs.tsx](app://-/index.html# "apps/ui/src/components/run/EvidenceTabs.tsx"))

**Goal:** Cleaner tab bar + cards.

**Changes**

* Tab bar background slightly tinted, active tab should be a filled pill.
* For conversation/network cards:
  * Use monospace block with subtle border.
  * Reduce large emojis.

**Do not change** filtering logic.

---

## 7) Proof Drawer ([ProofDrawer.tsx](app://-/index.html# "apps/ui/src/components/run/ProofDrawer.tsx"))

**Goal:** Make it feel like a modern slide‑over.

**Changes**

* Increase width to 640px.
* Add blur background on overlay.
* Card design: white cards with subtle border and shadow.
* Remove emoji icons.

**Do not change** expand/collapse logic.

---

## 8) Connect Wizard ([ConnectWizard.tsx](app://-/index.html# "apps/ui/src/components/projects/ConnectWizard.tsx"))

**Goal:** Cleaner stepper and code blocks.

**Changes**

* Stepper dots: smaller, more refined.
* Code blocks: use dark slate background, consistent monospace font.
* Buttons: consistent radius and primary color.

**Do not change** the step flow or logic.

---

# Implementation Notes (for Copilot)

**Do**

* Only change classnames and minor layout wrappers.
* Add a [globals.css](app://-/index.html# "globals.css") section for typography/colors.
* Replace emoji icons with minimal geometric indicators.

**Do not**

* Introduce new React state, hooks, or props.
* Add new data requests.
* Change ordering/behavior logic.
