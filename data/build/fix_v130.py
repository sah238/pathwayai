"""Apply the v1.3.0 fixes to occupations.json and institutions.json.

Usage: python3 fix_v130.py <occupations_in> <institutions_in> <out_dir>
Rerunnable: always starts from the v1.2.0 inputs.
"""
import json, sys, copy, os

occ_in, inst_in, out_dir = sys.argv[1:4]
OD = json.load(open(occ_in))
ID = json.load(open(inst_in))
O = OD["occupations"]
I = ID["institutions"]
inst = {r["record_id"]: r for r in I}
occ = {o["soc_code"]: o for o in O}
log = []

# ---------- 1. Computer Science (11.07) -> Software Developers (crosswalk) ----------
for r in I:
    for p in r["programs"] or []:
        if p.get("cip4") == "11.07" and "15-1252" not in p["related_soc_codes"]:
            p["related_soc_codes"] = sorted(p["related_soc_codes"] + ["15-1252"])
sd = occ["15-1252"]["cip_routing"]
if "1107" not in sd["cip4_families"]:
    sd["cip4_families"] = sorted(sd["cip4_families"] + ["1107"])
    sd["related_programs"].append({"cip6": "11.0701", "title": "Computer Science"})
    sd["related_programs"].sort(key=lambda x: x["cip6"])
# Recomputed from Most-Recent-Cohorts-Field-of-Study.csv with the file's own method
# (median of program-level medians, CIP 1101/1102/1107, CREDLEV 3, PS excluded, .5 rounded up).
# The same method reproduces all 30 existing v1.2.0 values (see fos_check.py).
sd.update(median_program_debt=20500, median_1yr_earnings=69615, n_programs_debt=784, n_programs_earnings=861)
log.append("Linked Computer Science (CIP 11.07) programs to 15-1252 Software Developers, per the NCES CIP2020-SOC2018 crosswalk, and recomputed its national debt/earnings from the Field of Study file (debt $20,743 -> $20,500; 1-yr earnings $66,691 -> $69,615; 429/482 -> 784/861 programs).")

# ---------- 2. Recompute dmv_providers: only programs with recent completers ----------
changed = []
for o in O:
    s = o["soc_code"]; c = o["cip_routing"]; levels = set(c["credential_levels"])
    confirmed, unconfirmed = [], []
    for r in I:
        rid = r["record_id"]
        if rid.startswith("APPR"):
            if s in (r["apprenticeship"] or {}).get("related_soc_codes", []):
                confirmed.append(rid)
            continue
        m = [p for p in r["programs"] or [] if s in p["related_soc_codes"] and p["credential"] in levels]
        if not m:
            continue
        counts = [p.get("completers_2yr") for p in m]
        if any(isinstance(n, (int, float)) and n > 0 for n in counts):
            confirmed.append(rid)
        elif any(n is None for n in counts):
            unconfirmed.append(rid)
        # all zero -> dropped
    old = c["dmv_providers"]
    if set(old) != set(confirmed) or unconfirmed:
        changed.append((s, sorted(set(old) - set(confirmed)), sorted(set(confirmed) - set(old)), unconfirmed))
    c["dmv_providers"] = confirmed
    c["dmv_providers_unconfirmed"] = unconfirmed
    if not confirmed:
        o["data_quality_flags"].append({
            "field": "cip_routing.dmv_providers",
            "issue": "No DC/MD/VA provider in institutions.json has recent completers in this career's program at the required credential level. The card should say no local program was found and show the national route.",
        })
log.append("dmv_providers now lists only providers with at least one completer in the last two years (completers_2yr > 0) at the required credential level. Programs with null completer counts moved to new field dmv_providers_unconfirmed. Apprenticeship sponsors kept.")

OD["metadata"]["field_sources"]["cip_routing.dmv_providers"] = {
    "source": "Computed: institutions.json providers whose programs list this SOC at the required credential level with completers_2yr > 0, plus registered apprenticeship sponsors for this SOC",
    "data_vintage": None, "source_url": None}
OD["metadata"]["field_sources"]["cip_routing.dmv_providers_unconfirmed"] = {
    "source": "Computed: providers whose matching program has a null completers_2yr (not reported); not shown as local options until confirmed",
    "data_vintage": None, "source_url": None}

