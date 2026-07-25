/**
 * In-memory mock data store (front-end design phase).
 * Templates carry REAL rule configs; doc-2 is seeded with real blocks
 * (including a deliberately-uncited figure) so the compliance loop demos.
 */
import type { TemplytXDocument, DocumentBlock } from '../types/document';
import type { Template } from '../types/compliance';

const now = () => new Date().toISOString();

export const mockTemplates: Template[] = [
  { id: 'tpl-ieee', name: 'IEEE Conference', publisher: 'IEEE', citationStyle: 'ieee',
    layoutSpec: { columns: 2 }, isActive: true,
    rules: [
      { ruleId: 'abstract-word-limit', severity: 'warning', params: { maxWords: 250 } },
      { ruleId: 'figure-cited-in-text', severity: 'error' } ] },
  { id: 'tpl-springer', name: 'Springer Nature', publisher: 'Springer', citationStyle: 'springer',
    layoutSpec: { columns: 1 }, isActive: true,
    rules: [
      { ruleId: 'abstract-word-limit', severity: 'warning', params: { maxWords: 250 } },
      { ruleId: 'figure-cited-in-text', severity: 'error' } ] },
  { id: 'tpl-elsevier', name: 'Elsevier', publisher: 'Elsevier', citationStyle: 'elsevier',
    layoutSpec: { columns: 1 }, isActive: true,
    rules: [
      { ruleId: 'abstract-word-limit', severity: 'warning', params: { maxWords: 300 } },
      { ruleId: 'figure-cited-in-text', severity: 'error' } ] },
  { id: 'tpl-apa7', name: 'APA 7', publisher: 'APA', citationStyle: 'apa-7',
    layoutSpec: { columns: 1 }, isActive: true,
    rules: [{ ruleId: 'figure-cited-in-text', severity: 'warning' }] },
  { id: 'tpl-thesis', name: 'Generic Thesis', publisher: 'University', citationStyle: 'apa-7',
    layoutSpec: { columns: 1 }, isActive: true,
    rules: [{ ruleId: 'figure-cited-in-text', severity: 'warning' }] },
];

const doc2Blocks: DocumentBlock[] = [
  { id: 'b-1', type: 'section', level: 1, title: 'Abstract' },
  { id: 'b-2', type: 'paragraph',
    content: 'Urban canyon geometry strongly conditions pedestrian-level ventilation and pollutant dispersion. We present a computational fluid dynamics study of three aspect ratios under perpendicular approach flow, quantifying vortex structure, air-exchange rate, and street-level velocity deficits.' },
  { id: 'b-3', type: 'section', level: 1, title: 'Introduction' },
  { id: 'b-4', type: 'paragraph',
    content: 'Street canyons dominate the urban boundary layer at pedestrian scale. Prior work has established skimming-flow regimes for deep canyons, but the transition band remains poorly characterized for intermediate aspect ratios common in Indian metropolitan corridors.' },
  { id: 'b-5', type: 'equation', latex: 'ACH = \\frac{Q_{roof}}{V_{canyon}} \\cdot 3600', label: 'eq:ach' },
  { id: 'b-6', type: 'section', level: 1, title: 'Methods' },
  { id: 'b-7', type: 'paragraph',
    content: 'Steady RANS simulations with the realizable k-epsilon closure were run on structured hexahedral meshes. Grid independence was verified across three refinement levels.' },
  { id: 'b-8', type: 'figure', src: '', caption: 'Computational domain and boundary conditions.', label: 'fig:domain' },
];

export const mockDocuments: TemplytXDocument[] = [
  { id: 'doc-1', ownerId: 'me',
    title: 'Thermal analysis of additively manufactured heat sinks',
    targetTemplateId: 'tpl-ieee', status: 'ready', readinessScore: 100,
    blocks: [
      { id: 'a-1', type: 'section', level: 1, title: 'Abstract' },
      { id: 'a-2', type: 'paragraph',
        content: 'We present a thermal model of additively manufactured heat sinks, evaluating conduction pathways across three lattice geometries under steady-state load.' } ],
    references: [], createdAt: now(), updatedAt: now() },
  { id: 'doc-2', ownerId: 'me',
    title: 'CFD study of urban canyon ventilation',
    targetTemplateId: 'tpl-elsevier', status: 'draft', readinessScore: null,
    blocks: doc2Blocks, references: [], createdAt: now(), updatedAt: now() },
  { id: 'doc-3', ownerId: 'me',
    title: 'PhD Chapter 3 — Numerical methods',
    targetTemplateId: 'tpl-thesis', status: 'draft', readinessScore: null,
    blocks: [], references: [], createdAt: now(), updatedAt: now() },
];
