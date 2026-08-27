import {
  isNeo4jConfigured,
  verifyNeo4jConnection,
  updateNeo4jCredentials,
  getNeo4jGraphOverview,
} from '../neo4j';

export class Neo4jService {
  getStatus() {
    return {
      status: 200,
      data: {
        configured: isNeo4jConfigured(),
        uri: process.env.NEO4J_URI || null,
        database: process.env.NEO4J_DATABASE || 'neo4j',
      },
    };
  }

  async verify(config?: { uri?: string; username?: string; password?: string; database?: string }) {
    const result = await verifyNeo4jConnection(config?.uri ? (config as any) : undefined);
    return { status: 200, data: result };
  }

  async updateConfig(config: { uri: string; username?: string; password: string; database?: string }) {
    const { uri, username, password, database } = config;
    if (!uri || !password) {
      return { status: 400, data: { error: 'NEO4J_URI and NEO4J_PASSWORD are required.' } };
    }

    updateNeo4jCredentials({ uri, username: username || 'neo4j', password, database: database || 'neo4j' });
    const verifyRes = await verifyNeo4jConnection();

    if (verifyRes.success) {
      return {
        status: 200,
        data: {
          success: true,
          message: 'Neo4j connection verified and saved for session!',
          details: verifyRes.details,
        },
      };
    } else {
      return {
        status: 400,
        data: {
          success: false,
          error: verifyRes.message,
        },
      };
    }
  }

  async getGraph(userId: string) {
    const graphData = await getNeo4jGraphOverview(userId);
    return { status: 200, data: graphData };
  }
}

export const neo4jService = new Neo4jService();
