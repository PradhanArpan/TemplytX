/**
 * Compliance engine.
 *
 * Runs on-demand (user clicks "Check compliance"). Given a document's blocks +
 * references and a template's rule config, it runs each configured rule and
 * aggregates the findings into a scored ComplianceReport.
 *
 * Rules are pure functions registered in ./rules. Adding a template capability
 * = adding a rule + referencing it in a Template's RuleConfig. No engine edits.
 */

import type {
  ComplianceIssue,
  ComplianceReport,
  Rule,
  RuleConfig,
} from '../../types/compliance';
import type { DocumentBlock, Reference } from '../../types/document';
import { RULES } from './rules';

const registry = new Map<string, Rule>(RULES.map((r) => [r.id, r]));

export function runCompliance(args: {
  documentId: string;
  blocks: DocumentBlock[];
  references: Reference[];
  ruleConfigs: RuleConfig[];
}): ComplianceReport {
  const { documentId, blocks, references, ruleConfigs } = args;
  const issues: ComplianceIssue[] = [];

  for (const cfg of ruleConfigs) {
    const rule = registry.get(cfg.ruleId);
    if (!rule) continue; // unknown rule id in template config — skip safely
    const found = rule.run({
      blocks,
      references,
      params: cfg.params ?? {},
    });
    // Apply the template's configured severity to each finding.
    for (const issue of found) {
      issues.push({ ...issue, severity: cfg.severity });
    }
  }

  return {
    documentId,
    ranAt: new Date().toISOString(),
    score: computeScore(issues),
    issues,
  };
}

/**
 * Score = share of checks passing, weighted so errors hurt more than warnings.
 * Simple and explainable on purpose — users must trust the number.
 */
function computeScore(issues: ComplianceIssue[]): number {
  if (issues.length === 0) return 100;
  const weight = (s: ComplianceIssue['severity']) =>
    s === 'error' ? 3 : s === 'warning' ? 1 : 0;
  const penalty = issues.reduce((sum, i) => sum + weight(i.severity), 0);
  // Normalize against a soft cap so a few errors don't instantly read as 0%.
  const score = Math.max(0, 100 - penalty * 6);
  return Math.round(score);
}
