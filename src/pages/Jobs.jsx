import { useState, useEffect } from 'react';
import { jobApi } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const JOB_TYPES = ['all', 'full-time', 'part-time', 'remote', 'contract', 'internship'];

function timeAgo(date) {
  const d = Math.floor((Date.now() - new Date(date)) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return `${d} days ago`;
}

function JobCard({ job, active, onClick, isNew }) {
  return (
    <div className={`card card-hover ${isNew ? 'animate-slideUp' : 'animate-fadeUp'}`}
      onClick={() => onClick(job)}
      style={{
        padding: '18px', marginBottom: 10, cursor: 'pointer',
        borderColor: active ? 'rgba(255,255,255,0.2)' : undefined,
        background: active ? 'rgba(212,168,67,0.03)' : undefined,
        position: 'relative', overflow: 'hidden',
      }}>
      {active && (
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'var(--accent)', borderRadius: '10px 0 0 10px' }} />
      )}
      {isNew && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, var(--accent), transparent)', opacity: 0.6 }} />
      )}

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{
          width: 42, height: 42, borderRadius: 8, flexShrink: 0,
          background: 'var(--dark2)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text2)', fontWeight: 600,
        }}>{job.company?.[0]}</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, marginBottom: 1 }}>{job.title}</div>
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>{job.company}</div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{job.location}</span>
            {job.salary_min && (
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                ${Math.round(job.salary_min / 1000)}k–${Math.round(job.salary_max / 1000)}k
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="tag" style={{ fontSize: 10 }}>{job.job_type}</span>
            <span style={{ fontSize: 11, color: 'var(--muted2)' }}>{timeAgo(job.created_at)}</span>
            {isNew && <span className="live-dot" style={{ width: 6, height: 6 }} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function JobDetail({ job, onApply, applying, applied }) {
  return (
    <div className="card animate-scaleIn" style={{ padding: 26, position: 'sticky', top: 80 }}>
      {/* Warm light top */}
      <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)' }} />

      <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 10, flexShrink: 0,
          background: 'var(--dark2)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--text2)', fontWeight: 600,
        }}>{job.company?.[0]}</div>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500, lineHeight: 1.2 }}>{job.title}</h2>
          <div style={{ color: 'var(--text2)', fontSize: 14, marginTop: 2 }}>{job.company}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <span className="tag">{job.job_type}</span>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>{job.location}</span>
        {job.salary_min && (
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>
            ${Math.round(job.salary_min / 1000)}k – ${Math.round(job.salary_max / 1000)}k/yr
          </span>
        )}
      </div>

      <button
        className={`btn w-full ${applied ? 'btn-secondary' : 'btn-primary'}`}
        onClick={onApply} disabled={applied || applying}
        style={{ justifyContent: 'center', marginBottom: 22, height: 44, fontSize: 14 }}>
        {applying ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Applying…</>
          : applied ? '✓ Applied' : 'Apply Now'}
      </button>

      <div className="divider" />

      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500, marginBottom: 10 }}>About this role</h3>
      <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--text2)', marginBottom: 20 }}>{job.description}</p>

      {job.skills?.length > 0 && (
        <>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500, marginBottom: 10 }}>Skills</h3>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {job.skills.map(s => <span key={s} className="tag">{s}</span>)}
          </div>
        </>
      )}

      <div style={{ marginTop: 20, fontSize: 11, color: 'var(--muted2)', letterSpacing: '0.05em' }}>
        POSTED {new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
      </div>
    </div>
  );
}

