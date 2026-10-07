# Third-Party Licenses & Attributions

EVSpend (`evspend.com`) is a static web app. This document records the confirmed third-party components and their original license texts. It does not establish the origin or usage rights of every asset; unresolved SVG and branding provenance requires separate review.

Attribution summary updated: 7 October 2026.

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
- **Original library file:** `vendor/lucide-0.511.0.min.js` was bundled until Phase P Sprint 2 (commit `9177e70`, April 2026). At that point the library was removed and UI icons were inlined in the HTML (rationale: −348 KB per page load). This history does not establish the source of every current SVG variant. Lucide's License notice from the original file:

  ```
  @license lucide v0.511.0 - ISC
  This source code is licensed under the ISC license.
  ```

- **Inline `<svg>` provenance:** The historical Lucide v0.511.0 library and matching current inline subsets are confirmed. Other forms match Feather source references; some variants remain unresolved. Shared stroke style does not establish that every current path was copied verbatim from Lucide v0.511.0.
- **Original notices:** Complete ISC and Feather MIT texts are included below for the confirmed portions. Their inclusion does not establish the origin or license assignment of the unresolved variants.

### SVG provenance inventory

This document is the canonical provenance summary. The audit of commit `95ae88b05b806b114fb22aa40501809f08ecee7d` identified 45 UI shape variants with 245 occurrences in HTML and `theme-init.js`, separate from the branding SVGs. Counts group identical shape data across language versions and repeated uses; they do not count styling differences as new variants.

- **VERIFIED_THIRD_PARTY:** 26 UI variants, 168 occurrences, structurally matched to Lucide 0.511.0 or Feather 4.28.0 reference material. The match establishes the referenced material, not the original download or editing history of every occurrence. Feather 4.28.0 is a matching source reference, not a claim that this package was installed in EVSpend.
- **UNGEPRÜFT:** 19 UI variants, 77 occurrences (EVS-RG-004A). No license or authorship is assigned to these unresolved variants by the notices for the confirmed subsets.

| Verified reference | Matching UI shapes |
|---|---|
| Lucide 0.511.0 | `circle-check`, `user`, `hard-drive`, `cookie`, `megaphone`, `scale`, `accessibility`, `arrow-left`, `message-square-text`, `rotate-ccw`, `sun` |
| Feather 4.28.0 | `check`, `file-text`, `shield`, `wifi`, `user`, `zap`, `type`, `chevron-down`, `moon` |
| Both references | Lucide `chart-no-axes-column` / Feather `bar-chart-2`; Lucide `circle-alert` / Feather `alert-circle`; `lock`; Lucide `wrench` / Feather `tool`; `link`; Lucide `clock` / `clock-4` / Feather `clock` |

The verified Lucide `user` form appears in the privacy pages; the distinct verified Feather `user` form appears in the notices, imprint and terms pages. The dynamically inserted moon and sun in `theme-init.js` match Feather `moon` and Lucide `sun`, respectively, and are included in the totals above. The license checker fingerprints HTML SVG material; it does not fingerprint SVG strings in JavaScript.

All rows below remain **UNGEPRÜFT**. Motif labels identify the audited variants and do not attribute them to a library. Each path is a representative occurrence; counts include matching occurrences in other pages and language versions.

| Unresolved UI motif | Occurrences | Representative file |
|---|---:|---|
| Mail | 13 | `barrierefreiheit.en.html` |
| Square inside square | 4 | `barrierefreiheit.en.html` |
| Message box | 4 | `datenschutz.en.html` |
| Globe | 5 | `datenschutz.en.html` |
| Settings | 5 | `datenschutz.en.html` |
| Activity line | 2 | `datenschutz.en.html` |
| Authority building | 4 | `datenschutz.en.html` |
| Warning triangle | 8 | `en-eu/hinweise.html` |
| Information circle | 4 | `en-eu/hinweise.html` |
| Copyright symbol | 4 | `en-eu/impressum.html` |
| People | 3 | `en-eu/index.html` |
| Line chart | 3 | `en-eu/index.html` |
| Image export | 3 | `en-eu/index.html` |
| Save | 3 | `en-eu/index.html` |
| Refresh | 4 | `en-eu/terms.html` |
| Chart | 3 | `en-eu/verlauf.html` |
| Search | 3 | `en-eu/verlauf.html` |
| Storage device | 1 | `privacy-policy.html` |
| Document | 1 | `privacy-policy.html` |

