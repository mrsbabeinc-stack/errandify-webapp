// Dispute Chat Model - Monitored communication between parties
import { DataTypes, Model } from 'sequelize';
import sequelize from '../db';
class DisputeChat extends Model {
}
DisputeChat.init({
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
    senderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    senderType: {
        type: DataTypes.ENUM('doer', 'company_staff', 'admin'),
        allowNull: false,
    },
    senderCompanyId: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    messageType: {
        type: DataTypes.ENUM('TEXT', 'EVIDENCE_LINK', 'SYSTEM'),
        defaultValue: 'TEXT',
    },
    adminViewedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    adminReviewedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    adminReviewNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    isSystem: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    systemEventType: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'REMINDER_1, REMINDER_2, AUTO_RESOLVED, VERDICT_ISSUED',
    },
    isEdited: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    editedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    editReason: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
}, {
    sequelize,
    tableName: 'dispute_chat',
    timestamps: true,
    underscored: true,
});
export default DisputeChat;
