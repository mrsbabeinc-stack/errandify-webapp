import { useNavigate } from 'react-router-dom';

export default function MyProfilePage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            marginBottom: '24px',
            fontSize: '18px',
            color: '#4b5563',
            fontWeight: 'bold',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          ‹ Back
        </button>

        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#8b5a3c', marginBottom: '24px' }}>
          My Profile
        </h1>

        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '24px' }}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
            <div style={{ fontSize: '48px' }}>👤</div>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>John Doe</h2>
              <p style={{ color: '#4b5563' }}>✅ Verified User</p>
              <p style={{ fontSize: '12px', color: '#6b7280' }}>Member since Jan 2026</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', paddingY: '16px', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', marginBottom: '24px' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#f97316' }}>24</p>
              <p style={{ fontSize: '12px', color: '#4b5563' }}>Errands Posted</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#f97316' }}>18</p>
              <p style={{ fontSize: '12px', color: '#4b5563' }}>Completed</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#f97316' }}>4.9</p>
              <p style={{ fontSize: '12px', color: '#4b5563' }}>Rating</p>
            </div>
          </div>

          <div style={{ marginTop: '16px', space: '16px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', color: '#4b5563', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Email</label>
              <p style={{ color: '#111827' }}>john@example.com</p>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', color: '#4b5563', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Phone</label>
              <p style={{ color: '#111827' }}>+65 8123 4567</p>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', color: '#4b5563', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Address</label>
              <p style={{ color: '#111827' }}>123 Main St, Singapore 123456</p>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#4b5563', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Bio</label>
              <p style={{ color: '#111827' }}>Friendly and reliable helper</p>
            </div>
          </div>

          <button
            style={{
              width: '100%',
              marginTop: '24px',
              backgroundColor: '#f97316',
              color: 'white',
              padding: '8px 0',
              borderRadius: '8px',
              fontWeight: 'bold',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Edit Profile
          </button>
        </div>
      </div>
    </div>
  );
}
