# Storyboards: Phase 2 (awaiting William's approval)

All three concepts tell the same nine beats in the same order, read only from
`src/content/cv.ts`, and reuse the shared chrome (chapter nav, language toggle, contact form,
CV download, footer).

**Motion rules, the same for all three:**

- Scroll animations run through `useScrollScene()`, so none run under reduced motion.
- The few short CSS animations (a cursor blink, a pin pulse) end within 5 seconds (WCAG
  2.2.2) and are disabled under reduced motion (`src/styles/global.css`).
- Short time-based GSAP tweens (Worlds version 2's ambient touches) also run through
  `useScrollScene()`, run at most once per visit to their district and end within 5
  seconds.
- Only `transform` and `opacity` are animated. The resting page is always fully readable,
  and nothing focusable ever sits at opacity 0.
- Decorative arrows and motifs are `aria-hidden`.

**Facts rule:** the CV gives no locations for employers, no metrics and no tools beyond those
listed, so the storyboards invent none. No cities on the map, no uptime numbers or incident
counts in the logs, no fake timestamps. Dates are month and year only, as in the CV.

All contrast ratios below were computed (WCAG 2.x). Every text, muted-text and accent color
reaches **at least 4.5:1** on both its background and its surface. Worlds version 2 adds
label chips, focus rings on each district ground and skill halos. Their exact colors are
chosen during the build, computed against these targets (4.5:1 for chip text, 3:1 for rings
and halos) and checked by the concept's contrast tests.

---

## 1. `concept/journey`: Journey / road trip

**Look:** warm, editorial, like an old printed road map. Paper texture made with CSS
gradients only (no image files, no `data:` URIs).

| Token                | Light ("day map")            | Dark ("night drive") |
| -------------------- | ---------------------------- | -------------------- |
| Background           | `#F4EDE0`                    | `#1C1A17`            |
| Surface              | `#FBF7EF`                    | `#262320`            |
| Text                 | `#2B2118` (13.5:1)           | `#EFE6D6` (14.0:1)   |
| Muted                | `#5A4B3C` (7.2:1)            | `#C9BCA8` (9.3:1)    |
| Accent (road, links) | `#9C4320` terracotta (5.6:1) | `#E08A5F` (6.6:1)    |
| Secondary (terrain)  | `#4F5D31` olive (6.1:1)      | `#A3B57A` (7.8:1)    |
| Horizon (AI)         | `#2A6582` (5.5:1)            | `#7DB7D6` (8.0:1)    |

**Fonts:** _Fraunces_ (variable serif) for headings and signposts, _Source Sans 3_ (variable)
for body text.

**Key animations (transform and opacity only):**

- **The road draws itself as you scroll.** A single SVG road runs down the page: a zigzag on
  desktop, a straight line along the left edge on mobile. It is revealed by a mask rectangle
  scaled with `transform`, scrubbed to scroll.
- **A traveler marker moves along the road** with GSAP MotionPath, which already ships inside
  `gsap`.
- **Stops:** each job is a map pin with a signpost (company · project · dates). The pin drops
  in (translate + fade) and the card unfolds (scale + fade).
- **Parallax:** two slow layers of terrain contour lines.
- **"Next":** the road changes from terracotta to horizon blue by **crossfading two stacked
  road layers** (opacity). No color is animated.

**Beats:**

1. **Hook:** a folded-map cover. Your name as the map title, "Software Developer · Porto Alegre,
   RS, Brazil" as the legend, and the hook line ("Seven years, five industries…") as the
   subtitle. A "Start the trip" cue with a decorative ↓. The summary sits in a legend box.
2. **Origins:** the road starts at the first pin, Novus Automação (Oct 2019 – Oct 2021,
   Intern / Tester / Developer), with its two highlights on the signpost. A landmark flag
   beside the road marks the Computer Science degree (UniRitter, June 2022).
3. **Into the enterprise:** the road widens into a highway. Pins for ATOS · Bradesco (support
   and maintenance of corporate data flows, monitoring, resolving issues), then ATOS (Jan–Jun
   2023, frontends with JavaScript and React integrated with backend services and APIs).
4. **Powering energy:** the road passes power-line poles, a simple SVG motif. Pins for ATOS ·
   CPFL (backend features, Xamarin kiosk, Azure DevOps and cloud tools) and ATOS · CEMIG /
   CPFL (production servers and queues, code review, oversight of deployments, stability).
5. **Breadth:** the road forks into two short side roads that rejoin: ATOS · Sodexo (Mendix,
   multidisciplinary teams) and ATOS · Alphaville (legacy backend, bugs, new features).
6. **Now:** a "You are here" pin. It pulses three times (under 5 seconds), then stays still,
   and is static from the start under reduced motion. SEMANTIX (formerly ATOS) · VCIMENTOS /
   VPAR, CBA, Votorantim, with the three highlights and the stack as luggage tags.
7. **Next:** the road becomes a dotted line toward the horizon (the layer crossfade above).
   Signposts along it, all marked "In progress": AI fundamentals, LLMs, RAG, AI agents. The
   destination sign is the Postgraduate in AI Engineering (UNIPDS).
8. **Toolbox:** an open glovebox. Skills are luggage tags; choosing a tag highlights the stops
   that used it on a mini route overview, with the result also written as text in a live
   region. Certifications appear as a travel log (with hours where the CV gives them), and
   spoken languages as a phrasebook page.
9. **Call to action:** a postcard. The shared form is on the message side; email reveal,
   LinkedIn and GitHub are on the stamp side. The CV download is labeled "Take the map with
   you".

---

## 2. `concept/terminal`: Terminal / code world

**Look:** dark terminal and code editor, as the spec asks, with a phosphor-green accent.
Readability comes first: long text is set in a proportional font, there is no flicker and
no animated scanlines, and the static texture is made with CSS gradients.

| Token            | Value     | On background / panel |
| ---------------- | --------- | --------------------- |
| Background       | `#0B0F0C` |                       |
| Panel            | `#111814` |                       |
| Text             | `#D7E2D9` | 14.5 / 13.5           |
| Muted            | `#9FB0A3` | 8.5 / 7.9             |
| Accent (prompt)  | `#7CF29A` | 13.8 / 12.9           |
| Warning/incident | `#FFB454` | 11.0 / 10.2           |
| Links / info     | `#6CC7F0` | 10.2 / 9.5            |

**Fonts:** _JetBrains Mono_ (variable) for prompts, commands, headings and code; _IBM Plex
Sans_ (variable) for paragraphs.

**Key animations (transform and opacity only):**

- **Line-by-line "typing" reveal.** Each output line sits in an `overflow: hidden` row and
  slides up (`translateY`) while fading in. It is not per-character typing, so screen readers
  always get the full text, and reduced motion shows it all at once.
- **Cursor:** blinks only while a line is being revealed, at most about 3 seconds, then stays
  solid. It is static under reduced motion.
- **The "Now" chapter is a pinned terminal window.** Scrolling scrubs through its output.
  - Under reduced motion there is no pin, and all output is visible.
  - Below 768 px wide the pin is off and the output simply scrolls.
  - Links inside are never hidden at opacity 0.
  - Jumping to "Now" from the chapter nav lands at the top of the pinned section.
- **The "Next" chapter ends with a deploy progress bar** (`scaleX`) scrubbed by scroll.

**Beats.** Commands and code stay in English in both languages; descriptions are translated.

1. **Hook:** a boot screen. `$ whoami` prints your name, then `$ cat role.txt` prints
   "Software Developer · Porto Alegre, RS, Brazil". The hook line is the "Message of the day",
   and `$ cat README.md` shows the summary.
2. **Origins:** `$ git log career`, an entry per job in story order, each with its real dates.
   The first is `Novus Automação (2019-10 → 2021-10)`, with the highlights as the commit body.
   Tag `v1.0.0` marks the Computer Science degree (UniRitter, 2022-06).
3. **Into the enterprise:** a `feat(bradesco):` entry (support and maintenance of corporate
   data flows with enterprise integration tools, monitoring, resolving issues), then a
   `feat(frontend):` entry (JavaScript + React, integrated with backend services and APIs).
4. **Powering energy:** `feat(cpfl):` backend features plus `feat(kiosk): Xamarin kiosk app`,
   with Azure DevOps and cloud tools. Then `ops(cemig/cpfl):`, a short log that follows the
   CV wording: `support: development team`, `maintain: production servers, processing
queues`, `review code`, `oversee deploy: test`, `oversee deploy: production`, `keep
critical systems stable`. No numbers or timestamps.
5. **Breadth:** a split editor with two tabs, `sodexo.mendix` (Mendix, feature evolution,
   system improvements, multidisciplinary teams) and `alphaville/legacy-backend` (legacy
   backend, bug fixes, improvements, new features).
6. **Now:** the pinned `$ tail -f semantix.log` window for SEMANTIX (formerly ATOS) ·
   VCIMENTOS / VPAR, CBA, Votorantim. The three highlights are log entries, with **one**
   generic amber `[INCIDENT] → [RESOLVED]` pair illustrating "Respond rapidly to incidents".
   The stack shows as `stack: react, typescript, javascript (angular), csharp, sqlserver`.
7. **Next:** `$ git checkout -b feature/ai-engineering`, then a TODO list (AI fundamentals,
   LLMs, RAG, AI agents) marked "in progress". It ends with `$ deploy --target future`, a
   progress bar labeled "Deploying to the future" that fills as you scroll.
8. **Toolbox:** `$ man william`. Skills are `grep` chips; choosing one prints its result
   **right below the chips** (a live region) with links to the matching entries. Then
   `$ ls certs/` (hours where the CV gives them) and `$ locale` (Portuguese native, English
   fluent, Spanish basic).
9. **Call to action:** `$ ./contact.sh`. The form fields are styled as prompts (`name:`,
   `email:` …). Each link shows the command **and** a plain label, so the accessible name
   contains the visible text: `open linkedin · Open LinkedIn`, `open github · Open GitHub`,
   `curl -O cv.pdf · Download CV (PDF)`, `reveal email · Show email address`.

---

## 3. `concept/worlds`: A small world to explore (clickable world, version 2)

William asked (2026-11-09) for a more literal, clickable world for comparison. Version 2 is
proposed to replace the first version, which stays below as **3b** until he chooses between
them (question W1). The 3b palettes (with the mapping below), the 3b fonts (Space Grotesk and
Inter, answer 3) and the nine beats stay normative for version 2, even if 3b's story is
dropped.

**Idea:** one illustrated map of a small, fictional world. Each industry is a **district**,
connected by a road in story order. There are two ways to explore it:

- **Scroll to travel.** The page still scrolls from beat 1 to beat 9. On larger screens a
  camera glides over the map from district to district as you scroll.
- **Choose a building to explore.** Every building on the map is a real link to its own
  entry (for example, the bank links to the ATOS · Bradesco job, not just to its chapter; the
  full list is in "The map's links" below). Choosing one scrolls the page to that entry, the
  camera follows the scroll, and focus moves to the entry's heading.

**How they stay in sync:** scroll position drives the camera, the progress bar and the
chapter nav's "current" mark. Clicks drive the URL and the browser history, so the Back
button returns to where you were, and the camera follows that scroll too. A deep link such
as `/#now` opens the page at that chapter with the camera already on its district. (Opening
a deep link on load doesn't work yet on any branch, because the sections only exist after
React renders. The shared fix for that lands on `main` first; the map depends on it.)

**One shared jump behavior.** The map and the chapter nav use the same helper: native hash
navigation (so Back works), then `focus({ preventScroll: true })` on the target's heading,
which gets `tabindex="-1"`. Native hash navigation scrolls the element that carries the
`id` (the chapter `<section>`, the job `<article>`, the education entry), so that element
is what must clear the sticky bars:

- **Every jump target** (chapter sections, job articles, education entries) gets a
  `scroll-margin-top` equal to the site header's height, plus the map strip's height in the
  768–1023 px layout. The focused heading then always lands below the header and the strip
  (WCAG 2.4.11).
- **Education entries get ids** (for example `edu-computer-science`) and a `tabindex="-1"`
  heading, like jobs, so the university can link to the degree.

Today the chapter nav only changes the hash and doesn't move focus, education entries have
no ids, and job articles have no scroll margin (a job heading reached from the skills
explorer currently lands under the header on every branch). So this is a change to shared
code. Following the convention, it lands on `main` first and fixes all three concepts. Its
tests check that after a jump the focused heading's top is below the header (and the strip).

The content is never hidden inside the map. Each district's text is a normal
`<ChapterSection>` in the page, readable without the map, by screen readers and with the map
turned off. The map is the visual layer and a navigation menu on top of it.

**What it is not:** no 3D, no free walking around, no game controls, and no real places. The
districts are unnamed, fictional places with no cities or geography, because the CV gives no
employer locations (facts rule). A building stands for a sector, not a real building of the
company.

**Layout.** The sticky stage and the camera need room in both directions, so they are used
only when the viewport is at least 768 px wide **and** at least 600 px tall. Landscape phones
(wide but short) therefore get the overview layout, like portrait phones.

- **≥ 1024 px wide, ≥ 600 px tall:** the map is a sticky stage on the left (about 60% of the
  width), and the camera moves as you scroll. The panels scroll on the right (about 40%).
- **768–1023 px wide, ≥ 600 px tall:** the map is a sticky strip at the top (about 40% of the
  height), with the same camera. The panels scroll below it, and every jump target's scroll
  margin includes the strip (see "One shared jump behavior").
- **Everything else (phones, short screens):** no sticky stage, no camera and no ambient
  touches. The whole map appears once, as an overview at the top, and tapping a building
  jumps to its entry (touch targets ≥ 44 × 44 px). If the wide map would make labels or
  targets too small at 320 px, the overview may use a taller, portrait arrangement of the
  same districts. Each chapter opens with a small, static vignette of its district and ends
  with a "Back to the map" link.

**Colors.** Each place uses one row of the 3b palette table; colors are fixed and ignore
light/dark mode (answer 6):

| Place on the map                      | 3b palette row                     |
| ------------------------------------- | ---------------------------------- |
| Arrival (hook), workshop, post office | Hook, Toolbox, Home base (neutral) |
| Industrial district and university    | Industrial                         |
| Banking district                      | Banking                            |
| Between worlds (the plaza)            | Between worlds                     |
| Energy district                       | Energy                             |
| Corporate district                    | Corporate                          |
| Cement, cargo and trucks district     | Cement, cargo, trucks              |
| AI frontier                           | AI frontier                        |

In every layout (split and overview) each chapter is painted in its district's background
and surface colors. Chapters sit edge to edge, so the colors change at chapter boundaries
with no full-screen crossfade (3b's crossfade isn't needed).

**Districts and beats:**

1. **Hook: arrival.** The whole map from above, with your name, "role · city", the hook line
   and the summary. Title "Six districts, one developer" (five industries plus the AI
   frontier; see question W3). A hint, "Scroll to travel, or choose a building to explore",
   and a "Start exploring" link to beat 2.
2. **Origins: industrial district.** A factory with gears: Novus Automação
   (Oct 2019 – Oct 2021) and its highlights. Next to it a **university** building: the
   Computer Science degree (UniRitter, June 2022).
3. **Into the enterprise: banking district.** A bank with a vault: ATOS · Bradesco. Then a
   neutral plaza with a signpost between banking and energy, labeled **"Between worlds"** as
   approved in answer 4 (option A), for ATOS (Jan–Jun 2023, JavaScript + React frontends),
   because the CV names no client or sector for that role.
4. **Powering energy: energy district.** A power plant and a substation joined by pylons:
   ATOS · CPFL (backend, Xamarin kiosk, Azure DevOps) and ATOS · CEMIG / CPFL (production
   servers, queues, code review, oversight of deployments, stability).
5. **Breadth: corporate district.** Two office blocks side by side: ATOS · Sodexo (Mendix) and
   ATOS · Alphaville (legacy backend).
6. **Now: cement, cargo and trucks district.** A cement plant and a cargo yard with trucks,
   marked "You are here": SEMANTIX (formerly ATOS) · VCIMENTOS / VPAR, CBA, Votorantim, the
   three highlights and the stack.
7. **Next: AI frontier.** An observatory still under scaffolding at the edge of the map: the
   Postgraduate in AI Engineering (UNIPDS), with AI fundamentals, LLMs, RAG and AI agents as
   four signs marked "In progress".
8. **Toolbox: the workshop** in the town square. The shared skills explorer: choosing a skill
   lights up every building whose job used it, and the result is also written as text with
   links in a live region. Certifications (hours where the CV gives them) and spoken
   languages are listed below.
9. **Call to action: the post office.** The shared contact section (form, email, LinkedIn,
   GitHub, CV download).

**The map's links (one mechanism):**

Twelve links, in story order. A job drawn as two buildings is one link around both.

| Building                               | Links to                | Visible label (= accessible name)              |
| -------------------------------------- | ----------------------- | ---------------------------------------------- |
| Factory with gears                     | `#job-novus`            | Novus Automação                                |
| University                             | `#edu-computer-science` | The degree and school from `cv.ts` (UniRitter) |
| Bank with a vault                      | `#job-atos-bradesco`    | ATOS · Bradesco                                |
| Plaza with a signpost                  | `#job-atos-frontend`    | Between worlds · ATOS                          |
| Power plant                            | `#job-atos-cpfl`        | ATOS · CPFL                                    |
| Substation                             | `#job-atos-cemig-cpfl`  | ATOS · CEMIG / CPFL                            |
| Office block (left)                    | `#job-atos-sodexo`      | ATOS · Sodexo                                  |
| Office block (right)                   | `#job-atos-alphaville`  | ATOS · Alphaville                              |
| Cement plant and cargo yard (one link) | `#job-semantix`         | SEMANTIX (the clients are listed in the panel) |
| Observatory                            | `#next`                 | AI frontier                                    |
| Workshop                               | `#toolbox`              | Workshop                                       |
| Post office                            | `#contact`              | Post office                                    |

The "ATOS · client" labels follow William's Journey decision. District names on the map
("Banking district" and so on) are decorative signs (`aria-hidden`); each chapter also shows
its district name as visible text above the chapter heading, so nothing is lost.

- The map is an inline SVG inside `<nav aria-label="World map">`. The links are SVG
  `<a href>` elements inside a `<g role="list">`, each in a `<g role="listitem">`, in story
  order. The `<svg>` itself never gets `role="img"` or `aria-hidden`.
- **Fallback:** `role="list"` on SVG groups is exposed well in Chromium and Firefox, less
  consistently with WebKit and VoiceOver. If the list isn't exposed, the links still work
  and are read in order. Checked with axe plus a manual NVDA and VoiceOver pass.
- Inside each link, the drawing of the building is `aria-hidden`. The link's text is its
  **label**, an SVG `<text>`, so the accessible name is exactly the visible label. Purely
  decorative scenery (roads, trees, pylons) is `aria-hidden` and not focusable.
- Labels are **always visible**, never only on hover: each sits on a solid chip in its
  district's surface color, with text at ≥ 4.5:1 on the chip (computed and tested).
- Everything is placed with SVG attributes (`x`, `y`, `transform="…"` presentation
  attributes) and stylesheet classes. There are no `style` attributes, so the strict CSP
  (`style-src 'self'`) holds. Each building's **position** sits on an outer
  `<g transform="…">`, and the hover/focus **lift** on an inner group. In SVG a CSS
  transform replaces the element's own `transform` attribute, so mixing them on one element
  would throw the building to the origin. The links live inside the same wrapper the camera
  moves, so they always follow the drawing.
- **Focus inside the map:** when keyboard focus enters the map, the camera zooms out to the
  whole world, so every link is on screen while you tab through them. When focus leaves the
  map, the camera returns to the scroll position. Under reduced motion this switch is
  instant.
- **Focus ring:** drawn as an SVG outline shape around the building, shown on
  `:focus-visible` (CSS `outline` on SVG elements isn't painted reliably in WebKit), with
  ≥ 3:1 against every district ground (computed and tested).
- **Sizes at the smallest scale:** the minimum label text size and the targets (24 × 24 px,
  WCAG 2.2 2.5.8; 44 × 44 px in the overview layout) are measured where the map is drawn
  smallest: the whole-world view while focus is in the map, the tablet strip, and the phone
  overview at 320 px wide.

**Key animations (transform and opacity only):**

- **Camera** (sticky layouts only): an HTML wrapper around the SVG pans and zooms between
  district viewpoints, scrubbed by scroll. Moving an HTML wrapper keeps it on a composited
  layer, which is much cheaper than moving shapes inside the SVG. The trade-off is slightly
  softer lines while zoomed in, so zoom is capped at 2×.
- **Hover:** a building lifts slightly (`translateY` on its inner group). **Keyboard focus**
  adds the focus ring as well, so the focused building is always distinguishable from a
  hovered one. Labels stay as they are.
- **The active district's** scenery stays at full strength; the scenery of the others fades
  back a little. Buildings, labels and text never fade, so their contrast always holds.
- **Ambient touches** (sticky layouts only): gears turn, pulses travel along the power lines,
  a truck drives across the cargo yard. Each is a GSAP tween run through `useScrollScene`
  (skipped under reduced motion, reverted on unmount). It starts only when the camera
  arrives at its district, runs at most once per visit to that district, and ends within 5
  seconds (WCAG 2.2.2). The arrival overview at the top of the page plays none of them.
- **Toolbox:** matching buildings get a halo (opacity) when a skill is chosen. The halo color
  is computed for ≥ 3:1 against its ground. During the Toolbox chapter the camera shows the
  whole world, so every halo is on screen. In the overview layout the map is far above, so
  the live region's text is what tells the result there.
- **Reduced motion:** no camera and no ambient touches. The map shows the whole world, and a
  jump goes straight to the job.

**Performance:** the map is above the fold on the hook, so its first version can't be
lazy-loaded.

- The first-paint map is a simplified drawing of flat shapes with no filters, with a target
  of ≤ 15 kB gzipped.
- Detail layers (extra scenery, the ambient pieces), the camera and the ambient code are
  lazy-loaded, as Journey's scene is.
- Same Lighthouse budget: performance ≥ 90 on mobile.
- No new dependencies beyond the two approved fonts. GSAP MotionPath (already inside `gsap`)
  moves the pulses and the truck.
- **A short spike comes first:** before the full build, a worker builds only the sticky stage,
  the camera, the focus behavior and the jump behavior. It then measures Lighthouse on
  mobile, and checks label and target sizes in the phone overview at 320 px and in the
  tablet strip's whole-world view. The result goes through the critic and to William before
  the full build starts.

**Trade-offs compared with 3b:**

- **Pros:** the most playful and memorable of the three; a building is an obvious invitation
  to explore.
- **Cons:**
  - More work than Journey. A rough guess is 1.5–2 times; the spike will firm it up.
  - The sticky stage and camera are the riskiest part on slow devices, which is why phones
    and short screens get no camera.
  - On phones it becomes "an overview map plus chapters", close to 3b.
  - Journey is also a map (a hand-drawn road trip), so version 2 brings Worlds closer to
    Journey than 3b is. The three concepts would differ less.

A full-screen map with the content in pop-up panels was considered and rejected: it would
hide the content inside the map, break the scroll-based nine-beat story, and need focus
trapping and a separate mobile design.

---

### 3b. First version: industries as worlds (superseded, kept for comparison)

**Look:** each sector is its own world with its own palette and a geometric SVG motif that I
draw myself (no stock art). The palettes are fixed per world and don't switch with light or
dark mode; see question 6.

| World (chapter)                   | Background | Surface   | Text      | Muted     | Accent    | Motif                          |
| --------------------------------- | ---------- | --------- | --------- | --------- | --------- | ------------------------------ |
| Hook, Toolbox, Home base          | `#F5F3EF`  | `#FFFFFF` | `#1D1F24` | `#4F535B` | `#2E54A3` | world map tiles                |
| Industrial: Novus (Origins)       | `#2F353B`  | `#3A4148` | `#EEF0F2` | `#C3C9CF` | `#F2C230` | blueprint grid, gears          |
| Banking: Bradesco (Enterprise)    | `#0E2747`  | `#15325A` | `#F1F3F7` | `#C2CBDA` | `#D9B95E` | ledger lines, vault rings      |
| Between worlds: ATOS Jan–Jun 2023 | `#1B1E24`  | `#252931` | `#E6E8EC` | `#B6BBC4` | `#9DB4D6` | plain corridor lines           |
| Energy: CPFL, CEMIG               | `#0B1D3A`  | `#12284D` | `#EAF6F4` | `#B7C9D6` | `#3FE0C5` | power lines                    |
| Corporate: Sodexo, Alphaville     | `#F3EFE7`  | `#FFFFFF` | `#24211C` | `#57514A` | `#A63B25` | modular building blocks        |
| Cement, cargo, trucks: Semantix   | `#D9D4CC`  | `#ECE8E2` | `#1F1D1A` | `#47433D` | `#843F08` | concrete texture, road stripes |
| AI frontier (Next)                | `#120B24`  | `#1C1336` | `#EEE9FB` | `#C4B8E6` | `#B9A3FF` | constellation                  |

The lowest pair in the table is the cement accent on its background, at 5.3:1.

**Fonts:** _Space Grotesk_ (variable) for headings, _Inter_ (variable) for body.

**Key animations (transform and opacity only):**

- **World transitions:** full-screen background layers crossfade (opacity) only in the gap
  between two worlds. Text always sits on its own world's solid surface cards, so contrast
  holds throughout the crossfade.
- **Motifs:** each world's motif drifts in with parallax (`transform`) and settles.
- **Energy:** small pulse dots travel along the power lines (MotionPath, `transform`). No
  stroke animation.
- **AI:** the constellation's dots fade and scale in.
- **The hook is a world map:** world tiles that scale and fade in. Each tile is a link
  ("Industrial", "Banking", …) that jumps to that world.
- **Toolbox:** the worlds and jobs that used the chosen skill are stamped, with the result
  also written as text in a live region.

**Beats:**

1. **Hook:** "Six worlds, one developer" (five industries plus the AI frontier, which matches
   the hook line). Your name, role and city, the hook line, and six world tiles as
   navigation. The summary is below.
2. **Origins, industrial world:** Novus Automação (Oct 2019 – Oct 2021), testing industrial
   products and software, internal tools, automation scripts, product data analysis. The
   Computer Science degree (UniRitter, June 2022) appears as a "Graduation" badge on the way
   out.
3. **Into the enterprise, banking world:** ATOS · Bradesco (corporate data flows, monitoring,
   resolving issues). Then a neutral "Between worlds" panel for ATOS (Jan–Jun 2023,
   JavaScript + React frontends), because the CV names no client or sector for that role
   (question 4).
4. **Powering energy, energy world:** ATOS · CPFL (backend, Xamarin kiosk, Azure DevOps) and
   ATOS · CEMIG / CPFL (production servers, queues, code review, oversight of deployments,
   stability).
5. **Breadth, corporate world:** ATOS · Sodexo (Mendix) and ATOS · Alphaville (legacy backend)
   as two building blocks that slot together.
6. **Now, cement and cargo world:** SEMANTIX (formerly ATOS) · VCIMENTOS / VPAR, CBA,
   Votorantim. Kiosks, legacy systems and client applications in the cargo, trucks and cement
   sector, incident response, SQL Server, plus the stack.
7. **Next, AI frontier:** the Postgraduate in AI Engineering (UNIPDS), with AI fundamentals,
   LLMs, RAG and AI agents as stars, all marked "In progress".
8. **Toolbox:** a "Passport". Choosing a skill stamps the worlds and jobs that used it.
   Certifications (hours where the CV gives them) and spoken languages appear as "Visas" pages.
9. **Call to action:** "Home base", in the neutral palette, with the shared contact section.

---

## New copy (proposed; nothing ships until William approves it)

Existing shared strings (chapter titles, form labels, "In progress", "Download CV (PDF)",
"Show email address") are reused as they are. Terminal commands and code (`whoami`,
`git log career`, `feat(cpfl):`, `[INCIDENT] → [RESOLVED]`, `oversee deploy: test`, …) stay
in English in both languages; see question 7.

| Concept  | EN                                                | PT-BR (proposed)                                                                  |
| -------- | ------------------------------------------------- | --------------------------------------------------------------------------------- |
| Journey  | Start the trip                                    | Comece a viagem                                                                   |
| Journey  | You are here                                      | Você está aqui                                                                    |
| Journey  | Destination                                       | Destino                                                                           |
| Journey  | Glovebox                                          | Porta-luvas                                                                       |
| Journey  | Travel log                                        | Diário de bordo                                                                   |
| Journey  | Phrasebook                                        | Guia de conversação                                                               |
| Journey  | Send a postcard                                   | Envie um cartão-postal                                                            |
| Journey  | Take the map with you                             | Leve o mapa com você                                                              |
| Terminal | Message of the day                                | Mensagem do dia                                                                   |
| Terminal | Deploying to the future                           | Implantando rumo ao futuro (or: Deploy rumo ao futuro)                            |
| Terminal | Open LinkedIn                                     | Abrir LinkedIn                                                                    |
| Terminal | Open GitHub                                       | Abrir GitHub                                                                      |
| Worlds   | Six districts, one developer                      | Seis distritos, um desenvolvedor (or: Seis polos, um desenvolvedor)               |
| Worlds   | Scroll to travel, or choose a building to explore | Role para viajar ou escolha um prédio para explorar                               |
| Worlds   | Start exploring                                   | Comece a explorar                                                                 |
| Worlds   | World map                                         | Mapa do mundo                                                                     |
| Worlds   | Back to the map                                   | Voltar ao mapa                                                                    |
| Worlds   | Industrial district                               | Distrito industrial                                                               |
| Worlds   | Banking district                                  | Distrito bancário (or: Polo bancário)                                             |
| Worlds   | Between worlds                                    | Entre mundos                                                                      |
| Worlds   | Energy district                                   | Distrito de energia (or: Polo de energia)                                         |
| Worlds   | Corporate district                                | Distrito corporativo (or: Polo corporativo)                                       |
| Worlds   | Cement, cargo and trucks district                 | Distrito de cimento, cargas e caminhões (or: Polo de cimento, cargas e caminhões) |
| Worlds   | AI frontier                                       | Fronteira da IA                                                                   |
| Worlds   | You are here                                      | Você está aqui (same wording as Journey)                                          |
| Worlds   | Workshop                                          | Oficina                                                                           |
| Worlds   | Post office                                       | Correio (or: Agência dos correios)                                                |

The Worlds rows above are for version 2 (the clickable world). If William keeps version 3b
instead (question W1), these 3b rows apply instead:

| Concept   | EN                        | PT-BR (proposed)                         |
| --------- | ------------------------- | ---------------------------------------- |
| Worlds 3b | Six worlds, one developer | Seis mundos, um desenvolvedor            |
| Worlds 3b | Industrial                | Industrial                               |
| Worlds 3b | Banking                   | Bancário                                 |
| Worlds 3b | Energy                    | Energia                                  |
| Worlds 3b | Corporate services        | Serviços corporativos                    |
| Worlds 3b | Cement, cargo and trucks  | Cimento, cargas e caminhões              |
| Worlds 3b | AI frontier               | Fronteira da IA                          |
| Worlds 3b | Between worlds            | Entre mundos                             |
| Worlds 3b | Graduation                | Formatura                                |
| Worlds 3b | Passport                  | Passaporte                               |
| Worlds 3b | Visas                     | Vistos                                   |
| Worlds 3b | Home base                 | Ponto de partida (or: Base de operações) |

---

## Questions for William

1. **Approve each storyboard** (journey, terminal, worlds)? You can approve one or two now, so
   building can start while another is revised.
2. **Beat order (confirmation):** the spec fixes the nine beats in order, so by date the story
   isn't strictly chronological. CEMIG/CPFL (2025–26) sits in Energy, before Sodexo and
   Alphaville (2024–25) in Breadth, and the degree (2022) sits in Origins after Bradesco
   started (2021).
   - **Recommendation:** keep the spec order and show the real dates on every stop or entry.
     For the same reason Terminal uses `git log career`, not `git log --reverse`.
   - **Alternative:** strict chronology in Journey. That would split Energy in two (CPFL, then
     Sodexo and Alphaville, then CEMIG/CPFL) and break the nine-beat rule.
3. **Fonts:** six packages, two per concept, added only on that concept's branch. All are SIL
   Open Font License 1.1, self-hosted, with no JavaScript.
   - `@fontsource-variable/fraunces@5.3.0` + `@fontsource-variable/source-sans-3@5.3.1`
     (Journey)
   - `@fontsource-variable/jetbrains-mono@5.3.0` + `@fontsource-variable/ibm-plex-sans@5.3.0`
     (Terminal)
   - `@fontsource-variable/space-grotesk@5.3.0` + `@fontsource-variable/inter@5.3.0`
     (Worlds)

   Install sizes are 0.07–1.9 MB per package because they include every subset. Visitors
   download only the subsets the page uses, and I'll report the real transfer size per
   concept.
   - **Alternative:** system fonts, with no new dependencies, but a plainer look and less
     difference between the concepts.

4. **ATOS Jan–Jun 2023 in Worlds** (the CV names no client or sector):
   - **A (recommended):** a neutral "Between worlds" panel between banking and energy.
   - **B:** inside the banking world in a neutral style. Simpler, but it can suggest it was a
     banking project.
   - **C:** a generic "ATOS" tile with no world.
5. **Terminal is dark only (confirmation):** the spec describes its look as dark. A light
   variant would add work and dilute the concept.
6. **Worlds and light/dark mode:**
   - **Recommendation:** fixed palettes per world, ignoring the OS setting, because the colors
     are the concept. This means visitors who prefer dark mode still see two light worlds,
     corporate and cement.
   - **Alternative:** dark variants of the light worlds. More work, and less contrast between
     the worlds.
7. **New copy:** approve the table above, or edit it. Should Terminal commands and code stay
   in English in the Portuguese version, with only the descriptions translated?
   **Recommendation:** yes, because that's how real terminals look.
8. **Preview URLs need these steps first.** Until they're done, I can show each concept
   locally with `npm run preview`.
   1. **Git identity:** the name and email on every commit. In a public repo this email is
      stored in plain text in the history, permanently, even if the repo is deleted later.
      - **Recommendation:** your name "William Amaro Finardi" with GitHub's private noreply
        address (`<id>+Proxyturn@users.noreply.github.com`; I can read the exact one after
        `gh auth login`). Also turn on GitHub → Settings → Emails → "Keep my email addresses
        private", which you do yourself.
      - **Alternative:** your personal email. It works, but it becomes public and permanent in
        the history, which the scraper protection on the site can't cover.

      Then comes the first commit on `main`, which the concept branches are cut from.

   2. **GitHub:** you run `gh auth login`. Then, with your yes, I create the public
      `Proxyturn/portfolio` repo and push.
   3. **Vercel:** you run `vercel login`. Then, with your yes, I link the project. Turning off
      the preview toolbar is a project setting too, so it needs your yes as well. I recommend
      it because the strict CSP blocks the toolbar's script, which costs Lighthouse points.

   **Build order:** journey → terminal → worlds, each on its own branch with tests green and
   reviewed by the critic. The three preview URLs are shown to you together at the end.

---

## Cross-concept notes (for `concept-builder`)

- **Dependencies:** fonts only (question 3). GSAP MotionPath is already inside `gsap`.
- **Remaining tokens:** each theme must also define `--color-border`, `--color-focus`,
  `--color-accent-contrast`, `--color-danger` and `--color-success`. Focus rings and borders
  need at least 3:1 against what's around them, text on accent-filled buttons
  (`--color-accent-contrast`) needs at least 4.5:1, and danger/success text needs at least
  4.5:1 on its surface (for example, form errors on the neutral post office surface in
  Worlds). The concept tests' contrast check covers them.
- **Dark-mode override:** `src/theme/tokens.css` applies its dark values through
  `:root:not([data-color-scheme='light'])` inside a dark media query. Concept CSS must
  override that with equal or higher specificity, loaded later, including inside the same
  media query, or the base dark colors will win.
- **Performance:** each concept's heavy scene code is lazy-loaded per chapter. ScrollTrigger
  instances are cleaned up on unmount through `useScrollScene`.
- **Same tests on every branch:** story scroll, keyboard, i18n, reduced motion, contact, CV,
  axe (zero serious or critical), CSP, plus concept-specific checks (for example, that the
  road path renders, the pinned terminal releases, and every world's surface keeps AA
  contrast).

---

## William's answers (2026-11-09)

1. Storyboards are approved **one by one**. **Journey: approved (2026-11-09).** Terminal and
   Worlds are pending.
2. Keep the spec's beat order and show the real dates.
3. Use the six OFL `@fontsource-variable` packages listed in question 3.
4. Option A: a neutral "Between worlds" panel.
5. Terminal is dark only.
6. Worlds uses fixed palettes per world.
7. Terminal commands and code stay in English in PT-BR. Journey copy is approved (see
   "William's answers on the Journey build" below); Terminal and Worlds copy is still to be
   confirmed.
8. OK to the recommendations: name "William Amaro Finardi" with the GitHub noreply address
   and "Keep my email addresses private". With his yes, create the public
   `Proxyturn/portfolio` repo and push, link Vercel, and turn off the preview toolbar.
   Pending: William runs `gh auth login` and `vercel login`.

## William's answers on the Journey build (2026-11-09)

The critic approved the build first. Then William decided:

1. **Journey copy approved:** the eight Journey rows of the new-copy table, EN and PT-BR as
   listed. This closes the earlier open point on answer 7 for Journey. Terminal and Worlds
   copy is still to be confirmed with their storyboards.
2. **Mini-route labels:** "ATOS · client" for ATOS projects (for example "ATOS · Bradesco"),
   so a client is never read as the employer. Other stops show the company.
3. **Skills line on every stop:** keep it. "Now" also shows the stack as luggage tags.
4. **CV download:** keep "Download CV (PDF)" as the link text, with "Take the map with you"
   as the caption of a labelled group above it.

## William's answers on Terminal, the CV and Vercel (2026-11-09)

1. **Terminal: approved** as written in section 2, including its four new-copy rows with
   the first PT option where two are offered ("Implantando rumo ao futuro").
2. **CV:** use the newest file he provided. He also asked for suggested improvements to it,
   using only facts already in it, reviewed by the critic and shown to him before anything
   is used.
3. **Vercel:** Vercel Authentication and the Vercel Toolbar are off for previews. The
   production domain is `portfolio-bice-two-69.vercel.app`.

## Questions for William on Worlds version 2 (2026-11-09)

W1. **Which Worlds becomes the third concept?**

- **A (recommended): version 2, the clickable world.** It's what you asked to compare, and
  the most playful and memorable of the three. Trade-offs: more work and risk (a spike
  first, then the build), and it brings Worlds closer to Journey, which is also a map.
- **B: version 3b, the scroll-through worlds** (already critic-approved). Trade-offs: less
  playful, with only six world tiles to click and no buildings or links per job, but simpler
  and faster to build, and more different from Journey.

W2. **Ambient touches** (gears, pulses, a truck; each plays once per visit to its district
and ends within 5 seconds; desktop and tablet only):

- **Recommendation:** keep them; they make the world feel alive. Cost: a little more build
  and test work, and they are part of what the spike measures.
- **Alternative:** none. A calmer map that moves only with the camera, and a little less to
  build.

W3. **Copy for version 2.** Approve the version 2 Worlds rows in the new-copy table, or edit
them. Three points to check:

- The title changes from "Six worlds, one developer" to **"Six districts, one developer"**
  (five industries plus the AI frontier), because version 2 is one world with districts.
- The plaza between banking and energy keeps the **"Between worlds" / "Entre mundos"** name
  you approved in answer 4.
- In PT, "distrito" sounds most natural in "distrito industrial". "Polo" (for example
  "Polo de energia") is offered as the alternative for the others.

Without comments, the first PT option is used where two are offered. If you choose B in W1,
the 3b rows below the table apply instead.
