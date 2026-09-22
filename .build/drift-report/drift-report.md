# Drift Report

- Generated: 2026-09-22T19:07:31.524Z
- Strict mode: true
- Host: opencode

## Status Legend

- `in-sync`: wrapper target, delegate mapping, and surface contract matched expectations
- `missing`: expected wrapper file was not found
- `stale-reference`: wrapper points at the wrong canonical target or delegate set
- `normalized-drift`: wrapper shape diverged from the expected tool-specific contract
- `unsupported-extra`: unexpected wrapper file exists outside the supported inventory
- `agents-section-drift`: AGENTS.md contains an unallowlisted top-level section requiring maintainer review
- `n/a`: surface intentionally not present for that row

## Summary

| Status | Count |
| --- | ---: |
| in-sync | 38 |
| n/a | 150 |
| missing | 0 |
| stale-reference | 0 |
| normalized-drift | 0 |
| unsupported-extra | 0 |
| agents-section-drift | 0 |

## Workflow Matrix

| Workflow | Category | Prerequisites | Canonical Workflow | Copilot | Claude | Codex | Antigravity | OpenCode | Windsurf |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sddp-prd | project-bootstrap | none | product-document | n/a | n/a | n/a | n/a | in-sync | n/a |
| sddp-systemdesign | project-bootstrap | none | system-design | n/a | n/a | n/a | n/a | in-sync | n/a |
| sddp-devops | project-bootstrap | none | deployment-operations | n/a | n/a | n/a | n/a | in-sync | n/a |
| sddp-projectplan | project-bootstrap | product-document:planning-ready<br>technical-context:planning-ready | project-planning | n/a | n/a | n/a | n/a | in-sync | n/a |
| sddp-amend | project-bootstrap | project-instructions<br>product-document<br>technical-context<br>project-plan | amend-project | n/a | n/a | n/a | n/a | in-sync | n/a |
| sddp-init | project-bootstrap | none | init-project | n/a | n/a | n/a | n/a | in-sync | n/a |
| sddp-regen | project-bootstrap | project-instructions<br>product-document<br>technical-context<br>project-plan:complete | prototype-regen | n/a | n/a | n/a | n/a | in-sync | n/a |
| sddp-specify | feature-delivery | project-instructions | specify-feature | n/a | n/a | n/a | n/a | in-sync | n/a |
| sddp-clarify | feature-delivery | spec | clarify-spec | n/a | n/a | n/a | n/a | in-sync | n/a |
| sddp-plan | feature-delivery | spec | plan-feature | n/a | n/a | n/a | n/a | in-sync | n/a |
| sddp-checklist | feature-delivery | spec<br>plan | generate-checklist | n/a | n/a | n/a | n/a | in-sync | n/a |
| sddp-tasks | feature-delivery | spec<br>plan | generate-tasks | n/a | n/a | n/a | n/a | in-sync | n/a |
| sddp-analyze | feature-delivery | spec<br>plan<br>tasks | analyze-compliance | n/a | n/a | n/a | n/a | in-sync | n/a |
| sddp-implement | feature-delivery | spec<br>plan<br>tasks<br>checklists:complete-if-present | implement-tasks | n/a | n/a | n/a | n/a | in-sync | n/a |
| sddp-qc | feature-delivery | spec<br>plan<br>tasks<br>implementation:complete | quality-control | n/a | n/a | n/a | n/a | in-sync | n/a |
| sddp-implement-qc-loop | orchestration | spec<br>plan<br>tasks | implement-qc-loop | n/a | n/a | n/a | n/a | in-sync | n/a |
| sddp-devsetup | environment | none | environment-setup | n/a | n/a | n/a | n/a | in-sync | n/a |
| sddp-autopilot | orchestration | autopilot:enabled<br>product-document:planning-ready<br>technical-context:planning-ready | autopilot-pipeline | n/a | n/a | n/a | n/a | in-sync | n/a |

## Agent Matrix

| Canonical Agent | Copilot | Claude | OpenCode Agent | Codex |
| --- | --- | --- | --- | --- |
| adr-author | n/a | n/a | in-sync | n/a |
| adversarial-scanner | n/a | n/a | in-sync | n/a |
| api-designer | n/a | n/a | in-sync | n/a |
| checklist-reader | n/a | n/a | in-sync | n/a |
| configuration-auditor | n/a | n/a | in-sync | n/a |
| context-gatherer | n/a | n/a | in-sync | n/a |
| database-administrator | n/a | n/a | in-sync | n/a |
| developer | n/a | n/a | in-sync | n/a |
| plan-validator | n/a | n/a | in-sync | n/a |
| policy-auditor | n/a | n/a | in-sync | n/a |
| qc-auditor | n/a | n/a | in-sync | n/a |
| requirements-scanner | n/a | n/a | in-sync | n/a |
| spec-validator | n/a | n/a | in-sync | n/a |
| story-verifier | n/a | n/a | in-sync | n/a |
| task-tracker | n/a | n/a | in-sync | n/a |
| tasks-validator | n/a | n/a | in-sync | n/a |
| technical-researcher | n/a | n/a | in-sync | n/a |
| test-evaluator | n/a | n/a | in-sync | n/a |
| test-planner | n/a | n/a | in-sync | n/a |
| wbs-generator | n/a | n/a | in-sync | n/a |

## Findings

No drift findings.

## Governance Lint

