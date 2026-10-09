# CivicGrid 5-Minute Live Demo Script (DEMO_SCRIPT.md)

This script is structured for live evaluation, hackathon judging, or executive presentation. Every step demonstrates a verified, real-state capability in the platform.

---

## Pre-Flight Checklist (10 seconds)
1. Backend running: `uvicorn backend.app.main:app --port 8000` (confirm `http://localhost:8000/health`)
2. Frontend running: `npm run dev --prefix frontend` (open `http://localhost:5173`)
3. Reset grid: Click **Reset Baseline** in top-right or run `python scripts/cli_runner.py reset`.

---

## Act 1: The Mission-Critical Command Center (0:00 - 0:45)
- **Goal**: Establish visual excellence, real data credibility, and architecture scale.
1. **Show the Screen**:
   - Point out the dark command center aesthetic with the 24-node distribution topology.
   - Explain the 3 substations: `North Central Substation`, `South Harbor Substation`, and `East River Substation`.
   - Point out the 4 dashed yellow tie lines (`TIE_N1_S1`, `TIE_N2_S2_BOTTLENECK`, `TIE_S1_E1`, `TIE_N2_E1`) representing normally-open tie switches.
2. **Highlight the Top Metrics Bar**:
   - Status: `NORMAL (ALL LOADS SERVED)` in Emerald Green.
   - Total System Load: `35.20 MW`.
   - Restoration Rate: `100.0%`.
   - Active Faults: `0`.
   - Isolated Islands: `0`.

---

## Act 2: Fault Injection & Real-Time Islanding Detection (0:45 - 1:45)
- **Goal**: Demonstrate graph islanding detection and lost load accounting.
1. **Trigger Fault**:
   - In the Scenario Control Panel, click **Run Scenario B (Single Line Fault -> Self-Healing)**.
2. **Observe Real-Time Animation**:
   - Line `LINE_BUS_N1_DP_N1` immediately highlights in **Crimson Red** with pulsed fault markers.
   - Downstream nodes (`DP_N1`, `Civic Center`, `Highland Residential`) transition to **Amber / Crimson** indicating loss of energization.
3. **Inspect the State Transition**:
   - Grid Health Bar instantly transitions: `NORMAL` $\to$ `FAULT_DETECTED` $\to$ `ISLANDED`.
   - Affected Load registers `4.90 MW` lost load.
   - 1 isolated electrical island detected.

---

## Act 3: Automated Dijkstra Reconfiguration & "Why?" Transparency (1:45 - 2:45)
- **Goal**: Show self-healing restoration and mathematical explainability.
1. **Self-Healing Execution**:
   - The engine automatically searches candidate tie lines, validates thermal headroom, and closes `TIE_N1_S1` from `South Harbor Substation`.
   - The tie line turns from dashed yellow to solid green.
   - Status transitions to `RESTORED` with `100.0%` restoration rate.
2. **Open the "Why Restoration?" Panel**:
   - Click the **"Why Restoration?"** button in the header.
   - Show the judges the candidate path breakdown table:
     - Candidate 1: `TIE_N1_S1` (Composite Cost: 0.7666, Feasible: Yes).
     - Candidate 2: `TIE_N2_E1` (Composite Cost: 1.1240, Feasible: Yes).
   - Point to the formula display:
     $$\text{Cost} = 0.4 \cdot R_{norm} + 0.4 \cdot (L/C) + 0.2 \cdot D_{norm}$$
   - Explain how thermal and substation spare capacity checks approved this path.

---

## Act 4: Honest Infeasible Failure Handling (2:45 - 3:30)
- **Goal**: Prove Section 1 Truth in Engineering (no fake 100% successes).
1. **Trigger Scenario C**:
   - In the Scenario panel, click **Run Scenario C (Capacity Overload / Infeasible)**.
2. **Observe Honest Failure**:
   - A 7.2 MW medical hub feeder trips. The only candidate tie line (`TIE_N2_S2_BOTTLENECK`) has a 2.5 MW thermal limit.
   - Status bar turns **Deep Crimson**: `RECONFIGURATION_FAILED`.
   - Unserved Load honestly shows: `6.90 MW`.
   - Explain to judges: *"Unlike naive prototypes that claim 100% restoration, CivicGrid refuses to trigger a secondary catastrophic fire by exceeding thermal limits."*

---

## Act 5: Citizen Reporting & Duplicate Clustering (3:30 - 4:15)
- **Goal**: Demonstrate civic intelligence and AI transparency.
1. **Switch to Citizen View**:
   - Use the Role Selector dropdown to select **Citizen Portal** (`citizen1`).
2. **Submit Incident Report**:
   - Category: Electrical.
   - Description: *"Dangerous sparking wire hanging near the transformer at Highland!"*
   - Severity: `4`.
   - Click **Submit Incident Report**.
3. **Show AI Fallback Provenance**:
   - Point out the badge: `RULE_BASED_FALLBACK (electrical)` and dynamic priority score `49.1/100`.
4. **Duplicate Clustering**:
   - Submit a second similar report: *"Sparking wire dangling at Highland transformer!"*
   - Show that the report is automatically clustered into `Cluster #1` via spatial overlap + TF-IDF cosine similarity ($\ge 0.85$).

---

## Act 6: Officer Workflow & Immutable Audit Trail (4:15 - 5:00)
- **Goal**: Show end-to-end operational dispatch and security hardening.
1. **Switch to Officer Dashboard**:
   - Select **Department Officer** (`operator1`).
   - Show the clustered incident feed without operator alert fatigue.
   - Click **Dispatch Field Worker** to assign `worker1`.
2. **Switch to Admin Audit Log**:
   - Select **Admin Dashboard** (`admin`).
   - Open the **Audit Logs** tab.
   - Point out the immutable cryptographic record capturing:
     - Actor username
     - Action (`SCENARIO_RUN`, `FAULT_INJECTION`, `REPORT_CREATED`, `ASSIGNMENT_DISPATCHED`)
     - Timestamp
     - Outcome: `SUCCESS`
3. **Conclusion**:
   - Conclude: *"CivicGrid delivers complete vertical integrity: physical electrical graph theory, sub-second self-healing, transparent AI situational awareness, and enterprise-grade security."*
