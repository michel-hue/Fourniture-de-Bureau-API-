const { Client } = require('pg');

const candidates = [
  { host: 'aws-0-eu-west-1.pooler.supabase.com', port: 5432 },
  { host: 'aws-0-eu-central-1.pooler.supabase.com', port: 5432 },
  { host: 'db.srwbbxzetcwoxdhbecrf.supabase.co', port: 5432 },
];

const users = ['postgres.srwbbxzetcwoxdhbecrf', 'postgres'];

(async () => {
  for (const c of candidates) {
    for (const u of users) {
      const client = new Client({
        host: c.host,
        port: c.port,
        user: u,
        password: 'appfourniture',
        database: 'postgres',
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 8000,
      });
      try {
        await client.connect();
        const v = await client.query('select version(), current_user, current_database()');
        const t = await client.query(
          "select table_name from information_schema.tables where table_schema='public' order by table_name"
        );
        const cnt = await client.query(
          "select (select count(*) from users) as users, (select count(*) from produits) as produits, (select count(*) from categories) as cats"
        ).catch((e) => ({ rows: [{ error: e.message }] }));
        console.log(
          `OK  ${c.host}:${c.port} user=${u}\n    ${v.rows[0].version}\n    user=${v.rows[0].current_user} db=${v.rows[0].current_database}\n    tables=${t.rows.map((r) => r.table_name).join(', ') || 'AUCUNE'}\n    counts=${JSON.stringify(cnt.rows[0])}`
        );
        await client.end();
        return;
      } catch (e) {
        console.log(`KO  ${c.host}:${c.port} user=${u} -> ${e.message}`);
        await client.end().catch(() => {});
      }
    }
  }
})();
