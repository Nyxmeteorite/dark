import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { messageApi, profileApi } from '../lib/supabase';
import Avatar from '../components/Avatar';

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ── CONVERSATION LIST ─────────────────────────────────────────
function ConversationList({ conversations, activeId, onSelect, loading }) {
  if (loading) return (
    <div style={{ padding: 16 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
          <div className="skeleton" style={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ height: 13, width: '55%', marginBottom: 6 }} />
            <div className="skeleton" style={{ height: 11, width: '80%' }} />
          </div>
        </div>
      ))}
    </div>
  );

  if (!conversations.length) return (
    <div style={{ padding: '40px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 28, opacity: 0.2, marginBottom: 10 }}>✉</div>
      <p style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>No messages yet</p>
      <p style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 4 }}>Search for someone to start a conversation</p>
    </div>
  );

  return (
    <div>
      {conversations.map((conv) => (
        <button
          key={conv.other_user_id}
          onClick={() => onSelect(conv)}
          style={{
            width: '100%', display: 'flex', gap: 11, alignItems: 'center',
            padding: '12px 16px', background: activeId === conv.other_user_id ? 'var(--dark2)' : 'transparent',
            border: 'none', borderBottom: '1px solid var(--border)',
            cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s',
          }}
          onMouseEnter={e => { if (activeId !== conv.other_user_id) e.currentTarget.style.background = 'var(--dark)'; }}
          onMouseLeave={e => { if (activeId !== conv.other_user_id) e.currentTarget.style.background = 'transparent'; }}
        >
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <Avatar profile={conv} size="md" to={`/profile/${conv.other_user_id}`} />
            {conv.unread_count > 0 && (
              <span style={{
                position: 'absolute', top: -2, right: -2,
                background: 'var(--accent)', color: 'var(--black)',
                borderRadius: '50%', width: 16, height: 16,
                fontSize: 9, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{conv.unread_count > 9 ? '9+' : conv.unread_count}</span>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
              <span style={{
                fontFamily: 'var(--font-display)', fontWeight: conv.unread_count > 0 ? 600 : 500,
                fontSize: 14, color: conv.unread_count > 0 ? 'var(--white)' : 'var(--text2)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130,
              }}>{conv.full_name}</span>
              <span style={{ fontSize: 10, color: 'var(--muted2)', flexShrink: 0, marginLeft: 6 }}>
                {timeAgo(conv.last_message_at)}
              </span>
            </div>
            <p style={{
              fontSize: 12, color: conv.unread_count > 0 ? 'var(--text2)' : 'var(--muted)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontWeight: conv.unread_count > 0 ? 500 : 400,
            }}>{conv.last_message}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

// ── MESSAGE THREAD ────────────────────────────────────────────
function MessageThread({ activeUser, currentUser, onBack }) {
  const [messages, setMessages] = useState([]);
  const [text, setText]         = useState('');
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const bottomRef               = useRef(null);
  const inputRef                = useRef(null);

  useEffect(() => {
    if (!activeUser) return;
    loadThread();
    messageApi.markRead(activeUser.other_user_id, currentUser.id);

    // Realtime subscription
    const unsub = messageApi.subscribeToMessages(currentUser.id, async (payload) => {
      if (payload.new.sender_id !== activeUser.other_user_id) return;
      const { data } = await messageApi.getMessages(currentUser.id, activeUser.other_user_id);
      setMessages(data || []);
      messageApi.markRead(activeUser.other_user_id, currentUser.id);
    });
    return unsub;
  }, [activeUser?.other_user_id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeUser?.other_user_id]);

  const loadThread = async () => {
    setLoading(true);
    const { data } = await messageApi.getMessages(currentUser.id, activeUser.other_user_id);
    setMessages(data || []);
    setLoading(false);
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    const { data } = await messageApi.send(currentUser.id, activeUser.other_user_id, text.trim());
    if (data) setMessages(prev => [...prev, data]);
    setText('');
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // Group messages by date
  const grouped = messages.reduce((acc, msg) => {
    const day = new Date(msg.created_at).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    if (!acc[day]) acc[day] = [];
    acc[day].push(msg);
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Thread header */}
      <div style={{
        padding: '14px 18px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
      }}>
        <button onClick={onBack} className="btn btn-ghost btn-sm"
          style={{ padding: '5px 8px', display: 'none' }}
          id="back-btn">← Back</button>
        <Avatar profile={activeUser} size="md" to={`/profile/${activeUser.other_user_id}`} />
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 15 }}>{activeUser.full_name}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>@{activeUser.username}</div>
        </div>
        <span className="live-dot" style={{ marginLeft: 'auto' }} title="Realtime active" />
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 8px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
            <div className="spinner" style={{ width: 22, height: 22 }} />
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <div style={{ fontSize: 32, opacity: 0.15, marginBottom: 12 }}>✉</div>
            <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--muted)', fontSize: 15 }}>
              Start the conversation
            </p>
            <p style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 4 }}>
              Say hello to {activeUser.full_name}
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([day, msgs]) => (
            <div key={day}>
              <div style={{ textAlign: 'center', margin: '16px 0 12px' }}>
                <span style={{
                  fontSize: 10, color: 'var(--muted2)', letterSpacing: '0.08em',
                  textTransform: 'uppercase', background: 'var(--dark)', padding: '3px 10px', borderRadius: 20,
                }}>{day}</span>
              </div>
              {msgs.map((msg, i) => {
                const isMine = msg.sender_id === currentUser.id;
                const prevMsg = msgs[i - 1];
                const sameSender = prevMsg?.sender_id === msg.sender_id;
                return (
                  <div key={msg.id}
                    style={{
                      display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start',
                      marginBottom: sameSender ? 3 : 10,
                    }}>
                    {!isMine && !sameSender && (
                      <div style={{ width: 30, marginRight: 8, flexShrink: 0 }}>
                        <Avatar profile={msg.sender} size="sm" to={`/profile/${msg.sender.id}`} />
                      </div>
                    )}
                    {!isMine && sameSender && <div style={{ width: 38 }} />}
                    <div style={{
                      maxWidth: '68%',
                      background: isMine ? 'var(--accent)' : 'var(--dark2)',
                      color: isMine ? 'var(--black)' : 'var(--text)',
                      borderRadius: isMine
                        ? (sameSender ? '14px 4px 4px 14px' : '14px 4px 14px 14px')
                        : (sameSender ? '4px 14px 14px 4px' : '4px 14px 14px 14px'),
                      padding: '9px 13px',
                      fontSize: 13, lineHeight: 1.5,
                      border: isMine ? 'none' : '1px solid var(--border)',
                      wordBreak: 'break-word',
                    }}>
                      {msg.content}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 16px', borderTop: '1px solid var(--border)',
        display: 'flex', gap: 10, alignItems: 'flex-end', flexShrink: 0,
      }}>
        <textarea
          ref={inputRef}
          className="input"
          placeholder={`Message ${activeUser.full_name}…`}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
          style={{
            resize: 'none', minHeight: 40, maxHeight: 120,
            fontSize: 13, lineHeight: 1.5, paddingTop: 10, paddingBottom: 10,
            overflow: 'auto',
          }}
        />
        <button
          className="btn btn-primary"
          onClick={handleSend}
          disabled={!text.trim() || sending}
          style={{ height: 40, padding: '0 18px', flexShrink: 0 }}
        >
          {sending ? <div className="spinner" style={{ width: 12, height: 12 }} /> : 'Send'}
        </button>
      </div>
    </div>
  );
}

// ── NEW CONVERSATION SEARCH ───────────────────────────────────
function NewConversation({ currentUserId, onSelect }) {
  const [query, setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const { data } = await profileApi.search(query);
      setResults((data || []).filter(p => p.id !== currentUserId));
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ position: 'relative' }}>
        <input
          className="input"
          placeholder="Search people to message…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ fontSize: 13, height: 38, paddingRight: searching ? 36 : 14 }}
          autoFocus
        />
        {searching && (
          <div className="spinner" style={{ position: 'absolute', right: 10, top: 10, width: 14, height: 14 }} />
        )}
      </div>
      {results.length > 0 && (
        <div style={{ marginTop: 8, background: 'var(--dark)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
          {results.map(person => (
            <button
              key={person.id}
              onClick={() => { onSelect(person); setQuery(''); setResults([]); }}
              style={{
                width: '100%', display: 'flex', gap: 10, alignItems: 'center',
                padding: '10px 14px', background: 'transparent', border: 'none',
                borderBottom: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--dark2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Avatar profile={person} size="sm" to={`/profile/${person.id}`} />
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 500 }}>{person.full_name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>@{person.username}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── MESSAGES PAGE ─────────────────────────────────────────────
export default function MessagesPage() {
  const { user, profile } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeUser, setActiveUser]       = useState(null);
  const [convsLoading, setConvsLoading]   = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    loadConversations();

    // Realtime: refresh conversation list on new message
    const unsub = messageApi.subscribeToMessages(user.id, () => {
      loadConversations();
    });
    return unsub;
  }, [user?.id]);

  const loadConversations = async () => {
    const { data } = await messageApi.getConversations(user.id);
    setConversations(data || []);
    setConvsLoading(false);
  };

  const handleSelectConv = (conv) => {
    setActiveUser(conv);
    // Mark as read optimistically
    setConversations(prev =>
      prev.map(c => c.other_user_id === conv.other_user_id ? { ...c, unread_count: 0 } : c)
    );
  };

  // When a new chat is started from search
  const handleNewChat = (person) => {
    const synthetic = {
      other_user_id: person.id,
      full_name: person.full_name,
      username: person.username,
      avatar_url: person.avatar_url,
      last_message: '',
      last_message_at: new Date().toISOString(),
      unread_count: 0,
    };
    setActiveUser(synthetic);
    // Add to list if not already there
    setConversations(prev =>
      prev.find(c => c.other_user_id === person.id) ? prev : [synthetic, ...prev]
    );
  };

  const totalUnread = conversations.reduce((n, c) => n + Number(c.unread_count || 0), 0);

  return (
    <div className="animate-fadeIn">
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, fontStyle: 'italic' }}>
          Messages
        </h2>
        {totalUnread > 0 && (
          <span style={{
            background: 'var(--accent)', color: 'var(--black)',
            borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700,
          }}>{totalUnread}</span>
        )}
        <span className="live-dot" style={{ marginLeft: 2 }} title="Realtime active" />
      </div>

      {/* Two-panel layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '280px 1fr',
        border: '1px solid var(--border)',
        borderRadius: 10,
        overflow: 'hidden',
        background: 'var(--black2)',
        height: 'calc(100vh - 160px)',
        minHeight: 480,
      }}>
        {/* Left: conversation list */}
        <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <NewConversation currentUserId={user?.id} onSelect={handleNewChat} />
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <ConversationList
              conversations={conversations}
              activeId={activeUser?.other_user_id}
              onSelect={handleSelectConv}
              loading={convsLoading}
            />
          </div>
        </div>

        {/* Right: thread or empty state */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {activeUser ? (
            <MessageThread
              activeUser={activeUser}
              currentUser={{ id: user?.id, ...profile }}
              onBack={() => setActiveUser(null)}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
              <div style={{ fontSize: 40, opacity: 0.1 }}>✉</div>
              <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18, color: 'var(--muted)' }}>
                Select a conversation
              </p>
              <p style={{ fontSize: 12, color: 'var(--muted2)' }}>
                or search for someone above to start chatting
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
