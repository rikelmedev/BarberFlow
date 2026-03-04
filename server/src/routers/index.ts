import { router } from "../trpc.js";
import { appointmentsRouter } from "./appointments.js";

export const appRouter = router({
  appointments: appointmentsRouter,
});

export type AppRouter = typeof appRouter;