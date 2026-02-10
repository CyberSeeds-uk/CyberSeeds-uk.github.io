
# Cyber Seeds — Canonical Assessment Contract
Version: 1.0.0  
Status: Binding Canonical Instrument  
Applies to: All Cyber Seeds implementations, platforms, pilots, and derivatives  

---

## 1. Purpose of This Contract

This document formally defines the canonical boundary of the Cyber Seeds Assessment Engine.

Its purpose is to ensure that Cyber Seeds functions as a portable, auditable, and institution-ready assessment system, rather than a website-specific experience or informal questionnaire.

This contract establishes what is canonically true, what is authoritative, and what is non-negotiable across all current and future Cyber Seeds deployments.

---

## 2. Canonical Authority

The Cyber Seeds Assessment Engine is the sole canonical authority for determining:

- Household digital safety states  
- Lens boundaries and meanings  
- Scoring logic and weightings  
- Signal derivation  
- Digital Seed eligibility  
- Classification thresholds  
- Explainability mappings  
- Versioning and audit traceability  

No user interface, website, practitioner, organisation, or client implementation may override, reinterpret, or recompute these outcomes.

---

## 3. Definition of the Assessment Engine

The Assessment Engine is defined as a deterministic, self-contained system that:

- Accepts a validated input structure  
- Applies a fixed ruleset and scoring model  
- Produces a canonical output object  
- Emits audit-safe metadata  
- Operates independently of any user interface  

The engine does not:
- Render interfaces  
- Store long-term user data  
- Control tone, copy, or presentation  
- Make moral judgements  
- Perform behavioural persuasion  

It measures, explains, and returns truth — nothing more.

---

## 4. Canonical Inputs

All assessments must be derived from a structured input object conforming to the engine’s input schema.

At minimum, canonical inputs include:

- A unique assessment identifier  
- Timestamp of assessment  
- Engine version identifier  
- Structured responses keyed to canonical question IDs  

Example (illustrative only):

```
{
  "assessment_id": "uuid",
  "timestamp": "ISO-8601",
  "engine_version": "1.0.0",
  "responses": {
    "network.q1": 3,
    "devices.q4": 1,
    "wellbeing.q2": 4
  }
}
```

Free-text interpretation, emotional context, practitioner notes, or UI-derived inference are explicitly non-canonical and must not influence scoring.

---

## 5. Canonical Outputs

The engine produces one authoritative output object per assessment.

This object is the only valid representation of assessment truth.

### 5.1 Scores
- Per-lens numerical scores  
- Overall household score  

### 5.2 Classification
- Household state (e.g. Seed, Holding, Stable)  
- Derived strictly from defined thresholds  

### 5.3 Signals
- Named indicators of risk, strain, or resilience  
- Expressed as stable machine-readable identifiers  

### 5.4 Digital Seeds
- Eligible actions derived from signals and scores  
- Provided as identifiers, not instructions  

### 5.5 Explainability Keys
- References that allow clients to explain why an outcome occurred  
- Human-readable text is client-side only  

### 5.6 Audit Metadata
- Engine version  
- Ruleset hash  
- Input hash  
- Output hash  

Example (illustrative only):

```
{
  "canonical": {
    "scores": {
      "network": 62,
      "devices": 48,
      "privacy": 71,
      "scams": 55,
      "wellbeing": 39
    },
    "overall": 55,
    "classification": "holding"
  },
  "signals": [
    "notification_overload",
    "shared_device_risk"
  ],
  "digital_seeds": [
    "weekly_device_check",
    "notification_quiet_hours"
  ],
  "explainability": {
    "wellbeing": ["WB_STR_01"]
  },
  "audit": {
    "engine_version": "1.0.0",
    "ruleset_hash": "sha256:…",
    "input_hash": "sha256:…",
    "output_hash": "sha256:…"
  }
}
```

---

## 6. Determinism and Reproducibility

The engine must be deterministic.

Given:
- The same input  
- The same engine version  
- The same ruleset  

It must always produce:
- The same output  
- The same classification  
- The same signals  
- The same digital seeds  

This property is essential for audits, appeals, research, longitudinal comparison, and institutional trust.

---

## 7. Versioning and Change Control

Any change to:
- Scoring logic  
- Thresholds  
- Weights  
- Lens definitions  
- Signal derivation  

requires a new engine version.

Backward compatibility must be preserved where feasible.  
Historical results must never be silently reinterpreted.

The engine version is mandatory in all outputs.

---

## 8. Client Responsibilities

All client implementations (websites, apps, practitioner tools, exports) must:

- Treat engine output as authoritative  
- Avoid recomputing or adjusting scores  
- Avoid reframing classifications as judgement  
- Use trauma-aware, non-shaming language  
- Clearly distinguish explanation from evaluation  

Clients may:
- Render results visually  
- Translate explainability keys into human language  
- Offer guidance, resources, and next steps  
- Store outputs locally with consent  

Clients may not:
- Modify canonical values  
- Invent additional signals  
- Override classifications  
- Suppress audit metadata  

---

## 9. Ethical and Safeguarding Alignment

The Cyber Seeds Assessment Engine is aligned with:

- Trauma-aware practice  
- Non-judgemental pedagogy  
- Safeguarding-first principles  
- Data minimisation  
- Local-first privacy by default  

The engine measures systems, not people.

Outcomes are signals for care, not verdicts.

---

## 10. Canon Supremacy Clause

In the event of ambiguity, conflict, or interpretation disputes:

This contract supersedes:
- UI behaviour  
- Marketing copy  
- Practitioner preference  
- Pilot-specific adaptations  

The Canonical Assessment Engine is the single source of truth.

---

## 11. Status

This document is binding.

All Cyber Seeds development, refactoring, deployment, and institutional engagement must comply with this contract.

Failure to do so constitutes a breach of Canon alignment.

---

Cyber Seeds  
Domestic Cyber Ecology  
Canonical Assessment Instrument
