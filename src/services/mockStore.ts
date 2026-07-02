/**
 * In-memory mock data store (front-end design phase).
 *
 * Module-level state persists for the browser session, so documents created
 * in the dashboard show up in the editor and survive navigation (but reset on
 * hard refresh — that's fine for design work). This entire file is deleted
 * when the Supabase-backed services in _supabase_later/ are switched on.
 */
import type { TemplytXDocument } from '../types/document';
import type { Template } from '../types/compliance';

const now = () => new Date().toISOString();

export const mockTemplates: Template[] = [
  { id: 'tpl-ieee', name: 'IEEE Conference', publisher: 'IEEE', citationStyle: 'ieee', layoutSpec: {}, rules: [], isActive: true },
  { id: 'tpl-springer', name: 'Springer Nature', publisher: 'Springer', citationStyle: 'springer', layoutSpec: {}, rules: [], isActive: true },
  { id: 'tpl-elsevier', name: 'Elsevier', publisher: 'Elsevier', citationStyle: 'elsevier', layoutSpec: {}, rules: [], isActive: true },
  { id: 'tpl-apa7', name: 'APA 7', publisher: 'APA', citationStyle: 'apa-7', layoutSpec: {}, rules: [], isActive: true },
  { id: 'tpl-thesis', name: 'Generic Thesis', publisher: 'University', citationStyle: 'apa-7', layoutSpec: {}, rules: [], isActive: true },
];

export const mockDocuments: TemplytXDocument[] = [
  {
    id: 'doc-1', ownerId: 'me',
    title: 'Thermal analysis of additively manufactured heat sinks',
    targetTemplateId: 'tpl-ieee', status: 'ready', readinessScore: 100,
    blocks: [], references: [], createdAt: now(), updatedAt: now(),
  },
  {
    id: 'doc-2', ownerId: 'me',
    title: 'CFD study of urban canyon ventilation',
    targetTemplateId: 'tpl-elsevier', status: 'checked', readinessScore: 72,
    blocks: [], references: [], createdAt: now(), updatedAt: now(),
  },
  {
    id: 'doc-3', ownerId: 'me',
    title: 'PhD Chapter 3 — Numerical methods',
    targetTemplateId: 'tpl-thesis', status: 'draft', readinessScore: null,
    blocks: [], references: [], createdAt: now(), updatedAt: now(),
  },
];
