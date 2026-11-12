/**
 * HTTP integration tests: products + recommendation sets (auth + Prisma).
 * Skips when DATABASE_URL is unset (e.g. CI without DB).
 */
import './test-env.mjs';
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../app.js';
import { signStaffToken } from '../../lib/staffAuth.js';

const prisma = new PrismaClient();
const app = createApp();

after(async () => {
  await prisma.$disconnect();
});

const JWT_SECRET = process.env.JWT_SECRET;

async function authAgent() {
  const password = await bcrypt.hash('integration-only-password', 4);
  const email = `integration-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const created = await prisma.user.create({
    data: { email, username: email, password, role: 'admin' },
  });
  const token = signStaffToken(
    { id: created.id, email: created.email, role: created.role, password },
    JWT_SECRET
  );
  const agent = request.agent(app).set('Cookie', `token=${token}`);
  const originalDelete = agent.delete.bind(agent);
  agent.cleanupStaff = async () => {
    await prisma.user.delete({ where: { id: created.id } }).catch(() => {});
  };
  void originalDelete;
  void jwt;
  return agent;
}

/** Set RUN_INTEGRATION_TESTS=1 with a migrated DB to exercise Prisma + HTTP CRUD. */
const runDbIntegration =
  process.env.RUN_INTEGRATION_TESTS === '1' && Boolean(process.env.DATABASE_URL);

test(
  'integration: product + recommendation set CRUD and tenant-scoped GET',
  { skip: !runDbIntegration },
  async (t) => {
    const domain = `test-${Date.now()}-${Math.random().toString(36).slice(2)}.myshopify.com`;
    const merchant = await prisma.merchant.create({
      data: {
        storeName: 'Integration Test Store',
        shopifyDomain: domain,
        accessToken: 'test-token',
      },
    });
    const mid = merchant.id;
    const agent = await authAgent();

    try {
      const listEmpty = await agent.get('/api/products').query({ merchantId: mid });
      assert.equal(listEmpty.status, 200);
      assert.deepEqual(listEmpty.body.products, []);

      const createProd = await agent.post('/api/products').send({
        merchantId: mid,
        title: 'Widget',
        productUrl: 'https://example.com/w',
        sku: `SKU-${Date.now()}`,
      });
      assert.equal(createProd.status, 201, createProd.body?.error || '');
      const pid = createProd.body.product.id;

      const getProd = await agent.get(`/api/products/${pid}`).query({ merchantId: mid });
      assert.equal(getProd.status, 200);
      assert.equal(getProd.body.product.title, 'Widget');

      const wrongTenant = await agent.get(`/api/products/${pid}`).query({ merchantId: mid + 999999 });
      assert.equal(wrongTenant.status, 404);

      const createSet = await agent.post('/api/recommendation-sets').send({
        merchantId: mid,
        name: 'My set',
        placementType: 'product_page',
        triggerConditions: { priority: 10 },
        status: 'draft',
        productIds: [pid],
      });
      assert.equal(createSet.status, 201, createSet.body?.error || '');
      const setId = createSet.body.recommendationSet.id;
      assert.ok(Array.isArray(createSet.body.recommendationSet.products));
      assert.equal(createSet.body.recommendationSet.products.length, 1);

      const listSets = await agent.get('/api/recommendation-sets').query({ merchantId: mid });
      assert.equal(listSets.status, 200);
      assert.equal(listSets.body.recommendationSets.length, 1);

      const preview = await agent.post('/api/recommendations/resolve-preview').send({
        merchantId: mid,
        placement: 'product_page',
        context: { cartSubtotal: 50 },
        includeDebug: true,
      });
      assert.equal(preview.status, 200);
      assert.equal(preview.body.placement, 'product_page');
      assert.ok(Array.isArray(preview.body.recommendationSets));
      assert.ok(Array.isArray(preview.body.debug));

      const getSet = await agent.get(`/api/recommendation-sets/${setId}`).query({ merchantId: mid });
      assert.equal(getSet.status, 200);
      assert.equal(getSet.body.recommendationSet.name, 'My set');

      const upd = await agent.put(`/api/recommendation-sets/${setId}`).send({ name: 'Renamed' });
      assert.equal(upd.status, 200);
      assert.equal(upd.body.recommendationSet.name, 'Renamed');

      await agent.delete(`/api/recommendation-sets/${setId}`).expect(204);

      await agent.delete(`/api/products/${pid}`).expect(204);
    } finally {
      await agent.cleanupStaff?.();
      await prisma.merchant.delete({ where: { id: mid } }).catch(() => {});
    }
  }
);

test(
  'integration: validation errors — missing merchantId, bad body',
  { skip: !runDbIntegration },
  async () => {
  const agent = await authAgent();
  try {
  const r = await agent.get('/api/products');
  assert.equal(r.status, 400);
  assert.match(r.body.error, /merchantId/i);

  const r2 = await agent.post('/api/products').send({ title: 'x' });
  assert.equal(r2.status, 400);
  } finally {
    await agent.cleanupStaff();
  }
  }
);

test(
  'integration: conversion intelligence rejects invalid body',
  { skip: !runDbIntegration },
  async () => {
  const agent = await authAgent();
  try {
  const res = await agent.post('/api/conversion-intelligence/recommendation-assistant').send({
    intent: 'not-a-real-intent-xyz',
    userMessage: 'hi',
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.ok, false);
  assert.ok(res.body.error);
  } finally {
    await agent.cleanupStaff();
  }
  }
);

test(
  'integration: conversion intelligence accepts minimal valid payload',
  { skip: !runDbIntegration },
  async () => {
  const agent = await authAgent();
  try {
  const res = await agent.post('/api/conversion-intelligence/recommendation-assistant').send({
    intent: 'optimize',
    userMessage: 'Improve my set',
    context: {
      placementType: 'product_page',
      name: 'Test',
      triggerJson: '{}',
    },
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  assert.ok(res.body.schemaVersion);
  assert.ok(Array.isArray(res.body.suggestions));
  } finally {
    await agent.cleanupStaff();
  }
  }
);
