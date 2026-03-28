import Database from 'better-sqlite3'

const db = new Database('chess.db')

db.exec(`
  CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    player_white TEXT NOT NULL,
    player_black TEXT NOT NULL,
    result TEXT,
    moves TEXT,
    created_at INTEGER DEFAULT (unixepoch()),
    ended_at INTEGER
  )
`)

export default db