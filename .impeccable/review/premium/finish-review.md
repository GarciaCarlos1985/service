disposition: fix

Missing input: formal QUALITY BAR card; the explicit criteria in the calling brief were used. No approved comp, measured spec or comp-diff applies to this Operate extension. Large JSON token output was partially truncated; the source CSS and existing DESIGN.md were inspected directly.

## persistence

Fail pending documentation refresh: `documentos/PRODUCT.md` and the updated direction contract exist, but `documentos/DESIGN.md` still records the previous 3.1rem display cap, previous search green and previous review. It describes `guide.css` rather than the shipped `guide-premium.css` overrides. `.impeccable/design.json` likewise describes the previous system. The brief explicitly schedules their refresh after this verdict; complete that step before calling the candidate finished. Comp-round approval, phase gates and a new concept seed are inapplicable to the explicitly authorized extension of the selected identity.

Evidence passes: all eight required JPEGs exist, are painted and show their stated viewport or scroll state. The two scaled desktop images support composition and card hierarchy; mobile and user-614 provide readable detail. None is represented as a full-page capture. No failed capture was used. Detector input is `[]`; no second detector was run. Asset provenance and automated checks are reported by the parent, not independently rerun here.

## fidelity

| Promise        | Verdict                       | Evidence                                                                                                                                                                                                                        |
| -------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TYPE           | match                         | Manrope, substantial weight and enlarged display scale carry the existing identity. The heading remains readable at 390 and 614 CSS pixels.                                                                                     |
| MATERIAL       | match                         | Actual photographs carry the spotlight, cards and profile; the supplied logo is used directly. No simulated metal, embossing or substitute illustration.                                                                        |
| GROUND         | match                         | The contract names navy and white. The screenshots render those grounds with green actions; no invented warm cream ground or decorative texture.                                                                                |
| THESIS         | match                         | Search leads the home; paid presentation is visibly distinct and sponsorship is disclosed.                                                                                                                                      |
| OWN-WORLD      | contradicted in auth controls | Header and body carry the chosen brand, but the login retains a pale green-to-blue submit control and faint placeholders, visibly weaker than the clear navy/green controls of the guide. See fix 1.                            |
| STORY          | match                         | Search, business profile and actual product list remain recognizable. Paid visibility derives from `plan.featured`; rating display is independent.                                                                              |
| FIRST VIEWPORT | adaptation                    | Desktop pairs search and photograph. Mobile stacks them, as the contract explicitly requires; the mobile-first product requirement permits the spotlight below the initial viewport. Logo, city and search remain identifiable. |
| FORM           | match                         | The user's request for larger scale and Premium Master treatment is implemented within the selected identity. No concept roll was commissioned for this Operate update.                                                         |

Truth: examples are labeled in the preview banner, result notice, spotlight and profile notice. The inspected presentation does not invent ratings or imply paid trustworthiness. The logo and photography are visibly present. `cadastro.tsx:52` retains the unmeasured promise “Leva menos de um minuto”; replace it during the auth correction with factual copy such as “Crie sua conta gratuitamente”.

## ceiling

The brief's large lettering, recognizable logo, photographic spotlight and distinct paid cards/profile are present. No additional ornament, imitation material or motion is needed. The material shortfall is the auth surface: its low-contrast legacy controls interrupt the stronger visual system and its accessibility floor. Category labels positioned as eyebrows also remain in the spotlight, results and company header.

## material_fixes

1. **Floor / OWN-WORLD — finish the shared auth controls.** `auth-mobile.jpg` shows white submit text over a pale gradient; sampled button backgrounds support only approximately 2.7–3.4:1 against white, below 4.5:1 for this small label. Placeholders are also visibly faint. Scope a solid, contrast-checked action and readable placeholders to `.guide-auth` in `src/styles/guide-premium.css:464`; retain loading/error behavior in `src/routes/entrar.tsx:67`, `cadastro.tsx:69` and `recuperar-senha.tsx:77`. Verify normal and focused states in a fresh auth capture, and replace the unmeasured duration claim at `cadastro.tsx:52`.
2. **Floor — remove category eyebrows above business names.** Move category metadata into the supporting line below the name, keeping sponsorship conspicuous. Sources: `src/modules/guide/components/Premium.tsx:52`, `src/modules/guide/components/shared.tsx:288` and `src/modules/guide/screens/CompanyDetail.tsx:108`. The craft floor explicitly bans kickers above headings; these small isolated labels visibly use that arrangement. Preserve the category information and the paid disclosure.
3. **Persistence — record the actual shipped system after visual corrections.** Refresh `documentos/DESIGN.md` and `.impeccable/design.json` with the new logo, premium navy/green, display sizes, photographic spotlight, paid variants, scoped auth treatment and this review's scope. Preserve existing project/product constraints.

## keep

Keep the original blue/green logo, oversized city/search hierarchy, real photography, navy paid cards and explicit “Destaque patrocinado” disclosure independent of ratings.

---

<!-- Post-fix addendum: scores only material fixes 1 and 2 above. Original audit preserved. -->

## verdict

1. **Resolved — auth contrast and factual copy.** The updated `auth-mobile.jpg` visibly replaces the pale gradient submit with a solid navy action and white label. The scoped source at `guide-premium.css:850–860` removes the gradient, sets the navy background, and gives placeholders `#52657c` at full opacity. The signup source now says “Guarde seus favoritos e descubra negócios locais.” The submitted capture supports the normal control appearance; this review does not independently certify the reported computed focus/hover measurements.
2. **Resolved — category eyebrows.** `desktop.jpg`, `desktop-cards.jpg` and `mobile-spotlight.jpg` show categories beneath business names. `company-mobile.jpg` places the company name first, followed by category and sponsorship. Information and the “Destaque patrocinado” disclosure remain present.

No regressions introduced by this correction batch are visible in the eight valid replacement captures.

## remaining

Visual fixes 1 and 2 are clear. This ship covers the scored visual fixes only. Persistence remains pending: the documenter must complete the original material fix 3 in DESIGN.md and design.json before the whole candidate is considered finished. No new audit or detector pass was performed.

disposition: ship

## Persistence closure — implementation record

After the scoped visual verdict, the documenter refreshed `documentos/DESIGN.md`
and `.impeccable/design.json` from the corrected source. The sidecar is valid
JSON; prior versions are preserved under `documentos/referencias/`. This closes
material fix 3 as a documentation task. It adds no new visual audit, backend
verification or production approval to the reviewer's verdict.
