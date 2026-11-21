# Research link: [**https\://gemini.google.com/share/d/1HcbumroEwxxWofxpOccU\_KQbIgdvRyGk?usp=sharing**](https://gemini.google.com/share/d/1HcbumroEwxxWofxpOccU_KQbIgdvRyGk?usp=sharing)

# **PathwayAI Technical Build Blueprint and Top 100 Professions Data Package**

Building a usable PathwayAI web application for Team 7's Class 9 demonstration requires separating offline data engineering from runtime generative AI: pre-join seven public federal data layers into normalized local lookup tables, run all wage fallbacks and education return-on-investment (ROI) math deterministically in backend code, and restrict Gemini strictly to semantic intent extraction and plain-English explanation1. Because a binary .zip archive cannot be compiled or attached directly inside this text deliverable, the manifest and extraction workflow below give your content and engineering leads the exact official federal bulk download URLs, join keys, and filtering rules required to assemble the Top 100 U.S. Professions dataset—and your 25–30 occupation beta package—in a single local build step1. Because the full 100-occupation national ranking resides inside the downloadable Bureau of Labor Statistics (BLS) Excel and ZIP archives rather than inline across published summary pages, this blueprint pairs the bulk source links with the verified top 30 U.S. occupations by projected numeric job growth (2025–2035) from BLS Table 1.4 as an immediate beta seed5.  
Executing your scoping outline also requires resolving two empirical and compliance constraints documented across 2025–2026 sources before your build team deploys1. First, as noted in your requirements blueprint citing Google API pricing documentation and developer forum threads, prompts sent through the Gemini Developer API Free Tier can be used to improve Google's products—which would conflict with your team's rule against training external models on student conversations—so your backend must run on a Paid Tier project key at minimum and plan for Vertex AI Zero Data Retention (ZDR) prior to school deployment1. Second, relying exclusively on College Scorecard omits non-Title IV registered apprenticeships and workforce training providers, while relying exclusively on BLS's four AI exposure tiers obscures early-career hiring compression among workers aged 22–25 and cannot separate task augmentation from job replacement1.

## **Official Data Sources for the Top 100 U.S. Professions Bundle**

Delivering PathwayAI's four core user capabilities—plain-English interest matching, cross-sector labor comparisons, task-level AI breakdowns, and geography-aware educational ROI—depends on combining seven public federal data layers1. Rather than downloading College Scorecard's 536 MB historical archive (College\_Scorecard\_Raw\_Data\_11022026.zip), your data collection leads (Avis and Jack) can keep the build bundle compact by pulling only the two most recent Scorecard archives (24 MB and 34 MB) alongside the BLS, O\*NET, apprenticeship, and HUD datasets1.

