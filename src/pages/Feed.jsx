import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { postApi, profileApi } from '../lib/supabase';

function Avatar({ profile, size = 'md' }) {
  return (
    <div className={`avatar avatar-${size}`}>
      {profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : (profile?.full_name?.[0] || '?')}
    </div>
  );
}

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(date).toLocaleDateString();
}

// ── POST CARD ────────────────────────────────────────────────
function PostCard({ post, currentUserId, isLiked, onLike, onDelete, isNew }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments]         = useState([]);
  const [commentText, setCommentText]   = useState('');
  const [loadingCmts, setLoadingCmts]   = useState(false);
  const [localLike, setLocalLike]       = useState(isLiked);
  const [likeCount, setLikeCount]       = useState(Number(post.like_count || 0));
  const commentInputRef                 = useRef(null);

  // Sync external like state
  useEffect(() => { setLocalLike(isLiked); }, [isLiked]);

  // Realtime comment subscription
  useEffect(() => {
    if (!showComments) return;
    const unsub = postApi.subscribeToComments(post.id, async () => {
      const { data } = await postApi.getComments(post.id);
      setComments(data || []);
    });
    return unsub;
  }, [showComments, post.id]);

  const handleShowComments = async () => {
    if (!showComments) {
      setLoadingCmts(true);
      const { data } = await postApi.getComments(post.id);
      setComments(data || []);
      setLoadingCmts(false);
    }
    setShowComments(v => !v);
    setTimeout(() => commentInputRef.current?.focus(), 100);
  };

  const handleLike = async () => {
    if (!currentUserId) return;
    const next = !localLike;
    setLocalLike(next);
    setLikeCount(c => c + (next ? 1 : -1));
    if (next) await postApi.like(post.id, currentUserId);
    else      await postApi.unlike(post.id, currentUserId);
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !currentUserId) return;
    const { data } = await postApi.addComment({ postId: post.id, userId: currentUserId, content: commentText });
    if (data) { setComments(p => [...p, data]); setCommentText(''); }
  };

  return (
    <div className={`card card-hover ${isNew ? 'animate-slideUp' : 'animate-fadeUp'}`}
      style={{ padding: '20px', marginBottom: 12, position: 'relative', overflow: 'hidden' }}>

      {/* Warm light accent on new posts */}
      {isNew && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
          opacity: 0.7,
        }} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Avatar profile={{ full_name: post.full_name, avatar_url: post.avatar_url }} />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>{post.full_name}</div>
            {post.headline && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{post.headline}</div>}
            <div style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 1 }}>{timeAgo(post.created_at)}</div>
          </div>
        </div>
        {isNew && <span className="live-dot" style={{ marginTop: 4 }} title="Just posted live" />}
        {currentUserId === post.user_id && (
          <button className="btn btn-ghost btn-sm" onClick={() => onDelete(post.id)}
            style={{ color: 'var(--muted2)', padding: '4px 8px', fontSize: 16 }}>×</button>
        )}
      </div>

      {/* Content */}
      <p style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--text)', marginBottom: 14 }}>{post.content}</p>

      {post.image_url && (
        <img src={post.image_url} alt="" style={{ borderRadius: 8, marginBottom: 14, width: '100%', objectFit: 'cover', maxHeight: 280, border: '1px solid var(--border)' }} />
      )}

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--muted)', marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
        <span style={{ color: localLike ? 'var(--accent)' : undefined }}>{likeCount} {likeCount === 1 ? 'like' : 'likes'}</span>
        <span>{post.comment_count || 0} comments</span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 4 }}>
        <button onClick={handleLike}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            background: localLike ? 'rgba(255,255,255,0.06)' : 'transparent',
            border: localLike ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent',
            borderRadius: 7, padding: '7px', cursor: 'pointer',
            color: localLike ? 'var(--accent)' : 'var(--muted)',
            fontSize: 13, fontFamily: 'var(--font-body)', fontWeight: 500,
            transition: 'all 0.2s',
          }}>
          {localLike ? '♥' : '♡'} Like
        </button>
        <button onClick={handleShowComments}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            background: 'transparent', border: '1px solid transparent',
            borderRadius: 7, padding: '7px', cursor: 'pointer',
            color: showComments ? 'var(--accent)' : 'var(--muted)',
            fontSize: 13, fontFamily: 'var(--font-body)', fontWeight: 500,
            transition: 'all 0.2s',
          }}>
          Comment
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div style={{ marginTop: 14 }} className="animate-fadeIn">
          {loadingCmts
            ? <div style={{ display: 'flex', justifyContent: 'center', padding: 12 }}><div className="spinner" /></div>
            : comments.map((c, i) => (
              <div key={c.id} style={{ display: 'flex', gap: 8, marginBottom: 10, animationDelay: `${i * 0.05}s` }}
                className="animate-fadeIn">
                <Avatar profile={c.profiles} size="sm" />
                <div style={{ background: 'var(--dark)', borderRadius: 8, padding: '8px 12px', flex: 1, border: '1px solid var(--border)' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>{c.profiles?.full_name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>{c.content}</div>
                </div>
              </div>
            ))
          }
          <form onSubmit={handleComment} style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <input ref={commentInputRef} className="input" value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Write a comment…" style={{ fontSize: 13, height: 36 }} />
            <button type="submit" className="btn btn-primary btn-sm" disabled={!commentText.trim()}>Post</button>
          </form>
        </div>
      )}
    </div>
  );
}

