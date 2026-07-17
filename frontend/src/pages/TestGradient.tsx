export default function TestGradient() {
  console.log('✅ TestGradient component loaded');

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      backgroundColor: '#FFF9F5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}>
        <h1 style={{ color: '#333', margin: 0 }}>✅ Peach Background Test</h1>
        <p style={{ color: '#555', marginTop: '10px' }}>If you see a peach background, styling is working!</p>
        <button style={{
          backgroundColor: '#FF6B35',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: 'pointer',
          marginTop: '20px',
        }}>
          Orange Admin Button
        </button>
      </div>
    </div>
  );
}
