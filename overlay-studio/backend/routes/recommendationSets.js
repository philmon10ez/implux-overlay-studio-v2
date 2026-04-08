/**
 * Recommendation sets CRUD — tenant-scoped by merchantId; ordered product links.
 */
import express from 'express';
import auth from '../middleware/auth.js';
import {
  parseRequiredMerchantIdQuery,
  parseRequiredIdParam,
  parseOptionalMerchantIdQuery,
} from '../lib/http/parseApiParams.js';
import {
  listRecommendationSets,
  getRecommendationSetById,
  createRecommendationSet,
  updateRecommendationSet,
  deleteRecommendationSet,
  validateRecommendationSetCreateBody,
  validateRecommendationSetUpdateBody,
  assertMerchantExists,
} from '../services/recommendationSetService.js';
import { RECOMMENDATION_PRESET_CATALOG } from '../lib/recommendationPresets.js';

const router = express.Router();
router.use(auth);

router.get('/presets/catalog', (req, res) => {
  res.json({ presets: RECOMMENDATION_PRESET_CATALOG, schemaVersion: 1 });
});

router.get('/', async (req, res, next) => {
  try {
    const q = parseRequiredMerchantIdQuery(req);
    if (!q.ok) return res.status(400).json({ error: q.error });
    const recommendationSets = await listRecommendationSets(q.merchantId);
    res.json({ recommendationSets });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const idp = parseRequiredIdParam(req.params.id);
    if (!idp.ok) return res.status(400).json({ error: idp.error });
    const merchantId = parseOptionalMerchantIdQuery(req);
    const recommendationSet = await getRecommendationSetById(
      idp.id,
      merchantId != null ? { merchantId } : {}
    );
    if (!recommendationSet) return res.status(404).json({ error: 'Recommendation set not found' });
    res.json({ recommendationSet });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const v = validateRecommendationSetCreateBody(req.body ?? {});
    if (!v.ok) return res.status(400).json({ error: v.error });
    const exists = await assertMerchantExists(v.data.merchantId);
    if (!exists) return res.status(400).json({ error: 'Merchant not found' });
    const recommendationSet = await createRecommendationSet(v.data);
    res.status(201).json({ recommendationSet });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message });
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const idp = parseRequiredIdParam(req.params.id);
    if (!idp.ok) return res.status(400).json({ error: idp.error });
    const { id } = idp;
    const v = validateRecommendationSetUpdateBody(req.body ?? {});
    if (!v.ok) return res.status(400).json({ error: v.error });
    const { patch, productIds } = v.data;
    const recommendationSet = await updateRecommendationSet(id, patch, productIds);
    res.json({ recommendationSet });
  } catch (err) {
    if (err.statusCode === 404 || err.code === 'P2025') {
      return res.status(404).json({ error: 'Recommendation set not found' });
    }
    if (err.status === 400) return res.status(400).json({ error: err.message });
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const idp = parseRequiredIdParam(req.params.id);
    if (!idp.ok) return res.status(400).json({ error: idp.error });
    const { id } = idp;
    await deleteRecommendationSet(id);
    res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Recommendation set not found' });
    next(err);
  }
});

export default router;
