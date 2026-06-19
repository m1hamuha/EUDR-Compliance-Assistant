# Guided demo — EUDR Compliance Assistant

A 5-minute walkthrough that tells the whole story: **collect → assess risk → fix →
file the statement.** Use it for investor demos or first-run evaluation.

> Tip: switch the language any time with the **EN / DE** toggle in the sidebar — the
> entire app, including the statement, re-renders in German.

## 0. Setup (30s)

1. Run the app (`npm run dev`) and open <http://localhost:3000>.
2. Click **Get started**, sign up with any company name + email (password ≥ 12 chars
   with upper/lower/number/symbol). You land straight on the dashboard.
3. The dashboard is empty — click **Load sample data**. This seeds a realistic
   multi-commodity supply chain (coffee, cocoa, wood, rubber, palm oil, soy, cattle)
   across **low-, standard- and high-risk** origins, with a mix of validated, pending,
   invalid and not-yet-submitted geolocation.

## 1. The dashboard tells you what to do (45s)

The home screen is a **guide, not a scoreboard**. It shows:

- **DDS readiness** — currently *needs attention* (amber), because the portfolio
  contains high-risk plots.
- **Next best actions** — the top prioritized tasks. Each one **links straight to the
  supplier** that needs work.

> Talking point: most tools dump data on you. This one opens with *"here are the three
> things to do next."*

## 2. The risk verdict (90s)

Open **Risk** in the sidebar.

- **Conclusion banner: "Action required."** The portfolio cannot be filed yet because
  some plots carry high deforestation risk.
- **KPIs** — the portfolio risk index, plots needing mitigation, plots and suppliers
  assessed.
- **Risk conclusions** + **EU country benchmark** — distribution of plots by conclusion
  and by the EU's country-risk category. Note **Bago Teak Traders (Myanmar)** sits in the
  *high-risk* benchmark.
- **Action plan** — every risk factor turned into a concrete task with a priority and the
  right action (Remind the supplier, or View). Use **Remind all** to nudge every
  contactable supplier at once.
- **Risk by supplier** — expand any supplier to see per-plot factors driving the score
  (e.g. *"Geolocation failed EUDR validation"*, *"Plot over 4 ha submitted as a point"*,
  *"Sourced from a high-risk country"*).

> Talking point: this is the heart of EUDR — not collecting coordinates, but **deciding**
> whether the risk is negligible. The engine is faithful to the regulation (country
> benchmark + commodity pressure + plot verifiability) and explains every conclusion.

## 3. Risk is visible everywhere (30s)

- **Suppliers** — each row carries a risk badge next to its status. Open a supplier to
  see the inline **Risk assessment** card.
- **Map** — toggle the colour mode from **Status** to **Risk**: the same plots recolour
  by deforestation risk, with a matching legend and per-plot popups.

## 4. The Due Diligence Statement (90s)

Open **Statement** in the sidebar.

- While risk is unresolved it renders as a **DRAFT**, stating exactly what blocks filing.
- The document is the real EUDR Art. 33 artifact: **reference number**, operator,
  commodity lines with **HS Annex I headings**, plot/area totals, and the risk conclusion.
- **Download statement (JSON)** produces the machine-readable payload an operator submits
  to the EU Information System (TRACES). **Print / Save as PDF** produces the human copy.
- **Record statement** snapshots it into **Statement history** — a durable, audit-logged
  record (visible in **Activity**) of what was assessed and when.

> Talking point: clean a portfolio up (validate the invalid plot, swap the large point for
> a polygon, add mitigation evidence) and the same statement flips from DRAFT to
> **fileable**. That transition *is* the product.

## 5. The metrics story (45s)

Open **Analytics**.

- The headline **Compliance Readiness Score** is **risk-weighted** — it blends data
  completeness with the deforestation-risk index, so a fully-collected but risky supply
  chain is correctly rated *not ready*.
- Funnel, response/completion rates, time-to-compliance, weekly momentum, and a score
  trend (daily snapshots) round out the picture.
- **Compliance report** opens a printable one-pager for stakeholders.

## 6. Wrap

The full loop in one product: **collect → validate → assess risk → see what to fix →
remediate → generate & record the statement → export** — every screen bilingual, every
verdict explained, every action one click from done.
