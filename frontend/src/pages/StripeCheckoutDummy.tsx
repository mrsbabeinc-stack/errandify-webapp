import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const StripeCheckoutDummy: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'review' | 'payment' | 'success' | 'declined'>('review');
  const [declineReason, setDeclineReason] = useState('');

  const total = parseFloat(searchParams.get('total') || '0');
  const discount = parseInt(searchParams.get('discount') || '0');
  const campaigns = parseInt(searchParams.get('campaigns') || '1');

  const subtotal = total / (1 - discount / 100);

  const handlePayment = () => {
    setIsProcessing(true);
    // Simulate payment processing - 50% chance of approval/decline for testing
    setTimeout(() => {
      setIsProcessing(false);
      const isApproved = Math.random() > 0.5;

      if (isApproved) {
        setStep('success');
      } else {
        const reasons = [
          'Image quality is too low - please use a clearer, higher resolution image',
          'Campaign title needs to be more descriptive of your offer',
          'URL appears to be invalid or not accessible - please verify the link'
        ];
        setDeclineReason(reasons[Math.floor(Math.random() * reasons.length)]);
        setStep('declined');
      }
    }, 2000);
  };

  if (step === 'declined') {
    return (
      <div style={{minHeight: '100vh', background: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'}}>
        <div style={{background: 'white', borderRadius: '12px', padding: '40px', maxWidth: '500px', width: '100%', textAlign: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.1)'}}>
          <div style={{fontSize: '64px', marginBottom: '20px'}}>📋</div>
          <h1 style={{margin: '0 0 12px 0', fontSize: '28px', fontWeight: '700', color: '#E65100'}}>Campaign Needs Adjustment</h1>
          <p style={{margin: '0 0 24px 0', fontSize: '15px', color: '#666', lineHeight: '1.6'}}>
            Your campaign didn't quite meet our standards. The good news? <span style={{fontWeight: '600', color: '#E65100'}}>No charge has been made</span>, and you can fix it and resubmit!
          </p>

          <div style={{background: '#FFF8F5', border: '2px solid #FF9800', borderRadius: '8px', padding: '16px', marginBottom: '24px', textAlign: 'left'}}>
            <div style={{fontWeight: '600', marginBottom: '8px', fontSize: '14px', color: '#E65100'}}>⚠️ Admin Feedback:</div>
            <div style={{fontSize: '13px', color: '#BF360C', lineHeight: '1.6', fontStyle: 'italic'}}>
              "{declineReason}"
            </div>
          </div>

          <div style={{background: '#F0F8FF', border: '1px solid #B0D4FF', borderRadius: '8px', padding: '20px', marginBottom: '24px', textAlign: 'left'}}>
            <div style={{fontWeight: '600', marginBottom: '12px', color: '#0066CC'}}>What You Can Do:</div>
            <ul style={{margin: 0, paddingLeft: '16px', lineHeight: '1.8', fontSize: '13px', color: '#333'}}>
              <li>✏️ Edit your campaign based on the feedback above</li>
              <li>📸 Upload a better quality image if needed</li>
              <li>✅ Resubmit when you're ready</li>
              <li>🔄 You can edit and resubmit as many times as needed</li>
              <li>💰 No charge until approved</li>
            </ul>
          </div>

          <div style={{display: 'flex', gap: '12px'}}>
            <button
              onClick={() => navigate(-2)}
              style={{flex: 1, padding: '14px', background: '#FF9800', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px'}}
            >
              ← Go Back & Edit
            </button>
            <button
              onClick={() => navigate('/company/dashboard')}
              style={{flex: 1, padding: '14px', background: '#f5f5f5', color: '#333', border: '1px solid #ddd', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px'}}
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div style={{minHeight: '100vh', background: 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'}}>
        <div style={{background: 'white', borderRadius: '12px', padding: '40px', maxWidth: '500px', width: '100%', textAlign: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.1)'}}>
          <div style={{fontSize: '64px', marginBottom: '20px'}}>✅</div>
          <h1 style={{margin: '0 0 12px 0', fontSize: '28px', fontWeight: '700', color: '#27AE60'}}>Payment Successful!</h1>
          <p style={{margin: '0 0 24px 0', fontSize: '15px', color: '#666', lineHeight: '1.6'}}>
            Your campaign has been created and is now <span style={{fontWeight: '600', color: '#27AE60'}}>pending admin approval</span>.
          </p>

          <div style={{background: '#F0F8FF', border: '1px solid #B0D4FF', borderRadius: '8px', padding: '20px', marginBottom: '24px', textAlign: 'left'}}>
            <div style={{fontWeight: '600', marginBottom: '12px', color: '#0066CC'}}>What Happens Next:</div>
            <ul style={{margin: 0, paddingLeft: '16px', lineHeight: '1.8', fontSize: '13px', color: '#333'}}>
              <li>⏳ Admins review your campaign within 24 hours</li>
              <li>✅ If approved: Payment is charged & campaign goes live on your start date</li>
              <li>❌ If declined: No charge is made - you can edit and resubmit</li>
              <li>📧 You'll get an email with the decision</li>
            </ul>
          </div>

          <div style={{background: '#FFF8F5', border: '1px solid #FFD5C0', borderRadius: '8px', padding: '16px', marginBottom: '24px'}}>
            <div style={{fontSize: '14px', fontWeight: '600', color: '#FF6B35', marginBottom: '8px'}}>Campaign Details</div>
            <div style={{fontSize: '13px', color: '#666', lineHeight: '1.8'}}>
              <strong>{campaigns}</strong> campaign{campaigns > 1 ? 's' : ''} submitted<br/>
              <strong>Total Amount:</strong> SGD ${total.toFixed(0)}<br/>
              <strong>Status:</strong> <span style={{color: '#FF9800', fontWeight: '600'}}>Pending Admin Approval</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/company/dashboard')}
            style={{width: '100%', padding: '14px', background: '#27AE60', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px'}}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{minHeight: '100vh', background: '#f5f5f5', padding: '20px'}}>
      <div style={{maxWidth: '600px', margin: '0 auto'}}>
        {/* Header */}
        <div style={{background: 'white', borderRadius: '12px 12px 0 0', padding: '24px', borderBottom: '1px solid #e0e0e0'}}>
          <h1 style={{margin: '0 0 8px 0', fontSize: '28px', fontWeight: '700'}}>Checkout</h1>
          <p style={{margin: 0, fontSize: '14px', color: '#666'}}>Complete your ad campaign purchase</p>
        </div>

        {/* Order Summary */}
        <div style={{background: 'white', padding: '24px', borderBottom: '1px solid #e0e0e0'}}>
          <div style={{fontWeight: '600', marginBottom: '16px', fontSize: '14px'}}>Order Summary</div>

          {/* Items */}
          <div style={{marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #e0e0e0'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', color: '#666'}}>
              <span>{campaigns} Campaign{campaigns > 1 ? 's' : ''}</span>
              <span>SGD ${subtotal.toFixed(0)}</span>
            </div>
            {discount > 0 && (
              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#27AE60', fontWeight: '600'}}>
                <span>Bundle Discount ({discount}%)</span>
                <span>-SGD ${(subtotal * discount / 100).toFixed(0)}</span>
              </div>
            )}
          </div>

          {/* Total */}
          <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '700', color: '#333'}}>
            <span>Total</span>
            <span style={{color: '#FF6B35'}}>SGD ${total.toFixed(0)}</span>
          </div>
        </div>

        {/* Payment Method */}
        <div style={{background: 'white', padding: '24px', borderBottom: '1px solid #e0e0e0'}}>
          <div style={{fontWeight: '600', marginBottom: '16px', fontSize: '14px'}}>Payment Method</div>

          {step === 'review' && (
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px'}}>
              <div
                onClick={() => setStep('payment')}
                style={{border: '2px solid #FF6B35', borderRadius: '8px', padding: '16px', cursor: 'pointer', background: '#FFF8F5', textAlign: 'center'}}
              >
                <div style={{fontSize: '28px', marginBottom: '8px'}}>💳</div>
                <div style={{fontWeight: '600', fontSize: '13px', color: '#333'}}>Card</div>
                <div style={{fontSize: '11px', color: '#999', marginTop: '4px'}}>Visa, Mastercard</div>
              </div>

              <div
                onClick={() => setStep('payment')}
                style={{border: '2px solid #ddd', borderRadius: '8px', padding: '16px', cursor: 'pointer', background: '#f9f9f9', textAlign: 'center', opacity: 0.6}}
              >
                <div style={{fontSize: '28px', marginBottom: '8px'}}>🏦</div>
                <div style={{fontWeight: '600', fontSize: '13px', color: '#999'}}>Bank Transfer</div>
                <div style={{fontSize: '11px', color: '#999', marginTop: '4px'}}>Coming soon</div>
              </div>
            </div>
          )}

          {step === 'payment' && (
            <div>
              <div style={{marginBottom: '16px'}}>
                <label style={{display: 'block', fontWeight: '600', marginBottom: '8px', fontSize: '13px'}}>Card Number</label>
                <input type="text" placeholder="4242 4242 4242 4242" defaultValue="4242 4242 4242 4242" style={{width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box'}} disabled />
                <div style={{fontSize: '11px', color: '#999', marginTop: '4px'}}>💡 Test card: Use 4242 4242 4242 4242</div>
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px'}}>
                <div>
                  <label style={{display: 'block', fontWeight: '600', marginBottom: '8px', fontSize: '13px'}}>Expiry</label>
                  <input type="text" placeholder="12/25" defaultValue="12/25" style={{width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box'}} disabled />
                </div>
                <div>
                  <label style={{display: 'block', fontWeight: '600', marginBottom: '8px', fontSize: '13px'}}>CVC</label>
                  <input type="text" placeholder="123" defaultValue="123" style={{width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box'}} disabled />
                </div>
              </div>

              <div style={{background: '#E8F5E9', border: '1px solid #81C784', borderRadius: '6px', padding: '12px', marginBottom: '16px', fontSize: '12px', color: '#333'}}>
                <strong style={{color: '#27AE60'}}>✅ Demo Mode:</strong> Payment is processed only after admin approval. If declined, no charge is made.
              </div>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div style={{background: 'white', padding: '24px', borderBottom: '1px solid #e0e0e0'}}>
          <div style={{background: '#FFF8F5', border: '1px solid #FFD5C0', borderRadius: '8px', padding: '16px', fontSize: '12px', color: '#333', lineHeight: '1.6'}}>
            <div style={{fontWeight: '600', marginBottom: '8px', color: '#FF6B35'}}>📍 Important</div>
            <ul style={{margin: 0, paddingLeft: '16px'}}>
              <li>✅ Payment is charged only if your campaigns are approved</li>
              <li>⏳ Admins review within 24 hours</li>
              <li>✔️ Once approved, payment is charged and campaigns go live on your start date</li>
              <li>❌ If declined, no charge is made - you can edit and resubmit</li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{background: 'white', padding: '24px', borderRadius: '0 0 12px 12px', display: 'flex', gap: '12px'}}>
          <button
            onClick={() => navigate(-1)}
            style={{flex: 1, padding: '14px', background: '#f5f5f5', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '14px'}}
          >
            Back
          </button>
          <button
            onClick={handlePayment}
            disabled={isProcessing}
            style={{flex: 1, padding: '14px', background: isProcessing ? '#ccc' : 'linear-gradient(135deg, #FF6B35, #FF8C5A)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: isProcessing ? 'not-allowed' : 'pointer', fontSize: '14px'}}
          >
            {isProcessing ? '💳 Processing...' : '💳 Pay SGD $' + total.toFixed(0)}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StripeCheckoutDummy;
