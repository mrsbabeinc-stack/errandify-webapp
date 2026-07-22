// Dispute Service - 3-Day Max Resolution System
import Dispute from '../models/Dispute';
import DisputeEvidence from '../models/DisputeEvidence';
import DisputeChat from '../models/DisputeChat';
// date-fns was imported for addHours alone and was never installed, so any
// module that imported this service crashed the server at startup. Local
// helper instead of pulling in a dependency for three lines.
const addHours = (date: Date | string | number, hours: number): Date =>
  new Date(new Date(date).getTime() + hours * 60 * 60 * 1000);

interface CreateDisputeInput {
  errandId: string;
  raisedBy: 'doer' | 'company';
  raisedByUserId: number;
  raisedByCompanyId?: number;
  defendantUserId?: number;
  defendantCompanyId?: number;
  reason: string;
  amount: number;
}

interface ResponseSubmissionInput {
  disputeId: number;
  responderId: number;
  responderType: 'doer' | 'company_staff';
  message: string;
}

class DisputeService {
  // Create dispute with 3-day timeline
  static async createDispute(input: CreateDisputeInput) {
    const now = new Date();
    const responseDeadline = addHours(now, 24); // T+24h
    const autoResolveAt = addHours(now, 48); // T+48h HARD DEADLINE

    const dispute = await Dispute.create({
      ...input,
      status: 'OPEN',
      responseDeadline,
      autoResolveAt,
      doerEvidenceCount: 0,
      companyEvidenceCount: 0,
      appealEvidenceCount: 0,
      appealed: false,
      extensionRequested: false,
      paymentStatus: 'HELD',
    });

    // Create system message - Dispute opened
    await DisputeChat.create({
      disputeId: dispute.id,
      senderId: 0,
      senderType: 'admin',
      message: `Dispute opened for errand ${input.errandId}. Please respond within 24 hours.`,
      messageType: 'SYSTEM',
      isSystem: true,
      systemEventType: 'DISPUTE_OPENED',
    });

    return dispute;
  }

  // Submit response and evidence
  static async submitResponse(input: ResponseSubmissionInput, evidenceFiles?: any[]) {
    const dispute = await Dispute.findByPk(input.disputeId);
    if (!dispute) throw new Error('Dispute not found');

    if (new Date() > dispute.responseDeadline && !dispute.newDeadline) {
      throw new Error('Response deadline passed (unless extension approved)');
    }

    // Add message to chat
    await DisputeChat.create({
      disputeId: input.disputeId,
      senderId: input.responderId,
      senderType: input.responderType,
      message: input.message,
      messageType: 'TEXT',
      isSystem: false,
    });

    // Mark evidence received (update counts, timestamps)
    if (input.responderType === 'doer') {
      if (!dispute.doerEvidenceSubmittedAt) {
        await dispute.update({ doerEvidenceSubmittedAt: new Date() });
      }
    } else {
      if (!dispute.companyEvidenceSubmittedAt) {
        await dispute.update({ companyEvidenceSubmittedAt: new Date() });
      }
    }

    // Process evidence uploads if provided
    if (evidenceFiles && evidenceFiles.length > 0) {
      await this.submitEvidence(input.disputeId, input.responderId, input.responderType, evidenceFiles);
    }

    // Update status if both parties have responded
    if (dispute.doerEvidenceSubmittedAt && dispute.companyEvidenceSubmittedAt) {
      await dispute.update({ status: 'EVIDENCE_RECEIVED' });
    } else {
      await dispute.update({ status: 'PENDING_RESPONSE' });
    }

    return dispute;
  }

