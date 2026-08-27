import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { setupRoutes } from './server/routes/index';
import { errorHandler } from './server/middleware/errorHandler';
import { initDatabase } from './server/db/database';
import { validateAuthEnvironment } from './server/auth';
import { isNeo4jConfigured, initNeo4jConstraints, verifyNeo4jConnection } from './server/neo4j';

async function startServer() {
  // Validate critical security environment variables (e.g. AUTH_SECRET in production)
  validateAuthEnvironment();

  const app = express();
  const PORT = 3000;

  // Security: Remove X-Powered-By header
  app.disable('x-powered-by');

  app.use(express.json());

  // 1. Initialize SQLite Database & apply migrations
  try {
    await initDatabase();
  } catch (dbErr) {
    console.error('Failed to initialize database:', dbErr);
  }

  // 2. Neo4j Graph Database status check & initialization
  console.log('==================================================');
  if (isNeo4jConfigured()) {
    try {
      const neo4jStatus = await verifyNeo4jConnection();
      if (neo4jStatus.success) {
        console.log('✅ NEO4J STATUS: CONNECTED (Successfully connected to Neo4j graph database)');
        console.log(`   URI: ${process.env.NEO4J_URI}`);
        await initNeo4jConstraints();
      } else {
        console.log('❌ NEO4J STATUS: NOT CONNECTED');
        console.log(`   Reason: ${neo4jStatus.message}`);
        console.log('   Note: SentinelFin is running fully with local SQLite database.');
      }
    } catch (n4jErr: any) {
      console.log('❌ NEO4J STATUS: NOT CONNECTED');
      console.log(`   Reason: ${n4jErr?.message || String(n4jErr)}`);
      console.log('   Note: SentinelFin is running fully with local SQLite database.');
    }
  } else {
    console.log('❌ NEO4J STATUS: NOT CONNECTED');
    console.log('   Reason: Neo4j credentials (NEO4J_URI, NEO4J_PASSWORD) are not configured in environment variables.');
    console.log('   Note: SentinelFin is running fully with local SQLite database.');
  }
  console.log('==================================================');

  // 2. Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'SentinelFin Security Core' });
  });

  // 3. Register modular API feature routers
  setupRoutes(app);

  // 4. Centralized API Error Handling Middleware
  app.use('/api', errorHandler);

  // 5. Vite middleware in dev mode / Static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SentinelFin Server running on http://localhost:${PORT}`);
  });
}

startServer();
