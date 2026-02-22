/**
 * transcript-db.ts
 *
 * Lightweight SQLite-backed persistence for interview transcript chunks.
 * Uses the "better-sqlite3" driver (sync, zero-dependency, fast).
 *
 * The database file lives at <project-root>/.data/transcripts.db and is
 * created automatically on first use.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TranscriptRow {
    id: number;
    candidate_id: string;
    speaker: string;
    text: string;
    timestamp: number;
    created_at: string;
}

// ---------------------------------------------------------------------------
// Database singleton
// ---------------------------------------------------------------------------

const DB_DIR = path.resolve(process.cwd(), '.data');
const DB_PATH = path.join(DB_DIR, 'transcripts.db');

let _db: Database.Database | null = null;

function getDb(): Database.Database {
    if (_db) return _db;

    // Ensure the .data directory exists
    if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
    }

    _db = new Database(DB_PATH);

    // WAL mode for better concurrent read performance
    _db.pragma('journal_mode = WAL');

    // Create table if it doesn't exist
    _db.exec(`
    CREATE TABLE IF NOT EXISTS transcript_chunks (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id  TEXT    NOT NULL,
      speaker       TEXT    NOT NULL,
      text          TEXT    NOT NULL,
      timestamp     REAL    NOT NULL DEFAULT 0,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_candidate
      ON transcript_chunks(candidate_id);

    CREATE INDEX IF NOT EXISTS idx_candidate_ts
      ON transcript_chunks(candidate_id, timestamp);
  `);

    return _db;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Insert a single transcript chunk into the database.
 */
export function insertChunk(
    candidateId: string,
    speaker: string,
    text: string,
    timestamp: number,
): TranscriptRow {
    const db = getDb();

    const stmt = db.prepare(`
    INSERT INTO transcript_chunks (candidate_id, speaker, text, timestamp)
    VALUES (?, ?, ?, ?)
  `);

    const info = stmt.run(candidateId, speaker, text, timestamp);

    return {
        id: info.lastInsertRowid as number,
        candidate_id: candidateId,
        speaker,
        text,
        timestamp,
        created_at: new Date().toISOString(),
    };
}

/**
 * Retrieve all transcript chunks for a candidate, ordered by timestamp.
 */
export function getChunksForCandidate(candidateId: string): TranscriptRow[] {
    const db = getDb();
    const stmt = db.prepare(`
    SELECT * FROM transcript_chunks
    WHERE candidate_id = ?
    ORDER BY timestamp ASC, id ASC
  `);
    return stmt.all(candidateId) as TranscriptRow[];
}

/**
 * Build a full transcript string for a candidate from all stored chunks.
 */
export function buildTranscript(candidateId: string): string {
    const chunks = getChunksForCandidate(candidateId);
    return chunks.map((c) => `[${c.speaker}] ${c.text}`).join('\n');
}

/**
 * Count how many chunks exist for a candidate.
 */
export function countChunks(candidateId: string): number {
    const db = getDb();
    const row = db
        .prepare('SELECT COUNT(*) as cnt FROM transcript_chunks WHERE candidate_id = ?')
        .get(candidateId) as { cnt: number };
    return row.cnt;
}
