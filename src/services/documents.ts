/**
 * Document service (front-end design phase — mock only).
 *
 * Identical signatures to the Supabase-backed version parked in
 * _supabase_later/documents.supabase.ts. When auth/backend is switched on,
 * that file replaces this one and no screen changes.
 */
import { mockDocuments, mockTemplates } from './mockStore';
import type { TemplytXDocument } from '../types/document';

const now = () => new Date().toISOString();

export async function listDocuments(): Promise<TemplytXDocument[]> {
  return [...mockDocuments].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getDocument(id: string): Promise<TemplytXDocument | null> {
  return mockDocuments.find((d) => d.id === id) ?? null;
}

export async function createDocument(
  input: Pick<TemplytXDocument, 'title' | 'targetTemplateId'>,
): Promise<TemplytXDocument> {
  const doc: TemplytXDocument = {
    id: `doc-${crypto.randomUUID()}`, ownerId: 'me', authors: [],
    title: input.title || 'Untitled', targetTemplateId: input.targetTemplateId,
    status: 'draft', readinessScore: null, blocks: [], references: [],
    createdAt: now(), updatedAt: now(),
  };
  mockDocuments.unshift(doc);
  return doc;
}

export async function updateDocument(
  id: string, patch: Partial<TemplytXDocument>,
): Promise<TemplytXDocument> {
  const idx = mockDocuments.findIndex((d) => d.id === id);
  if (idx === -1) throw new Error(`Document ${id} not found`);
  mockDocuments[idx] = { ...mockDocuments[idx], ...patch, updatedAt: now() };
  return mockDocuments[idx];
}

export async function listTemplates() {
  return mockTemplates;
}