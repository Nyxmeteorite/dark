import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const FEATURES = [
  { icon: '◈', title: 'Real-Time Feed', desc: 'Posts, likes and comments update live — no refresh needed.' },
  { icon: '◎', title: 'Build Connections', desc: 'Grow a meaningful network of professionals in your field.' },
  { icon: '◇', title: 'Job Board', desc: 'Discover curated opportunities and apply in one tap.' },
  { icon: '◉', title: 'Search & Explore', desc: 'Find people by skill, company or name in seconds.' },
  { icon: '◈', title: 'Your Profile', desc: 'A living portfolio that tells your professional story.' },
  { icon: '◎', title: 'Post & Share', desc: 'Share work, ideas and milestones with your network.' },
];

export default function LandingPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState(null);
  const [form, setForm] = useState({ email: '', password: '', fullName: '', username: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError(''); setLoading(true);
    if (mode === 'signin') {
      const { error } = await signIn({ email: form.email, password: form.password });
      if (error) setError(error.message);
      else navigate('/feed');
    } else {
      const { error } = await signUp({ email: form.email, password: form.password, fullName: form.fullName, username: form.username });
      if (error) setError(error.message);
      else setMode('verify');
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--black)', overflowX: 'hidden' }}>

      {/* ── TOP NAV ── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 60px', height: 64,
        background: 'rgba(10,9,6,0.92)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div className="navbar-logo">ProNet</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setMode('signin')}>Sign In</button>
          <button className="btn btn-primary btn-sm" onClick={() => setMode('signup')}>Join Free</button>
        </div>
      </nav>

      {/* ── HERO — split layout ── */}
      <section style={{ position: 'relative', overflow: 'hidden', minHeight: '88vh', display: 'flex', alignItems: 'center' }}>
        {/* Subtle noise texture overlay */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.025,
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
          pointerEvents: 'none',
        }} />

        <div style={{
          maxWidth: 1200, margin: '0 auto', padding: '100px 60px',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center',
          width: '100%',
        }}>
          {/* Left: text */}
          <div>
            <div className="animate-fadeUp" style={{ marginBottom: 20 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 20, padding: '5px 14px',
                fontSize: 11, color: 'var(--text2)', letterSpacing: '0.14em',
              }}>
                <span className="live-dot" /> LIVE PROFESSIONAL NETWORK
              </span>
            </div>

            <h1 className="animate-fadeUp delay-1" style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(48px, 5.5vw, 80px)',
              fontWeight: 300, lineHeight: 1.05,
              letterSpacing: '-1.5px',
              color: 'var(--white)', marginBottom: 28,
            }}>
              Your Career,<br />
              <em style={{ fontStyle: 'italic', color: 'var(--text2)' }}>Curated.</em>
            </h1>

            <p className="animate-fadeUp delay-2" style={{
              fontSize: 16, color: 'var(--text2)', maxWidth: 420,
              marginBottom: 40, lineHeight: 1.8, fontWeight: 300,
            }}>
              ProNet connects professionals with intent. Real-time feed, curated jobs, and meaningful networking — built for the next generation of talent.
            </p>

            <div className="animate-fadeUp delay-3" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 52 }}>
              <button className="btn btn-primary btn-lg" onClick={() => setMode('signup')}
                style={{ fontSize: 14, letterSpacing: '0.04em' }}>
                Join the Network
              </button>
              <button className="btn btn-secondary btn-lg" onClick={() => setMode('signin')}>
                Sign In
              </button>
            </div>

            {/* Stats */}
            <div className="animate-fadeUp delay-4" style={{
              display: 'flex', gap: 44,
              paddingTop: 32, borderTop: '1px solid var(--border)',
            }}>
              {[['Real‑Time', 'Live updates'], ['6 Modules', 'Full-stack'], ['Free', 'Always']].map(([v, l]) => (
                <div key={v}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500, color: 'var(--white)', fontStyle: 'italic' }}>{v}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.06em', marginTop: 2 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: visual card */}
          <div className="animate-fadeUp delay-2" style={{ position: 'relative' }}>
            <div style={{
              borderRadius: 20, overflow: 'hidden',
              border: '1px solid var(--border2)',
              background: 'linear-gradient(160deg, #1a1a1a 0%, #0f0f0f 100%)',
              aspectRatio: '4/5',
              display: 'flex', flexDirection: 'column',
              position: 'relative',
            }}>
              {/* Mock network visual */}
              <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                {/* Grid lines */}
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06 }}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <line key={`h${i}`} x1="0" y1={`${i * 14.3}%`} x2="100%" y2={`${i * 14.3}%`} stroke="white" strokeWidth="1" />
                  ))}
                  {Array.from({ length: 8 }).map((_, i) => (
                    <line key={`v${i}`} x1={`${i * 14.3}%`} y1="0" x2={`${i * 14.3}%`} y2="100%" stroke="white" strokeWidth="1" />
                  ))}
                </svg>
                {/* Glow orb */}
                <div style={{
                  position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)',
                  width: 220, height: 220,
                  background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%)',
                }} />
                {/* Profile nodes */}
                {[
                  { top: '20%', left: '22%', label: 'A', sub: 'Engineer' },
                  { top: '50%', left: '52%', label: 'N', sub: 'Designer', large: true },
                  { top: '68%', left: '20%', label: 'K', sub: 'Product' },
                  { top: '28%', left: '66%', label: 'M', sub: 'Data' },
                ].map(({ top, left, label, sub, large }) => (
                  <div key={label} style={{ position: 'absolute', top, left, transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
                    <div style={{
                      width: large ? 52 : 38, height: large ? 52 : 38,
                      borderRadius: '50%',
                      background: large ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)',
                      border: `1px solid rgba(255,255,255,${large ? 0.25 : 0.15})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-display)', fontStyle: 'italic',
                      fontSize: large ? 20 : 15, color: 'var(--white)',
                      margin: '0 auto 4px',
                      boxShadow: large ? '0 0 30px rgba(255,255,255,0.08)' : 'none',
                    }}>{label}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.08em' }}>{sub}</div>
                  </div>
                ))}
              </div>

              {/* Bottom card */}
              <div style={{
                background: 'rgba(255,255,255,0.04)',
                borderTop: '1px solid var(--border)',
                padding: '16px 20px',
                backdropFilter: 'blur(10px)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid var(--border2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 13, color: 'var(--white)',
                  }}>✦</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--white)' }}>Verified Connection</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>Network growing in real‑time</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating badge */}
            <div style={{
              position: 'absolute', bottom: -16, left: -16,
              background: 'var(--dark2)',
              border: '1px solid var(--border2)',
              borderRadius: 12, padding: '12px 16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: 2 }}>NEW OPPORTUNITY</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--white)' }}>Senior Engineer · Remote</div>
            </div>
          </div>
        </div>

        {/* Trusted by strip */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          borderTop: '1px solid var(--border)',
          padding: '16px 60px',
          display: 'flex', alignItems: 'center', gap: 48,
          background: 'rgba(12,12,12,0.8)', backdropFilter: 'blur(10px)',
        }}>
          <span style={{ fontSize: 10, color: 'var(--muted2)', letterSpacing: '0.14em', whiteSpace: 'nowrap' }}>TRUSTED BY PROFESSIONALS AT</span>
          {['Google', 'Stripe', 'Figma', 'Vercel', 'Linear'].map(c => (
            <span key={c} style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 500, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{c}</span>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ padding: '80px 60px', background: 'var(--black2)' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.14em', marginBottom: 14 }}>OUR PILLARS</p>
          <h2 className="animate-fadeUp" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 300, fontStyle: 'italic', letterSpacing: '-0.5px', maxWidth: 600, margin: '0 auto' }}>
            Architecting the future of<br /><em style={{ color: 'var(--text2)' }}>professional influence.</em>
          </h2>
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
          gap: 18, maxWidth: 1100, margin: '0 auto',
        }}>
          {FEATURES.map((f, i) => (
            <div key={f.title} className="card card-hover animate-fadeUp"
              style={{ padding: 28, animationDelay: `${i * 0.07}s` }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8, marginBottom: 16,
                background: 'var(--accent-soft)', border: '1px solid rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, color: 'var(--accent)',
              }}>{f.icon}</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 8, fontWeight: 500 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA — full bleed ── */}
      <section style={{ padding: '80px 60px', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          maxWidth: 900, margin: '0 auto',
          background: 'linear-gradient(135deg, #1a1a1a 0%, #111 100%)',
          border: '1px solid var(--border2)',
          borderRadius: 24, padding: '72px 80px',
          textAlign: 'center', position: 'relative', overflow: 'hidden',
        }}>
          {/* Top glow */}
          <div style={{
            position: 'absolute', top: 0, left: '20%', right: '20%', height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
          }} />
          {/* Radial glow */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            width: 500, height: 300,
            background: 'radial-gradient(ellipse, rgba(255,255,255,0.04) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(36px, 4vw, 58px)',
            fontWeight: 300, lineHeight: 1.15, marginBottom: 16,
            color: 'var(--white)',
          }}>
            Ready for a more<br />
            <em style={{ fontStyle: 'italic', color: 'var(--text2)' }}>intentional</em> network?
          </h2>
          <p style={{ color: 'var(--muted)', marginBottom: 36, fontSize: 15, maxWidth: 480, margin: '0 auto 36px' }}>
            Join professionals who build careers with purpose. It's free, always.
          </p>
          <button className="btn btn-primary btn-lg" onClick={() => setMode('signup')}
            style={{ fontSize: 15, letterSpacing: '0.04em', padding: '14px 40px' }}>
            Create Your Profile
          </button>
          <div style={{ marginTop: 16, fontSize: 11, color: 'var(--muted2)', letterSpacing: '0.08em' }}>
            FREE TO JOIN · NO CREDIT CARD NEEDED
          </div>
        </div>
      </section>

      {/* ── AUTH MODAL ── */}
      {(mode === 'signin' || mode === 'signup') && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setMode(null)}>
          <div className="modal-box">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 400, fontStyle: 'italic', marginBottom: 4 }}>
              {mode === 'signin' ? 'Welcome back' : 'Join ProNet'}
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 24 }}>
              {mode === 'signin' ? 'Sign in to your account.' : 'Create your professional profile.'}
            </p>

            {error && (
              <div style={{
                background: 'rgba(201,85,58,0.1)', border: '1px solid rgba(201,85,58,0.25)',
                borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                fontSize: 13, color: '#E06040',
              }}>{error}</div>
            )}

            <form onSubmit={handleSubmit}>
              {mode === 'signup' && (
                <>
                  <div className="form-group">
                    <label className="label">Full Name</label>
                    <input className="input" placeholder="Alexandra Morgan" value={form.fullName} onChange={set('fullName')} required />
                  </div>
                  <div className="form-group">
                    <label className="label">Username</label>
                    <input className="input" placeholder="alexmorgan" value={form.username}
                      onChange={e => setForm(p => ({ ...p, username: e.target.value.toLowerCase().replace(/\s/g, '') }))} required />
                  </div>
                </>
              )}
              <div className="form-group">
                <label className="label">Email</label>
                <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
              </div>
              <div className="form-group">
                <label className="label">Password</label>
                <input className="input" type="password" placeholder="••••••••" value={form.password} onChange={set('password')} required minLength={6} />
              </div>

              <button type="submit" className="btn btn-primary w-full"
                style={{ marginTop: 22, justifyContent: 'center', height: 44, fontSize: 14 }}
                disabled={loading}>
                {loading ? <div className="spinner" style={{ width: 16, height: 16 }} />
                  : mode === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: 'var(--muted)' }}>
              {mode === 'signin'
                ? <>No account? <button style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12 }} onClick={() => { setMode('signup'); setError(''); }}>Sign up free</button></>
                : <>Have an account? <button style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12 }} onClick={() => { setMode('signin'); setError(''); }}>Sign in</button></>
              }
            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '28px 60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18, color: 'var(--white)', marginBottom: 4 }}>ProNet</div>
          <div style={{ fontSize: 12, color: 'var(--muted2)' }}>The premier destination for professional networking.</div>
        </div>
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
          {['Privacy Policy', 'Terms of Service', 'Community Guidelines', 'Contact Support'].map(l => (
            <span key={l} style={{ fontSize: 12, color: 'var(--muted)', cursor: 'pointer', transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = 'var(--text2)'}
              onMouseLeave={e => e.target.style.color = 'var(--muted)'}>{l}</span>
          ))}
        </div>
      </footer>

      {mode === 'verify' && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>✉</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontStyle: 'italic', marginBottom: 8 }}>Check your inbox</h2>
            <p style={{ color: 'var(--muted)', marginBottom: 20, fontSize: 13, lineHeight: 1.7 }}>
              We sent a confirmation link to <strong style={{ color: 'var(--text2)' }}>{form.email}</strong>.<br />
              Click it to activate your account.
            </p>
            <button className="btn btn-primary" onClick={() => setMode(null)} style={{ justifyContent: 'center' }}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