---

## Code Ownership

The following files are EVSpend project sources. Project history records development with AI assistance. This list does not establish authorship or exclusive rights for every fragment. Confirmed third-party material remains subject to its original license; unresolved provenance and applicable usage rights require separate review.

EVS-RG-004C remains **UNGEPRÜFT**: the complete provenance chain of all project code portions has not been established.

- `script.js`, `verlauf.js`, `theme-init.js`, `lang-switch.js`, `en-eu/init-eu.js`
- `styles-app.css`, `styles-pages.css`, `en-eu/styles-en-eu.css`
- All HTML files (`index.html`, sub-pages, language variants)
- `middleware.js`, `vercel.json`, `site.webmanifest`, `robots.txt`, `sitemap.xml`

---

## Images & Branding

The branding assets are listed below. Their original inputs and usage rights are not fully documented. The confirmed notices for libraries, fonts and icon portions do not resolve these branding questions.

---

## Brand Assets

### Banner & Favicons

- **Origin status:** PROVENANCE_UNRESOLVED for the original inputs and export chain of the current raster files.
- **Project history:** The current branding set was introduced in May 2026; this does not establish its original creation date.
- **Usage rights:** Not established by this document. Original creation evidence and applicable terms require review.
- **Files included:**
  - `banner.png`
  - `banner.webp`
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
- **Source evidence:** Readable SVG masters and project history document local design development and adaptation. They do not establish exclusive rights or the original export chain of every raster variant.
- **Usage rights:** Original creation evidence and applicable terms require review.
- **Trademark status:** TRADEMARK_REVIEW_REQUIRED. Availability and registration status are not established by this document.

### Branding provenance references

| Group | Files / use | Provenance status and evidence limit |
|---|---|---|
| EVSpend SVG masters | `brand/EVSpend-symbol-final.svg`, `brand/EVSpend-symbol-final-transparent.svg` | **UNGEPRÜFT**. Introduced in `c3fefd0`; original inputs and usage rights are not established. |
| Branding raster variants | Banner, favicon and app icon files listed above; `brand/EVSpend-final-brand-preview.png` | **UNGEPRÜFT**. The current set shares the branding commit `c3fefd0`, but the complete export chain from the masters is not established. |
| Splash SVG variants | Inline branding in `index.html`, `en-eu/index.html`, `tr/index.html` | **UNGEPRÜFT**. Shared master geometry and the adaptation in `445a6f8` are documented; original rights remain unresolved. |
| Social preview images | `og-image-de.png`, `og-image-en.png`, `og-image-tr.png` | **UNGEPRÜFT**. Commit `5344305` describes generation with Pillow and Inter, but the stated generation script is absent from the current repository. Verified font licensing does not establish all image inputs or rights. |

EVS-RG-003A (branding origin, original inputs and export chain) and EVS-RG-003B (wordmark, symbol and trademark availability) remain **UNGEPRÜFT**. Git authorship and a local adaptation do not establish original authorship or usage rights. These references grant no trademark clearance.

**CURRENT_FREE_RIGHTS=UNGEPRÜFT** and **FUTURE_COMMERCIAL_RIGHTS=UNGEPRÜFT**. Free use does not resolve missing usage rights. The overall findings **EVS_RG_003=UNGEPRÜFT** and **EVS_RG_004=UNGEPRÜFT** remain open.

---

## License Compliance Notes

- The confirmed third-party components listed in the generated section use OFL, MIT or ISC. Their original terms are reproduced below. This statement does not assign a license to unresolved material.
- Font stack uses Inter (self-hosted, OFL) with `system-ui` as a neutral OS-agnostic fallback. No vendor-specific font keywords (`-apple-system`, `BlinkMacSystemFont`, `Helvetica Neue`, `Segoe UI`, etc.) are present in the codebase.
- All visual effects use W3C-standard CSS only (borders, single-layer shadows, solid backgrounds, custom-styled form controls). No proprietary OS or vendor visual frameworks are required. Glassmorphism / `backdrop-filter: blur` is intentionally absent (per Phase L.2 architecture decision) so the app does not lean on the Apple Aqua / Big Sur visual language.
- The `apple-mobile-web-app-*` HTML meta tags and the `apple-touch-icon` link `rel` are W3C de-facto standards (Apple-introduced, adopted by Android Chrome, Microsoft Edge, Firefox). Their use here is purely functional — required for iOS Safari "Add to Home Screen" PWA support — and does not constitute Apple branding or trademark use.
- No external scripts, stylesheets, fonts, or tracking pixels are loaded at runtime; the strict CSP `default-src 'none'; connect-src 'self'` enforces this on the browser layer.

