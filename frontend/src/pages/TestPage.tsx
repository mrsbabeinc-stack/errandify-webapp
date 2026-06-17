export default function TestPage() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f3f4f6'
    }}>
      <div style={{ 
        backgroundColor: 'white', 
        padding: '40px', 
        borderRadius: '8px',
        textAlign: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#8b5a3c', marginBottom: '16px' }}>
          ✅ TEST PAGE WORKS!
        </h1>
        <p style={{ color: '#4b5563', fontSize: '16px' }}>
          If you see this, routing is working correctly.
        </p>
        <p style={{ color: '#4b5563', fontSize: '14px', marginTop: '12px' }}>
          Try going back and clicking Profile menu items.
        </p>
      </div>
    </div>
  );
}