// ── CREATE POST ──────────────────────────────────────────────
function CreatePost({ profile, onPost }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setLoading(true);
    await postApi.create({ userId: profile.id, content });
    setContent('');
    setFocused(false);
    onPost?.();
    setLoading(false);
  };

  return (
    <div className="card animate-fadeIn" style={{ padding: '20px', marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <Avatar profile={profile} />
        <div style={{ flex: 1 }}>
          <textarea
            className="input"
            placeholder="Share an update, insight, or achievement…"
            value={content}
            onChange={e => setContent(e.target.value)}
            onFocus={() => setFocused(true)}
            style={{ minHeight: focused ? 100 : 44, resize: 'none', fontSize: 14, transition: 'min-height 0.25s ease' }}
            onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleSubmit(); }}
          />
          {(focused || content) && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}
              className="animate-fadeIn">
              <button className="btn btn-secondary btn-sm" onClick={() => { setFocused(false); setContent(''); }}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={!content.trim() || loading}>
                {loading ? <div className="spinner" style={{ width: 12, height: 12 }} /> : 'Post'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── FEED PAGE ────────────────────────────────────────────────
export default function FeedPage() {
  const { profile, user } = useAuth();
  const [posts, setPosts]         = useState([]);
  const [likedPosts, setLikedPosts] = useState([]);
  const [newPostIds, setNewPostIds] = useState(new Set());
  const [loading, setLoading]     = useState(true);
  const [toast, setToast]         = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    loadFeed();
    if (user) loadLikes();

    // ── REALTIME: new posts ───────────────────────────────
    const unsub = postApi.subscribeToFeed(
      async (payload) => {
        // Fetch full post with profile data
        const { data } = await profileApi.getById(payload.new.user_id);
        if (!data) return;
        const enriched = {
          ...payload.new,
          full_name: data.full_name,
          headline: data.headline,
          avatar_url: data.avatar_url,
          like_count: 0,
          comment_count: 0,
        };
        setPosts(prev => [enriched, ...prev]);
        setNewPostIds(s => new Set([...s, payload.new.id]));
        if (payload.new.user_id !== user?.id) showToast('New post from the network ✦');
        // Remove "new" badge after 8s
        setTimeout(() => setNewPostIds(s => { const n = new Set(s); n.delete(payload.new.id); return n; }), 8000);
      },
      (payload) => {
        setPosts(prev => prev.filter(p => p.id !== payload.old.id));
      }
    );
    return unsub;
  }, [user?.id]);

  const loadFeed = async () => {
    setLoading(true);
    const { data } = await postApi.getFeed();
    setPosts(data || []);
    setLoading(false);
  };

  const loadLikes = async () => {
    const { data } = await postApi.getLikesByUser(user.id);
    setLikedPosts(data?.map(l => l.post_id) || []);
  };

  const handleDelete = async (postId) => {
    await postApi.delete(postId);
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, fontStyle: 'italic' }}>Live Feed</h2>
        <span className="live-dot" title="Real-time updates active" />
      </div>

      {profile && <CreatePost profile={profile} onPost={loadFeed} />}

      {loading
        ? Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card" style={{ padding: 20, marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <div className="skeleton" style={{ width: 42, height: 42, borderRadius: '50%' }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ height: 14, width: '40%', marginBottom: 6 }} />
                  <div className="skeleton" style={{ height: 11, width: '25%' }} />
                </div>
              </div>
              <div className="skeleton" style={{ height: 12, marginBottom: 6 }} />
              <div className="skeleton" style={{ height: 12, width: '80%' }} />
            </div>
          ))
        : posts.length === 0
          ? <div className="empty-state">
              <div className="empty-state-icon" style={{ fontSize: 40 }}>—</div>
              <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18 }}>No posts yet</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>Be the first to share something.</p>
            </div>
          : posts.map((post, i) => (
              <div key={post.id} style={{ animationDelay: loading ? 0 : `${i * 0.06}s` }}>
                <PostCard
                  post={post}
                  currentUserId={user?.id}
                  isLiked={likedPosts.includes(post.id)}
                  isNew={newPostIds.has(post.id)}
                  onLike={() => {}}
                  onDelete={handleDelete}
                />
              </div>
            ))
      }

      {toast && (
        <div className="toast toast-accent">
          <span className="live-dot" style={{ width: 6, height: 6 }} />
          {toast}
        </div>
      )}
    </div>
  );
}
