/**
 * Authenticated targeting preview — evaluates rules with optional debug output.
 */
import express from 'express';
import auth from '../middleware/auth.js';
import { parsePlacementType } from '../lib/placementType.js';
import { mergeStructuredContext } from '../services/recommendationTargetContext.js';
import { resolveRecommendationSetsForMerchant } from '../services/recommendationResolveService.js';

const router = express.Router();
router.use(auth);

// POST /api/recommendations/resolve-preview
// Body: { merchantId, placement, context?: object, includeDebug?: boolean }
router.post('/resolve-preview', async (req, res, next) => {
  try {
    const mid = parseInt(String(req.body?.merchantId ?? ''), 10);
    const placement = parsePlacementType(req.body?.placement);
    if (Number.isNaN(mid) || mid < 1) {
      return res.status(400).json({ error: 'valid merchantId required' });
    }
    if (!placement) {
      return res.status(400).json({ error: 'placement must be product_page, cart, or checkout' });
    }
    /** @type {import('../services/recommendationTargetContext.js').RecommendationPageContext} */
    const pageContext = { pageType: placement };
    if (req.body?.context != null && typeof req.body.context === 'object' && !Array.isArray(req.body.context)) {
      mergeStructuredContext(pageContext, req.body.context);
    }
    pageContext.pageType = placement;
    const includeDebug = !!req.body?.includeDebug;
    const result = await resolveRecommendationSetsForMerchant(mid, placement, pageContext, { includeDebug });
    res.json({
      placement,
      recommendationSets: result.sets,
      debug: result.debug,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
