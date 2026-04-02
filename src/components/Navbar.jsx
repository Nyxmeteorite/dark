import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { messageApi, supabase } from '../lib/supabase';

export default function Navbar() {
  const { profile, signOut, user, theme, toggleTheme } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menu, setMenu] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    messageApi.getUnreadCount(user.id).then(setUnread);
    const channel = supabase.channel(`navbar-unread-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `receiver_id=eq.${user.id}`
      }, () => messageApi.getUnreadCount(user.id).then(setUnread))
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'messages',
        filter: `receiver_id=eq.${user.id}`
      }, () => messageApi.getUnreadCount(user.id).then(setUnread))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user?.id]);

  const nav = [
    { id: '/feed',     label: 'Feed' },
    { id: '/search',   label: 'Explore' },
    { id: '/jobs',     label: 'Jobs' },
    { id: '/messages', label: 'Messages' },
    { id: '/resume',   label: 'Resume' },
  ];

  const active = location.pathname;

  return (
    <nav className="navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        <div className="navbar-logo" onClick={() => navigate('/feed')}>Nex<em>us</em></div>
        <div style={{ display: 'flex', gap: 2 }}>
          {nav.map(item => (
            <button key={item.id} onClick={() => navigate(item.id)}
              className="btn btn-ghost"
              style={{
                color: active === item.id ? 'var(--accent)' : 'var(--muted)',
                fontWeight: active === item.id ? 500 : 400,
                fontSize: 13, padding: '7px 14px',
                letterSpacing: '0.03em',
                position: 'relative',
              }}>
              {item.label}
              {active === item.id && (
                <div style={{
                  position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 1,
                  background: 'var(--accent)', borderRadius: 1,
                }} />
              )}
              {item.id === '/messages' && unread > 0 && (
                <span style={{
                  position: 'absolute', top: 4, right: 4,
                  width: 7, height: 7, borderRadius: '50%',
                  background: '#f87171',
                  border: '1.5px solid var(--black)',
                }} />
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="live-dot" title="Realtime connected" />
        <button onClick={toggleTheme} className="btn btn-ghost btn-sm"
          style={{ fontSize: 16, padding: '6px 10px' }}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <div style={{ position: 'relative' }}>
          <div className="avatar avatar-sm"
            onClick={() => setMenu(v => !v)}
            style={{ cursor: 'pointer', border: '1px solid var(--border2)' }}>
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : (profile?.full_name?.[0] || '?')}
          </div>
          {menu && (
            <div className="card animate-scaleIn" style={{
              position: 'absolute', right: 0, top: 40, width: 170, padding: 8, zIndex: 300,
            }}>
              <button className="btn btn-ghost w-full"
                style={{ justifyContent: 'flex-start', fontSize: 13, padding: '8px 12px' }}
                onClick={() => { navigate('/profile'); setMenu(false); }}>
                My Profile
              </button>
              <button className="btn btn-ghost w-full"
                style={{ justifyContent: 'flex-start', fontSize: 13, padding: '8px 12px' }}
                onClick={() => { navigate('/resume'); setMenu(false); }}>
                My Resume
              </button>
              <div className="divider" style={{ margin: '6px 0' }} />
              <button className="btn btn-ghost w-full"
                style={{ justifyContent: 'flex-start', fontSize: 13, padding: '8px 12px', color: 'var(--muted)' }}
                onClick={() => { signOut(); setMenu(false); }}>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
