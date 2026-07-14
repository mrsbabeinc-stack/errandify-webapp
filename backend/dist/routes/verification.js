import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth';
const router = Router();
// POST /api/verification/check-criminal-records
// Called after user completes phone + email verification
router.post('/check-criminal-records', authMiddleware, async (req, res) => {
    try {
        const userId = parseInt(req.userId || '0', 10);
        const { nric, name, dateOfBirth } = req.body;
        if (!nric || !name) {
            return res.status(400).json({ error: 'NRIC and name are required' });
        }
        // Get or create verification record
        let verificationResult = await db.query('SELECT * FROM user_verifications WHERE user_id = $1', [userId]);
        let verification = verificationResult.rows[0];
        if (!verification) {
            const createResult = await db.query(`INSERT INTO user_verifications (user_id, details)
         VALUES ($1, $2)
         RETURNING *`, [userId, JSON.stringify({ nric, name, dateOfBirth })]);
            verification = createResult.rows[0];
        }
        // Simulate criminal records check
        // In production, this would call actual SPF API or background check service
        const checkResult = simulateCriminalRecordsCheck(nric, name);
        // Determine user status and restrictions
        const { status, restrictions } = determineUserStatus(checkResult);
        // Update verification record
        const updateResult = await db.query(`UPDATE user_verifications
       SET criminal_records_checked = true,
           criminal_records_checked_at = NOW(),
           status = $1,
           restrictions = $2,
           details = $3,
           updated_at = NOW()
       WHERE user_id = $4
       RETURNING *`, [status, restrictions, JSON.stringify(checkResult), userId]);
        // Update user account status based on verification result
        let accountActive = true;
        let verificationStatus = 'verified';
        if (status === 'rejected') {
            accountActive = false;
            verificationStatus = 'rejected';
        }
        else if (status === 'restricted') {
            accountActive = true;
            verificationStatus = 'verified_restricted';
        }
        await db.query(`UPDATE users
       SET verification_status = $1,
           account_active = $2,
           job_restrictions = $3,
           updated_at = NOW()
       WHERE id = $4`, [verificationStatus, accountActive, restrictions, userId]);
        const message = getStatusMessage(status, restrictions);
        res.json({
            success: true,
            status,
            message,
            restrictions: status !== 'approved' ? restrictions : [],
            verification: updateResult.rows[0],
        });
    }
    catch (error) {
        console.error('Criminal records check error:', error);
        res.status(500).json({
            error: 'Failed to check criminal records',
            details: error.message,
        });
    }
});
// GET /api/verification/status/:userId
// Get verification status for a user
router.get('/status/:userId', authMiddleware, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId, 10);
        const result = await db.query('SELECT * FROM user_verifications WHERE user_id = $1', [userId]);
        if (result.rows.length === 0) {
            return res.json({
                status: 'pending',
                message: 'Verification not started',
                verification: null,
            });
        }
        const verification = result.rows[0];
        res.json({
            success: true,
            status: verification.status,
            verification,
        });
    }
    catch (error) {
        console.error('Get verification status error:', error);
        res.status(500).json({
            error: 'Failed to get verification status',
            details: error.message,
        });
    }
});
// Helper function: Simulate criminal records check
// In production, replace with actual SPF API call
function simulateCriminalRecordsCheck(nric, name) {
    // Mock data for testing
    // In production: call actual SPF API or background check service
    // Simulate different results based on NRIC patterns (for testing)
    let recordFound = false;
    let convictions = [];
    let restrictions = [];
    // For demo: some NRICs will have records
    const nricNum = parseInt(nric.replace(/[^0-9]/g, ''));
    if (nricNum % 3 === 0) {
        // 1/3 of users have some record
        recordFound = true;
        convictions = [
            {
                offense: 'Minor theft',
                year: 2015,
                yearsSince: new Date().getFullYear() - 2015,
                category: 'property_crime',
            },
        ];
        restrictions = ['house_cleaning', 'babysitting', 'house_sitting'];
    }
    else if (nricNum % 7 === 0) {
        // Some users have violence record
        recordFound = true;
        convictions = [
            {
                offense: 'Simple assault',
                year: 2010,
                yearsSince: new Date().getFullYear() - 2010,
                category: 'violence',
            },
        ];
        restrictions = ['childcare', 'elderly_care', 'disabled_support'];
    }
    return {
        recordFound,
        convictions,
        warrants: [],
        offenses: convictions.map((c) => c.category),
        status: recordFound ? 'found' : 'clear',
        checkedAt: new Date().toISOString(),
    };
}
// Helper function: Determine user status and restrictions
function determineUserStatus(checkResult) {
    const disqualifyingOffenses = [
        'sexual_offense',
        'trafficking',
        'child_abuse',
        'serious_violence',
        'fraud',
    ];
    let status = 'approved';
    let restrictions = [];
    if (checkResult.offenses) {
        // Check for disqualifying offenses
        const hasDisqualifying = checkResult.offenses.some((o) => disqualifyingOffenses.includes(o));
        if (hasDisqualifying) {
            status = 'rejected';
        }
        else if (checkResult.offenses.length > 0) {
            status = 'restricted';
            // Build restrictions based on offenses
            checkResult.convictions?.forEach((conviction) => {
                if (conviction.category === 'property_crime') {
                    restrictions.push('house_cleaning', 'babysitting', 'house_sitting');
                }
                if (conviction.category === 'violence' && conviction.yearsSince < 5) {
                    restrictions.push('childcare', 'elderly_care', 'disabled_support');
                }
                if (conviction.category === 'drug' && conviction.yearsSince < 7) {
                    restrictions.push('childcare', 'elderly_care');
                }
            });
            // Remove duplicates
            restrictions = [...new Set(restrictions)];
        }
    }
    return {
        status,
        restrictions,
    };
}
// Helper function: Get user-friendly status message
function getStatusMessage(status, restrictions) {
    if (status === 'approved') {
        return '✅ Account verified! You can now use Errandify.';
    }
    else if (status === 'restricted') {
        return `⚠️ Account verified with restrictions. ${restrictions.length} job categories are unavailable.`;
    }
    else {
        return '❌ Account verification failed. Cannot access platform.';
    }
}
export default router;
