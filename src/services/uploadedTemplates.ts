/**
 * User-uploaded templates (session-mock now; account-scoped + file-stored
 * when the backend lands). Stores metadata; the file itself will live in
 * Supabase Storage later. Extraction of structure from the file is a future
 * step — for now we capture name/type so it's selectable.
 */
export interface UploadedTemplate {
  id: string;
  name: string;
  type: 'journal' | 'thesis' | 'report' | 'proposal';
  fileName: string;
  sizeBytes: number;
  createdAt: string;
}

const store: UploadedTemplate[] = [];

/** Build a usable Template spec from an uploaded template, based on its type.
 *  Until the file is parsed/compiled, it inherits a sensible default skeleton
 *  for its kind so the user can write, check, and export against it today. */
import type { Template } from '../types/compliance';
import { templateCatalog } from './templates';

export function uploadedToTemplate(u: UploadedTemplate): Template {
  // Base the spec on the shipped template of the same type (closest structure).
  const base = templateCatalog.find((t) => t.type === u.type) ?? templateCatalog[0];
  return {
    ...base,
    id: `up-tpl-${u.id}`,
    name: `${u.name} (uploaded)`,
    publisher: 'Your library',
    scope: 'user-private',
  };
}

export async function addUploadedTemplate(
  input: Omit<UploadedTemplate, 'id' | 'createdAt'>,
): Promise<UploadedTemplate> {
  const t: UploadedTemplate = { ...input, id: `up-${crypto.randomUUID()}`, createdAt: new Date().toISOString() };
  store.unshift(t);
  return t;
}

export async function listUploadedTemplates(): Promise<UploadedTemplate[]> {
  return [...store];
}

/** Uploaded templates as full Template specs, for the create dropdown etc. */
export function listUploadedAsTemplates(): Template[] {
  return store.map(uploadedToTemplate);
}
