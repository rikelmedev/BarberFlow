// server/src/routers/professionals.ts
import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { db } from '../db/index.js';
import { professionals } from '../db/schema.js';

export const professionalsRouter = router({
  // Listar profissionais
  list: publicProcedure.query(async () => {
    return await db.select().from(professionals);
  }),

  // CADASTRAR um novo profissional
  create: publicProcedure
    .input(z.object({
      name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
      profileId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      const newProfessional = await db.insert(professionals).values({
        name: input.name,
        profileId: input.profileId,
        isActive: true,
      }).returning();
      
      return newProfessional[0];
    }),
});