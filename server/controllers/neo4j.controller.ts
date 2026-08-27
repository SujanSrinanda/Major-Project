import { Request, Response, NextFunction } from 'express';
import { neo4jService, Neo4jService } from '../services/neo4j.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class Neo4jController {
  constructor(private neo4jSvc: Neo4jService = neo4jService) {}

  getStatus = (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = this.neo4jSvc.getStatus();
      return res.status(result.status).json(result.data);
    } catch (err) {
      next(err);
    }
  };

  verify = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.neo4jSvc.verify(req.body);
      return res.status(result.status).json(result.data);
    } catch (err) {
      next(err);
    }
  };

  updateConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.neo4jSvc.updateConfig(req.body);
      return res.status(result.status).json(result.data);
    } catch (err) {
      next(err);
    }
  };

  getGraph = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.neo4jSvc.getGraph(req.user!.id);
      return res.status(result.status).json(result.data);
    } catch (err) {
      next(err);
    }
  };
}

export const neo4jController = new Neo4jController();
