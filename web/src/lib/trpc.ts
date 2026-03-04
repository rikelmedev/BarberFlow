import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../../server/src/routers/index.js';

export const trpc = createTRPCReact<AppRouter>();