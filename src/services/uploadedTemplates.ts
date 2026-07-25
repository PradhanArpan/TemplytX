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
