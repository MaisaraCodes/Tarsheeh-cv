# Task #11 — Frontend RTL Polish & Translation QA — Audit Report

Date: 2026-04-22  
Scope: in-browser walkthrough of every Arabic page, fix layout regressions
that contradict the brand guide, flag (do not auto-fix) any Arabic copy
that reads as machine-translated, run a clean `next build`, final EN/AR
sweep.

---

## 1. In-browser RTL audit — per route

Every AR page below was loaded in a real browser session against the
running dev server (preview pane).

### `/ar` — Landing
- Nav: **before** wordmark mirrored to physical right; toggle on left.
  **After fix:** wordmark pinned physical left, toggle clustered to its
  right (still on the left half of the header). ✓
- Hero `TARSHEEH.CV` wordmark: hardcoded `dir="ltr"`. ✓
- Hero Arabic headline `وظِّف بدقّة. قُد بثقة.` renders in Amiri. ✓
- Sub-hero paragraph in Cairo, reads RTL naturally. ✓
- "01 / 02 / 03" section numbers stay LTR via inline `dir="ltr"`. ✓
- Section header pattern in AR: `[rule line on physical left] [title]
  [number on physical right]` — natural RTL mirror of the EN pattern.
  Verified via `flex` auto-mirror under `dir="rtl"`. ✓
- 5-card pipeline grid (`grid-cols-5`): CSS Grid honors `dir="rtl"`,
  first stage (`الاستقبال`) lands on the physical right. ✓
- 3-card features grid: same. ✓
- Closing CTA buttons: text-center, no direction issue. ✓
- Footer: **before** wordmark mirrored right, credits left.
  **After fix:** wordmark pinned left, with platform tagline beneath it
  and credits to its right. The Arabic copy lines themselves keep
  `dir="rtl"` so the text is shaped naturally. ✓

### `/ar/job` — Post a Role
- Section header: `[rule] [انشر وظيفة] [01]` — rule fills the left
  whitespace, number on far right. ✓
- Intro paragraph: starts at right edge, wraps RTL. ✓
- Form labels (`المسمى الوظيفي`, `وصف الوظيفة`): align right (start in
  RTL). ✓
- Inputs: text starts on right, placeholder right-aligned. ✓
- Submit button: rendered at the start of its block container — in RTL
  this is the right edge. Verified visually. ✓

### `/ar/upload/:jobId` — Upload CVs
- Section header `[rule] [رفع السير الذاتية] [02]`. ✓
- Drop zone: borders span full width; the headline + hint text are
  `text-center`, so they stay centered regardless of direction. ✓
- File-list rows (when populated): `flex items-center gap-3`. In RTL
  the file name (first child, `flex-1 truncate`) pulls to the right;
  the size (with `dir="ltr"` for the `KB` unit) and the remove button
  end up on the left. ✓
- Submit button: same behavior as `/ar/job`. ✓

### `/ar/processing/:jobId` — Processing
- Section header `[rule] [المعالجة] [03]`. ✓
- Sub-header row `flex justify-between`: intro paragraph on the right,
  live indicator on the left. ✓
- Live indicator internals (`flex items-center gap-2` with dot + label):
  in RTL the dot (first child) lands on the physical right of the
  cluster and `قيد المعالجة` on its left — natural reading order. ✓
- 5-card stage grid (`grid-cols-5`): first stage (`الاستقبال`) renders
  on the physical right; flows leftward as the pipeline progresses. ✓
- State badges (`نشط` / `مكتمل` / `قيد الانتظار`) and stage names render
  in their respective fonts. ✓
- Progress bar: `flex justify-between` puts label `التقدم العام` on the
  right, percentage on the left (with hardcoded `dir="ltr"` so `0%`
  stays Latin). The fill bar uses `insetInlineStart: 0` so it
  grows from the right edge in RTL. ✓
- Bottom CTA / error states: text-center, no direction issue. ✓