---

## Brand & Design Independence

EVSpend is independent of any operating-system vendor or design framework:

- **Visual design** — independent. Custom CSS-only implementation aligned with the Linear / Stripe / GitHub tool aesthetic.
- **Color palette** — chosen from the Tailwind CSS palette family (`#2563eb` = `blue-600`, `#22c55e` = `green-500`, `#f59e0b` = `amber-500`, `#16a34a` = `green-600`, `#15803d` = `green-700`, `#b45309` = `amber-700`, …). RGB hex values are factual data and are not subject to copyright; Tailwind CSS itself (the framework) is MIT-licensed but is not bundled here — only individual color values are referenced.
- **Iconography** — confirmed Lucide and Feather portions are attributed above; unresolved variants require separate review.
- **Typography** — Inter (OFL license) self-hosted; `system-ui` neutral fallback.
- **Components** — custom implementations in this project: range sliders (WebKit + Mozilla), buttons, toggles and tabs. This description does not establish exclusive rights or authorship of every fragment.

The web application does not bundle a native SDK or framework. This web statement does not describe the iOS runtime, which uses Capacitor/Cordova and native plugins with a separate notice scope.

---

## Reporting

If you spot an asset whose license seems mis-attributed, please open an issue at the project repository.



<!-- BEGIN GENERATED THIRD PARTY LICENSES -->
## Complete original third party license texts

Generated locally by `node build-licenses.mjs`. Checked by both production build paths.
Versions and source references below describe the verified inventory. Unverified inline variants and asset provenance remain LEGAL_REVIEW_REQUIRED.

### Chart.js

Version: 4.4.6
Declared license: MIT
Release material: vendor/chart-4.4.6.umd.js
Original text source: https://raw.githubusercontent.com/chartjs/Chart.js/v4.4.6/LICENSE.md
Local original: vendor/chartjs-4.4.6.LICENSE.txt

```text
The MIT License (MIT)

Copyright (c) 2014-2024 Chart.js Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

### @kurkle/color

Version: 0.3.2
Declared license: MIT
Release material: embedded in vendor/chart-4.4.6.umd.js; original 2023 banner retained
Original text source: https://raw.githubusercontent.com/kurkle/color/v0.3.2/LICENSE.md
Local original: vendor/kurkle-color-0.3.2.LICENSE.txt

```text
The MIT License (MIT)

Copyright (c) 2018-2021 Jukka Kurkela

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

### Lucide

Version: 0.511.0 verified historical library; current inline subsets include unverified variants
Declared license: ISC
Release material: inline SVG in root, en-eu and tr HTML; no Lucide runtime library
Original text source: https://raw.githubusercontent.com/lucide-icons/lucide/0.511.0/LICENSE
Local original: vendor/lucide-0.511.0.LICENSE.txt

```text
ISC License

Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2022.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

### Feather portions

Version: not independently versioned in EVSpend; 4.28.0 is a matching source reference, not a shipped package claim
Declared license: MIT
Release material: inline SVG subsets and inherited portions named in the Lucide copyright notice
Original text source: https://registry.npmjs.org/feather-icons/-/feather-icons-4.28.0.tgz (package/LICENSE)
Local original: vendor/feather-portions.LICENSE.txt

```text
The MIT License (MIT)

Copyright (c) 2013-2017 Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Inter Variable

Version: 4.001;git-9221beed3 (both local WOFF2 name tables)
Declared license: OFL-1.1
Release material: fonts/InterVariable.woff2 and fonts/InterVariable-Italic.woff2
Original text source: local fonts/LICENSE.txt; embedded font name tables
Local original: fonts/LICENSE.txt

```text
Copyright (c) 2016 The Inter Project Authors (https://github.com/rsms/inter)

This Font Software is licensed under the SIL Open Font License, Version 1.1.
This license is copied below, and is also available with a FAQ at:
http://scripts.sil.org/OFL

-----------------------------------------------------------
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded,
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Font Software to a
new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION AND CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components,
in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name as
presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created
using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.
```

<!-- END GENERATED THIRD PARTY LICENSES -->
