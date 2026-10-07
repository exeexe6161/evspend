# EVSpend branding provenance evidence

Recorded: 7 October 2026. DAIOS_RISK_GUARD_VERSION=1.
Baseline: `main`, `235716a754ce35b743316a10371610305c01b242`.
Canonical summary: `../LICENSES.md`, sections Images & Branding and Brand Assets.
This file supplements that summary with repository evidence. It is excluded from public output with the existing `brand/` source archive. No asset, runtime code or export pipeline is changed by this documentation.

## Direct project-owner statement

Source: the project owner's direct instruction titled "EVSPEND — EVS-RG-003A USER-CONFIRMED BRANDING PROVENANCE DOCUMENTATION", received on 7 October 2026. The owner explicitly confirmed:

> Das EVSpend Branding wurde für dieses Projekt mit Claude erstellt.
> Dazu gehören insbesondere Logo / Symbol und Banner.
> Die heutige Brandfamilie stammt aus diesem EVSpend-Designprozess.
> Es soll KEIN Branding-Rebuild durchgeführt werden.

Recorded origin: **created for EVSpend by the project owner using Claude**. This is a direct owner-supplied project origin statement. It is not an independently verified generation session, a legal authorship determination, proof of exclusive copyright, trademark clearance or a guarantee that AI output automatically carries rights. No assertion is made that every derivative was rendered directly by Claude. The separately documented OG generation context remains Pillow and Inter as described in its introduction commit.

The original Claude session/prompts, original input list and a source named `Final_B_Symbol.svg` are not available in the audited evidence. The name appears in `styles-app.css` as a splash geometry reference, but is not an additional inventoried master file. Their absence is a documentation limit and does not negate the recorded owner statement.

## Current file inventory and hashes

SHA-256 values cover complete file bytes at the baseline above. Dates below are repository introduction dates, not proven original design dates. All 14 image/master files remain byte-identical to their applicable introduction commit.

| File, relative to repository root | Size / role | Introduction | SHA-256 |
|---|---|---|---|
| `brand/EVSpend-symbol-final.svg` | 512 × 512, probable canonical symbol master with background | `c3fefd0` | `7f037f16ff75c7882588dba757a0d8f3d10887f5608b963f46d0e9e201db706a` |
| `brand/EVSpend-symbol-final-transparent.svg` | 512 × 512, transparent symbol variant | `c3fefd0` | `74431d13254935071c61d21f44eb76e690691ab7e339d2023944ca769b3a415b` |
| `brand/EVSpend-final-brand-preview.png` | 1400 × 950, comparison preview | `c3fefd0` | `fefc51ca9b0a5ec3cc8764e52a287179ee4b5f38fe66865bdbf16a45f50225d3` |
| `banner.png` | 1600 × 320, RGB banner | `c3fefd0` | `5fc721da8d4d4505441f59c934eb19fc84419f660921ab99ea6cf4424efa0ba7` |
| `banner.webp` | 1600 × 320, opaque banner | `c3fefd0` | `f9dddaeefc477e85a451d26a166a9d45a0ecf00e3926fbc328add702fd56afc3` |
| `favicon-16x16.png` | 16 × 16, RGB | `c3fefd0` | `50c8d4580196722fd65b608e841e72807a9066f959e5cad06cb18cfe561e7956` |
| `favicon-32x32.png` | 32 × 32, RGB | `c3fefd0` | `59b3920932f45689f4ee645929a4ca6859d627ea3c9eeee964eee323a5e808cf` |
| `favicon.ico` | 16/32/48 frames, fully opaque | `c3fefd0` | `65d69bfb540bee1d5f46aba5a978724c12bc9905621f02d79de930a26e0a459b` |
| `apple-touch-icon.png` | 180 × 180, RGB | `c3fefd0` | `3cedfaaa4c7da7701306f4f849c02573b4030e135f02a629ddbc7d5254c9e936` |
| `android-chrome-192x192.png` | 192 × 192, RGB | `c3fefd0` | `c494e14268dc96990ff158951b13bf0d114d293cee9f5d6e8f38e57d91c6a305` |
| `android-chrome-512x512.png` | 512 × 512, RGB | `c3fefd0` | `81e862fa41dc91e682397a2da3f8f55f83b2c4c6ea7c793fa1c60e9ee6318a8d` |
| `og-image-de.png` | 1200 × 630, RGB | `5344305` | `8e73102717b4938bcaabae4aacb2e40a3cc73936a49094ca277ac81673531773` |
| `og-image-en.png` | 1200 × 630, RGB | `5344305` | `74e14564bf75e8150f81ac683cdfb571c19a2f97737178f31987f02f3280d18a` |
| `og-image-tr.png` | 1200 × 630, RGB | `5344305` | `eb6bc90e671c3bbe613ac43af64f571f41e73d641e4594a664f95308e2395502` |

The three inline splash SVGs have viewBox `0 0 512 512` and the same SHA-256: `7698d66558cd8c410cbde98c0659bff26808b8bf1c8e2cc31d18546132c8622a`.
Locations: `index.html`, `en-eu/index.html`, `tr/index.html`.
Hash scope: UTF-8 bytes from `<svg class="evspend-splash__svg"` through its closing `</svg>`, excluding the surrounding HTML. This is not a hash of the entire HTML container.

