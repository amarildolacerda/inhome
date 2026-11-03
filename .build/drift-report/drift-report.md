# Drift Report

- Generated: 2026-11-01T22:38:41.511Z
- Strict mode: true
- Host: all

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
| in-sync | 60 |
| n/a | 32 |
| missing | 190 |
| stale-reference | 36 |
| normalized-drift | 54 |
| unsupported-extra | 0 |
| agents-section-drift | 0 |

## Workflow Matrix

| Workflow | Category | Prerequisites | Canonical Workflow | Copilot | Claude | Codex | Antigravity | OpenCode | Windsurf |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sddp-prd | project-bootstrap | none | product-document | stale-reference | missing | missing | missing | in-sync | missing |
| sddp-systemdesign | project-bootstrap | none | system-design | stale-reference | missing | missing | missing | in-sync | missing |
| sddp-devops | project-bootstrap | none | deployment-operations | stale-reference | missing | missing | missing | in-sync | missing |
| sddp-projectplan | project-bootstrap | product-document:planning-ready<br>technical-context:planning-ready | project-planning | stale-reference | missing | missing | missing | in-sync | missing |
| sddp-amend | project-bootstrap | project-instructions<br>product-document<br>technical-context<br>project-plan | amend-project | stale-reference | missing | missing | missing | in-sync | missing |
| sddp-init | project-bootstrap | none | init-project | stale-reference | missing | missing | missing | in-sync | missing |
| sddp-regen | project-bootstrap | project-instructions<br>product-document<br>technical-context<br>project-plan:complete | prototype-regen | stale-reference | missing | missing | missing | in-sync | missing |
| sddp-specify | feature-delivery | project-instructions | specify-feature | stale-reference | missing | missing | missing | in-sync | missing |
| sddp-clarify | feature-delivery | spec | clarify-spec | stale-reference | missing | missing | missing | in-sync | missing |
| sddp-plan | feature-delivery | spec | plan-feature | stale-reference | missing | missing | missing | in-sync | missing |
| sddp-checklist | feature-delivery | spec<br>plan | generate-checklist | stale-reference | missing | missing | missing | in-sync | missing |
| sddp-tasks | feature-delivery | spec<br>plan | generate-tasks | stale-reference | missing | missing | missing | in-sync | missing |
| sddp-analyze | feature-delivery | spec<br>plan<br>tasks | analyze-compliance | stale-reference | missing | missing | missing | in-sync | missing |
| sddp-implement | feature-delivery | spec<br>plan<br>tasks<br>checklists:complete-if-present | implement-tasks | stale-reference | missing | missing | missing | in-sync | missing |
| sddp-qc | feature-delivery | spec<br>plan<br>tasks<br>implementation:complete | quality-control | stale-reference | missing | missing | missing | in-sync | missing |
| sddp-implement-qc-loop | orchestration | spec<br>plan<br>tasks | implement-qc-loop | stale-reference | missing | missing | missing | in-sync | missing |
| sddp-devsetup | environment | none | environment-setup | stale-reference | missing | missing | missing | in-sync | missing |
| sddp-autopilot | orchestration | autopilot:enabled<br>product-document:planning-ready<br>technical-context:planning-ready | autopilot-pipeline | stale-reference | missing | missing | missing | in-sync | missing |

## Agent Matrix

| Canonical Agent | Copilot | Claude | OpenCode Agent | Codex |
| --- | --- | --- | --- | --- |
| adr-author | in-sync | missing | in-sync | missing |
| adversarial-scanner | in-sync | missing | in-sync | missing |
| api-designer | in-sync | missing | in-sync | missing |
| checklist-reader | in-sync | missing | in-sync | missing |
| configuration-auditor | in-sync | missing | in-sync | missing |
| context-gatherer | in-sync | missing | in-sync | missing |
| database-administrator | in-sync | missing | in-sync | missing |
| developer | in-sync | missing | in-sync | missing |
| plan-validator | in-sync | missing | in-sync | missing |
| policy-auditor | in-sync | missing | in-sync | missing |
| qc-auditor | in-sync | missing | in-sync | missing |
| requirements-scanner | in-sync | missing | in-sync | missing |
| spec-validator | in-sync | missing | in-sync | missing |
| story-verifier | in-sync | missing | in-sync | missing |
| task-tracker | in-sync | missing | in-sync | missing |
| tasks-validator | in-sync | missing | in-sync | missing |
| technical-researcher | in-sync | missing | in-sync | missing |
| test-evaluator | in-sync | missing | in-sync | missing |
| test-planner | in-sync | missing | in-sync | missing |
| wbs-generator | in-sync | missing | in-sync | missing |
| business-analyst | normalized-drift | n/a | normalized-drift | n/a |
| compliance-auditor | normalized-drift | n/a | normalized-drift | n/a |
| devops-strategist | normalized-drift | n/a | normalized-drift | n/a |
| environment-setup | normalized-drift | n/a | in-sync | n/a |
| product-manager | normalized-drift | n/a | normalized-drift | n/a |
| product-strategist | normalized-drift | n/a | normalized-drift | n/a |
| project-amender | normalized-drift | n/a | normalized-drift | n/a |
| project-initializer | normalized-drift | n/a | normalized-drift | n/a |
| project-manager | normalized-drift | n/a | normalized-drift | n/a |
| project-planner | normalized-drift | n/a | in-sync | n/a |
| prototype-retrospective-analyst | normalized-drift | n/a | normalized-drift | n/a |
| qa-engineer | normalized-drift | n/a | normalized-drift | n/a |
| qc-agent | normalized-drift | n/a | normalized-drift | n/a |
| software-architect | normalized-drift | n/a | normalized-drift | n/a |
| software-engineer | normalized-drift | n/a | normalized-drift | n/a |
| solution-architect | normalized-drift | n/a | normalized-drift | n/a |

## Findings

