import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle, MessageCircle, FileText, Users } from 'lucide-react';
import { EvidenceViewer } from './EvidenceViewer';

interface DisputeInvestigationViewProps {
  disputeId: number;
  status: string;
  createdAt: string;
  responseDeadline: string;
  autoResolveAt: string;
  raisedBy: 'doer' | 'company';
  amount: number;
  reason: string;
  userType: 'doer' | 'company_staff' | 'admin';
  doerEvidenceCount: number;
  companyEvidenceCount: number;
}

export function DisputeInvestigationView({
  disputeId,
  status,
  createdAt,
  responseDeadline,
  autoResolveAt,
  raisedBy,
  amount,
  reason,
  userType,
  doerEvidenceCount,
  companyEvidenceCount,
}: DisputeInvestigationViewProps) {
  const now = new Date();
  const deadline = new Date(responseDeadline);
  const autoResolve = new Date(autoResolveAt);

  const hoursUntilDeadline = Math.max(
    0,
    Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60))
  );

  const hoursUntilAutoResolve = Math.max(
    0,
    Math.round((autoResolve.getTime() - now.getTime()) / (1000 * 60 * 60))
  );

  const isInvestigationActive =
    ['OPEN', 'PENDING_RESPONSE', 'EVIDENCE_RECEIVED'].includes(status) &&
    hoursUntilAutoResolve > 0;

  const canUploadEvidence = isInvestigationActive && userType !== 'admin';

  const getRaisedByLabel = () => {
    return raisedBy === 'doer' ? 'Doer (Service Provider)' : 'Company (Client)';
  };

  const getDefendantLabel = () => {
    return raisedBy === 'doer' ? 'Company (Client)' : 'Doer (Service Provider)';
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'OPEN':
        return 'bg-red-100 text-red-700';
      case 'PENDING_RESPONSE':
        return 'bg-yellow-100 text-yellow-700';
      case 'EVIDENCE_RECEIVED':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Dispute Investigation</h1>
            <p className="text-gray-600">Both parties can submit evidence during investigation phase</p>
          </div>
          <span className={`px-4 py-2 rounded-full font-bold text-sm ${getStatusColor(status)}`}>
            {status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Dispute Amount</p>
          <p className="text-2xl font-bold text-gray-800">${amount.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Response Deadline</p>
          <p className="text-2xl font-bold text-orange-600">{hoursUntilDeadline}h</p>
          <p className="text-xs text-gray-500 mt-1">{new Date(responseDeadline).toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Auto-Resolve</p>
          <p className="text-2xl font-bold text-red-600">{hoursUntilAutoResolve}h</p>
          <p className="text-xs text-gray-500 mt-1">T+48h from dispute creation</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Evidence Submitted</p>
          <p className="text-2xl font-bold text-gray-800">{doerEvidenceCount + companyEvidenceCount}</p>
          <p className="text-xs text-gray-500 mt-1">
            Doer: {doerEvidenceCount} | Company: {companyEvidenceCount}
          </p>
        </div>
      </div>

      {/* Warning Alert */}
      {hoursUntilAutoResolve <= 12 && hoursUntilAutoResolve > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-semibold text-red-900">Investigation Ending Soon</p>
            <p className="text-red-700 text-sm mt-1">
              {hoursUntilAutoResolve === 1
                ? 'Less than 1 hour remaining before auto-resolution'
                : `Only ${hoursUntilAutoResolve} hours remaining before auto-resolution`}
            </p>
            <p className="text-red-700 text-sm">
              Submit any remaining evidence now. System will auto-resolve based on evidence count.
            </p>
          </div>
        </div>
      )}

      {hoursUntilAutoResolve <= 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="font-semibold text-gray-800">Investigation Closed</p>
          <p className="text-gray-600 text-sm mt-1">
            The investigation phase has ended. No more evidence can be submitted.
          </p>
        </div>
      )}

      {/* Dispute Details */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Dispute Details</h2>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-500 uppercase font-semibold mb-2">Raised By</p>
            <p className="text-lg font-medium text-gray-800">{getRaisedByLabel()}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500 uppercase font-semibold mb-2">Respondent</p>
            <p className="text-lg font-medium text-gray-800">{getDefendantLabel()}</p>
          </div>

          <div className="col-span-2">
            <p className="text-sm text-gray-500 uppercase font-semibold mb-2">Reason for Dispute</p>
            <p className="text-gray-800 bg-gray-50 p-3 rounded-lg">{reason}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500 uppercase font-semibold mb-2">Dispute Created</p>
            <p className="text-gray-800">{new Date(createdAt).toLocaleString()}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500 uppercase font-semibold mb-2">Status</p>
            <p className={`inline-block px-3 py-1 rounded-full font-semibold text-sm ${getStatusColor(status)}`}>
              {status.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
      </div>

      {/* Investigation Timeline */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Clock size={24} />
          Investigation Timeline
        </h2>

        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <div className="w-1 h-12 bg-gray-300"></div>
            </div>
            <div className="pb-8">
              <p className="font-semibold text-gray-800">T+0h - Dispute Created</p>
              <p className="text-sm text-gray-600 mt-1">{new Date(createdAt).toLocaleString()}</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`w-4 h-4 rounded-full ${hoursUntilDeadline > 0 ? 'bg-orange-500' : 'bg-gray-500'}`}></div>
              <div className="w-1 h-12 bg-gray-300"></div>
            </div>
            <div className="pb-8">
              <p className="font-semibold text-gray-800">T+24h - Response Deadline</p>
              <p className="text-sm text-gray-600 mt-1">
                {hoursUntilDeadline > 0
                  ? `${hoursUntilDeadline} hours remaining`
                  : 'Deadline has passed'}
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`w-4 h-4 rounded-full ${hoursUntilAutoResolve > 0 ? 'bg-red-500' : 'bg-gray-500'}`}></div>
              <div className="w-1 h-12 bg-gray-300"></div>
            </div>
            <div className="pb-8">
              <p className="font-semibold text-gray-800">T+48h - Auto-Resolve</p>
              <p className="text-sm text-gray-600 mt-1">
                {hoursUntilAutoResolve > 0
                  ? `${hoursUntilAutoResolve} hours remaining`
                  : 'Auto-resolution has occurred'}
              </p>
              <p className="text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded">
                System will resolve based on evidence count if no manual verdict is issued
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
            </div>
            <div>
              <p className="font-semibold text-gray-800">T+72h - Case Closed</p>
              <p className="text-sm text-gray-600 mt-1">Payment released/refunded</p>
            </div>
          </div>
        </div>
      </div>

      {/* Evidence Submission */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <FileText size={24} />
          Evidence & Documentation
        </h2>

        <EvidenceViewer
          disputeId={disputeId}
          canUpload={canUploadEvidence}
          userType={userType}
          timeRemaining={hoursUntilAutoResolve}
          onEvidenceUploaded={() => {
            // Refresh parent component if needed
          }}
        />
      </div>

      {/* Key Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">📋 How Investigation Works</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>
            <strong>Both parties</strong> can submit evidence (photos, videos, documents) anytime during investigation
          </li>
          <li>
            <strong>Evidence is analyzed</strong> by AI to extract key points and assess credibility
          </li>
          <li>
            <strong>Admin can issue verdict</strong> before T+48h based on evidence and investigation
          </li>
          <li>
            <strong>Auto-resolution at T+48h:</strong> If no verdict is issued, system decides based on evidence count
          </li>
          <li>
            <strong>Appeal window:</strong> After verdict, parties have 12 hours (T+48h to T+60h) to appeal
          </li>
          <li>
            <strong>Case closed at T+72h:</strong> All appeals reviewed, payment released, case archived
          </li>
        </ul>
      </div>

      {/* Evidence Summary for Admin */}
      {userType === 'admin' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Admin: Evidence Summary</h3>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-600 uppercase font-semibold mb-2">Doer Evidence</p>
              <p className="text-3xl font-bold text-blue-900">{doerEvidenceCount}</p>
              <p className="text-xs text-blue-600 mt-1">files submitted</p>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-600 uppercase font-semibold mb-2">Company Evidence</p>
              <p className="text-3xl font-bold text-green-900">{companyEvidenceCount}</p>
              <p className="text-xs text-green-600 mt-1">files submitted</p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-3">
              <strong>Recommendation:</strong>
            </p>
            {doerEvidenceCount === 0 && companyEvidenceCount === 0 ? (
              <p className="text-gray-700">
                No evidence submitted by either party. System will perform 50/50 split on auto-resolve.
              </p>
            ) : doerEvidenceCount > companyEvidenceCount ? (
              <p className="text-gray-700">
                Doer has submitted more evidence. Auto-resolve would favor Doer (APPROVE_DOER).
              </p>
            ) : companyEvidenceCount > doerEvidenceCount ? (
              <p className="text-gray-700">
                Company has submitted more evidence. Auto-resolve would favor Company (APPROVE_COMPANY).
              </p>
            ) : (
              <p className="text-gray-700">
                Evidence is equal from both parties. Auto-resolve would split 50/50 (PARTIAL_SPLIT).
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