### `/ar/results/:jobId` — Shortlist
- Section header `[rule] [القائمة المختصرة] [04]`. ✓
- Sub-header row: intro + tagline on the right, top-score block on the
  left (with `dir="ltr"` so the numeric score is Latin and
  `text-end` becomes physical left in RTL). ✓
- Ranking row (`flex items-start gap-4`):
  - DOM order: `[rank] [name+summary flex-1] [bar+score]`.
  - In RTL flex this becomes physical `[bar+score | name+summary | rank]`
    reading L→R, i.e. `[rank | name | summary | score | bar]` reading
    R→L — exactly the order the brand guide calls for. ✓
  - Inside the score cluster: bar then numeric score. The numeric score
    has `dir="ltr"`+`text-end` so its glyphs stay Latin and align to
    physical left of its slot. ✓
  - Score bar fill uses `insetInlineStart: 0` → fills from the right in
    RTL. ✓
- Download report button: text-center wrapper, no issue. ✓

### `/ar/candidates/:candidateId` — Candidate Detail
- Back link arrow: already locale-conditional, renders `→` in AR (the
  natural RTL "back" direction). ✓
- Section header `[rule] [candidate name] [05]`. ✓
- Top summary row (`flex items-start justify-between`):
  - DOM order: `[rank-block] [summary flex-1] [score-block]`.
  - In RTL: physical `[score | summary | rank]` reading L→R, i.e.
    `[rank | summary | score]` reading R→L — matches the brand guide. ✓
- Score bar full-width, `insetInlineStart: 0` → fills from the right
  in RTL. ✓
- Interview question cards (`flex items-start gap-4`): `س1 / س2 / …`
  prefix (first DOM child) lands on the physical right of each card,
  the question body on its left — natural RTL reading. ✓

---

## 2. Layout fixes applied

Two regressions found, both fixed in this session:

| # | File | Issue | Fix |
|---|---|---|---|
| 1 | `frontend/components/Nav.tsx` | In AR, `flex justify-between` mirrored the wordmark to the right, against brand guide which pins the Latin wordmark physically left in both locales. | Forced inner nav container to `dir="ltr"` and switched to locale-conditional class: `gap-6 justify-start` in AR, `justify-between` in EN. Result: wordmark stays physically left always; controls cluster on the left in AR (next to wordmark) and right in EN. |
| 2 | `frontend/app/[locale]/layout.tsx` | Same mirror issue in footer — wordmark + tagline mirrored to right in AR. | Same brand-pin pattern: `dir="ltr"` on the inner row + `gap-12 justify-start` in AR, `justify-between` in EN. The Arabic copy lines (`platform`, `credits`) are given their own `dir="rtl"` so the text itself shapes correctly. |

No CSS-level fixes were needed in `globals.css` for the patterns
called out in the task brief. The score/progress bar fills already use
`insetInlineStart: 0` (logical property) from Phase 2, the 5-card grids
auto-mirror under `dir="rtl"`, the ranking and detail summary rows use
flex (which auto-mirrors child order under `dir="rtl"`), the drop zone
hint is `text-center`, and the back arrow is already
locale-conditional.

---

## 3. Typography verification

- AR `<html dir="rtl">` triggers the `[dir="rtl"]` block in
  `frontend/app/globals.css` (lines 79–83), which overrides
  `--font-serif` to `'Amiri', serif` and `--font-sans` to
  `'Cairo', 'Tajawal', sans-serif`.
- `@fontsource/amiri` (400, 700) and `@fontsource/cairo` (300, 400, 500)
  are imported at the top of `globals.css`.
- Visual check against `tarsheeh_brand_guide_AR.html`:
  - Hero headline `وظِّف بدقّة. قُد بثقة.` matches the brand guide's
    `--ar-display` weight (Amiri 400). ✓
  - Section headings (`رسالتنا`, `كيف يعمل`, `ما ستحصل عليه`) match
    Amiri 400 from the brand guide. ✓
  - Body copy (`subHero`, `missionBody`, feature card sub-copy) matches
    Cairo 300/400 from the brand guide. ✓
  - The Latin wordmark `TARSHEEH.CV` always renders in Cormorant
    Garamond (forced `dir="ltr"` per element), as the brand guide
    requires. ✓