  // Submit evidence anytime during investigation (T+0 to T+48h)
  static async submitEvidence(
    disputeId: number,
    userId: number,
    userType: 'doer' | 'company_staff',
    evidenceFiles: any[]
  ) {
    const dispute = await Dispute.findByPk(disputeId);
    if (!dispute) throw new Error('Dispute not found');

    // Can submit evidence anytime before T+48h (auto-resolve deadline)
    if (new Date() > dispute.autoResolveAt) {
      throw new Error('Evidence cannot be submitted after auto-resolve deadline (T+48h)');
    }

    // Allow evidence submission during OPEN, PENDING_RESPONSE, or EVIDENCE_RECEIVED status
    if (!['OPEN', 'PENDING_RESPONSE', 'EVIDENCE_RECEIVED'].includes(dispute.status)) {
      throw new Error('Evidence cannot be submitted after verdict issued');
    }

    const submittedBy = userType === 'doer' ? 'doer' : 'company';
    const createdEvidence = [];

    for (const file of evidenceFiles) {
      const evidence = await DisputeEvidence.create({
        disputeId,
        submittedBy,
        submittedByUserId: userId,
        submittedByCompanyId: userType === 'company_staff' ? dispute.raisedByCompanyId : undefined,
        type: file.type, // 'photo' | 'video' | 'text'
        originalSize: file.size,
        isCompressed: false,
        fileName: file.name,
        textContent: file.type === 'text' ? file.content : undefined,
        mimeType: file.mimeType || null,
        aiAnalysisStatus: 'PENDING',
      });
      createdEvidence.push(evidence);
    }

    // Update evidence counts
    const doerCount = await DisputeEvidence.count({
      where: { disputeId, submittedBy: 'doer' },
    });
    const companyCount = await DisputeEvidence.count({
      where: { disputeId, submittedBy: 'company' },
    });

    await dispute.update({
      doerEvidenceCount: doerCount,
      companyEvidenceCount: companyCount,
    });

    // Add system message to chat tracking evidence submission
    await DisputeChat.create({
      disputeId,
      senderId: userId,
      senderType: userType,
      message: `Submitted ${createdEvidence.length} evidence file(s): ${createdEvidence.map((e) => e.fileName).join(', ')}`,
      messageType: 'EVIDENCE_LINK',
      isSystem: false,
    });

    // Update status to EVIDENCE_RECEIVED if both parties have now submitted evidence
    if (doerCount > 0 && companyCount > 0) {
      await dispute.update({ status: 'EVIDENCE_RECEIVED' });
    } else if (doerCount > 0 || companyCount > 0) {
      await dispute.update({ status: 'PENDING_RESPONSE' });
    }

    return createdEvidence;
  }

  // Get evidence for a dispute (with pagination)
  static async getEvidenceByParty(disputeId: number, party: 'doer' | 'company') {
    const evidence = await DisputeEvidence.findAll({
      where: { disputeId, submittedBy: party },
      order: [['uploadedAt', 'DESC']],
    });

    return evidence;
  }

  // Get all evidence for a dispute
  static async getAllEvidence(disputeId: number) {
    const evidence = await DisputeEvidence.findAll({
      where: { disputeId },
      order: [['uploadedAt', 'DESC']],
    });

    return evidence;
  }

  // Request extension (max 1 × 12h only)
  static async requestExtension(disputeId: number, reason: string, requestedBy: number) {
    const dispute = await Dispute.findByPk(disputeId);
    if (!dispute) throw new Error('Dispute not found');

    if (dispute.extensionRequested) {
      throw new Error('Only 1 extension allowed per dispute');
    }

    if (new Date() > dispute.responseDeadline) {
      throw new Error('Cannot request extension after deadline passed');
    }

    await dispute.update({
      extensionRequested: true,
      extensionRequestReason: reason,
    });

    // Admin will approve/deny within 30 min (admin action)
    return dispute;
  }

  // Admin: Approve extension (adds 12h to deadline)
  static async approveExtension(disputeId: number, approvedBy: number) {
    const dispute = await Dispute.findByPk(disputeId);
    if (!dispute) throw new Error('Dispute not found');

    if (!dispute.extensionRequested) {
      throw new Error('No extension request found');
    }

    const newDeadline = addHours(dispute.responseDeadline, 12); // T+36h

    await dispute.update({
      extensionApprovedAt: new Date(),
      extensionApprovedBy: approvedBy,
      newDeadline,
    });

    // Add system message
    await DisputeChat.create({
      disputeId,
      senderId: approvedBy,
      senderType: 'admin',
      message: `Extension approved. New deadline: ${newDeadline.toISOString()}`,
      messageType: 'SYSTEM',
      isSystem: true,
      systemEventType: 'EXTENSION_APPROVED',
    });

    return dispute;
  }

  // Admin: Deny extension
  static async denyExtension(disputeId: number, deniedBy: number, reason?: string) {
    const dispute = await Dispute.findByPk(disputeId);
    if (!dispute) throw new Error('Dispute not found');

    await dispute.update({
      extensionDeniedAt: new Date(),
      extensionApprovedBy: deniedBy,
      extensionRequested: false,
    });

    // Add system message
    await DisputeChat.create({
      disputeId,
      senderId: deniedBy,
      senderType: 'admin',
      message: `Extension denied. ${reason || 'Original deadline remains.'}`,
      messageType: 'SYSTEM',
      isSystem: true,
      systemEventType: 'EXTENSION_DENIED',
    });

    return dispute;
  }

  // Reminder 1: T+24h (if no response)
  static async sendReminder1() {
    const targetTime = addHours(new Date(), -24);
    const disputes = await Dispute.findAll({
      where: {
        status: 'OPEN',
        createdAt: { [require('sequelize').Op.lte]: targetTime },
        firstReminderSentAt: null,
      },
    });

    for (const dispute of disputes) {
      await dispute.update({ firstReminderSentAt: new Date() });
      await DisputeChat.create({
        disputeId: dispute.id,
        senderId: 0,
        senderType: 'admin',
        message: 'Reminder: Please respond to this dispute within 24 hours. Your response deadline is approaching.',
        messageType: 'SYSTEM',
        isSystem: true,
        systemEventType: 'REMINDER_1',
      });
      // TODO: Send email notification
    }
  }

