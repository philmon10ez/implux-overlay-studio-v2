import { PrismaClient } from '@prisma/client';
import { parsePlacementType } from '../lib/placementType.js';
import { sanitizeFrequencyCapPayload } from '../lib/frequencyCap.js';
import { parsePresetKeyInput, parsePresetMetadataInput } from '../lib/recommendationPresets.js';
import { productBelongsToMerchant } from './productService.js';

const prisma = new PrismaClient();

const setInclude = {
  productLinks: {
    orderBy: { sortOrder: 'asc' },
    include: { product: true },
  },
};

function serializeSet(row) {
  const products = (row.productLinks || []).map((link) => ({
    sortOrder: link.sortOrder,
    product: {
      id: link.product.id,
      merchantId: link.product.merchantId,
      title: link.product.title,
      imageUrl: link.product.imageUrl,
      price: link.product.price != null ? Number(link.product.price) : null,
      productUrl: link.product.productUrl,
      sku: link.product.sku,
      category: link.product.category,
      metadata: link.product.metadata ?? null,
      createdAt: link.product.createdAt,
      updatedAt: link.product.updatedAt,
    },
  }));
  return {
    id: row.id,
    merchantId: row.merchantId,
    name: row.name,
    placementType: row.placementType,
    triggerConditions: row.triggerConditions ?? {},
    frequencyCap: row.frequencyCap ?? null,
    presetKey: row.presetKey ?? null,
    presetMetadata: row.presetMetadata ?? null,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    products,
  };
}

/**
 * @param {unknown} raw
 * @returns {object | null | undefined} undefined = omit, null = clear
 */
function normalizeFrequencyCapInput(raw) {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  return sanitizeFrequencyCapPayload(raw);
}

/**
 * @param {unknown} raw
 * @returns {{ ok: true, value: object } | { ok: false, error: string }}
 */
export function parseTriggerConditions(raw) {
  if (raw === undefined || raw === null) return { ok: true, value: {} };
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'triggerConditions must be a JSON object' };
  }
  return { ok: true, value: raw };
}

/**
 * @param {object} body
 * @returns {{ ok: true, data: object } | { ok: false, error: string }}
 */
export function validateRecommendationSetCreateBody(body) {
  const name = body.name != null ? String(body.name).trim() : '';
  if (!name) return { ok: false, error: 'name is required' };
  const mid = parseInt(String(body.merchantId), 10);
  if (Number.isNaN(mid) || mid < 1) return { ok: false, error: 'valid merchantId is required' };
  const placement = parsePlacementType(body.placementType ?? body.placement_type);
  if (!placement) return { ok: false, error: 'placementType must be product_page, cart, or checkout' };
  const tc = parseTriggerConditions(body.triggerConditions ?? body.trigger_conditions);
  if (!tc.ok) return tc;
  const status = body.status != null ? String(body.status).trim() : 'draft';
  if (!status) return { ok: false, error: 'status cannot be empty' };
  let productIds = null;
  if (body.productIds !== undefined) {
    if (!Array.isArray(body.productIds)) return { ok: false, error: 'productIds must be an array' };
    productIds = body.productIds;
  }
  const fc = normalizeFrequencyCapInput(body.frequencyCap ?? body.frequency_cap);
  const pk = parsePresetKeyInput(body);
  if (!pk.ok) return pk;
  const pm = parsePresetMetadataInput(body);
  if (!pm.ok) return pm;
  const presetKey = pk.explicit ? pk.value : null;
  const presetMetadata = pm.explicit ? pm.value : null;
  return {
    ok: true,
    data: {
      merchantId: mid,
      name,
      placementType: placement,
      triggerConditions: tc.value,
      frequencyCap: fc === undefined ? null : fc,
      presetKey,
      presetMetadata,
      status,
      productIds,
    },
  };
}

/**
 * @param {object} body
 * @returns {{ ok: true, data: object } | { ok: false, error: string }}
 */
export function validateRecommendationSetUpdateBody(body) {
  const data = {};
  if (body.name !== undefined) {
    const n = String(body.name).trim();
    if (!n) return { ok: false, error: 'name cannot be empty' };
    data.name = n;
  }
  if (body.placementType !== undefined || body.placement_type !== undefined) {
    const p = parsePlacementType(body.placementType ?? body.placement_type);
    if (!p) return { ok: false, error: 'placementType must be product_page, cart, or checkout' };
    data.placementType = p;
  }
  if (body.triggerConditions !== undefined || body.trigger_conditions !== undefined) {
    const tc = parseTriggerConditions(body.triggerConditions ?? body.trigger_conditions);
    if (!tc.ok) return tc;
    data.triggerConditions = tc.value;
  }
  if (body.status !== undefined) {
    const s = String(body.status).trim();
    if (!s) return { ok: false, error: 'status cannot be empty' };
    data.status = s;
  }
  if (body.frequencyCap !== undefined || body.frequency_cap !== undefined) {
    const fc = normalizeFrequencyCapInput(body.frequencyCap ?? body.frequency_cap);
    data.frequencyCap = fc;
  }
  if (body.presetKey !== undefined || body.preset_key !== undefined) {
    const pk = parsePresetKeyInput(body);
    if (!pk.ok) return pk;
    data.presetKey = pk.value;
  }
  if (body.presetMetadata !== undefined || body.preset_metadata !== undefined) {
    const pm = parsePresetMetadataInput(body);
    if (!pm.ok) return pm;
    data.presetMetadata = pm.value;
  }
  let productIds = undefined;
  if (body.productIds !== undefined) {
    if (!Array.isArray(body.productIds)) return { ok: false, error: 'productIds must be an array' };
    productIds = body.productIds;
  }
  if (Object.keys(data).length === 0 && productIds === undefined) {
    return { ok: false, error: 'no valid fields to update' };
  }
  return { ok: true, data: { patch: data, productIds } };
}