# ---------- 3. Wage notes verified against BLS OEWS May 2025 state file ----------
p = occ["19-3033"]
p["data_quality_flags"] = [f for f in p["data_quality_flags"] if f["field"] != "state_wages_2025.VA.employment"]
p["data_quality_flags"].append({
    "field": "state_wages_2025.VA.employment",
    "issue": "Checked against the BLS OEWS May 2025 state file (state_M2025_dl.xlsx): VA and MD employment are both published as 2,140. Not an error.",
})
for s, emp in (("19-3033", 220), ("29-1131", 190)):
    occ[s]["data_quality_flags"].append({
        "field": "state_wages_2025.DC.wage_90th",
        "issue": f"Matches the BLS OEWS May 2025 state file, but DC employment is small ({emp}), so the 90th percentile is far above the 75th. Show DC percentiles with a small-sample note or lead with the median.",
    })
log.append("Checked every DC/MD/VA wage row (83 rows) against BLS OEWS May 2025 state file: all match. Replaced the 19-3033 VA 'recheck' flag; added small-sample notes for DC 90th percentiles of 19-3033 and 29-1131.")

# ---------- 4. Institutions: same fields on every record ----------
PROG_KEYS = ["cip4", "title", "credential_level", "credential", "related_soc_codes",
             "completers_2yr", "median_debt", "median_1yr_earnings", "distance_only"]
for r in I:
    c = r["cost_and_net_price"]
    for k in ("net_price_tier4_75_110k", "net_price_tier5_110k_plus"):
        c.setdefault(k, None)
    order = ["avg_net_price", "net_price_tier1_0_30k", "net_price_tier2_30_48k", "net_price_tier3_48_75k",
             "net_price_tier4_75_110k", "net_price_tier5_110k_plus", "net_price_flag"]
    r["cost_and_net_price"] = {k: c[k] for k in order}
    od = r["outcomes_and_debt"]
    od.setdefault("cohort_default_rate_cohort_fy", None)
    od.setdefault("cohort_default_rate_display", False)
    order = ["completion_rate_150pct", "retention_rate_ft", "cohort_default_rate_3yr", "cohort_default_rate_cohort_fy",
             "cohort_default_rate_display", "repayment_rate_3yr", "median_grad_debt", "median_earnings_6yr", "median_earnings_10yr"]
    r["outcomes_and_debt"] = {k: od[k] for k in order}
    r["programs"] = [{k: p.get(k) for k in PROG_KEYS} for p in r["programs"] or []]
    if r["record_id"].startswith("APPR"):
        for p in r["programs"]:
            p["title"] = p["title"] or "Registered apprenticeship"
            p["distance_only"] = False
log.append("Apprenticeship records now carry the same fields as Title IV records (missing ones set to null), so one schema fits all 20 providers.")

# ---------- 5. Apprenticeship details from web lookups ----------
A = {
    "APPR-IBEW26": dict(
        source_url="https://jatc26.org/",
        add_sources=["DC DOES union apprenticeship sponsors list (reg. no. 93007, 4371 Parliament Pl., Suite A, Lanham, MD 20706)"]),
    "APPR-SM602": dict(
        source_url="https://governor.maryland.gov/news/press-releases/governor-moore-visits-steamfitters-local-602-training-center-landover",
        program_length_years=5,
        add_sources=["Office of Governor Wes Moore press release, Oct 2023 (five-year program, Landover training center)", "602training.org application page"]),
    "APPR-SMART100": dict(
        source_url="https://smart100.org/",
        zip="20746",
        registered_add="VA",
        add_sources=["GWU Project EXPAND sheet metal provider listing (4725 Silver Hill Road, Suitland, MD 20746)",
                     "Maryland Dept. of Labor MATP success story (five-year, fully paid program)",
                     "Local 100 training centers in Richmond (184 E. Belt Blvd) and Norfolk (5307 E. Virginia Beach Blvd), listed as registered apprenticeships (JATC Richmond, JAC Norfolk)"]),
    "APPR-MACTC": dict(
        source_url="https://www.mactc.net/",
        registered_add="DC",
        program_length_years=4,
        add_sources=["DC DOES union apprenticeship sponsors list (reg. no. 93005, Joint Carpentry Apprenticeship Committee of Washington, DC and Vicinity, 8510 Pennsylvania Ave, Upper Marlboro, MD 20772)",
                     "GWU Project EXPAND carpentry provider listing (program length 4 years, 8,000 field hours)"]),
}
for rid, a in A.items():
    r = inst[rid]; ap = r["apprenticeship"]
    for s in a.get("add_sources", []):
        if s not in ap["sources"]:
            ap["sources"].append(s)
    if "program_length_years" in a:
        ap["program_length_years"] = a["program_length_years"]
    if "registered_in" in ap and a.get("registered_add") and a["registered_add"] not in ap["registered_in"]:
        ap["registered_in"] = sorted(ap["registered_in"] + [a["registered_add"]])
    if "zip" in a:
        r["location"]["zip_raw"] = a["zip"]; r["location"]["zip5"] = a["zip"]
        r["data_quality_flags"] = [f for f in r["data_quality_flags"] if f["field"] != "location.zip5"]
    r["provenance"]["apprenticeship"]["source"] = "; ".join(ap["sources"])
    r["provenance"]["apprenticeship"]["source_url"] = a["source_url"]