- [stale-reference] workflow :: sddp-prd :: Copilot :: .github/prompts/sddp-prd.prompt.md :: Copilot prompt is missing
- [missing] workflow :: sddp-prd :: Claude :: .claude/skills/sddp-prd/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-prd :: Codex :: .agents/skills/sddp-prd/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-prd :: Antigravity :: .agents/workflows/sddp-prd.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-prd :: Windsurf :: .windsurf/workflows/sddp-prd.md :: Expected wrapper file is missing
- [stale-reference] workflow :: sddp-systemdesign :: Copilot :: .github/prompts/sddp-systemdesign.prompt.md :: Copilot prompt is missing
- [missing] workflow :: sddp-systemdesign :: Claude :: .claude/skills/sddp-systemdesign/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-systemdesign :: Codex :: .agents/skills/sddp-systemdesign/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-systemdesign :: Antigravity :: .agents/workflows/sddp-systemdesign.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-systemdesign :: Windsurf :: .windsurf/workflows/sddp-systemdesign.md :: Expected wrapper file is missing
- [stale-reference] workflow :: sddp-devops :: Copilot :: .github/prompts/sddp-devops.prompt.md :: Copilot prompt is missing
- [missing] workflow :: sddp-devops :: Claude :: .claude/skills/sddp-devops/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-devops :: Codex :: .agents/skills/sddp-devops/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-devops :: Antigravity :: .agents/workflows/sddp-devops.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-devops :: Windsurf :: .windsurf/workflows/sddp-devops.md :: Expected wrapper file is missing
- [stale-reference] workflow :: sddp-projectplan :: Copilot :: .github/prompts/sddp-projectplan.prompt.md :: Copilot prompt is missing
- [missing] workflow :: sddp-projectplan :: Claude :: .claude/skills/sddp-projectplan/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-projectplan :: Codex :: .agents/skills/sddp-projectplan/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-projectplan :: Antigravity :: .agents/workflows/sddp-projectplan.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-projectplan :: Windsurf :: .windsurf/workflows/sddp-projectplan.md :: Expected wrapper file is missing
- [stale-reference] workflow :: sddp-amend :: Copilot :: .github/prompts/sddp-amend.prompt.md :: Copilot prompt is missing
- [missing] workflow :: sddp-amend :: Claude :: .claude/skills/sddp-amend/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-amend :: Codex :: .agents/skills/sddp-amend/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-amend :: Antigravity :: .agents/workflows/sddp-amend.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-amend :: Windsurf :: .windsurf/workflows/sddp-amend.md :: Expected wrapper file is missing
- [stale-reference] workflow :: sddp-init :: Copilot :: .github/prompts/sddp-init.prompt.md :: Copilot prompt is missing
- [missing] workflow :: sddp-init :: Claude :: .claude/skills/sddp-init/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-init :: Codex :: .agents/skills/sddp-init/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-init :: Antigravity :: .agents/workflows/sddp-init.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-init :: Windsurf :: .windsurf/workflows/sddp-init.md :: Expected wrapper file is missing
- [stale-reference] workflow :: sddp-regen :: Copilot :: .github/prompts/sddp-regen.prompt.md :: Copilot prompt is missing
- [missing] workflow :: sddp-regen :: Claude :: .claude/skills/sddp-regen/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-regen :: Codex :: .agents/skills/sddp-regen/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-regen :: Antigravity :: .agents/workflows/sddp-regen.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-regen :: Windsurf :: .windsurf/workflows/sddp-regen.md :: Expected wrapper file is missing
- [stale-reference] workflow :: sddp-specify :: Copilot :: .github/prompts/sddp-specify.prompt.md :: Copilot prompt is missing
- [missing] workflow :: sddp-specify :: Claude :: .claude/skills/sddp-specify/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-specify :: Codex :: .agents/skills/sddp-specify/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-specify :: Antigravity :: .agents/workflows/sddp-specify.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-specify :: Windsurf :: .windsurf/workflows/sddp-specify.md :: Expected wrapper file is missing
- [stale-reference] workflow :: sddp-clarify :: Copilot :: .github/prompts/sddp-clarify.prompt.md :: Copilot prompt is missing
- [missing] workflow :: sddp-clarify :: Claude :: .claude/skills/sddp-clarify/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-clarify :: Codex :: .agents/skills/sddp-clarify/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-clarify :: Antigravity :: .agents/workflows/sddp-clarify.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-clarify :: Windsurf :: .windsurf/workflows/sddp-clarify.md :: Expected wrapper file is missing
- [stale-reference] workflow :: sddp-plan :: Copilot :: .github/prompts/sddp-plan.prompt.md :: Copilot prompt is missing
- [missing] workflow :: sddp-plan :: Claude :: .claude/skills/sddp-plan/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-plan :: Codex :: .agents/skills/sddp-plan/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-plan :: Antigravity :: .agents/workflows/sddp-plan.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-plan :: Windsurf :: .windsurf/workflows/sddp-plan.md :: Expected wrapper file is missing
- [stale-reference] workflow :: sddp-checklist :: Copilot :: .github/prompts/sddp-checklist.prompt.md :: Copilot prompt is missing
- [missing] workflow :: sddp-checklist :: Claude :: .claude/skills/sddp-checklist/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-checklist :: Codex :: .agents/skills/sddp-checklist/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-checklist :: Antigravity :: .agents/workflows/sddp-checklist.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-checklist :: Windsurf :: .windsurf/workflows/sddp-checklist.md :: Expected wrapper file is missing
- [stale-reference] workflow :: sddp-tasks :: Copilot :: .github/prompts/sddp-tasks.prompt.md :: Copilot prompt is missing
- [missing] workflow :: sddp-tasks :: Claude :: .claude/skills/sddp-tasks/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-tasks :: Codex :: .agents/skills/sddp-tasks/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-tasks :: Antigravity :: .agents/workflows/sddp-tasks.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-tasks :: Windsurf :: .windsurf/workflows/sddp-tasks.md :: Expected wrapper file is missing
- [stale-reference] workflow :: sddp-analyze :: Copilot :: .github/prompts/sddp-analyze.prompt.md :: Copilot prompt is missing
- [missing] workflow :: sddp-analyze :: Claude :: .claude/skills/sddp-analyze/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-analyze :: Codex :: .agents/skills/sddp-analyze/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-analyze :: Antigravity :: .agents/workflows/sddp-analyze.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-analyze :: Windsurf :: .windsurf/workflows/sddp-analyze.md :: Expected wrapper file is missing
- [stale-reference] workflow :: sddp-implement :: Copilot :: .github/prompts/sddp-implement.prompt.md :: Copilot prompt is missing
- [missing] workflow :: sddp-implement :: Claude :: .claude/skills/sddp-implement/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-implement :: Codex :: .agents/skills/sddp-implement/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-implement :: Antigravity :: .agents/workflows/sddp-implement.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-implement :: Windsurf :: .windsurf/workflows/sddp-implement.md :: Expected wrapper file is missing
- [stale-reference] workflow :: sddp-qc :: Copilot :: .github/prompts/sddp-qc.prompt.md :: Copilot prompt is missing
- [missing] workflow :: sddp-qc :: Claude :: .claude/skills/sddp-qc/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-qc :: Codex :: .agents/skills/sddp-qc/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-qc :: Antigravity :: .agents/workflows/sddp-qc.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-qc :: Windsurf :: .windsurf/workflows/sddp-qc.md :: Expected wrapper file is missing
- [stale-reference] workflow :: sddp-implement-qc-loop :: Copilot :: .github/prompts/sddp-implement-qc-loop.prompt.md :: Copilot prompt is missing
- [missing] workflow :: sddp-implement-qc-loop :: Claude :: .claude/skills/sddp-implement-qc-loop/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-implement-qc-loop :: Codex :: .agents/skills/sddp-implement-qc-loop/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-implement-qc-loop :: Antigravity :: .agents/workflows/sddp-implement-qc-loop.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-implement-qc-loop :: Windsurf :: .windsurf/workflows/sddp-implement-qc-loop.md :: Expected wrapper file is missing
- [stale-reference] workflow :: sddp-devsetup :: Copilot :: .github/prompts/sddp-devsetup.prompt.md :: Copilot prompt is missing
- [missing] workflow :: sddp-devsetup :: Claude :: .claude/skills/sddp-devsetup/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-devsetup :: Codex :: .agents/skills/sddp-devsetup/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-devsetup :: Antigravity :: .agents/workflows/sddp-devsetup.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-devsetup :: Windsurf :: .windsurf/workflows/sddp-devsetup.md :: Expected wrapper file is missing
- [stale-reference] workflow :: sddp-autopilot :: Copilot :: .github/prompts/sddp-autopilot.prompt.md :: Copilot prompt is missing
- [missing] workflow :: sddp-autopilot :: Claude :: .claude/skills/sddp-autopilot/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-autopilot :: Codex :: .agents/skills/sddp-autopilot/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-autopilot :: Antigravity :: .agents/workflows/sddp-autopilot.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-autopilot :: Windsurf :: .windsurf/workflows/sddp-autopilot.md :: Expected wrapper file is missing
- [missing] agent :: adr-author :: Codex :: (no file) :: Expected wrapper is missing
- [missing] agent :: adversarial-scanner :: Codex :: (no file) :: Expected wrapper is missing
- [missing] agent :: api-designer :: Codex :: (no file) :: Expected wrapper is missing
- [missing] agent :: checklist-reader :: Codex :: (no file) :: Expected wrapper is missing
- [missing] agent :: configuration-auditor :: Codex :: (no file) :: Expected wrapper is missing
- [missing] agent :: context-gatherer :: Codex :: (no file) :: Expected wrapper is missing
- [missing] agent :: database-administrator :: Codex :: (no file) :: Expected wrapper is missing
- [missing] agent :: developer :: Codex :: (no file) :: Expected wrapper is missing
- [missing] agent :: plan-validator :: Codex :: (no file) :: Expected wrapper is missing
- [missing] agent :: policy-auditor :: Codex :: (no file) :: Expected wrapper is missing
- [missing] agent :: qc-auditor :: Codex :: (no file) :: Expected wrapper is missing
- [missing] agent :: requirements-scanner :: Codex :: (no file) :: Expected wrapper is missing
- [missing] agent :: spec-validator :: Codex :: (no file) :: Expected wrapper is missing
- [missing] agent :: story-verifier :: Codex :: (no file) :: Expected wrapper is missing
- [missing] agent :: task-tracker :: Codex :: (no file) :: Expected wrapper is missing
- [missing] agent :: tasks-validator :: Codex :: (no file) :: Expected wrapper is missing
- [missing] agent :: technical-researcher :: Codex :: (no file) :: Expected wrapper is missing
- [missing] agent :: test-evaluator :: Codex :: (no file) :: Expected wrapper is missing
- [missing] agent :: test-planner :: Codex :: (no file) :: Expected wrapper is missing
- [missing] agent :: wbs-generator :: Codex :: (no file) :: Expected wrapper is missing
- [normalized-drift] agent :: business-analyst :: Canonical Agent Registry :: .github/agents/business-analyst.md :: Expected canonical agent file is missing
- [normalized-drift] agent :: business-analyst :: OpenCode Agent :: .opencode/agents/sddp-business-analyst.md :: Unexpected delegates: adversarial-scanner, context-gatherer, requirements-scanner, technical-researcher
- [normalized-drift] agent :: compliance-auditor :: Canonical Agent Registry :: .github/agents/compliance-auditor.md :: Expected canonical agent file is missing
- [normalized-drift] agent :: compliance-auditor :: OpenCode Agent :: .opencode/agents/sddp-compliance-auditor.md :: Unexpected delegates: context-gatherer, policy-auditor, spec-validator, task-tracker
- [normalized-drift] agent :: devops-strategist :: Canonical Agent Registry :: .github/agents/devops-strategist.md :: Expected canonical agent file is missing
- [normalized-drift] agent :: devops-strategist :: OpenCode Agent :: .opencode/agents/sddp-devops-strategist.md :: Unexpected delegates: technical-researcher
- [normalized-drift] agent :: environment-setup :: Canonical Agent Registry :: .github/agents/environment-setup.md :: Expected canonical agent file is missing
- [normalized-drift] agent :: product-manager :: Canonical Agent Registry :: .github/agents/product-manager.md :: Expected canonical agent file is missing
- [normalized-drift] agent :: product-manager :: OpenCode Agent :: .opencode/agents/sddp-product-manager.md :: Unexpected delegates: context-gatherer, policy-auditor, spec-validator, technical-researcher
- [normalized-drift] agent :: product-strategist :: Canonical Agent Registry :: .github/agents/product-strategist.md :: Expected canonical agent file is missing
- [normalized-drift] agent :: product-strategist :: OpenCode Agent :: .opencode/agents/sddp-product-strategist.md :: Unexpected delegates: technical-researcher
- [normalized-drift] agent :: project-amender :: Canonical Agent Registry :: .github/agents/project-amender.md :: Expected canonical agent file is missing
- [normalized-drift] agent :: project-amender :: OpenCode Agent :: .opencode/agents/sddp-project-amender.md :: Unexpected delegates: adr-author, configuration-auditor, technical-researcher
- [normalized-drift] agent :: project-initializer :: Canonical Agent Registry :: .github/agents/project-initializer.md :: Expected canonical agent file is missing
- [normalized-drift] agent :: project-initializer :: OpenCode Agent :: .opencode/agents/sddp-project-initializer.md :: Unexpected delegates: configuration-auditor, technical-researcher
- [normalized-drift] agent :: project-manager :: Canonical Agent Registry :: .github/agents/project-manager.md :: Expected canonical agent file is missing
- [normalized-drift] agent :: project-manager :: OpenCode Agent :: .opencode/agents/sddp-project-manager.md :: Unexpected delegates: context-gatherer, plan-validator, task-tracker, wbs-generator
- [normalized-drift] agent :: project-planner :: Canonical Agent Registry :: .github/agents/project-planner.md :: Expected canonical agent file is missing
- [normalized-drift] agent :: prototype-retrospective-analyst :: Canonical Agent Registry :: .github/agents/prototype-retrospective-analyst.md :: Expected canonical agent file is missing
- [normalized-drift] agent :: prototype-retrospective-analyst :: OpenCode Agent :: .opencode/agents/sddp-prototype-retrospective-analyst.md :: Unexpected delegates: adr-author, configuration-auditor, technical-researcher
- [normalized-drift] agent :: qa-engineer :: Canonical Agent Registry :: .github/agents/qa-engineer.md :: Expected canonical agent file is missing
- [normalized-drift] agent :: qa-engineer :: OpenCode Agent :: .opencode/agents/sddp-qa-engineer.md :: Unexpected delegates: context-gatherer, technical-researcher, test-evaluator, test-planner
- [normalized-drift] agent :: qc-agent :: Canonical Agent Registry :: .github/agents/qc-agent.md :: Expected canonical agent file is missing
- [normalized-drift] agent :: qc-agent :: OpenCode Agent :: .opencode/agents/sddp-qc-agent.md :: Unexpected delegates: context-gatherer, policy-auditor, qc-auditor, story-verifier
- [normalized-drift] agent :: software-architect :: Canonical Agent Registry :: .github/agents/software-architect.md :: Expected canonical agent file is missing
- [normalized-drift] agent :: software-architect :: OpenCode Agent :: .opencode/agents/sddp-software-architect.md :: Unexpected delegates: adr-author, api-designer, context-gatherer, database-administrator, policy-auditor, spec-validator, technical-researcher
- [normalized-drift] agent :: software-engineer :: Canonical Agent Registry :: .github/agents/software-engineer.md :: Expected canonical agent file is missing
- [normalized-drift] agent :: software-engineer :: OpenCode Agent :: .opencode/agents/sddp-software-engineer.md :: Unexpected delegates: adr-author, adversarial-scanner, api-designer, checklist-reader, context-gatherer, database-administrator, developer, plan-validator, policy-auditor, qc-auditor, requirements-scanner, spec-validator, story-verifier, task-tracker, tasks-validator, technical-researcher, test-evaluator, test-planner, wbs-generator
- [normalized-drift] agent :: solution-architect :: Canonical Agent Registry :: .github/agents/solution-architect.md :: Expected canonical agent file is missing
- [normalized-drift] agent :: solution-architect :: OpenCode Agent :: .opencode/agents/sddp-solution-architect.md :: Unexpected delegates: adr-author, technical-researcher
- [missing] agent :: sddp-adr-author :: Claude Agent Graph :: .claude/agents/sddp-adr-author.md :: Registered Claude agent wrapper is missing; registered independently of command reachability
- [missing] agent :: sddp-adversarial-scanner :: Claude Agent Graph :: .claude/agents/sddp-adversarial-scanner.md :: Registered Claude agent wrapper is missing; registered independently of command reachability
- [missing] agent :: sddp-api-designer :: Claude Agent Graph :: .claude/agents/sddp-api-designer.md :: Registered Claude agent wrapper is missing; registered independently of command reachability
- [missing] agent :: sddp-checklist-reader :: Claude Agent Graph :: .claude/agents/sddp-checklist-reader.md :: Registered Claude agent wrapper is missing; registered independently of command reachability
- [missing] agent :: sddp-configuration-auditor :: Claude Agent Graph :: .claude/agents/sddp-configuration-auditor.md :: Registered Claude agent wrapper is missing; registered independently of command reachability
- [missing] agent :: sddp-context-gatherer :: Claude Agent Graph :: .claude/agents/sddp-context-gatherer.md :: Registered Claude agent wrapper is missing; registered independently of command reachability
- [missing] agent :: sddp-database-administrator :: Claude Agent Graph :: .claude/agents/sddp-database-administrator.md :: Registered Claude agent wrapper is missing; registered independently of command reachability
- [missing] agent :: sddp-developer :: Claude Agent Graph :: .claude/agents/sddp-developer.md :: Registered Claude agent wrapper is missing; registered independently of command reachability
- [missing] agent :: sddp-plan-validator :: Claude Agent Graph :: .claude/agents/sddp-plan-validator.md :: Registered Claude agent wrapper is missing; registered independently of command reachability
- [missing] agent :: sddp-policy-auditor :: Claude Agent Graph :: .claude/agents/sddp-policy-auditor.md :: Registered Claude agent wrapper is missing; registered independently of command reachability
- [missing] agent :: sddp-qc-auditor :: Claude Agent Graph :: .claude/agents/sddp-qc-auditor.md :: Registered Claude agent wrapper is missing; registered independently of command reachability
- [missing] agent :: sddp-requirements-scanner :: Claude Agent Graph :: .claude/agents/sddp-requirements-scanner.md :: Registered Claude agent wrapper is missing; registered independently of command reachability
- [missing] agent :: sddp-spec-validator :: Claude Agent Graph :: .claude/agents/sddp-spec-validator.md :: Registered Claude agent wrapper is missing; registered independently of command reachability
- [missing] agent :: sddp-story-verifier :: Claude Agent Graph :: .claude/agents/sddp-story-verifier.md :: Registered Claude agent wrapper is missing; registered independently of command reachability
- [missing] agent :: sddp-task-tracker :: Claude Agent Graph :: .claude/agents/sddp-task-tracker.md :: Registered Claude agent wrapper is missing; registered independently of command reachability
- [missing] agent :: sddp-tasks-validator :: Claude Agent Graph :: .claude/agents/sddp-tasks-validator.md :: Registered Claude agent wrapper is missing; registered independently of command reachability
- [missing] agent :: sddp-technical-researcher :: Claude Agent Graph :: .claude/agents/sddp-technical-researcher.md :: Registered Claude agent wrapper is missing; registered independently of command reachability
- [missing] agent :: sddp-test-evaluator :: Claude Agent Graph :: .claude/agents/sddp-test-evaluator.md :: Registered Claude agent wrapper is missing; registered independently of command reachability
- [missing] agent :: sddp-test-planner :: Claude Agent Graph :: .claude/agents/sddp-test-planner.md :: Registered Claude agent wrapper is missing; registered independently of command reachability
- [missing] agent :: sddp-wbs-generator :: Claude Agent Graph :: .claude/agents/sddp-wbs-generator.md :: Registered Claude agent wrapper is missing; registered independently of command reachability
- [stale-reference] workflow :: sddp-prd :: Copilot Delegate Graph :: .github/prompts/sddp-prd.prompt.md :: Copilot prompt is missing
- [stale-reference] workflow :: sddp-systemdesign :: Copilot Delegate Graph :: .github/prompts/sddp-systemdesign.prompt.md :: Copilot prompt is missing
- [stale-reference] workflow :: sddp-devops :: Copilot Delegate Graph :: .github/prompts/sddp-devops.prompt.md :: Copilot prompt is missing
- [stale-reference] workflow :: sddp-projectplan :: Copilot Delegate Graph :: .github/prompts/sddp-projectplan.prompt.md :: Copilot prompt is missing
- [stale-reference] workflow :: sddp-amend :: Copilot Delegate Graph :: .github/prompts/sddp-amend.prompt.md :: Copilot prompt is missing
- [stale-reference] workflow :: sddp-init :: Copilot Delegate Graph :: .github/prompts/sddp-init.prompt.md :: Copilot prompt is missing
- [stale-reference] workflow :: sddp-regen :: Copilot Delegate Graph :: .github/prompts/sddp-regen.prompt.md :: Copilot prompt is missing
- [stale-reference] workflow :: sddp-specify :: Copilot Delegate Graph :: .github/prompts/sddp-specify.prompt.md :: Copilot prompt is missing
- [stale-reference] workflow :: sddp-clarify :: Copilot Delegate Graph :: .github/prompts/sddp-clarify.prompt.md :: Copilot prompt is missing
- [stale-reference] workflow :: sddp-plan :: Copilot Delegate Graph :: .github/prompts/sddp-plan.prompt.md :: Copilot prompt is missing
- [stale-reference] workflow :: sddp-checklist :: Copilot Delegate Graph :: .github/prompts/sddp-checklist.prompt.md :: Copilot prompt is missing
- [stale-reference] workflow :: sddp-tasks :: Copilot Delegate Graph :: .github/prompts/sddp-tasks.prompt.md :: Copilot prompt is missing
- [stale-reference] workflow :: sddp-analyze :: Copilot Delegate Graph :: .github/prompts/sddp-analyze.prompt.md :: Copilot prompt is missing
- [stale-reference] workflow :: sddp-implement :: Copilot Delegate Graph :: .github/prompts/sddp-implement.prompt.md :: Copilot prompt is missing
- [stale-reference] workflow :: sddp-qc :: Copilot Delegate Graph :: .github/prompts/sddp-qc.prompt.md :: Copilot prompt is missing
- [stale-reference] workflow :: sddp-implement-qc-loop :: Copilot Delegate Graph :: .github/prompts/sddp-implement-qc-loop.prompt.md :: Copilot prompt is missing
- [stale-reference] workflow :: sddp-devsetup :: Copilot Delegate Graph :: .github/prompts/sddp-devsetup.prompt.md :: Copilot prompt is missing
- [stale-reference] workflow :: sddp-autopilot :: Copilot Delegate Graph :: .github/prompts/sddp-autopilot.prompt.md :: Copilot prompt is missing
- [missing] workflow :: sddp-prd :: Copilot Recommendation :: .vscode/settings.json :: Expected prompt recommendation is missing
- [missing] workflow :: sddp-systemdesign :: Copilot Recommendation :: .vscode/settings.json :: Expected prompt recommendation is missing
- [missing] workflow :: sddp-devops :: Copilot Recommendation :: .vscode/settings.json :: Expected prompt recommendation is missing
- [missing] workflow :: sddp-projectplan :: Copilot Recommendation :: .vscode/settings.json :: Expected prompt recommendation is missing
- [missing] workflow :: sddp-amend :: Copilot Recommendation :: .vscode/settings.json :: Expected prompt recommendation is missing
- [missing] workflow :: sddp-init :: Copilot Recommendation :: .vscode/settings.json :: Expected prompt recommendation is missing
- [missing] workflow :: sddp-regen :: Copilot Recommendation :: .vscode/settings.json :: Expected prompt recommendation is missing
- [missing] workflow :: sddp-specify :: Copilot Recommendation :: .vscode/settings.json :: Expected prompt recommendation is missing
- [missing] workflow :: sddp-clarify :: Copilot Recommendation :: .vscode/settings.json :: Expected prompt recommendation is missing
- [missing] workflow :: sddp-plan :: Copilot Recommendation :: .vscode/settings.json :: Expected prompt recommendation is missing
- [missing] workflow :: sddp-checklist :: Copilot Recommendation :: .vscode/settings.json :: Expected prompt recommendation is missing
- [missing] workflow :: sddp-tasks :: Copilot Recommendation :: .vscode/settings.json :: Expected prompt recommendation is missing
- [missing] workflow :: sddp-analyze :: Copilot Recommendation :: .vscode/settings.json :: Expected prompt recommendation is missing
- [missing] workflow :: sddp-implement :: Copilot Recommendation :: .vscode/settings.json :: Expected prompt recommendation is missing
- [missing] workflow :: sddp-qc :: Copilot Recommendation :: .vscode/settings.json :: Expected prompt recommendation is missing
- [missing] workflow :: sddp-implement-qc-loop :: Copilot Recommendation :: .vscode/settings.json :: Expected prompt recommendation is missing
- [missing] workflow :: sddp-devsetup :: Copilot Recommendation :: .vscode/settings.json :: Expected prompt recommendation is missing
- [missing] workflow :: sddp-autopilot :: Copilot Recommendation :: .vscode/settings.json :: Expected prompt recommendation is missing
- [missing] workflow :: sddp-prd :: Copilot :: .github/prompts/sddp-prd.prompt.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-systemdesign :: Copilot :: .github/prompts/sddp-systemdesign.prompt.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-devops :: Copilot :: .github/prompts/sddp-devops.prompt.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-projectplan :: Copilot :: .github/prompts/sddp-projectplan.prompt.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-amend :: Copilot :: .github/prompts/sddp-amend.prompt.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-init :: Copilot :: .github/prompts/sddp-init.prompt.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-regen :: Copilot :: .github/prompts/sddp-regen.prompt.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-specify :: Copilot :: .github/prompts/sddp-specify.prompt.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-clarify :: Copilot :: .github/prompts/sddp-clarify.prompt.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-plan :: Copilot :: .github/prompts/sddp-plan.prompt.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-checklist :: Copilot :: .github/prompts/sddp-checklist.prompt.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-tasks :: Copilot :: .github/prompts/sddp-tasks.prompt.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-analyze :: Copilot :: .github/prompts/sddp-analyze.prompt.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-implement :: Copilot :: .github/prompts/sddp-implement.prompt.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-qc :: Copilot :: .github/prompts/sddp-qc.prompt.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-implement-qc-loop :: Copilot :: .github/prompts/sddp-implement-qc-loop.prompt.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-devsetup :: Copilot :: .github/prompts/sddp-devsetup.prompt.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-autopilot :: Copilot :: .github/prompts/sddp-autopilot.prompt.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-prd :: Claude :: .claude/skills/sddp-prd/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-systemdesign :: Claude :: .claude/skills/sddp-systemdesign/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-devops :: Claude :: .claude/skills/sddp-devops/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-projectplan :: Claude :: .claude/skills/sddp-projectplan/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-amend :: Claude :: .claude/skills/sddp-amend/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-init :: Claude :: .claude/skills/sddp-init/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-regen :: Claude :: .claude/skills/sddp-regen/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-specify :: Claude :: .claude/skills/sddp-specify/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-clarify :: Claude :: .claude/skills/sddp-clarify/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-plan :: Claude :: .claude/skills/sddp-plan/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-checklist :: Claude :: .claude/skills/sddp-checklist/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-tasks :: Claude :: .claude/skills/sddp-tasks/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-analyze :: Claude :: .claude/skills/sddp-analyze/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-implement :: Claude :: .claude/skills/sddp-implement/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-qc :: Claude :: .claude/skills/sddp-qc/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-implement-qc-loop :: Claude :: .claude/skills/sddp-implement-qc-loop/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-devsetup :: Claude :: .claude/skills/sddp-devsetup/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-autopilot :: Claude :: .claude/skills/sddp-autopilot/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-prd :: Codex :: .agents/skills/sddp-prd/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-systemdesign :: Codex :: .agents/skills/sddp-systemdesign/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-devops :: Codex :: .agents/skills/sddp-devops/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-projectplan :: Codex :: .agents/skills/sddp-projectplan/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-amend :: Codex :: .agents/skills/sddp-amend/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-init :: Codex :: .agents/skills/sddp-init/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-regen :: Codex :: .agents/skills/sddp-regen/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-specify :: Codex :: .agents/skills/sddp-specify/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-clarify :: Codex :: .agents/skills/sddp-clarify/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-plan :: Codex :: .agents/skills/sddp-plan/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-checklist :: Codex :: .agents/skills/sddp-checklist/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-tasks :: Codex :: .agents/skills/sddp-tasks/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-analyze :: Codex :: .agents/skills/sddp-analyze/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-implement :: Codex :: .agents/skills/sddp-implement/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-qc :: Codex :: .agents/skills/sddp-qc/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-implement-qc-loop :: Codex :: .agents/skills/sddp-implement-qc-loop/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-devsetup :: Codex :: .agents/skills/sddp-devsetup/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-autopilot :: Codex :: .agents/skills/sddp-autopilot/SKILL.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-prd :: Antigravity :: .agents/workflows/sddp-prd.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-systemdesign :: Antigravity :: .agents/workflows/sddp-systemdesign.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-devops :: Antigravity :: .agents/workflows/sddp-devops.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-projectplan :: Antigravity :: .agents/workflows/sddp-projectplan.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-amend :: Antigravity :: .agents/workflows/sddp-amend.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-init :: Antigravity :: .agents/workflows/sddp-init.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-regen :: Antigravity :: .agents/workflows/sddp-regen.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-specify :: Antigravity :: .agents/workflows/sddp-specify.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-clarify :: Antigravity :: .agents/workflows/sddp-clarify.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-plan :: Antigravity :: .agents/workflows/sddp-plan.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-checklist :: Antigravity :: .agents/workflows/sddp-checklist.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-tasks :: Antigravity :: .agents/workflows/sddp-tasks.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-analyze :: Antigravity :: .agents/workflows/sddp-analyze.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-implement :: Antigravity :: .agents/workflows/sddp-implement.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-qc :: Antigravity :: .agents/workflows/sddp-qc.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-implement-qc-loop :: Antigravity :: .agents/workflows/sddp-implement-qc-loop.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-devsetup :: Antigravity :: .agents/workflows/sddp-devsetup.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-autopilot :: Antigravity :: .agents/workflows/sddp-autopilot.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-prd :: Windsurf :: .windsurf/workflows/sddp-prd.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-systemdesign :: Windsurf :: .windsurf/workflows/sddp-systemdesign.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-devops :: Windsurf :: .windsurf/workflows/sddp-devops.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-projectplan :: Windsurf :: .windsurf/workflows/sddp-projectplan.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-amend :: Windsurf :: .windsurf/workflows/sddp-amend.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-init :: Windsurf :: .windsurf/workflows/sddp-init.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-regen :: Windsurf :: .windsurf/workflows/sddp-regen.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-specify :: Windsurf :: .windsurf/workflows/sddp-specify.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-clarify :: Windsurf :: .windsurf/workflows/sddp-clarify.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-plan :: Windsurf :: .windsurf/workflows/sddp-plan.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-checklist :: Windsurf :: .windsurf/workflows/sddp-checklist.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-tasks :: Windsurf :: .windsurf/workflows/sddp-tasks.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-analyze :: Windsurf :: .windsurf/workflows/sddp-analyze.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-implement :: Windsurf :: .windsurf/workflows/sddp-implement.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-qc :: Windsurf :: .windsurf/workflows/sddp-qc.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-implement-qc-loop :: Windsurf :: .windsurf/workflows/sddp-implement-qc-loop.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-devsetup :: Windsurf :: .windsurf/workflows/sddp-devsetup.md :: Expected wrapper file is missing
- [missing] workflow :: sddp-autopilot :: Windsurf :: .windsurf/workflows/sddp-autopilot.md :: Expected wrapper file is missing
- [normalized-drift] workflow :: sddp-adr-author.md :: OpenCode Agent :: .opencode/agents/sddp-adr-author.md :: OpenCode Bash policy must match delegated-agent registry
- [normalized-drift] workflow :: sddp-adversarial-scanner.md :: OpenCode Agent :: .opencode/agents/sddp-adversarial-scanner.md :: OpenCode Bash policy must match delegated-agent registry
- [normalized-drift] workflow :: sddp-api-designer.md :: OpenCode Agent :: .opencode/agents/sddp-api-designer.md :: OpenCode Bash policy must match delegated-agent registry
- [normalized-drift] workflow :: sddp-business-analyst.md :: OpenCode Agent :: .opencode/agents/sddp-business-analyst.md :: OpenCode Bash policy must match delegated-agent registry
- [normalized-drift] workflow :: sddp-checklist-reader.md :: OpenCode Agent :: .opencode/agents/sddp-checklist-reader.md :: OpenCode Bash policy must match delegated-agent registry
- [normalized-drift] workflow :: sddp-compliance-auditor.md :: OpenCode Agent :: .opencode/agents/sddp-compliance-auditor.md :: OpenCode Bash policy must match delegated-agent registry
- [normalized-drift] workflow :: sddp-configuration-auditor.md :: OpenCode Agent :: .opencode/agents/sddp-configuration-auditor.md :: OpenCode Bash policy must match delegated-agent registry
- [normalized-drift] workflow :: sddp-database-administrator.md :: OpenCode Agent :: .opencode/agents/sddp-database-administrator.md :: OpenCode Bash policy must match delegated-agent registry
- [normalized-drift] workflow :: sddp-devops-strategist.md :: OpenCode Agent :: .opencode/agents/sddp-devops-strategist.md :: OpenCode Bash policy must match delegated-agent registry
- [normalized-drift] workflow :: sddp-policy-auditor.md :: OpenCode Agent :: .opencode/agents/sddp-policy-auditor.md :: OpenCode Bash policy must match delegated-agent registry
- [normalized-drift] workflow :: sddp-product-manager.md :: OpenCode Agent :: .opencode/agents/sddp-product-manager.md :: OpenCode Bash policy must match delegated-agent registry
- [normalized-drift] workflow :: sddp-product-strategist.md :: OpenCode Agent :: .opencode/agents/sddp-product-strategist.md :: OpenCode Bash policy must match delegated-agent registry
- [normalized-drift] workflow :: sddp-project-amender.md :: OpenCode Agent :: .opencode/agents/sddp-project-amender.md :: OpenCode Bash policy must match delegated-agent registry
- [normalized-drift] workflow :: sddp-project-initializer.md :: OpenCode Agent :: .opencode/agents/sddp-project-initializer.md :: OpenCode Bash policy must match delegated-agent registry
- [normalized-drift] workflow :: sddp-project-manager.md :: OpenCode Agent :: .opencode/agents/sddp-project-manager.md :: OpenCode Bash policy must match delegated-agent registry
- [normalized-drift] workflow :: sddp-project-planner.md :: OpenCode Agent :: .opencode/agents/sddp-project-planner.md :: OpenCode Bash policy must match delegated-agent registry
- [normalized-drift] workflow :: sddp-prototype-retrospective-analyst.md :: OpenCode Agent :: .opencode/agents/sddp-prototype-retrospective-analyst.md :: OpenCode Bash policy must match delegated-agent registry
- [normalized-drift] workflow :: sddp-qa-engineer.md :: OpenCode Agent :: .opencode/agents/sddp-qa-engineer.md :: OpenCode Bash policy must match delegated-agent registry
- [normalized-drift] workflow :: sddp-requirements-scanner.md :: OpenCode Agent :: .opencode/agents/sddp-requirements-scanner.md :: OpenCode Bash policy must match delegated-agent registry
- [normalized-drift] workflow :: sddp-story-verifier.md :: OpenCode Agent :: .opencode/agents/sddp-story-verifier.md :: OpenCode Bash policy must match delegated-agent registry
- [normalized-drift] workflow :: sddp-technical-researcher.md :: OpenCode Agent :: .opencode/agents/sddp-technical-researcher.md :: OpenCode Bash policy must match delegated-agent registry
- [normalized-drift] workflow :: sddp-test-evaluator.md :: OpenCode Agent :: .opencode/agents/sddp-test-evaluator.md :: OpenCode Bash policy must match delegated-agent registry
- [normalized-drift] workflow :: sddp-test-planner.md :: OpenCode Agent :: .opencode/agents/sddp-test-planner.md :: OpenCode Bash policy must match delegated-agent registry
- [normalized-drift] workflow :: sddp-wbs-generator.md :: OpenCode Agent :: .opencode/agents/sddp-wbs-generator.md :: OpenCode Bash policy must match delegated-agent registry
- [missing] workflow :: sddp-adr-author.md :: Claude Agent :: .claude/agents/sddp-adr-author.md :: Expected agent wrapper is missing
- [missing] workflow :: sddp-adversarial-scanner.md :: Claude Agent :: .claude/agents/sddp-adversarial-scanner.md :: Expected agent wrapper is missing
- [missing] workflow :: sddp-api-designer.md :: Claude Agent :: .claude/agents/sddp-api-designer.md :: Expected agent wrapper is missing
- [missing] workflow :: sddp-checklist-reader.md :: Claude Agent :: .claude/agents/sddp-checklist-reader.md :: Expected agent wrapper is missing
- [missing] workflow :: sddp-configuration-auditor.md :: Claude Agent :: .claude/agents/sddp-configuration-auditor.md :: Expected agent wrapper is missing
- [missing] workflow :: sddp-context-gatherer.md :: Claude Agent :: .claude/agents/sddp-context-gatherer.md :: Expected agent wrapper is missing
- [missing] workflow :: sddp-database-administrator.md :: Claude Agent :: .claude/agents/sddp-database-administrator.md :: Expected agent wrapper is missing
- [missing] workflow :: sddp-developer.md :: Claude Agent :: .claude/agents/sddp-developer.md :: Expected agent wrapper is missing
- [missing] workflow :: sddp-plan-validator.md :: Claude Agent :: .claude/agents/sddp-plan-validator.md :: Expected agent wrapper is missing
- [missing] workflow :: sddp-policy-auditor.md :: Claude Agent :: .claude/agents/sddp-policy-auditor.md :: Expected agent wrapper is missing
- [missing] workflow :: sddp-qc-auditor.md :: Claude Agent :: .claude/agents/sddp-qc-auditor.md :: Expected agent wrapper is missing
- [missing] workflow :: sddp-requirements-scanner.md :: Claude Agent :: .claude/agents/sddp-requirements-scanner.md :: Expected agent wrapper is missing
- [missing] workflow :: sddp-spec-validator.md :: Claude Agent :: .claude/agents/sddp-spec-validator.md :: Expected agent wrapper is missing
- [missing] workflow :: sddp-story-verifier.md :: Claude Agent :: .claude/agents/sddp-story-verifier.md :: Expected agent wrapper is missing
- [missing] workflow :: sddp-task-tracker.md :: Claude Agent :: .claude/agents/sddp-task-tracker.md :: Expected agent wrapper is missing
- [missing] workflow :: sddp-tasks-validator.md :: Claude Agent :: .claude/agents/sddp-tasks-validator.md :: Expected agent wrapper is missing
- [missing] workflow :: sddp-technical-researcher.md :: Claude Agent :: .claude/agents/sddp-technical-researcher.md :: Expected agent wrapper is missing
- [missing] workflow :: sddp-test-evaluator.md :: Claude Agent :: .claude/agents/sddp-test-evaluator.md :: Expected agent wrapper is missing
- [missing] workflow :: sddp-test-planner.md :: Claude Agent :: .claude/agents/sddp-test-planner.md :: Expected agent wrapper is missing
- [missing] workflow :: sddp-wbs-generator.md :: Claude Agent :: .claude/agents/sddp-wbs-generator.md :: Expected agent wrapper is missing
- [missing] workflow :: sddp-adr-author.toml :: Codex Agent :: .codex/agents/sddp-adr-author.toml :: Expected agent wrapper is missing
- [missing] workflow :: sddp-adversarial-scanner.toml :: Codex Agent :: .codex/agents/sddp-adversarial-scanner.toml :: Expected agent wrapper is missing
- [missing] workflow :: sddp-api-designer.toml :: Codex Agent :: .codex/agents/sddp-api-designer.toml :: Expected agent wrapper is missing
- [missing] workflow :: sddp-checklist-reader.toml :: Codex Agent :: .codex/agents/sddp-checklist-reader.toml :: Expected agent wrapper is missing
- [missing] workflow :: sddp-configuration-auditor.toml :: Codex Agent :: .codex/agents/sddp-configuration-auditor.toml :: Expected agent wrapper is missing
- [missing] workflow :: sddp-context-gatherer.toml :: Codex Agent :: .codex/agents/sddp-context-gatherer.toml :: Expected agent wrapper is missing
- [missing] workflow :: sddp-database-administrator.toml :: Codex Agent :: .codex/agents/sddp-database-administrator.toml :: Expected agent wrapper is missing
- [missing] workflow :: sddp-developer.toml :: Codex Agent :: .codex/agents/sddp-developer.toml :: Expected agent wrapper is missing
- [missing] workflow :: sddp-plan-validator.toml :: Codex Agent :: .codex/agents/sddp-plan-validator.toml :: Expected agent wrapper is missing
- [missing] workflow :: sddp-policy-auditor.toml :: Codex Agent :: .codex/agents/sddp-policy-auditor.toml :: Expected agent wrapper is missing
- [missing] workflow :: sddp-qc-auditor.toml :: Codex Agent :: .codex/agents/sddp-qc-auditor.toml :: Expected agent wrapper is missing
- [missing] workflow :: sddp-requirements-scanner.toml :: Codex Agent :: .codex/agents/sddp-requirements-scanner.toml :: Expected agent wrapper is missing
- [missing] workflow :: sddp-spec-validator.toml :: Codex Agent :: .codex/agents/sddp-spec-validator.toml :: Expected agent wrapper is missing
- [missing] workflow :: sddp-story-verifier.toml :: Codex Agent :: .codex/agents/sddp-story-verifier.toml :: Expected agent wrapper is missing
- [missing] workflow :: sddp-task-tracker.toml :: Codex Agent :: .codex/agents/sddp-task-tracker.toml :: Expected agent wrapper is missing
- [missing] workflow :: sddp-tasks-validator.toml :: Codex Agent :: .codex/agents/sddp-tasks-validator.toml :: Expected agent wrapper is missing
- [missing] workflow :: sddp-technical-researcher.toml :: Codex Agent :: .codex/agents/sddp-technical-researcher.toml :: Expected agent wrapper is missing
- [missing] workflow :: sddp-test-evaluator.toml :: Codex Agent :: .codex/agents/sddp-test-evaluator.toml :: Expected agent wrapper is missing
- [missing] workflow :: sddp-test-planner.toml :: Codex Agent :: .codex/agents/sddp-test-planner.toml :: Expected agent wrapper is missing
- [missing] workflow :: sddp-wbs-generator.toml :: Codex Agent :: .codex/agents/sddp-wbs-generator.toml :: Expected agent wrapper is missing

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
  sddp_prd_copilot["Copilot: stale-reference"]
  wf_sddp_prd --> sddp_prd_copilot
  class sddp_prd_copilot fail;
  sddp_prd_claude["Claude: missing"]
  wf_sddp_prd --> sddp_prd_claude
  class sddp_prd_claude fail;
  sddp_prd_agentsSkill["Codex: missing"]
  wf_sddp_prd --> sddp_prd_agentsSkill
  class sddp_prd_agentsSkill fail;
  sddp_prd_agentsWorkflow["Antigravity: missing"]
  wf_sddp_prd --> sddp_prd_agentsWorkflow
  class sddp_prd_agentsWorkflow fail;
  sddp_prd_openCodeCommand["OpenCode Command: in-sync"]
  wf_sddp_prd --> sddp_prd_openCodeCommand
  class sddp_prd_openCodeCommand ok;
  sddp_prd_windsurf["Windsurf: missing"]
  wf_sddp_prd --> sddp_prd_windsurf
  class sddp_prd_windsurf fail;
  class wf_sddp_prd neutral;
  wf_sddp_systemdesign["sddp-systemdesign -> system-design"]
  sddp_systemdesign_copilot["Copilot: stale-reference"]
  wf_sddp_systemdesign --> sddp_systemdesign_copilot
  class sddp_systemdesign_copilot fail;
  sddp_systemdesign_claude["Claude: missing"]
  wf_sddp_systemdesign --> sddp_systemdesign_claude
  class sddp_systemdesign_claude fail;
  sddp_systemdesign_agentsSkill["Codex: missing"]
  wf_sddp_systemdesign --> sddp_systemdesign_agentsSkill
  class sddp_systemdesign_agentsSkill fail;
  sddp_systemdesign_agentsWorkflow["Antigravity: missing"]
  wf_sddp_systemdesign --> sddp_systemdesign_agentsWorkflow
  class sddp_systemdesign_agentsWorkflow fail;
  sddp_systemdesign_openCodeCommand["OpenCode Command: in-sync"]
  wf_sddp_systemdesign --> sddp_systemdesign_openCodeCommand
  class sddp_systemdesign_openCodeCommand ok;
  sddp_systemdesign_windsurf["Windsurf: missing"]
  wf_sddp_systemdesign --> sddp_systemdesign_windsurf
  class sddp_systemdesign_windsurf fail;
  class wf_sddp_systemdesign neutral;
  wf_sddp_devops["sddp-devops -> deployment-operations"]
  sddp_devops_copilot["Copilot: stale-reference"]
  wf_sddp_devops --> sddp_devops_copilot
  class sddp_devops_copilot fail;
  sddp_devops_claude["Claude: missing"]
  wf_sddp_devops --> sddp_devops_claude
  class sddp_devops_claude fail;
  sddp_devops_agentsSkill["Codex: missing"]
  wf_sddp_devops --> sddp_devops_agentsSkill
  class sddp_devops_agentsSkill fail;
  sddp_devops_agentsWorkflow["Antigravity: missing"]
  wf_sddp_devops --> sddp_devops_agentsWorkflow
  class sddp_devops_agentsWorkflow fail;
  sddp_devops_openCodeCommand["OpenCode Command: in-sync"]
  wf_sddp_devops --> sddp_devops_openCodeCommand
  class sddp_devops_openCodeCommand ok;
  sddp_devops_windsurf["Windsurf: missing"]
  wf_sddp_devops --> sddp_devops_windsurf
  class sddp_devops_windsurf fail;
  class wf_sddp_devops neutral;
  wf_sddp_projectplan["sddp-projectplan -> project-planning"]
  sddp_projectplan_copilot["Copilot: stale-reference"]
  wf_sddp_projectplan --> sddp_projectplan_copilot
  class sddp_projectplan_copilot fail;
  sddp_projectplan_claude["Claude: missing"]
  wf_sddp_projectplan --> sddp_projectplan_claude
  class sddp_projectplan_claude fail;
  sddp_projectplan_agentsSkill["Codex: missing"]
  wf_sddp_projectplan --> sddp_projectplan_agentsSkill
  class sddp_projectplan_agentsSkill fail;
  sddp_projectplan_agentsWorkflow["Antigravity: missing"]
  wf_sddp_projectplan --> sddp_projectplan_agentsWorkflow
  class sddp_projectplan_agentsWorkflow fail;
  sddp_projectplan_openCodeCommand["OpenCode Command: in-sync"]
  wf_sddp_projectplan --> sddp_projectplan_openCodeCommand
  class sddp_projectplan_openCodeCommand ok;
  sddp_projectplan_windsurf["Windsurf: missing"]
  wf_sddp_projectplan --> sddp_projectplan_windsurf
  class sddp_projectplan_windsurf fail;
  class wf_sddp_projectplan neutral;
  wf_sddp_amend["sddp-amend -> amend-project"]
  sddp_amend_copilot["Copilot: stale-reference"]
  wf_sddp_amend --> sddp_amend_copilot
  class sddp_amend_copilot fail;
  sddp_amend_claude["Claude: missing"]
  wf_sddp_amend --> sddp_amend_claude
  class sddp_amend_claude fail;
  sddp_amend_agentsSkill["Codex: missing"]
  wf_sddp_amend --> sddp_amend_agentsSkill
  class sddp_amend_agentsSkill fail;
  sddp_amend_agentsWorkflow["Antigravity: missing"]
  wf_sddp_amend --> sddp_amend_agentsWorkflow
  class sddp_amend_agentsWorkflow fail;
  sddp_amend_openCodeCommand["OpenCode Command: in-sync"]
  wf_sddp_amend --> sddp_amend_openCodeCommand
  class sddp_amend_openCodeCommand ok;
  sddp_amend_windsurf["Windsurf: missing"]
  wf_sddp_amend --> sddp_amend_windsurf
  class sddp_amend_windsurf fail;
  class wf_sddp_amend neutral;
  wf_sddp_init["sddp-init -> init-project"]
  sddp_init_copilot["Copilot: stale-reference"]
  wf_sddp_init --> sddp_init_copilot
  class sddp_init_copilot fail;
  sddp_init_claude["Claude: missing"]
  wf_sddp_init --> sddp_init_claude
  class sddp_init_claude fail;
  sddp_init_agentsSkill["Codex: missing"]
  wf_sddp_init --> sddp_init_agentsSkill
  class sddp_init_agentsSkill fail;
  sddp_init_agentsWorkflow["Antigravity: missing"]
  wf_sddp_init --> sddp_init_agentsWorkflow
  class sddp_init_agentsWorkflow fail;
  sddp_init_openCodeCommand["OpenCode Command: in-sync"]
  wf_sddp_init --> sddp_init_openCodeCommand
  class sddp_init_openCodeCommand ok;
  sddp_init_windsurf["Windsurf: missing"]
  wf_sddp_init --> sddp_init_windsurf
  class sddp_init_windsurf fail;
  class wf_sddp_init neutral;
  wf_sddp_regen["sddp-regen -> prototype-regen"]
  sddp_regen_copilot["Copilot: stale-reference"]
  wf_sddp_regen --> sddp_regen_copilot
  class sddp_regen_copilot fail;
  sddp_regen_claude["Claude: missing"]
  wf_sddp_regen --> sddp_regen_claude
  class sddp_regen_claude fail;
  sddp_regen_agentsSkill["Codex: missing"]
  wf_sddp_regen --> sddp_regen_agentsSkill
  class sddp_regen_agentsSkill fail;
  sddp_regen_agentsWorkflow["Antigravity: missing"]
  wf_sddp_regen --> sddp_regen_agentsWorkflow
  class sddp_regen_agentsWorkflow fail;
  sddp_regen_openCodeCommand["OpenCode Command: in-sync"]
  wf_sddp_regen --> sddp_regen_openCodeCommand
  class sddp_regen_openCodeCommand ok;
  sddp_regen_windsurf["Windsurf: missing"]
  wf_sddp_regen --> sddp_regen_windsurf
  class sddp_regen_windsurf fail;
  class wf_sddp_regen neutral;
  wf_sddp_specify["sddp-specify -> specify-feature"]
  sddp_specify_copilot["Copilot: stale-reference"]
  wf_sddp_specify --> sddp_specify_copilot
  class sddp_specify_copilot fail;
  sddp_specify_claude["Claude: missing"]
  wf_sddp_specify --> sddp_specify_claude
  class sddp_specify_claude fail;
  sddp_specify_agentsSkill["Codex: missing"]
  wf_sddp_specify --> sddp_specify_agentsSkill
  class sddp_specify_agentsSkill fail;
  sddp_specify_agentsWorkflow["Antigravity: missing"]
  wf_sddp_specify --> sddp_specify_agentsWorkflow
  class sddp_specify_agentsWorkflow fail;
  sddp_specify_openCodeCommand["OpenCode Command: in-sync"]
  wf_sddp_specify --> sddp_specify_openCodeCommand
  class sddp_specify_openCodeCommand ok;
  sddp_specify_windsurf["Windsurf: missing"]
  wf_sddp_specify --> sddp_specify_windsurf
  class sddp_specify_windsurf fail;
  class wf_sddp_specify neutral;
  wf_sddp_clarify["sddp-clarify -> clarify-spec"]
  sddp_clarify_copilot["Copilot: stale-reference"]
  wf_sddp_clarify --> sddp_clarify_copilot
  class sddp_clarify_copilot fail;
  sddp_clarify_claude["Claude: missing"]
  wf_sddp_clarify --> sddp_clarify_claude
  class sddp_clarify_claude fail;
  sddp_clarify_agentsSkill["Codex: missing"]
  wf_sddp_clarify --> sddp_clarify_agentsSkill
  class sddp_clarify_agentsSkill fail;
  sddp_clarify_agentsWorkflow["Antigravity: missing"]
  wf_sddp_clarify --> sddp_clarify_agentsWorkflow
  class sddp_clarify_agentsWorkflow fail;
  sddp_clarify_openCodeCommand["OpenCode Command: in-sync"]
  wf_sddp_clarify --> sddp_clarify_openCodeCommand
  class sddp_clarify_openCodeCommand ok;
  sddp_clarify_windsurf["Windsurf: missing"]
  wf_sddp_clarify --> sddp_clarify_windsurf
  class sddp_clarify_windsurf fail;
  class wf_sddp_clarify neutral;
  wf_sddp_plan["sddp-plan -> plan-feature"]
  sddp_plan_copilot["Copilot: stale-reference"]
  wf_sddp_plan --> sddp_plan_copilot
  class sddp_plan_copilot fail;
  sddp_plan_claude["Claude: missing"]
  wf_sddp_plan --> sddp_plan_claude
  class sddp_plan_claude fail;
  sddp_plan_agentsSkill["Codex: missing"]
  wf_sddp_plan --> sddp_plan_agentsSkill
  class sddp_plan_agentsSkill fail;
  sddp_plan_agentsWorkflow["Antigravity: missing"]
  wf_sddp_plan --> sddp_plan_agentsWorkflow
  class sddp_plan_agentsWorkflow fail;
  sddp_plan_openCodeCommand["OpenCode Command: in-sync"]
  wf_sddp_plan --> sddp_plan_openCodeCommand
  class sddp_plan_openCodeCommand ok;
  sddp_plan_windsurf["Windsurf: missing"]
  wf_sddp_plan --> sddp_plan_windsurf
  class sddp_plan_windsurf fail;
  class wf_sddp_plan neutral;
  wf_sddp_checklist["sddp-checklist -> generate-checklist"]
  sddp_checklist_copilot["Copilot: stale-reference"]
  wf_sddp_checklist --> sddp_checklist_copilot
  class sddp_checklist_copilot fail;
  sddp_checklist_claude["Claude: missing"]
  wf_sddp_checklist --> sddp_checklist_claude
  class sddp_checklist_claude fail;
  sddp_checklist_agentsSkill["Codex: missing"]
  wf_sddp_checklist --> sddp_checklist_agentsSkill
  class sddp_checklist_agentsSkill fail;
  sddp_checklist_agentsWorkflow["Antigravity: missing"]
  wf_sddp_checklist --> sddp_checklist_agentsWorkflow
  class sddp_checklist_agentsWorkflow fail;
  sddp_checklist_openCodeCommand["OpenCode Command: in-sync"]
  wf_sddp_checklist --> sddp_checklist_openCodeCommand
  class sddp_checklist_openCodeCommand ok;
  sddp_checklist_windsurf["Windsurf: missing"]
  wf_sddp_checklist --> sddp_checklist_windsurf
  class sddp_checklist_windsurf fail;
  class wf_sddp_checklist neutral;
  wf_sddp_tasks["sddp-tasks -> generate-tasks"]
  sddp_tasks_copilot["Copilot: stale-reference"]
  wf_sddp_tasks --> sddp_tasks_copilot
  class sddp_tasks_copilot fail;
  sddp_tasks_claude["Claude: missing"]
  wf_sddp_tasks --> sddp_tasks_claude
  class sddp_tasks_claude fail;
  sddp_tasks_agentsSkill["Codex: missing"]
  wf_sddp_tasks --> sddp_tasks_agentsSkill
  class sddp_tasks_agentsSkill fail;
  sddp_tasks_agentsWorkflow["Antigravity: missing"]
  wf_sddp_tasks --> sddp_tasks_agentsWorkflow
  class sddp_tasks_agentsWorkflow fail;
  sddp_tasks_openCodeCommand["OpenCode Command: in-sync"]
  wf_sddp_tasks --> sddp_tasks_openCodeCommand
  class sddp_tasks_openCodeCommand ok;
  sddp_tasks_windsurf["Windsurf: missing"]
  wf_sddp_tasks --> sddp_tasks_windsurf
  class sddp_tasks_windsurf fail;
  class wf_sddp_tasks neutral;
  wf_sddp_analyze["sddp-analyze -> analyze-compliance"]
  sddp_analyze_copilot["Copilot: stale-reference"]
  wf_sddp_analyze --> sddp_analyze_copilot
  class sddp_analyze_copilot fail;
  sddp_analyze_claude["Claude: missing"]
  wf_sddp_analyze --> sddp_analyze_claude
  class sddp_analyze_claude fail;
  sddp_analyze_agentsSkill["Codex: missing"]
  wf_sddp_analyze --> sddp_analyze_agentsSkill
  class sddp_analyze_agentsSkill fail;
  sddp_analyze_agentsWorkflow["Antigravity: missing"]
  wf_sddp_analyze --> sddp_analyze_agentsWorkflow
  class sddp_analyze_agentsWorkflow fail;
  sddp_analyze_openCodeCommand["OpenCode Command: in-sync"]
  wf_sddp_analyze --> sddp_analyze_openCodeCommand
  class sddp_analyze_openCodeCommand ok;
  sddp_analyze_windsurf["Windsurf: missing"]
  wf_sddp_analyze --> sddp_analyze_windsurf
  class sddp_analyze_windsurf fail;
  class wf_sddp_analyze neutral;
  wf_sddp_implement["sddp-implement -> implement-tasks"]
  sddp_implement_copilot["Copilot: stale-reference"]
  wf_sddp_implement --> sddp_implement_copilot
  class sddp_implement_copilot fail;
  sddp_implement_claude["Claude: missing"]
  wf_sddp_implement --> sddp_implement_claude
  class sddp_implement_claude fail;
  sddp_implement_agentsSkill["Codex: missing"]
  wf_sddp_implement --> sddp_implement_agentsSkill
  class sddp_implement_agentsSkill fail;
  sddp_implement_agentsWorkflow["Antigravity: missing"]
  wf_sddp_implement --> sddp_implement_agentsWorkflow
  class sddp_implement_agentsWorkflow fail;
  sddp_implement_openCodeCommand["OpenCode Command: in-sync"]
  wf_sddp_implement --> sddp_implement_openCodeCommand
  class sddp_implement_openCodeCommand ok;
  sddp_implement_windsurf["Windsurf: missing"]
  wf_sddp_implement --> sddp_implement_windsurf
  class sddp_implement_windsurf fail;
  class wf_sddp_implement neutral;
  wf_sddp_qc["sddp-qc -> quality-control"]
  sddp_qc_copilot["Copilot: stale-reference"]
  wf_sddp_qc --> sddp_qc_copilot
  class sddp_qc_copilot fail;
  sddp_qc_claude["Claude: missing"]
  wf_sddp_qc --> sddp_qc_claude
  class sddp_qc_claude fail;
  sddp_qc_agentsSkill["Codex: missing"]
  wf_sddp_qc --> sddp_qc_agentsSkill
  class sddp_qc_agentsSkill fail;
  sddp_qc_agentsWorkflow["Antigravity: missing"]
  wf_sddp_qc --> sddp_qc_agentsWorkflow
  class sddp_qc_agentsWorkflow fail;
  sddp_qc_openCodeCommand["OpenCode Command: in-sync"]
  wf_sddp_qc --> sddp_qc_openCodeCommand
  class sddp_qc_openCodeCommand ok;
  sddp_qc_windsurf["Windsurf: missing"]
  wf_sddp_qc --> sddp_qc_windsurf
  class sddp_qc_windsurf fail;
  class wf_sddp_qc neutral;
  wf_sddp_implement_qc_loop["sddp-implement-qc-loop -> implement-qc-loop"]
  sddp_implement_qc_loop_copilot["Copilot: stale-reference"]
  wf_sddp_implement_qc_loop --> sddp_implement_qc_loop_copilot
  class sddp_implement_qc_loop_copilot fail;
  sddp_implement_qc_loop_claude["Claude: missing"]
  wf_sddp_implement_qc_loop --> sddp_implement_qc_loop_claude
  class sddp_implement_qc_loop_claude fail;
  sddp_implement_qc_loop_agentsSkill["Codex: missing"]
  wf_sddp_implement_qc_loop --> sddp_implement_qc_loop_agentsSkill
  class sddp_implement_qc_loop_agentsSkill fail;
  sddp_implement_qc_loop_agentsWorkflow["Antigravity: missing"]
  wf_sddp_implement_qc_loop --> sddp_implement_qc_loop_agentsWorkflow
  class sddp_implement_qc_loop_agentsWorkflow fail;
  sddp_implement_qc_loop_openCodeCommand["OpenCode Command: in-sync"]
  wf_sddp_implement_qc_loop --> sddp_implement_qc_loop_openCodeCommand
  class sddp_implement_qc_loop_openCodeCommand ok;
  sddp_implement_qc_loop_windsurf["Windsurf: missing"]
  wf_sddp_implement_qc_loop --> sddp_implement_qc_loop_windsurf
  class sddp_implement_qc_loop_windsurf fail;
  class wf_sddp_implement_qc_loop neutral;
  wf_sddp_devsetup["sddp-devsetup -> environment-setup"]
  sddp_devsetup_copilot["Copilot: stale-reference"]
  wf_sddp_devsetup --> sddp_devsetup_copilot
  class sddp_devsetup_copilot fail;
  sddp_devsetup_claude["Claude: missing"]
  wf_sddp_devsetup --> sddp_devsetup_claude
  class sddp_devsetup_claude fail;
  sddp_devsetup_agentsSkill["Codex: missing"]
  wf_sddp_devsetup --> sddp_devsetup_agentsSkill
  class sddp_devsetup_agentsSkill fail;
  sddp_devsetup_agentsWorkflow["Antigravity: missing"]
  wf_sddp_devsetup --> sddp_devsetup_agentsWorkflow
  class sddp_devsetup_agentsWorkflow fail;
  sddp_devsetup_openCodeCommand["OpenCode Command: in-sync"]
  wf_sddp_devsetup --> sddp_devsetup_openCodeCommand
  class sddp_devsetup_openCodeCommand ok;
  sddp_devsetup_windsurf["Windsurf: missing"]
  wf_sddp_devsetup --> sddp_devsetup_windsurf
  class sddp_devsetup_windsurf fail;
  class wf_sddp_devsetup neutral;
  wf_sddp_autopilot["sddp-autopilot -> autopilot-pipeline"]
  sddp_autopilot_copilot["Copilot: stale-reference"]
  wf_sddp_autopilot --> sddp_autopilot_copilot
  class sddp_autopilot_copilot fail;
  sddp_autopilot_claude["Claude: missing"]
  wf_sddp_autopilot --> sddp_autopilot_claude
  class sddp_autopilot_claude fail;
  sddp_autopilot_agentsSkill["Codex: missing"]
  wf_sddp_autopilot --> sddp_autopilot_agentsSkill
  class sddp_autopilot_agentsSkill fail;
  sddp_autopilot_agentsWorkflow["Antigravity: missing"]
  wf_sddp_autopilot --> sddp_autopilot_agentsWorkflow
  class sddp_autopilot_agentsWorkflow fail;
  sddp_autopilot_openCodeCommand["OpenCode Command: in-sync"]
  wf_sddp_autopilot --> sddp_autopilot_openCodeCommand
  class sddp_autopilot_openCodeCommand ok;
  sddp_autopilot_windsurf["Windsurf: missing"]
  wf_sddp_autopilot --> sddp_autopilot_windsurf
  class sddp_autopilot_windsurf fail;
  class wf_sddp_autopilot neutral;
  agent_adr_author["adr-author"]
  adr_author_copilot["Copilot: in-sync"]
  agent_adr_author --> adr_author_copilot
  class adr_author_copilot ok;
  adr_author_claude["Claude: missing"]
  agent_adr_author --> adr_author_claude
  class adr_author_claude fail;
  adr_author_openCodeAgent["OpenCode Agent: in-sync"]
  agent_adr_author --> adr_author_openCodeAgent
  class adr_author_openCodeAgent ok;
  adr_author_codex["Codex: missing"]
  agent_adr_author --> adr_author_codex
  class adr_author_codex fail;
  class agent_adr_author neutral;
  agent_adversarial_scanner["adversarial-scanner"]
  adversarial_scanner_copilot["Copilot: in-sync"]
  agent_adversarial_scanner --> adversarial_scanner_copilot
  class adversarial_scanner_copilot ok;
  adversarial_scanner_claude["Claude: missing"]
  agent_adversarial_scanner --> adversarial_scanner_claude
  class adversarial_scanner_claude fail;
  adversarial_scanner_openCodeAgent["OpenCode Agent: in-sync"]
  agent_adversarial_scanner --> adversarial_scanner_openCodeAgent
  class adversarial_scanner_openCodeAgent ok;
  adversarial_scanner_codex["Codex: missing"]
  agent_adversarial_scanner --> adversarial_scanner_codex
  class adversarial_scanner_codex fail;
  class agent_adversarial_scanner neutral;
  agent_api_designer["api-designer"]
  api_designer_copilot["Copilot: in-sync"]
  agent_api_designer --> api_designer_copilot
  class api_designer_copilot ok;
  api_designer_claude["Claude: missing"]
  agent_api_designer --> api_designer_claude
  class api_designer_claude fail;
  api_designer_openCodeAgent["OpenCode Agent: in-sync"]
  agent_api_designer --> api_designer_openCodeAgent
  class api_designer_openCodeAgent ok;
  api_designer_codex["Codex: missing"]
  agent_api_designer --> api_designer_codex
  class api_designer_codex fail;
  class agent_api_designer neutral;
  agent_checklist_reader["checklist-reader"]
  checklist_reader_copilot["Copilot: in-sync"]
  agent_checklist_reader --> checklist_reader_copilot
  class checklist_reader_copilot ok;
  checklist_reader_claude["Claude: missing"]
  agent_checklist_reader --> checklist_reader_claude
  class checklist_reader_claude fail;
  checklist_reader_openCodeAgent["OpenCode Agent: in-sync"]
  agent_checklist_reader --> checklist_reader_openCodeAgent
  class checklist_reader_openCodeAgent ok;
  checklist_reader_codex["Codex: missing"]
  agent_checklist_reader --> checklist_reader_codex
  class checklist_reader_codex fail;
  class agent_checklist_reader neutral;
  agent_configuration_auditor["configuration-auditor"]
  configuration_auditor_copilot["Copilot: in-sync"]
  agent_configuration_auditor --> configuration_auditor_copilot
  class configuration_auditor_copilot ok;
  configuration_auditor_claude["Claude: missing"]
  agent_configuration_auditor --> configuration_auditor_claude
  class configuration_auditor_claude fail;
  configuration_auditor_openCodeAgent["OpenCode Agent: in-sync"]
  agent_configuration_auditor --> configuration_auditor_openCodeAgent
  class configuration_auditor_openCodeAgent ok;
  configuration_auditor_codex["Codex: missing"]
  agent_configuration_auditor --> configuration_auditor_codex
  class configuration_auditor_codex fail;
  class agent_configuration_auditor neutral;
  agent_context_gatherer["context-gatherer"]
  context_gatherer_copilot["Copilot: in-sync"]
  agent_context_gatherer --> context_gatherer_copilot
  class context_gatherer_copilot ok;
  context_gatherer_claude["Claude: missing"]
  agent_context_gatherer --> context_gatherer_claude
  class context_gatherer_claude fail;
  context_gatherer_openCodeAgent["OpenCode Agent: in-sync"]
  agent_context_gatherer --> context_gatherer_openCodeAgent
  class context_gatherer_openCodeAgent ok;
  context_gatherer_codex["Codex: missing"]
  agent_context_gatherer --> context_gatherer_codex
  class context_gatherer_codex fail;
  class agent_context_gatherer neutral;
  agent_database_administrator["database-administrator"]
  database_administrator_copilot["Copilot: in-sync"]
  agent_database_administrator --> database_administrator_copilot
  class database_administrator_copilot ok;
  database_administrator_claude["Claude: missing"]
  agent_database_administrator --> database_administrator_claude
  class database_administrator_claude fail;
  database_administrator_openCodeAgent["OpenCode Agent: in-sync"]
  agent_database_administrator --> database_administrator_openCodeAgent
  class database_administrator_openCodeAgent ok;
  database_administrator_codex["Codex: missing"]
  agent_database_administrator --> database_administrator_codex
  class database_administrator_codex fail;
  class agent_database_administrator neutral;
  agent_developer["developer"]
  developer_copilot["Copilot: in-sync"]
  agent_developer --> developer_copilot
  class developer_copilot ok;
  developer_claude["Claude: missing"]
  agent_developer --> developer_claude
  class developer_claude fail;
  developer_openCodeAgent["OpenCode Agent: in-sync"]
  agent_developer --> developer_openCodeAgent
  class developer_openCodeAgent ok;
  developer_codex["Codex: missing"]
  agent_developer --> developer_codex
  class developer_codex fail;
  class agent_developer neutral;
  agent_plan_validator["plan-validator"]
  plan_validator_copilot["Copilot: in-sync"]
  agent_plan_validator --> plan_validator_copilot
  class plan_validator_copilot ok;
  plan_validator_claude["Claude: missing"]
  agent_plan_validator --> plan_validator_claude
  class plan_validator_claude fail;
  plan_validator_openCodeAgent["OpenCode Agent: in-sync"]
  agent_plan_validator --> plan_validator_openCodeAgent
  class plan_validator_openCodeAgent ok;
  plan_validator_codex["Codex: missing"]
  agent_plan_validator --> plan_validator_codex
  class plan_validator_codex fail;
  class agent_plan_validator neutral;
  agent_policy_auditor["policy-auditor"]
  policy_auditor_copilot["Copilot: in-sync"]
  agent_policy_auditor --> policy_auditor_copilot
  class policy_auditor_copilot ok;
  policy_auditor_claude["Claude: missing"]
  agent_policy_auditor --> policy_auditor_claude
  class policy_auditor_claude fail;
  policy_auditor_openCodeAgent["OpenCode Agent: in-sync"]
  agent_policy_auditor --> policy_auditor_openCodeAgent
  class policy_auditor_openCodeAgent ok;
  policy_auditor_codex["Codex: missing"]
  agent_policy_auditor --> policy_auditor_codex
  class policy_auditor_codex fail;
  class agent_policy_auditor neutral;
  agent_qc_auditor["qc-auditor"]
  qc_auditor_copilot["Copilot: in-sync"]
  agent_qc_auditor --> qc_auditor_copilot
  class qc_auditor_copilot ok;
  qc_auditor_claude["Claude: missing"]
  agent_qc_auditor --> qc_auditor_claude
  class qc_auditor_claude fail;
  qc_auditor_openCodeAgent["OpenCode Agent: in-sync"]
  agent_qc_auditor --> qc_auditor_openCodeAgent
  class qc_auditor_openCodeAgent ok;
  qc_auditor_codex["Codex: missing"]
  agent_qc_auditor --> qc_auditor_codex
  class qc_auditor_codex fail;
  class agent_qc_auditor neutral;
  agent_requirements_scanner["requirements-scanner"]
  requirements_scanner_copilot["Copilot: in-sync"]
  agent_requirements_scanner --> requirements_scanner_copilot
  class requirements_scanner_copilot ok;
  requirements_scanner_claude["Claude: missing"]
  agent_requirements_scanner --> requirements_scanner_claude
  class requirements_scanner_claude fail;
  requirements_scanner_openCodeAgent["OpenCode Agent: in-sync"]
  agent_requirements_scanner --> requirements_scanner_openCodeAgent
  class requirements_scanner_openCodeAgent ok;
  requirements_scanner_codex["Codex: missing"]
  agent_requirements_scanner --> requirements_scanner_codex
  class requirements_scanner_codex fail;
  class agent_requirements_scanner neutral;
  agent_spec_validator["spec-validator"]
  spec_validator_copilot["Copilot: in-sync"]
  agent_spec_validator --> spec_validator_copilot
  class spec_validator_copilot ok;
  spec_validator_claude["Claude: missing"]
  agent_spec_validator --> spec_validator_claude
  class spec_validator_claude fail;
  spec_validator_openCodeAgent["OpenCode Agent: in-sync"]
  agent_spec_validator --> spec_validator_openCodeAgent
  class spec_validator_openCodeAgent ok;
  spec_validator_codex["Codex: missing"]
  agent_spec_validator --> spec_validator_codex
  class spec_validator_codex fail;
  class agent_spec_validator neutral;
  agent_story_verifier["story-verifier"]
  story_verifier_copilot["Copilot: in-sync"]
  agent_story_verifier --> story_verifier_copilot
  class story_verifier_copilot ok;
  story_verifier_claude["Claude: missing"]
  agent_story_verifier --> story_verifier_claude
  class story_verifier_claude fail;
  story_verifier_openCodeAgent["OpenCode Agent: in-sync"]
  agent_story_verifier --> story_verifier_openCodeAgent
  class story_verifier_openCodeAgent ok;
  story_verifier_codex["Codex: missing"]
  agent_story_verifier --> story_verifier_codex
  class story_verifier_codex fail;
  class agent_story_verifier neutral;
  agent_task_tracker["task-tracker"]
  task_tracker_copilot["Copilot: in-sync"]
  agent_task_tracker --> task_tracker_copilot
  class task_tracker_copilot ok;
  task_tracker_claude["Claude: missing"]
  agent_task_tracker --> task_tracker_claude
  class task_tracker_claude fail;
  task_tracker_openCodeAgent["OpenCode Agent: in-sync"]
  agent_task_tracker --> task_tracker_openCodeAgent
  class task_tracker_openCodeAgent ok;
  task_tracker_codex["Codex: missing"]
  agent_task_tracker --> task_tracker_codex
  class task_tracker_codex fail;
  class agent_task_tracker neutral;
  agent_tasks_validator["tasks-validator"]
  tasks_validator_copilot["Copilot: in-sync"]
  agent_tasks_validator --> tasks_validator_copilot
  class tasks_validator_copilot ok;
  tasks_validator_claude["Claude: missing"]
  agent_tasks_validator --> tasks_validator_claude
  class tasks_validator_claude fail;
  tasks_validator_openCodeAgent["OpenCode Agent: in-sync"]
  agent_tasks_validator --> tasks_validator_openCodeAgent
  class tasks_validator_openCodeAgent ok;
  tasks_validator_codex["Codex: missing"]
  agent_tasks_validator --> tasks_validator_codex
  class tasks_validator_codex fail;
  class agent_tasks_validator neutral;
  agent_technical_researcher["technical-researcher"]
  technical_researcher_copilot["Copilot: in-sync"]
  agent_technical_researcher --> technical_researcher_copilot
  class technical_researcher_copilot ok;
  technical_researcher_claude["Claude: missing"]
  agent_technical_researcher --> technical_researcher_claude
  class technical_researcher_claude fail;
  technical_researcher_openCodeAgent["OpenCode Agent: in-sync"]
  agent_technical_researcher --> technical_researcher_openCodeAgent
  class technical_researcher_openCodeAgent ok;
  technical_researcher_codex["Codex: missing"]
  agent_technical_researcher --> technical_researcher_codex
  class technical_researcher_codex fail;
  class agent_technical_researcher neutral;
  agent_test_evaluator["test-evaluator"]
  test_evaluator_copilot["Copilot: in-sync"]
  agent_test_evaluator --> test_evaluator_copilot
  class test_evaluator_copilot ok;
  test_evaluator_claude["Claude: missing"]
  agent_test_evaluator --> test_evaluator_claude
  class test_evaluator_claude fail;
  test_evaluator_openCodeAgent["OpenCode Agent: in-sync"]
  agent_test_evaluator --> test_evaluator_openCodeAgent
  class test_evaluator_openCodeAgent ok;
  test_evaluator_codex["Codex: missing"]
  agent_test_evaluator --> test_evaluator_codex
  class test_evaluator_codex fail;
  class agent_test_evaluator neutral;
  agent_test_planner["test-planner"]
  test_planner_copilot["Copilot: in-sync"]
  agent_test_planner --> test_planner_copilot
  class test_planner_copilot ok;
  test_planner_claude["Claude: missing"]
  agent_test_planner --> test_planner_claude
  class test_planner_claude fail;
  test_planner_openCodeAgent["OpenCode Agent: in-sync"]
  agent_test_planner --> test_planner_openCodeAgent
  class test_planner_openCodeAgent ok;
  test_planner_codex["Codex: missing"]
  agent_test_planner --> test_planner_codex
  class test_planner_codex fail;
  class agent_test_planner neutral;
  agent_wbs_generator["wbs-generator"]
  wbs_generator_copilot["Copilot: in-sync"]
  agent_wbs_generator --> wbs_generator_copilot
  class wbs_generator_copilot ok;
  wbs_generator_claude["Claude: missing"]
  agent_wbs_generator --> wbs_generator_claude
  class wbs_generator_claude fail;
  wbs_generator_openCodeAgent["OpenCode Agent: in-sync"]
  agent_wbs_generator --> wbs_generator_openCodeAgent
  class wbs_generator_openCodeAgent ok;
  wbs_generator_codex["Codex: missing"]
  agent_wbs_generator --> wbs_generator_codex
  class wbs_generator_codex fail;
  class agent_wbs_generator neutral;
  agent_business_analyst["business-analyst"]
  business_analyst_copilot["Copilot: normalized-drift"]
  agent_business_analyst --> business_analyst_copilot
  class business_analyst_copilot fail;
  business_analyst_claude["Claude: n/a"]
  agent_business_analyst --> business_analyst_claude
  class business_analyst_claude neutral;
  business_analyst_openCodeAgent["OpenCode Agent: normalized-drift"]
  agent_business_analyst --> business_analyst_openCodeAgent
  class business_analyst_openCodeAgent fail;
  business_analyst_codex["Codex: n/a"]
  agent_business_analyst --> business_analyst_codex
  class business_analyst_codex neutral;
  class agent_business_analyst neutral;
  agent_compliance_auditor["compliance-auditor"]
  compliance_auditor_copilot["Copilot: normalized-drift"]
  agent_compliance_auditor --> compliance_auditor_copilot
  class compliance_auditor_copilot fail;
  compliance_auditor_claude["Claude: n/a"]
  agent_compliance_auditor --> compliance_auditor_claude
  class compliance_auditor_claude neutral;
  compliance_auditor_openCodeAgent["OpenCode Agent: normalized-drift"]
  agent_compliance_auditor --> compliance_auditor_openCodeAgent
  class compliance_auditor_openCodeAgent fail;
  compliance_auditor_codex["Codex: n/a"]
  agent_compliance_auditor --> compliance_auditor_codex
  class compliance_auditor_codex neutral;
  class agent_compliance_auditor neutral;
  agent_devops_strategist["devops-strategist"]
  devops_strategist_copilot["Copilot: normalized-drift"]
  agent_devops_strategist --> devops_strategist_copilot
  class devops_strategist_copilot fail;
  devops_strategist_claude["Claude: n/a"]
  agent_devops_strategist --> devops_strategist_claude
  class devops_strategist_claude neutral;
  devops_strategist_openCodeAgent["OpenCode Agent: normalized-drift"]
  agent_devops_strategist --> devops_strategist_openCodeAgent
  class devops_strategist_openCodeAgent fail;
  devops_strategist_codex["Codex: n/a"]
  agent_devops_strategist --> devops_strategist_codex
  class devops_strategist_codex neutral;
  class agent_devops_strategist neutral;
  agent_environment_setup["environment-setup"]
  environment_setup_copilot["Copilot: normalized-drift"]
  agent_environment_setup --> environment_setup_copilot
  class environment_setup_copilot fail;
  environment_setup_claude["Claude: n/a"]
  agent_environment_setup --> environment_setup_claude
  class environment_setup_claude neutral;
  environment_setup_openCodeAgent["OpenCode Agent: in-sync"]
  agent_environment_setup --> environment_setup_openCodeAgent
  class environment_setup_openCodeAgent ok;
  environment_setup_codex["Codex: n/a"]
  agent_environment_setup --> environment_setup_codex
  class environment_setup_codex neutral;
  class agent_environment_setup neutral;
  agent_product_manager["product-manager"]
  product_manager_copilot["Copilot: normalized-drift"]
  agent_product_manager --> product_manager_copilot
  class product_manager_copilot fail;
  product_manager_claude["Claude: n/a"]
  agent_product_manager --> product_manager_claude
  class product_manager_claude neutral;
  product_manager_openCodeAgent["OpenCode Agent: normalized-drift"]
  agent_product_manager --> product_manager_openCodeAgent
  class product_manager_openCodeAgent fail;
  product_manager_codex["Codex: n/a"]
  agent_product_manager --> product_manager_codex
  class product_manager_codex neutral;
  class agent_product_manager neutral;
  agent_product_strategist["product-strategist"]
  product_strategist_copilot["Copilot: normalized-drift"]
  agent_product_strategist --> product_strategist_copilot
  class product_strategist_copilot fail;
  product_strategist_claude["Claude: n/a"]
  agent_product_strategist --> product_strategist_claude
  class product_strategist_claude neutral;
  product_strategist_openCodeAgent["OpenCode Agent: normalized-drift"]
  agent_product_strategist --> product_strategist_openCodeAgent
  class product_strategist_openCodeAgent fail;
  product_strategist_codex["Codex: n/a"]
  agent_product_strategist --> product_strategist_codex
  class product_strategist_codex neutral;
  class agent_product_strategist neutral;
  agent_project_amender["project-amender"]
  project_amender_copilot["Copilot: normalized-drift"]
  agent_project_amender --> project_amender_copilot
  class project_amender_copilot fail;
  project_amender_claude["Claude: n/a"]
  agent_project_amender --> project_amender_claude
  class project_amender_claude neutral;
  project_amender_openCodeAgent["OpenCode Agent: normalized-drift"]
  agent_project_amender --> project_amender_openCodeAgent
  class project_amender_openCodeAgent fail;
  project_amender_codex["Codex: n/a"]
  agent_project_amender --> project_amender_codex
  class project_amender_codex neutral;
  class agent_project_amender neutral;
  agent_project_initializer["project-initializer"]
  project_initializer_copilot["Copilot: normalized-drift"]
  agent_project_initializer --> project_initializer_copilot
  class project_initializer_copilot fail;
  project_initializer_claude["Claude: n/a"]
  agent_project_initializer --> project_initializer_claude
  class project_initializer_claude neutral;
  project_initializer_openCodeAgent["OpenCode Agent: normalized-drift"]
  agent_project_initializer --> project_initializer_openCodeAgent
  class project_initializer_openCodeAgent fail;
  project_initializer_codex["Codex: n/a"]
  agent_project_initializer --> project_initializer_codex
  class project_initializer_codex neutral;
  class agent_project_initializer neutral;
  agent_project_manager["project-manager"]
  project_manager_copilot["Copilot: normalized-drift"]
  agent_project_manager --> project_manager_copilot
  class project_manager_copilot fail;
  project_manager_claude["Claude: n/a"]
  agent_project_manager --> project_manager_claude
  class project_manager_claude neutral;
  project_manager_openCodeAgent["OpenCode Agent: normalized-drift"]
  agent_project_manager --> project_manager_openCodeAgent
  class project_manager_openCodeAgent fail;
  project_manager_codex["Codex: n/a"]
  agent_project_manager --> project_manager_codex
  class project_manager_codex neutral;
  class agent_project_manager neutral;
  agent_project_planner["project-planner"]
  project_planner_copilot["Copilot: normalized-drift"]
  agent_project_planner --> project_planner_copilot
  class project_planner_copilot fail;
  project_planner_claude["Claude: n/a"]
  agent_project_planner --> project_planner_claude
  class project_planner_claude neutral;
  project_planner_openCodeAgent["OpenCode Agent: in-sync"]
  agent_project_planner --> project_planner_openCodeAgent
  class project_planner_openCodeAgent ok;
  project_planner_codex["Codex: n/a"]
  agent_project_planner --> project_planner_codex
  class project_planner_codex neutral;
  class agent_project_planner neutral;
  agent_prototype_retrospective_analyst["prototype-retrospective-analyst"]
  prototype_retrospective_analyst_copilot["Copilot: normalized-drift"]
  agent_prototype_retrospective_analyst --> prototype_retrospective_analyst_copilot
  class prototype_retrospective_analyst_copilot fail;
  prototype_retrospective_analyst_claude["Claude: n/a"]
  agent_prototype_retrospective_analyst --> prototype_retrospective_analyst_claude
  class prototype_retrospective_analyst_claude neutral;
  prototype_retrospective_analyst_openCodeAgent["OpenCode Agent: normalized-drift"]
  agent_prototype_retrospective_analyst --> prototype_retrospective_analyst_openCodeAgent
  class prototype_retrospective_analyst_openCodeAgent fail;
  prototype_retrospective_analyst_codex["Codex: n/a"]
  agent_prototype_retrospective_analyst --> prototype_retrospective_analyst_codex
  class prototype_retrospective_analyst_codex neutral;
  class agent_prototype_retrospective_analyst neutral;
  agent_qa_engineer["qa-engineer"]
  qa_engineer_copilot["Copilot: normalized-drift"]
  agent_qa_engineer --> qa_engineer_copilot
  class qa_engineer_copilot fail;
  qa_engineer_claude["Claude: n/a"]
  agent_qa_engineer --> qa_engineer_claude
  class qa_engineer_claude neutral;
  qa_engineer_openCodeAgent["OpenCode Agent: normalized-drift"]
  agent_qa_engineer --> qa_engineer_openCodeAgent
  class qa_engineer_openCodeAgent fail;
  qa_engineer_codex["Codex: n/a"]
  agent_qa_engineer --> qa_engineer_codex
  class qa_engineer_codex neutral;
  class agent_qa_engineer neutral;
  agent_qc_agent["qc-agent"]
  qc_agent_copilot["Copilot: normalized-drift"]
  agent_qc_agent --> qc_agent_copilot
  class qc_agent_copilot fail;
  qc_agent_claude["Claude: n/a"]
  agent_qc_agent --> qc_agent_claude
  class qc_agent_claude neutral;
  qc_agent_openCodeAgent["OpenCode Agent: normalized-drift"]
  agent_qc_agent --> qc_agent_openCodeAgent
  class qc_agent_openCodeAgent fail;
  qc_agent_codex["Codex: n/a"]
  agent_qc_agent --> qc_agent_codex
  class qc_agent_codex neutral;
  class agent_qc_agent neutral;
  agent_software_architect["software-architect"]
  software_architect_copilot["Copilot: normalized-drift"]
  agent_software_architect --> software_architect_copilot
  class software_architect_copilot fail;
  software_architect_claude["Claude: n/a"]
  agent_software_architect --> software_architect_claude
  class software_architect_claude neutral;
  software_architect_openCodeAgent["OpenCode Agent: normalized-drift"]
  agent_software_architect --> software_architect_openCodeAgent
  class software_architect_openCodeAgent fail;
  software_architect_codex["Codex: n/a"]
  agent_software_architect --> software_architect_codex
  class software_architect_codex neutral;
  class agent_software_architect neutral;
  agent_software_engineer["software-engineer"]
  software_engineer_copilot["Copilot: normalized-drift"]
  agent_software_engineer --> software_engineer_copilot
  class software_engineer_copilot fail;
  software_engineer_claude["Claude: n/a"]
  agent_software_engineer --> software_engineer_claude
  class software_engineer_claude neutral;
  software_engineer_openCodeAgent["OpenCode Agent: normalized-drift"]
  agent_software_engineer --> software_engineer_openCodeAgent
  class software_engineer_openCodeAgent fail;
  software_engineer_codex["Codex: n/a"]
  agent_software_engineer --> software_engineer_codex
  class software_engineer_codex neutral;
  class agent_software_engineer neutral;
  agent_solution_architect["solution-architect"]
  solution_architect_copilot["Copilot: normalized-drift"]
  agent_solution_architect --> solution_architect_copilot
  class solution_architect_copilot fail;
  solution_architect_claude["Claude: n/a"]
  agent_solution_architect --> solution_architect_claude
  class solution_architect_claude neutral;
  solution_architect_openCodeAgent["OpenCode Agent: normalized-drift"]
  agent_solution_architect --> solution_architect_openCodeAgent
  class solution_architect_openCodeAgent fail;
  solution_architect_codex["Codex: n/a"]
  agent_solution_architect --> solution_architect_codex
  class solution_architect_codex neutral;
  class agent_solution_architect neutral;
```
