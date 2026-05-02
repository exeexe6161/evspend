# Third-Party Licenses & Attributions

EVSpend (`evspend.com`) is a static web app. The application code itself is proprietary, but it bundles a small number of third-party assets — each one is licensed permissively for commercial use. This document lists every third-party asset, its source, its license, and the attribution required (if any).

Last updated: 1 May 2026.

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

- **Source:** https://lucide.dev (fork of Feather Icons)
- **License:** ISC License
- **Original library file:** `vendor/lucide-0.511.0.min.js` was bundled until Phase P Sprint 2 (commit `9177e70`, April 2026). At that point the library was removed and the same icon path data was copied directly into the HTML as inline `<svg>` elements (rationale: −348 KB per page load). Lucide's License notice from the original file:

  ```
  @license lucide v0.511.0 - ISC
  This source code is licensed under the ISC license.
  ```

- **Inline `<svg>` provenance:** Every `<svg>` in `index.html`, `en-eu/index.html` and all legal pages (`impressum`, `datenschutz`, `terms`, `hinweise`, `barrierefreiheit`, plus their language variants) follows the Lucide stroke-style convention (`viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `stroke-width="2"`, `stroke-linecap="round"`, `stroke-linejoin="round"`). The path data is copied verbatim from Lucide v0.511.0 — `users`, `line-chart`, `arrow-left`, `image-down`, `message-square-text`, `save`, `clock`, `rotate-ccw`, `check`, `chevron-down`, `cookie`, `shield`, `globe`, `mail`, `lock`, `eye-off`, `file-text`, `alert-triangle`, `accessibility`, etc.
- **ISC compliance:** The ISC license requires the copyright notice be preserved "in all copies or substantial portions of the Software." The notice above (and this entire entry) preserves the attribution at the project level, which is the conventional way to attribute icon path-data after de-bundling. No header-comment per inline `<svg>` is required by ISC; one is added for clarity above the first SVG block on the calculator pages.

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
- Font stack uses Inter (self-hosted, OFL) with `system-ui` as a neutral OS-agnostic fallback. No vendor-specific font keywords (`-apple-system`, `BlinkMacSystemFont`, `Helvetica Neue`, `Segoe UI`, etc.) are present in the codebase.
- All visual effects use W3C-standard CSS only (borders, single-layer shadows, solid backgrounds, custom-styled form controls). No proprietary OS or vendor visual frameworks are required. Glassmorphism / `backdrop-filter: blur` is intentionally absent (per Phase L.2 architecture decision) so the app does not lean on the Apple Aqua / Big Sur visual language.
- The `apple-mobile-web-app-*` HTML meta tags and the `apple-touch-icon` link `rel` are W3C de-facto standards (Apple-introduced, adopted by Android Chrome, Microsoft Edge, Firefox). Their use here is purely functional — required for iOS Safari "Add to Home Screen" PWA support — and does not constitute Apple branding or trademark use.
- No external scripts, stylesheets, fonts, or tracking pixels are loaded at runtime; the strict CSP `default-src 'none'; connect-src 'self'` enforces this on the browser layer.

---

## Brand & Design Independence

EVSpend is independent of any operating-system vendor or design framework:

- **Visual design** — independent. Custom CSS-only implementation aligned with the Linear / Stripe / GitHub tool aesthetic.
- **Color palette** — chosen from the Tailwind CSS palette family (`#2563eb` = `blue-600`, `#22c55e` = `green-500`, `#f59e0b` = `amber-500`, `#16a34a` = `green-600`, `#15803d` = `green-700`, `#b45309` = `amber-700`, …). RGB hex values are factual data and are not subject to copyright; Tailwind CSS itself (the framework) is MIT-licensed but is not bundled here — only individual color values are referenced. Verified that **no Apple System Colors** (e.g., `#34C759`, `#0A84FF`, `#FF3B30`), **no Material Design 3 default colors**, and **no Microsoft Fluent palette values** are used.
- **Iconography** — Lucide (ISC license, see above) — community open-source icon set.
- **Typography** — Inter (OFL license) self-hosted; `system-ui` neutral fallback.
- **Components** — original implementations: custom range sliders (WebKit + Mozilla), custom buttons, custom toggles, custom tabs.

No SDK, framework, or vendor design system is bundled or required to run the application.

---

## Reporting

If you spot an asset whose license seems mis-attributed, please open an issue at the project repository.
