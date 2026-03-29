import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { profileApi, postApi, connectionApi, jobApi, supabase } from '../lib/supabase';
import { useNavigate, useParams } from 'react-router-dom';
import Avatar from '../components/Avatar';

// ── STATUS PIPELINE (mirrors Jobs.jsx) ───────────────────────
const STATUS_PIPELINE = [
  { key: 'applied',      label: 'Applied',      color: 'var(--accent)', icon: '◈' },
  { key: 'under_review', label: 'Under Review', color: '#a78bfa',       icon: '◎' },
  { key: 'accepted',     label: 'Accepted',     color: '#34d399',       icon: '✓' },
  { key: 'rejected',     label: 'Rejected',     color: '#f87171',       icon: '✕' },
];

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

function PipelineTracker({ status }) {
  const steps = STATUS_PIPELINE.filter(s => s.key !== 'rejected');
  const isRejected = status === 'rejected';
  const currentIdx = steps.findIndex(s => s.key === status);

  return (
    <div style={{ marginTop: 12 }}>
      {isRejected ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f87171' }}>
          <span>✕</span>
          <span style={{ fontSize: 12, fontFamily: 'var(--font-display)' }}>Not selected for this role</span>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {steps.map((step, i) => {
            const done = i <= currentIdx;
            const active = i === currentIdx;
            return (
              <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: done ? step.color + '22' : 'var(--dark2)',
                    border: `2px solid ${done ? step.color : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, color: done ? step.color : 'var(--muted)',
                    boxShadow: active ? `0 0 8px ${step.color}55` : 'none',
                    transition: '0.3s',
                  }}>{step.icon}</div>
                  <span style={{ fontSize: 9, color: done ? step.color : 'var(--muted)', whiteSpace: 'nowrap', fontWeight: active ? 700 : 400 }}>
                    {step.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div style={{
                    flex: 1, height: 2, margin: '0 3px', marginBottom: 14,
                    background: done && i < currentIdx ? step.color : 'var(--border)',
                    transition: '0.3s',
                  }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── EDIT MODAL ───────────────────────────────────────────────
function EditModal({ profile, onSave, onClose }) {
  const [form, setForm] = useState({
    full_name: profile.full_name || '',
    headline: profile.headline || '',
    bio: profile.bio || '',
    location: profile.location || '',
    website: profile.website || '',
    open_to_work: profile.open_to_work || false,
  });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    setLoading(true);
    const { data } = await profileApi.update(profile.id, form);
    if (data) onSave(data);
    setLoading(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxHeight: '88vh', overflowY: 'auto' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontStyle: 'italic', fontWeight: 400, marginBottom: 20 }}>Edit Profile</h2>
        {[['full_name','Full Name'],['headline','Profession'],['location','Location'],['website','Website']].map(([k,l]) => (
          <div key={k} className="form-group">
            <label className="label">{l}</label>
            <input className="input" value={form[k]} onChange={set(k)} />
          </div>
        ))}
        <div className="form-group">
          <label className="label">Bio</label>
          <textarea className="input" value={form.bio} onChange={set('bio')} style={{ minHeight: 80 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
          <input type="checkbox" id="otw" checked={form.open_to_work}
            onChange={e => setForm(p => ({ ...p, open_to_work: e.target.checked }))}
            style={{ accentColor: 'var(--accent)', width: 16, height: 16 }} />
          <label htmlFor="otw" style={{ fontSize: 13, color: 'var(--text2)', cursor: 'pointer' }}>Open to Work</label>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading} style={{ flex: 1, justifyContent: 'center' }}>
            {loading ? <div className="spinner" style={{ width: 14, height: 14 }} /> : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PROFILE PAGE ─────────────────────────────────────────────
export default function ProfilePage() {
  const { user, profile: myProfile, refreshProfile } = useAuth();
  const { id: urlId } = useParams();
  const [profile, setProfile]           = useState(null);
  const [posts, setPosts]               = useState([]);
  const [connections, setConnections]   = useState([]);
  const [pendingReqs, setPendingReqs]   = useState([]);
  const [applications, setApplications] = useState([]);   // { job, status, created_at }
  const [appsLoading, setAppsLoading]   = useState(false);
  const [tab, setTab]                   = useState('posts');
  const [loading, setLoading]           = useState(true);
  const [editOpen, setEditOpen]         = useState(false);
  const [connStatus, setConnStatus]     = useState(null);
  const [connecting, setConnecting]     = useState(false);
  const [acceptingId, setAcceptingId]   = useState(null);
  const navigate = useNavigate();
  const viewId = urlId || user?.id;
  const isOwn  = viewId === user?.id;

  useEffect(() => { if (viewId) load(); }, [viewId]);

  // Realtime: incoming connection requests
  useEffect(() => {
    if (!isOwn || !viewId) return;
    const channel = supabase.channel('pending-requests')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'connections', filter: `addressee_id=eq.${viewId}` },
        async (payload) => {
          const { data: requester } = await profileApi.getById(payload.new.requester_id);
          if (requester) setPendingReqs(prev => [...prev, { ...payload.new, requester }]);
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'connections', filter: `addressee_id=eq.${viewId}` },
        (payload) => {
          if (payload.new.status === 'accepted')
            setPendingReqs(prev => prev.filter(r => r.id !== payload.new.id));
        })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [viewId, isOwn]);

  // Load applications when tab is opened (lazy)
  useEffect(() => {
    if (tab === 'applications' && isOwn && applications.length === 0) {
      loadApplications();
    }
  }, [tab]);

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: userPosts }, { data: conns }] = await Promise.all([
      profileApi.getById(viewId),
      postApi.getByUserId(viewId),
      connectionApi.getByUser(viewId),
    ]);
    setProfile(p);
    setPosts(userPosts || []);
    setConnections(conns || []);

    if (isOwn) {
      const { data: pending } = await connectionApi.getPending(viewId);
      setPendingReqs(pending || []);
    } else if (user?.id) {
      const status = await connectionApi.getStatus(user.id, viewId);
      setConnStatus(status);
    }
    setLoading(false);
  };

  const loadApplications = async () => {
    setAppsLoading(true);
    // Get all applications for user, join with job details
    const { data: apps } = await supabase
      .from('job_applications')
      .select('*, jobs(id, title, company, location, job_type, salary_min, salary_max)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setApplications(apps || []);
    setAppsLoading(false);
  };

  const handleConnect = async () => {
    if (!user?.id || connecting) return;
    setConnecting(true);
    await connectionApi.send(user.id, viewId);
    setConnStatus('pending');
    setConnecting(false);
  };

  const handleAccept = async (connectionId) => {
    setAcceptingId(connectionId);
    await connectionApi.accept(connectionId);
    const accepted = pendingReqs.find(r => r.id === connectionId);
    if (accepted) {
      setPendingReqs(prev => prev.filter(r => r.id !== connectionId));
      setConnections(prev => [...prev, accepted]);
    }
    setAcceptingId(null);
  };

  const handleSave = (updated) => { setProfile(updated); if (isOwn) refreshProfile(); };

  const resolveOther = (conn) => {
    if (conn.requester_id === viewId) return conn.addressee;
    return conn.requester;
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
      <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
    </div>
  );

  if (!profile) return (
    <div className="empty-state">
      <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>Profile not found</p>
    </div>
  );

  const tabs = isOwn
    ? ['posts', 'connections', 'requests', 'applications', 'about']
    : ['posts', 'connections', 'about'];

  return (
    <div className="animate-fadeIn">
      {/* Banner */}
      <div style={{ height: 150, borderRadius: '10px 10px 0 0', overflow: 'hidden', background: '#1a1a1a', position: 'relative' }}>
        {profile.banner_url && <img src={profile.banner_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        <div style={{ position: 'absolute', bottom: 0, left: '30%', right: '30%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)' }} />
      </div>

      {/* Profile header */}
      <div className="card" style={{ padding: 22, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: 'none', overflow: 'visible', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ marginTop: -54, marginLeft: 16, position: 'relative', zIndex: 10 }}>
            <Avatar profile={profile} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {isOwn
              ? <button className="btn btn-secondary btn-sm" onClick={() => setEditOpen(true)}>Edit Profile</button>
              : (
                <button
                  className={`btn btn-sm ${connStatus === 'accepted' ? 'btn-secondary' : connStatus === 'pending' ? 'btn-ghost' : 'btn-primary'}`}
                  onClick={handleConnect}
                  disabled={!!connStatus || connecting}
                  style={{ justifyContent: 'center', minWidth: 110 }}>
                  {connecting
                    ? <div className="spinner" style={{ width: 12, height: 12 }} />
                    : connStatus === 'accepted' ? 'Connected'
                    : connStatus === 'pending'  ? 'Request Sent'
                    : '+ Connect'}
                </button>
              )
            }
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 500, fontStyle: 'italic' }}>{profile.full_name}</h1>
            {profile.open_to_work && <span className="tag" style={{ fontSize: 10 }}>Open to Work</span>}
          </div>
          {profile.headline && <p style={{ color: 'var(--text2)', fontSize: 14, marginTop: 2 }}>{profile.headline}</p>}
          {profile.location && <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>{profile.location}</p>}
          {profile.bio && <p style={{ marginTop: 12, fontSize: 13, lineHeight: 1.75, color: 'var(--text2)' }}>{profile.bio}</p>}
          {profile.website && <a href={profile.website} target="_blank" rel="noreferrer" style={{ fontSize: 12, marginTop: 6, display: 'block' }}>{profile.website}</a>}
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 28, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          {[
            ['Posts', posts.length, null],
            ['Connections', connections.length, 'connections'],
            ...(isOwn && pendingReqs.length > 0 ? [['Requests', pendingReqs.length, 'requests']] : []),
          ].map(([l, c, target]) => (
            <div key={l} style={{ textAlign: 'center', cursor: target ? 'pointer' : 'default' }} onClick={() => target && setTab(target)}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 500, color: 'var(--accent)' }}>{c}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{l}</div>
            </div>
          ))}
          <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted2)', alignSelf: 'flex-end' }}>
            Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', margin: '14px 0 0' }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: 'none', border: 'none', padding: '9px 18px',
            color: tab === t ? 'var(--accent)' : 'var(--muted)',
            fontWeight: tab === t ? 600 : 400, fontSize: 13,
            borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
            cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.2s',
            fontFamily: 'var(--font-body)', letterSpacing: '0.04em', position: 'relative',
          }}>
            {t}
            {t === 'requests' && pendingReqs.length > 0 && (
              <span style={{
                position: 'absolute', top: 6, right: 2,
                background: 'var(--accent)', color: 'var(--black)',
                borderRadius: '50%', width: 14, height: 14,
                fontSize: 9, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>{pendingReqs.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ marginTop: 16 }}>

        {/* POSTS */}
        {tab === 'posts' && (
          posts.length === 0
            ? <div className="empty-state"><p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>No posts yet</p></div>
            : posts.map((p, i) => (
                <div key={p.id} className="card animate-fadeUp" style={{ padding: 18, marginBottom: 10, animationDelay: `${i * 0.06}s` }}>
                  <p style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--text)' }}>{p.content}</p>
                  {p.image_url && <img src={p.image_url} alt="" style={{ borderRadius: 8, marginTop: 12, border: '1px solid var(--border)' }} />}
                  <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--muted)', marginTop: 10 }}>
                    <span>{p.like_count || 0} likes</span>
                    <span>{p.comment_count || 0} comments</span>
                    <span style={{ marginLeft: 'auto', letterSpacing: '0.05em' }}>
                      {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
                    </span>
                  </div>
                </div>
              ))
        )}

        {/* CONNECTIONS */}
        {tab === 'connections' && (
          connections.length === 0
            ? <div className="empty-state">
                <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>No connections yet</p>
                {isOwn && <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>Go to Explore to find people to connect with</p>}
              </div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {connections.map((conn, i) => {
                  const other = resolveOther(conn);
                  if (!other) return null;
                  return (
                    <div key={conn.id} className="card animate-fadeUp"
                      style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, animationDelay: `${i * 0.05}s` }}>
                      <Avatar profile={other} size="md" to={`/profile/${other.id}`} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 15 }}>{other.full_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>@{other.username}</div>
                        {other.headline && (
                          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{other.headline}</div>
                        )}
                      </div>
                      {isOwn && (
                        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/messages')} style={{ flexShrink: 0 }}>Message</button>
                      )}
                    </div>
                  );
                })}
              </div>
        )}

        {/* REQUESTS */}
        {tab === 'requests' && isOwn && (
          pendingReqs.length === 0
            ? <div className="empty-state"><p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>No pending requests</p></div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pendingReqs.map((req, i) => {
                  const requester = req.requester;
                  if (!requester) return null;
                  return (
                    <div key={req.id} className="card animate-fadeUp"
                      style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, animationDelay: `${i * 0.05}s` }}>
                      <Avatar profile={requester} size="md" to={`/profile/${requester.id}`} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 15 }}>{requester.full_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>@{requester.username}</div>
                        {requester.headline && (
                          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{requester.headline}</div>
                        )}
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={() => handleAccept(req.id)} disabled={acceptingId === req.id} style={{ flexShrink: 0 }}>
                        {acceptingId === req.id ? <div className="spinner" style={{ width: 12, height: 12 }} /> : 'Accept'}
                      </button>
                    </div>
                  );
                })}
              </div>
        )}

        {/* APPLICATIONS — own profile only */}
        {tab === 'applications' && isOwn && (
          appsLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="card" style={{ padding: 18, marginBottom: 10, height: 120 }}>
                  <div className="skeleton" style={{ height: '100%', borderRadius: 6 }} />
                </div>
              ))
            : applications.length === 0
              ? <div className="empty-state">
                  <div style={{ fontSize: 28, marginBottom: 10, color: 'var(--muted)' }}>◇</div>
                  <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>No applications yet</p>
                  <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={() => navigate('/jobs')}>Browse Jobs</button>
                </div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {applications.map((app, i) => {
                    const job = app.jobs;
                    if (!job) return null;
                    return (
                      <div key={app.id} className="card animate-fadeUp"
                        style={{ padding: '18px 20px', animationDelay: `${i * 0.05}s`, position: 'relative', overflow: 'hidden' }}>
                        {/* left accent bar colored by status */}
                        <div style={{
                          position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: '10px 0 0 10px',
                          background: (STATUS_PIPELINE.find(s => s.key === app.status) || STATUS_PIPELINE[0]).color,
                        }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Company logo letter */}
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                              <div style={{
                                width: 36, height: 36, borderRadius: 7, flexShrink: 0,
                                background: 'var(--dark2)', border: '1px solid var(--border)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--text2)', fontWeight: 600,
                              }}>{job.company?.[0]}</div>
                              <div>
                                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15 }}>{job.title}</div>
                                <div style={{ fontSize: 12, color: 'var(--text2)' }}>{job.company}</div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 4 }}>
                              <span className="tag" style={{ fontSize: 10 }}>{job.job_type}</span>
                              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{job.location}</span>
                              {job.salary_min && (
                                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                                  ${Math.round(job.salary_min / 1000)}k–${Math.round(job.salary_max / 1000)}k
                                </span>
                              )}
                            </div>

                            <PipelineTracker status={app.status} />
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                            <StatusBadge status={app.status} />
                            <span style={{ fontSize: 11, color: 'var(--muted2)' }}>
                              {new Date(app.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
                            </span>
                            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/jobs')} style={{ fontSize: 11 }}>
                              View Job
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
        )}

        {/* ABOUT */}
        {tab === 'about' && (
          <div className="card animate-scaleIn" style={{ padding: 24 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontStyle: 'italic', fontWeight: 400, marginBottom: 18 }}>About</h3>
            {[
              ['Full Name', profile.full_name],
              ['Headline', profile.headline],
              ['Location', profile.location],
              ['Website', profile.website],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                <div className="label">{k}</div>
                <div style={{ fontSize: 14, marginTop: 4, color: 'var(--text2)' }}>{v}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editOpen && <EditModal profile={profile} onSave={handleSave} onClose={() => setEditOpen(false)} />}
    </div>
  );
}
