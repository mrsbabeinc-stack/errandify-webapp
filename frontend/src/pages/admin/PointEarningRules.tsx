import React, { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

export const EPRulesPage: React.FC = () => {
  const [selectedRule, setSelectedRule] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedRule, setEditedRule] = useState<any>(null);
  const [rules, setRules] = useState([
    {
      id: 1,
      name: 'High Rating Bonus',
      actionType: 'High Rating',
      description: 'Points Awarded for User Earns 4-5 Star Each Errand Closure',
      triggerEvent: 'User receives a 4-star or 5-star rating after an errand closure.',
      conditions: [
        'Rating must be for a completed errand.',
        'Reward points are granted to the rated user (Asker or Doer), based on the configured star level.'
      ],
      pointsAwarded: {
        asker4Star: '— Points',
        asker5Star: '— Points',
        doer4Star: '— Points',
        doer5Star: '— Points'
      },
      ruleActive: true,
      category: 'Rating'
    },
    {
      id: 2,
      name: 'Referral - First Errand',
      actionType: 'Referral - First Errand',
      description: 'Points Awarded of successful Individual signup',
      triggerEvent: 'A referred user completes their first errand on the platform.',
      conditions: [
        'The user is successfully registered through a valid referral.',
        'The referred user completes their first errand under either the Asker or Doer role.',
        'The errand status is marked as Completed.',
        'The reward is granted only once per referred user to the referrer.'
      ],
      pointsAwarded: {
        individual: '— Points',
        company: '— Points'
      },
      ruleActive: true,
      category: 'Referral'
    },
    {
      id: 3,
      name: 'Errand Completion',
      actionType: 'Errand Completion',
      description: 'Reward Point Rate for Errand Completion',
      triggerEvent: 'Asker confirms the errand result.',
      conditions: [
        'Both Doer & Asker have confirmed that the errand is closed.',
        'The errand status is updated to Closed.',
        'Reward points are calculated based on the errand amount and the applicable point rate for each role.',
        'Points are automatically granted when the errand reaches Closed status.'
      ],
      pointCalculation: 'Points = Errand Amount x Point Rate',
      pointsAwarded: {
        asker: '5.00',
        doer: '5.00'
      },
      ruleActive: true,
      category: 'Completion',
      auditTrail: 'Rule Updated - 15-06-2026 02:52 PM by Errandify Admin'
    },
    {
      id: 4,
      name: 'Referral - Sign up',
      actionType: 'Referral - Sign up',
      description: 'Points Awarded of successful Individual signup and Company signup',
      triggerEvent: [
        'Individual Signup: A referred user completes verification step.',
        'Company Signup: A referred user\'s company application is approved by Admin.'
      ],
      conditions: {
        individual: [
          'The user registers using a valid Individual referral link or QR code.',
          'The referral link type matches the registration type (Individual).',
          'The user\'s KYC status is marked as Verified.',
          'The referral reward has not been granted previously for this user.',
          'The reward is granted to both Referrer and Referee.'
        ],
        company: [
          'The company registers using a valid Company referral link or QR code.',
          'The referral link type matches the registration type (Company).',
          'The company account status is marked as Approved.',
          'The referral reward has not been granted previously for this company.',
          'The reward is granted to both Referrer and Referee.'
        ]
      },
      pointsAwarded: {
        individual: '— Points',
        company: '— Points'
      },
      ruleActive: true,
      category: 'Referral'
    }
  ]);

  const handleEditRule = (rule: any) => {
    setEditedRule(JSON.parse(JSON.stringify(rule)));
    setEditMode(true);
  };

  const handleUpdatePoints = (field: string, value: string) => {
    if (!editedRule) return;

    setEditedRule({
      ...editedRule,
      pointsAwarded: {
        ...editedRule.pointsAwarded,
        [field]: value
      }
    });
  };

  const handleSaveRule = () => {
    if (!editedRule) return;

    setRules(rules.map(r => r.id === editedRule.id ? editedRule : r));
    setSelectedRule(editedRule);
    setEditMode(false);
    alert('✅ Rule updated successfully!');
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditedRule(null);
  };

  const renderRuleDetails = (rule: any) => {
    return (
      <div className="rule-detail-modal">
        <div className="modal-content">
          <div className="modal-header">
            <h2>{rule.name}</h2>
            <button className="btn-close" onClick={() => setSelectedRule(null)}>✕</button>
          </div>

          <div className="rule-detail-content">
            <div className="detail-section">
              <h3>Rule Details</h3>
              <div className="detail-row">
                <span className="label">Action Type:</span>
                <span className="value">{rule.actionType}</span>
              </div>
              <div className="detail-row">
                <span className="label">Category:</span>
                <span className="badge">{rule.category}</span>
              </div>
            </div>

            <div className="detail-section">
              <div className="section-header">
                <h3>Points Awarded</h3>
                {!editMode && (
                  <button className="btn-edit-header" onClick={() => handleEditRule(rule)}>
                    ✏️ Edit Points
                  </button>
                )}
              </div>
              {(editMode ? editedRule : rule).pointsAwarded && (
                <div className="points-grid">
                  {Object.entries((editMode ? editedRule : rule).pointsAwarded).map(([key, value]: [string, any]) => (
                    <div key={key} className={`point-row ${editMode ? 'editable' : ''}`}>
                      <span className="point-label">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                      {editMode ? (
                        <input
                          type="number"
                          step="0.01"
                          className="point-input"
                          value={value}
                          onChange={(e) => handleUpdatePoints(key, e.target.value)}
                          placeholder="Enter points"
                        />
                      ) : (
                        <span className="point-value">{value}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="detail-section">
              <h3>Rule Summary</h3>

              <div className="summary-subsection">
                <h4>Trigger Event</h4>
                {Array.isArray(rule.triggerEvent) ? (
                  <ul>
                    {rule.triggerEvent.map((event: string, idx: number) => (
                      <li key={idx}>{event}</li>
                    ))}
                  </ul>
                ) : (
                  <p>{rule.triggerEvent}</p>
                )}
              </div>

              <div className="summary-subsection">
                <h4>Success Conditions</h4>
                {typeof rule.conditions === 'object' && !Array.isArray(rule.conditions) ? (
                  Object.entries(rule.conditions).map(([section, items]: [string, any]) => (
                    <div key={section}>
                      <h5>{section.charAt(0).toUpperCase() + section.slice(1)}</h5>
                      <ul>
                        {items.map((item: string, idx: number) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))
                ) : (
                  <ul>
                    {(rule.conditions as string[]).map((condition: string, idx: number) => (
                      <li key={idx}>{condition}</li>
                    ))}
                  </ul>
                )}
              </div>

              {rule.pointCalculation && (
                <div className="summary-subsection">
                  <h4>Point Calculation</h4>
                  <ul>
                    <li>{rule.pointCalculation}</li>
                    <li>Calculated points are rounded to 2 decimal places.</li>
                  </ul>
                </div>
              )}
            </div>

            <div className="detail-section">
              <div className="section-header">
                <h3>Rule Status</h3>
              </div>
              <div className="status-row">
                <div className="status-label">Rule Active</div>
                {editMode ? (
                  <div className="toggle-switch">
                    <input
                      type="checkbox"
                      id="rule-active"
                      checked={editedRule?.ruleActive}
                      onChange={(e) => setEditedRule({ ...editedRule, ruleActive: e.target.checked })}
                      className="toggle-input"
                    />
                    <label htmlFor="rule-active" className="toggle-label">
                      <span className={`toggle-indicator ${editedRule?.ruleActive ? 'active' : ''}`}></span>
                    </label>
                    <span className="toggle-text">{editedRule?.ruleActive ? 'Active' : 'Inactive'}</span>
                  </div>
                ) : (
                  <span className={`status-badge ${rule.ruleActive ? 'active' : 'inactive'}`}>
                    {rule.ruleActive ? '✓ Active' : '○ Inactive'}
                  </span>
                )}
              </div>
            </div>

            {(editMode ? editedRule : rule).auditTrail && (
              <div className="detail-section">
                <h3>Audit Trail</h3>
                <div className="audit-info">
                  <div className="audit-item">{(editMode ? editedRule : rule).auditTrail}</div>
                  {editMode && (
                    <div className="audit-item new">
                      📝 Pending changes... Will be saved to audit trail
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="modal-actions">
              {editMode ? (
                <>
                  <button className="btn-save" onClick={handleSaveRule}>💾 Save Changes</button>
                  <button className="btn-cancel" onClick={handleCancelEdit}>Cancel</button>
                </>
              ) : (
                <>
                  <button className="btn-edit" onClick={() => handleEditRule(rule)}>✏️ Edit Rule</button>
                  <button className="btn-close-modal" onClick={() => setSelectedRule(null)}>Close</button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="admin-page">
        {/* Header */}
        <div className="page-header">
          <h1>📊 EP Rules</h1>
          <p>Configure and manage all EP earning rules for the platform</p>
        </div>

        {/* Happy Message Box */}
        <div className="happy-message-box">
          <span className="emoji">✨</span>
          <div>
            <strong>Master Point Economics!</strong>
            <p>Create and configure rules to reward user behaviors. Set point rates, conditions, and triggers to drive engagement.</p>
          </div>
        </div>

        {/* Rules Grid */}
        <div className="rules-grid">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="rule-card"
              onClick={() => setSelectedRule(rule)}
            >
              <div className="rule-card-header">
                <h3>{rule.name}</h3>
                <span className={`status-badge ${rule.ruleActive ? 'active' : 'inactive'}`}>
                  {rule.ruleActive ? '✓ Active' : '○ Inactive'}
                </span>
              </div>

              <div className="rule-card-body">
                <p className="rule-description">{rule.description}</p>
                <div className="rule-meta">
                  <span className="category-badge">{rule.category}</span>
                  <span className="action-type">{rule.actionType}</span>
                </div>
              </div>

              <div className="rule-card-footer">
                <button className="btn-view">View Details →</button>
              </div>
            </div>
          ))}
        </div>

        {/* Modal */}
        {selectedRule && renderRuleDetails(selectedRule)}
      </div>

      <style>{`
        .admin-page {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .page-header {
          margin-bottom: 8px;
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
          margin: 4px 0 0 0;
        }

        .happy-message-box {
          background: linear-gradient(135deg, #fff9f5 0%, #fffbf7 100%);
          border-left: 4px solid #ff6b35;
          border-radius: 8px;
          padding: 12px 14px;
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .happy-message-box .emoji {
          font-size: 24px;
          min-width: 24px;
        }

        .happy-message-box strong {
          color: #ff6b35;
          font-size: 13px;
          display: block;
          margin-bottom: 2px;
        }

        .happy-message-box p {
          margin: 0;
          font-size: 12px;
          color: #666;
          line-height: 1.5;
        }

        /* Rules Grid */
        .rules-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }

        .rule-card {
          background: white;
          border: 1px solid #ffb88c;
          border-radius: 8px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .rule-card:hover {
          border-color: #ff6b35;
          box-shadow: 0 4px 16px rgba(255, 107, 53, 0.2);
          transform: translateY(-2px);
        }

        .rule-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .rule-card-header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 700;
          color: #333;
          flex: 1;
        }

        .status-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 4px;
          white-space: nowrap;
        }

        .status-badge.active {
          background: #e6f9f0;
          color: #27b55d;
        }

        .status-badge.inactive {
          background: #f0f0f0;
          color: #888;
        }

        .rule-card-body {
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex: 1;
        }

        .rule-description {
          font-size: 12px;
          color: #666;
          margin: 0;
          line-height: 1.5;
        }

        .rule-meta {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .category-badge {
          display: inline-block;
          background: #fff5f0;
          color: #ff6b35;
          padding: 3px 8px;
          border-radius: 3px;
          font-size: 11px;
          font-weight: 600;
          border: 1px solid #ffb88c;
        }

        .action-type {
          display: inline-block;
          background: #f0f0f0;
          color: #666;
          padding: 3px 8px;
          border-radius: 3px;
          font-size: 11px;
          font-weight: 600;
        }

        .rule-card-footer {
          display: flex;
          gap: 8px;
        }

        .btn-view {
          flex: 1;
          padding: 8px 12px;
          background: #ff6b35;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .btn-view:hover {
          background: #ff5722;
          box-shadow: 0 2px 6px rgba(255, 107, 53, 0.3);
        }

        /* Modal */
        .rule-detail-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          max-width: 900px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          border-bottom: 2px solid #ffe6d9;
          background: linear-gradient(to right, #fff5f0, #fffbf7);
        }

        .modal-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          color: #333;
        }

        .modal-header .btn-close {
          padding: 6px 10px;
          background: #f0f0f0;
          border: 1px solid #ddd;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          color: #666;
          transition: all 0.2s;
        }

        .modal-header .btn-close:hover {
          background: #ff6b35;
          color: white;
          border-color: #ff6b35;
        }

        .rule-detail-content {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .detail-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .detail-section h3 {
          font-size: 14px;
          font-weight: 700;
          color: #333;
          text-transform: uppercase;
          margin: 0;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 12px;
          background: #f9f9f9;
          border-radius: 4px;
          font-size: 13px;
        }

        .detail-row .label {
          font-weight: 600;
          color: #666;
        }

        .detail-row .value {
          color: #333;
          font-weight: 500;
        }

        .detail-row .badge {
          display: inline-block;
          background: #fff5f0;
          color: #ff6b35;
          padding: 3px 8px;
          border-radius: 3px;
          font-weight: 600;
          font-size: 11px;
        }

        .points-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 10px;
        }

        .point-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 12px;
          background: #fff9f5;
          border: 1px solid #ffb88c;
          border-radius: 4px;
          font-size: 13px;
        }

        .point-label {
          font-weight: 600;
          color: #666;
        }

        .point-value {
          font-weight: 700;
          color: #ff6b35;
        }

        .summary-subsection {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .summary-subsection h4 {
          font-size: 12px;
          font-weight: 700;
          color: #333;
          margin: 0;
          text-transform: uppercase;
        }

        .summary-subsection h5 {
          font-size: 12px;
          font-weight: 700;
          color: #666;
          margin: 12px 0 6px 0;
        }

        .summary-subsection ul {
          margin: 0;
          padding-left: 20px;
          list-style: none;
        }

        .summary-subsection li {
          font-size: 12px;
          color: #666;
          line-height: 1.6;
          margin-bottom: 4px;
          padding-left: 6px;
        }

        .summary-subsection li:before {
          content: "•";
          color: #ff6b35;
          font-weight: bold;
          margin-left: -12px;
          margin-right: 8px;
        }

        .summary-subsection p {
          margin: 0;
          font-size: 12px;
          color: #666;
          line-height: 1.6;
        }

        .audit-info {
          padding: 10px 12px;
          background: #f0f0f0;
          border-left: 3px solid #ff6b35;
          border-radius: 4px;
          font-size: 12px;
          color: #666;
        }

        .modal-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          padding-top: 16px;
          border-top: 1px solid #ffe6d9;
        }

        .btn-edit {
          padding: 10px 16px;
          background: #ff6b35;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          transition: all 0.2s;
        }

        .btn-edit:hover {
          background: #ff5722;
          box-shadow: 0 2px 8px rgba(255, 107, 53, 0.3);
        }

        .btn-close-modal {
          padding: 10px 16px;
          background: #f0f0f0;
          color: #333;
          border: 1px solid #ddd;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          transition: all 0.2s;
        }

        .btn-close-modal:hover {
          background: #e0e0e0;
        }

        .btn-save {
          padding: 10px 16px;
          background: #27b55d;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          transition: all 0.2s;
        }

        .btn-save:hover {
          background: #229a4a;
          box-shadow: 0 2px 8px rgba(39, 181, 93, 0.3);
        }

        .btn-cancel {
          padding: 10px 16px;
          background: #f0f0f0;
          color: #333;
          border: 1px solid #ddd;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          transition: all 0.2s;
        }

        .btn-cancel:hover {
          background: #e0e0e0;
        }

        .btn-edit-header {
          padding: 6px 12px;
          background: #ff6b35;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .btn-edit-header:hover {
          background: #ff5722;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .section-header h3 {
          margin: 0;
        }

        .point-row.editable {
          background: #fffbf8;
          border: 1px solid #ffb88c;
        }

        .point-input {
          width: 100%;
          padding: 8px;
          border: 1px solid #ff6b35;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 700;
          color: #ff6b35;
          text-align: right;
        }

        .point-input:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
        }

        .point-input::placeholder {
          color: #ccc;
        }

        /* Toggle Switch */
        .status-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #f9f9f9;
          border-radius: 4px;
        }

        .status-label {
          font-weight: 600;
          color: #333;
          font-size: 13px;
        }

        .toggle-switch {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .toggle-input {
          display: none;
        }

        .toggle-label {
          display: flex;
          align-items: center;
          cursor: pointer;
          width: 44px;
          height: 24px;
          background: #ddd;
          border-radius: 12px;
          padding: 2px;
          transition: background 0.3s;
        }

        .toggle-input:checked + .toggle-label {
          background: #27b55d;
        }

        .toggle-indicator {
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          transition: transform 0.3s;
        }

        .toggle-input:checked + .toggle-label .toggle-indicator {
          transform: translateX(20px);
        }

        .toggle-text {
          font-size: 12px;
          font-weight: 600;
          color: #333;
          min-width: 60px;
        }

        .audit-info {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .audit-item {
          padding: 10px 12px;
          background: #f0f0f0;
          border-left: 3px solid #ff6b35;
          border-radius: 4px;
          font-size: 12px;
          color: #666;
          line-height: 1.5;
        }

        .audit-item.new {
          background: #fffbf8;
          border-left-color: #27b55d;
          color: #27b55d;
        }

        @media (max-width: 768px) {
          .rules-grid {
            grid-template-columns: 1fr;
          }

          .rule-detail-modal {
            padding: 10px;
          }

          .modal-content {
            max-height: 95vh;
          }

          .points-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </AdminLayout>
  );
};

export default EPRulesPage;
