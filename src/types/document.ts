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

/** A citation reference. CSL-JSON-shaped structured fields for formatting,
 *  plus the raw cslJson for BibTeX/export. Lives in the account-level pool. */
export interface Reference {
  id: string;
  /** Human-readable BibTeX-style cite key (e.g. "vicente2011"). Used for
   *  \cite{key}-style citing and shown to the user; unique per pool. */
  citeKey: string;
  title: string;
  authors: string[];      // ["Leopold, L. B.", "Langbein, W. B."]
  year: number | null;
  container?: string;     // journal / conference / publisher
  doi?: string;
  url?: string;
  /** Full CSL-JSON for round-tripping and BibTeX generation. */
  cslJson: Record<string, unknown>;
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

export interface Subfigure {
  id: string;
  src: string;
  caption: string;
}

export interface FigureBlock extends BaseBlock {
  type: 'figure';
  src: string;
  caption: string;
  label?: string;
  subfigures?: Subfigure[];
  centered?: boolean;
  /** How many subfigures per row (default 2). */
  perRow?: number;
  /** Display width as a percentage of the content column (default 100). */
  width?: number;
}

export interface TableBlock extends BaseBlock {
  type: 'table';
  rows: string[][];
  caption?: string;
  label?: string;
  align?: ('left' | 'center' | 'right')[];
  topRule?: boolean;
  headerRule?: boolean;
  bottomRule?: boolean;
  rowLines?: boolean;
  centered?: boolean;
  /** Vertical lines between columns. */
  colLines?: boolean;
  /** Optional per-column width as a percentage (0 = auto). Length = columns. */
  colWidths?: number[];
}

export type DocumentBlock =
  | SectionBlock
  | ParagraphBlock
  | EquationBlock
  | FigureBlock
  | TableBlock;

export type DocumentStatus = 'draft' | 'checked' | 'ready';

/** An author in the document front-matter. */
export interface Author {
  id: string;
  name: string;
  affiliation: string;
  isCorresponding: boolean;
}

/** CHRIST SoET thesis institutional metadata (fills ProjectVariables.tex). */
export interface ChristThesisMeta {
  projectTitle: string;        // ALL CAPS
  projectTitleTwo: string;     // Title Case
  dissertationType: string;    // e.g. "A Project Report on"
  programNameUpper: string;    // e.g. BACHELOR OF TECHNOLOGY
  programName: string;         // e.g. Bachelor of Technology
  programNameShort: string;    // e.g. B.Tech.
  specialization: string;      // e.g. Civil Engineering
  authors: { name: string; regNo: string; department: string }[]; // up to 5
  guideName: string; guideDesignation: string; guideDepartment: string;
  coGuideName: string; coGuideDesignation: string; coGuideDepartment: string;
  departmentName: string; collegeName: string;
  hodName: string; hodDesignation: string;
  projectDate: string;         // Month-YYYY
  academicYear: string;        // YYYY-YYYY
  weOrI: string;               // "We" or "I"
  dateOfDeclaration: string;
  keywords: string;
}

export interface TemplytXDocument {
  id: string;
  ownerId: string;
  title: string;
  /** Structured front-matter, separate from body. Included or anonymized at
   *  export time per the journal's requirement. */
  authors: Author[];
  /** Optional target. A neutral "Article" has none until the user picks one
   *  (at check or export time). Format is decoupled from content. */
  targetTemplateId: string | null;
  status: DocumentStatus;
  /** Null = never checked. Stale flag lives in editor state, not persisted. */
  readinessScore: number | null;
  blocks: DocumentBlock[];
  references: Reference[];
  /** CHRIST thesis institutional metadata, when using that template. */
  christThesis?: ChristThesisMeta;
  createdAt: string;
  updatedAt: string;
}
