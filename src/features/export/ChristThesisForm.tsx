/**
 * CHRIST SoET Thesis metadata form. Collects the institutional fields that
 * fill ProjectVariables.tex (title page, certificates, declaration, etc.).
 * Shown on the export screen when the CHRIST thesis template is the target.
 */
import type { ChristThesisMeta } from '../../types/document';

export const emptyChristMeta = (): ChristThesisMeta => ({
  projectTitle: '', projectTitleTwo: '', dissertationType: 'A Project Report on',
  programNameUpper: 'BACHELOR OF TECHNOLOGY', programName: 'Bachelor of Technology',
  programNameShort: 'B.Tech.', specialization: 'Civil Engineering',
  authors: [{ name: '', regNo: '', department: 'Civil Engineering' }],
  guideName: '', guideDesignation: '', guideDepartment: '',
  coGuideName: '', coGuideDesignation: '', coGuideDepartment: '',
  departmentName: 'Department of Civil Engineering', collegeName: 'School of Engineering and Technology',
  hodName: '', hodDesignation: 'Head of the Department',
  projectDate: '', academicYear: '', weOrI: 'I', dateOfDeclaration: '', keywords: '', abstractText: '',
  departmentVision: '', departmentMission: '', departmentPEOs: '', departmentPSOs: '',
});

