import { router } from "../trpc.js";
import { appointmentsRouter } from "./appointments.js";
import { professionalsRouter } from "./professionals.js"; 

export const appRouter = router({
  appointments: appointmentsRouter,
  professionals: professionalsRouter, 
});

export type AppRouter = typeof appRouter;