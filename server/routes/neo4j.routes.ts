import { Router } from 'express';
import { neo4jController } from '../controllers/neo4j.controller';
import { requireAuth } from '../middleware/auth.middleware';

export const neo4jRouter = Router();

neo4jRouter.get('/status', requireAuth, neo4jController.getStatus);
neo4jRouter.post('/verify', requireAuth, neo4jController.verify);
neo4jRouter.post('/config', requireAuth, neo4jController.updateConfig);
neo4jRouter.get('/graph', requireAuth, neo4jController.getGraph);