inst["APPR-SM602"]["notes"] = "Pipefitting/steamfitting and HVAC&R apprenticeship; five-year program per Maryland Governor's Office (Oct 2023). No Scorecard data (not Title IV)."
inst["APPR-SM602"]["data_status"] = "Sponsor verified from official sources"
inst["APPR-SMART100"]["data_status"] = "Sponsor verified from official/sponsor sources"
inst["APPR-SMART100"]["notes"] = "Sheet metal apprenticeship; five-year program. Suitland is the DC-area training center; Virginia apprentices train through Local 100's Richmond and Norfolk centers. No Scorecard data (not Title IV)."
inst["APPR-MACTC"]["notes"] = "Carpentry apprenticeship; four-year program at the Upper Marlboro center. Registered in Maryland and on DC DOES's union sponsor list. No Scorecard data (not Title IV)."
inst["APPR-MACTC"]["data_status"] = "Sponsor verified; VA registration to confirm"
log.append("Apprenticeships: SMART Local 100 ZIP 20746 (4725 Silver Hill Rd, Suitland) and VA added (Richmond and Norfolk training centers); Steamfitters 602 length set to 5 years; Mid-Atlantic Carpenters length set to 4 years and DC added (DC DOES list); a source_url added for all four sponsors.")

# ---------- 6. Scorecard vintage ----------
VINT = "College Scorecard data release last updated June 10, 2026 (files downloaded Nov 15, 2026)"
for fs in ID["metadata"]["field_sources"].values():
    if isinstance(fs, dict) and "data_vintage" in fs:
        fs["data_vintage"] = VINT
for r in I:
    for v in r["provenance"].values():
        if "data_vintage" in v and (v["data_vintage"] or "").startswith("file uploaded"):
            v["data_vintage"] = VINT
for k, fs in OD["metadata"]["field_sources"].items():
    if isinstance(fs, dict) and "Scorecard" in fs.get("source", "") and fs.get("data_vintage") in (None, "Nov 2026", "file uploaded 2026-11-21"):
        fs["data_vintage"] = VINT
log.append("Scorecard data_vintage now names the data release (updated June 10, 2026) instead of the upload date.")

# ---------- metadata ----------
for D, name in ((OD, "occupations"), (ID, "institutions")):
    D["metadata"]["schema_version"] = "1.3.0"
    D["metadata"]["revision_notes"] += " v1.3.0 (2026-11-21): " + " ".join(log)
ki = ID["metadata"]["known_open_issues"]
ID["metadata"]["known_open_issues"] = [x for x in ki if not x.startswith("Apprenticeship sponsors")] + [
    "Apprenticeship sponsors: Mid-Atlantic Carpenters' Virginia registration not confirmed (EAS Carpenters also run Virginia centers in Charles City and Ashland, not included here).",
    "Many programs have completers_2yr of 0 or null; occupations.json dmv_providers excludes those (see dmv_providers_unconfirmed).",
]
OD["metadata"]["known_open_issues"] += [
    "29-2042 EMT work_environment and hours_and_schedule still null: the derivation rules for these labels are not recorded, so they were not hand-filled.",
    "work_profile.value_system is deprecated (legacy labels). Kept for reference and for the 3 careers without work_values; do not use for Q4 matching.",
]

os.makedirs(out_dir, exist_ok=True)
json.dump(OD, open(os.path.join(out_dir, "occupations.json"), "w"), indent=2, ensure_ascii=False)
json.dump(ID, open(os.path.join(out_dir, "institutions.json"), "w"), indent=2, ensure_ascii=False)
for s, dropped, added, unc in changed:
    print(s, occ[s]["career_title"], "| dropped:", dropped, "| added:", added, "| unconfirmed:", unc)
print("\n".join(log))
