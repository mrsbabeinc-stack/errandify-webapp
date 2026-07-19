import React, { useState } from 'react';
import { useToastNotification } from '../utils/toastNotification';

interface AddPaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  userBalance?: number;
}

interface PaymentMethod {
  type: 'card' | 'bank' | 'paypal';
  cardholderName: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  bankName?: string;
  accountNumber?: string;
}

export default function AddPaymentMethodModal({ isOpen, onClose, onSuccess, userBalance = 0 }: AddPaymentMethodModalProps) {
  const { showSuccess, showError } = useToastNotification();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [paymentType, setPaymentType] = useState<'card' | 'bank' | 'paypal'>('card');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<PaymentMethod>({
    type: 'card',
    cardholderName: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateCard = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.cardholderName.trim()) newErrors.cardholderName = 'Cardholder name is required';
    if (!formData.cardNumber.replace(/\s/g, '').match(/^\d{13,19}$/)) {
      newErrors.cardNumber = 'Please enter a valid card number (13-19 digits)';
    }
    if (!formData.expiryDate.match(/^\d{2}\/\d{2}$/)) {
      newErrors.expiryDate = 'Please enter expiry date in MM/YY format';
    }
    if (!formData.cvv.match(/^\d{3,4}$/)) {
      newErrors.cvv = 'Please enter a valid CVV (3-4 digits)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateBank = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.cardholderName.trim()) newErrors.cardholderName = 'Account holder name is required';
    if (!formData.bankName?.trim()) newErrors.bankName = 'Bank name is required';
    if (!formData.accountNumber?.replace(/\s/g, '').match(/^\d{10,20}$/)) {
      newErrors.accountNumber = 'Please enter a valid account number (10-20 digits)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formatted = value;

    if (name === 'cardNumber') {
      formatted = value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim();
    } else if (name === 'expiryDate') {
      formatted = value.replace(/\D/g, '').slice(0, 4);
      if (formatted.length >= 2) {
        formatted = formatted.slice(0, 2) + '/' + formatted.slice(2);
      }
    } else if (name === 'cvv') {
      formatted = value.replace(/\D/g, '').slice(0, 4);
    }

    setFormData(prev => ({
      ...prev,
      [name]: formatted
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleBankChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isValid = paymentType === 'card' ? validateCard() : validateBank();
    if (!isValid) {
      showError('Form validation failed', 'Please fix the errors below');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');

      // Simulate Stripe token creation
      const tokenData = {
        type: paymentType,
        last4: paymentType === 'card'
          ? formData.cardNumber.replace(/\s/g, '').slice(-4)
          : formData.accountNumber?.slice(-4),
        cardholderName: formData.cardholderName,
        bankName: formData.bankName || null,
      };

      // Call backend to save payment method
      const response = await fetch(`${API_URL}/api/payment/methods`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tokenData),
      });

      if (response.ok) {
        showSuccess('🎉 Payment Method Added!', `Your ${paymentType === 'card' ? 'card ending in' : 'bank account'} ${tokenData.last4} has been securely saved.`);

        // Reset form
        setFormData({
          type: 'card',
          cardholderName: '',
          cardNumber: '',
          expiryDate: '',
          cvv: '',
        });
        setPaymentType('card');

        setTimeout(() => {
          onClose();
          onSuccess?.();
        }, 1500);
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add payment method');
      }
    } catch (error: any) {
      console.error('Payment method error:', error);
      showError('❌ Failed to Add Payment Method', error.message || 'Please try again with valid details');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      }}>
        {/* Header */}
        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>💳</div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#333', marginBottom: '8px' }}>
            Add Payment Method
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
            Securely add a card or bank account to your Errandify account
          </p>
        </div>

        {/* Payment Type Tabs */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '24px',
          borderBottom: '2px solid #f0f0f0',
        }}>
          {(['card', 'bank', 'paypal'] as const).map((type) => (
            <button
              key={type}
              onClick={() => {
                setPaymentType(type);
                setErrors({});
              }}
              style={{
                padding: '12px 16px',
                border: 'none',
                background: 'none',
                fontSize: '14px',
                fontWeight: '600',
                color: paymentType === type ? '#FF6B35' : '#999',
                cursor: 'pointer',
                borderBottom: paymentType === type ? '3px solid #FF6B35' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {type === 'card' && '💳 Card'}
              {type === 'bank' && '🏦 Bank Account'}
              {type === 'paypal' && '🅿️ PayPal'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {paymentType === 'card' && (
            <>
              {/* Cardholder Name */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '6px' }}>
                  Cardholder Name *
                </label>
                <input
                  type="text"
                  name="cardholderName"
                  value={formData.cardholderName}
                  onChange={handleCardChange}
                  placeholder="John Doe"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: errors.cardholderName ? '2px solid #f44336' : '2px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    background: errors.cardholderName ? '#ffebee' : 'white',
                  }}
                />
                {errors.cardholderName && (
                  <p style={{ color: '#f44336', fontSize: '12px', marginTop: '4px' }}>⚠️ {errors.cardholderName}</p>
                )}
              </div>

              {/* Card Number */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '6px' }}>
                  Card Number *
                </label>
                <input
                  type="text"
                  name="cardNumber"
                  value={formData.cardNumber}
                  onChange={handleCardChange}
                  placeholder="4242 4242 4242 4242"
                  disabled={loading}
                  maxLength={19}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: errors.cardNumber ? '2px solid #f44336' : '2px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    background: errors.cardNumber ? '#ffebee' : 'white',
                    fontFamily: 'monospace',
                  }}
                />
                {errors.cardNumber && (
                  <p style={{ color: '#f44336', fontSize: '12px', marginTop: '4px' }}>⚠️ {errors.cardNumber}</p>
                )}
                <p style={{ color: '#999', fontSize: '12px', marginTop: '6px' }}>Test card: 4242 4242 4242 4242</p>
              </div>

              {/* Expiry & CVV */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '6px' }}>
                    Expiry Date *
                  </label>
                  <input
                    type="text"
                    name="expiryDate"
                    value={formData.expiryDate}
                    onChange={handleCardChange}
                    placeholder="MM/YY"
                    disabled={loading}
                    maxLength={5}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: errors.expiryDate ? '2px solid #f44336' : '2px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      background: errors.expiryDate ? '#ffebee' : 'white',
                      fontFamily: 'monospace',
                    }}
                  />
                  {errors.expiryDate && (
                    <p style={{ color: '#f44336', fontSize: '12px', marginTop: '4px' }}>⚠️ {errors.expiryDate}</p>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '6px' }}>
                    CVV *
                  </label>
                  <input
                    type="text"
                    name="cvv"
                    value={formData.cvv}
                    onChange={handleCardChange}
                    placeholder="123"
                    disabled={loading}
                    maxLength={4}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: errors.cvv ? '2px solid #f44336' : '2px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      background: errors.cvv ? '#ffebee' : 'white',
                      fontFamily: 'monospace',
                    }}
                  />
                  {errors.cvv && (
                    <p style={{ color: '#f44336', fontSize: '12px', marginTop: '4px' }}>⚠️ {errors.cvv}</p>
                  )}
                </div>
              </div>
            </>
          )}

          {paymentType === 'bank' && (
            <>
              {/* Account Holder Name */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '6px' }}>
                  Account Holder Name *
                </label>
                <input
                  type="text"
                  name="cardholderName"
                  value={formData.cardholderName}
                  onChange={handleBankChange}
                  placeholder="John Doe"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: errors.cardholderName ? '2px solid #f44336' : '2px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    background: errors.cardholderName ? '#ffebee' : 'white',
                  }}
                />
                {errors.cardholderName && (
                  <p style={{ color: '#f44336', fontSize: '12px', marginTop: '4px' }}>⚠️ {errors.cardholderName}</p>
                )}
              </div>

              {/* Bank Name */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '6px' }}>
                  Bank Name *
                </label>
                <select
                  name="bankName"
                  value={formData.bankName || ''}
                  onChange={handleBankChange}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: errors.bankName ? '2px solid #f44336' : '2px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    background: errors.bankName ? '#ffebee' : 'white',
                  }}
                >
                  <option value="">Select your bank</option>
                  <option value="DBS">DBS Bank</option>
                  <option value="OCBC">OCBC Bank</option>
                  <option value="UOB">UOB Bank</option>
                  <option value="Maybank">Maybank</option>
                  <option value="CIMB">CIMB Bank</option>
                  <option value="Other">Other</option>
                </select>
                {errors.bankName && (
                  <p style={{ color: '#f44336', fontSize: '12px', marginTop: '4px' }}>⚠️ {errors.bankName}</p>
                )}
              </div>

              {/* Account Number */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '6px' }}>
                  Account Number *
                </label>
                <input
                  type="text"
                  name="accountNumber"
                  value={formData.accountNumber || ''}
                  onChange={handleBankChange}
                  placeholder="123456789012345"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: errors.accountNumber ? '2px solid #f44336' : '2px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    background: errors.accountNumber ? '#ffebee' : 'white',
                    fontFamily: 'monospace',
                  }}
                />
                {errors.accountNumber && (
                  <p style={{ color: '#f44336', fontSize: '12px', marginTop: '4px' }}>⚠️ {errors.accountNumber}</p>
                )}
              </div>
            </>
          )}

          {paymentType === 'paypal' && (
            <div style={{
              background: '#FFF3E0',
              border: '2px solid #FF9800',
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
              color: '#E65100',
            }}>
              <p style={{ margin: 0, fontWeight: '600', fontSize: '14px' }}>🅿️ PayPal Connection</p>
              <p style={{ margin: '8px 0 0 0', fontSize: '13px' }}>You'll be redirected to PayPal to securely connect your account. No card details needed!</p>
            </div>
          )}

          {/* Security Info */}
          <div style={{
            background: '#E8F5E9',
            border: '2px solid #4CAF50',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '12px',
            color: '#2E7D32',
          }}>
            🔒 All payment information is encrypted and processed securely through Stripe. Your card details are never stored on our servers.
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '14px',
                background: loading ? '#FFB088' : '#FF6B35',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? '⏳ Processing...' : '✓ Add Payment Method'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                flex: 1,
                padding: '14px',
                background: 'white',
                color: '#666',
                border: '2px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: loading ? 0.6 : 1,
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
