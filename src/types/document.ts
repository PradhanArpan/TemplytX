/**
 * TemplytX domain types.
 *
 * The block model is the SINGLE SOURCE OF TRUTH for a document.
 * The WYSIWYG editor renders it; the export pipeline compiles it to
 * LaTeX/PDF/DOCX. It is intentionally editor-agnostic so we are never
 * locked to one editor library.
 */

export type BlockType =
  | 'section'
  | 'paragraph'
  | 'equation'
  | 'figure'
  | 'table'
  | 'citation';

/** A citation reference stored as CSL-JSON (Citation Style Language). */
export interface Reference {
  id: string;
  cslJson: Record<string, unknown>; // normalized CSL-JSON
  position: number;
}

interface BaseBlock {
  id: string;
  type: BlockType;
}

export interface SectionBlock extends BaseBlock {
  type: 'section';
  level: number; // 1 = top-level section
  title: string;
}

export interface ParagraphBlock extends BaseBlock {
  type: 'paragraph';
  /** Plain text for V1. Rich text (TipTap JSON) can replace this later. */
  content: string;
}

export interface EquationBlock extends BaseBlock {
  type: 'equation';
  latex: string; // raw LaTeX, rendered with KaTeX in the editor
  label?: string; // e.g. "eq:thermal" for cross-referencing
}

export interface FigureBlock extends BaseBlock {
  type: 'figure';
  src: string; // storage URL
  caption: string;
  label?: string;
}

export interface TableBlock extends BaseBlock {
  type: 'table';
  rows: string[][];
  caption?: string;
  label?: string;
}

export type DocumentBlock =
  | SectionBlock
  | ParagraphBlock
  | EquationBlock
  | FigureBlock
  | TableBlock;

export type DocumentStatus = 'draft' | 'checked' | 'ready';

export interface TemplytXDocument {
  id: string;
  ownerId: string;
  title: string;
  targetTemplateId: string | null;
  status: DocumentStatus;
  /** Null = never checked. Stale flag lives in editor state, not persisted. */
  readinessScore: number | null;
  blocks: DocumentBlock[];
  references: Reference[];
  createdAt: string;
  updatedAt: string;
}
