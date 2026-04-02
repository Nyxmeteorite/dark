import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

// ── RESUME API ────────────────────────────────────────────────
const resumeApi = {
  get: (userId) =>
    supabase.from('resumes').select('*').eq('user_id', userId).maybeSingle(),

  upsert: (userId, data) =>
    supabase.from('resumes').upsert({ user_id: userId, ...data, updated_at: new Date().toISOString() })
      .select().single(),

  uploadFile: async (userId, file) => {
    const ext = file.name.split('.').pop();
    const path = `${userId}/resume.${ext}`;
    const { error } = await supabase.storage.from('resumes').upload(path, file, { upsert: true });
    if (error) return { data: null, error };
    const { data } = supabase.storage.from('resumes').getPublicUrl(path);
    return { data: data.publicUrl, error: null };
  },
};

// ── SECTION COMPONENTS ────────────────────────────────────────
function SectionHeader({ title, onAdd, addLabel = '+ Add' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontStyle: 'italic', fontWeight: 500, color: 'var(--accent)' }}>{title}</h3>
      {onAdd && (
        <button className="btn btn-secondary btn-sm" onClick={onAdd} style={{ fontSize: 11 }}>{addLabel}</button>
      )}
    </div>
  );
}

function EntryCard({ children, onRemove }) {
  return (
    <div style={{ background: 'var(--dark)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px', marginBottom: 10, position: 'relative' }}>
      {onRemove && (
        <button onClick={onRemove} style={{
          position: 'absolute', top: 10, right: 10,
          background: 'none', border: 'none', color: 'var(--muted2)', fontSize: 16, cursor: 'pointer', lineHeight: 1
        }}>×</button>
      )}
      {children}
    </div>
  );
}

