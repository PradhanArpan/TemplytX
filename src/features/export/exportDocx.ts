/**
 * Word (.docx) exporter. Emits the block model as a real Word document in the
 * template's manuscript format, with auto-numbered figures/tables/equations.
 * Many journals require .docx submission, so this sits alongside PDF.
 */
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, AlignmentType,
} from 'docx';
import { saveAs } from 'file-saver';
import type { TemplytXDocument } from '../../types/document';
import type { Template } from '../../types/compliance';
import { computeNumbering } from './numbering';

const lineMap = { single: 240, onehalf: 360, double: 480 };

export async function exportDocx(doc: TemplytXDocument, tpl: Template) {
  const fmt = tpl.formatting;
  const num = computeNumbering(doc.blocks, fmt.numberSections);
  const half = fmt.bodyFontPt * 2; // docx uses half-points

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: doc.title, bold: true, size: half + 12 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `${tpl.publisher} ${tpl.type} template`, italics: true, size: half - 2, color: '555555' })],
      spacing: { after: 240 },
    }),
  ];

  let secN = 0;
  for (const b of doc.blocks) {
    if (b.type === 'section') {
      const n = fmt.numberSections ? `${++secN}. ` : '';
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: `${n}${b.title}`, bold: true, size: half + 2 })],
        spacing: { before: 240, after: 80, line: lineMap[fmt.lineSpacing] },
      }));
    } else if (b.type === 'paragraph') {
      children.push(new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        children: [new TextRun({ text: b.content, size: half })],
        spacing: { after: 120, line: lineMap[fmt.lineSpacing] },
      }));
    } else if (b.type === 'equation') {
      const n = num.equations.get(b.id);
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `${b.latex}    (${n})`, font: 'Cambria Math', size: half })],
        spacing: { after: 120 },
      }));
    } else if (b.type === 'figure') {
      const n = num.figures.get(b.id);
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `[Figure ${n}]`, color: '777777', size: half })],
      }));
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: `Figure ${n}. `, bold: true, size: half - 2 }),
          new TextRun({ text: b.caption, size: half - 2 }),
        ],
        spacing: { after: 120 },
      }));
    } else if (b.type === 'table') {
      const n = num.tables.get(b.id);
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `Table ${n}. `, bold: true, size: half - 2 }),
          new TextRun({ text: b.caption ?? '', size: half - 2 }),
        ],
        spacing: { after: 60 },
      }));
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: b.rows.map((r, ri) => new TableRow({
          children: r.map((c) => new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: c, bold: ri === 0, size: half - 2 })] })],
          })),
        })),
      }));
    }
  }

  const document = new Document({
    styles: { default: { document: { run: { font: fmt.bodyFont, size: half } } } },
    sections: [{ properties: {}, children }],
  });

  const blob = await Packer.toBlob(document);
  const safe = doc.title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') || 'document';
  saveAs(blob, `${safe}.docx`);
}
