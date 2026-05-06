
# Final SDP Review PPT — Hoovrr (AI-Assisted Livestock Health Management Platform)

## Approach

Rather than rebuild from scratch (which would lose the template's VIT-AP / SCOPE branding, header banner, Picture2 watermark, footer numbering and master fonts), I will **unpack the uploaded `SCOPE_SDP_Template_May_2026.pptx` and edit each slide's text frames in place** using `python-pptx`. This guarantees the template's slide order, headings, formatting, and design hierarchy are preserved exactly.

For diagrams (architecture, workflow, ER, module interactions, FSM), I will generate clean SVG/PNG figures with matplotlib + graphviz and embed them into the relevant slides. UI screenshots will be captured from the live preview (`/admin`, `/farmer`, `/vet/cases`) using the browser tool and embedded into slide 13.

Output: `/mnt/documents/Hoovrr_SDP_Final_Review.pptx`, plus PDF + per-slide JPGs for visual QA.

## Slide-by-Slide Content

**Slide 1 — Title**
- Title: *Hoovrr — AI-Assisted Livestock Health Management Platform*
- SDP ID: `<placeholder — to fill>`
- Team Members + Reg. Nos.: `<placeholder>`
- SCOPE, VIT-AP University, Amaravati

**Slide 2 — Presentation Outline** (kept verbatim from template)

**Slide 3 — Introduction: Project Overview & Problem Statement**
- Overview: web platform connecting Farmers, Vets, Admins for livestock health, scheduling, treatment & AI disease prediction
- Problem: fragmented livestock care, delayed vet response, no decision support, paper records, missed vaccinations
- Visual: 3-actor icon strip (Farmer → Admin → Vet)

**Slide 4 — Introduction: Motivations**
- Rural livestock = primary livelihood; mortality has economic impact
- Vet shortage → need triage + scheduling
- Emergencies need priority routing
- Data → ML feedback loop improves diagnosis over time
- Visual: motivation pillars (4 cards)

**Slide 5 — Literature Survey / Existing Solutions**
- Table comparing: Pashu Aadhaar, Stellapps, Cainthus/Cargill, Moocall, Generic vet CRMs
- Columns: Focus | AI Triage | Multi-role workflow | Scheduling | Open Web

**Slide 6 — Gaps Identified / Improvements**
- Gaps: no role-based ticket FSM, no symptom-weighted prediction, no integrated scheduling, weak emergency prioritization
- Improvements: 7-state ticket FSM, weighted disease ranking with feedback loop, single-booking-per-day vet slots, emergency-first sort + alerts, soft-deletion audit trail

**Slide 7 — Project Objectives**
- Bulleted: Role-based portals; Ticket lifecycle automation; AI-assisted disease ranking; Vet scheduling with conflict prevention; Treatment & vaccination tracking; Admin oversight & analytics; Databricks ML feedback

**Slide 8 — Proposed Solution: System Architecture**
- Generated diagram: React/Vite frontend → Supabase (Auth, Postgres+RLS, Edge Functions, Storage) → Lovable AI Gateway → Databricks Delta Lake
- Sub-blocks: RBAC (Farmer/Vet/Admin), Realtime channel, Trigger-based sync

**Slide 9 — Key Components / Features / Modules**
- Modules: Auth & RBAC | Animal Registry | Ticketing FSM | Vet Slots & Scheduling | Treatment & Vaccination | Disease Prediction | Admin Console | Seasonal Awareness
- Visual: module interaction diagram

**Slide 10 — Algorithms / Technologies / Frameworks / Tools**
- Algorithms: Weighted Symptom-Disease scoring, Stochastic weight update `w += η(1−w)`, Priority sort (emergency→urgent→normal), FSM transition guard
- Stack: React 18, TS, Vite, Tailwind, shadcn/ui, Supabase (PG15, RLS, Deno Edge Fns), Lovable AI (Gemini/GPT-5), Databricks, Recharts
- Tools: Lovable, GitHub, pgAdmin

**Slide 11 — Dataset / Input–Output**
- Dataset: 160-row disease–symptom weight matrix (16 diseases × ~15 symptoms, weights ∈ [0,3])
- Input: selected symptoms + animal metadata
- Output: top-K ranked diseases + scores + confidence

**Slide 12 — Parameters / Initial Conditions**
- η (learning rate) = 0.1; weight bounds [0, 3]; K = 5 top diseases
- Slot capacity = 1 booking/vet/date; default vet hours 09:00–17:00
- Vaccine reminder window = 30 days; emergency SLA = immediate alert

**Slide 13 — Implementation Outcomes**
- 3 UI screenshots (live preview): Farmer dashboard, Admin tickets board, Vet schedule
- Table: # tables (17+), # edge functions (7), avg ticket flow time, deletion test (10/10 success)

**Slide 14 — Summary**
- Findings: end-to-end FSM works, AI ranking matches expected diseases, RLS prevents cross-role leakage
- Limitations: small training set; no offline mode; SMS not integrated
- Future: Mobile app, IoT collar telemetry, multilingual NLP symptom intake, broader ML model

**Slide 15 — References (APA)**
- Supabase docs (2025); React docs (2025); Tailwind (2025); Databricks Delta Lake (2024); FAO livestock health reports; relevant IEEE papers on veterinary expert systems and weighted Bayesian symptom checkers

**Slide 16 — Thank You**

## Diagrams to Generate
1. System architecture (3-tier with arrows)
2. Ticket FSM state diagram (created→assigned→waiting_for_slot→scheduled→in_progress→completed; +cancelled)
3. ER snapshot (profiles, animals, tickets, vet_slots, ticket_symptoms, diseases, disease_symptoms)
4. Module interaction diagram
5. Disease prediction data-flow

## Deliverables
- `/mnt/documents/Hoovrr_SDP_Final_Review.pptx` (primary)
- `/mnt/documents/Hoovrr_SDP_Final_Review.pdf` (QA / backup)
- Visual QA: render every slide to JPG and inspect for overlap, overflow, missing assets, contrast — fix and re-verify before delivering.

## Placeholders the user must fill
- SDP ID, Team Member Names + Registration Numbers, Guide Name (slide 1)

Confirm and I will build it.