Verifies that no canonical workflow, support skill, or agent re-introduces a Read instruction for `.github/skills/compact-communication/SKILL.md` (the rules are ambient in `AGENTS.md` §Communication Style). The deprecation shim itself is exempt. Findings here are emitted as `stale-reference` and fail strict mode alongside the wrapper drift checks.
Verifies that the ambient writing-quality contract preserves meaning and exact content boundaries, that its expanded reference retains the semantic safeguards and self-audit, and that runtime files do not load `.github/skills/writing-quality/SKILL.md` during ordinary execution.
Verifies that the ambient `AGENTS.md` §Artifact Conventions primer retains its format grammars, immutable-ID rules, checkbox transition, and artifact size limits, and that canonical workflows, support skills, and agents do not re-introduce a load instruction for `.github/skills/artifact-conventions/SKILL.md`. The expanded document remains an intentional reference lookup only.
Verifies that top-level sections in `AGENTS.md` stay within the reviewed universal allowlist: `Lifecycle`, `Runtime Preflight`, `Phase Gates`, `Core Conventions`, `Artifact Conventions`, `Communication Style`, `Continuous Execution Policy`. Unallowlisted sections are emitted as `agents-section-drift` and fail strict mode; move project-specific rules to `project-instructions.md` or review the allowlist entry.

## Mermaid

