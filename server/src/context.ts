import { inferAsyncReturnType } from '@trpc/server';
import * as trpcExpress from '@trpc/server/adapters/express';
import { db } from './db/index.js';

export const createContext = ({
  req,
  res,
}: trpcExpress.CreateExpressContextOptions) => {
  return {
    req,
    res,
    db,
    profileId: null as string | null, 
  };
};

export type Context = inferAsyncReturnType<typeof createContext>;