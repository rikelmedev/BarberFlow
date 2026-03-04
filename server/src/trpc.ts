import { initTRPC, TRPCError } from '@trpc/server';
import { Context } from './context.js';
import superjson from 'superjson';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const profileProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.db) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not found' });
  }
  return next({
    ctx: {
      ...ctx,
    },
  });
});