`site.webmanifest` references the two Android/PWA icons with purpose `any maskable`; it is configuration, not an additional design master. File SHA-256: `2b9ddb8c52810538d948bece009b56a43a02f68270c0c1f6936e3f00bd165aa4`.

## Technical relationships

VERIFIED below means only the stated technical relationship. It does not establish legal rights or an unavailable historical rendering command.

| Relationship | Status | Evidence and limit |
|---|---|---|
| Opaque SVG ↔ transparent SVG | VERIFIED | All seven path definitions are identical. Background elements differ. Both were introduced together; original creation order is not established. |
| Symbol masters → splash | VERIFIED | Same three Chevron segment endpoints and diamond geometry. Segment directions are reversed; filters, ring and animation are adapted. Introduction/adaptation: `445a6f8`; refinement: `877185d`. |
| Splash DE ↔ EN ↔ TR | VERIFIED | Exact fragment bytes match. Current DE fragment matches `877185d`; TR shell was later added in `7d94215`. |
| Master family → favicon and Apple/PWA raster files | PARTIAL | Matching visible family and common `c3fefd0` introduction. Original SVG renderer/export recipe is unavailable. Six standard resize filters applied to the 512 PNG did not establish an exact complete export chain; ICO 16/32 frames differ from corresponding PNGs. |
| Master family → banner | PARTIAL | Same symbol family and common introduction. Original composition and exact raster wordmark font input are not independently established. |
| Banner PNG → WebP | PARTIAL | Both 1600 × 320, same visible composition; mean absolute channel difference about 0.60/255. Consistent with lossy conversion, but original encoder/settings are missing. |
| Banner PNG → preview banner region | VERIFIED | Pillow Lanczos resize to 1300 × 260 is pixel-identical to preview crop `(50, 585, 1350, 845)`. This proves reproducibility of that region, not the historic command or the entire preview. |
| Master family → remaining preview regions | PARTIAL | Same visible symbol family; original layout/size-generation recipe is unavailable. |
| Pillow + Inter → three OG images | PARTIAL | `5344305` explicitly describes this context and language texts. Generator, exact font input and rendering parameters are unavailable. These April images predate the May symbol masters and are not proven master derivatives. |

## Relevant historical commits

| Commit | Repository date | Applicable evidence |
|---|---|---|
| `c3fefd0ce9d8686b2512e1a0b0adb29568dcd77e` | 2 May 2026 | "replace brand assets with final EVSpend notch identity"; adds two SVGs and preview, replaces eight current banner/favicon/app raster files. |
| `445a6f8fd3174e977f06e0bf7c7d19ab838b129e` | 3 May 2026 | "replace startup splash with final EVSpend notch animation"; documents the splash adaptation. |
| `877185de0129932c2a5c250d7d9df09252b54702` | 3 May 2026 | "refine splash animation and neutralize comparison wording"; contains the current splash geometry/filter fragment. |
| `53443057afd61461f43a04e9a04b11a57fe4e9dc` | 28 April 2026 | Introduces three 1200 × 630 OG images; describes a "Pillow + Inter Variable script". |

Git authorship and AI co-author trailers establish repository history, not original authorship or rights. April audit claims and the April ImageMagick q85 conversion refer to predecessor banner files, not the May replacements; they are not independent origin evidence for current files.

## Fonts, third-party findings and evidence limits

The bounded local branding audit found no concretely identified third-party branding image or symbol: `NO_CONCRETE_THIRD_PARTY_ELEMENT_FOUND`. `CONCRETE_THIRD_PARTY_BRAND_ASSET_FOUND=NO` records this finding, not proof that all inputs are original. No external reverse-image search or trademark search was performed. The masters have no embedded font/text, raster image or external image reference; generic IDs `softGlow` and `atmoGlow` do not identify an author or generator.

Inter is separately documented third-party font software under SIL OFL 1.1 in `../LICENSES.md` and `../fonts/LICENSE.txt`. The application font stack and dynamic text use Inter with `system-ui, sans-serif` fallbacks; the OG commit names Inter Variable. Banner/preview letters are raster pixels, not editable text or traced glyph paths in the symbol masters. Their particular font input is not independently proven. Font licensing does not establish the provenance or rights of the whole branding composition.

## Status and retention decision

```text
BRANDING_ORIGIN_EVIDENCE=PASS
BRANDING_DERIVATION_CHAIN=PARTIAL
CONCRETE_THIRD_PARTY_BRAND_ASSET_FOUND=NO
KEEP_EXISTING_BRANDING=YES_WITH_DOCUMENTATION
EVS_RG_003A=UNGEPRÜFT
EVS_RG_003B=UNGEPRÜFT
CURRENT_FREE_BRANDING_RIGHTS=UNGEPRÜFT
FUTURE_COMMERCIAL_BRANDING_RIGHTS=UNGEPRÜFT
```

Origin PASS is limited to recording the direct owner confirmation and binding this documentation to the current family and its hashes. The complete technical origin/export chain remains partial, so EVS-RG-003A is not closed merely by that subcheck. This remaining status concerns absent technical creation/export evidence; EVS-RG-003B trademark availability is a separate open review.

The owner requests retention of the existing branding with documentation and expressly rejects a rebuild. `YES_WITH_DOCUMENTATION` records that project decision without granting a legal clearance. Exclusive copyright, trademark availability and general current/free or future/commercial rights have not been independently established. EVS-RG-004C and all findings outside this branding documentation scope are unchanged.
