import { useState } from 'react';
import { profileApi, jobApi, connectionApi } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/Avatar';

function PersonCard({ person, onConnect, connStatus, navigate }) {
  return (
    <div className="card card-hover animate-fadeUp" style={{ padding: 22, textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <div onClick={() => navigate('/profile/' + person.id)} style={{ cursor: 'pointer' }}>
          <Avatar profile={person} size="lg" to={`/profile/${person.id}`} />
        </div>
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, marginBottom: 2, cursor: 'pointer' }} onClick={() => navigate('/profile/' + person.id)}>{person.full_name}</div>
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
  const [query, setQuery]     = useState('');
  const [tab, setTab]         = useState('people');
  const [results, setResults] = useState({ people: [], jobs: [] });
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [connStatuses, setConnStatuses] = useState({});

  const handleSearch = async (e) => {
    e?.preventDefault();
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
    { id: 'jobs', label: `Jobs${results.jobs.length ? ` (${results.jobs.length})` : ''}` },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 400, fontStyle: 'italic', marginBottom: 16 }}>
          Explore <em style={{ color: 'var(--accent)' }}>Nexus</em>
        </h2>

        <form onSubmit={handleSearch} style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: 16, pointerEvents: 'none' }}>◎</div>
          <input className="input" placeholder="Search people, skills, companies…"
            value={query} onChange={e => setQuery(e.target.value)}
            style={{ paddingLeft: 42, height: 48, fontSize: 15 }} />
          <button type="submit" className="btn btn-primary btn-sm"
            style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', height: 34 }}>
            Search
          </button>
        </form>
      </div>

      {searched && (
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: 'none', border: 'none', padding: '10px 20px',
              color: tab === t.id ? 'var(--accent)' : 'var(--muted)',
              fontWeight: tab === t.id ? 600 : 400, fontSize: 13,
              borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'var(--font-body)',
              letterSpacing: '0.03em',
            }}>{t.label}</button>
          ))}
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
        </div>
      )}

      {!loading && searched && (
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
                    <div key={job.id} className="card card-hover animate-fadeUp"
                      style={{ padding: 18, animationDelay: `${i * 0.06}s` }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, marginBottom: 3 }}>{job.title}</div>
                      <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 10 }}>{job.company} · {job.location}</div>
                      <span className="tag">{job.job_type}</span>
                    </div>
                  ))}
                </div>
          )}
        </>
      )}

      {!searched && !loading && (
        <div className="empty-state animate-fadeIn" style={{ paddingTop: 80 }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3, fontFamily: 'var(--font-display)' }}>◎</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontStyle: 'italic', marginBottom: 8, fontWeight: 400 }}>
            Search for anything
          </h3>
          <p style={{ maxWidth: 300, lineHeight: 1.7, fontSize: 13 }}>
            Find professionals by name, skill, or company. Discover jobs that match your expertise.
          </p>
        </div>
      )}
    </div>
  );
}
