/**
 * CaseDisputeService - Bridge between Cases and Disputes
 * Allows bi-directional data flow and linkage between case and dispute systems
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface CaseDisputeLink {
  case_id: string;
  dispute_id: number;
  errand_id: number;
  status: 'linked' | 'resolving' | 'resolved';
  case_status: string;
  dispute_status: string;
}

export class CaseDisputeService {
  private static getHeaders() {
    return {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Get all disputes linked to a specific case
   */
  static async getDisputesByCase(caseId: string) {
    try {
      const response = await fetch(
        `${API_URL}/api/cases/${caseId}/disputes`,
        { headers: this.getHeaders() }
      );
      if (!response.ok) throw new Error('Failed to fetch case disputes');
      return await response.json();
    } catch (error) {
      console.error('Error fetching disputes for case:', error);
      return { data: [] };
    }
  }

  /**
   * Get the case associated with a dispute
   */
  static async getCaseByDispute(disputeId: number) {
    try {
      const response = await fetch(
        `${API_URL}/api/disputes/${disputeId}/case`,
        { headers: this.getHeaders() }
      );
      if (!response.ok) throw new Error('Failed to fetch dispute case');
      return await response.json();
    } catch (error) {
      console.error('Error fetching case for dispute:', error);
      return null;
    }
  }

  /**
   * Link a dispute to a case (auto-create if needed)
   */
  static async linkDisputeToCase(caseId: string, disputeId: number) {
    try {
      const response = await fetch(
        `${API_URL}/api/cases/${caseId}/link-dispute`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ dispute_id: disputeId })
        }
      );
      if (!response.ok) throw new Error('Failed to link dispute to case');
      return await response.json();
    } catch (error) {
      console.error('Error linking dispute to case:', error);
      return null;
    }
  }

  /**
   * Update case status when dispute is resolved
   */
  static async updateCaseFromDisputeResolution(
    caseId: string,
    disputeId: number,
    resolution: {
      resolution_type: 'full_payment' | 'split' | 'full_refund' | 'escalate';
      doer_amount: number;
      asker_amount: number;
      notes: string;
    }
  ) {
    try {
      const response = await fetch(
        `${API_URL}/api/cases/${caseId}/resolve-from-dispute`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            dispute_id: disputeId,
            ...resolution
          })
        }
      );
      if (!response.ok) throw new Error('Failed to update case from dispute resolution');
      return await response.json();
    } catch (error) {
      console.error('Error updating case from dispute resolution:', error);
      return null;
    }
  }

  /**
   * Get dispute status affecting a case
   * Returns info if case has pending/active disputes
   */
  static async getCaseDisputeStatus(caseId: string) {
    try {
      const response = await fetch(
        `${API_URL}/api/cases/${caseId}/dispute-status`,
        { headers: this.getHeaders() }
      );
      if (!response.ok) throw new Error('Failed to fetch dispute status');
      return await response.json();
    } catch (error) {
      console.error('Error fetching case dispute status:', error);
      return {
        has_active_disputes: false,
        active_dispute_count: 0,
        disputes: []
      };
    }
  }

  /**
   * Get case context for dispute reviewer
   * Returns case details, evidence, chat, ratings
   */
  static async getCaseContextForDispute(disputeId: number) {
    try {
      const response = await fetch(
        `${API_URL}/api/disputes/${disputeId}/case-context`,
        { headers: this.getHeaders() }
      );
      if (!response.ok) throw new Error('Failed to fetch case context');
      return await response.json();
    } catch (error) {
      console.error('Error fetching case context for dispute:', error);
      return null;
    }
  }

  /**
   * Auto-escalate case to dispute if needed
   * Creates dispute from case evidence
   */
  static async escalateCaseToDispute(caseId: string, reason: string) {
    try {
      const response = await fetch(
        `${API_URL}/api/cases/${caseId}/escalate-to-dispute`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ reason })
        }
      );
      if (!response.ok) throw new Error('Failed to escalate case to dispute');
      return await response.json();
    } catch (error) {
      console.error('Error escalating case to dispute:', error);
      return null;
    }
  }

  /**
   * Create case from dispute
   * When a dispute is filed, creates or links to case
   */
  static async createCaseFromDispute(disputeId: number, caseData: {
    case_type: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    subject: string;
  }) {
    try {
      const response = await fetch(
        `${API_URL}/api/disputes/${disputeId}/create-case`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(caseData)
        }
      );
      if (!response.ok) throw new Error('Failed to create case from dispute');
      return await response.json();
    } catch (error) {
      console.error('Error creating case from dispute:', error);
      return null;
    }
  }

  /**
   * Get linked cases and disputes for dashboard metrics
   * Returns summary of pending/active/resolved connections
   */
  static async getLinkedSummary() {
    try {
      const response = await fetch(
        `${API_URL}/api/cases-disputes/summary`,
        { headers: this.getHeaders() }
      );
      if (!response.ok) throw new Error('Failed to fetch linked summary');
      return await response.json();
    } catch (error) {
      console.error('Error fetching linked summary:', error);
      return {
        total_cases: 0,
        total_disputes: 0,
        cases_with_disputes: 0,
        pending_resolutions: 0,
        average_resolution_time: 0
      };
    }
  }
}
