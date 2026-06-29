import React, { useState } from 'react';
import axios from 'axios';

interface ReportAbuseModalProps {
  isOpen: boolean;
  onClose: () => void;
  errandId?: number;
  errandTitle?: string;
}

export default function ReportAbuseModal({ isOpen, onClose, errandId, errandTitle }: ReportAbuseModalProps) {
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical' | ''>('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [wantContact, setWantContact] = useState<'no' | 'phone' | 'email' | ''>('no');
  const [language, setLanguage] = useState('English');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [reportId, setReportId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const isFormValid = description.length >= 20 && severity !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/safety/report', {
        reportType: 'unsafe_job',
        description,
        relatedErrandId: errandId || null,
        contactPhone: wantContact === 'phone' ? contactPhone : null,
        contactEmail: wantContact === 'email' ? contactEmail : null,
        severity,
      });

      setReportId(response.data.data.reportId);
      setSuccess(true);
    } catch (err) {
      console.error('Error submitting report:', err);
      setError('Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setDescription('');
      setSeverity('');
      setContactPhone('');
      setContactEmail('');
      setWantContact('no');
      setSuccess(false);
      setReportId(null);
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Success State */}
        {success && reportId ? (
          <div className="p-8 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Report Submitted</h2>
            <p className="text-gray-600 mb-6">
              Thank you for helping us keep everyone safe. Your report has been received and will be reviewed by our support team within 24 hours.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-2">Your Report Number</p>
              <p className="text-2xl font-bold text-blue-600">#VR-{reportId}</p>
              <p className="text-xs text-gray-500 mt-2">Save this number for your records</p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <h3 className="font-bold text-yellow-900 mb-2">If you're in immediate danger:</h3>
              <p className="text-yellow-800 mb-3">
                Call the Anti-Trafficking Hotline immediately (available 24/7):
              </p>
              <p className="text-xl font-bold text-red-600 mb-2">+65 1800-838-8877</p>
            </div>

            <div className="text-left bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-bold text-gray-900 mb-3">What happens next:</h4>
              <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
                <li>Our support team reviews your report</li>
                <li>If we find a threat, we escalate to law enforcement</li>
                <li>We pause or ban the unsafe user</li>
                {contactPhone || contactEmail ? (
                  <li>You'll receive an update within 24-48 hours</li>
                ) : (
                  <li>We keep all findings confidential</li>
                )}
              </ol>
            </div>

            <div className="text-left bg-blue-50 rounded-lg p-4 mb-6">
              <h4 className="font-bold text-blue-900 mb-3">Keep yourself safe:</h4>
              <ul className="space-y-2 text-sm text-blue-800 list-disc list-inside">
                <li>If in immediate danger → call 911 or hotline above</li>
                <li>Change your password</li>
                <li>Block the unsafe user</li>
                <li>Don't share more information with that person</li>
              </ul>
            </div>

            <button
              onClick={handleClose}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition"
            >
              Got It, Thank You
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-red-50 border-b border-red-200 px-8 py-6">
              <div className="flex items-start gap-3">
                <span className="text-3xl">⚠️</span>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Report Unsafe Situation</h2>
                  <p className="text-gray-600 mt-2">
                    Your report is completely anonymous. We won't show your name or email to anyone unless you ask us to contact you.
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                  {error}
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  What happened? <span className="text-red-600">*</span>
                </label>
                <p className="text-sm text-gray-600 mb-2">
                  Describe the unsafe situation. Is it a job posting with red flags? Someone asking you to do something illegal? Someone controlling you?
                </p>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what happened in detail..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={5}
                />
                <div className="text-xs text-gray-600 mt-2">
                  {description.length}/500 characters
                  {description.length < 20 && <span className="text-red-600 ml-2">(minimum 20 required)</span>}
                </div>
              </div>

              {/* Severity */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-3">
                  How serious is this? <span className="text-red-600">*</span>
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'low', label: 'Low - Concerning but not urgent' },
                    { value: 'medium', label: 'Medium - Serious situation' },
                    { value: 'high', label: 'High - Immediate danger' },
                    { value: 'critical', label: 'Critical - Life-threatening' },
                  ].map((option) => (
                    <label key={option.value} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="severity"
                        value={option.value}
                        checked={severity === option.value}
                        onChange={(e) => setSeverity(e.target.value as any)}
                        className="w-4 h-4"
                      />
                      <span className="text-gray-900 font-medium">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Related Errand */}
              {errandId && (
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Related Errand (Auto-filled)</label>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-gray-900 font-medium">{errandTitle || 'Errand #' + errandId}</p>
                  </div>
                </div>
              )}

              {/* Contact Preference */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-3">
                  Do you want us to reach out? (Optional)
                </label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="contact"
                      value="no"
                      checked={wantContact === 'no'}
                      onChange={() => setWantContact('no')}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-900 font-medium">No, keep it fully anonymous</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="contact"
                      value="phone"
                      checked={wantContact === 'phone'}
                      onChange={() => setWantContact('phone')}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-900 font-medium">Yes, call me on:</span>
                  </label>
                  {wantContact === 'phone' && (
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="+65 XXXX XXXX"
                      className="w-full ml-8 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}

                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="contact"
                      value="email"
                      checked={wantContact === 'email'}
                      onChange={() => setWantContact('email')}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-900 font-medium">Yes, email me at:</span>
                  </label>
                  {wantContact === 'email' && (
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full ml-8 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Which language should we use? <span className="text-red-600">*</span>
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option>English</option>
                  <option>Mandarin</option>
                  <option>Malay</option>
                  <option>Tamil</option>
                  <option>Tagalog</option>
                  <option>Burmese</option>
                  <option>Bengali</option>
                </select>
              </div>

              {/* Privacy Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>💡 Your privacy is protected by law.</strong> All reports are confidential and secure. We never share your personal information.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold rounded-lg transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isFormValid || loading}
                  className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
