import type { Request, Response } from 'express';
import { AppDataSource } from '../../../database/data-source';
import { Coupon } from '../../../database/entities/Coupon';
import {
  couponCreateSchema,
  couponQuerySchema,
  couponUpdateSchema,
} from '../schemas/coupon.schema';
import { ensureAdmin } from '../../../common/utils/ensure-admin';

let dataSourceInit: Promise<void> | null = null;

async function ensureDataSource() {
  if (AppDataSource.isInitialized) {
    return;
  }

  if (!dataSourceInit) {
    dataSourceInit = AppDataSource.initialize().then(() => undefined);
  }

  await dataSourceInit;
}

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

function mapCoupon(coupon: Coupon) {
  return {
    id: coupon.id,
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    active: coupon.active,
    starts_at: coupon.startsAt,
    ends_at: coupon.endsAt,
    min_order_total: coupon.minOrderTotal,
    created_at: coupon.createdAt,
    updated_at: coupon.updatedAt,
  };
}

export async function createCoupon(req: Request, res: Response) {
  if (!ensureAdmin(req, res)) {
    return;
  }

  const parsed = couponCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path.join('.') || 'body';
    return res.status(400).json({ error: `${field}: ${issue.message}` });
  }

  await ensureDataSource();

  const payload = parsed.data;
  const code = normalizeCode(payload.code);
  const repo = AppDataSource.getRepository(Coupon);

  const existing = await repo.findOne({ where: { code } });
  if (existing) {
    return res.status(409).json({ error: 'Coupon code already exists' });
  }

  const coupon = repo.create({
    code,
    type: payload.type,
    value: payload.value.toFixed(2),
    active: payload.active ?? true,
    startsAt: payload.starts_at ?? null,
    endsAt: payload.ends_at ?? null,
    minOrderTotal: payload.min_order_total?.toFixed(2) ?? '0',
  });

  const saved = await repo.save(coupon);
  return res.status(201).json(mapCoupon(saved));
}

export async function listCoupons(req: Request, res: Response) {
  if (!ensureAdmin(req, res)) {
    return;
  }

  const parsed = couponQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path.join('.') || 'query';
    return res.status(400).json({ error: `${field}: ${issue.message}` });
  }

  await ensureDataSource();

  const { active } = parsed.data;
  const repo = AppDataSource.getRepository(Coupon);
  const qb = repo.createQueryBuilder('coupon');

  if (active !== undefined) {
    qb.where('coupon.active = :active', { active });
  }

  const coupons = await qb.orderBy('coupon.createdAt', 'DESC').getMany();
  return res.json({ data: coupons.map(mapCoupon) });
}

export async function updateCoupon(req: Request, res: Response) {
  if (!ensureAdmin(req, res)) {
    return;
  }

  const { id } = req.params;
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  const parsed = couponUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path.join('.') || 'body';
    return res.status(400).json({ error: `${field}: ${issue.message}` });
  }

  await ensureDataSource();

  const repo = AppDataSource.getRepository(Coupon);
  const coupon = await repo.findOne({ where: { id } });

  if (!coupon) {
    return res.status(404).json({ error: 'Coupon not found' });
  }

  const payload = parsed.data;
  if (payload.code !== undefined) {
    const code = normalizeCode(payload.code);
    const existing = await repo.findOne({ where: { code } });
    if (existing && existing.id !== coupon.id) {
      return res.status(409).json({ error: 'Coupon code already exists' });
    }
    coupon.code = code;
  }
  if (payload.type !== undefined) {
    coupon.type = payload.type;
  }
  if (payload.value !== undefined) {
    coupon.value = payload.value.toFixed(2);
  }
  if (payload.active !== undefined) {
    coupon.active = payload.active;
  }
  if (payload.starts_at !== undefined) {
    coupon.startsAt = payload.starts_at ?? null;
  }
  if (payload.ends_at !== undefined) {
    coupon.endsAt = payload.ends_at ?? null;
  }
  if (payload.min_order_total !== undefined) {
    coupon.minOrderTotal = payload.min_order_total.toFixed(2);
  }

  const saved = await repo.save(coupon);
  return res.json(mapCoupon(saved));
}

export async function deleteCoupon(req: Request, res: Response) {
  if (!ensureAdmin(req, res)) {
    return;
  }

  const { id } = req.params;
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  await ensureDataSource();

  const repo = AppDataSource.getRepository(Coupon);
  const coupon = await repo.findOne({ where: { id } });

  if (!coupon) {
    return res.status(404).json({ error: 'Coupon not found' });
  }

  coupon.active = false;
  const saved = await repo.save(coupon);
  return res.json(mapCoupon(saved));
}
