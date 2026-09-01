import { createClient } from '@libsql/client';

const required = ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN'];
for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing ${name}`);
}

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

try {
  const tables = await client.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'silpo_mcp_trace'",
  );
  if (tables.rows.length === 0) {
    console.log('No Silpo MCP trace table exists yet.');
    process.exitCode = 0;
  } else {
    const result = await client.execute(`
      SELECT operation, status, duration_ms, request_keys, result_summary, created_at
      FROM silpo_mcp_trace
      ORDER BY created_at DESC
      LIMIT 100
    `);
    if (result.rows.length === 0) console.log('No Silpo MCP trace entries yet.');
    for (const row of result.rows.reverse()) {
      const keys = JSON.parse(String(row.request_keys));
      console.log(
        [
          String(row.created_at),
          String(row.status).toUpperCase(),
          String(row.operation),
          `${Number(row.duration_ms)} ms`,
          keys.length > 0 ? `keys=${keys.join(',')}` : 'keys=none',
          String(row.result_summary),
        ].join(' | '),
      );
    }
  }
} finally {
  client.close();
}
