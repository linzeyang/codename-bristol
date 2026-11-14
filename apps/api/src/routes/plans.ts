import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireUser } from '../auth/session.js';
import { PLANS, findPlan } from '../data/plans.js';
import { toUserDTO } from '../db/rows.js';
import { HttpError } from '../db/types.js';
import { parse } from '../lib/http.js';
import { userById } from './auth.js';

const subscriptionSchema = z.object({
  planId: z.enum(['free', 'plus', 'studio']),
});

export async function planRoutes(app: FastifyInstance): Promise<void> {
  app.get('/plans', async (request) => {
    return {
      plans: PLANS,
      currentPlanId: request.user?.planId ?? 'free',
      isGuest: !request.user,
      demoNotice: '这是原型演示环境，套餐切换即时生效但不会产生真实扣款。',
    };
  });

  app.get('/subscription', async (request) => {
    const current = requireUser(request);
    const { rows } = await app.db.query<{ plan_id: string; action: string; created_at: string | Date }>(
      'SELECT plan_id, action, created_at FROM subscription_events WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [current.id],
    );
    return {
      currentPlanId: current.planId,
      events: rows.map((row) => ({ planId: row.plan_id, action: row.action, createdAt: new Date(row.created_at).toISOString() })),
    };
  });

  app.post('/subscription', async (request) => {
    const current = requireUser(request);
    const body = parse(subscriptionSchema, request.body);
    const plan = findPlan(body.planId);
    if (!plan) throw new HttpError(400, '套餐不存在', 'invalid_plan');
    await app.db.transaction(async (tx) => {
      await tx.query('UPDATE users SET plan_id = $2 WHERE id = $1', [current.id, plan.id]);
      await tx.query('INSERT INTO subscription_events (user_id, plan_id, action) VALUES ($1,$2,$3)', [
        current.id,
        plan.id,
        current.planId === plan.id ? 'confirm' : 'switch',
      ]);
    });
    const user = await userById(app.db, current.id);
    return {
      user: toUserDTO(user),
      plan,
      notice: '套餐已在演示环境中切换，未产生真实扣款。',
    };
  });
}