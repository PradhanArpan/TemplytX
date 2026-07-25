/**
 * Template catalog (front-end phase).
 *
 * Structured spec objects — the platform's core data. Journals are the wedge,
 * but thesis/report/proposal prove the "not just journals" architecture.
 * Each carries an ordered section skeleton (drives scaffolding + the
 * required-sections check + export order), manuscript formatting, and rules.
 *
 * scope 'admin-global' = shipped by us. When accounts land, users add
 * 'user-private' templates (uploaded), stored the same shape.
 */
import type { Template, RuleConfig } from '../types/compliance';

const S = (title: string, required = true, hint?: string) => ({ title, required, hint });

const journalRules: RuleConfig[] = [
  { ruleId: 'required-sections', severity: 'error' },
  { ruleId: 'abstract-word-limit', severity: 'warning', params: { maxWords: 250 } },
  { ruleId: 'figure-cited-in-text', severity: 'error' },
];

export const templateCatalog: Template[] = [
  {
    id: 'tpl-ieee', name: 'IEEE Conference', publisher: 'IEEE', type: 'journal',
    scope: 'admin-global', citationStyle: 'ieee',
    sections: [
      S('Abstract', true, '≤ 250 words, no citations'),
      S('Introduction'), S('Related Work', false), S('Methods'),
      S('Results'), S('Conclusion'), S('References'),
    ],
    formatting: { paperSize: 'letter', columns: 2, lineSpacing: 'single', bodyFont: 'Times New Roman', bodyFontPt: 10, numberSections: true },
    rules: journalRules.map((r) => r.ruleId === 'abstract-word-limit' ? { ...r, params: { maxWords: 250 } } : r),
    isActive: true,
  },
  {
    id: 'tpl-springer', name: 'Springer Nature', publisher: 'Springer', type: 'journal',
    scope: 'admin-global', citationStyle: 'springer',
    sections: [
      S('Abstract', true, '≤ 250 words'), S('Introduction'), S('Methods'),
      S('Results'), S('Discussion'), S('Conclusion'),
      S('Declarations', true, 'Funding, conflicts of interest, ethics'), S('References'),
    ],
    formatting: { paperSize: 'a4', columns: 1, lineSpacing: 'onehalf', bodyFont: 'Times New Roman', bodyFontPt: 12, numberSections: true },
    rules: journalRules,
    isActive: true,
  },
  {
    id: 'tpl-elsevier', name: 'Elsevier', publisher: 'Elsevier', type: 'journal',
    scope: 'admin-global', citationStyle: 'elsevier',
    sections: [
      S('Abstract', true, '≤ 300 words'), S('Introduction'),
      S('Material and Methods'), S('Results'), S('Discussion'),
      S('Conclusions'), S('References'),
    ],
    formatting: { paperSize: 'a4', columns: 1, lineSpacing: 'double', bodyFont: 'Times New Roman', bodyFontPt: 12, numberSections: true },
    rules: [
      { ruleId: 'required-sections', severity: 'error' },
      { ruleId: 'abstract-word-limit', severity: 'warning', params: { maxWords: 300 } },
      { ruleId: 'figure-cited-in-text', severity: 'error' },
    ],
    isActive: true,
  },
  {
    id: 'tpl-thesis', name: 'PhD Thesis (Generic)', publisher: 'University', type: 'thesis',
    scope: 'admin-global', citationStyle: 'apa-7',
    sections: [
      S('Title Page'), S('Abstract'), S('Acknowledgements', false),
      S('Table of Contents'), S('Introduction'), S('Literature Review'),
      S('Methodology'), S('Results'), S('Discussion'),
      S('Conclusion'), S('References'), S('Appendices', false),
    ],
    formatting: { paperSize: 'a4', columns: 1, lineSpacing: 'double', bodyFont: 'Times New Roman', bodyFontPt: 12, numberSections: true },
    rules: [
      { ruleId: 'required-sections', severity: 'error' },
      { ruleId: 'figure-cited-in-text', severity: 'warning' },
    ],
    isActive: true,
  },
  {
    id: 'tpl-report', name: 'Technical Report', publisher: 'Generic', type: 'report',
    scope: 'admin-global', citationStyle: 'apa-7',
    sections: [
      S('Executive Summary'), S('Introduction'), S('Background', false),
      S('Methodology'), S('Findings'), S('Recommendations'),
      S('Conclusion'), S('References', false),
    ],
    formatting: { paperSize: 'a4', columns: 1, lineSpacing: 'single', bodyFont: 'Calibri', bodyFontPt: 11, numberSections: true },
    rules: [
      { ruleId: 'required-sections', severity: 'error' },
      { ruleId: 'figure-cited-in-text', severity: 'warning' },
    ],
    isActive: true,
  },
  {
    id: 'tpl-proposal', name: 'Grant / Research Proposal', publisher: 'Generic', type: 'proposal',
    scope: 'admin-global', citationStyle: 'apa-7',
    sections: [
      S('Project Summary'), S('Objectives'), S('Background and Rationale'),
      S('Methodology'), S('Expected Outcomes'), S('Timeline'),
      S('Budget'), S('References'),
    ],
    formatting: { paperSize: 'a4', columns: 1, lineSpacing: 'single', bodyFont: 'Times New Roman', bodyFontPt: 12, numberSections: false },
    rules: [
      { ruleId: 'required-sections', severity: 'error' },
    ],
    isActive: true,
  },
];

/** Required section titles for a template — fed to the required-sections rule. */
export function requiredSectionTitles(t: Template): string[] {
  return t.sections.filter((s) => s.required).map((s) => s.title);
}
