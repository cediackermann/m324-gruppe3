import type { SQL } from "bun";

/**
 * A minimal stand-in for Bun's `SQL` tagged-template client, just enough for
 * code that runs one query (like the readiness probe) to call it. Avoids
 * needing a real Postgres connection in a unit test.
 *
 * @param respond what every "query" resolves to; throw inside it to simulate
 *   a connection failure
 */
export function fakeSql(respond: () => unknown[] = () => []): SQL {
  return (async () => respond()) as unknown as SQL;
}
