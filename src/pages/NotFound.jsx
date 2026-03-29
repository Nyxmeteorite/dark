import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--black)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="duck-card">
        <div className="orb orb--1"></div>
        <div className="orb orb--2"></div>
        <div className="orb orb--3"></div>
        <div className="orb orb--4"></div>

        <div className="error-container">
          <div className="error-code">404</div>
          <div className="error-msg">Nothing to see here.</div>
          <button className="home-btn" onClick={() => navigate('/feed')}>Go Home</button>
        </div>

        <div className="duck__wrapper">
          <div className="duck">
            <div className="duck__inner">
              <div className="duck__mouth"></div>
              <div className="duck__head">
                <div className="duck__eye"></div>
                <div className="duck__white"></div>
              </div>
              <div className="duck__body"></div>
              <div className="duck__wing"></div>
            </div>
            <div className="duck__foot duck__foot--1"></div>
            <div className="duck__foot duck__foot--2"></div>
            <div className="surface"></div>
          </div>
        </div>
      </div>
    </div>
  );
}