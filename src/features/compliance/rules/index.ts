/**
 * Compliance rule registry.
 *
 * Each rule is a pure function: RuleContext in, ComplianceIssue[] out.
 * Two real examples below prove the pattern; the full rule set is built out
 * per-template later. Keep rules small, single-purpose, and explainable.
 */

import type { Rule, ComplianceIssue } from '../../../types/compliance';
import type { SectionBlock, ParagraphBlock } from '../../../types/document';

/** Count words in a rich-text paragraph's ProseMirror JSON (best-effort). */
function countWords(node: unknown): number {
  const text = String(node ?? '')
    .replace(/<[^>]+>/g, ' ')            // strip HTML tags
    .replace(/\[\[cite:[a-z0-9-]+\]\]/gi, ' '); // strip citation tokens
  const matches = text.match(/[A-Za-z]+/g);
  return matches ? matches.length : 0;
}

const abstractWordLimit: Rule = {
  id: 'abstract-word-limit',
  label: 'Abstract within word limit',
  run: ({ blocks, params }): ComplianceIssue[] => {
    const maxWords = Number(params.maxWords ?? 250);
    const abstractIdx = blocks.findIndex(
      (b) => b.type === 'section' &&
        (b as SectionBlock).title.trim().toLowerCase() === 'abstract',
    );
    if (abstractIdx === -1) return [];

    // Sum words in paragraphs until the next section.
    let words = 0;
    let targetBlockId: string | undefined;
    for (let i = abstractIdx + 1; i < blocks.length; i++) {
      const b = blocks[i];
      if (b.type === 'section') break;
      if (b.type === 'paragraph') {
        words += countWords((b as ParagraphBlock).content);
        targetBlockId ??= b.id;
      }
    }
    if (words <= maxWords) return [];

    return [{
      id: `abstract-word-limit:${abstractIdx}`,
      ruleId: 'abstract-word-limit',
      severity: 'warning',
      message: `Abstract exceeds ${maxWords} words (${words})`,
      autoFixable: false,
      targetBlockId,
      resolved: false,
    }];
  },
};

const figureCitedInText: Rule = {
  id: 'figure-cited-in-text',
  label: 'Every figure is referenced in the text',
  run: ({ blocks }): ComplianceIssue[] => {
    const figures = blocks.filter((b) => b.type === 'figure');
    if (figures.length === 0) return [];

    const bodyText = blocks
      .filter((b) => b.type === 'paragraph')
      .map((b) => (b as ParagraphBlock).content.replace(/<[^>]+>/g, ' '))
      .join(' ')
      .toLowerCase();

    const issues: ComplianceIssue[] = [];
    figures.forEach((fig, i) => {
      const num = i + 1;
      const cited =
        bodyText.includes(`fig. ${num}`) ||
        bodyText.includes(`figure ${num}`);
      if (!cited) {
        issues.push({
          id: `figure-cited-in-text:${fig.id}`,
          ruleId: 'figure-cited-in-text',
          severity: 'error',
          message: `Figure ${num} is not cited in the text`,
          autoFixable: false,
          targetBlockId: fig.id,
          resolved: false,
        });
      }
    });
    return issues;
  },
};

/** Required sections from the template skeleton must be present (by title). */
const requiredSections: Rule = {
  id: 'required-sections',
  label: 'All required sections are present',
  run: ({ blocks, params }): ComplianceIssue[] => {
    const required = (params.required as string[] | undefined) ?? [];
    if (required.length === 0) return [];
    const present = new Set(
      blocks
        .filter((b) => b.type === 'section')
        .map((b) => (b as SectionBlock).title.trim().toLowerCase()),
    );
    const issues: ComplianceIssue[] = [];
    for (const title of required) {
      if (!present.has(title.trim().toLowerCase())) {
        issues.push({
          id: `required-sections:${title}`,
          ruleId: 'required-sections',
          severity: 'error',
          message: `Required section "${title}" is missing`,
          autoFixable: false,
          resolved: false,
        });
      }
    }
    return issues;
  },
};

export const RULES: Rule[] = [abstractWordLimit, figureCitedInText, requiredSections];
