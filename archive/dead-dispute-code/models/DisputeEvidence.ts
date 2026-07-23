// Dispute Evidence Model - Handles photo, text, video evidence
import { DataTypes, Model } from 'sequelize';
import sequelize from '../db';

interface DisputeEvidenceAttributes {
  id: number;
  disputeId: number;
  submittedBy: 'doer' | 'company'; // Who submitted this evidence
  submittedByUserId: number;
  submittedByCompanyId?: number;

  // Evidence metadata
  type: 'photo' | 'video' | 'text'; // Type of evidence
  originalSize: number; // bytes
  compressedSize?: number; // bytes after compression
  isCompressed: boolean;
  mimeType?: string;

  // Photo/Video storage
  originalUrl?: string;
  compressedUrl?: string; // Auto-generated from S3
  fileName?: string;
  duration?: number; // seconds (video only)
  resolution?: string; // e.g., "1920x1080"

  // Text evidence
  textContent?: string;

  // AI Analysis
  aiAnalysisStatus: 'PENDING' | 'COMPLETED' | 'FAILED';
  aiAnalysisResult?: string; // JSON: { confidence, key_points, verdict_hint }
  aiConfidence?: number; // 0-100
  aiKeyPoints?: string; // JSON array of strings
  aiVerdictHint?: string; // 'SUPPORTS_DOER' | 'SUPPORTS_COMPANY' | 'NEUTRAL'

  // Metadata
  uploadedAt: Date;
  createdAt: Date;
}

class DisputeEvidence extends Model<DisputeEvidenceAttributes> implements DisputeEvidenceAttributes {
  public id!: number;
  public disputeId!: number;
  public submittedBy!: 'doer' | 'company';
  public submittedByUserId!: number;
  public submittedByCompanyId?: number;
  public type!: 'photo' | 'video' | 'text';
  public originalSize!: number;
  public compressedSize?: number;
  public isCompressed!: boolean;
  public mimeType?: string;
  public originalUrl?: string;
  public compressedUrl?: string;
  public fileName?: string;
  public duration?: number;
  public resolution?: string;
  public textContent?: string;
  public aiAnalysisStatus!: 'PENDING' | 'COMPLETED' | 'FAILED';
  public aiAnalysisResult?: string;
  public aiConfidence?: number;
  public aiKeyPoints?: string;
  public aiVerdictHint?: string;
  public uploadedAt!: Date;
  public createdAt!: Date;
}

DisputeEvidence.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    disputeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      index: true,
      references: {
        model: 'disputes',
        key: 'id',
      },
    },
    submittedBy: {
      type: DataTypes.ENUM('doer', 'company'),
      allowNull: false,
    },
    submittedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    submittedByCompanyId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM('photo', 'video', 'text'),
      allowNull: false,
    },
    originalSize: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    compressedSize: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    isCompressed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    originalUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    compressedUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Duration in seconds (video only)',
    },
    resolution: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    textContent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    aiAnalysisStatus: {
      type: DataTypes.ENUM('PENDING', 'COMPLETED', 'FAILED'),
      defaultValue: 'PENDING',
    },
    aiAnalysisResult: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON: { confidence, key_points, verdict_hint }',
    },
    aiConfidence: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 0, max: 100 },
    },
    aiKeyPoints: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON array of strings',
    },
    aiVerdictHint: {
      type: DataTypes.ENUM('SUPPORTS_DOER', 'SUPPORTS_COMPANY', 'NEUTRAL'),
      allowNull: true,
    },
    uploadedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'dispute_evidence',
    timestamps: false,
  }
);

export default DisputeEvidence;
