import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { profileApi, postApi, connectionApi } from '../lib/supabase';

function Avatar({ profile, size = 'xl' }) {
  return (
    <div className={`avatar avatar-${size}`} style={{ border: '2px solid var(--border2)', boxShadow: '0 0 20px rgba(255,255,255,0.10)' }}>
      {profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : (profile?.full_name?.[0] || '?')}
    </div>
  );
}

function AvatarSmall({ profile, size = 'md' }) {
  return (
    <div className={`avatar avatar-${size}`}>
      {profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : (profile?.full_name?.[0] || '?')}
    </div>
  );
}

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
        {[['full_name','Full Name'],['headline','Headline'],['location','Location'],['website','Website']].map(([k,l]) => (
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

export default function ProfilePage({ targetUserId, setPage }) {
  const { user, profile: myProfile, refreshProfile } = useAuth();
  const [profile, setProfile]           = useState(null);
  const [posts, setPosts]               = useState([]);
  const [connections, setConnections]   = useState([]);
  const [pendingReqs, setPendingReqs]   = useState([]);
  const [tab, setTab]                   = useState('posts');
  const [loading, setLoading]           = useState(true);
  const [editOpen, setEditOpen]         = useState(false);
  const [connStatus, setConnStatus]     = useState(null);
  const [connecting, setConnecting]     = useState(false);
  const [acceptingId, setAcceptingId]   = useState(null);

  const viewId = targetUserId || user?.id;
  const isOwn  = viewId === user?.id;

  useEffect(() => { if (viewId) load(); }, [viewId]);

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
    ? ['posts', 'connections', 'requests', 'about']
    : ['posts', 'connections', 'about'];

  return (
    <div className="animate-fadeIn">
      {/* Banner */}
      <div style={{
        height: 150, borderRadius: '10px 10px 0 0', overflow: 'hidden',
        background: 'linear-gradient(135deg, #100D06 0%, #1C1506 40%, #0D0B08 100%)',
        position: 'relative',
      }}>
        {profile.banner_url && <img src={profile.banner_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        <div style={{
          position: 'absolute', bottom: 0, left: '30%', right: '30%', height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)',
        }} />
      </div>

      {/* Profile header */}
      <div className="card" style={{ padding: 22, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ marginTop: -44 }}>
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
                  style={{ justifyContent: 'center', minWidth: 110 }}
                >
                  {connecting
                    ? <div className="spinner" style={{ width: 12, height: 12 }} />
                    : connStatus === 'accepted' ? 'Connected'
                    : connStatus === 'pending'  ? 'Request Sent'
                    : '+ Connect'
                  }
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
            <div key={l}
              style={{ textAlign: 'center', cursor: target ? 'pointer' : 'default' }}
              onClick={() => target && setTab(target)}>
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
            fontFamily: 'var(--font-body)', letterSpacing: '0.04em',
            position: 'relative',
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
            ? <div className="empty-state">
                <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>No posts yet</p>
              </div>
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
                      <AvatarSmall profile={other} size="md" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 15 }}>{other.full_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>@{other.username}</div>
                        {other.headline && (
                          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{other.headline}</div>
                        )}
                      </div>
                      {isOwn && setPage && (
                        <button className="btn btn-secondary btn-sm"
                          onClick={() => setPage('messages')}
                          style={{ flexShrink: 0 }}>
                          Message
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
        )}

        {/* REQUESTS */}
        {tab === 'requests' && isOwn && (
          pendingReqs.length === 0
            ? <div className="empty-state">
                <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>No pending requests</p>
              </div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pendingReqs.map((req, i) => {
                  const requester = req.requester;
                  if (!requester) return null;
                  return (
                    <div key={req.id} className="card animate-fadeUp"
                      style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, animationDelay: `${i * 0.05}s` }}>
                      <AvatarSmall profile={requester} size="md" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 15 }}>{requester.full_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>@{requester.username}</div>
                        {requester.headline && (
                          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{requester.headline}</div>
                        )}
                      </div>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleAccept(req.id)}
                        disabled={acceptingId === req.id}
                        style={{ flexShrink: 0 }}>
                        {acceptingId === req.id
                          ? <div className="spinner" style={{ width: 12, height: 12 }} />
                          : 'Accept'
                        }
                      </button>
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
