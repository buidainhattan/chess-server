import BetterSqlite3 from "better-sqlite3";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const db: BetterSqlite3.Database = new BetterSqlite3(
  resolve(__dirname, "../../data/chess.db"),
);

db.exec(
  `
  CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    player_white TEXT NOT NULL,
    player_black TEXT NOT NULL,
    winner TEXT,
    result TEXT,
    moves TEXT,
    started_at TEXT NOT NULL,
    ended_at TEXT NOT NULL,
  )
`,
);

export default db;
