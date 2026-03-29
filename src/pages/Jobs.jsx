import { useState, useEffect } from 'react';
import { jobApi, profileApi } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/Avatar';

const JOB_TYPES = ['all', 'full-time', 'part-time', 'remote', 'contract', 'internship'];

const STATUS_PIPELINE = [
  { key: 'applied',       label: 'Applied',        color: 'var(--accent)',          icon: '◈' },
  { key: 'under_review',  label: 'Under Review',   color: '#a78bfa',                icon: '◎' },
  { key: 'accepted',      label: 'Accepted',       color: '#34d399',                icon: '✓' },
  { key: 'rejected',      label: 'Rejected',       color: '#f87171',                icon: '✕' },
];

function timeAgo(date) {
  const d = Math.floor((Date.now() - new Date(date)) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return `${d} days ago`;
}

// ── STATUS BADGE ─────────────────────────────────────────────
function StatusBadge({ status }) {
  const s = STATUS_PIPELINE.find(p => p.key === status) || STATUS_PIPELINE[0];
  return (
    <span style={{
      fontSize: 11, padding: '3px 8px', borderRadius: 20,
      background: s.color + '22', color: s.color,
      border: `1px solid ${s.color}44`, fontWeight: 600, letterSpacing: '0.04em',
    }}>
      {s.icon} {s.label}
    </span>
  );
}

// ── PIPELINE TRACKER ─────────────────────────────────────────
function PipelineTracker({ status }) {
  const steps = STATUS_PIPELINE.filter(s => s.key !== 'rejected');
  const isRejected = status === 'rejected';
  const currentIdx = steps.findIndex(s => s.key === status);

  return (
    <div style={{ padding: '14px 16px', background: 'var(--dark2)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Application Status</div>
      {isRejected ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f87171' }}>
          <span style={{ fontSize: 18 }}>✕</span>
          <span style={{ fontSize: 13, fontFamily: 'var(--font-display)' }}>Not selected for this role</span>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {steps.map((step, i) => {
            const done = i <= currentIdx;
            const active = i === currentIdx;
            return (
              <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: done ? step.color + '22' : 'var(--dark3, #1a1a1a)',
                    border: `2px solid ${done ? step.color : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, color: done ? step.color : 'var(--muted)',
                    boxShadow: active ? `0 0 10px ${step.color}66` : 'none',
                    transition: '0.3s',
                  }}>{step.icon}</div>
                  <span style={{ fontSize: 10, color: done ? step.color : 'var(--muted)', whiteSpace: 'nowrap', fontWeight: active ? 700 : 400 }}>{step.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: done && i < currentIdx ? step.color : 'var(--border)', margin: '0 4px', marginBottom: 16, transition: '0.3s' }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── JOB CARD ─────────────────────────────────────────────────
function JobCard({ job, active, onClick, isNew, applicationStatus }) {
  return (
    <div
      className={`card card-hover ${isNew ? 'animate-slideUp' : 'animate-fadeUp'}`}
      onClick={() => onClick(job)}
      style={{
        padding: '18px', marginBottom: 10, cursor: 'pointer',
        borderColor: active ? 'rgba(255,255,255,0.2)' : undefined,
        background: active ? 'rgba(212,168,67,0.03)' : undefined,
        position: 'relative', overflow: 'hidden',
      }}>
      {active && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'var(--accent)', borderRadius: '10px 0 0 10px' }} />}
      {isNew && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, var(--accent), transparent)', opacity: 0.6 }} />}

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
            {applicationStatus && <StatusBadge status={applicationStatus} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── APPLICATION FORM MODAL ────────────────────────────────────
function ApplyModal({ job, user, onClose, onApplied }) {
  const [form, setForm] = useState({ name: '', email: user?.email || '', cover_letter: '' });
  const [loading, setLoading] = useState(false);
  const set = key => e => setForm(p => ({ ...p, [key]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.name || !form.email) return;
    setLoading(true);
    const { error } = await jobApi.applyWithDetails({
      job_id: job.id,
      user_id: user.id,
      applicant_name: form.name,
      applicant_email: form.email,
      cover_letter: form.cover_letter,
      status: 'applied',
    });
    setLoading(false);
    if (!error) onApplied();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 500 }}>
        {/* Top accent line */}
        <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: 1, background: 'linear-gradient(90deg, transparent, var(--accent), transparent)' }} />

        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontStyle: 'italic', fontWeight: 400, marginBottom: 4 }}>Apply for this role</h2>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 22 }}>{job.title} · {job.company}</p>

        <div className="form-group">
          <label className="label">Full Name</label>
          <input className="input" placeholder="Your name" value={form.name} onChange={set('name')} />
        </div>
        <div className="form-group">
          <label className="label">Email</label>
          <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} />
        </div>
        <div className="form-group">
          <label className="label">Cover Letter <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
          <textarea className="input" placeholder="Tell the recruiter why you're a great fit…" value={form.cover_letter} onChange={set('cover_letter')} style={{ minHeight: 120, resize: 'vertical' }} />
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading || !form.name || !form.email} style={{ flex: 1, justifyContent: 'center' }}>
            {loading ? <div className="spinner" style={{ width: 14, height: 14 }} /> : 'Submit Application'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── RECRUITER PANEL MODAL ─────────────────────────────────────
function RecruiterPanel({ job, onClose, onStatusUpdate }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    jobApi.getApplicationsForJob(job.id).then(({ data }) => {
      setApplications(data || []);
      setLoading(false);
    });
  }, [job.id]);

  const handleUpdate = async (appId, newStatus) => {
    setUpdating(true);
    await jobApi.updateApplicationStatus(appId, newStatus, notes);
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus, recruiter_notes: notes } : a));
    if (selected?.id === appId) setSelected(p => ({ ...p, status: newStatus, recruiter_notes: notes }));
    setUpdating(false);
    onStatusUpdate?.();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 780, maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}>
        <div style={{ padding: '22px 26px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontStyle: 'italic', fontWeight: 400 }}>Applications — {job.title}</h2>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{applications.length} applicant{applications.length !== 1 ? 's' : ''}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', flex: 1, overflow: 'hidden' }}>
          {/* Applicant list */}
          <div style={{ borderRight: '1px solid var(--border)', overflowY: 'auto', padding: 12 }}>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 64, borderRadius: 8, marginBottom: 8 }} />
              ))
            ) : applications.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No applications yet</div>
            ) : applications.map(app => (
              <div
                key={app.id}
                onClick={() => { setSelected(app); setNotes(app.recruiter_notes || ''); }}
                style={{
                  padding: '10px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 4,
                  background: selected?.id === app.id ? 'var(--dark2)' : 'transparent',
                  border: `1px solid ${selected?.id === app.id ? 'var(--border)' : 'transparent'}`,
                  transition: '0.2s',
                }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{app.applicant_name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>{app.applicant_email}</div>
                <StatusBadge status={app.status} />
              </div>
            ))}
          </div>

          {/* Applicant detail */}
          <div style={{ overflowY: 'auto', padding: 22 }}>
            {!selected ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                Select an applicant
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500 }}>{selected.applicant_name}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{selected.applicant_email}</div>
                  <div style={{ marginTop: 8 }}><StatusBadge status={selected.status} /></div>
                </div>

                <PipelineTracker status={selected.status} />

                {selected.cover_letter && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Cover Letter</div>
                    <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--text2)', background: 'var(--dark2)', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
                      {selected.cover_letter}
                    </p>
                  </div>
                )}

                <div style={{ marginBottom: 20 }}>
                  <label className="label">Recruiter Notes</label>
                  <textarea className="input" value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="Internal notes about this applicant…"
                    style={{ minHeight: 80, resize: 'vertical' }} />
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleUpdate(selected.id, 'under_review')} disabled={updating || selected.status === 'under_review'} style={{ color: '#a78bfa', borderColor: '#a78bfa44' }}>
                    ◎ Mark Under Review
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleUpdate(selected.id, 'accepted')} disabled={updating || selected.status === 'accepted'} style={{ color: '#34d399', borderColor: '#34d39944' }}>
                    ✓ Accept
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleUpdate(selected.id, 'rejected')} disabled={updating || selected.status === 'rejected'} style={{ color: '#f87171', borderColor: '#f8717144' }}>
                    ✕ Reject
                  </button>
                </div>

                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--muted2)' }}>
                  Applied {timeAgo(selected.created_at)}
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ padding: '12px 26px', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── JOB DETAIL ────────────────────────────────────────────────
function JobDetail({ job, onApply, applied, applicationStatus, poster, navigate, isRecruiter, onReviewApplicants }) {
  return (
    <div className="card animate-scaleIn" style={{ padding: 26, position: 'sticky', top: 80 }}>
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

      {poster && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '10px 14px', background: 'var(--dark2)', borderRadius: 8, border: '1px solid var(--border)' }}>
          <div onClick={() => navigate('/profile/' + job.poster_id)} style={{ cursor: 'pointer' }}>
            <Avatar profile={poster} size="sm" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Posted by</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }} onClick={() => navigate('/profile/' + job.poster_id)}>{poster.full_name}</div>
          </div>
        </div>
      )}

      {/* Pipeline tracker for applicant */}
      {applicationStatus && <PipelineTracker status={applicationStatus} />}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <span className="tag">{job.job_type}</span>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>{job.location}</span>
        {job.salary_min && (
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>
            ${Math.round(job.salary_min / 1000)}k – ${Math.round(job.salary_max / 1000)}k/yr
          </span>
        )}
      </div>

      {isRecruiter ? (
        <button className="btn btn-secondary w-full" onClick={onReviewApplicants} style={{ justifyContent: 'center', marginBottom: 22, height: 44, fontSize: 14, color: '#a78bfa', borderColor: '#a78bfa44' }}>
          ◎ Review Applicants
        </button>
      ) : (
        <button
          className={`btn w-full ${applied ? 'btn-secondary' : 'btn-primary'}`}
          onClick={onApply} disabled={applied}
          style={{ justifyContent: 'center', marginBottom: 22, height: 44, fontSize: 14 }}>
          {applied ? `✓ Applied` : 'Apply Now'}
        </button>
      )}

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

// ── POST JOB MODAL ────────────────────────────────────────────
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

// ── JOBS PAGE ─────────────────────────────────────────────────
export default function JobsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs]               = useState([]);
  const [selected, setSelected]       = useState(null);
  const [poster, setPoster]           = useState(null);
  const [filter, setFilter]           = useState('all');
  const [search, setSearch]           = useState('');
  const [loading, setLoading]         = useState(true);
  const [appliedMap, setAppliedMap]   = useState({});   // { job_id: status }
  const [newJobIds, setNewJobIds]      = useState(new Set());
  const [postModal, setPostModal]     = useState(false);
  const [applyModal, setApplyModal]   = useState(false);
  const [recruiterPanel, setRecruiterPanel] = useState(false);
  const [toast, setToast]             = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3200); };

  useEffect(() => { loadJobs(); }, [filter]);

  useEffect(() => {
    if (selected?.poster_id) {
      profileApi.getById(selected.poster_id).then(({ data }) => setPoster(data));
    } else {
      setPoster(null);
    }
  }, [selected?.id]);

  useEffect(() => {
    if (user) {
      // Load all user applications as a map { job_id: status }
      jobApi.getAppliedJobs(user.id).then(({ data }) => {
        const map = {};
        (data || []).forEach(a => { map[a.job_id] = a.status; });
        setAppliedMap(map);
      });
    }
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

  const handleApplied = () => {
    setAppliedMap(prev => ({ ...prev, [selected.id]: 'applied' }));
    showToast(`Application sent for ${selected.title} at ${selected.company} ✓`);
  };

  const isRecruiter = selected && user && selected.poster_id === user.id;
  const filtered = search
    ? jobs.filter(j => `${j.title} ${j.company}`.toLowerCase().includes(search.toLowerCase()))
    : jobs;

  return (
    <div>
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
                  <JobCard
                    job={job}
                    active={selected?.id === job.id}
                    onClick={setSelected}
                    isNew={newJobIds.has(job.id)}
                    applicationStatus={appliedMap[job.id]}
                  />
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
            <JobDetail
              job={selected}
              onApply={() => setApplyModal(true)}
              applied={!!appliedMap[selected.id]}
              applicationStatus={appliedMap[selected.id]}
              poster={poster}
              navigate={navigate}
              isRecruiter={isRecruiter}
              onReviewApplicants={() => setRecruiterPanel(true)}
            />
          ) : (
            <div className="empty-state card" style={{ padding: 40 }}>
              <div style={{ fontSize: 32, marginBottom: 10, color: 'var(--muted)' }}>◇</div>
              <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>Select a job</p>
            </div>
          )}
        </div>
      </div>

      {postModal && (
        <PostJobModal userId={user?.id} onClose={() => setPostModal(false)}
          onPosted={(job) => { setJobs(p => [job, ...p]); setSelected(job); }} />
      )}

      {applyModal && selected && (
        <ApplyModal job={selected} user={user} onClose={() => setApplyModal(false)} onApplied={handleApplied} />
      )}

      {recruiterPanel && selected && (
        <RecruiterPanel job={selected} onClose={() => setRecruiterPanel(false)} onStatusUpdate={() => {}} />
      )}

      {toast && (
        <div className="toast toast-accent">
          <span className="live-dot" style={{ width: 6, height: 6 }} /> {toast}
        </div>
      )}
    </div>
  );
}
