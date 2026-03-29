import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars. Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
  realtime: { params: { eventsPerSecond: 10 } },
});

// ─── AUTH ────────────────────────────────────────────────────
export const authApi = {
  signUp: ({ email, password, fullName, username }) =>
    supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, username } } }),
  signIn: ({ email, password }) =>
    supabase.auth.signInWithPassword({ email, password }),
  signOut: () => supabase.auth.signOut(),
  getSession: () => supabase.auth.getSession(),
};

// ─── PROFILES ────────────────────────────────────────────────
export const profileApi = {
  getById: (id) =>
    supabase.from('profiles').select('*').eq('id', id).single(),

  getByUsername: (username) =>
    supabase.from('profiles').select('*').eq('username', username).single(),

  search: (query) =>
    supabase.from('profiles')
      .select('*')
      .or(`full_name.ilike.%${query}%,headline.ilike.%${query}%,username.ilike.%${query}%`)
      .limit(20),

  update: (id, updates) =>
    supabase.from('profiles').update(updates).eq('id', id).select().single(),

  uploadAvatar: async (userId, file) => {
    const ext = file.name.split('.').pop();
    const path = `${userId}/avatar.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) return { data: null, error };
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return { data: data.publicUrl, error: null };
  },
};

// ─── POSTS ───────────────────────────────────────────────────
export const postApi = {
  getFeed: (limit = 20, offset = 0) =>
    supabase.from('posts_with_counts').select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1),

  getByUserId: (userId) =>
    supabase.from('posts_with_counts').select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),

  create: ({ userId, content, imageUrl }) =>
    supabase.from('posts')
      .insert({ user_id: userId, content, image_url: imageUrl })
      .select().single(),

  delete: (postId) => supabase.from('posts').delete().eq('id', postId),

  like: (postId, userId) =>
    supabase.from('likes').insert({ post_id: postId, user_id: userId }).select().single(),

  unlike: (postId, userId) =>
    supabase.from('likes').delete().eq('post_id', postId).eq('user_id', userId),

  getLikesByUser: (userId) =>
    supabase.from('likes').select('post_id').eq('user_id', userId),

  getComments: (postId) =>
    supabase.from('comments')
      .select('*, profiles(id, full_name, username, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true }),

  addComment: ({ postId, userId, content }) =>
    supabase.from('comments')
      .insert({ post_id: postId, user_id: userId, content })
      .select('*, profiles(full_name, username, avatar_url)').single(),

  subscribeToFeed: (onInsert, onDelete) => {
    const channel = supabase.channel('public:posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, onInsert)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, onDelete)
      .subscribe();
    return () => supabase.removeChannel(channel);
  },

  subscribeToLikes: (postId, callback) => {
    const channel = supabase.channel(`likes:${postId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes', filter: `post_id=eq.${postId}` }, callback)
      .subscribe();
    return () => supabase.removeChannel(channel);
  },

  subscribeToComments: (postId, onInsert) => {
    const channel = supabase.channel(`comments:${postId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` }, onInsert)
      .subscribe();
    return () => supabase.removeChannel(channel);
  },
};

// ─── JOBS ────────────────────────────────────────────────────
export const jobApi = {
  getAll: ({ type, query, limit = 20 } = {}) => {
    let req = supabase.from('jobs')
      .select('*, profiles(full_name, avatar_url)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (type) req = req.eq('job_type', type);
    if (query) req = req.or(`title.ilike.%${query}%,company.ilike.%${query}%,description.ilike.%${query}%`);
    return req;
  },

  getById: (id) =>
    supabase.from('jobs').select('*, profiles(full_name, username, avatar_url)').eq('id', id).single(),

  create: (data) => supabase.from('jobs').insert(data).select().single(),

  // Legacy simple apply (kept for safety)
  apply: (jobId, userId) =>
    supabase.from('job_applications').insert({ job_id: jobId, user_id: userId }).select().single(),

  // Apply with full applicant details
  applyWithDetails: (payload) =>
    supabase.from('job_applications').insert(payload).select().single(),

  // Returns job_id + status so pipeline tracker works
  getAppliedJobs: (userId) =>
    supabase.from('job_applications').select('job_id, status').eq('user_id', userId),

  // Recruiter: fetch all applications for a job
  getApplicationsForJob: (jobId) =>
    supabase.from('job_applications')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false }),

  // Recruiter: update status + internal notes
  updateApplicationStatus: (appId, status, recruiterNotes) =>
    supabase.from('job_applications')
      .update({ status, recruiter_notes: recruiterNotes })
      .eq('id', appId),

  subscribeToJobs: (onInsert) => {
    const channel = supabase.channel('public:jobs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'jobs' }, onInsert)
      .subscribe();
    return () => supabase.removeChannel(channel);
  },
};

// ─── CONNECTIONS ─────────────────────────────────────────────
export const connectionApi = {
  getByUser: (userId) =>
    supabase.from('connections')
      .select('*, requester:requester_id(id, full_name, username, headline, avatar_url), addressee:addressee_id(id, full_name, username, headline, avatar_url)')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'accepted'),

  send: (requesterId, addresseeId) =>
    supabase.from('connections')
      .insert({ requester_id: requesterId, addressee_id: addresseeId })
      .select().single(),

  accept: (connectionId) =>
    supabase.from('connections').update({ status: 'accepted' }).eq('id', connectionId).select().single(),

  getStatus: async (userId, targetId) => {
    const { data } = await supabase.from('connections')
      .select('status')
      .or(`and(requester_id.eq.${userId},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${userId})`)
      .single();
    return data?.status || null;
  },

  getPending: (userId) =>
    supabase.from('connections')
      .select('*, requester:requester_id(id, full_name, username, headline, avatar_url)')
      .eq('addressee_id', userId)
      .eq('status', 'pending'),
};

// ─── RESUMES ─────────────────────────────────────────────────
export const resumeApi = {
  get: (userId) =>
    supabase.from('resumes').select('*').eq('user_id', userId).single(),

  upsert: (userId, data) =>
    supabase.from('resumes')
      .upsert({ user_id: userId, ...data, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      .select().single(),

  uploadFile: async (userId, file) => {
    const ext = file.name.split('.').pop();
    const path = `${userId}/resume.${ext}`;
    const { error } = await supabase.storage.from('resumes').upload(path, file, { upsert: true });
    if (error) return { data: null, error };
    const { data } = supabase.storage.from('resumes').getPublicUrl(path);
    return { data: data.publicUrl, error: null };
  },
};

// ─── MESSAGES ────────────────────────────────────────────────
export const messageApi = {
  getConversations: (userId) =>
    supabase.from('messages')
      .select('*, sender:sender_id(id, full_name, username, avatar_url), receiver:receiver_id(id, full_name, username, avatar_url)')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false }),

  getMessages: (userId, otherUserId) =>
    supabase.from('messages')
      .select('*, sender:sender_id(id, full_name, username, avatar_url)')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
      .order('created_at', { ascending: true }),

  send: (senderId, receiverId, content) =>
    supabase.from('messages')
      .insert({ sender_id: senderId, receiver_id: receiverId, content })
      .select('*, sender:sender_id(id, full_name, username, avatar_url)')
      .single(),

  markRead: (senderId, receiverId) =>
    supabase.from('messages')
      .update({ read: true })
      .eq('sender_id', senderId)
      .eq('receiver_id', receiverId)
      .eq('read', false),

  subscribeToMessages: (userId, callback) => {
    const channel = supabase.channel(`messages:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages',
        filter: `receiver_id=eq.${userId}` }, callback)
      .subscribe();
    return () => supabase.removeChannel(channel);
  },
};