export async function listRecommendationSets(merchantId) {
  const rows = await prisma.recommendationSet.findMany({
    where: { merchantId },
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    include: {
      _count: { select: { productLinks: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    merchantId: r.merchantId,
    name: r.name,
    placementType: r.placementType,
    triggerConditions: r.triggerConditions ?? {},
    frequencyCap: r.frequencyCap ?? null,
    presetKey: r.presetKey ?? null,
    presetMetadata: r.presetMetadata ?? null,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    productCount: r._count.productLinks,
  }));
}

/**
 * @param {number} id
 * @param {{ merchantId?: number }} [scope] — when set, require set to belong to this merchant (tenant-safe GET)
 */
export async function getRecommendationSetById(id, scope = {}) {
  const { merchantId } = scope;
  const row =
    merchantId != null
      ? await prisma.recommendationSet.findFirst({
          where: { id, merchantId },
          include: setInclude,
        })
      : await prisma.recommendationSet.findUnique({
          where: { id },
          include: setInclude,
        });
  return row ? serializeSet(row) : null;
}

/**
 * Replace linked products; verifies each product belongs to the set's merchant.
 * @param {number} setId
 * @param {number} merchantId
 * @param {number[]} productIdsOrdered
 */
export async function replaceSetProducts(setId, merchantId, productIdsOrdered) {
  const unique = [];
  const seen = new Set();
  for (const raw of productIdsOrdered) {
    const pid = parseInt(String(raw), 10);
    if (Number.isNaN(pid) || pid < 1) {
      throw Object.assign(new Error('invalid product id in productIds'), { status: 400 });
    }
    if (seen.has(pid)) continue;
    seen.add(pid);
    unique.push(pid);
  }
  for (const pid of unique) {
    const ok = await productBelongsToMerchant(pid, merchantId);
    if (!ok) {
      throw Object.assign(new Error(`product ${pid} not found for this merchant`), { status: 400 });
    }
  }
  await prisma.$transaction(async (tx) => {
    await tx.recommendationSetProduct.deleteMany({ where: { recommendationSetId: setId } });
    if (unique.length > 0) {
      await tx.recommendationSetProduct.createMany({
        data: unique.map((productId, i) => ({
          recommendationSetId: setId,
          productId,
          sortOrder: i,
        })),
      });
    }
  });
}

export async function createRecommendationSet(validated) {
  const { productIds, ...rest } = validated;
  const row = await prisma.recommendationSet.create({
    data: {
      merchantId: rest.merchantId,
      name: rest.name,
      placementType: rest.placementType,
      triggerConditions: rest.triggerConditions,
      frequencyCap: rest.frequencyCap ?? null,
      presetKey: rest.presetKey ?? null,
      presetMetadata: rest.presetMetadata ?? null,
      status: rest.status,
    },
    include: setInclude,
  });
  if (productIds && productIds.length > 0) {
    await replaceSetProducts(row.id, rest.merchantId, productIds);
    const full = await prisma.recommendationSet.findUnique({
      where: { id: row.id },
      include: setInclude,
    });
    return serializeSet(full);
  }
  return serializeSet(row);
}

export async function updateRecommendationSet(id, patch, productIds) {
  let row;
  if (Object.keys(patch).length > 0) {
    row = await prisma.recommendationSet.update({
      where: { id },
      data: patch,
      include: setInclude,
    });
  } else {
    row = await prisma.recommendationSet.findUnique({
      where: { id },
      include: setInclude,
    });
    if (!row) {
      const err = new Error('Recommendation set not found');
      err.statusCode = 404;
      throw err;
    }
  }
  if (productIds !== undefined) {
    await replaceSetProducts(id, row.merchantId, productIds);
    const full = await prisma.recommendationSet.findUnique({
      where: { id },
      include: setInclude,
    });
    return serializeSet(full);
  }
  return serializeSet(row);
}

export async function deleteRecommendationSet(id) {
  await prisma.recommendationSet.delete({ where: { id } });
}

export async function assertMerchantExists(merchantId) {
  const m = await prisma.merchant.findUnique({ where: { id: merchantId }, select: { id: true } });
  return !!m;
}
