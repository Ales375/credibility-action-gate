# Lane Contracts

The coordinator compares independent lane outputs. Lanes may be produced by code, models, retrieval, human notes, or domain tools, but each lane should be normalized before coordination.

## Lane Record

```json
{
  "lane_type": "evidence",
  "status": "completed",
  "confidence": "medium",
  "findings": [
    {
      "code": "IDENTITY_OR_LINKAGE_UNVERIFIED",
      "severity": "medium",
      "summary": "The record supports the general need but not claimant linkage."
    }
  ],
  "positives": [
    {
      "code": "DATED_PRIMARY_DOCUMENT_PRESENT",
      "summary": "A dated document is present and legible."
    }
  ],
  "decision": {
    "supports_core_claim": "partial",
    "supports_requested_action_size": "unknown",
    "claimant_linkage": "unknown",
    "source_independence": "not_applicable"
  },
  "limitations": [
    "Document authenticity was not independently checked."
  ]
}
```

## Required Fields

- `lane_type`: stable lane name, such as `evidence`, `external_context`, `graph_history`, `policy`, or `domain`. This must match the `NAME` in `--lane NAME=file.json`; mismatches are rejected.
- `status`: `completed`, `missing`, `not_applicable`, or `error`. Required lanes satisfy policy only when `completed`; `not_applicable` is preserved as a valid lane status but does not count as completed evidence for a required lane.
- `findings`: array of concern objects.
- `decision`: lane-specific normalized facts used by the coordinator.

## Finding Severity

- `info`: note only.
- `low`: weak concern or limitation.
- `medium`: material uncertainty that should reduce size or confidence.
- `high`: strong concern that should usually reject, monitor, or require a much smaller action.
- `critical`: hard blocker under ordinary policies.

## Recommended Generic Codes

- `UNSUPPORTED_ON_CURRENT_RECORD`
- `CONTRADICTION_IN_RECORD`
- `IDENTITY_OR_LINKAGE_UNVERIFIED`
- `USE_OF_FUNDS_UNVERIFIED`
- `REQUESTED_ACTION_SIZE_UNSUPPORTED`
- `SOURCE_INDEPENDENCE_WEAK`
- `COPIED_TEXT_OR_TITLE_RISK`
- `SYNTHETIC_CONSENSUS_RISK`
- `REPEATED_RECIPIENT_PATTERN`
- `RELATED_RECORD_NETWORK_CONCERN`
- `POST_ACTION_MOVEMENT_UNREVIEWED`
- `POLICY_AUTHORITY_EXCEEDED`
- `DOMAIN_HARD_BLOCKER`

## Decision Fields The Coordinator Understands

Completed lanes require an explicit `status: "completed"`, a `findings` array (which may be empty), and a `decision` object. Omitted status is treated as `missing`. Completed `evidence` lanes must include `supports_core_claim`, `supports_requested_action_size`, and `claimant_linkage`; completed `external_context` lanes must include `public_context_plausibility` and `source_independence`. Other lane types retain their domain-specific decision shape, including an empty object for a completed history review with no decision fields.

Known decision fields must use the values below. Malformed records, invalid decision values and invalid finding severities cause a nonzero CLI exit without a disposition. Callers must treat that failure as no eligibility and must not reuse an earlier output file as the current result. Existing complete bundled records remain compatible; integrations relying on implicit completion or missing required decision fields must update their lane producers before adoption.

The coordinator uses these decision fields:

- `supports_core_claim`: `yes`, `partial`, `unknown`, `no`, `contradiction`, or `unsupported`.
- `supports_requested_action_size`: `yes`, `partial`, `unknown`, `no`, or `unsupported`. `no` and `unsupported` reject the current requested action size; `partial` and `unknown` reduce eligibility to a smaller test action under ordinary policy.
- `source_independence`: `strong`, `some`, `weak`, `none`, or `not_applicable`.
- `public_context_plausibility`: `all_found`, `some_found`, `weak`, `not_found`, or `not_applicable`.
- `claimant_linkage`: `verified`, `partial`, `unknown`, `unverified`, or `contradicted`.
- `repeat_or_top_up_support`: `fresh_reason_present`, `weak`, `none`, or `not_applicable`.

Unknown top-level fields are preserved in the coordinator's `lane_details` output but do not affect deterministic rules.

For repeat actions, only `fresh_reason_present` supplies affirmative support. Omitted support, `not_applicable`, `weak`, and `none` leave the recommended amount at zero. Support is read from a completed evidence lane, falling back to a completed external-context lane only if evidence omits that field. A first action does not require repeat support.

Completion records that a review occurred; it does not establish that every operator minimum was met. Domain-specific mandatory checks can use existing `required_lanes` entries: keep a required check `missing` or `error` while unavailable, and emit a configured hard blocker when a completed check establishes that an operator condition is unmet. Unknown linkage is not a universal identity requirement in this generic coordinator. The calling review must explicitly represent any stricter operator requirement; unrelated positive fields cannot substitute for it.