  // Reminder 2: T+36h (if still no response) - URGENT + SMS
  static async sendReminder2() {
    const targetTime = addHours(new Date(), -36);
    const disputes = await Dispute.findAll({
      where: {
        status: 'OPEN',
        createdAt: { [require('sequelize').Op.lte]: targetTime },
        secondReminderSentAt: null,
      },
    });

    for (const dispute of disputes) {
      await dispute.update({ secondReminderSentAt: new Date() });
      await DisputeChat.create({
        disputeId: dispute.id,
        senderId: 0,
        senderType: 'admin',
        message: 'URGENT: You have 12 hours remaining to respond. This is your final reminder before auto-resolution.',
        messageType: 'SYSTEM',
        isSystem: true,
        systemEventType: 'REMINDER_2',
      });
      // TODO: Send SMS + Email + Push notification
    }
  }

  // Auto-resolve at T+48h
  static async autoResolveDisputes() {
    const now = new Date();
    const disputes = await Dispute.findAll({
      where: {
        autoResolveAt: { [require('sequelize').Op.lte]: now },
        status: ['OPEN', 'PENDING_RESPONSE'],
      },
    });

    for (const dispute of disputes) {
      await this.executeAutoResolution(dispute.id);
    }
  }

  private static async executeAutoResolution(disputeId: number) {
    const dispute = await Dispute.findByPk(disputeId);
    if (!dispute) return;

    // Determine verdict based on available evidence
    const doerEvidence = await DisputeEvidence.findAll({
      where: { disputeId, submittedBy: 'doer' },
    });
    const companyEvidence = await DisputeEvidence.findAll({
      where: { disputeId, submittedBy: 'company' },
    });

    let decision: 'APPROVE_DOER' | 'APPROVE_COMPANY' | 'PARTIAL_SPLIT';
    let confidence = 50;

    if (doerEvidence.length === 0 && companyEvidence.length === 0) {
      // No evidence from either party - split
      decision = 'PARTIAL_SPLIT';
      confidence = 35;
    } else if (doerEvidence.length > companyEvidence.length) {
      decision = 'APPROVE_DOER';
      confidence = 65;
    } else if (companyEvidence.length > doerEvidence.length) {
      decision = 'APPROVE_COMPANY';
      confidence = 65;
    } else {
      // Equal evidence - split
      decision = 'PARTIAL_SPLIT';
      confidence = 50;
    }

    // Execute verdict
    await dispute.update({
      status: 'CLOSED',
      verdictIssuedAt: new Date(),
      verdictIssuedBy: 0, // SYSTEM
      verdictDecision: decision,
      verdictConfidence: confidence,
      verdictReasoning: `Auto-resolved at T+48h. Evidence count - Doer: ${doerEvidence.length}, Company: ${companyEvidence.length}`,
      closedAt: new Date(),
    });

    // Calculate amounts
    const fullAmount = Number(dispute.amount);
    let doerAmount = 0;
    let companyAmount = 0;

    if (decision === 'APPROVE_DOER') {
      doerAmount = fullAmount;
    } else if (decision === 'APPROVE_COMPANY') {
      companyAmount = fullAmount;
    } else {
      doerAmount = fullAmount * 0.5;
      companyAmount = fullAmount * 0.5;
    }

    await dispute.update({
      verdictAmountDoer: doerAmount,
      verdictAmountCompany: companyAmount,
    });

    // Add system message
    await DisputeChat.create({
      disputeId,
      senderId: 0,
      senderType: 'admin',
      message: `Auto-resolved: ${decision}. Doer: $${doerAmount}, Company: $${companyAmount}. NO APPEAL ALLOWED.`,
      messageType: 'SYSTEM',
      isSystem: true,
      systemEventType: 'AUTO_RESOLVED',
    });

    // TODO: Process payment release/refund
  }

  // Admin: Issue manual verdict (before T+48h)
  static async issueVerdict(
    disputeId: number,
    decision: 'APPROVE_DOER' | 'APPROVE_COMPANY' | 'PARTIAL_SPLIT',
    doerAmount: number,
    companyAmount: number,
    reasoning: string,
    issuedBy: number
  ) {
    const dispute = await Dispute.findByPk(disputeId);
    if (!dispute) throw new Error('Dispute not found');

    await dispute.update({
      status: 'VERDICT_ISSUED',
      verdictIssuedAt: new Date(),
      verdictIssuedBy: issuedBy,
      verdictDecision: decision,
      verdictAmountDoer: doerAmount,
      verdictAmountCompany: companyAmount,
      verdictReasoning: reasoning,
    });

    // Add system message
    await DisputeChat.create({
      disputeId,
      senderId: issuedBy,
      senderType: 'admin',
      message: `Verdict issued: ${decision}. Doer: $${doerAmount}, Company: $${companyAmount}. You have 12 hours to appeal if desired.`,
      messageType: 'SYSTEM',
      isSystem: true,
      systemEventType: 'VERDICT_ISSUED',
    });

    return dispute;
  }