| Data Layer | Official Source and Download Locations | Data Vintage | Primary Join Key | Coverage Limits and Parsing Rules |
| :---- | :---- | :---- | :---- | :---- |
| 10-Year Job Projections and Entry Requirements | BLS Employment Projections Table 1.2 (https\://www\.bls.gov/emp/ind-occ-matrix/occupation.xlsx); Table 1.4 (https\://www\.bls.gov/emp/tables/occupations-most-job-growth.htm); Table 1.10 Separations (https\://www\.bls.gov/emp/tables/occupational-separations-and-openings.htm)6 | 2025–2035 (Updated Aug 27, 2026\)6 | 6-digit 2018 SOC (National Employment Matrix code)1 | Filter strictly to Occupation type \== "Line item" and exclude Summary rows to prevent double-counting1. |
| National, State, and Metro Wages | BLS May 2025 OEWS ZIPs: National (https\://www\.bls.gov/oes/special-requests/oesm25nat.zip), State (https\://www\.bls.gov/oes/special-requests/oesm25st.zip), Metro/Nonmetro (https\://www\.bls.gov/oes/special-requests/oesm25ma.zip), All (https\://www\.bls.gov/oes/special-requests/oesm25all.zip)5 | May 2025 (Released May 15, 2026\)5 | 6-digit 2018 SOC \+ State or MSA/Nonmetro area1 | Covers \~830 occupations across \~530 MSAs/nonmetro areas; excludes military (SOC 55), private households, most agriculture, and self-employed workers; 10th/25th percentiles proxy entry wages; local cells may be suppressed1. |
| AI Exposure Categories | BLS AI Exposure Workbook (https\://www\.bls.gov/emp/ind-occ-matrix/ai-exposure-categories.xlsx)8 | Updated Aug 27, 20268 | 6-digit 2018 SOC1 | Sorts 831 occupations into Low, Moderate, High, and Very high; 211 of 4,155 source cells imputed across 75 jobs; theoretical inputs reflect mid-2023 text-LLM limits and most inputs omit image/video AI1. |
| Occupational Tasks, Interests, and Skills | O\*NET 31.0 Tabular ZIP (https\://www\.onetcenter.org/dl\_files/database/db\_31\_0\_excel.zip); MySQL/SQL Server ZIPs (db\_31\_0\_mysql.zip, db\_31\_0\_mssql.zip)3 | Release 31.0 (Site updated Oct 6, 2026\)3 | 8-digit O\*NET-SOC 2019 (truncate to 6-digit SOC)1 | \~18,800 task rows split into Core (relevance \>=67%, importance \>=3.0) and Supplemental; includes RIASEC Career Interest Types, 41 Basic Interests across 891 roles, and 176 Hot Technologies; CC BY 4.0 credit required1. |
| College Net Price, Debt, and Program Earnings | College Scorecard Institution ZIP (https\://ed-public-download.scorecard.network/downloads/Most-Recent-Cohorts-Institution\_11022026.zip, 24 MB); Field of Study ZIP (https\://ed-public-download.scorecard.network/downloads/Most-Recent-Cohorts-Field-of-Study\_10152026.zip, 34 MB); NCES Crosswalk (https\://nces.ed.gov/ipeds/cipcode/Files/CIP2020\_SOC2018\_Crosswalk.xlsx)1 | Updated Nov 2, 2026 (Field of Study file Oct 15, 2026\)4 | Institution UNITID/OPEID \+ 2020 CIP to 2018 SOC1 | Covers \~6,000+ Title IV schools across 5 income brackets (npt41–npt45); Field of Study aggregates at 4-digit CIP \+ credential level; small programs often return PrivacySuppressed; excludes non-Title IV programs1. |
| Registered Apprenticeships and Short-Term Training | DOL RAPIDS Public Use File (via DOL Office of Apprenticeship / https\://www\.apprenticeship.gov/) and TrainingProviderResults.gov (WIOA ETPPR)1 | Quarterly / Periodic (no PII)1 | Occupation title / Sponsor geography / State ETP1 | Disaggregated RAPIDS records exist for 25 federally administered states and 16 State Apprenticeship Agencies (SAAs); remaining SAAs and military USMAP report aggregate counts only, requiring title-to-SOC matching1. |
| ZIP-to-Metro Geography Bridge | HUD-USPS ZIP-CBSA Crosswalk (https\://www\.huduser.gov/portal/datasets/usps\_crosswalk.html and https\://www\.huduser.gov/hudapi/public/usps?type=1\&query=All)1 | Quarterly (Free account \+ Bearer token)1 | 5-digit ZIP to 5-digit CBSA (99999 \= non-CBSA)1 | Strictly directional (ZIP-to-CBSA differs from CBSA-to-ZIP); split ZIPs require tot\_ratio or res\_ratio ranking; OEWS nonmetro areas use state-specific boundaries1. |

To generate the Top 100 U.S. Professions dataset cleanly from these downloads, ingest occupation.xlsx (BLS Table 1.2), filter strictly to Occupation type \== "Line item", and sort descending either by Employment, 2025 (for the 100 largest U.S. occupations by total headcount) or by Employment change, numeric, 2025–35 (for the 100 occupations adding the most new positions)1. Extracting those top 100 six-digit SOC codes first and inner-joining them against oesm25nat.zip, ai-exposure-categories.xlsx, Table 1.10 (Occupational separations and openings), and O\*NET 31.0's Task Statements, Career Interest Types, Basic Interests, and Education, Training, and Experience tables keeps your packaged dataset small and eliminates summary rollups such as 11-2000 or 13-1000 that would double-count employment1.  
While rows 31–100 must be pulled locally from occupation.xlsx and oesm25nat.zip using that Line item filter5, BLS Table 1.4 provides the complete, verified top 30 U.S. occupations ranked by projected numeric job growth from 2025 to 2035 (against a U.S. total of 170,280.8 thousand jobs in 2025, projected to rise by 5,917.6 thousand or 3.5% to 176,198.5 thousand in 2035 at a \$50,980 overall median annual wage)6. Spanning healthcare, skilled trades, logistics, software, food service, and management, these 30 verified roles give your beta team an immediate starting roster2.

| Rank | 2018 SOC Code | Occupation Title | 2025 Employment (Thousands) | 2035 Projected Employment (Thousands) | 2025–35 Numeric Growth (Thousands) | 2025–35 Growth (%) | 2025 Median Annual Wage |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| 1 | 31-1120 | Home health and personal care aides | 4,677.1 | 5,524.4 | 847.3 | 18.1% | \$35,800 |
| 2 | 53-7065 | Stockers and order fillers | 2,804.3 | 3,055.0 | 250.7 | 8.9% | \$37,330 |
| 3 | 35-3023 | Fast food and counter workers | 3,855.9 | 4,079.1 | 223.3 | 5.8% | \$31,200 |
| 4 | 29-1141 | Registered nurses | 3,465.4 | 3,660.1 | 194.7 | 5.6% | \$97,550 |
| 5 | 11-1021 | General and operations managers | 3,599.0 | 3,780.3 | 181.3 | 5.0% | \$105,770 |
| 6 | 15-1252 | Software developers | 1,717.8 | 1,892.6 | 174.7 | 10.2% | \$135,980 |
| 7 | 35-2014 | Cooks, restaurant | 1,417.5 | 1,588.8 | 171.4 | 12.1% | \$37,390 |
| 8 | 11-9111 | Medical and health services managers | 640.4 | 795.5 | 155.1 | 24.2% | \$123,860 |
| 9 | 29-1171 | Nurse practitioners | 336.3 | 474.1 | 137.8 | 41.0% | \$132,300 |
| 10 | 47-2061 | Construction laborers | 1,489.3 | 1,598.6 | 109.3 | 7.3% | \$47,120 |
| 11 | 13-1111 | Management analysts | 1,077.1 | 1,186.3 | 109.2 | 10.1% | \$101,860 |
| 12 | 11-3021 | Computer and information systems managers | 685.8 | 793.9 | 108.1 | 15.8% | \$175,140 |
| 13 | 31-9092 | Medical assistants | 833.9 | 941.5 | 107.6 | 12.9% | \$45,690 |
| 14 | 21-1018 | Substance abuse, behavioral disorder, and mental health counselors | 533.4 | 631.4 | 98.0 | 18.4% | \$59,350 |
| 15 | 15-2051 | Data scientists | 275.6 | 371.0 | 95.4 | 34.6% | \$120,230 |
| 16 | 11-3031 | Financial managers | 879.7 | 964.6 | 84.9 | 9.7% | \$166,570 |
| 17 | 53-3032 | Heavy and tractor-trailer truck drivers | 2,221.2 | 2,305.0 | 83.8 | 3.8% | \$58,640 |
| 18 | 49-9041 | Industrial machinery mechanics | 446.9 | 526.6 | 79.7 | 17.8% | \$64,520 |
| 19 | 13-2011 | Accountants and auditors | 1,595.2 | 1,674.6 | 79.4 | 5.0% | \$83,680 |
| 20 | 47-2111 | Electricians | 821.0 | 896.9 | 75.9 | 9.2% | \$63,190 |
| 21 | 13-1082 | Project management specialists | 1,094.3 | 1,167.4 | 73.2 | 6.7% | \$102,320 |
| 22 | 49-9071 | Maintenance and repair workers, general | 1,621.8 | 1,690.5 | 68.6 | 4.2% | \$49,590 |
| 23 | 53-3033 | Light truck drivers | 1,068.5 | 1,136.4 | 67.8 | 6.3% | \$44,860 |
| 24 | 35-1012 | First-line supervisors of food preparation and serving workers | 1,236.4 | 1,303.5 | 67.1 | 5.4% | \$44,080 |
| 25 | 13-1161 | Market research analysts and marketing specialists | 952.7 | 1,019.0 | 66.3 | 7.0% | \$78,760 |
| 26 | 11-9199 | Managers, all other | 1,338.8 | 1,404.4 | 65.6 | 4.9% | \$141,900 |
| 27 | 13-1071 | Human resources specialists | 939.7 | 999.7 | 60.1 | 6.4% | \$75,940 |
| 28 | 37-3011 | Landscaping and groundskeeping workers | 1,188.6 | 1,244.2 | 55.6 | 4.7% | \$39,150 |
| 29 | 11-9021 | Construction managers | 609.1 | 664.3 | 55.2 | 9.1% | \$114,990 |
| 30 | 37-2011 | Janitors and cleaners, except maids and housekeeping cleaners | 2,432.6 | 2,486.2 | 53.6 | 2.2% | \$36,840 |

Source: U.S. Bureau of Labor Statistics Table 1.4 (2025 employment, 2035 projections, and May 2025 OEWS median annual wages for non-farm wage and salary workers, excluding self-employed, unincorporated owners/partners, and household workers)6.

## **Crosswalk Rules, Non-Degree Pathways, and O\*NET Licensing**

Joining labor market files with higher-education records without normalization creates systematic matching errors because federal agencies maintain mismatched classification granularities1. Three crosswalk rules should be baked directly into your ingestion pipeline before your web team builds career cards1.  
First, O*NET 31.0 tracks specialized roles at the 8-digit O*NET-SOC level—such as 15-1299.07 (Blockchain Engineers) and 29-1129.01 (Art Therapists)—whereas BLS projections, May 2025 OEWS wages, and AI exposure categories operate at the 6-digit 2018 SOC level1. Your schema must preserve the 8-digit O\*NET code as the key for daily task lists, RIASEC interest profiles, and Basic Interests while rolling up to the 6-digit parent SOC for salary percentiles and 10-year job projections1. Whenever an 8-digit niche role displays 6-digit parent wages, the UI should label explicitly that salary statistics reflect the broader parent occupational group1.  
Second, joining occupational codes to college programs requires resolving both granularity differences and experience barriers1. The joint NCES/BLS CIP2020\_SOC2018\_Crosswalk.xlsx is many-to-many at the 6-digit CIP level, contains separate Unmatched CIP Codes and Unmatched SOC Codes tabs, and links senior management roles such as Computer and Information Systems Managers (11-3021) back to undergraduate Computer Science (11.0701) alongside business programs1. Meanwhile, College Scorecard's Field of Study dataset reports cumulative debt and 1-year post-graduation earnings at the credential level and 4-digit CIP code combination (while College Scorecard also publishes technical errata regarding cohort alignment and earlier undergraduate/graduate earnings overlap)4. Your ETL script should therefore truncate 6-digit CIP codes from the NCES crosswalk to 4 digits when joining Field-of-Study outcomes and filter every CIP-to-SOC candidate through BLS Table 1.2's Typical education needed for entry and Work experience in a related occupation columns (which flag roles requiring 5 years or more of prior work experience) so high schoolers exploring entry-level trades or technology paths are not routed into mid-career management tracks1. In parallel, ingesting DOL RAPIDS and TrainingProviderResults.gov (ETPPR) records—following the deduplication approach documented by Harvard's Project on Workforce—ensures that careers such as electricians (47-2111) or industrial machinery mechanics (49-9041) surface paid registered apprenticeships and WIOA-eligible training providers alongside Title IV colleges1.  
Third, geographic resolution and intellectual property attribution must be handled rigorously1. When converting a student's 5-digit ZIP code via HUD-USPS ZIP-CBSA, single ZIP codes frequently span multiple Core Based Statistical Areas (while 99999 denotes non-CBSA areas)1. Rank multi-CBSA ZIPs using tot\_ratio (total address share) or res\_ratio (residential address share) to select the primary metro area, and account for state-specific OEWS nonmetro groupings1. Legally, O*NET 31.0's Creative Commons Attribution 4.0 (CC BY 4.0) license requires PathwayAI to credit the exact database version (O\*NET 31.0 Database) and USDOL/ETA, link to the CC BY 4.0 license, disclose whether task or interest text was modified, and use O\*NET® strictly as an adjective (such as "O*NET data"), never as a noun or verb1.

## **Backend Architecture, Static JSON vs. Live APIs, and Git Security**

Addressing Team 7's first two technical questions from Section 8 of your outline—where to strike the balance between hardcoded JSON and live APIs, and how to coordinate on GitHub safely—favors an offline ETL pipeline feeding static server-side JSON for the beta and a server-side database at national scale, rather than live per-session queries to government APIs1.  
Executing live federal API requests while a teenager waits for career cards adds latency and rate-limit risk with no freshness advantage1. As documented in your requirements blueprint, the BLS Public Data API v2 caps registered keys at 500 daily queries, 50 series per request, and 50 requests per 10 seconds, requires annual renewal, and lacks a series-ID discovery catalog—forcing your backend to assemble complex multi-part OEWS series identifiers for every metro lookup1. ONET Web Services v2 (https\://api-v2.onetcenter.org/) improves substantially over v1.9 with X-API-Key header authentication, JSON-only payloads, OpenAPI specifications, prev/next pagination, and mnm/ (My Next Move) and mpp/ (Mi Próximo Paso) endpoints, yet operates on a rate-limited, best-effort basis1. College Scorecard's REST API (https\://api.data.gov/ed/collegescorecard/v1/schools) natively supports geographic zip and distance filtering17, which can be useful later for dynamic radius search, but because BLS projections, OEWS wages, and Scorecard update annually and ONET updates quarterly, pre-joining static reference statistics eliminates external downtime during your Class 9 demonstration1.  
To keep the beta simple while preserving a seamless upgrade path to the full 370+ MB national dataset, Sophie and Sean should implement a Repository / Data-Adapter pattern behind four clean entity schemas: Occupation, AreaWages, InstitutionProgram, and ZipToCbsa1. During beta, an offline build script exports your 25–30 pilot occupations and 15–20 regional/flagship schools into three compact lookup files (occupations.json, institutions.json, zip\_cbsa.json)1. At national scale, the same adapter interface reads from a server-side database refreshed quarterly/annually—optionally checking O\*NET v2 Database Services for new releases—without altering frontend components or matching logic1. Inside AreaWages, enforce a deterministic geographic fallback chain (Metro MSA OEWS \-\> State OEWS \-\> National OEWS) and attach a wage\_geography\_scope indicator whenever local confidentiality suppresses metro figures1.  
Securing API keys across a six-person team requires keeping all external credentials off client browsers1. Never invoke Gemini, BLS, O\*NET, HUD, or College Scorecard endpoints from frontend JavaScript; route all requests through server-side backend routes reading environment variables1. Commit a blank .env.example template (GEMINI\_API\_KEY=, ONET\_API\_KEY=, BLS\_API\_KEY=, HUD\_BEARER\_TOKEN=, plus a Data.gov key if querying College Scorecard REST endpoints1), add .env\* to .gitignore, enable GitHub secret scanning, and protect main with required pull-request reviews1.

## **Deterministic Financial Math and Nuanced AI-Impact Modeling**

Resolving Team 7's third and fourth open questions—where quantitative "intelligence" lives and how to handle contradictory or off-topic student queries—depends on drawing a hard boundary between deterministic backend arithmetic and generative AI language processing1. Every wage percentile, net tuition number, payback figure, and employment growth rate should be computed deterministically in code or pre-calculated tables, never generated by Gemini on the fly1.

### **Deterministic ROI Engine and Missing-Data Rules**

To calculate educational affordability accurately across income tiers, implement deterministic formulas modeled on Third Way's Price-to-Earnings Premium (PEP) and Georgetown University Center on Education and the Workforce (CEW) ROI benchmarks1. Join College Scorecard's five family-income net price columns (npt41\_pub–npt45\_pub for public schools and npt41\_priv–npt45\_priv for private schools) with Field-of-Study debt and 1-year post-graduation earnings, paired against BLS OEWS 10th/25th percentile entry proxies and median wages1.  
Your ROI module must enforce two explicit data-cleaning rules for College Scorecard quirks1. First, when federal Pell Grants and institutional aid exceed tuition and living expenses for lower-income students, average net price—and therefore PEP—turns negative1. Rather than displaying a confusing negative ROI value, map any net price at or below zero to a clear status label such as "Net grant surplus / zero net tuition barrier"1. Second, smaller college programs frequently mask debt or earnings cells with "PrivacySuppressed"1. Convert "PrivacySuppressed" strictly to null (never 0\) during ETL ingestion, disable major-specific payback calculations for that cell, and fall back to institution-wide earnings or national BLS entry-wage proxies with a visible badge1.

### **Two-Stage Gemini Pipeline and Edge-Case Handling**

To map plain-English student goals without fabricating statistics or collapsing on impossible inputs, structure your LLM orchestration into two controlled stages1:

> 1. **Stage 1 (Semantic Intent Extraction):** Call Gemini with responseMimeType: "application/json" and a strict responseSchema to convert free-text student prompts into structured query filters: inferred O\*NET RIASEC / Basic Interest tags, maximum preferred education duration, work-context preferences, optional 5-digit ZIP code, and two boolean flags (is\_career\_query and has\_constraint\_conflict)1. Because Gemini developer forum threads document structured-output edge cases—including uppercase type names (OBJECT, STRING) in raw REST payloads, documentation inconsistencies between responseSchema and responseJsonSchema, and occasional synonym drift on field names—always validate Gemini's JSON server-side (such as with Pydantic or Zod) before executing backend queries1.  
> 2. **Stage 2 (Deterministic Retrieval and Grounded Summaries):** When is\_career\_query is false, return a conversational nudge back toward career exploration without querying occupation records1. When has\_constraint\_conflict is true—such as "I want to be a surgeon with zero years of school"—deterministic filtering against BLS Typical education needed for entry surfaces the actual doctoral/residency path for surgeons alongside zero-to-two-year healthcare alternatives from your dataset, such as medical equipment preparers (31-9093), medical assistants (31-9092), or phlebotomists (31-9097)1. For valid queries, select three contrasting roles deterministically—one direct interest match, one high-ROI registered apprenticeship or two-year credential path, and one "Adjacent Discovery" role sharing O\*NET Work Activities or Basic Interests that teenagers rarely encounter (such as urban planning or behavioral economics)—and pass strictly those verified JSON records back to Gemini to generate jargon-free summaries citing exact retrieved statistics1.

### **Nuanced AI Impact: Reconciling BLS Exposure with 2026 Payroll Evidence**

Section 6 of your outline warns against two opposite failure modes: recommending entry-level coding solely on historical pay without flagging AI disruption, or scaring students out of fields like journalism by conflating text summarization with whole-job automation1. Empirical research through September 2026 demonstrates why PathwayAI should avoid inventing a synthetic LLM-generated "AI resilience score" and instead display three complementary, grounded signals1.  
BLS's four relative AI exposure categories (Low, Moderate, High, Very high), updated August 27, 2026, synthesize three theoretical studies (Felten, Raj, and Seamans; Eloundou et al.; Eisfeldt et al.) with two observed usage datasets (Anthropic Claude traffic and Microsoft Copilot work activities) across 831 occupations8. However, BLS cautions explicitly that these tiers are relative rankings rather than job-growth forecasts, wage forecasts, or adoption estimates, and do not distinguish automation from augmentation8. Consistent with that caveat, a September 2026 BLS working paper by Zoltan Wolfe (summarized in your requirements blueprint) found that occupational exposure explains only a modest share of firm-level AI adoption—a one-standard-deviation rise in exposure corresponds to a 4–11 percentage point higher adoption probability, narrowing to 1–8 percentage points after controlling for industry and year1. Similarly, an independent comparison by Opportunity Data measuring BLS categories against April 2026 frontier AI capabilities found a 0.76 rank correlation overall but identified 106 divergent occupations employing 37.9 million workers—concentrated in nursing, medicine, teaching, counseling, clergy, and front-line service—where heavy AI tool adoption coexists with strong human-contact protection against replacement9.  
At the same time, an August 2026 update from the Stanford Digital Economy Lab (*Canaries in the Coal Mine?*, analyzing ADP payroll data through June 2026, as cited in your requirements blueprint) identifies a sharp age divergence beneath steady headline employment: workers aged 22–25 in AI-exposed occupations sit 19% below the trajectory of less-exposed peers—with software developers aged 22–25 down more than 20% since late 2022 in a January 2026 release—whereas workers aged 35–40 grew by up to 11% with no comparable exposure gap1. While the Stanford researchers emphasize these patterns are early, descriptive indicators rather than causal proof, hiring slowdowns cluster where AI substitutes for routine, checkable entry-level duties1.  
To reflect both realities accurately on every PathwayAI career card, pair these three grounded indicators:

> 1. **BLS AI Exposure Tier Alongside 2025–35 Job Growth:** Display the official Low to Very high category directly next to BLS's 10-year numeric and percentage growth forecast so students see where heavy AI usage aligns with continued demand—such as software developers (15-1252), which carry "Very high" relative exposure yet are projected to add 174,700 jobs (+10.2%) through 20351.  
> 2. **Early-Career Hiring Caution Flag:** Surface an informational caution on high-exposure white-collar roles noting tighter junior hiring competition on routine tasks, encouraging students to build portfolios, internships, and human-judgment competencies1.  
> 3. **O\*NET Verified Task Classification:** Pass strictly the occupation's Core and Supplemental rows from O\*NET Task Statements into Gemini to categorize each concrete duty as Automated, Augmented (AI Copilot), or Human-Centric, showing students where AI serves as a tool versus where human ethics, physical presence, or investigative judgment remain central1.

## **Minor Privacy, Anti-Bias Controls, and Team 7 Execution Checklist**

Because PathwayAI serves high school sophomores, juniors, and seniors, Team 7's fifth open question—preventing demographic steering and clarifying advisory boundaries—carries strict technical and legal obligations1. Your scoping outline notes that public high school counselors average 372 students each and only 40% of high schoolers discuss starting salaries before taking on education costs, making accessible guidance urgent while keeping human counselors central2.  
First, enforce privacy in your infrastructure rather than disclaimers alone1. Prompts sent via the Gemini Developer API Free Tier are marked in Google's pricing terms as used to improve products, making Free Tier keys incompatible with your non-training commitment1. Activate billing on a Paid Tier Gemini project for the Class 9 beta (where prompts are not used for product improvement), and migrate to Vertex AI on Google Cloud for self-serve Zero Data Retention (ZDR)—noting that strict ZDR disables Search/Maps grounding, the File API, explicit cached\_content, Live API sessions, and stateful Interactions (store=true)—before any school district pilot1. Keep v1 completely stateless and account-free, collecting no student names, emails, GPAs, demographics, or persistent cookies and storing active selections solely in ephemeral browser memory1. This stateless architecture aligns cleanly with the FTC's amended Children's Online Privacy Protection Rule (COPPA, compliance deadline April 22, 2026\) regarding third-party software on general-audience sites that might reach under-13 users, as well as active state-level FERPA oversight in school settings1.  
Second, prevent socioeconomic or demographic steering by isolating inputs and embedding four mandatory visual guardrails in the interface1. Never pass race, gender, or household income into the Stage 1 occupation-matching prompt1. Apply family income tier exclusively inside the deterministic post-match College Scorecard net-price lookup so lower-income teenagers see grant-adjusted affordability rather than being steered away from high-earning careers1. Neutral O\*NET task matching also avoids reinforcing existing workforce skews, such as the 43.8% and 21.2% shares of women versus 32.4% and 18.1% of men working in the top two AI-exposure tiers reported in Stanford's *Canaries* data1. Render these four safeguards on every comparison screen1:

> 1. **Data Vintage and Attribution Banner:** Display "Sources: BLS OEWS May 2025 \| BLS Projections 2025–35 \| O\*NET 31.0 (CC BY 4.0) \| College Scorecard" alongside full O\*NET 31.0 Database / USDOL/ETA license credit on every results view1.  
> 2. **Explicit Missing-Data States:** Show "Program earnings withheld (PrivacySuppressed)" or "Statewide/National wage proxy shown" whenever local or major-specific federal statistics are suppressed1.  
> 3. **Compulsory Breadth in the 3-Card Layout:** Reserve at least one of the three side-by-side cards for an adjacent discovery role or registered apprenticeship / two-year pathway to prevent hobby echo chambers1.  
> 4. **Printable Counselor Discussion Guide:** Provide a one-page export summarizing shortlisted occupations, income-tier net tuition comparisons, and high school elective questions framed explicitly as preparation for a human counselor or family discussion1.

To coordinate Team 7's roles cleanly toward the Class 9 checkpoint, execute the build across five sequential milestones1:

> 1. **Curate and Crosswalk the Beta and Top 100 Dataset (Avis, Jack):** Download the bulk files in the source manifest, filter BLS Table 1.2 to Line item rows to extract the Top 100 U.S. professions and your 25–30 beta occupations (seeding from Table 1.4 alongside 15–20 local/flagship schools and DOL RAPIDS sponsors in one pilot metro area), parse "PrivacySuppressed" as null, and export validated occupations.json, institutions.json, and zip\_cbsa.json1.  
> 2. **Build the Deterministic Lookup and ROI Engine (Sophie, Sean):** Implement the Occupation, AreaWages, InstitutionProgram, and ZipToCbsa data adapters, HUD tot\_ratio ZIP-to-CBSA matching, MSA \-\> State \-\> National wage fallback chain, BLS education/experience filters on 4-digit/6-digit CIP-to-SOC links, and deterministic income-tier net price and grant-surplus calculations1.  
> 3. **Wire Privacy-Safe Gemini Orchestration (Sophie, Sean):** Route stateless Gemini requests through server-side API endpoints using a gitignored Paid Tier key in .env, add Pydantic or Zod validation around Stage 1 JSON outputs, implement is\_career\_query and has\_constraint\_conflict routing, and ground Stage 2 task classifications strictly in O\*NET Task Statements1.  
> 4. **Build the 3-Card Comparison Dashboard and Guardrails (Maylene, Jack, Sophie, Sean):** Render three contrasting career cards side by side, display the three-part AI impact breakdown (BLS tier \+ 10-year growth, early-career caution, O\*NET task split), add vintage/attribution banners and suppression badges, and generate the printable counselor guide1.  
> 5. **Execute Adversarial, Edge-Case, and Bias Testing (Kamya, Maylene):** Validate the beta against your fictional student profiles—testing identical interest prompts across varying ZIP codes and household income brackets to confirm zero career-tier steering—and verify deterministic fallbacks on off-topic prompts and contradictory constraints ("surgeon, zero years of school") before Class 91.

#### **Works cited**

> 1. PathwayAI Website Development Requirements.docx  
> 2. Assignment \#2(A) \- AI Approach Scoping Outline.docx  
> 3. [https\://www\.onetcenter.org/database.html](https://www.onetcenter.org/database.html)  
> 4. Data Home \- College Scorecard \- Department of Education, [https\://collegescorecard.ed.gov/data/](https://collegescorecard.ed.gov/data/)  
> 5. Occupational Employment and Wage Statistics (OEWS) Tables, [https\://www\.bls.gov/oes/tables.htm](https://www.bls.gov/oes/tables.htm)  
> 6. Occupations with the most job growth \- Bureau of Labor Statistics, [https\://www\.bls.gov/emp/tables/occupations-most-job-growth.htm](https://www.bls.gov/emp/tables/occupations-most-job-growth.htm)  
> 7. Occupational projections and worker characteristics, [https\://www\.bls.gov/emp/tables/occupational-projections-and-characteristics.htm](https://www.bls.gov/emp/tables/occupational-projections-and-characteristics.htm)  
> 8. Artificial Intelligence (AI) exposure categories, [https\://www\.bls.gov/emp/publications/ai-exposure-categories.htm](https://www.bls.gov/emp/publications/ai-exposure-categories.htm)  
> 9. AI Exposure Index vs. BLS AI Exposure Categories \- Opportunity Data, [https\://opportunitydata.org/ai-exposure-bls-comparison.html](https://opportunitydata.org/ai-exposure-bls-comparison.html)  
> 10. Occupational separations and openings \- Bureau of Labor Statistics, [https\://www\.bls.gov/emp/tables/occupational-separations-and-openings.htm](https://www.bls.gov/emp/tables/occupational-separations-and-openings.htm)  
> 11. Confirming filtering variables \#1863 \- college-scorecard \- GitHub, [https\://github.com/RTICWDT/college-scorecard/issues/1863](https://github.com/RTICWDT/college-scorecard/issues/1863)  
> 12. Methodology \- Workforce Almanac, [https\://workforcealmanac.com/methodology](https://workforcealmanac.com/methodology)  
> 13. Opportunities to Understand the Skilled Technical Workforce (STW, [https\://ncses.nsf.gov/299/assets/0/files/stw\_administrativedata\_repository\_2.pdf](https://ncses.nsf.gov/299/assets/0/files/stw_administrativedata_repository_2.pdf)  
> 14. USPS ZIP Code Crosswalk Files \- HUD User, [https\://www\.huduser.gov/portal/datasets/usps\_crosswalk.html](https://www.huduser.gov/portal/datasets/usps_crosswalk.html)  
> 15. USPS ZIP Code Crosswalk API \- HUD User, [https\://www\.huduser.gov/portal/dataset/uspszip-api.html](https://www.huduser.gov/portal/dataset/uspszip-api.html)  
> 16. Data Documentation \- College Scorecard \- Department of Education, [https\://collegescorecard.ed.gov/data/data-documentation/](https://collegescorecard.ed.gov/data/data-documentation/)  
> 17. API Documentation \| College Scorecard \- Department of Education, [https\://collegescorecard.ed.gov/data/api-documentation/](https://collegescorecard.ed.gov/data/api-documentation/)  
> 18. Education level, 2025–35 projected openings, and super, [https\://www\.bls.gov/careeroutlook/2026/article/education-level-and-openings-2025-35.htm](https://www.bls.gov/careeroutlook/2026/article/education-level-and-openings-2025-35.htm)

> 

# **Addendum A: Coverage Gaps, Added Data Layers, and Validation Requirements**

The preceding blueprint specifies a sound offline-ETL and deterministic-math architecture, but it concentrates on pipeline mechanics, privacy, and a single wage-and-tuition view of each career. This addendum extends the seven-layer design in five areas where a high school student's decision would otherwise rest on incomplete evidence: whether students finish a program and what they earn over time, what a salary buys in a given place, who actually gets in and can afford a program, which pathways exist outside Title IV colleges, and whether the tool itself works as intended.

Every source, field name, and vintage below should be confirmed against the publisher's current documentation during the same download step as the original manifest, because release schedules and column names change. Quotas, thresholds, and owners are proposals for Team 7 to approve, not findings from the cited sources.

## **Five Priority Changes**

1\.     **Completion-adjusted ROI:** Add completion, retention, default, and repayment fields plus long-horizon earnings so payback is not computed as if every entrant graduates.

2\.     **Cost-of-living adjustment:** Pair every wage with a regional price parity and a local rent benchmark so metro comparisons reflect purchasing power rather than nominal pay.

3\.     **Diversity-based beta roster:** Select the 25–30 pilot occupations with stratified quotas using annual openings, entry education, wage level, and pathway type, rather than by numeric job growth alone.

4\.     **Richer matching inputs:** Use the O\*NET Work Values, Work Context, Work Styles, and Job Zone tables already inside the O\*NET 31.0 download, so matching reflects how a job feels day to day and not only a RIASEC interest code.3

5\.     **Validation plan:** Define accuracy, usability, bias, and counselor-review tests with pass criteria before Class 9\.

## **Additional Data Layers for the Source Manifest**

The table below uses the same columns as the original seven-layer manifest. Layers marked “already in the manifest” need no new download and only add parsing rules.

| Data Layer | Official Source and Download Locations | Data Vintage | Primary Join Key | Coverage Limits and Parsing Rules |
| :---- | :---- | :---- | :---- | :---- |
| Long-Horizon Earnings, Completion, and Repayment | College Scorecard Institution ZIP already in the manifest (completion, retention, cohort default, repayment, and 6- and 10-year earnings columns);4 Census Post-Secondary Employment Outcomes, PSEO (https\://lehd.ces.census.gov/data/)19 | Scorecard per manifest (Nov 2, 2026); PSEO: confirm release | UNITID/OPEID \+ 4-digit CIP \+ credential level | Check the Scorecard data dictionary for completion (C150\_4, C150\_L4), retention (RET\_FT4), default (CDR3), and repayment (RPY\_3YR\_RT) names before coding. PSEO reports earnings roughly 1, 5, and 10 years after graduation but only for participating institutions and states; parse missing as null with an “earnings trajectory unavailable” badge, never 0\. |
| Regional Cost of Living | BEA Regional Price Parities for states and metro areas (https\://www\.bea.gov/data/prices-inflation/regional-price-parities-state-and-metro-area);20 HUD Fair Market Rents (https\://www\.huduser.gov/portal/datasets/fmr.html);21 MIT Living Wage Calculator (https\://livingwage.mit.edu/)22 | Annual; confirm latest year | CBSA code (metro), state FIPS, county FIPS (FMR) | Real wage \= nominal wage × 100 / RPP (index 100 \= U.S. average). Map the HUD ZIP-to-CBSA result to the BEA metro code and fall back to state, then national. FMR is a rent benchmark, not average rent. Living wage figures are modeled estimates and should be labeled as such. |
| Admission and Aid Access | College Scorecard admission rate and SAT/ACT range columns;4 Federal Student Aid Pell and FAFSA information (https\://studentaid.gov/);30 state free-college and dual-enrollment programs (manual curation from state agency sites) | Scorecard: Nov 2, 2026; aid rules: confirm award year; state programs: manual | UNITID; state FIPS | Admission values may be null for open-admission schools. No national file covers state promise programs or dual enrollment, so curate them by hand for the pilot state only and label each entry with its source and date. |
| Licensing and Non-Degree Pathways | CareerOneStop licensed occupations, certification, and training finders plus web API (https\://www\.careeronestop.org/);23 DOL RAPIDS and ETPPR already in the manifest1 | Confirm at download; API requires registration | O\*NET-SOC code; state | Adds exam, license, and certificate-program information to cards for trades and healthcare roles. Join at the 8-digit O\*NET-SOC and roll up to the 6-digit SOC for display. Show “varies by state” exactly as published rather than inferring a requirement. |
| Work Values, Work Styles, Work Context, and Job Zones | O\*NET 31.0 Tabular ZIP already in the manifest (no new download)3 | Release 31.0 | 8-digit O\*NET-SOC | Use as additional Stage 1 filter targets. Job Zone gives a standardized preparation level. Keep scale values as published and document any normalization in the ETL script. |
| Job Quality | BLS Survey of Occupational Injuries and Illnesses (https\://www\.bls.gov/iif/);24 BLS National Compensation Survey benefits (https\://www\.bls.gov/ncs/);25 OEWS 90th percentile wage from files already in the manifest5 | Confirm annual release | SOC (detail varies by table); NAICS where occupation detail is unavailable | Injury and benefits tables are published at varying detail, often broad occupation or industry groups, so show them with a group-level label rather than assigning them to one 6-digit occupation. Show the 90th percentile beside the 10th and 25th so students see the ceiling as well as the entry wage. |
| Local Demand | Projections Central state and local long-term projections (https\://projectionscentral.org/);26 optional job-postings data | Confirm projection cycle | 6-digit SOC \+ state or substate area | State cycles and base years may differ from the national 2025–35 table, so display the cycle years on each card. Do not load postings data without checking its license. |
| Self-Employed and Age-Specific Earnings | Census American Community Survey PUMS (https\://www\.census.gov/programs-surveys/acs/microdata.html)27 | Annual; confirm release | Census occupation code (crosswalk to SOC) | OEWS excludes self-employed workers, so use ACS as a labeled supplementary range for trades, creative, and small-business careers. Use the supplied survey weights and suppress small cells. |
| Task-Level AI Usage | Anthropic Economic Index (https\://www\.anthropic.com/economic-index)28 | Confirm latest release and license | O\*NET task or occupation label (verify mapping) | Use as a secondary check on the Automated/Augmented/Human task classification, not a replacement for BLS tiers. Confirm license and attribution terms before redistributing any data, and label it as reflecting one AI provider's usage. |

 

Each new layer should enter as an optional adapter behind the existing Occupation, AreaWages, and InstitutionProgram entities so frontend components and matching logic do not change.1 Add data\_vintage and source\_url fields to every new column so the attribution banner can render them automatically.

## **Revised Beta Roster Selection**

BLS Table 1.4 ranks occupations by numeric job growth, which favors large, low-wage roles: in the verified top 30, home health aides, fast food workers, stockers, and cooks hold four of the first seven places, while smaller fast-growing roles such as nurse practitioners (41.0%) and data scientists (34.6%) rank 9th and 15th by count.6 A pilot meant to show students contrasting paths should instead be assembled from the full Top 100 file using Table 1.10 annual openings10 and the stratified quotas below, filled from the verified roster wherever a role fits.

| Stratum | Proposed Minimum | Example Roles from the Verified Top 30 (confirm entry education in Table 1.2) | Purpose |
| :---- | :---- | :---- | :---- |
| No formal credential or high school diploma | 5 | Construction laborers (47-2061); Stockers and order fillers (53-7065); Industrial machinery mechanics (49-9041) | Show strong paths that do not require college |
| Postsecondary non-degree award or associate degree | 5 | Medical assistants (31-9092); Heavy and tractor-trailer truck drivers (53-3032) | Surface short, lower-cost credentials |
| Bachelor's degree | 5 | Accountants and auditors (13-2011); Registered nurses (29-1141); Software developers (15-1252) | Represent the most common college route |
| Master's degree or higher | 2 | Nurse practitioners (29-1171) | Show longer, higher-cost paths honestly |
| Registered apprenticeship pathway (counts toward another stratum) | 3 | Electricians (47-2111); Industrial machinery mechanics (49-9041) | Test the apprenticeship and ETPPR adapters |
| Wage spread | 5 below and 5 above | Below the $50,980overallmedian:Fastfoodandcounterworkers($31,200). Above $100,000:Nursepractitioners($132,300) | Prevent a roster that only shows high or low pay |
| AI exposure spread | 3 in Low or Moderate; 3 in High or Very high | Software developers (15-1252) carry Very high exposure; assign others from the BLS workbook | Exercise every AI-impact display state |

 

Within each stratum, rank by annual openings, then keep at least one small, fast-growing role even if its openings are low, so the pilot does not reward size alone.

## **Upgrading the Deterministic ROI Engine**

### **Completion-Adjusted and Cost-of-Living-Adjusted Calculations**

These additions keep every figure in backend code or pre-calculated tables, consistent with the original rule that Gemini never generates a number. Each should be implemented as a documented function with unit tests.

1\.     **Completion-adjusted premium:** Compute earnings premium as program earnings minus a baseline (BLS median earnings for workers with a high school diploma),29 then multiply by the completion rate and display the adjusted and unadjusted figures together. This treats non-completers as gaining no premium, which is a conservative simplification the interface should state plainly.

2\.     **Cost-of-living adjustment:** Compute real wage as nominal wage × 100 / RPP using the metro value, falling back to state and then national, and reuse the wage\_geography\_scope indicator already defined for AreaWages.20

3\.     **Rent burden indicator:** Compare the HUD Fair Market Rent for a one-bedroom unit with monthly 10th/25th percentile wages and show the share as context, using the commonly cited 30%-of-income benchmark, not as personal advice.21

4\.     **Earnings horizons:** Show 1-year Field-of-Study earnings, Scorecard 6- and 10-year institution earnings, and PSEO 5- and 10-year earnings where available, labeling the horizon on each number and never blending horizons.4,19

5\.     **Risk badges:** Display a visible badge when a school's cohort default or repayment rate crosses a threshold the team selects and documents. Continue to treat PrivacySuppressed and missing cells as null.

6\.     **Aid realism:** Keep the income-tier net price lookup, but state that it is an average for aided students in that income band and not a personal quote, and link to the school's own net price calculator.4

## **Matching Beyond RIASEC Interests**

Students often reject careers because of how the work feels, not because of the subject. The original Stage 1 schema already lists work-context preferences; this addendum formalizes them by tying each field to a fixed O\*NET table so Gemini cannot invent categories.

1\.     **Work values:** Up to two of the six O\*NET Work Values (Achievement, Independence, Recognition, Relationships, Support, Working Conditions).3

2\.     **Work context:** Enumerated preferences such as indoor or outdoor setting, physical activity level, and public contact, each mapped to an O\*NET Work Context element.

3\.     **Preparation ceiling:** A maximum O\*NET Job Zone, which works alongside the existing maximum education duration field.

4\.     **Validation:** Define every field as an enumeration in the Pydantic or Zod schema and reject values outside the list. Continue to exclude race, gender, and household income from this stage.

## **Job Quality, Local Demand, and Excluded Workers**

A career card that shows only a median wage hides the range and the conditions around it. The display rules below use the layers added above.

1\.     **Wage range:** Show 10th, 25th, median, and 90th percentile wages from the national or metro OEWS file, keeping the existing suppression and fallback badges.5

2\.     **Local versus national demand:** Show state or local projections beside the national 2025–35 figure, with cycle years labeled, and prefer the local number when it exists.26

3\.     **Working conditions:** Show injury and benefit information only at the level BLS publishes it, with a group-level label.24,25

4\.     **Self-employed range:** For careers where self-employment is common, add an ACS-based earnings range labeled “includes self-employed workers.”27

## **Tightening the AI-Impact Signals**

The three-signal design is sound, but two parts depend on judgment that the plan does not yet define.

1\.     **Define the early-career caution rule:** Proposed rule: show the flag when the BLS exposure tier is High or Very high and typical entry education is a bachelor's degree or higher, driven by a reviewed lookup table rather than model output. Display the evidence source and date, and state that the Stanford payroll findings are early and descriptive rather than causal.1,8

2\.     **Precompute task classifications:** Run the Automated, Augmented, and Human-Centric classification once per occupation during the build, store the reviewed result in occupations.json with a classification\_version, and have the runtime Gemini call only explain stored results. This prevents different students from seeing different answers for the same job and lets reviewers check the output.

3\.     **Cross-check with observed usage:** Compare stored classifications against task-level usage data and send disagreements to manual review.28

4\.     **Keep the BLS caveat visible:** State on the card that exposure tiers are relative rankings, not job-growth, wage, or adoption forecasts, and that they do not separate automation from augmentation.8

## **Validation, Success Metrics, and Bias Testing**

The original milestone plan ends with adversarial testing but never defines how Team 7 will know the tool works. Set the pass criteria below before Class 9 and record the results.

1\.     **Data accuracy audit:** Store the source file, row key, and vintage for every displayed statistic. Add an automated test that each value in the JSON files matches its source row, plus a manual check of a randomly drawn sample of card values (proposed: at least 20).

2\.     **Counselor review:** Ask at least two school counselors to review the three-card layout and the printable guide for accuracy, tone, and usefulness, and record the changes made.

3\.     **Student usability test:** Observe a small group of students in the target age range completing set tasks (find a career, explain its cost, identify an apprenticeship option) and record task success and misunderstandings. Because users are minors, confirm consent and any institutional review requirements with your instructor and school before testing.

4\.     **Readability check:** Target roughly an 8th–9th grade reading level for generated summaries, measured automatically, while keeping every retrieved number exact.

5\.     **Expanded bias audit:** Stage 1 never receives demographics, but free text can contain them or proxies such as names, dialect, neighborhood, or gendered phrasing. Extend Milestone 5 with paired prompts that differ only in such cues and compare the three selected roles, education levels, and wages; a systematic difference is a defect.

6\.     **Privacy-preserving success measures:** The stateless design rules out per-user analytics, so use aggregate, non-identifying counters or an optional anonymous feedback prompt after the counselor guide export, with no cookies or persistent identifiers.

7\.     **Pass criteria written in advance:** Examples to adopt or adjust: zero unsourced numbers on any card, zero fabricated records, correct fallback on every off-topic or contradictory test prompt, and counselor sign-off on the guide.

## **Equity, Accessibility, Compliance, and Operational Risk**

### **Access and Equity**

1\.     **Accessibility:** Target WCAG 2.2 Level AA for the interface and the printable guide, including keyboard navigation, screen reader labels, and color contrast.31

2\.     **Spanish-language support:** Use the O\*NET Mi Próximo Paso endpoint already identified in the blueprint for career content and translate interface text, while keeping retrieved numbers unchanged in Gemini's Spanish summaries.1

3\.     **Low-bandwidth and mobile use:** Keep the static JSON files compact and test on a phone over a slow connection, since many students will not have a school laptop.

### **Compliance Additions**

1\.     **State student-privacy laws:** Beyond COPPA and FERPA, districts may require compliance with state laws such as California's SOPIPA or New York Education Law 2-d, often through a data privacy agreement. These are examples, and school or legal counsel should confirm what applies.

2\.     **Earnings disclaimers:** State on every card that earnings and payback figures are historical averages and not guarantees, and that net price is not a personal quote.

3\.     **License tracking:** Record the license and attribution terms for each added dataset and extend the attribution banner to cover them, in the same way the blueprint handles O\*NET's CC BY 4.0 requirement.3

### **Operational Risk**

1\.     **Gemini outage:** Provide a fallback browse mode that filters the static JSON files without calling the model, so the demonstration still works.

2\.     **Cost and rate limits:** Set per-IP throttling, request length caps, and billing alerts on the paid project key.

3\.     **Prompt injection and abuse:** Keep student text out of system instructions, validate Stage 1 output against the schema, and pass only verified JSON records into Stage 2\.1

4\.     **Data refresh calendar:** Assign an owner and a refresh date to each layer, since BLS, Scorecard, and O\*NET update on different schedules.1

5\.     **Logging:** Do not retain prompts or responses in application logs, to stay consistent with the stateless, non-training commitment.1

## **Suggested Additions to the Milestone Plan**

These two milestones extend the original five and follow the same sequence. Owners are suggestions and can be reassigned.

6\.     **Extend the Dataset and ROI Engine (Avis, Jack, Sophie, Sean):** Add the new data layers as adapters, rebuild the beta roster using the stratified quotas, implement the completion, cost-of-living, rent burden, and horizon calculations with unit tests, and store source and vintage metadata for every field.

7\.     **Harden Validation, Accessibility, and Operations (Kamya, Maylene, Sophie):** Run the data accuracy audit, counselor review, usability test, readability check, and expanded bias audit, add the fallback browse mode and throttling, complete the accessibility review, and write up results against the pass criteria.

#### **Works cited (Addendum A)**

19\.  Post-Secondary Employment Outcomes (PSEO), U.S. Census Bureau, [https\://lehd.ces.census.gov/data/](https://lehd.ces.census.gov/data/)

20\.  Regional Price Parities by State and Metro Area, Bureau of Economic Analysis, [https\://www\.bea.gov/data/prices-inflation/regional-price-parities-state-and-metro-area](https://www.bea.gov/data/prices-inflation/regional-price-parities-state-and-metro-area)

21\.  Fair Market Rents, HUD User, [https\://www\.huduser.gov/portal/datasets/fmr.html](https://www.huduser.gov/portal/datasets/fmr.html)

22\.  Living Wage Calculator, MIT, [https\://livingwage.mit.edu/](https://livingwage.mit.edu/)

23\.  CareerOneStop, U.S. Department of Labor, [https\://www\.careeronestop.org/](https://www.careeronestop.org/)

24\.  Survey of Occupational Injuries and Illnesses, Bureau of Labor Statistics, [https\://www\.bls.gov/iif/](https://www.bls.gov/iif/)

25\.  National Compensation Survey, Bureau of Labor Statistics, [https\://www\.bls.gov/ncs/](https://www.bls.gov/ncs/)

26\.  Projections Central, [https\://projectionscentral.org/](https://projectionscentral.org/)

27\.  American Community Survey Microdata (PUMS), U.S. Census Bureau, [https\://www\.census.gov/programs-surveys/acs/microdata.html](https://www.census.gov/programs-surveys/acs/microdata.html)

28\.  Anthropic Economic Index, [https\://www\.anthropic.com/economic-index](https://www.anthropic.com/economic-index)

29\.  Earnings and unemployment rates by educational attainment, Bureau of Labor Statistics, [https\://www\.bls.gov/emp/tables/unemployment-earnings-education.htm](https://www.bls.gov/emp/tables/unemployment-earnings-education.htm)

30\.  Federal Student Aid, [https\://studentaid.gov/](https://studentaid.gov/)

31\.  Web Content Accessibility Guidelines (WCAG) 2.2, W3C, [https\://www\.w3.org/TR/WCAG22/](https://www.w3.org/TR/WCAG22/)