// ── POST JOB MODAL ───────────────────────────────────────────
function PostJobModal({ onClose, onPosted, userId }) {
  const [form, setForm] = useState({ title: '', company: '', location: '', description: '', job_type: 'full-time', salary_min: '', salary_max: '', skills: '' });
  const [loading, setLoading] = useState(false);
  const set = key => e => setForm(p => ({ ...p, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = {
      ...form,
      poster_id: userId,
      salary_min: form.salary_min ? parseInt(form.salary_min) : null,
      salary_max: form.salary_max ? parseInt(form.salary_max) : null,
      skills: form.skills ? form.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
    };
    const { data } = await jobApi.create(payload);
    if (data) onPosted(data);
    setLoading(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxHeight: '88vh', overflowY: 'auto', maxWidth: 520 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontStyle: 'italic', fontWeight: 400, marginBottom: 20 }}>Post a Job</h2>
        <form onSubmit={handleSubmit}>
          {[['title','Job Title','Software Engineer'], ['company','Company','Acme Corp'], ['location','Location','Remote / City, Country']].map(([k,l,p]) => (
            <div key={k} className="form-group">
              <label className="label">{l}</label>
              <input className="input" placeholder={p} value={form[k]} onChange={set(k)} required />
            </div>
          ))}
          <div className="form-group">
            <label className="label">Job Type</label>
            <select className="input" value={form.job_type} onChange={set('job_type')}>
              {['full-time','part-time','remote','contract','internship'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="label">Salary Min (USD)</label>
              <input className="input" type="number" placeholder="80000" value={form.salary_min} onChange={set('salary_min')} />
            </div>
            <div className="form-group">
              <label className="label">Salary Max (USD)</label>
              <input className="input" type="number" placeholder="120000" value={form.salary_max} onChange={set('salary_max')} />
            </div>
          </div>
          <div className="form-group">
            <label className="label">Skills (comma-separated)</label>
            <input className="input" placeholder="React, TypeScript, Node.js" value={form.skills} onChange={set('skills')} />
          </div>
          <div className="form-group">
            <label className="label">Description</label>
            <textarea className="input" placeholder="Describe the role…" value={form.description} onChange={set('description')} required style={{ minHeight: 100 }} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1, justifyContent: 'center' }}>
              {loading ? <div className="spinner" style={{ width: 14, height: 14 }} /> : 'Post Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── JOBS PAGE ────────────────────────────────────────────────
export default function JobsPage() {
  const { user } = useAuth();
  const [jobs, setJobs]               = useState([]);
  const [selected, setSelected]       = useState(null);
  const [filter, setFilter]           = useState('all');
  const [search, setSearch]           = useState('');
  const [loading, setLoading]         = useState(true);
  const [applying, setApplying]       = useState(false);
  const [applied, setApplied]         = useState([]);
  const [newJobIds, setNewJobIds]      = useState(new Set());
  const [postModal, setPostModal]     = useState(false);
  const [toast, setToast]             = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => { loadJobs(); }, [filter]);

  useEffect(() => {
    if (user) {
      jobApi.getAppliedJobs(user.id).then(({ data }) => {
        setApplied(data?.map(a => a.job_id) || []);
      });
    }
    // ── REALTIME: new jobs ─────────────────────────────────
    const unsub = jobApi.subscribeToJobs((payload) => {
      setJobs(prev => [payload.new, ...prev]);
      setNewJobIds(s => new Set([...s, payload.new.id]));
      showToast('New job posted live ◈');
      setTimeout(() => setNewJobIds(s => { const n = new Set(s); n.delete(payload.new.id); return n; }), 8000);
    });
    return unsub;
  }, [user?.id]);

  const loadJobs = async () => {
    setLoading(true);
    const { data } = await jobApi.getAll({ type: filter === 'all' ? null : filter });
    setJobs(data || []);
    if (data?.length) setSelected(data[0]);
    setLoading(false);
  };

  const handleApply = async () => {
    if (!user || !selected) return;
    setApplying(true);
    await jobApi.apply(selected.id, user.id);
    setApplied(prev => [...prev, selected.id]);
    setApplying(false);
    showToast(`Applied to ${selected.title} at ${selected.company} ✓`);
  };

  const filtered = search
    ? jobs.filter(j => `${j.title} ${j.company}`.toLowerCase().includes(search.toLowerCase()))
    : jobs;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 400, fontStyle: 'italic', lineHeight: 1.2 }}>
            Find your next <em style={{ color: 'var(--accent)' }}>opportunity</em>
          </h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{jobs.length} open roles</span>
            <span className="live-dot" style={{ width: 6, height: 6 }} />
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>live</span>
          </div>
        </div>
        {user && (
          <button className="btn btn-secondary btn-sm" onClick={() => setPostModal(true)}>+ Post Job</button>
        )}
      </div>

      <input className="input" placeholder="Search title or company…" value={search}
        onChange={e => setSearch(e.target.value)} style={{ marginBottom: 14 }} />

      <div style={{ display: 'flex', gap: 7, marginBottom: 20, flexWrap: 'wrap' }}>
        {JOB_TYPES.map(t => (
          <button key={t} className={`btn btn-sm ${filter === t ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(t)} style={{ textTransform: 'capitalize' }}>{t}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
        <div>
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card" style={{ padding: 18, marginBottom: 10, height: 110 }}>
                  <div className="skeleton" style={{ height: '100%', borderRadius: 6 }} />
                </div>
              ))
            : filtered.map((job, i) => (
                <div key={job.id} style={{ animationDelay: `${i * 0.05}s` }}>
                  <JobCard job={job} active={selected?.id === job.id}
                    onClick={setSelected} isNew={newJobIds.has(job.id)} />
                </div>
              ))
          }
          {!loading && filtered.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">◇</div>
              <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>No jobs found</p>
            </div>
          )}
        </div>
        <div>
          {selected ? (
            <JobDetail job={selected} onApply={handleApply} applying={applying} applied={applied.includes(selected?.id)} />
          ) : (
            <div className="empty-state card" style={{ padding: 40 }}>
              <div style={{ fontSize: 32, marginBottom: 10, color: 'var(--muted)' }}>◇</div>
              <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>Select a job</p>
            </div>
          )}
        </div>
      </div>

      {postModal && <PostJobModal userId={user?.id} onClose={() => setPostModal(false)} onPosted={(job) => { setJobs(p => [job, ...p]); setSelected(job); }} />}

      {toast && (
        <div className="toast toast-accent">
          <span className="live-dot" style={{ width: 6, height: 6 }} /> {toast}
        </div>
      )}
    </div>
  );
}
