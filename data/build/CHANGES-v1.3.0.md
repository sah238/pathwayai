# PathwayAI data v1.3.0 — changes from v1.2.0 (2026-11-21)

Both files are now `schema_version` 1.3.0. Every change is also listed in each file's `metadata.revision_notes`. The script that made them (`fix_v130.py`) runs against the v1.2.0 files and can be rerun. `fos_check.py` reproduces the national program medians from the Field of Study file.

## Checked, no change needed
- **State wages.** All 83 DC/MD/VA wage rows match the BLS OEWS May 2025 state file (`state_M2025_dl.xlsx`), including DC 90th percentiles of $324,950 (clinical psychologists) and $294,160 (veterinarians). The 7 missing rows are missing in the BLS file too. 19-3033 MD and VA both really are 2,140 employed.
- **Program-to-career links.** Every CIP family in `cip_routing` appears in the NCES CIP2020–SOC2018 crosswalk for that career, including Environmental/Natural Resources Management (03.02) for firefighters.

## Changed
1. **Computer Science → Software Developers.** CIP 11.07 programs now also list 15-1252, as the crosswalk does. Howard, UMBC and William & Mary join the software developer provider list. National figures were recomputed from `Most-Recent-Cohorts-Field-of-Study.csv` using the same method as v1.2.0. That method (`fos_check.py`) reproduces all 30 existing v1.2.0 values, to the dollar, when .5 is rounded up.
   - Median debt: $20,743 → $20,500
   - 1-year earnings: $66,691 → $69,615
   - Programs: 429 / 482 → 784 / 861
2. **Local provider lists (`dmv_providers`).** These now include only schools with at least one completer in the last two years at the required credential level, plus apprenticeship sponsors. 16 school–career pairs dropped out (e.g., Montgomery College for dental hygiene and EMT, Johns Hopkins for the BSN, Howard for nurse practitioner). Pairs where the completer count isn't reported are in a new field, `dmv_providers_unconfirmed`.
3. **"No local program" flags.** Added for 49-9041 Industrial Machinery Mechanics, 39-2021 Animal Caretakers and 49-9081 Wind Turbine Technicians.
4. **Wage notes.** Removed the 19-3033 "recheck VA employment" flag (verified). Added small-sample notes on the DC 90th percentile for 19-3033 and 29-1131.
5. **Same fields on every provider.** Apprenticeship records now have tier 4–5 net price, `cohort_default_rate_cohort_fy` and `cohort_default_rate_display` (null/false), and their programs have the same fields as college programs (null where not applicable).
6. **Apprenticeship details:**
   - SMART Local 100: ZIP 20746 (4725 Silver Hill Rd, Suitland); ZIP flag removed. VA added to `registered_in`, based on Local 100's registered training centers in Richmond and Norfolk.
   - Steamfitters Local 602: program length 5 years (Maryland Governor's Office, Oct 2023).
   - Mid-Atlantic Carpenters: program length 4 years (GWU Project EXPAND listing for the Upper Marlboro center). DC added to `registered_in` (DC DOES union sponsor list, reg. no. 93005).
   - All four sponsors now have a `source_url`.
7. **Scorecard data vintage.** Changed from "file uploaded 2026-11-21" to the Scorecard release (last updated June 10, 2026; downloaded Nov 15, 2026).

## Left as is, on purpose
- **`value_system`.** It was already marked deprecated in `field_sources`. Kept for reference and because it is the only values data for 3 careers; don't use it for Q4 matching.
- **Cohort default rate 0.0.** It is the real published value (federal loan pause), and `cohort_default_rate_display` is false.
- **Curiosity, and Work Values for 15-1252, 15-2051, 29-2042.** Still null, pending a team decision.
- **EMT work environment / schedule.** Still null. The rules that produced these labels for other careers aren't recorded, so I didn't hand-fill them.

## Still open
- Mid-Atlantic Carpenters' Virginia registration is not confirmed.
- Curiosity (quiz Q4): deferred.
