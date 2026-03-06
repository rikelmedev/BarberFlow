import { router } from "../trpc.js";
import { appointmentsRouter } from "./appointments.js";
import { professionalsRouter } from "./professionals.js"; 
import { servicesRouter } from "./services.js";

export const appRouter = router({
  appointments: appointmentsRouter,
  professionals: professionalsRouter,
  services: servicesRouter, 
});

export type AppRouter = typeof appRouter;