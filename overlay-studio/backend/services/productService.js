import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * @param {import('@prisma/client').Product} p
 */
export function serializeProduct(p) {
  return {
    id: p.id,
    merchantId: p.merchantId,
    title: p.title,
    imageUrl: p.imageUrl,
    price: p.price != null ? Number(p.price) : null,
    productUrl: p.productUrl,
    sku: p.sku,
    category: p.category,
    metadata: p.metadata ?? null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

/**
 * Storefront / widget payload — no merchant or audit fields.
 * @param {import('@prisma/client').Product} p
 */
export function serializeProductStorefront(p) {
  return {
    id: p.id,
    title: p.title,
    imageUrl: p.imageUrl,
    price: p.price != null ? Number(p.price) : null,
    productUrl: p.productUrl,
    sku: p.sku,
    category: p.category,
    metadata: p.metadata ?? null,
  };
}

/**
 * @param {{ merchantId: number, title: unknown, productUrl: unknown, imageUrl?: unknown, price?: unknown, sku?: unknown, category?: unknown, metadata?: unknown }}
 * @returns {{ ok: true, data: object } | { ok: false, error: string }}
 */
export function validateProductCreateBody(body) {
  const title = body.title != null ? String(body.title).trim() : '';
  const productUrl = body.productUrl != null ? String(body.productUrl).trim() : '';
  if (!title) return { ok: false, error: 'title is required' };
  if (!productUrl) return { ok: false, error: 'productUrl is required' };
  const mid = parseInt(String(body.merchantId), 10);
  if (Number.isNaN(mid) || mid < 1) return { ok: false, error: 'valid merchantId is required' };

  let price = null;
  if (body.price !== undefined && body.price !== null && body.price !== '') {
    const n = Number(body.price);
    if (Number.isNaN(n) || n < 0) return { ok: false, error: 'price must be a non-negative number' };
    price = n;
  }

  let metadata = null;
  if (body.metadata !== undefined && body.metadata !== null) {
    if (typeof body.metadata !== 'object' || Array.isArray(body.metadata)) {
      return { ok: false, error: 'metadata must be a JSON object' };
    }
    metadata = body.metadata;
  }

  const skuRaw = body.sku != null ? String(body.sku).trim() : '';
  const sku = skuRaw === '' ? null : skuRaw;

  return {
    ok: true,
    data: {
      merchantId: mid,
      title,
      productUrl,
      imageUrl: body.imageUrl != null && String(body.imageUrl).trim() !== '' ? String(body.imageUrl).trim() : null,
      price,
      sku,
      category: body.category != null && String(body.category).trim() !== '' ? String(body.category).trim() : null,
      metadata,
    },
  };
}

/**
 * @param {object} body
 * @returns {{ ok: true, data: object } | { ok: false, error: string }}
 */
export function validateProductUpdateBody(body) {
  const data = {};
  if (body.title !== undefined) {
    const t = String(body.title).trim();
    if (!t) return { ok: false, error: 'title cannot be empty' };
    data.title = t;
  }
  if (body.productUrl !== undefined) {
    const u = String(body.productUrl).trim();
    if (!u) return { ok: false, error: 'productUrl cannot be empty' };
    data.productUrl = u;
  }
  if (body.imageUrl !== undefined) {
    data.imageUrl = body.imageUrl === null || body.imageUrl === '' ? null : String(body.imageUrl).trim();
  }
  if (body.price !== undefined) {
    if (body.price === null || body.price === '') data.price = null;
    else {
      const n = Number(body.price);
      if (Number.isNaN(n) || n < 0) return { ok: false, error: 'price must be a non-negative number or null' };
      data.price = n;
    }
  }
  if (body.sku !== undefined) {
    const s = body.sku === null || body.sku === '' ? null : String(body.sku).trim();
    data.sku = s === '' ? null : s;
  }
  if (body.category !== undefined) {
    data.category = body.category === null || body.category === '' ? null : String(body.category).trim();
  }
  if (body.metadata !== undefined) {
    if (body.metadata === null) data.metadata = null;
    else if (typeof body.metadata !== 'object' || Array.isArray(body.metadata)) {
      return { ok: false, error: 'metadata must be a JSON object or null' };
    } else data.metadata = body.metadata;
  }
  if (Object.keys(data).length === 0) return { ok: false, error: 'no valid fields to update' };
  return { ok: true, data };
}

export async function listProducts(merchantId) {
  const rows = await prisma.product.findMany({
    where: { merchantId },
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
  });
  return rows.map(serializeProduct);
}

/**
 * @param {number} id
 * @param {{ merchantId?: number }} [scope] — when set, require product to belong to this merchant (tenant-safe GET)
 */
export async function getProductById(id, scope = {}) {
  const { merchantId } = scope;
  const p =
    merchantId != null
      ? await prisma.product.findFirst({ where: { id, merchantId } })
      : await prisma.product.findUnique({ where: { id } });
  return p ? serializeProduct(p) : null;
}

export async function createProduct(validated) {
  const p = await prisma.product.create({
    data: {
      merchantId: validated.merchantId,
      title: validated.title,
      imageUrl: validated.imageUrl,
      price: validated.price,
      productUrl: validated.productUrl,
      sku: validated.sku,
      category: validated.category,
      metadata: validated.metadata ?? undefined,
    },
  });
  return serializeProduct(p);
}

export async function updateProduct(id, patch) {
  const p = await prisma.product.update({
    where: { id },
    data: patch,
  });
  return serializeProduct(p);
}

export async function deleteProduct(id) {
  await prisma.product.delete({ where: { id } });
}

/** @returns {Promise<boolean>} */
export async function productBelongsToMerchant(productId, merchantId) {
  const p = await prisma.product.findFirst({
    where: { id: productId, merchantId },
    select: { id: true },
  });
  return !!p;
}

export async function assertMerchantExists(merchantId) {
  const m = await prisma.merchant.findUnique({ where: { id: merchantId }, select: { id: true } });
  return !!m;
}
