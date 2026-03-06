import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { db } from '../db/index.js';
import { services } from '../db/schema.js';

export const servicesRouter = router({
  // Listar serviços ativos
  list: publicProcedure.query(async () => {
    return await db.select().from(services);
  }),

  // CADASTRAR um novo serviço
  create: publicProcedure
    .input(z.object({
      name: z.string().min(2, "Nome muito curto"),
      description: z.string().optional(),
      price: z.string(), 
      durationMin: z.number().int(),
      profileId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      const newService = await db.insert(services).values({
        name: input.name,
        description: input.description,
        price: input.price,
        durationMin: input.durationMin,
        profileId: input.profileId,
        isActive: true,
      }).returning();
      
      return newService[0];
    }),
});