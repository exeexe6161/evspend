# Third-Party Licenses & Attributions

EVSpend (`evspend.com`) is a static web app. The application code itself is proprietary, but it bundles a small number of third-party assets — each one is licensed permissively for commercial use. This document lists every third-party asset, its source, its license, and the attribution required (if any).

Last updated: 28 April 2026.

---

## Fonts

### Inter

- **File(s):** `fonts/InterVariable.woff2`, `fonts/InterVariable-Italic.woff2`
- **Source:** https://github.com/rsms/inter (v4.x)
- **License:** SIL Open Font License (OFL) Version 1.1
- **Copyright:** © 2016 The Inter Project Authors
- **Full license text:** `fonts/LICENSE.txt`

The OFL permits use, modification, and redistribution including bundling and embedding in commercial products. The fonts may not be sold by themselves.

---

## JavaScript Libraries

### Chart.js v4.4.6

- **File:** `vendor/chart-4.4.6.umd.js`
- **Source:** https://www.chartjs.org
- **License:** MIT License
- **Copyright:** © 2024 Chart.js Contributors
- **License notice in file:**

  ```
  Chart.js v4.4.6
  https://www.chartjs.org
  (c) 2024 Chart.js Contributors
  Released under the MIT License
  ```

### Lucide v0.511.0

- **File:** `vendor/lucide-0.511.0.min.js`
- **Source:** https://lucide.dev (fork of Feather Icons)
- **License:** ISC License
- **License notice in file:**

  ```
  @license lucide v0.511.0 - ISC
  This source code is licensed under the ISC license.
  ```

The Lucide icon set is also the source of the inline `<svg>` icons embedded directly in the HTML/JS (e.g., `chevron-down`, `check`, `moon`, `sun`). These inline copies fall under the same ISC license.

---

## Code Ownership

The following files are original work, authored by Hakan Guer with assistance from Anthropic Claude AI per the [Anthropic Terms of Service](https://www.anthropic.com/legal/consumer-terms). All output rights are retained by the user per Anthropic ToS, and the resulting work is the proprietary intellectual property of the project owner.

- `script.js`, `verlauf.js`, `theme-init.js`, `lang-switch.js`, `en-eu/init-eu.js`
- `styles-app.css`, `styles-pages.css`, `en-eu/styles-en-eu.css`
- All HTML files (`index.html`, sub-pages, language variants)
- `middleware.js`, `vercel.json`, `site.webmanifest`, `robots.txt`, `sitemap.xml`

---

## Images & Branding

No third-party stock photography, paid icon sets, or commercial brand marks are bundled in the application. All branding assets are described in detail in the **Brand Assets** section below.

---

## Brand Assets

### Banner & Favicons

- **Source:** AI-generated via Claude (Anthropic)
- **Creation Date:** April 2026
- **License:** User retains rights per Anthropic Terms of Service
- **Commercial Use:** Permitted per Anthropic ToS
- **Files included:**
  - `banner.png`
  - `favicon-16x16.png`
  - `favicon-32x32.png`
  - `favicon.ico` (multi-size)
  - `apple-touch-icon.png` (180×180)
  - `android-chrome-192x192.png`
  - `android-chrome-512x512.png`
  - `site.webmanifest`

### Logo / Wordmark

- **Name:** "EVSpend"
- **Design:** Chevron symbol + wordmark
- **Source:** AI-generated via Claude (Anthropic, April 2026)
- **License:** User retains rights per Anthropic ToS
- **Trademark Status:** Not registered (future consideration)

---

## License Compliance Notes

- All bundled third-party code is permissively licensed (OFL, MIT, ISC). None requires copyleft, source disclosure, or restricts commercial use.
- Font stack uses Inter (self-hosted, OFL) with `system-ui` as a neutral OS-agnostic fallback. No vendor-specific font keywords are present in the codebase.
- All visual effects use W3C-standard CSS only (borders, single-layer shadows, solid backgrounds, custom-styled form controls). No proprietary OS or vendor visual frameworks are required.

---

## Brand & Design Independence

EVSpend is independent of any operating-system vendor or design framework:

- **Visual design** — independent. Custom CSS-only implementation aligned with the Linear / Stripe / GitHub tool aesthetic.
- **Color palette** — proprietary brand colors (`#2563eb` blue, `#22c55e` EV green, `#f59e0b` ICE orange, `#16a34a` savings green). No Apple, Google, or Microsoft system-color values are used.
- **Iconography** — Lucide (ISC license, see above) — community open-source icon set.
- **Typography** — Inter (OFL license) self-hosted; `system-ui` neutral fallback.
- **Components** — original implementations: custom range sliders (WebKit + Mozilla), custom buttons, custom toggles, custom tabs.

No SDK, framework, or vendor design system is bundled or required to run the application.

---

## Reporting

If you spot an asset whose license seems mis-attributed, please open an issue at the project repository.
