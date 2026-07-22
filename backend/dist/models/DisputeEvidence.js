// Dispute Evidence Model - Handles photo, text, video evidence
import { DataTypes, Model } from 'sequelize';
import sequelize from '../db';
class DisputeEvidence extends Model {
}
DisputeEvidence.init({
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
}, {
    sequelize,
    tableName: 'dispute_evidence',
    timestamps: false,
});
export default DisputeEvidence;
