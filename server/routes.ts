import { Express } from 'express';
import { setupRoutes } from './routes/index';
export { requireAuth } from './middleware/auth.middleware';
export type { AuthenticatedRequest } from './middleware/auth.middleware';

/**
 * @deprecated Use setupRoutes from './routes/index' instead.
 * Preserved for backward compatibility.
 */
export function setupAuthAndUserRoutes(app: Express) {
  setupRoutes(app);
}

export default setupRoutes;
