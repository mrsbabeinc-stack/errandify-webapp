import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import db from '../db.js';
const router = Router();
// Helper: Normalize and compare names
function compareNames(acraName, singpassName) {
    const normalize = (name) => name.trim().toLowerCase().replace(/\s+/g, ' ');
    const acra = normalize(acraName);
    const singpass = normalize(singpassName);
    // Exact match
    if (acra === singpass)
        return true;
    // Parse names for flexible matching
    const acraParts = acra.split(' ');
    const singpassParts = singpass.split(' ');
    // Get first and last names (main identifiers)
    const acraFirst = acraParts[0];
    const acraLast = acraParts[acraParts.length - 1];
    const singpassFirst = singpassParts[0];
    const singpassLast = singpassParts[singpassParts.length - 1];
    // Both first AND last must match (handles middle names)
    return acraFirst === singpassFirst && acraLast === singpassLast;
}
// Mock ACRA API - In production, replace with real ACRA API integration
function queryACRADatabase(uen) {
    // Mock data for demo company
    if (uen === 'UEN202401001') {
        return {
            name: 'Rumah Emas Demo Company',
            business_type: 'Cleaning & Facilities Management',
            owner_name: 'Ahmad Ibrahim',
            address: '101 Tanjong Pagar Road, Singapore 088518'
        };
    }
    // In production, make actual ACRA API call
    // For now, return null (UEN not found)
    return null;
}
// GET /api/acra-lookup?uen=XXX
// Lookup company on ACRA and verify owner name matches
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { uen } = req.query;
        const userId = req.userId;
        if (!uen || typeof uen !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'UEN is required'
            });
        }
        // Validate UEN format: 8 digits + 1 letter
        const uenRegex = /^[0-9]{8}[A-Z]{1}$/i;
        if (!uenRegex.test(uen.trim())) {
            return res.status(400).json({
                success: false,
                error: 'Invalid UEN format. Must be 8 digits + 1 letter (e.g., 123456789A)'
            });
        }
        // Get current user's SingPass name
        const userResult = await db.query('SELECT name FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        const singpassName = userResult.rows[0].name;
        // Query ACRA (mock or real API)
        const acraData = queryACRADatabase(uen.toUpperCase());
        if (!acraData) {
            return res.status(404).json({
                success: false,
                error: 'UEN not found in ACRA database'
            });
        }
        // CRITICAL: Verify owner name matches
        const ownerVerified = compareNames(acraData.owner_name, singpassName);
        // Log verification attempt for audit trail
        console.log(`[ACRA] UEN lookup: ${uen}`, {
            acraOwner: acraData.owner_name,
            singpassName: singpassName,
            verified: ownerVerified,
            userId: userId,
            timestamp: new Date().toISOString()
        });
        res.json({
            success: true,
            data: {
                companyName: acraData.name,
                businessType: acraData.business_type,
                ownerName: acraData.owner_name,
                address: acraData.address,
                ownerVerified: ownerVerified, // Critical flag
                singpassName: singpassName // For comparison display
            }
        });
    }
    catch (error) {
        console.error('[ACRA] Lookup error:', error);
        res.status(500).json({
            success: false,
            error: 'ACRA lookup failed. Please try again.'
        });
    }
});
export default router;