  // Submit appeal (within 12h of verdict: T+48h to T+60h)
  static async submitAppeal(disputeId: number, reason: string, userId: number, evidenceFiles?: any[]) {
    const dispute = await Dispute.findByPk(disputeId);
    if (!dispute) throw new Error('Dispute not found');

    if (dispute.status !== 'VERDICT_ISSUED') {
      throw new Error('Can only appeal after verdict issued');
    }

    const appealWindow = addHours(dispute.verdictIssuedAt!, 12); // 12h window
    if (new Date() > appealWindow) {
      throw new Error('Appeal window has closed (12 hours only)');
    }

    // Submit appeal message
    await DisputeChat.create({
      disputeId,
      senderId: userId,
      senderType: dispute.raisedBy === 'doer' ? 'doer' : 'company_staff',
      message: `Appeal submitted: ${reason}`,
      messageType: 'TEXT',
      isSystem: false,
    });

    // Process appeal evidence if provided
    if (evidenceFiles && evidenceFiles.length > 0) {
      for (const file of evidenceFiles) {
        await DisputeEvidence.create({
          disputeId,
          submittedBy: dispute.raisedBy,
          submittedByUserId: userId,
          type: file.type,
          originalSize: file.size,
          isCompressed: false,
          fileName: file.name,
          aiAnalysisStatus: 'PENDING',
        });
      }

      const appealCount = await DisputeEvidence.count({
        where: { disputeId },
      });

      await dispute.update({ appealEvidenceCount: appealCount });
    }

    await dispute.update({
      appealed: true,
      appealSubmittedAt: new Date(),
      appealReason: reason,
      status: 'APPEALED',
    });

    return dispute;
  }

  // Admin: Issue appeal decision (by T+60h)
  static async resolveAppeal(
    disputeId: number,
    decision: 'UPHELD' | 'OVERTURNED' | 'MODIFIED',
    reasoning: string,
    newDoerAmount?: number,
    newCompanyAmount?: number,
    resolvedBy?: number
  ) {
    const dispute = await Dispute.findByPk(disputeId);
    if (!dispute) throw new Error('Dispute not found');

    if (!dispute.appealed) {
      throw new Error('No appeal found');
    }

    const appealWindow = addHours(dispute.verdictIssuedAt!, 12);
    if (new Date() > appealWindow) {
      throw new Error('Appeal resolution window has closed');
    }

    let finalDoerAmount = dispute.verdictAmountDoer || 0;
    let finalCompanyAmount = dispute.verdictAmountCompany || 0;

    if (decision === 'OVERTURNED') {
      // Flip the verdict
      finalDoerAmount = (dispute.verdictAmountCompany || 0);
      finalCompanyAmount = (dispute.verdictAmountDoer || 0);
    } else if (decision === 'MODIFIED' && newDoerAmount !== undefined && newCompanyAmount !== undefined) {
      finalDoerAmount = newDoerAmount;
      finalCompanyAmount = newCompanyAmount;
    }

    await dispute.update({
      status: 'CLOSED',
      appealReviewedAt: new Date(),
      appealFinalDecision: decision,
      appealFinalReasoning: reasoning,
      verdictAmountDoer: finalDoerAmount,
      verdictAmountCompany: finalCompanyAmount,
      closedAt: new Date(),
    });

    // Add system message
    await DisputeChat.create({
      disputeId,
      senderId: resolvedBy || 0,
      senderType: 'admin',
      message: `Appeal ${decision}. Final decision: Doer: $${finalDoerAmount}, Company: $${finalCompanyAmount}. NO FURTHER APPEALS.`,
      messageType: 'SYSTEM',
      isSystem: true,
      systemEventType: 'APPEAL_RESOLVED',
    });

    // TODO: Process final payment release/refund

    return dispute;
  }

  // Get dispute details with all evidence and chat
  static async getDisputeDetails(disputeId: number) {
    const dispute = await Dispute.findByPk(disputeId);
    const evidence = await DisputeEvidence.findAll({ where: { disputeId } });
    const chat = await DisputeChat.findAll({
      where: { disputeId },
      order: [['createdAt', 'ASC']],
    });

    return { dispute, evidence, chat };
  }
}

export default DisputeService;
