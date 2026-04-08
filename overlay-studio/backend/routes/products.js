/**
 * Products CRUD — tenant-scoped by merchantId (SaaS).
 */
import express from 'express';
import auth from '../middleware/auth.js';
import {
  parseRequiredMerchantIdQuery,
  parseRequiredIdParam,
  parseOptionalMerchantIdQuery,
} from '../lib/http/parseApiParams.js';
import {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  validateProductCreateBody,
  validateProductUpdateBody,
  assertMerchantExists,
} from '../services/productService.js';

const router = express.Router();
router.use(auth);

router.get('/', async (req, res, next) => {
  try {
    const q = parseRequiredMerchantIdQuery(req);
    if (!q.ok) return res.status(400).json({ error: q.error });
    const products = await listProducts(q.merchantId);
    res.json({ products });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const idp = parseRequiredIdParam(req.params.id);
    if (!idp.ok) return res.status(400).json({ error: idp.error });
    const merchantId = parseOptionalMerchantIdQuery(req);
    const product = await getProductById(idp.id, merchantId != null ? { merchantId } : {});
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ product });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const v = validateProductCreateBody(req.body ?? {});
    if (!v.ok) return res.status(400).json({ error: v.error });
    const exists = await assertMerchantExists(v.data.merchantId);
    if (!exists) return res.status(400).json({ error: 'Merchant not found' });
    const product = await createProduct(v.data);
    res.status(201).json({ product });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'SKU already exists for this merchant' });
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const idp = parseRequiredIdParam(req.params.id);
    if (!idp.ok) return res.status(400).json({ error: idp.error });
    const { id } = idp;
    const v = validateProductUpdateBody(req.body ?? {});
    if (!v.ok) return res.status(400).json({ error: v.error });
    const product = await updateProduct(id, v.data);
    res.json({ product });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Product not found' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'SKU already exists for this merchant' });
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const idp = parseRequiredIdParam(req.params.id);
    if (!idp.ok) return res.status(400).json({ error: idp.error });
    const { id } = idp;
    await deleteProduct(id);
    res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Product not found' });
    next(err);
  }
});

export default router;
