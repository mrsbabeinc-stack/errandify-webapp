import { useState, useEffect } from 'react';
import axios from 'axios';

interface Dispute {
  id: number;
  title: string;
  asker_id: number;
  status: string;
  dispute_reason: string;
  created_at: string;
  work_proof_description?: string;
  work_proof_urls?: string[];
}

export default function AdminDisputePanel() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState('full_doer');
  const [customSplit, setCustomSplit] = useState(100);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/disputes/list/all`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setDisputes(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch disputes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedDispute) return;

    setResolving(true);
    try {
      const token = localStorage.getItem('token');

      let paymentPercentage = 100;
      let paymentTo = 'doer';
      let resolutionText = '';

      switch (resolution) {
        case 'full_doer':
          paymentPercentage = 100;
          paymentTo = 'doer';
          resolutionText = 'Work satisfactory - full payment to doer';
          break;
        case 'split_80_20':
          paymentPercentage = 80;
          paymentTo = 'split';
          resolutionText = 'Work mostly done - 80% to doer, 20% refund to asker';
          break;
        case 'split_50_50':
          paymentPercentage = 50;
          paymentTo = 'split';
          resolutionText = 'Partial work - 50% to doer, 50% refund to asker';
          break;
        case 'full_asker':
          paymentPercentage = 0;
          paymentTo = 'asker';
          resolutionText = 'Work not completed - full refund to asker';
          break;
        case 'custom':
          paymentPercentage = customSplit;
          paymentTo = 'split';
          resolutionText = `Custom split - ${customSplit}% to doer, ${100 - customSplit}% to asker`;
          break;
      }

      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${selectedDispute.id}/resolve-dispute`,
        {
          resolution: resolutionText,
          payment_to: paymentTo,
          amount_percentage: paymentPercentage,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert('✨ Dispute resolved! Fair solutions made. Thank you! 🤝');
      setSelectedDispute(null);
      fetchDisputes();
    } catch (error: any) {
      alert('Error: ' + (error.response?.data?.error || 'Failed to resolve dispute'));
    } finally {
      setResolving(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading disputes...</div>;
  }

  if (!selectedDispute) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-errandify-brown mb-6">Admin: Dispute Resolution</h1>

          {disputes.length === 0 ? (
            <div className="bg-white rounded-lg p-6 text-center text-gray-600">
              No disputes to resolve
            </div>
          ) : (
            <div className="space-y-4">
              {disputes.map((dispute) => (
                <div
                  key={dispute.id}
                  onClick={() => setSelectedDispute(dispute)}
                  className="bg-white rounded-lg p-4 border-2 border-red-200 hover:border-red-400 cursor-pointer transition"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-errandify-brown">{dispute.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{dispute.dispute_reason}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Created: {new Date(dispute.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold">
                      Disputed
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => setSelectedDispute(null)}
          className="text-blue-500 hover:underline mb-4"
        >
          ← Back to Disputes
        </button>

        <div className="bg-white rounded-lg p-6">
          <h2 className="text-2xl font-bold text-errandify-brown mb-4">{selectedDispute.title}</h2>

          {/* Dispute Details */}
          <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
            <h3 className="font-semibold text-red-800 mb-2">Dispute Reason</h3>
            <p className="text-red-700">{selectedDispute.dispute_reason}</p>
          </div>

          {/* Work Proof */}
          <div className="mb-6">
            <h3 className="font-semibold text-errandify-brown mb-3">Work Proof Submitted</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700 mb-4">{selectedDispute.work_proof_description}</p>

              {selectedDispute.work_proof_urls && selectedDispute.work_proof_urls.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {selectedDispute.work_proof_urls.map((url, idx) => (
                    <div key={idx} className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
                      <img
                        src={url}
                        alt={`Proof ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Resolution Templates */}
          <div className="mb-6">
            <h3 className="font-semibold text-errandify-brown mb-3">Resolution Template</h3>
            <div className="space-y-3">
              {[
                { id: 'full_doer', label: '✓ Work Satisfactory', desc: '100% to doer' },
                { id: 'split_80_20', label: '⚠️ Mostly Done', desc: '80% to doer, 20% to asker' },
                { id: 'split_50_50', label: '⚠️ Partial Work', desc: '50/50 split' },
                { id: 'full_asker', label: '✗ Work Not Done', desc: '100% refund to asker' },
                { id: 'custom', label: '⚙️ Custom Split', desc: 'Set custom percentage' },
              ].map((template) => (
                <label key={template.id} className="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-errandify-orange">
                  <input
                    type="radio"
                    name="resolution"
                    value={template.id}
                    checked={resolution === template.id}
                    onChange={(e) => setResolution(e.target.value)}
                    className="mr-3"
                  />
                  <div>
                    <p className="font-semibold text-gray-800">{template.label}</p>
                    <p className="text-xs text-gray-600">{template.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Custom Split Input */}
          {resolution === 'custom' && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <label className="block text-sm font-semibold text-blue-800 mb-2">
                Doer Payment Percentage: {customSplit}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={customSplit}
                onChange={(e) => setCustomSplit(parseInt(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-blue-600 mt-2">
                Asker refund: {100 - customSplit}%
              </p>
            </div>
          )}

          {/* Resolve Button */}
          <button
            onClick={handleResolve}
            disabled={resolving}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50"
          >
            {resolving ? 'Resolving...' : '✓ Resolve Dispute'}
          </button>
        </div>
      </div>
    </div>
  );
}
