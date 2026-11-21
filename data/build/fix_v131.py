"""v1.3.1: add three missing field_sources entries; write cip4_families as dotted codes.

Usage: python3 fix_v131.py <occupations_v130_in> <institutions_v130_in> <out_dir>
Runs only on v1.3.0 files.
"""
import json, sys, os

occ_in, inst_in, out_dir = sys.argv[1:4]
OD = json.load(open(occ_in)); ID = json.load(open(inst_in))
assert OD["metadata"]["schema_version"] == "1.3.0", "expects v1.3.0 input"

fs = OD["metadata"]["field_sources"]
fs["cip_routing.cip4_families"] = {
    "source": "Computed in the PathwayAI data build: 4-digit CIP families (dotted, e.g. 46.03, same format as institutions programs[].cip4) from the NCES CIP 2020 to SOC 2018 crosswalk",
    "data_vintage": "CIP 2020 / SOC 2018",
    "source_url": "https://nces.ed.gov/ipeds/cipcode/post3.aspx?y=56"}
fs["cip_routing.credential_levels"] = {
    "source": "Computed in the PathwayAI data build: Scorecard credential level(s) matched to the career's typical entry education",
    "data_vintage": None, "source_url": None}
fs["cip_routing.aggregation_note"] = {
    "source": "Computed in the PathwayAI data build: describes how median_program_debt and median_1yr_earnings were aggregated from the Scorecard Field of Study file",
    "data_vintage": None, "source_url": None}

for o in OD["occupations"]:
    c = o["cip_routing"]
    c["cip4_families"] = [f if "." in f else f[:2] + "." + f[2:] for f in c["cip4_families"]]

note = (" v1.3.1 (2026-11-21): added field_sources entries for cip_routing.cip4_families, "
        "cip_routing.credential_levels and cip_routing.aggregation_note; cip4_families now use dotted "
        "codes (46.03) to match institutions programs[].cip4.")
OD["metadata"]["schema_version"] = "1.3.1"; OD["metadata"]["revision_notes"] += note
ID["metadata"]["schema_version"] = "1.3.1"
ID["metadata"]["revision_notes"] += " v1.3.1 (2026-11-21): no institution data changes; version bumped to match occupations.json."

os.makedirs(out_dir, exist_ok=True)
json.dump(OD, open(os.path.join(out_dir, "occupations.json"), "w"), indent=2, ensure_ascii=False)
json.dump(ID, open(os.path.join(out_dir, "institutions.json"), "w"), indent=2, ensure_ascii=False)
print("done")
