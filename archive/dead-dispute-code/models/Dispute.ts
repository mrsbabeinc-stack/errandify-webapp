// Dispute Model - 3-Day Resolution System
import { DataTypes, Model } from 'sequelize';
import sequelize from '../db';

interface DisputeAttributes {
  id: number;
  errandId: string;
  raisedBy: 'doer' | 'company'; // Who initiated the dispute
  raisedByUserId: number;
  raisedByCompanyId?: number;
  defendantUserId?: number;
  defendantCompanyId?: number;
  reason: string;
  amount: number;

  // Status tracking
  status: 'OPEN' | 'PENDING_RESPONSE' | 'EVIDENCE_RECEIVED' | 'UNDER_REVIEW' | 'VERDICT_ISSUED' | 'APPEALED' | 'CLOSED';

  // Timeline (3-DAY MAX)
  createdAt: Date;
  responseDeadline: Date; // T+24h
  firstReminderSentAt?: Date; // T+24h
  secondReminderSentAt?: Date; // T+36h
  autoResolveAt: Date; // T+48h HARD DEADLINE

  // Extension (1 only, 12h max)
  extensionRequested: boolean;
  extensionRequestReason?: string;
  extensionApprovedAt?: Date;
  extensionApprovedBy?: number; // admin_id
  newDeadline?: Date; // T+36h if approved
  extensionDeniedAt?: Date;

  // Evidence tracking
  doerEvidenceSubmittedAt?: Date;
  companyEvidenceSubmittedAt?: Date;
  doerEvidenceCount: number;
  companyEvidenceCount: number;

  // Verdict (issued by T+48h)
  verdictIssuedAt?: Date;
  verdictIssuedBy?: number; // admin_id or 'SYSTEM' for auto-resolve
  verdictDecision?: 'APPROVE_DOER' | 'APPROVE_COMPANY' | 'PARTIAL_SPLIT';
  verdictConfidence?: number; // 0-100 (for AI analysis)
  verdictReasoning?: string;
  verdictAmountDoer?: number;
  verdictAmountCompany?: number;

  // Appeal (12-hour window only: T+48h to T+60h)
  appealed: boolean;
  appealSubmittedAt?: Date;
  appealReason?: string;
  appealEvidenceCount: number;
  appealReviewedAt?: Date;
  appealFinalDecision?: 'UPHELD' | 'OVERTURNED' | 'MODIFIED';
  appealFinalReasoning?: string;

  // Payment status
  paymentStatus: 'HELD' | 'RELEASED' | 'REFUNDED';
  doerPaymentReleasedAt?: Date;
  companyRefundedAt?: Date;

  // Archive
  closedAt?: Date;
  archivedAt?: Date;
}

class Dispute extends Model<DisputeAttributes> implements DisputeAttributes {
  public id!: number;
  public errandId!: string;
  public raisedBy!: 'doer' | 'company';
  public raisedByUserId!: number;
  public raisedByCompanyId?: number;
  public defendantUserId?: number;
  public defendantCompanyId?: number;
  public reason!: string;
  public amount!: number;
  public status!: 'OPEN' | 'PENDING_RESPONSE' | 'EVIDENCE_RECEIVED' | 'UNDER_REVIEW' | 'VERDICT_ISSUED' | 'APPEALED' | 'CLOSED';
  public createdAt!: Date;
  public responseDeadline!: Date;
  public firstReminderSentAt?: Date;
  public secondReminderSentAt?: Date;
  public autoResolveAt!: Date;
  public extensionRequested!: boolean;
  public extensionRequestReason?: string;
  public extensionApprovedAt?: Date;
  public extensionApprovedBy?: number;
  public newDeadline?: Date;
  public extensionDeniedAt?: Date;
  public doerEvidenceSubmittedAt?: Date;
  public companyEvidenceSubmittedAt?: Date;
  public doerEvidenceCount!: number;
  public companyEvidenceCount!: number;
  public verdictIssuedAt?: Date;
  public verdictIssuedBy?: number;
  public verdictDecision?: 'APPROVE_DOER' | 'APPROVE_COMPANY' | 'PARTIAL_SPLIT';
  public verdictConfidence?: number;
  public verdictReasoning?: string;
  public verdictAmountDoer?: number;
  public verdictAmountCompany?: number;
  public appealed!: boolean;
  public appealSubmittedAt?: Date;
  public appealReason?: string;
  public appealEvidenceCount!: number;
  public appealReviewedAt?: Date;
  public appealFinalDecision?: 'UPHELD' | 'OVERTURNED' | 'MODIFIED';
  public appealFinalReasoning?: string;
  public paymentStatus!: 'HELD' | 'RELEASED' | 'REFUNDED';
  public doerPaymentReleasedAt?: Date;
  public companyRefundedAt?: Date;
  public closedAt?: Date;
  public archivedAt?: Date;
}

Dispute.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    errandId: {
      type: DataTypes.STRING,
      allowNull: false,
      index: true,
    },
    raisedBy: {
      type: DataTypes.ENUM('doer', 'company'),
      allowNull: false,
    },
    raisedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      index: true,
    },
    raisedByCompanyId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      index: true,
    },
    defendantUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      index: true,
    },
    defendantCompanyId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      index: true,
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(
        'OPEN',
        'PENDING_RESPONSE',
        'EVIDENCE_RECEIVED',
        'UNDER_REVIEW',
        'VERDICT_ISSUED',
        'APPEALED',
        'CLOSED'
      ),
      allowNull: false,
      defaultValue: 'OPEN',
    },
    responseDeadline: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'T+24h from dispute creation',
    },
    firstReminderSentAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    secondReminderSentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'T+36h - SMS + Email + Push',
    },
    autoResolveAt: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'T+48h - HARD DEADLINE for auto-resolution',
    },
    extensionRequested: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    extensionRequestReason: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    extensionApprovedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    extensionApprovedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'admin_id',
    },
    newDeadline: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'T+36h if extension approved',
    },
    extensionDeniedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    doerEvidenceSubmittedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    companyEvidenceSubmittedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    doerEvidenceCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    companyEvidenceCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    verdictIssuedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'T+48h deadline',
    },
    verdictIssuedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'admin_id or "SYSTEM" for auto-resolve',
    },
    verdictDecision: {
      type: DataTypes.ENUM('APPROVE_DOER', 'APPROVE_COMPANY', 'PARTIAL_SPLIT'),
      allowNull: true,
    },
    verdictConfidence: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 0, max: 100 },
    },
    verdictReasoning: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    verdictAmountDoer: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    verdictAmountCompany: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    appealed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    appealSubmittedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Within 12h of verdict (T+48h to T+60h)',
    },
    appealReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    appealEvidenceCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    appealReviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'By T+60h',
    },
    appealFinalDecision: {
      type: DataTypes.ENUM('UPHELD', 'OVERTURNED', 'MODIFIED'),
      allowNull: true,
    },
    appealFinalReasoning: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    paymentStatus: {
      type: DataTypes.ENUM('HELD', 'RELEASED', 'REFUNDED'),
      defaultValue: 'HELD',
    },
    doerPaymentReleasedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    companyRefundedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    closedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'T+72h MAXIMUM',
    },
    archivedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'disputes',
    timestamps: true,
    underscored: true,
  }
);

export default Dispute;
