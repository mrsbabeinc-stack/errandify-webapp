import db from '../db.js';

/**
 * Migration 014 — appeal window gating and settlement fees.
 *
 * The worry this solves: an admin resolves, money is released, and THEN someone
 * appeals. Recording the appeal window on the dispute means settlement can be
 * blocked until it closes, so that sequence becomes impossible.
 *
 * Appeal eligibility follows participation: you may appeal only if you engaged.
 * The claimant filed, so they always qualify. The defendant qualifies only if
 * they responded — a forfeited defendant cannot appeal, which is what makes the
 * no-response case settle straight away.
 */
export async function up() {
  await db.query(`
    ALTER TABLE disputes
      ADD COLUMN IF NOT EXISTS appeal_window_closes_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS claimant_can_appeal BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS defendant_can_appeal BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS appeal_round INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS settlement_fee DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS settlement_fee_rate DECIMAL(5,4),
      ADD COLUMN IF NOT EXISTS settlement_fee_waived BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS settlement_fee_waived_reason TEXT,
      ADD COLUMN IF NOT EXISTS decided_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
  `);

  // Settlement is two independent money movements — a transfer to the doer and
  // a refund to the asker — and they cannot be atomic. One leg can succeed while
  // the other fails, so each is tracked separately and retried on its own.
  await db.query(`
    CREATE TABLE IF NOT EXISTS dispute_settlement_legs (
      id SERIAL PRIMARY KEY,
      dispute_id INTEGER NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
      leg VARCHAR(20) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      stripe_reference VARCHAR(120),
      idempotency_key VARCHAR(120) NOT NULL,
      error_code VARCHAR(80),
      error_message TEXT,
      attempts INTEGER DEFAULT 0,
      last_attempt_at TIMESTAMP,
      succeeded_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT dispute_settlement_legs_leg_check
        CHECK (leg IN ('doer_transfer', 'asker_refund')),
      CONSTRAINT dispute_settlement_legs_status_check
        CHECK (status IN ('pending', 'in_flight', 'succeeded', 'failed', 'skipped'))
    )
  `);

  // One leg of each kind per dispute — the anchor that stops a double-click
  // creating two transfers.
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_settlement_legs_dispute_leg
      ON dispute_settlement_legs (dispute_id, leg)
  `);
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_settlement_legs_idempotency
      ON dispute_settlement_legs (idempotency_key)
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_settlement_legs_status
      ON dispute_settlement_legs (status)
  `);

  console.log('[014] ✅ appeal window, fee and settlement leg tables added');
}

export async function down() {
  await db.query('DROP TABLE IF EXISTS dispute_settlement_legs CASCADE');
  await db.query(`
    ALTER TABLE disputes
      DROP COLUMN IF EXISTS appeal_window_closes_at,
      DROP COLUMN IF EXISTS claimant_can_appeal,
      DROP COLUMN IF EXISTS defendant_can_appeal,
      DROP COLUMN IF EXISTS appeal_round,
      DROP COLUMN IF EXISTS settlement_fee,
      DROP COLUMN IF EXISTS settlement_fee_rate,
      DROP COLUMN IF EXISTS settlement_fee_waived,
      DROP COLUMN IF EXISTS settlement_fee_waived_reason,
      DROP COLUMN IF EXISTS decided_by_user_id
  `);
}

if (process.argv[1] && process.argv[1].includes('014_appeal_window')) {
  up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
