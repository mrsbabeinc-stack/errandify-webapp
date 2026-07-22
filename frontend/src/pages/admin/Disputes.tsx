import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { useToast, ToastContainer } from '../../components/Toast';
import { CaseDisputeService } from '../../services/CaseDisputeService';

interface Dispute {
  id: number;
  errand_id: number;
  filed_by_user_id: number;
  dispute_type: string;
  description: string;
  evidence?: string;
  status: string;
  priority?: string;
  created_at: string;
  resolved_at?: string;
  resolution?: string;
  case_id?: string;
  has_appeal?: boolean;
  title?: string;
  formatted_id?: string;
  amount?: number | string;
  settlement_status?: string;
}

interface SafetyAnalysis {
  hasConcern: boolean;
  concernType?: string;
  severity?: string;
  flaggedPhrases?: string[];
  recommendation?: string;
}

interface LinkedCaseContext {
  case_id: string;
  case_type: string;
  severity: string;
  status: string;
  subject: string;
  asker_alias: string;
  doer_alias: string;
  ai_analysis?: string;
}

export const DisputesPage: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'hana_reviewing' | 'admin_review' | 'resolved' | 'closed'>('all');
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [linkedCaseContext, setLinkedCaseContext] = useState<LinkedCaseContext | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  // Deliberately starts unset. It used to default to 'approve', so an admin who
  // never touched the radio was one click from paying the doer in full.
  const [resolution, setResolution] = useState<'' | 'approve' | 'reject' | 'partial'>('');
  // True while the form still holds exactly what Hana suggested, so the admin
  // can see they are confirming her words rather than their own.
  const [prefilledFromHana, setPrefilledFromHana] = useState(false);
  // Only used for a partial split; must add up to the errand total
  // A dispute can end three ways. Monetary keeps the existing decision cards;
  // rework defers with a deadline both sides must agree to; non-monetary closes
  // it without money changing hands.
  const [resolutionKind, setResolutionKind] = useState<'monetary' | 'rework' | 'non_monetary'>('monetary');
  const [reworkDays, setReworkDays] = useState('3');
  const [nonMonetaryOutcome, setNonMonetaryOutcome] = useState('');
  const [doerAmount, setDoerAmount] = useState('');
  const [askerAmount, setAskerAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [safetyAnalysis, setSafetyAnalysis] = useState<SafetyAnalysis | null>(null);
  // Hana's suggestion for this dispute. Advisory only — the admin decides.
  const [hanaProposal, setHanaProposal] = useState<any>(null);
  const [hanaFailedReason, setHanaFailedReason] = useState<string | null>(null);
  // The shared 6-day authorisation clock every stage spends from
  const [authWindow, setAuthWindow] = useState<any>(null);

  useEffect(() => {
    fetchDisputes();
  }, [filter]);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/disputes`;
      const params = filter !== 'all' ? `?status=${filter}` : '';

      const response = await axios.get(url + params, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // GET /api/disputes returns { disputes, count } at the top level. This
      // read only looked under data.data, so the list silently rendered empty
      // even when the API had returned rows.
      setDisputes(
        response.data?.disputes || response.data?.data?.disputes || response.data?.data || []
      );
      setError('');
    } catch (err) {
      console.error('Failed to fetch disputes:', err);
      // Mock data for demo
      const mockDisputes: Dispute[] = [
        {
          id: 1,
          errand_id: 123,
          filed_by_user_id: 5,
          dispute_type: 'work_not_completed',
          description: 'Doer did not complete the cleaning in two rooms as agreed.',
          status: 'level_1',
          priority: 'normal',
          created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 2,
          errand_id: 124,
          filed_by_user_id: 8,
          dispute_type: 'low_quality',
          description: 'Cleaning quality was poor, many areas were missed.',
          status: 'level_2',
          priority: 'normal',
          created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 3,
          errand_id: 125,
          filed_by_user_id: 12,
          dispute_type: 'payment_not_released',
          description: 'Payment was promised but not released after errand completion.',
          status: 'level_2',
          priority: 'high',
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 4,
          errand_id: 126,
          filed_by_user_id: 15,
          dispute_type: 'safety_concern',
          description: 'Doer behaved inappropriately during the errand.',
          status: 'level_3',
          priority: 'critical',
          created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 5,
          errand_id: 127,
          filed_by_user_id: 3,
          dispute_type: 'work_not_completed',
          description: 'Only partial work was completed.',
          status: 'resolved',
          priority: 'normal',
          created_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
          resolved_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
      ];
      setDisputes(mockDisputes);
      setError('');
    } finally {
      setLoading(false);
    }
  };

  const fetchSafetyAnalysis = async (disputeId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/disputes/${disputeId}/analysis`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSafetyAnalysis(response.data.analysis || null);
    } catch (err) {
      console.error('Failed to fetch safety analysis:', err);
      setSafetyAnalysis(null);
    }
  };

  const fetchHanaProposal = async (disputeId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/disputes/${disputeId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const proposal = response.data?.dispute?.hanaProposal || null;
      setHanaProposal(proposal);
      setHanaFailedReason(response.data?.dispute?.hanaFailedReason || null);
      setAuthWindow(response.data?.dispute?.authorisationWindow || null);

      // Drop Hana's suggestion straight into the form so the admin is editing a
      // draft rather than a blank page. Only for actions that map to a decision
      // — if Hana said she needs more information, she has no opinion to prefill
      // and the admin should start clean.
      const actionToDecision: Record<string, 'approve' | 'reject' | 'partial'> = {
        pay_doer_in_full: 'approve',
        refund_asker_in_full: 'reject',
        split_payment: 'partial',
      };

      // Hana's six actions already span all three kinds, so her answer sets the
      // whole form — not just which card is ticked.
      const actionToKind: Record<string, 'monetary' | 'rework' | 'non_monetary'> = {
        pay_doer_in_full: 'monetary',
        refund_asker_in_full: 'monetary',
        split_payment: 'monetary',
        redo_the_work: 'rework',
        no_action_needed: 'non_monetary',
      };
      const suggestedKind = proposal ? actionToKind[proposal.action] : undefined;
      if (suggestedKind) {
        setResolutionKind(suggestedKind);
        if (suggestedKind === 'non_monetary') setNonMonetaryOutcome('no_action_needed');
      }
      const suggested = proposal ? actionToDecision[proposal.action] : undefined;
      if (suggested) {
        setResolution(suggested);
        setNotes(proposal.proposal || '');
        // A prefilled 'partial' with empty amounts is not usable — seed an even
        // split so the form is complete, exactly as picking Partial by hand does.
        if (suggested === 'partial') {
          const total = Number(response.data?.dispute?.amount ?? 0);
          const half = Math.round((total / 2) * 100) / 100;
          setDoerAmount(half.toFixed(2));
          setAskerAmount((total - half).toFixed(2));
        } else {
          setDoerAmount('');
          setAskerAmount('');
        }
        setPrefilledFromHana(true);
      } else {
        setResolution('');
        setNotes('');
        setPrefilledFromHana(false);
      }
    } catch (err) {
      console.error('Failed to fetch Hana proposal:', err);
      setHanaProposal(null);
      setHanaFailedReason(null);
    }
  };

  const fetchLinkedCaseContext = async (disputeId: number) => {
    try {
      const caseContext = await CaseDisputeService.getCaseContextForDispute(disputeId);
      if (caseContext?.data) {
        setLinkedCaseContext(caseContext.data);
      }
    } catch (err) {
      console.error('Failed to fetch linked case context:', err);
      setLinkedCaseContext(null);
    }
  };

  // The errand total the split has to add up to
  const errandTotal = Number(selectedDispute?.amount ?? 0);
  const splitSum = (parseFloat(doerAmount) || 0) + (parseFloat(askerAmount) || 0);
  const splitBalances = Math.abs(splitSum - errandTotal) <= 0.01;

  const handleResolveDispute = async () => {
    if (!selectedDispute) return;

    // Only a monetary resolution needs a payment decision. A rework or a
    // non-monetary close has no amounts to agree.
    if (resolutionKind === 'monetary') {
      if (!resolution) {
        setError('Choose a decision first — Approve, Refund or Partial.');
        return;
      }
      if (resolution === 'partial' && !splitBalances) {
        setError(
          `The split must add up to $${errandTotal.toFixed(2)}. Right now it comes to $${splitSum.toFixed(2)}.`
        );
        return;
      }
    }
    if (resolutionKind === 'non_monetary' && !nonMonetaryOutcome) {
      setError('Choose what the outcome was.');
      return;
    }
    if (!notes.trim()) {
      setError(
        resolutionKind === 'rework'
          ? 'Explain what needs putting right — both people will read this.'
          : 'Please provide resolution notes'
      );
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/disputes/${selectedDispute.id}/resolve`,
        {
          resolutionKind,
          notes,
          // Canonical vocabulary — the backend also tolerates the short forms,
          // but sending what it stores keeps the two in step.
          ...(resolutionKind === 'monetary' && {
            resolution:
              resolution === 'approve' ? 'approved' : resolution === 'reject' ? 'rejected' : 'partial',
            ...(resolution === 'partial' && {
              doerAmount: parseFloat(doerAmount),
              askerAmount: parseFloat(askerAmount),
            }),
          }),
          ...(resolutionKind === 'rework' && { reworkDays: parseInt(reworkDays, 10) || 3 }),
          ...(resolutionKind === 'non_monetary' && { nonMonetaryOutcome }),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Update linked case with dispute resolution
      if (linkedCaseContext?.case_id) {
        await CaseDisputeService.updateCaseFromDisputeResolution(
          linkedCaseContext.case_id,
          selectedDispute.id,
          {
            resolution_type: resolution === 'approve' ? 'full_payment' : resolution === 'reject' ? 'full_refund' : 'split',
            doer_amount: 0,
            asker_amount: 0,
            notes: notes
          }
        );
      }

      alert(`✅ Dispute #${selectedDispute.id} resolved as "${resolution}". Case & parties updated.`);
      setShowReviewModal(false);
      setSelectedDispute(null);
      setLinkedCaseContext(null);
      setResolution('');
      setNotes('');
      setDoerAmount('');
      setAskerAmount('');
      setSafetyAnalysis(null);
      fetchDisputes();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to resolve dispute');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'hana_reviewing':
        return 'bg-blue-100 text-blue-800';
      case 'admin_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'work_not_completed':
        return 'Work Not Completed';
      case 'low_quality':
        return 'Low Quality';
      case 'payment_not_released':
        return 'Payment Issue';
      case 'safety_concern':
        return 'Safety Concern';
      default:
        return 'Other';
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-4xl mb-2">⚖️</div>
            <p className="text-gray-600">Loading disputes...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const filteredDisputes =
    filter === 'all'
      ? disputes
      : disputes.filter((d) => d.status.includes(filter));

  return (
    <AdminLayout>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <div className="admin-page">
        <div className="page-header mb-6" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>⚖️ Dispute Resolution Center</h1>
            <p>Review and resolve disputes across all levels</p>
          </div>
          <button
            onClick={() => navigate(-1)}
            style={{
              fontSize: '20px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#FF6B35',
              fontWeight: '700',
              padding: '0 8px',
            }}
            title="Go back"
          >
            ←
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500 shadow-sm">
            <p className="text-xs text-gray-600 font-semibold">Hana reviewing</p>
            <p className="text-2xl font-bold text-blue-600">
              {disputes.filter((d) => d.status === 'hana_reviewing').length}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border-l-4 border-yellow-500 shadow-sm">
            <p className="text-xs text-gray-600 font-semibold">Waiting on you</p>
            <p className="text-2xl font-bold text-yellow-600">
              {disputes.filter((d) => d.status === 'admin_review').length}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border-l-4 border-orange-500 shadow-sm">
            <p className="text-xs text-gray-600 font-semibold">Appeals</p>
            <p className="text-2xl font-bold text-orange-600">
              {disputes.filter((d) => d.has_appeal).length}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border-l-4 border-green-500 shadow-sm">
            <p className="text-xs text-gray-600 font-semibold">Resolved</p>
            <p className="text-2xl font-bold text-green-600">
              {disputes.filter((d) => d.status === 'resolved').length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 bg-white rounded-lg p-2 shadow-sm">
          {(['all', 'hana_reviewing', 'admin_review', 'resolved', 'closed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                filter === f
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {f === 'all'
                ? 'All'
                : f === 'hana_reviewing'
                ? '🌸 Hana reviewing'
                : f === 'admin_review'
                ? '⏳ Waiting on you'
                : f === 'resolved'
                ? '✅ Resolved'
                : '📦 Closed'}
            </button>
          ))}
        </div>

        {/* Disputes List */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {filteredDisputes.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 text-lg">No disputes found</p>
              <p className="text-gray-400 text-sm">All disputes are resolved! 🎉</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredDisputes.map((dispute) => (
                    <tr key={dispute.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-semibold text-gray-800">#{dispute.id}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {getTypeLabel(dispute.dispute_type)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                        {dispute.description}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                            dispute.status
                          )}`}
                        >
                          {dispute.status === 'hana_reviewing'
                            ? '🌸 Hana reviewing'
                            : dispute.status === 'admin_review'
                            ? '⏳ Waiting on you'
                            : dispute.status === 'resolved'
                            ? '✅ Resolved'
                            : dispute.status === 'closed'
                            ? '📦 Closed'
                            : dispute.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(dispute.created_at).toLocaleDateString('en-SG')}
                      </td>
                      <td className="px-6 py-4">
                        {dispute.status !== 'resolved' ? (
                          <button
                            onClick={() => {
                              setSelectedDispute(dispute);
                              setShowReviewModal(true);
                              fetchSafetyAnalysis(dispute.id);
                              fetchHanaProposal(dispute.id);
                              fetchLinkedCaseContext(dispute.id);
                            }}
                            className="text-orange-600 hover:text-orange-800 font-semibold text-sm"
                          >
                            Review →
                          </button>
                        ) : (
                          <span className="text-green-600 text-sm">Resolved</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedDispute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-6 flex justify-between items-center sticky top-0">
              <h2 className="text-2xl font-bold">Review Dispute #{selectedDispute.id}</h2>
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setSelectedDispute(null);
                  setResolution('');
                  setNotes('');
                  setDoerAmount('');
                  setAskerAmount('');
                  setError('');
                }}
                className="text-2xl hover:opacity-80"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Dispute Details */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-xs text-gray-600 font-semibold">DISPUTE TYPE</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {getTypeLabel(selectedDispute.dispute_type)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-semibold">STATUS</p>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(
                      selectedDispute.status
                    )}`}
                  >
                    {selectedDispute.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-semibold">FILED</p>
                  <p className="text-sm text-gray-700">
                    {new Date(selectedDispute.created_at).toLocaleString('en-SG')}
                  </p>
                </div>
              </div>

              {/* Linked Case Context */}
              {linkedCaseContext && (
                <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-blue-900 uppercase">📋 Linked Case</p>
                      <p className="text-lg font-bold text-blue-800">{linkedCaseContext.case_id}</p>
                      <p className="text-xs text-blue-700 mt-1">{linkedCaseContext.subject}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        linkedCaseContext.severity === 'critical' ? 'bg-red-200 text-red-900' :
                        linkedCaseContext.severity === 'high' ? 'bg-orange-200 text-orange-900' :
                        'bg-yellow-200 text-yellow-900'
                      }`}>
                        {linkedCaseContext.severity?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-blue-700 font-semibold">Asker</p>
                      <p className="text-blue-600">{linkedCaseContext.asker_alias}</p>
                    </div>
                    <div>
                      <p className="text-blue-700 font-semibold">Doer</p>
                      <p className="text-blue-600">{linkedCaseContext.doer_alias}</p>
                    </div>
                  </div>
                  {linkedCaseContext.ai_analysis && (
                    <div className="bg-white rounded p-2 text-xs text-gray-700 border-l-2 border-blue-500">
                      <strong>AI Analysis:</strong> {linkedCaseContext.ai_analysis}
                    </div>
                  )}
                  <button
                    onClick={() => navigate(`/admin/cases/${linkedCaseContext.case_id}`)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 rounded transition"
                  >
                    View Full Case →
                  </button>
                </div>
              )}

              {/* Description */}
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-2">DISPUTE DESCRIPTION</p>
                <p className="text-sm text-gray-700 bg-white border border-gray-200 rounded-lg p-3">
                  {selectedDispute.description}
                </p>
              </div>

              {/* Evidence */}
              {selectedDispute.evidence && (
                <div>
                  <p className="text-sm font-semibold text-gray-800 mb-2">EVIDENCE PROVIDED</p>
                  <p className="text-sm text-gray-700 bg-white border border-gray-200 rounded-lg p-3">
                    {selectedDispute.evidence}
                  </p>
                </div>
              )}

              <hr className="my-4" />

              {/* The payment clock. Shown first because it bounds everything below:
                  a rework cannot outlive it, and neither can the appeal window. */}
              {authWindow && (
                <div
                  className={`rounded-lg p-3 border-2 ${
                    authWindow.expired
                      ? 'bg-red-50 border-red-300'
                      : authWindow.critical
                      ? 'bg-amber-50 border-amber-300'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <p
                    className={`text-sm font-semibold ${
                      authWindow.expired
                        ? 'text-red-900'
                        : authWindow.critical
                        ? 'text-amber-900'
                        : 'text-gray-800'
                    }`}
                  >
                    {authWindow.expired ? '⏱️' : authWindow.critical ? '⚠️' : '⏳'} {authWindow.summary}
                  </p>
                  {!authWindow.expired && (
                    <p className="text-xs text-gray-600 mt-1">
                      {authWindow.settleNow
                        ? 'Anything that waits on the other side is off the table now — decide and settle so the payment can still be taken.'
                        : 'The card was authorised on day 1. Anything needing agreement has to be wrapped up by day 5, leaving day 6 to settle it.'}
                    </p>
                  )}
                </div>
              )}

              {/* Hana's proposal — a suggestion for the admin, never a decision */}
              {hanaProposal ? (
                <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-orange-900">🌸 Hana suggests</p>
                    <span className="text-[11px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                      {Math.round((hanaProposal.confidence || 0) * 100)}% confident
                    </span>
                  </div>
                  <p className="text-sm font-bold text-orange-900">
                    {String(hanaProposal.action || '').replace(/_/g, ' ')}
                  </p>
                  <p className="text-sm text-orange-800 bg-white border border-orange-200 rounded-lg p-3">
                    {hanaProposal.proposal}
                  </p>
                  <p className="text-xs text-orange-700">{hanaProposal.reasoning}</p>
                  <p className="text-[11px] text-orange-600 italic pt-1">
                    A suggestion only — nothing happens until you decide below.
                  </p>
                </div>
              ) : hanaFailedReason ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-600">
                    Hana couldn't review this one, so there's no suggestion. Over to you.
                  </p>
                </div>
              ) : null}

              {/* AI Analysis */}
              {safetyAnalysis && safetyAnalysis.hasConcern ? (
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-bold text-red-900">🚨 Safety Alert</p>
                  <div className="text-xs text-red-800 space-y-1">
                    <p><strong>Type:</strong> {safetyAnalysis.concernType || 'Unknown concern'}</p>
                    <p><strong>Severity:</strong> {safetyAnalysis.severity?.toUpperCase() || 'UNKNOWN'}</p>
                    {safetyAnalysis.flaggedPhrases && safetyAnalysis.flaggedPhrases.length > 0 && (
                      <p><strong>Flagged:</strong> "{safetyAnalysis.flaggedPhrases[0]}"</p>
                    )}
                  </div>
                  <div className="bg-red-100 rounded p-2 text-xs text-red-700 mt-2">
                    ⚠️ {safetyAnalysis.recommendation || 'Recommend careful review of this dispute'}
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                  <p className="text-xs font-semibold text-blue-900">🤖 AI Safety Check</p>
                  <div className="text-xs text-blue-800 space-y-1">
                    <p>✓ No coercion language detected</p>
                    <p>✓ Both parties appear to have clean history</p>
                    <p>💡 AI Confidence: Moderate (use your judgment)</p>
                  </div>
                </div>
              )}

            {/* Resolution */}
              <div className="space-y-4">
                {prefilledFromHana && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 flex items-start justify-between gap-3">
                    <p className="text-xs text-orange-800">
                      🌸 Prefilled with Hana's suggestion. Change anything you disagree with —
                      nothing is decided until you confirm.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setResolution('');
                        setNotes('');
                        setPrefilledFromHana(false);
                      }}
                      className="text-xs font-bold text-orange-700 underline whitespace-nowrap"
                    >
                      Start blank
                    </button>
                  </div>
                )}

                {/* How does this dispute end? Everything below follows from this. */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-3">
                    How are we settling this? *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { key: 'monetary', label: '💰 Money moves', desc: 'Pay, refund or split' },
                      {
                        key: 'rework',
                        label: '🔧 Rework it',
                        desc: authWindow?.settleNow ? 'No time left for this' : 'Put it right instead',
                        disabled: !!authWindow?.settleNow,
                      },
                      { key: 'non_monetary', label: '🤝 No money changes', desc: 'Warning, apology, nothing' },
                    ].map((k) => (
                      <button
                        key={k.key}
                        type="button"
                        disabled={(k as any).disabled}
                        onClick={() => {
                          setResolutionKind(k.key as any);
                          setPrefilledFromHana(false);
                          setError('');
                        }}
                        className={`text-left p-3 border-2 rounded-lg transition ${
                          (k as any).disabled
                            ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                            : resolutionKind === k.key
                            ? 'bg-orange-50 border-orange-500'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-semibold text-sm text-gray-800">{k.label}</div>
                        <div className="text-xs text-gray-600 mt-0.5">{k.desc}</div>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {resolutionKind === 'monetary'
                      ? 'The payment is released or split when you confirm.'
                      : resolutionKind === 'rework'
                      ? 'Both people must agree. The payment stays held until the work is put right — if they decline or miss the date, it comes back to you to decide compensation.'
                      : 'The payment goes through as originally agreed and the hold is lifted.'}
                  </p>
                </div>

                {resolutionKind === 'rework' && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                    <label className="block text-sm font-semibold text-gray-800">
                      How long do they have?
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="3"
                        value={reworkDays}
                        onChange={(e) => {
                          setReworkDays(e.target.value);
                          setPrefilledFromHana(false);
                        }}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <span className="text-sm text-gray-700">days from now</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Three days maximum — and shorter if the card authorisation is
                      close to expiring, since the payment has to still be capturable
                      when the work is done. Both people get 24 hours to agree; if
                      either says no, or nobody answers, it comes straight back to you.
                    </p>
                  </div>
                )}

                {resolutionKind === 'non_monetary' && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                      What was the outcome? *
                    </label>
                    {[
                      { key: 'sorted_between_parties', label: 'Sorted between themselves' },
                      { key: 'apology_given', label: 'Apology given' },
                      { key: 'guidance_given', label: 'Guidance given to one party' },
                      { key: 'warning_issued', label: 'Warning issued' },
                      { key: 'no_action_needed', label: 'No action needed' },
                    ].map((o) => (
                      <label
                        key={o.key}
                        className={`flex items-center gap-3 p-2.5 border-2 rounded-lg cursor-pointer transition ${
                          nonMonetaryOutcome === o.key
                            ? 'bg-orange-50 border-orange-500'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="nonMonetaryOutcome"
                          value={o.key}
                          checked={nonMonetaryOutcome === o.key}
                          onChange={(e) => {
                            setNonMonetaryOutcome(e.target.value);
                            setPrefilledFromHana(false);
                          }}
                        />
                        <span className="text-sm text-gray-800">{o.label}</span>
                      </label>
                    ))}
                  </div>
                )}

                {resolutionKind === 'monetary' && (
                <>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-3">
                    Your Decision *
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'approve', label: '✅ Approve', desc: 'Work done satisfactorily → Pay doer' },
                      { value: 'reject', label: '❌ Refund', desc: 'Work not as promised → Reimburse asker' },
                      { value: 'partial', label: '🤝 Partial', desc: 'Some work done with issues → Split payment' },
                    ].map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition ${
                          resolution === opt.value
                            ? 'bg-orange-50 border-orange-500'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="resolution"
                          value={opt.value}
                          checked={resolution === opt.value}
                          onChange={(e) => {
                            const next = e.target.value as 'approve' | 'reject' | 'partial';
                            setResolution(next);
                            setPrefilledFromHana(false);
                            if (next === 'partial') {
                              // Start from an even split — the commonest outcome,
                              // and it makes the total obvious
                              const half = errandTotal / 2;
                              setDoerAmount(half.toFixed(2));
                              setAskerAmount((errandTotal - half).toFixed(2));
                            } else {
                              setDoerAmount('');
                              setAskerAmount('');
                            }
                          }}
                          className="mt-1"
                        />
                        <div>
                          <div className="font-semibold text-sm text-gray-800">{opt.label}</div>
                          <div className="text-xs text-gray-600">{opt.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {resolution === 'partial' && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                    <p className="text-sm font-semibold text-gray-800">
                      Split of ${errandTotal.toFixed(2)}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">To doer ($)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={doerAmount}
                          onChange={(e) => {
                            const v = e.target.value;
                            setDoerAmount(v);
                            // Keep the other side in step so the total always balances
                            const n = parseFloat(v);
                            if (isFinite(n)) setAskerAmount(Math.max(0, errandTotal - n).toFixed(2));
                            setPrefilledFromHana(false);
                            setError('');
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">To asker ($)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={askerAmount}
                          onChange={(e) => {
                            const v = e.target.value;
                            setAskerAmount(v);
                            const n = parseFloat(v);
                            if (isFinite(n)) setDoerAmount(Math.max(0, errandTotal - n).toFixed(2));
                            setPrefilledFromHana(false);
                            setError('');
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>
                    <p className={`text-xs font-semibold ${splitBalances ? 'text-green-700' : 'text-red-600'}`}>
                      {splitBalances
                        ? `✓ Adds up to $${errandTotal.toFixed(2)}`
                        : `Currently $${splitSum.toFixed(2)} — must be $${errandTotal.toFixed(2)}`}
                    </p>
                  </div>
                )}
                </>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    {resolutionKind === 'rework'
                      ? 'What needs putting right? (Both Parties Will See This) *'
                      : 'Explain Your Decision (Both Parties Will See This) *'}
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => {
                      setNotes(e.target.value);
                      setPrefilledFromHana(false);
                      setError('');
                    }}
                    placeholder={`Example: "Based on the photos you provided, the work wasn't completed as promised. The asker has clear evidence. However, we appreciate your effort. Next time, communicate if something changes."`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm resize-none"
                    rows={4}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Tip: Write like you're explaining to a friend. Be fair, clear, and empathetic.
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-700">❌ {error}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => {
                    setShowReviewModal(false);
                    setSelectedDispute(null);
                    setResolution('');
                    setNotes('');
                    setDoerAmount('');
                    setAskerAmount('');
                    setError('');
                  }}
                  disabled={isSubmitting}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolveDispute}
                  disabled={isSubmitting}
                  className="flex-1 bg-orange-600 text-white py-2 rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-50"
                >
                  {isSubmitting ? '⏳ Resolving...' : '✅ Resolve Dispute'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .admin-page {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .page-header {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .page-header h1 {
          font-size: 24px;
          font-weight: 700;
          margin: 0;
          color: #ff6b35;
        }

        .page-header p {
          font-size: 13px;
          color: #888;
          margin: 0;
        }
      `}</style>
    </AdminLayout>
  );
};

export default DisputesPage;
