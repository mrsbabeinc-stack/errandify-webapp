-- AI Audit Logging Tables for Guardrails Framework

-- Main audit log table
CREATE TABLE IF NOT EXISTS ai_audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  ai_model VARCHAR(50),
  reason_code VARCHAR(255),
  result_summary JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '90 days'
);

-- Bias detection log table
CREATE TABLE IF NOT EXISTS bias_detection_log (
  id BIGSERIAL PRIMARY KEY,
  audit_log_id BIGINT REFERENCES ai_audit_log(id) ON DELETE CASCADE,
  bias_type VARCHAR(100),
  confidence FLOAT,
  details JSONB,
  reviewed_by VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_ai_audit_log_user ON ai_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_log_action ON ai_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_ai_audit_log_created ON ai_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_audit_log_expires ON ai_audit_log(expires_at);

CREATE INDEX IF NOT EXISTS idx_bias_detection_log_audit ON bias_detection_log(audit_log_id);
CREATE INDEX IF NOT EXISTS idx_bias_detection_log_created ON bias_detection_log(created_at);

-- Cleanup function to remove expired logs (called daily by cron)
CREATE OR REPLACE FUNCTION cleanup_expired_audit_logs()
RETURNS TABLE(deleted_count BIGINT) AS $$
DECLARE
  v_deleted_count BIGINT;
BEGIN
  DELETE FROM ai_audit_log WHERE expires_at < NOW();
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN QUERY SELECT v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create view for bias detection summary
CREATE OR REPLACE VIEW bias_audit_summary AS
SELECT
  u.id as user_id,
  u.display_name,
  COUNT(DISTINCT aal.id) as total_audit_logs,
  COUNT(DISTINCT CASE WHEN bdl.id IS NOT NULL THEN aal.id END) as flagged_logs,
  AVG(bdl.confidence) as avg_bias_confidence,
  MAX(bdl.created_at) as last_bias_flag
FROM users u
LEFT JOIN ai_audit_log aal ON u.id = aal.user_id
LEFT JOIN bias_detection_log bdl ON aal.id = bdl.audit_log_id
GROUP BY u.id, u.display_name;

-- Create view for action frequency summary (for PDPA compliance reports)
CREATE OR REPLACE VIEW ai_action_summary AS
SELECT
  action,
  DATE(created_at) as date,
  COUNT(*) as count,
  AVG(CAST(result_summary->>'confidence' AS FLOAT)) as avg_confidence
FROM ai_audit_log
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY action, DATE(created_at)
ORDER BY date DESC, action;
