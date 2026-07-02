/**
 * Template targeting + compliance engine types.
 *
 * A Template is a submission target (IEEE, Springer, Elsevier, APA, thesis).
 * The compliance engine runs a document's blocks against a template's rules
 * and produces a ComplianceReport used by the on-demand Readiness Panel.
 */

import type { DocumentBlock, Reference } from './document';

export type CitationStyle = 'ieee' | 'apa-7' | 'springer' | 'elsevier';

/** A submission target the user formats toward. */
export interface Template {
  id: string;
  name: string; // "IEEE Conference"
  publisher: string; // "IEEE"
  citationStyle: CitationStyle;
  /** Layout hints consumed by the export pipeline (margins, columns, etc). */
  layoutSpec: Record<string, unknown>;
  /** Rule configuration consumed by the compliance engine. */
  rules: RuleConfig[];
  isActive: boolean;
}

export type Severity = 'error' | 'warning' | 'info';

/** Per-template configuration for a single rule. */
export interface RuleConfig {
  ruleId: string; // matches a registered Rule
  severity: Severity;
  params?: Record<string, unknown>; // e.g. { maxWords: 250 }
}

/** Input a rule receives when it runs. */
export interface RuleContext {
  blocks: DocumentBlock[];
  references: Reference[];
  params: Record<string, unknown>;
}

/** One actionable finding shown as a card in the Readiness Panel. */
export interface ComplianceIssue {
  id: string;
  ruleId: string;
  severity: Severity;
  message: string; // "Abstract exceeds 250 words (268)"
  autoFixable: boolean;
  /** Block this issue points to, so [Go▸] can jump the cursor. */
  targetBlockId?: string;
  resolved: boolean;
}

/** A registered compliance rule. Pure function: context in, issues out. */
export interface Rule {
  id: string;
  label: string;
  run: (ctx: RuleContext) => ComplianceIssue[];
}

export interface ComplianceReport {
  documentId: string;
  ranAt: string;
  score: number; // 0–100
  issues: ComplianceIssue[];
}