```mermaid
flowchart TB
  classDef ok fill:#daf5d7,stroke:#2f7d32,color:#123a18;
  classDef fail fill:#fde2e1,stroke:#c62828,color:#4a1111;
  classDef neutral fill:#eceff1,stroke:#546e7a,color:#22313a;
  wf_sddp_prd["sddp-prd -> product-document"]
  sddp_prd_copilot["Copilot: n/a"]
  wf_sddp_prd --> sddp_prd_copilot
  class sddp_prd_copilot neutral;
  sddp_prd_claude["Claude: n/a"]
  wf_sddp_prd --> sddp_prd_claude
  class sddp_prd_claude neutral;
  sddp_prd_agentsSkill["Codex: n/a"]
  wf_sddp_prd --> sddp_prd_agentsSkill
  class sddp_prd_agentsSkill neutral;
  sddp_prd_agentsWorkflow["Antigravity: n/a"]
  wf_sddp_prd --> sddp_prd_agentsWorkflow
  class sddp_prd_agentsWorkflow neutral;
  sddp_prd_openCodeCommand["OpenCode Command: in-sync"]
  wf_sddp_prd --> sddp_prd_openCodeCommand
  class sddp_prd_openCodeCommand ok;
  sddp_prd_windsurf["Windsurf: n/a"]
  wf_sddp_prd --> sddp_prd_windsurf
  class sddp_prd_windsurf neutral;
  class wf_sddp_prd neutral;
  wf_sddp_systemdesign["sddp-systemdesign -> system-design"]
  sddp_systemdesign_copilot["Copilot: n/a"]
  wf_sddp_systemdesign --> sddp_systemdesign_copilot
  class sddp_systemdesign_copilot neutral;
  sddp_systemdesign_claude["Claude: n/a"]
  wf_sddp_systemdesign --> sddp_systemdesign_claude
  class sddp_systemdesign_claude neutral;
  sddp_systemdesign_agentsSkill["Codex: n/a"]
  wf_sddp_systemdesign --> sddp_systemdesign_agentsSkill
  class sddp_systemdesign_agentsSkill neutral;
  sddp_systemdesign_agentsWorkflow["Antigravity: n/a"]
  wf_sddp_systemdesign --> sddp_systemdesign_agentsWorkflow
  class sddp_systemdesign_agentsWorkflow neutral;
  sddp_systemdesign_openCodeCommand["OpenCode Command: in-sync"]
  wf_sddp_systemdesign --> sddp_systemdesign_openCodeCommand
  class sddp_systemdesign_openCodeCommand ok;
  sddp_systemdesign_windsurf["Windsurf: n/a"]
  wf_sddp_systemdesign --> sddp_systemdesign_windsurf
  class sddp_systemdesign_windsurf neutral;
  class wf_sddp_systemdesign neutral;
  wf_sddp_devops["sddp-devops -> deployment-operations"]
  sddp_devops_copilot["Copilot: n/a"]
  wf_sddp_devops --> sddp_devops_copilot
  class sddp_devops_copilot neutral;
  sddp_devops_claude["Claude: n/a"]
  wf_sddp_devops --> sddp_devops_claude
  class sddp_devops_claude neutral;
  sddp_devops_agentsSkill["Codex: n/a"]
  wf_sddp_devops --> sddp_devops_agentsSkill
  class sddp_devops_agentsSkill neutral;
  sddp_devops_agentsWorkflow["Antigravity: n/a"]
  wf_sddp_devops --> sddp_devops_agentsWorkflow
  class sddp_devops_agentsWorkflow neutral;
  sddp_devops_openCodeCommand["OpenCode Command: in-sync"]
  wf_sddp_devops --> sddp_devops_openCodeCommand
  class sddp_devops_openCodeCommand ok;
  sddp_devops_windsurf["Windsurf: n/a"]
  wf_sddp_devops --> sddp_devops_windsurf
  class sddp_devops_windsurf neutral;
  class wf_sddp_devops neutral;
  wf_sddp_projectplan["sddp-projectplan -> project-planning"]
  sddp_projectplan_copilot["Copilot: n/a"]
  wf_sddp_projectplan --> sddp_projectplan_copilot
  class sddp_projectplan_copilot neutral;
  sddp_projectplan_claude["Claude: n/a"]
  wf_sddp_projectplan --> sddp_projectplan_claude
  class sddp_projectplan_claude neutral;
  sddp_projectplan_agentsSkill["Codex: n/a"]
  wf_sddp_projectplan --> sddp_projectplan_agentsSkill
  class sddp_projectplan_agentsSkill neutral;
  sddp_projectplan_agentsWorkflow["Antigravity: n/a"]
  wf_sddp_projectplan --> sddp_projectplan_agentsWorkflow
  class sddp_projectplan_agentsWorkflow neutral;
  sddp_projectplan_openCodeCommand["OpenCode Command: in-sync"]
  wf_sddp_projectplan --> sddp_projectplan_openCodeCommand
  class sddp_projectplan_openCodeCommand ok;
  sddp_projectplan_windsurf["Windsurf: n/a"]
  wf_sddp_projectplan --> sddp_projectplan_windsurf
  class sddp_projectplan_windsurf neutral;
  class wf_sddp_projectplan neutral;
  wf_sddp_amend["sddp-amend -> amend-project"]
  sddp_amend_copilot["Copilot: n/a"]
  wf_sddp_amend --> sddp_amend_copilot
  class sddp_amend_copilot neutral;
  sddp_amend_claude["Claude: n/a"]
  wf_sddp_amend --> sddp_amend_claude
  class sddp_amend_claude neutral;
  sddp_amend_agentsSkill["Codex: n/a"]
  wf_sddp_amend --> sddp_amend_agentsSkill
  class sddp_amend_agentsSkill neutral;
  sddp_amend_agentsWorkflow["Antigravity: n/a"]
  wf_sddp_amend --> sddp_amend_agentsWorkflow
  class sddp_amend_agentsWorkflow neutral;
  sddp_amend_openCodeCommand["OpenCode Command: in-sync"]
  wf_sddp_amend --> sddp_amend_openCodeCommand
  class sddp_amend_openCodeCommand ok;
  sddp_amend_windsurf["Windsurf: n/a"]
  wf_sddp_amend --> sddp_amend_windsurf
  class sddp_amend_windsurf neutral;
  class wf_sddp_amend neutral;
  wf_sddp_init["sddp-init -> init-project"]
  sddp_init_copilot["Copilot: n/a"]
  wf_sddp_init --> sddp_init_copilot
  class sddp_init_copilot neutral;
  sddp_init_claude["Claude: n/a"]
  wf_sddp_init --> sddp_init_claude
  class sddp_init_claude neutral;
  sddp_init_agentsSkill["Codex: n/a"]
  wf_sddp_init --> sddp_init_agentsSkill
  class sddp_init_agentsSkill neutral;
  sddp_init_agentsWorkflow["Antigravity: n/a"]
  wf_sddp_init --> sddp_init_agentsWorkflow
  class sddp_init_agentsWorkflow neutral;
  sddp_init_openCodeCommand["OpenCode Command: in-sync"]
  wf_sddp_init --> sddp_init_openCodeCommand
  class sddp_init_openCodeCommand ok;
  sddp_init_windsurf["Windsurf: n/a"]
  wf_sddp_init --> sddp_init_windsurf
  class sddp_init_windsurf neutral;
  class wf_sddp_init neutral;
  wf_sddp_regen["sddp-regen -> prototype-regen"]
  sddp_regen_copilot["Copilot: n/a"]
  wf_sddp_regen --> sddp_regen_copilot
  class sddp_regen_copilot neutral;
  sddp_regen_claude["Claude: n/a"]
  wf_sddp_regen --> sddp_regen_claude
  class sddp_regen_claude neutral;
  sddp_regen_agentsSkill["Codex: n/a"]
  wf_sddp_regen --> sddp_regen_agentsSkill
  class sddp_regen_agentsSkill neutral;
  sddp_regen_agentsWorkflow["Antigravity: n/a"]
  wf_sddp_regen --> sddp_regen_agentsWorkflow
  class sddp_regen_agentsWorkflow neutral;
  sddp_regen_openCodeCommand["OpenCode Command: in-sync"]
  wf_sddp_regen --> sddp_regen_openCodeCommand
  class sddp_regen_openCodeCommand ok;
  sddp_regen_windsurf["Windsurf: n/a"]
  wf_sddp_regen --> sddp_regen_windsurf
  class sddp_regen_windsurf neutral;
  class wf_sddp_regen neutral;
  wf_sddp_specify["sddp-specify -> specify-feature"]
  sddp_specify_copilot["Copilot: n/a"]
  wf_sddp_specify --> sddp_specify_copilot
  class sddp_specify_copilot neutral;
  sddp_specify_claude["Claude: n/a"]
  wf_sddp_specify --> sddp_specify_claude
  class sddp_specify_claude neutral;
  sddp_specify_agentsSkill["Codex: n/a"]
  wf_sddp_specify --> sddp_specify_agentsSkill
  class sddp_specify_agentsSkill neutral;
  sddp_specify_agentsWorkflow["Antigravity: n/a"]
  wf_sddp_specify --> sddp_specify_agentsWorkflow
  class sddp_specify_agentsWorkflow neutral;
  sddp_specify_openCodeCommand["OpenCode Command: in-sync"]
  wf_sddp_specify --> sddp_specify_openCodeCommand
  class sddp_specify_openCodeCommand ok;
  sddp_specify_windsurf["Windsurf: n/a"]
  wf_sddp_specify --> sddp_specify_windsurf
  class sddp_specify_windsurf neutral;
  class wf_sddp_specify neutral;
  wf_sddp_clarify["sddp-clarify -> clarify-spec"]
  sddp_clarify_copilot["Copilot: n/a"]
  wf_sddp_clarify --> sddp_clarify_copilot
  class sddp_clarify_copilot neutral;
  sddp_clarify_claude["Claude: n/a"]
  wf_sddp_clarify --> sddp_clarify_claude
  class sddp_clarify_claude neutral;
  sddp_clarify_agentsSkill["Codex: n/a"]
  wf_sddp_clarify --> sddp_clarify_agentsSkill
  class sddp_clarify_agentsSkill neutral;
  sddp_clarify_agentsWorkflow["Antigravity: n/a"]
  wf_sddp_clarify --> sddp_clarify_agentsWorkflow
  class sddp_clarify_agentsWorkflow neutral;
  sddp_clarify_openCodeCommand["OpenCode Command: in-sync"]
  wf_sddp_clarify --> sddp_clarify_openCodeCommand
  class sddp_clarify_openCodeCommand ok;
  sddp_clarify_windsurf["Windsurf: n/a"]
  wf_sddp_clarify --> sddp_clarify_windsurf
  class sddp_clarify_windsurf neutral;
  class wf_sddp_clarify neutral;
  wf_sddp_plan["sddp-plan -> plan-feature"]
  sddp_plan_copilot["Copilot: n/a"]
  wf_sddp_plan --> sddp_plan_copilot
  class sddp_plan_copilot neutral;
  sddp_plan_claude["Claude: n/a"]
  wf_sddp_plan --> sddp_plan_claude
  class sddp_plan_claude neutral;
  sddp_plan_agentsSkill["Codex: n/a"]
  wf_sddp_plan --> sddp_plan_agentsSkill
  class sddp_plan_agentsSkill neutral;
  sddp_plan_agentsWorkflow["Antigravity: n/a"]
  wf_sddp_plan --> sddp_plan_agentsWorkflow
  class sddp_plan_agentsWorkflow neutral;
  sddp_plan_openCodeCommand["OpenCode Command: in-sync"]
  wf_sddp_plan --> sddp_plan_openCodeCommand
  class sddp_plan_openCodeCommand ok;
  sddp_plan_windsurf["Windsurf: n/a"]
  wf_sddp_plan --> sddp_plan_windsurf
  class sddp_plan_windsurf neutral;
  class wf_sddp_plan neutral;
  wf_sddp_checklist["sddp-checklist -> generate-checklist"]
  sddp_checklist_copilot["Copilot: n/a"]
  wf_sddp_checklist --> sddp_checklist_copilot
  class sddp_checklist_copilot neutral;
  sddp_checklist_claude["Claude: n/a"]
  wf_sddp_checklist --> sddp_checklist_claude
  class sddp_checklist_claude neutral;
  sddp_checklist_agentsSkill["Codex: n/a"]
  wf_sddp_checklist --> sddp_checklist_agentsSkill
  class sddp_checklist_agentsSkill neutral;
  sddp_checklist_agentsWorkflow["Antigravity: n/a"]
  wf_sddp_checklist --> sddp_checklist_agentsWorkflow
  class sddp_checklist_agentsWorkflow neutral;
  sddp_checklist_openCodeCommand["OpenCode Command: in-sync"]
  wf_sddp_checklist --> sddp_checklist_openCodeCommand
  class sddp_checklist_openCodeCommand ok;
  sddp_checklist_windsurf["Windsurf: n/a"]
  wf_sddp_checklist --> sddp_checklist_windsurf
  class sddp_checklist_windsurf neutral;
  class wf_sddp_checklist neutral;
  wf_sddp_tasks["sddp-tasks -> generate-tasks"]
  sddp_tasks_copilot["Copilot: n/a"]
  wf_sddp_tasks --> sddp_tasks_copilot
  class sddp_tasks_copilot neutral;
  sddp_tasks_claude["Claude: n/a"]
  wf_sddp_tasks --> sddp_tasks_claude
  class sddp_tasks_claude neutral;
  sddp_tasks_agentsSkill["Codex: n/a"]
  wf_sddp_tasks --> sddp_tasks_agentsSkill
  class sddp_tasks_agentsSkill neutral;
  sddp_tasks_agentsWorkflow["Antigravity: n/a"]
  wf_sddp_tasks --> sddp_tasks_agentsWorkflow
  class sddp_tasks_agentsWorkflow neutral;
  sddp_tasks_openCodeCommand["OpenCode Command: in-sync"]
  wf_sddp_tasks --> sddp_tasks_openCodeCommand
  class sddp_tasks_openCodeCommand ok;
  sddp_tasks_windsurf["Windsurf: n/a"]
  wf_sddp_tasks --> sddp_tasks_windsurf
  class sddp_tasks_windsurf neutral;
  class wf_sddp_tasks neutral;
  wf_sddp_analyze["sddp-analyze -> analyze-compliance"]
  sddp_analyze_copilot["Copilot: n/a"]
  wf_sddp_analyze --> sddp_analyze_copilot
  class sddp_analyze_copilot neutral;
  sddp_analyze_claude["Claude: n/a"]
  wf_sddp_analyze --> sddp_analyze_claude
  class sddp_analyze_claude neutral;
  sddp_analyze_agentsSkill["Codex: n/a"]
  wf_sddp_analyze --> sddp_analyze_agentsSkill
  class sddp_analyze_agentsSkill neutral;
  sddp_analyze_agentsWorkflow["Antigravity: n/a"]
  wf_sddp_analyze --> sddp_analyze_agentsWorkflow
  class sddp_analyze_agentsWorkflow neutral;
  sddp_analyze_openCodeCommand["OpenCode Command: in-sync"]
  wf_sddp_analyze --> sddp_analyze_openCodeCommand
  class sddp_analyze_openCodeCommand ok;
  sddp_analyze_windsurf["Windsurf: n/a"]
  wf_sddp_analyze --> sddp_analyze_windsurf
  class sddp_analyze_windsurf neutral;
  class wf_sddp_analyze neutral;
  wf_sddp_implement["sddp-implement -> implement-tasks"]
  sddp_implement_copilot["Copilot: n/a"]
  wf_sddp_implement --> sddp_implement_copilot
  class sddp_implement_copilot neutral;
  sddp_implement_claude["Claude: n/a"]
  wf_sddp_implement --> sddp_implement_claude
  class sddp_implement_claude neutral;
  sddp_implement_agentsSkill["Codex: n/a"]
  wf_sddp_implement --> sddp_implement_agentsSkill
  class sddp_implement_agentsSkill neutral;
  sddp_implement_agentsWorkflow["Antigravity: n/a"]
  wf_sddp_implement --> sddp_implement_agentsWorkflow
  class sddp_implement_agentsWorkflow neutral;
  sddp_implement_openCodeCommand["OpenCode Command: in-sync"]
  wf_sddp_implement --> sddp_implement_openCodeCommand
  class sddp_implement_openCodeCommand ok;
  sddp_implement_windsurf["Windsurf: n/a"]
  wf_sddp_implement --> sddp_implement_windsurf
  class sddp_implement_windsurf neutral;
  class wf_sddp_implement neutral;
  wf_sddp_qc["sddp-qc -> quality-control"]
  sddp_qc_copilot["Copilot: n/a"]
  wf_sddp_qc --> sddp_qc_copilot
  class sddp_qc_copilot neutral;
  sddp_qc_claude["Claude: n/a"]
  wf_sddp_qc --> sddp_qc_claude
  class sddp_qc_claude neutral;
  sddp_qc_agentsSkill["Codex: n/a"]
  wf_sddp_qc --> sddp_qc_agentsSkill
  class sddp_qc_agentsSkill neutral;
  sddp_qc_agentsWorkflow["Antigravity: n/a"]
  wf_sddp_qc --> sddp_qc_agentsWorkflow
  class sddp_qc_agentsWorkflow neutral;
  sddp_qc_openCodeCommand["OpenCode Command: in-sync"]
  wf_sddp_qc --> sddp_qc_openCodeCommand
  class sddp_qc_openCodeCommand ok;
  sddp_qc_windsurf["Windsurf: n/a"]
  wf_sddp_qc --> sddp_qc_windsurf
  class sddp_qc_windsurf neutral;
  class wf_sddp_qc neutral;
  wf_sddp_implement_qc_loop["sddp-implement-qc-loop -> implement-qc-loop"]
  sddp_implement_qc_loop_copilot["Copilot: n/a"]
  wf_sddp_implement_qc_loop --> sddp_implement_qc_loop_copilot
  class sddp_implement_qc_loop_copilot neutral;
  sddp_implement_qc_loop_claude["Claude: n/a"]
  wf_sddp_implement_qc_loop --> sddp_implement_qc_loop_claude
  class sddp_implement_qc_loop_claude neutral;
  sddp_implement_qc_loop_agentsSkill["Codex: n/a"]
  wf_sddp_implement_qc_loop --> sddp_implement_qc_loop_agentsSkill
  class sddp_implement_qc_loop_agentsSkill neutral;
  sddp_implement_qc_loop_agentsWorkflow["Antigravity: n/a"]
  wf_sddp_implement_qc_loop --> sddp_implement_qc_loop_agentsWorkflow
  class sddp_implement_qc_loop_agentsWorkflow neutral;
  sddp_implement_qc_loop_openCodeCommand["OpenCode Command: in-sync"]
  wf_sddp_implement_qc_loop --> sddp_implement_qc_loop_openCodeCommand
  class sddp_implement_qc_loop_openCodeCommand ok;
  sddp_implement_qc_loop_windsurf["Windsurf: n/a"]
  wf_sddp_implement_qc_loop --> sddp_implement_qc_loop_windsurf
  class sddp_implement_qc_loop_windsurf neutral;
  class wf_sddp_implement_qc_loop neutral;
  wf_sddp_devsetup["sddp-devsetup -> environment-setup"]
  sddp_devsetup_copilot["Copilot: n/a"]
  wf_sddp_devsetup --> sddp_devsetup_copilot
  class sddp_devsetup_copilot neutral;
  sddp_devsetup_claude["Claude: n/a"]
  wf_sddp_devsetup --> sddp_devsetup_claude
  class sddp_devsetup_claude neutral;
  sddp_devsetup_agentsSkill["Codex: n/a"]
  wf_sddp_devsetup --> sddp_devsetup_agentsSkill
  class sddp_devsetup_agentsSkill neutral;
  sddp_devsetup_agentsWorkflow["Antigravity: n/a"]
  wf_sddp_devsetup --> sddp_devsetup_agentsWorkflow
  class sddp_devsetup_agentsWorkflow neutral;
  sddp_devsetup_openCodeCommand["OpenCode Command: in-sync"]
  wf_sddp_devsetup --> sddp_devsetup_openCodeCommand
  class sddp_devsetup_openCodeCommand ok;
  sddp_devsetup_windsurf["Windsurf: n/a"]
  wf_sddp_devsetup --> sddp_devsetup_windsurf
  class sddp_devsetup_windsurf neutral;
  class wf_sddp_devsetup neutral;
  wf_sddp_autopilot["sddp-autopilot -> autopilot-pipeline"]
  sddp_autopilot_copilot["Copilot: n/a"]
  wf_sddp_autopilot --> sddp_autopilot_copilot
  class sddp_autopilot_copilot neutral;
  sddp_autopilot_claude["Claude: n/a"]
  wf_sddp_autopilot --> sddp_autopilot_claude
  class sddp_autopilot_claude neutral;
  sddp_autopilot_agentsSkill["Codex: n/a"]
  wf_sddp_autopilot --> sddp_autopilot_agentsSkill
  class sddp_autopilot_agentsSkill neutral;
  sddp_autopilot_agentsWorkflow["Antigravity: n/a"]
  wf_sddp_autopilot --> sddp_autopilot_agentsWorkflow
  class sddp_autopilot_agentsWorkflow neutral;
  sddp_autopilot_openCodeCommand["OpenCode Command: in-sync"]
  wf_sddp_autopilot --> sddp_autopilot_openCodeCommand
  class sddp_autopilot_openCodeCommand ok;
  sddp_autopilot_windsurf["Windsurf: n/a"]
  wf_sddp_autopilot --> sddp_autopilot_windsurf
  class sddp_autopilot_windsurf neutral;
  class wf_sddp_autopilot neutral;
  agent_adr_author["adr-author"]
  adr_author_copilot["Copilot: n/a"]
  agent_adr_author --> adr_author_copilot
  class adr_author_copilot neutral;
  adr_author_claude["Claude: n/a"]
  agent_adr_author --> adr_author_claude
  class adr_author_claude neutral;
  adr_author_openCodeAgent["OpenCode Agent: in-sync"]
  agent_adr_author --> adr_author_openCodeAgent
  class adr_author_openCodeAgent ok;
  adr_author_codex["Codex: n/a"]
  agent_adr_author --> adr_author_codex
  class adr_author_codex neutral;
  class agent_adr_author neutral;
  agent_adversarial_scanner["adversarial-scanner"]
  adversarial_scanner_copilot["Copilot: n/a"]
  agent_adversarial_scanner --> adversarial_scanner_copilot
  class adversarial_scanner_copilot neutral;
  adversarial_scanner_claude["Claude: n/a"]
  agent_adversarial_scanner --> adversarial_scanner_claude
  class adversarial_scanner_claude neutral;
  adversarial_scanner_openCodeAgent["OpenCode Agent: in-sync"]
  agent_adversarial_scanner --> adversarial_scanner_openCodeAgent
  class adversarial_scanner_openCodeAgent ok;
  adversarial_scanner_codex["Codex: n/a"]
  agent_adversarial_scanner --> adversarial_scanner_codex
  class adversarial_scanner_codex neutral;
  class agent_adversarial_scanner neutral;
  agent_api_designer["api-designer"]
  api_designer_copilot["Copilot: n/a"]
  agent_api_designer --> api_designer_copilot
  class api_designer_copilot neutral;
  api_designer_claude["Claude: n/a"]
  agent_api_designer --> api_designer_claude
  class api_designer_claude neutral;
  api_designer_openCodeAgent["OpenCode Agent: in-sync"]
  agent_api_designer --> api_designer_openCodeAgent
  class api_designer_openCodeAgent ok;
  api_designer_codex["Codex: n/a"]
  agent_api_designer --> api_designer_codex
  class api_designer_codex neutral;
  class agent_api_designer neutral;
  agent_checklist_reader["checklist-reader"]
  checklist_reader_copilot["Copilot: n/a"]
  agent_checklist_reader --> checklist_reader_copilot
  class checklist_reader_copilot neutral;
  checklist_reader_claude["Claude: n/a"]
  agent_checklist_reader --> checklist_reader_claude
  class checklist_reader_claude neutral;
  checklist_reader_openCodeAgent["OpenCode Agent: in-sync"]
  agent_checklist_reader --> checklist_reader_openCodeAgent
  class checklist_reader_openCodeAgent ok;
  checklist_reader_codex["Codex: n/a"]
  agent_checklist_reader --> checklist_reader_codex
  class checklist_reader_codex neutral;
  class agent_checklist_reader neutral;
  agent_configuration_auditor["configuration-auditor"]
  configuration_auditor_copilot["Copilot: n/a"]
  agent_configuration_auditor --> configuration_auditor_copilot
  class configuration_auditor_copilot neutral;
  configuration_auditor_claude["Claude: n/a"]
  agent_configuration_auditor --> configuration_auditor_claude
  class configuration_auditor_claude neutral;
  configuration_auditor_openCodeAgent["OpenCode Agent: in-sync"]
  agent_configuration_auditor --> configuration_auditor_openCodeAgent
  class configuration_auditor_openCodeAgent ok;
  configuration_auditor_codex["Codex: n/a"]
  agent_configuration_auditor --> configuration_auditor_codex
  class configuration_auditor_codex neutral;
  class agent_configuration_auditor neutral;
  agent_context_gatherer["context-gatherer"]
  context_gatherer_copilot["Copilot: n/a"]
  agent_context_gatherer --> context_gatherer_copilot
  class context_gatherer_copilot neutral;
  context_gatherer_claude["Claude: n/a"]
  agent_context_gatherer --> context_gatherer_claude
  class context_gatherer_claude neutral;
  context_gatherer_openCodeAgent["OpenCode Agent: in-sync"]
  agent_context_gatherer --> context_gatherer_openCodeAgent
  class context_gatherer_openCodeAgent ok;
  context_gatherer_codex["Codex: n/a"]
  agent_context_gatherer --> context_gatherer_codex
  class context_gatherer_codex neutral;
  class agent_context_gatherer neutral;
  agent_database_administrator["database-administrator"]
  database_administrator_copilot["Copilot: n/a"]
  agent_database_administrator --> database_administrator_copilot
  class database_administrator_copilot neutral;
  database_administrator_claude["Claude: n/a"]
  agent_database_administrator --> database_administrator_claude
  class database_administrator_claude neutral;
  database_administrator_openCodeAgent["OpenCode Agent: in-sync"]
  agent_database_administrator --> database_administrator_openCodeAgent
  class database_administrator_openCodeAgent ok;
  database_administrator_codex["Codex: n/a"]
  agent_database_administrator --> database_administrator_codex
  class database_administrator_codex neutral;
  class agent_database_administrator neutral;
  agent_developer["developer"]
  developer_copilot["Copilot: n/a"]
  agent_developer --> developer_copilot
  class developer_copilot neutral;
  developer_claude["Claude: n/a"]
  agent_developer --> developer_claude
  class developer_claude neutral;
  developer_openCodeAgent["OpenCode Agent: in-sync"]
  agent_developer --> developer_openCodeAgent
  class developer_openCodeAgent ok;
  developer_codex["Codex: n/a"]
  agent_developer --> developer_codex
  class developer_codex neutral;
  class agent_developer neutral;
  agent_plan_validator["plan-validator"]
  plan_validator_copilot["Copilot: n/a"]
  agent_plan_validator --> plan_validator_copilot
  class plan_validator_copilot neutral;
  plan_validator_claude["Claude: n/a"]
  agent_plan_validator --> plan_validator_claude
  class plan_validator_claude neutral;
  plan_validator_openCodeAgent["OpenCode Agent: in-sync"]
  agent_plan_validator --> plan_validator_openCodeAgent
  class plan_validator_openCodeAgent ok;
  plan_validator_codex["Codex: n/a"]
  agent_plan_validator --> plan_validator_codex
  class plan_validator_codex neutral;
  class agent_plan_validator neutral;
  agent_policy_auditor["policy-auditor"]
  policy_auditor_copilot["Copilot: n/a"]
  agent_policy_auditor --> policy_auditor_copilot
  class policy_auditor_copilot neutral;
  policy_auditor_claude["Claude: n/a"]
  agent_policy_auditor --> policy_auditor_claude
  class policy_auditor_claude neutral;
  policy_auditor_openCodeAgent["OpenCode Agent: in-sync"]
  agent_policy_auditor --> policy_auditor_openCodeAgent
  class policy_auditor_openCodeAgent ok;
  policy_auditor_codex["Codex: n/a"]
  agent_policy_auditor --> policy_auditor_codex
  class policy_auditor_codex neutral;
  class agent_policy_auditor neutral;
  agent_qc_auditor["qc-auditor"]
  qc_auditor_copilot["Copilot: n/a"]
  agent_qc_auditor --> qc_auditor_copilot
  class qc_auditor_copilot neutral;
  qc_auditor_claude["Claude: n/a"]
  agent_qc_auditor --> qc_auditor_claude
  class qc_auditor_claude neutral;
  qc_auditor_openCodeAgent["OpenCode Agent: in-sync"]
  agent_qc_auditor --> qc_auditor_openCodeAgent
  class qc_auditor_openCodeAgent ok;
  qc_auditor_codex["Codex: n/a"]
  agent_qc_auditor --> qc_auditor_codex
  class qc_auditor_codex neutral;
  class agent_qc_auditor neutral;
  agent_requirements_scanner["requirements-scanner"]
  requirements_scanner_copilot["Copilot: n/a"]
  agent_requirements_scanner --> requirements_scanner_copilot
  class requirements_scanner_copilot neutral;
  requirements_scanner_claude["Claude: n/a"]
  agent_requirements_scanner --> requirements_scanner_claude
  class requirements_scanner_claude neutral;
  requirements_scanner_openCodeAgent["OpenCode Agent: in-sync"]
  agent_requirements_scanner --> requirements_scanner_openCodeAgent
  class requirements_scanner_openCodeAgent ok;
  requirements_scanner_codex["Codex: n/a"]
  agent_requirements_scanner --> requirements_scanner_codex
  class requirements_scanner_codex neutral;
  class agent_requirements_scanner neutral;
  agent_spec_validator["spec-validator"]
  spec_validator_copilot["Copilot: n/a"]
  agent_spec_validator --> spec_validator_copilot
  class spec_validator_copilot neutral;
  spec_validator_claude["Claude: n/a"]
  agent_spec_validator --> spec_validator_claude
  class spec_validator_claude neutral;
  spec_validator_openCodeAgent["OpenCode Agent: in-sync"]
  agent_spec_validator --> spec_validator_openCodeAgent
  class spec_validator_openCodeAgent ok;
  spec_validator_codex["Codex: n/a"]
  agent_spec_validator --> spec_validator_codex
  class spec_validator_codex neutral;
  class agent_spec_validator neutral;
  agent_story_verifier["story-verifier"]
  story_verifier_copilot["Copilot: n/a"]
  agent_story_verifier --> story_verifier_copilot
  class story_verifier_copilot neutral;
  story_verifier_claude["Claude: n/a"]
  agent_story_verifier --> story_verifier_claude
  class story_verifier_claude neutral;
  story_verifier_openCodeAgent["OpenCode Agent: in-sync"]
  agent_story_verifier --> story_verifier_openCodeAgent
  class story_verifier_openCodeAgent ok;
  story_verifier_codex["Codex: n/a"]
  agent_story_verifier --> story_verifier_codex
  class story_verifier_codex neutral;
  class agent_story_verifier neutral;
  agent_task_tracker["task-tracker"]
  task_tracker_copilot["Copilot: n/a"]
  agent_task_tracker --> task_tracker_copilot
  class task_tracker_copilot neutral;
  task_tracker_claude["Claude: n/a"]
  agent_task_tracker --> task_tracker_claude
  class task_tracker_claude neutral;
  task_tracker_openCodeAgent["OpenCode Agent: in-sync"]
  agent_task_tracker --> task_tracker_openCodeAgent
  class task_tracker_openCodeAgent ok;
  task_tracker_codex["Codex: n/a"]
  agent_task_tracker --> task_tracker_codex
  class task_tracker_codex neutral;
  class agent_task_tracker neutral;
  agent_tasks_validator["tasks-validator"]
  tasks_validator_copilot["Copilot: n/a"]
  agent_tasks_validator --> tasks_validator_copilot
  class tasks_validator_copilot neutral;
  tasks_validator_claude["Claude: n/a"]
  agent_tasks_validator --> tasks_validator_claude
  class tasks_validator_claude neutral;
  tasks_validator_openCodeAgent["OpenCode Agent: in-sync"]
  agent_tasks_validator --> tasks_validator_openCodeAgent
  class tasks_validator_openCodeAgent ok;
  tasks_validator_codex["Codex: n/a"]
  agent_tasks_validator --> tasks_validator_codex
  class tasks_validator_codex neutral;
  class agent_tasks_validator neutral;
  agent_technical_researcher["technical-researcher"]
  technical_researcher_copilot["Copilot: n/a"]
  agent_technical_researcher --> technical_researcher_copilot
  class technical_researcher_copilot neutral;
  technical_researcher_claude["Claude: n/a"]
  agent_technical_researcher --> technical_researcher_claude
  class technical_researcher_claude neutral;
  technical_researcher_openCodeAgent["OpenCode Agent: in-sync"]
  agent_technical_researcher --> technical_researcher_openCodeAgent
  class technical_researcher_openCodeAgent ok;
  technical_researcher_codex["Codex: n/a"]
  agent_technical_researcher --> technical_researcher_codex
  class technical_researcher_codex neutral;
  class agent_technical_researcher neutral;
  agent_test_evaluator["test-evaluator"]
  test_evaluator_copilot["Copilot: n/a"]
  agent_test_evaluator --> test_evaluator_copilot
  class test_evaluator_copilot neutral;
  test_evaluator_claude["Claude: n/a"]
  agent_test_evaluator --> test_evaluator_claude
  class test_evaluator_claude neutral;
  test_evaluator_openCodeAgent["OpenCode Agent: in-sync"]
  agent_test_evaluator --> test_evaluator_openCodeAgent
  class test_evaluator_openCodeAgent ok;
  test_evaluator_codex["Codex: n/a"]
  agent_test_evaluator --> test_evaluator_codex
  class test_evaluator_codex neutral;
  class agent_test_evaluator neutral;
  agent_test_planner["test-planner"]
  test_planner_copilot["Copilot: n/a"]
  agent_test_planner --> test_planner_copilot
  class test_planner_copilot neutral;
  test_planner_claude["Claude: n/a"]
  agent_test_planner --> test_planner_claude
  class test_planner_claude neutral;
  test_planner_openCodeAgent["OpenCode Agent: in-sync"]
  agent_test_planner --> test_planner_openCodeAgent
  class test_planner_openCodeAgent ok;
  test_planner_codex["Codex: n/a"]
  agent_test_planner --> test_planner_codex
  class test_planner_codex neutral;
  class agent_test_planner neutral;
  agent_wbs_generator["wbs-generator"]
  wbs_generator_copilot["Copilot: n/a"]
  agent_wbs_generator --> wbs_generator_copilot
  class wbs_generator_copilot neutral;
  wbs_generator_claude["Claude: n/a"]
  agent_wbs_generator --> wbs_generator_claude
  class wbs_generator_claude neutral;
  wbs_generator_openCodeAgent["OpenCode Agent: in-sync"]
  agent_wbs_generator --> wbs_generator_openCodeAgent
  class wbs_generator_openCodeAgent ok;
  wbs_generator_codex["Codex: n/a"]
  agent_wbs_generator --> wbs_generator_codex
  class wbs_generator_codex neutral;
  class agent_wbs_generator neutral;
```
