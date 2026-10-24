# Credibility Action Gate

A small, portable skill for agents that need to evaluate messy public claims
before taking a bounded, costly, irreversible, or reputation-sensitive action.

New to the concept? See what [AI agent donations](https://zooid.fund/ai-agent-donations) are and how zooidfund implements them.

It does not decide the agent's mission. It decides whether the current record is
strong enough for the action size allowed by the operator's policy.

The canonical agent instructions live in `SKILL.md`. This README is for humans
reviewing the repository.

## Common Use Cases

- Donation or grant decisions
- Account approvals
- Vendor or partner selection
- Public endorsements
- Aid routing
- Purchases or referrals

## Explore before configuring an action

For read-only exploration, tell the agent your priorities and ask it to review the public record. It can use the assessment lessons in the zooidfund adapter without a wallet, registration, policy JSON or coordinator run. It should explain support, uncertainty and further checks, rather than manufacture an action disposition.

When you later ask for a proposed donation or automation, the agent asks the missing policy questions in plain language and prepares compatible policy and review files using [operator setup](references/operator-setup.md). You review the actual limits; you do not need to author JSON. Exploration and a proposed donation do not grant spending authority.

## Claude app installation

Download [credibility-action-gate 2.0.3 for Claude](https://github.com/Ales375/credibility-action-gate/releases/download/v2.0.3/credibility-action-gate-2.0.3.zip). For zooidfund exploration, also download [zooidfund 1.9.4 for Claude](https://github.com/Ales375/zooidfund-skill/releases/download/v1.9.4/zooidfund-1.9.4.zip). Use the complete packages, not GitHub's source ZIP or a lone Markdown file. You do not need to clone, build or test the repositories. If a download is unavailable, stop setup and report the missing asset; do not substitute an older version or manual assessment guidance.

In Claude, open Customize > Skills > Add skill, upload each ZIP, then enable both skills. Reuse existing settings and connectors. Code execution and file creation must be enabled in Settings > Capabilities; organization controls may require an administrator. Use a normal chat for the later file/coordinator stage; Incognito does not support that stage. The gate ZIP contains one `credibility-action-gate/` folder with instructions, references, coordinator, examples and tests. See [Claude's package instructions](https://support.claude.com/en/articles/12512198-how-to-create-custom-skills) and [installation instructions](https://support.claude.com/en/articles/12512180-use-skills-in-claude).

For maintainers reproducing a release from its exact source commit:

```sh
git archive --format=zip --prefix=credibility-action-gate/ --output=credibility-action-gate-2.0.3.zip HEAD SKILL.md README.md LICENSE scripts references examples agents
```

Publish the complete ZIP with `credibility-action-gate-2.0.3.manifest.json` (source commit, ZIP SHA-256 and per-file hashes) under tag `v2.0.3`. The repository's Releases page is authoritative for available downloads. Verify published assets before promoting website download links. The deterministic gate needs Node.js; check that capability when a proposed action reaches the gate, rather than blocking read-only exploration on it.

## How the action gate works

1. Define the contemplated action and operator policy.
2. Produce independent review lanes as JSON.
3. Run the deterministic coordinator.
4. Use the output as an action gate.

The gate is analysis-only. It does not call external services, read
credentials, move funds, publish claims, or execute the contemplated action.

## Quick Start

Run the bundled zooidfund-style example:

```bash
node scripts/credibility-coordinator.mjs \
  --policy examples/zooidfund-small-donation/policy.json \
  --lane evidence=examples/zooidfund-small-donation/evidence_lane.json \
  --lane external_context=examples/zooidfund-small-donation/external_context_lane.json \
  --lane graph_history=examples/zooidfund-small-donation/graph_history_lane.json \
  --out examples/zooidfund-small-donation/disposition.output.json
```

Run the regression suite:

```bash
node scripts/test-credibility-coordinator.mjs
```

## Coordinator contract 0.3.0

`review_version: "0.3.0"` identifies the stricter input contract. Completed reviews need explicit status, findings and the lane's required decision fields. Known decision values and finding severities must use the documented lowercase enums; implicit completion and values such as `"High"` are rejected. Repeat actions require affirmative fresh support. Update lane producers before adopting this version; see [lane contracts](references/lane_contracts.md).

With `--out`, the coordinator validates the destination and checks policy/lane aliases before removing an old result, then evaluates inputs and writes a complete new result through a temporary file and rename. Input aliases, linked output files and non-file destinations are rejected without modifying them. Use a dedicated output path and one writer per path. Invalid arguments or an unsafe/unresolvable destination can prevent safe invalidation, as can filesystem permissions or a crash before invalidation. Always require successful exit and a fresh result for the current invocation; file existence alone never authorizes action. Diagnostic output contains lane details and should remain private.

Material uncertainty now waits by default. Operators may explicitly set `disposition_preferences.uncertainty_action` to `"small_test"` to permit a bounded amount within existing limits. This cannot waive mandatory checks, fresh repeat support or adverse core/linkage conclusions. Missing reviewer confidence never becomes high confidence. The old `multiple_medium_concerns` preference no longer permits spending; complete older inputs remain parseable but their uncertain outcomes change. Read the [0.3.0 policy and confidence rules](references/lane_contracts.md#eligibility-policy-in-contract-030) before integration adoption.

## Dispositions

- `eligible_for_full_policy_action`
- `eligible_for_bounded_action`
- `eligible_for_small_test_action`
- `monitor_until_new_evidence`
- `reject_current_record`
- `blocked_by_operator_or_legal_policy`

Read the full output before acting. The `disposition` is intentionally compact,
but `confidence`, `action_size_guidance`, `maximum_recommended_size`, `reasons`,
and `missing_lanes` explain the gate result.

## Use With Zooidfund

For zooidfund agents, run this gate after campaign and evidence review and
before calling `donate`.

For platform-specific setup, [donor agent operators](https://zooid.fund/donor-agents) can use the operator guide, and campaign creators can learn how to [get funded by AI donor agents](https://zooid.fund/creators).

Suggested flow:

```text
search_campaigns
get_campaign
get_campaign_donations
get_evidence, if eligible
produce evidence lane
produce external_context lane, if web/context is available
produce graph_history lane
run credibility-action-gate
only then decide whether to call donate
```

The gate does not decide which campaign is most deserving. It decides whether
the current record supports the contemplated donation size.

Use record-scoped language when the gate blocks or tightens an action. A failed
gate means "not enough support on the current record for this action," not "the
person is lying."

## Repository Layout

- `SKILL.md` - canonical agent-facing skill instructions.
- `scripts/credibility-coordinator.mjs` - deterministic JSON coordinator.
- `scripts/test-credibility-coordinator.mjs` - regression tests.
- `references/lane_contracts.md` - lane schema and supported decision fields.
- `references/policy-template.json` - operator policy template.
- `references/zooidfund_adapter.md` - optional zooidfund mapping notes.
- `examples/zooidfund-small-donation/` - minimal worked example.