// ── RESUME BUILDER ────────────────────────────────────────────
export default function ResumePage() {
  const { user, profile } = useAuth();

  // Tabs: 'build' | 'upload'
  const [tab, setTab] = useState('build');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Uploaded file state
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  // Resume builder data
  const [resumeData, setResumeData] = useState({
    summary: '',
    experiences: [],
    education: [],
    skills: '',
    certifications: [],
    links: { linkedin: '', github: '', portfolio: '' },
  });

  // Load existing resume
  useEffect(() => {
    if (!user?.id) return;
    resumeApi.get(user.id).then(({ data }) => {
      if (data) {
        setUploadedUrl(data.file_url || null);
        if (data.builder_data) {
          setResumeData(prev => ({ ...prev, ...data.builder_data }));
        }
      }
      setLoading(false);
    });
  }, [user?.id]);

  // ── Autosave builder data after 1.5s idle
  const saveTimeout = useRef(null);
  const autoSave = (newData) => {
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      setSaving(true);
      await resumeApi.upsert(user.id, { builder_data: newData, file_url: uploadedUrl });
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 1500);
  };

  const update = (key, value) => {
    const next = { ...resumeData, [key]: value };
    setResumeData(next);
    autoSave(next);
  };

  // ── Experience
  const addExp = () => update('experiences', [...resumeData.experiences, { id: Date.now(), role: '', company: '', period: '', description: '' }]);
  const updateExp = (id, field, val) => update('experiences', resumeData.experiences.map(e => e.id === id ? { ...e, [field]: val } : e));
  const removeExp = (id) => update('experiences', resumeData.experiences.filter(e => e.id !== id));

  // ── Education
  const addEdu = () => update('education', [...resumeData.education, { id: Date.now(), degree: '', institution: '', period: '', grade: '' }]);
  const updateEdu = (id, field, val) => update('education', resumeData.education.map(e => e.id === id ? { ...e, [field]: val } : e));
  const removeEdu = (id) => update('education', resumeData.education.filter(e => e.id !== id));

  // ── Certifications
  const addCert = () => update('certifications', [...resumeData.certifications, { id: Date.now(), name: '', issuer: '', year: '' }]);
  const updateCert = (id, field, val) => update('certifications', resumeData.certifications.map(c => c.id === id ? { ...c, [field]: val } : c));
  const removeCert = (id) => update('certifications', resumeData.certifications.filter(c => c.id !== id));

  // ── File upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.type)) {
      setUploadError('Only PDF or Word documents are accepted.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File must be under 5 MB.');
      return;
    }
    setUploadError(null);
    setUploading(true);
    const { data: url, error } = await resumeApi.uploadFile(user.id, file);
    if (error) { setUploadError('Upload failed. Please try again.'); setUploading(false); return; }
    setUploadedUrl(url);
    await resumeApi.upsert(user.id, { file_url: url, builder_data: resumeData });
    setUploading(false);
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
      <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
    </div>
  );

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 400, fontStyle: 'italic', marginBottom: 4 }}>
          Resume
        </h2>
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>Build your resume or upload an existing one.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        {[['build', 'Build Resume'], ['upload', 'Upload Resume']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            background: 'none', border: 'none', padding: '9px 20px',
            color: tab === id ? 'var(--accent)' : 'var(--muted)',
            fontWeight: tab === id ? 600 : 400, fontSize: 13,
            borderBottom: tab === id ? '2px solid var(--accent)' : '2px solid transparent',
            cursor: 'pointer', transition: 'all 0.2s',
            fontFamily: 'var(--font-body)', letterSpacing: '0.04em',
          }}>{label}</button>
        ))}
        {saving && <span style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: 11, color: 'var(--muted)', letterSpacing: '0.06em' }}>Saving…</span>}
        {saved && <span style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: 11, color: 'var(--success)', letterSpacing: '0.06em' }}>Saved</span>}
      </div>

      {/* ── UPLOAD TAB */}
      {tab === 'upload' && (
        <div className="animate-fadeIn">
          <div className="card" style={{ padding: 28 }}>
            <SectionHeader title="Upload Your Resume" />
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
              Accepted formats: PDF, DOC, DOCX — max 25 MB
            </p>

            {uploadedUrl ? (
              <div style={{ marginBottom: 20 }}>
                <div style={{ background: 'var(--dark)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>Resume uploaded</div>
                    <a href={uploadedUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--accent)' }}>View file</a>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()}>Replace</button>
                </div>
              </div>
            ) : null}

            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--border2)', borderRadius: 10, padding: '40px 24px',
                textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border2)'}
            >
              {uploading
                ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div className="spinner" style={{ width: 24, height: 24 }} />
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>Uploading…</span>
                  </div>
                : <>
                    <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>↑</div>
                    <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 6 }}>
                      {uploadedUrl ? 'Drop a new file to replace' : 'Drop your resume here or click to browse'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>PDF, DOC, DOCX up to 25 MB</div>
                  </>
              }
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            {uploadError && <div style={{ marginTop: 12, fontSize: 12, color: 'var(--danger)' }}>{uploadError}</div>}
          </div>
        </div>
      )}

      {/* ── BUILD TAB */}
      {tab === 'build' && (
        <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Personal Info */}
          <div className="card" style={{ padding: 22 }}>
            <SectionHeader title="Personal Info" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="label">Full Name</label>
                <input className="input" value={profile?.full_name || ''} disabled style={{ opacity: 0.6 }} />
              </div>
              <div className="form-group">
                <label className="label">Headline</label>
                <input className="input" value={profile?.headline || ''} disabled style={{ opacity: 0.6 }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
              {[['linkedin', 'LinkedIn URL'], ['github', 'GitHub URL'], ['portfolio', 'Portfolio URL']].map(([k, label]) => (
                <div key={k} className="form-group">
                  <label className="label">{label}</label>
                  <input className="input" value={resumeData.links[k]} placeholder={`https://`}
                    onChange={e => update('links', { ...resumeData.links, [k]: e.target.value })} />
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="card" style={{ padding: 22 }}>
            <SectionHeader title="Professional Summary" />
            <textarea className="input" rows={4}
              placeholder="Write a compelling 2–3 sentence summary about your professional background and goals…"
              value={resumeData.summary}
              onChange={e => update('summary', e.target.value)}
              style={{ minHeight: 90, resize: 'vertical' }}
            />
          </div>

          {/* Experience */}
          <div className="card" style={{ padding: 22 }}>
            <SectionHeader title="Work Experience" onAdd={addExp} addLabel="+ Add Experience" />
            {resumeData.experiences.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontSize: 13 }}>
                No experience added yet.
              </div>
            )}
            {resumeData.experiences.map(exp => (
              <EntryCard key={exp.id} onRemove={() => removeExp(exp.id)}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div className="form-group">
                    <label className="label">Role / Title</label>
                    <input className="input" value={exp.role} placeholder="Software Engineer"
                      onChange={e => updateExp(exp.id, 'role', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="label">Company</label>
                    <input className="input" value={exp.company} placeholder="Company Name"
                      onChange={e => updateExp(exp.id, 'company', e.target.value)} />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label className="label">Period</label>
                  <input className="input" value={exp.period} placeholder="Jan 2023 – Present"
                    onChange={e => updateExp(exp.id, 'period', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="label">Description</label>
                  <textarea className="input" rows={3} value={exp.description}
                    placeholder="Describe your key responsibilities and achievements…"
                    onChange={e => updateExp(exp.id, 'description', e.target.value)}
                    style={{ minHeight: 72, resize: 'vertical' }} />
                </div>
              </EntryCard>
            ))}
          </div>

          {/* Education */}
          <div className="card" style={{ padding: 22 }}>
            <SectionHeader title="Education" onAdd={addEdu} addLabel="+ Add Education" />
            {resumeData.education.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontSize: 13 }}>
                No education added yet.
              </div>
            )}
            {resumeData.education.map(edu => (
              <EntryCard key={edu.id} onRemove={() => removeEdu(edu.id)}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div className="form-group">
                    <label className="label">Degree / Program</label>
                    <input className="input" value={edu.degree} placeholder="B.E. Computer Science"
                      onChange={e => updateEdu(edu.id, 'degree', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="label">Institution</label>
                    <input className="input" value={edu.institution} placeholder="University Name"
                      onChange={e => updateEdu(edu.id, 'institution', e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="form-group">
                    <label className="label">Period</label>
                    <input className="input" value={edu.period} placeholder="2021 – 2025"
                      onChange={e => updateEdu(edu.id, 'period', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="label">Grade / CGPA</label>
                    <input className="input" value={edu.grade} placeholder="8.5 / 10"
                      onChange={e => updateEdu(edu.id, 'grade', e.target.value)} />
                  </div>
                </div>
              </EntryCard>
            ))}
          </div>

          {/* Skills */}
          <div className="card" style={{ padding: 22 }}>
            <SectionHeader title="Skills" />
            <textarea className="input" rows={3}
              placeholder="React, Node.js, MongoDB, TypeScript, Docker, AWS… (comma separated)"
              value={resumeData.skills}
              onChange={e => update('skills', e.target.value)}
              style={{ minHeight: 72, resize: 'vertical' }}
            />
            {resumeData.skills && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                {resumeData.skills.split(',').map(s => s.trim()).filter(Boolean).map((skill, i) => (
                  <span key={i} className="tag" style={{ fontSize: 11 }}>{skill}</span>
                ))}
              </div>
            )}
          </div>

          {/* Certifications */}
          <div className="card" style={{ padding: 22 }}>
            <SectionHeader title="Certifications" onAdd={addCert} addLabel="+ Add Cert" />
            {resumeData.certifications.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontSize: 13 }}>
                No certifications added yet.
              </div>
            )}
            {resumeData.certifications.map(cert => (
              <EntryCard key={cert.id} onRemove={() => removeCert(cert.id)}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
                  <div className="form-group">
                    <label className="label">Certification Name</label>
                    <input className="input" value={cert.name} placeholder="AWS Solutions Architect"
                      onChange={e => updateCert(cert.id, 'name', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="label">Issuer</label>
                    <input className="input" value={cert.issuer} placeholder="Amazon"
                      onChange={e => updateCert(cert.id, 'issuer', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="label">Year</label>
                    <input className="input" value={cert.year} placeholder="2024"
                      onChange={e => updateCert(cert.id, 'year', e.target.value)} />
                  </div>
                </div>
              </EntryCard>
            ))}
          </div>

          {/* Save button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: 20 }}>
            <button className="btn btn-primary" disabled={saving}
              onClick={async () => {
                setSaving(true);
                await resumeApi.upsert(user.id, { builder_data: resumeData, file_url: uploadedUrl });
                setSaving(false);
                setSaved(true);
                setTimeout(() => setSaved(false), 2500);
              }}>
              {saving ? <div className="spinner" style={{ width: 14, height: 14 }} /> : saved ? 'Saved' : 'Save Resume'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
