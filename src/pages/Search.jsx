import { useState, useEffect } from 'react';
import { profileApi, jobApi, connectionApi } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/Avatar';

function PersonCard({ person, onConnect, connStatus, navigate }) {
  return (
    <div className="card card-hover animate-fadeUp" style={{ padding: 22, textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <Avatar profile={person} size="lg" to={`/profile/${person.id}`} />
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, marginBottom: 2, cursor: 'pointer' }}
        onClick={() => navigate('/profile/' + person.id)}>{person.full_name}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>@{person.username}</div>
      {person.headline && (
        <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12, lineHeight: 1.5 }}>{person.headline}</div>
      )}
      {person.location && (
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>{person.location}</div>
      )}
      <button
        className={`btn btn-sm w-full ${connStatus === 'accepted' ? 'btn-secondary' : connStatus === 'pending' ? 'btn-ghost' : 'btn-primary'}`}
        onClick={() => onConnect(person.id)}
        disabled={connStatus === 'accepted' || connStatus === 'pending'}
        style={{ justifyContent: 'center' }}>
        {connStatus === 'accepted' ? '✓ Connected' : connStatus === 'pending' ? 'Pending…' : '+ Connect'}
      </button>
    </div>
  );
}

export default function SearchPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery]               = useState('');
  const [tab, setTab]                   = useState('people');
  const [results, setResults]           = useState({ people: [], jobs: [] });
  const [loading, setLoading]           = useState(false);
  const [searched, setSearched]         = useState(false);
  const [connStatuses, setConnStatuses] = useState({});
  const [suggestions, setSuggestions]   = useState({ people: [], jobs: [] });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recommended, setRecommended]   = useState({ people: [], jobs: [] });
  const [recsLoading, setRecsLoading]   = useState(true);

  // Load recommendations on mount
  useEffect(() => {
    const load = async () => {
      setRecsLoading(true);
      const [{ data: people }, { data: jobs }] = await Promise.all([
        profileApi.search(''),
        jobApi.getAll({ limit: 6 }),
      ]);
      setRecommended({
        people: (people || []).filter(p => p.id !== user?.id).slice(0, 6),
        jobs: (jobs || []).slice(0, 6),
      });
      setRecsLoading(false);
    };
    load();
  }, [user?.id]);

  // Live suggestions while typing
  useEffect(() => {
    if (!query.trim() || query.length < 2) { setShowSuggestions(false); return; }
    const t = setTimeout(async () => {
      const [{ data: people }, { data: jobs }] = await Promise.all([
        profileApi.search(query),
        jobApi.getAll({ query, limit: 4 }),
      ]);
      setSuggestions({
        people: (people || []).filter(p => p.id !== user?.id).slice(0, 3),
        jobs: (jobs || []).slice(0, 3),
      });
      setShowSuggestions(true);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const handleSearch = async (e) => {
    e?.preventDefault();
    setShowSuggestions(false);
    if (!query.trim()) return;
    setLoading(true); setSearched(true);
    const [{ data: people }, { data: jobs }] = await Promise.all([
      profileApi.search(query),
      jobApi.getAll({ query }),
    ]);
    setResults({ people: (people || []).filter(p => p.id !== user?.id), jobs: jobs || [] });
    setLoading(false);
  };

  const handleConnect = async (profileId) => {
    if (!user) return;
    setConnStatuses(prev => ({ ...prev, [profileId]: 'pending' }));
    await connectionApi.send(user.id, profileId);
  };

  const TABS = [
    { id: 'people', label: `People${results.people.length ? ` (${results.people.length})` : ''}` },
    { id: 'jobs',   label: `Jobs${results.jobs.length ? ` (${results.jobs.length})` : ''}` },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 400, fontStyle: 'italic', marginBottom: 16 }}>
          Explore <em style={{ color: 'var(--accent)' }}>Nexus</em>
        </h2>

        <form onSubmit={handleSearch}>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: 16, pointerEvents: 'none', zIndex: 1 }}>◎</div>
            <input
              className="input"
              placeholder="Search people, skills, companies…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onFocus={() => { if (suggestions.people.length || suggestions.jobs.length) setShowSuggestions(true); }}
              style={{ paddingLeft: 42, height: 48, fontSize: 15 }}
            />
            <button type="submit" className="btn btn-primary btn-sm"
              style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', height: 34 }}>
              Search
            </button>

            {/* Typing suggestions dropdown */}
            {showSuggestions && (suggestions.people.length > 0 || suggestions.jobs.length > 0) && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
                background: 'var(--dark2)', border: '1px solid var(--border)',
                borderRadius: 8, marginTop: 6, overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}>
                {suggestions.people.length > 0 && (
                  <>
                    <div style={{ padding: '8px 14px 4px', fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>People</div>
                    {suggestions.people.map(p => (
                      <button key={p.id}
                        onMouseDown={() => { navigate('/profile/' + p.id); setShowSuggestions(false); setQuery(''); }}
                        style={{ width: '100%', display: 'flex', gap: 10, alignItems: 'center', padding: '8px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--dark)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <Avatar profile={p} size="sm" />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-display)' }}>{p.full_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.headline || '@' + p.username}</div>
                        </div>
                      </button>
                    ))}
                  </>
                )}
                {suggestions.jobs.length > 0 && (
                  <>
                    <div style={{ padding: '8px 14px 4px', fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Jobs</div>
                    {suggestions.jobs.map(j => (
                      <button key={j.id}
                        onMouseDown={() => { navigate('/jobs'); setShowSuggestions(false); setQuery(''); }}
                        style={{ width: '100%', display: 'flex', gap: 10, alignItems: 'center', padding: '8px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--dark)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--dark)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontFamily: 'var(--font-display)', color: 'var(--text2)' }}>{j.company?.[0]}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-display)' }}>{j.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{j.company} · {j.job_type}</div>
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </form>
      </div>

      {/* ── SEARCH RESULTS ─────────────────────────────────── */}
      {searched && (
        <>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                background: 'none', border: 'none', padding: '10px 20px',
                color: tab === t.id ? 'var(--accent)' : 'var(--muted)',
                fontWeight: tab === t.id ? 600 : 400, fontSize: 13,
                borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
                cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'var(--font-body)', letterSpacing: '0.03em',
              }}>{t.label}</button>
            ))}
          </div>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
              <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
            </div>
          ) : (
            <>
              {tab === 'people' && (
                results.people.length === 0
                  ? <div className="empty-state"><div className="empty-state-icon">◎</div>
                      <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>No people found</p></div>
                  : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 14 }}>
                      {results.people.map((p, i) => (
                        <div key={p.id} style={{ animationDelay: `${i * 0.06}s` }}>
                          <PersonCard person={p} onConnect={handleConnect} connStatus={connStatuses[p.id] || null} navigate={navigate} />
                        </div>
                      ))}
                    </div>
              )}
              {tab === 'jobs' && (
                results.jobs.length === 0
                  ? <div className="empty-state"><div className="empty-state-icon">◇</div>
                      <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>No jobs found</p></div>
                  : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
                      {results.jobs.map((job, i) => (
                        <div key={job.id} className="card card-hover animate-fadeUp" style={{ padding: 18, animationDelay: `${i * 0.06}s` }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, marginBottom: 3 }}>{job.title}</div>
                          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 10 }}>{job.company} · {job.location}</div>
                          <span className="tag">{job.job_type}</span>
                        </div>
                      ))}
                    </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── PRE-SEARCH RECOMMENDATIONS ─────────────────────── */}
      {!searched && (
        <>
          {/* People you may know */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 400, fontStyle: 'italic' }}>People you may know</h3>
              <span style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.04em' }}>on Nexus</span>
            </div>
            {recsLoading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 14 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="card" style={{ padding: 22, textAlign: 'center' }}>
                    <div className="skeleton" style={{ width: 56, height: 56, borderRadius: '50%', margin: '0 auto 12px' }} />
                    <div className="skeleton" style={{ height: 14, width: '60%', margin: '0 auto 8px' }} />
                    <div className="skeleton" style={{ height: 11, width: '40%', margin: '0 auto' }} />
                  </div>
                ))}
              </div>
            ) : recommended.people.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>No other users yet</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 14 }}>
                {recommended.people.map((p, i) => (
                  <div key={p.id} style={{ animationDelay: `${i * 0.06}s` }}>
                    <PersonCard person={p} onConnect={handleConnect} connStatus={connStatuses[p.id] || null} navigate={navigate} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Open roles */}
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 400, fontStyle: 'italic' }}>Open roles</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/jobs')}
                style={{ fontSize: 11, color: 'var(--accent)', padding: '2px 8px' }}>View all →</button>
            </div>
            {recsLoading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="card" style={{ padding: 18 }}>
                    <div className="skeleton" style={{ height: 16, width: '55%', marginBottom: 8 }} />
                    <div className="skeleton" style={{ height: 12, width: '40%', marginBottom: 12 }} />
                    <div className="skeleton" style={{ height: 22, width: 70, borderRadius: 20 }} />
                  </div>
                ))}
              </div>
            ) : recommended.jobs.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>No open roles yet</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
                {recommended.jobs.map((job, i) => (
                  <div key={job.id} className="card card-hover animate-fadeUp"
                    onClick={() => navigate('/jobs')}
                    style={{ padding: 18, animationDelay: `${i * 0.06}s`, cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)' }} />
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
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
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className="tag" style={{ fontSize: 10 }}>{job.job_type}</span>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>{job.location}</span>
                      {job.salary_min && (
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>${Math.round(job.salary_min / 1000)}k–${Math.round(job.salary_max / 1000)}k</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
