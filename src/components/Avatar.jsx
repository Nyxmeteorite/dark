import { useNavigate } from 'react-router-dom';

export default function Avatar({ profile, size = 'md', to, style = {}, ...rest }) {
  const navigate = useNavigate();

  const sizeMap = { sm: 28, md: 38, lg: 52, xl: 64 };
  const px = sizeMap[size] || 38;

  const inner = (
    <div
      className={`avatar avatar-${size}`}
      style={{
        cursor: to ? 'pointer' : 'default',
        width: px,
        height: px,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: 'var(--dark2)',
        border: '1px solid var(--border2)',
        fontFamily: 'var(--font-display)',
        fontStyle: 'italic',
        fontSize: px * 0.38,
        color: 'var(--text2)',
        userSelect: 'none',
        ...style,
      }}
      {...rest}
    >
      {profile?.avatar_url
        ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : (profile?.full_name?.[0] || '?')}
    </div>
  );

  if (to) {
    return (
      <div
        onClick={(e) => { e.stopPropagation(); navigate(to); }}
        style={{ display: 'inline-flex', cursor: 'pointer' }}
      >
        {inner}
      </div>
    );
  }

  return inner;
}
