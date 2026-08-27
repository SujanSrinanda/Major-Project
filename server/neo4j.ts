import neo4j, { Driver, Session } from 'neo4j-driver';

let driver: Driver | null = null;
let currentConfig = {
  uri: process.env.NEO4J_URI || '',
  username: process.env.NEO4J_USERNAME || process.env.NEO4J_USER || '',
  password: process.env.NEO4J_PASSWORD || '',
  database: process.env.NEO4J_DATABASE || 'neo4j',
};

export function isNeo4jConfigured(): boolean {
  const uri = process.env.NEO4J_URI || currentConfig.uri;
  const password = process.env.NEO4J_PASSWORD || currentConfig.password;
  return Boolean(uri && uri.trim() !== '' && password && password.trim() !== '');
}

export function updateNeo4jCredentials(config: {
  uri?: string;
  username?: string;
  password?: string;
  database?: string;
}) {
  if (config.uri !== undefined) currentConfig.uri = config.uri;
  if (config.username !== undefined) currentConfig.username = config.username;
  if (config.password !== undefined) currentConfig.password = config.password;
  if (config.database !== undefined) currentConfig.database = config.database;

  // Reset driver so next call re-initializes
  if (driver) {
    driver.close().catch(() => {});
    driver = null;
  }
}

export function getNeo4jDriver(): Driver | null {
  if (driver) return driver;

  const uri = process.env.NEO4J_URI || currentConfig.uri;
  const username = process.env.NEO4J_USERNAME || process.env.NEO4J_USER || currentConfig.username || 'neo4j';
  const password = process.env.NEO4J_PASSWORD || currentConfig.password;

  if (!uri || !password) {
    return null;
  }

  try {
    driver = neo4j.driver(
      uri,
      neo4j.auth.basic(username, password),
      {
        maxConnectionLifetime: 3 * 60 * 1000,
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 5000,
      }
    );
    return driver;
  } catch (err) {
    console.error('Failed to create Neo4j driver:', err);
    return null;
  }
}

