/**
 * Document service. When Supabase is configured AND a user is logged in,
 * reads/writes the database. Otherwise falls back to the session-mock so the
 * app still runs (e.g. logged-out preview). Row-Level Security guarantees a
 * user only ever sees their own documents.
 */
import { supabase, SUPABASE_READY } from '../lib/supabase';
import { mockDocuments, mockTemplates } from './mockStore';
import type { TemplytXDocument } from '../types/document';

const now = () => new Date().toISOString();

async function currentUserId(): Promise<string | null> {
  if (!SUPABASE_READY || !supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// Map DB row (snake_case, doc_references) <-> app model (camelCase, references)
function rowToDoc(r: Record<string, unknown>): TemplytXDocument {
  return {
    id: r.id as string,
    ownerId: r.owner_id as string,
    title: r.title as string,
    authors: (r.authors as TemplytXDocument['authors']) ?? [],
    targetTemplateId: (r.target_template_id as string) ?? null,
    status: (r.status as TemplytXDocument['status']) ?? 'draft',
    readinessScore: (r.readiness_score as number) ?? null,
    blocks: (r.blocks as TemplytXDocument['blocks']) ?? [],
    references: (r.doc_references as TemplytXDocument['references']) ?? [],
    createdAt: (r.created_at as string) ?? now(),
    updatedAt: (r.updated_at as string) ?? now(),
  };
}

export async function listDocuments(): Promise<TemplytXDocument[]> {
  const uid = await currentUserId();
  if (!uid || !supabase) {
    return [...mockDocuments].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  const { data, error } = await supabase
    .from('documents').select('*').order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToDoc);
}

export async function getDocument(id: string): Promise<TemplytXDocument | null> {
  const uid = await currentUserId();
  if (!uid || !supabase) return mockDocuments.find((d) => d.id === id) ?? null;
  const { data, error } = await supabase.from('documents').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? rowToDoc(data) : null;
}

export async function createDocument(
  input: Pick<TemplytXDocument, 'title' | 'targetTemplateId'>,
): Promise<TemplytXDocument> {
  const uid = await currentUserId();
  if (!uid || !supabase) {
    const doc: TemplytXDocument = {
      id: `doc-${crypto.randomUUID()}`, ownerId: 'me', authors: [],
      title: input.title || 'Untitled', targetTemplateId: input.targetTemplateId,
      status: 'draft', readinessScore: null, blocks: [], references: [],
      createdAt: now(), updatedAt: now(),
    };
    mockDocuments.unshift(doc);
    return doc;
  }
  const { data, error } = await supabase.from('documents').insert({
    owner_id: uid, title: input.title || 'Untitled',
    target_template_id: input.targetTemplateId,
  }).select('*').single();
  if (error) throw error;
  return rowToDoc(data);
}

export async function updateDocument(
  id: string, patch: Partial<TemplytXDocument>,
): Promise<TemplytXDocument> {
  const uid = await currentUserId();
  if (!uid || !supabase) {
    const idx = mockDocuments.findIndex((d) => d.id === id);
    if (idx === -1) throw new Error(`Document ${id} not found`);
    mockDocuments[idx] = { ...mockDocuments[idx], ...patch, updatedAt: now() };
    return mockDocuments[idx];
  }
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.authors !== undefined) row.authors = patch.authors;
  if (patch.targetTemplateId !== undefined) row.target_template_id = patch.targetTemplateId;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.readinessScore !== undefined) row.readiness_score = patch.readinessScore;
  if (patch.blocks !== undefined) row.blocks = patch.blocks;
  if (patch.references !== undefined) row.doc_references = patch.references;
  const { data, error } = await supabase.from('documents').update(row).eq('id', id).select('*').single();
  if (error) throw error;
  return rowToDoc(data);
}

export async function deleteDocument(id: string): Promise<void> {
  const uid = await currentUserId();
  if (!uid || !supabase) {
    const idx = mockDocuments.findIndex((d) => d.id === id);
    if (idx !== -1) mockDocuments.splice(idx, 1);
    return;
  }
  const { error } = await supabase.from('documents').delete().eq('id', id);
  if (error) throw error;
}

export async function listTemplates() {
  const { listUploadedAsTemplates } = await import('./uploadedTemplates');
  return [...mockTemplates, ...listUploadedAsTemplates()];
}
