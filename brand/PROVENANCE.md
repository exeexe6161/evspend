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


## C3 R2 local integration, 11 October 2026

The preceding inventory and relationships document the previous Chevron family at their stated baseline. Active product branding now uses the owner-selected C3 Grounded Terminal from `EVSpend-Brand-Kit-2.0-C3-R2`. Local integration was expressly authorized by the owner on 11 October 2026, without commit or publication authorization.

Sources reviewed: kit `00-START-HERE/BRAND-GUIDELINES.md`, `CHANGELOG-R2.md`, `11-INTEGRATION-HANDOFF/ASSET-MAPPING.md`, `asset-mapping.json`, and `10-LICENSES-PROVENANCE/LICENSES.md` and `PROVENANCE.md`. The complete kit SHA256SUMS verification passed. The 14 active raster/vector files below match the supplied R2 bytes. Splash inline SVG fingerprint matches the reviewed Patch 01 proposal. Existing Inter files and original third party notices remain unchanged.

| Active C3 product file | R2 source | SHA256 |
|---|---|---|
| `android-chrome-192x192.png` | `02-APP-WEB-ICONS/web/android-chrome-192x192.png` | `ba791b91f1cbea5fa71778882100bf288e7db18ac8f3e4f9089c318d86afa188` |
| `android-chrome-512x512.png` | `02-APP-WEB-ICONS/web/android-chrome-512x512.png` | `743a39adf553909a4acebad6852c064da3f9a112f0c42ea36a3405a212ab41c9` |
| `apple-touch-icon.png` | `02-APP-WEB-ICONS/web/apple-touch-icon.png` | `5c64f02d8626ea93c9afa1cbf5e1025fd973949ea02cbf0db34891c9b88a31d0` |
| `banner.png` | `03-BANNERS-SOCIAL/app-banner/banner.png` | `5a3835c9aef8994a072f763d04e8dc44c211ab56ac0134296d65265b904cc0f9` |
| `banner.webp` | `03-BANNERS-SOCIAL/app-banner/banner.webp` | `5af468473781d405c1e54cddc04155621bc94dfac0c59f853600fdb9b4bd8b25` |
| `favicon-16x16.png` | `02-APP-WEB-ICONS/web/favicon-16x16.png` | `42b6163203a3ad202ee54109ec72e11ef74bbf405dd98799202527d87466c615` |
| `favicon-32x32.png` | `02-APP-WEB-ICONS/web/favicon-32x32.png` | `c73e946ee5f13e61652d4e1383185f2ef9b74fdddf316b5c947ff9b9ec5487cb` |
| `favicon.ico` | `02-APP-WEB-ICONS/web/favicon.ico` | `3b9a86e6570967b05a25b79ef88465c710a2771570a26195c09e469044081457` |
| `favicon.svg` | `02-APP-WEB-ICONS/web/favicon.svg` | `b87ac36631d78dff176a7e33ba88ca0f3a530eae8878497e09d9ea2758ffe77b` |
| `maskable-192x192.png` | `02-APP-WEB-ICONS/web/maskable-192x192.png` | `cd204aa5575ab81779fb6eb5d7f22604f15910e55f5f506532c80b023c2df11e` |
| `maskable-512x512.png` | `02-APP-WEB-ICONS/web/maskable-512x512.png` | `1131b1c9cd536692c31e94bfd53d9c3d2ad4d0a005fa9b24f0236c7e8b722a78` |
| `og-image-de.png` | `03-BANNERS-SOCIAL/og-link-preview/og-image-de-1200x630.png` | `c8c32f2320d945e3131ed2ffffd1e9d510db95fbb9430bc64ea48b27e3bd985e` |
| `og-image-en.png` | `03-BANNERS-SOCIAL/og-link-preview/og-image-en-1200x630.png` | `983858a7ad8d7b53320b664dba5dc9c57fe0a2c01211e6eea26b22655a96fab4` |
| `og-image-tr.png` | `03-BANNERS-SOCIAL/og-link-preview/og-image-tr-1200x630.png` | `ec6eb5d217536f2f9c35f4438501eebffd4c80059b16e235c339e0cc529f7271` |

C3 symbol and wordmark were created for EVSpend in the supplied design process; vector wordmark derives from Inter Variable 4.001, weights 720 and 380, under the existing SIL OFL 1.1 notice. Generators remain in the kit and are not published as product assets. Historical masters in `brand/` remain archived evidence and are not active resources. Trademark and exclusive usage rights remain UNGEPRÜFT / TRADEMARK_REVIEW_REQUIRED / LEGAL_REVIEW_REQUIRED. This integration documents technical identity and owner instruction, not legal clearance.


## EVSpendPure final brand kit (12 October 2026)

Owner instruction: "EVSPENDPURE — FINAL BRAND IDENTITY, COMPLETE PREMIUM BRAND KIT, WEB & IOS REBRANDING, PRODUCTION
INTEGRATION" (12 October 2026). Generated with the kit generators (`11-GENERATORS`, brand.py) from these inputs only:

* C3 geometry (EVSpend Brand Kit 2.0 C3 R2, mono.sign C3).
* Signature Cut: band of 12 units, 24 degrees from vertical, lower edge from the inner top corner of the right V arm
  (375.64 | 138) in the 512 grid. Small form (no cut) for 16 to 48 px raster favicons.
* WeatherPure wordmark master `weatherpure-wordmark-black.svg` (pure, Pure-P with Riss, verbatim paths).
* Inter Variable 4.001, SIL OFL 1.1, converted to paths or raster pixels.

Files replaced in place: favicon.svg, favicon.ico, favicon-16x16.png, favicon-32x32.png, apple-touch-icon.png,
android-chrome-192x192.png, android-chrome-512x512.png, maskable-192x192.png, maskable-512x512.png, banner.png,
banner.webp, og-image-de.png, og-image-en.png, og-image-tr.png, inline splash SVG in index.html, en-eu/index.html,
tr/index.html. Masters added: brand/EVSpendPure-*.svg. SHA-256 values are pinned in vendor/license-inventory.json.
Trademark clearance (EVS-RG-003B) and legal review remain open; this record is not a legal clearance.

## Minimal splash (21 October 2026)

Owner request: calmer splash in the manner of www.weatherpure.com. The inline splash SVG in index.html,
en-eu/index.html and tr/index.html is now only the horizontal EVSpendPure wordmark (EV with Signature Cut plus
Spendpure, same paths as `brand/EVSpendPure-horizontal-*.svg`), revealed by one wipe with a quiet fade. Generated by
`11-GENERATORS/build_splash.py` of the EVSpendPure brand kit. The SVG fingerprint in vendor/license-inventory.json was
re-pinned. Trademark and legal review remain open.
