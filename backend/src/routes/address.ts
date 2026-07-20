import { Router, Request, Response } from 'express';
import { lookupAddress } from '../services/providers/addressProvider.js';

const router = Router();

// GET /api/address/:postalCode -> { area, fullAddress, latitude, longitude }
router.get('/:postalCode', async (req: Request, res: Response) => {
  try {
    const result = await lookupAddress(req.params.postalCode);
    if (!result) {
      return res.status(404).json({ success: false, error: 'Address not found' });
    }
    res.json({
      success: true,
      data: {
        postalCode: result.postal_code,
        area: result.area || null,
        fullAddress: result.formatted_address || null,
        latitude: result.latitude,
        longitude: result.longitude,
        provider: result.provider,
      },
    });
  } catch (err) {
    console.error('[Address] Lookup failed:', err);
    res.status(500).json({ success: false, error: 'Lookup failed' });
  }
});

export default router;