- No font-family or weight mismatches observed.

---

## 4. Translation quality flags (NOT auto-fixed per task scope)

Read every string in `frontend/messages/ar.json` against the brand
guide. The Arabic copy is otherwise high quality and reads naturally
(written in MSA, consistent tone, brand-appropriate diction). The
following items are surfaced for user-supplied corrections:

1. **`upload.submitting`** — currently
   `"جارٍ قراءة وصف الوظيفة..."`. This is the same string as
   `job.submitting`, but it's shown on the **upload** page when the
   user clicks "رفع السير الذاتية", so it describes the wrong action.
   The user is uploading CVs, not "reading the role description".
   **This bug exists in `en.json` too** —
   `upload.submitting` is `"Reading the role description..."` in both
   locales — so it is **not** a translation defect, it's a copy bug
   in both locales. Suggested fix (for user approval, not auto-applied):
   - EN: `"Uploading CVs..."`
   - AR: `"جارٍ رفع السير الذاتية..."`

No other Arabic strings read as machine-translated. The hero, mission,
how-it-works, feature cards, processing stage labels, and error
messages are all phrased naturally and follow the brand guide voice
("وظِّف بدقّة. قُد بثقة.", "مرتَّبون. مُحَلَّلون. جاهزون.", etc.).

---

## 5. Build & final sweep

### `npm run build` (Next.js 16)

```
> next build
▲ Next.js 16.2.4 (Turbopack)
✓ Compiled successfully in 4.8s
  Running TypeScript ... Finished TypeScript in 3.9s
✓ Generating static pages using 7 workers (3/3) in 233ms

Route (app)
┌ ○ /_not-found
├ ƒ /[locale]
├ ƒ /[locale]/candidates/[candidateId]
├ ƒ /[locale]/job
├ ƒ /[locale]/processing/[jobId]
├ ƒ /[locale]/results/[jobId]
└ ƒ /[locale]/upload/[jobId]
ƒ Proxy (Middleware)
```

Clean — no errors, no new warnings (the existing
`middleware → proxy` deprecation notice is from Phase 2 and is out of
scope for this task).

### Final EN / AR route sweep

Each route was loaded in both locales after the fixes:

| Route | EN | AR |
|---|---|---|
| `/` | wordmark left, AR toggle right | wordmark left, EN toggle clustered to its right |
| `/job` | section header `[01] [Post a Role] [rule]`, form left-aligned | section header `[rule] [انشر وظيفة] [01]`, form right-aligned |
| `/upload/:id` | drop zone centered, button on left | drop zone centered, button on right |
| `/processing/:id` | sub-header L=intro / R=indicator, progress fills L→R | sub-header L=indicator / R=intro, progress fills R→L |
| `/results/:id` | sub-header L=intro / R=top score, ranking row `[rank][name][bar][score]` | sub-header L=top score / R=intro, ranking row `[score][bar][name][rank]` reading L→R (`[rank][name][bar][score]` reading R→L) |
| `/candidates/:id` | back arrow `←`, summary row `[rank][summary][score]` | back arrow `→`, summary row `[score][summary][rank]` reading L→R |

Mid-session language toggle: clicking AR/EN flips `<html dir>` and all
fonts swap (Amiri/Cairo ↔ Cormorant/DM Sans) without remount glitches.

Footer: wordmark stays physically left in both locales after the fix.

---

## 6. Out of scope (intentionally not touched)

- New pages, new features, copy additions.
- Backend changes (covered by completed Task #10).
- Rewriting Arabic phrasing — flagged only (see §4).
- Rolling back any Phase 2 next-intl plumbing.
- Pre-existing hydration warning on `/job` (noted in scratchpad,
  unrelated).
- The `middleware → proxy` deprecation notice from Next 16 (not RTL or
  i18n related).
