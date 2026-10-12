#!/usr/bin/env node
// Synthetic decision tests. This script invokes the real coordinator CLI and has no wallet or network access.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const coordinator = fileURLToPath(new URL("./credibility-coordinator.mjs", import.meta.url));
const policy = {
  policy_name: "synthetic-required-linkage",
  requested_action: { type: "bounded_action", size: 5, unit: "synthetic_units", is_repeat_action: false },
  authority: { max_autonomous_action_size: 10, serious_action_threshold: 11 },
  required_lanes: ["evidence", "external_context", "recipient_linkage", "payment_route"],
  hard_blocker_codes: ["MANDATORY_LINKAGE_FAILED", "MANDATORY_ROUTE_FAILED"],
  disposition_preferences: { uncertainty_action: "monitor" },
};
const evidence = {
  lane_type: "evidence", status: "completed", confidence: "high", findings: [],
  decision: { supports_core_claim: "yes", supports_requested_action_size: "yes", claimant_linkage: "verified", repeat_or_top_up_support: "not_applicable" },
};
const external_context = {
  lane_type: "external_context", status: "completed", confidence: "high", findings: [],
  decision: { public_context_plausibility: "some_found", source_independence: "strong" },
};
const recipient_linkage = { lane_type: "recipient_linkage", status: "completed", confidence: "high", findings: [], decision: {} };
const payment_route = { lane_type: "payment_route", status: "completed", confidence: "high", findings: [], decision: {} };
const clean = { evidence, external_context, recipient_linkage, payment_route };

function decide(lanes, policyChange = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "learned-assessment-"));
  try {
    const input = { ...policy, ...policyChange };
    fs.writeFileSync(path.join(dir, "policy.json"), JSON.stringify(input));
    const args = [coordinator, "--policy", path.join(dir, "policy.json")];
    for (const [name, lane] of Object.entries(lanes)) {
      const file = path.join(dir, `${name}.json`);
      fs.writeFileSync(file, JSON.stringify(lane));
      args.push("--lane", `${name}=${file}`);
    }
    return JSON.parse(execFileSync(process.execPath, args, { encoding: "utf8" }));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const cases = [
  ["supported first action", clean, {}, "eligible_for_full_policy_action"],
  ["unresolved recipient linkage", { ...clean, recipient_linkage: { ...recipient_linkage, status: "missing" } }, {}, "monitor_until_new_evidence"],
  ["unreadable PDF leaves content support unknown", { ...clean, evidence: { ...evidence, decision: { ...evidence.decision, supports_core_claim: "unknown" }, limitations: ["Synthetic PDF parser and rendered-page view unavailable"] } }, {}, "monitor_until_new_evidence"],
  ["unchanged evidence cannot supply repeat support", { ...clean, evidence: { ...evidence, decision: { ...evidence.decision, repeat_or_top_up_support: "none" } } }, { requested_action: { ...policy.requested_action, is_repeat_action: true } }, "monitor_until_new_evidence"],
  ["changed wallet invalidates old route review", { ...clean, payment_route: { ...payment_route, status: "missing" } }, {}, "monitor_until_new_evidence"],
  ["failed reassessment ignores old eligible output", { ...clean, evidence: { lane_type: "evidence", status: "error", findings: [], decision: { ...evidence.decision } } }, {}, "monitor_until_new_evidence"],
  ["supported repeat with current marginal reason", { ...clean, evidence: { ...evidence, decision: { ...evidence.decision, repeat_or_top_up_support: "fresh_reason_present" } } }, { requested_action: { ...policy.requested_action, is_repeat_action: true } }, "eligible_for_full_policy_action"],
  ["optional social source unavailable", { ...clean, optional_social: { lane_type: "optional_social", status: "error", findings: [], decision: {} } }, {}, "eligible_for_full_policy_action"],
];
for (const [name, lanes, change, expected] of cases) {
  const result = decide(lanes, change);
  assert.equal(result.disposition, expected, name);
  assert.equal(result.maximum_recommended_size > 0, expected === "eligible_for_full_policy_action", name);
  assert.equal(result.policy.uncertainty_action, "monitor", name);
  process.stdout.write(`ok - ${name}\n`);
}