export async function verifyNeo4jConnection(customConfig?: {
  uri: string;
  username: string;
  password: string;
  database?: string;
}): Promise<{ success: boolean; message: string; details?: any }> {
  let testDriver: Driver | null = null;
  try {
    const uri = customConfig?.uri || process.env.NEO4J_URI || currentConfig.uri;
    const username = customConfig?.username || process.env.NEO4J_USERNAME || process.env.NEO4J_USER || currentConfig.username || 'neo4j';
    const password = customConfig?.password || process.env.NEO4J_PASSWORD || currentConfig.password;
    const dbName = customConfig?.database || process.env.NEO4J_DATABASE || currentConfig.database || 'neo4j';

    if (!uri || !password) {
      return {
        success: false,
        message: 'Neo4j connection credentials are incomplete. Please provide NEO4J_URI and NEO4J_PASSWORD.',
      };
    }

    testDriver = neo4j.driver(
      uri,
      neo4j.auth.basic(username, password),
      {
        connectionTimeout: 4000,
        connectionAcquisitionTimeout: 4000,
      }
    );
    const session = testDriver.session({ database: dbName });

    let apocVersion = 'N/A';
    try {
      const result = await session.run('RETURN 1 as check, apoc.version() as apocVersion');
      apocVersion = result.records[0]?.get('apocVersion') || 'N/A';
    } catch {
      await session.run('RETURN 1 as check');
    } finally {
      await session.close();
    }

    // If custom config passed, save it as current config
    if (customConfig) {
      updateNeo4jCredentials(customConfig);
    }

    return {
      success: true,
      message: 'Successfully connected to Neo4j instance!',
      details: {
        uri,
        database: dbName,
        apocVersion,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to connect to Neo4j: ${err.message || String(err)}`,
    };
  } finally {
    if (testDriver) {
      testDriver.close().catch(() => {});
    }
  }
}

export async function initNeo4jConstraints(): Promise<boolean> {
  const drv = getNeo4jDriver();
  if (!drv) return false;

  const session = drv.session({ database: currentConfig.database || 'neo4j' });
  try {
    await session.run('CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE');
    await session.run('CREATE CONSTRAINT account_phone_unique IF NOT EXISTS FOR (a:Account) REQUIRE a.phone IS UNIQUE');
    await session.run('CREATE CONSTRAINT tx_id_unique IF NOT EXISTS FOR (t:Transaction) REQUIRE t.id IS UNIQUE');
    return true;
  } catch (err) {
    console.warn('Neo4j constraint creation info:', err);
    return false;
  } finally {
    await session.close();
  }
}

export async function storeUserInNeo4j(user: {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  city?: string;
}): Promise<boolean> {
  const drv = getNeo4jDriver();
  if (!drv) return false;

  const session = drv.session({ database: currentConfig.database || 'neo4j' });
  try {
    const query = `
      MERGE (u:User {id: $id})
      SET u.fullName = $fullName,
          u.email = $email,
          u.phone = $phone,
          u.city = $city,
          u.updatedAt = datetime()
      MERGE (a:Account {phone: $phone})
      SET a.name = $fullName,
          a.ownerId = $id,
          a.type = 'USER_ACCOUNT'
      MERGE (u)-[:OWNS_ACCOUNT]->(a)
    `;
    await session.run(query, {
      id: user.id,
      fullName: user.fullName || 'User',
      email: user.email || '',
      phone: user.phone || '',
      city: user.city || '',
    });
    return true;
  } catch (err) {
    console.error('Error storing user in Neo4j:', err);
    return false;
  } finally {
    await session.close();
  }
}

export async function storeTransactionInNeo4j(tx: {
  id: string;
  userId: string;
  senderName?: string;
  senderPhone?: string;
  recipientName: string;
  recipientPhone: string;
  amount: number;
  note?: string;
  category?: string;
  type?: string;
  status?: string;
  decision?: string;
  safetyScore?: number;
  riskLevel?: string;
  reasons?: string[];
  timestamp?: string;
}): Promise<boolean> {
  const drv = getNeo4jDriver();
  if (!drv) {
    console.log('[Neo4j] Driver not initialized - skipping Neo4j write. (Provide credentials via /api/neo4j/config or env vars)');
    return false;
  }

  const session = drv.session({ database: currentConfig.database || 'neo4j' });
  try {
    const senderPhone = tx.senderPhone || 'user-' + tx.userId;
    const senderName = tx.senderName || 'Sender (' + tx.userId + ')';
    const recipientPhone = tx.recipientPhone || 'unknown-' + Date.now();
    const recipientName = tx.recipientName || 'Recipient';
    const timestamp = tx.timestamp || new Date().toISOString();

    const query = `
      // Merge Sender Account Node
      MERGE (sender:Account {phone: $senderPhone})
      ON CREATE SET sender.name = $senderName, sender.created = datetime()
      ON MATCH SET sender.name = coalesce($senderName, sender.name)

      // Merge Recipient Account Node
      MERGE (recipient:Account {phone: $recipientPhone})
      ON CREATE SET recipient.name = $recipientName, recipient.created = datetime()
      ON MATCH SET recipient.name = coalesce($recipientName, recipient.name)

      // Merge User Node if available
      MERGE (u:User {id: $userId})
      MERGE (u)-[:OWNS_ACCOUNT]->(sender)

      // Create Transaction Node
      MERGE (t:Transaction {id: $txId})
      SET t.amount = $amount,
          t.note = $note,
          t.category = $category,
          t.type = $type,
          t.status = $status,
          t.decision = $decision,
          t.safetyScore = $safetyScore,
          t.riskLevel = $riskLevel,
          t.timestamp = $timestamp,
          t.reasons = $reasons

      // Relationships
      MERGE (sender)-[:INITIATED]->(t)
      MERGE (t)-[:PAYEE]->(recipient)

      // Direct Payment Link between accounts
      CREATE (sender)-[r:TRANSFERRED_FUNDS {
        txId: $txId,
        amount: $amount,
        timestamp: $timestamp,
        riskLevel: $riskLevel,
        safetyScore: $safetyScore,
        decision: $decision
      }]->(recipient)
    `;

    const runPromise = session.run(query, {
      txId: tx.id,
      userId: tx.userId,
      senderPhone,
      senderName,
      recipientPhone,
      recipientName,
      amount: Number(tx.amount) || 0,
      note: tx.note || '',
      category: tx.category || 'Other',
      type: tx.type || 'PAYMENT',
      status: tx.status || 'COMPLETED',
      decision: tx.decision || 'ALLOW',
      safetyScore: Number(tx.safetyScore) || 90,
      riskLevel: tx.riskLevel || 'LOW',
      reasons: tx.reasons || [],
      timestamp,
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Neo4j write timed out (unreachable host)')), 2000)
    );

    await Promise.race([runPromise, timeoutPromise]);

    console.log(`[Neo4j] Transaction ${tx.id} successfully recorded in graph!`);
    return true;
  } catch (err: any) {
    console.warn('[Neo4j] Graph write skipped:', err?.message || String(err));
    return false;
  } finally {
    await session.close();
  }
}

export async function getNeo4jGraphOverview(userId?: string): Promise<{
  nodes: Array<{ id: string; label: string; name: string; type: string; riskScore?: number }>;
  edges: Array<{ id: string; source: string; target: string; label: string; amount?: number; riskLevel?: string }>;
  summary: { totalAccounts: number; totalTransactions: number; totalHighRisk: number; connected: boolean };
}> {
  const drv = getNeo4jDriver();
  if (!drv) {
    return {
      nodes: [],
      edges: [],
      summary: { totalAccounts: 0, totalTransactions: 0, totalHighRisk: 0, connected: false },
    };
  }

  const session = drv.session({ database: currentConfig.database || 'neo4j' });
  try {
    const nodesMap = new Map<string, any>();
    const edgesList: any[] = [];

    // Fetch accounts and transactions
    const query = `
      MATCH (a:Account)-[r:TRANSFERRED_FUNDS]->(b:Account)
      RETURN a.phone as srcPhone, a.name as srcName, 
             b.phone as tgtPhone, b.name as tgtName,
             r.txId as txId, r.amount as amount, r.riskLevel as riskLevel, r.safetyScore as safetyScore
      LIMIT 100
    `;

    const result = await session.run(query);

    let highRiskCount = 0;
    result.records.forEach((record) => {
      const srcPhone = record.get('srcPhone');
      const srcName = record.get('srcName') || srcPhone;
      const tgtPhone = record.get('tgtPhone');
      const tgtName = record.get('tgtName') || tgtPhone;
      const txId = record.get('txId');
      const amount = record.get('amount') ? (record.get('amount').toNumber ? record.get('amount').toNumber() : record.get('amount')) : 0;
      const riskLevel = record.get('riskLevel') || 'LOW';

      if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') highRiskCount++;

      if (!nodesMap.has(srcPhone)) {
        nodesMap.set(srcPhone, {
          id: srcPhone,
          label: srcName,
          name: srcName,
          type: 'Account',
          phone: srcPhone,
        });
      }

      if (!nodesMap.has(tgtPhone)) {
        nodesMap.set(tgtPhone, {
          id: tgtPhone,
          label: tgtName,
          name: tgtName,
          type: 'Account',
          phone: tgtPhone,
        });
      }

      edgesList.push({
        id: txId || `edge-${srcPhone}-${tgtPhone}-${Math.random()}`,
        source: srcPhone,
        target: tgtPhone,
        label: `₹${amount}`,
        amount,
        riskLevel,
      });
    });

    return {
      nodes: Array.from(nodesMap.values()),
      edges: edgesList,
      summary: {
        totalAccounts: nodesMap.size,
        totalTransactions: edgesList.length,
        totalHighRisk: highRiskCount,
        connected: true,
      },
    };
  } catch (err) {
    console.error('Error querying Neo4j graph overview:', err);
    return {
      nodes: [],
      edges: [],
      summary: { totalAccounts: 0, totalTransactions: 0, totalHighRisk: 0, connected: false },
    };
  } finally {
    await session.close();
  }
}