export function ChristThesisForm({ meta, onChange }: {
  meta: ChristThesisMeta;
  onChange: (m: ChristThesisMeta) => void;
}) {
  const set = (patch: Partial<ChristThesisMeta>) => onChange({ ...meta, ...patch });
  const fld = 'w-full text-[13px] px-2.5 py-1.5 border border-[var(--color-border-strong)] rounded-[var(--radius)] bg-[var(--color-surface)] outline-none focus:border-[var(--color-accent)] mb-2';
  const lbl = 'text-[11px] font-medium text-[var(--color-muted)] block mb-0.5';

  function setAuthor(i: number, patch: Partial<ChristThesisMeta['authors'][number]>) {
    const authors = meta.authors.map((a, ai) => ai === i ? { ...a, ...patch } : a);
    set({ authors });
  }
  function addAuthor() { if (meta.authors.length < 5) set({ authors: [...meta.authors, { name: '', regNo: '', department: meta.specialization }] }); }
  function removeAuthor(i: number) { set({ authors: meta.authors.filter((_, ai) => ai !== i) }); }

  return (
    <div className="border border-[var(--color-border)] rounded-[var(--radius)] p-3 mb-3 bg-[var(--color-surface-2)]">
      <div className="text-[13px] font-semibold text-[var(--color-text)] mb-2">CHRIST Thesis details</div>

      <label className={lbl}>Project title (ALL CAPS)</label>
      <input className={fld} value={meta.projectTitle} onChange={(e) => set({ projectTitle: e.target.value })} placeholder="CONSTRUCTION OF BLOCK WORK" />
      <label className={lbl}>Project title (Title Case)</label>
      <input className={fld} value={meta.projectTitleTwo} onChange={(e) => set({ projectTitleTwo: e.target.value })} placeholder="Construction of Block Work" />

      <div className="grid grid-cols-2 gap-2">
        <div><label className={lbl}>Program (upper)</label><input className={fld} value={meta.programNameUpper} onChange={(e) => set({ programNameUpper: e.target.value })} /></div>
        <div><label className={lbl}>Program (short)</label><input className={fld} value={meta.programNameShort} onChange={(e) => set({ programNameShort: e.target.value })} /></div>
      </div>
      <label className={lbl}>Specialization</label>
      <input className={fld} value={meta.specialization} onChange={(e) => set({ specialization: e.target.value })} />

      <div className="text-[12px] font-medium text-[var(--color-text)] mt-2 mb-1">Authors (up to 5)</div>
      {meta.authors.map((a, i) => (
        <div key={i} className="flex gap-1 mb-1 items-start">
          <input className={`${fld} mb-0`} value={a.name} onChange={(e) => setAuthor(i, { name: e.target.value })} placeholder="Name" />
          <input className={`${fld} mb-0 w-24`} value={a.regNo} onChange={(e) => setAuthor(i, { regNo: e.target.value })} placeholder="Reg no" />
          {meta.authors.length > 1 && <button onClick={() => removeAuthor(i)} className="text-[var(--color-faint)] hover:text-[var(--status-error)] px-1 cursor-pointer border-none bg-transparent">×</button>}
        </div>
      ))}
      {meta.authors.length < 5 && <button onClick={addAuthor} className="text-[11px] text-[var(--color-accent)] cursor-pointer border-none bg-transparent mb-2">+ Add author</button>}

      <div className="grid grid-cols-2 gap-2 mt-1">
        <div><label className={lbl}>Guide name</label><input className={fld} value={meta.guideName} onChange={(e) => set({ guideName: e.target.value })} /></div>
        <div><label className={lbl}>Guide designation</label><input className={fld} value={meta.guideDesignation} onChange={(e) => set({ guideDesignation: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className={lbl}>Co-guide name (opt.)</label><input className={fld} value={meta.coGuideName} onChange={(e) => set({ coGuideName: e.target.value })} /></div>
        <div><label className={lbl}>Co-guide designation</label><input className={fld} value={meta.coGuideDesignation} onChange={(e) => set({ coGuideDesignation: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className={lbl}>HOD / Coordinator name</label><input className={fld} value={meta.hodName} onChange={(e) => set({ hodName: e.target.value })} /></div>
        <div><label className={lbl}>Department name</label><input className={fld} value={meta.departmentName} onChange={(e) => set({ departmentName: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div><label className={lbl}>Project date</label><input className={fld} value={meta.projectDate} onChange={(e) => set({ projectDate: e.target.value })} placeholder="March-2026" /></div>
        <div><label className={lbl}>Academic year</label><input className={fld} value={meta.academicYear} onChange={(e) => set({ academicYear: e.target.value })} placeholder="2025-2026" /></div>
        <div><label className={lbl}>We / I</label><input className={fld} value={meta.weOrI} onChange={(e) => set({ weOrI: e.target.value })} placeholder="I" /></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className={lbl}>Declaration date</label><input className={fld} value={meta.dateOfDeclaration} onChange={(e) => set({ dateOfDeclaration: e.target.value })} placeholder="15-03-2026" /></div>
        <div><label className={lbl}>Keywords</label><input className={fld} value={meta.keywords} onChange={(e) => set({ keywords: e.target.value })} /></div>
      </div>
      <label className={lbl}>Abstract (leave blank to use an "Abstract" section from your document)</label>
      <textarea className={`${fld} min-h-[90px] resize-y`} value={meta.abstractText ?? ''}
        onChange={(e) => set({ abstractText: e.target.value })}
        placeholder="Your thesis abstract…" />
      <div className="text-[12px] font-medium text-[var(--color-text)] mt-2 mb-1">Department (for Vision/Mission pages)</div>
      <label className={lbl}>Department Vision</label>
      <textarea className={`${fld} min-h-[50px] resize-y`} value={meta.departmentVision ?? ''} onChange={(e) => set({ departmentVision: e.target.value })} />
      <label className={lbl}>Department Mission</label>
      <textarea className={`${fld} min-h-[50px] resize-y`} value={meta.departmentMission ?? ''} onChange={(e) => set({ departmentMission: e.target.value })} />
      <label className={lbl}>Program Educational Objectives (PEOs)</label>
      <textarea className={`${fld} min-h-[50px] resize-y`} value={meta.departmentPEOs ?? ''} onChange={(e) => set({ departmentPEOs: e.target.value })} />
      <label className={lbl}>Program Specific Outcomes (PSOs)</label>
      <textarea className={`${fld} min-h-[50px] resize-y`} value={meta.departmentPSOs ?? ''} onChange={(e) => set({ departmentPSOs: e.target.value })} />
    </div>
  );
}
