/**
 * Template targeting + compliance engine types.
 *
 * A Template is a submission target (IEEE, Springer, Elsevier, APA, thesis).
 * The compliance engine runs a document's blocks against a template's rules
 * and produces a ComplianceReport used by the on-demand Readiness Panel.
 */

import type { DocumentBlock, Reference } from './document';

export type CitationStyle = 'ieee' | 'apa-7' | 'springer' | 'elsevier';

/** What kind of document this template produces. Journals are the wedge;
 *  the platform serves many document kinds. */
export type TemplateType = 'journal' | 'thesis' | 'report' | 'proposal';

/** Who owns/can see a template. Global = shipped/published by admin;
 *  private = uploaded by a user (arrives with accounts). */
export type TemplateScope = 'admin-global' | 'user-private';

/** One entry in a template's ordered section skeleton. Drives three things:
 *  scaffolding a new document, the "required section missing" check, and the
 *  order the exporter emits sections. */
export interface SectionSpec {
  title: string;        // "Abstract", "Methodology", "Budget"
  required: boolean;
  /** Optional guidance shown to the author (from author instructions). */
  hint?: string;
}

/** Formatting rules consumed by the export pipeline. Submission/manuscript
 *  format — NOT the journal's final typeset look. */
export interface FormattingSpec {
  paperSize: 'a4' | 'letter';
  columns: 1 | 2;
  lineSpacing: 'single' | 'onehalf' | 'double';
  bodyFont: string;     // e.g. "Times New Roman"
  bodyFontPt: number;
  numberSections: boolean;
}

/** A submission target the user formats toward — now a structured,
 *  storable spec object, extensible to any document kind. */
export interface Template {
  id: string;
  name: string;              // "IEEE Conference"
  publisher: string;         // "IEEE" (or institution/agency)
  type: TemplateType;
  scope: TemplateScope;
  citationStyle: CitationStyle;
  /** How the reference list is ordered: 'sequence' = order of first citation
   *  (IEEE), 'alphabetical' = by first author surname (APA). */
  citationOrder: 'sequence' | 'alphabetical';
  /** Ordered required/optional sections from the author instructions. */
  sections: SectionSpec[];
  /** Manuscript formatting rules for export. */
  formatting: FormattingSpec;
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
