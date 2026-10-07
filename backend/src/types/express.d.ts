import type { User } from "./user";

declare global {
  namespace Express {
    interface Request {
      authUser?: User;
      authSessionId?: string;
    }
  }
}

export {};