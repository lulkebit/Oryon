mod schema;

use rusqlite::Connection;
use std::path::Path;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum DbError {
    #[error("SQLite error: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("Migration error: {0}")]
    Migration(String),
}

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new(path: &Path) -> Result<Self, DbError> {
        let conn = Connection::open(path)?;
        conn.execute_batch("PRAGMA journal_mode=WAL;")?;
        conn.execute_batch("PRAGMA foreign_keys=ON;")?;

        let mut db = Self { conn };
        db.run_migrations()?;
        Ok(db)
    }

    fn run_migrations(&mut self) -> Result<(), DbError> {
        self.conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS schema_migrations (
                version    INTEGER PRIMARY KEY,
                applied_at TEXT NOT NULL
            );",
        )?;

        let current_version: i32 = self
            .conn
            .query_row(
                "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);

        let migrations = schema::migrations();
        for (version, sql) in migrations {
            if version > current_version {
                let tx = self.conn.transaction()?;
                tx.execute_batch(sql)?;
                tx.execute(
                    "INSERT INTO schema_migrations (version, applied_at) VALUES (?1, datetime('now'))",
                    [version],
                )?;
                tx.commit()?;
                log::info!("Applied migration v{version}");
            }
        }

        Ok(())
    }

    pub fn get_setting(&self, key: &str) -> Result<Option<String>, DbError> {
        let mut stmt = self
            .conn
            .prepare("SELECT value FROM settings WHERE key = ?1")?;
        let result = stmt
            .query_row([key], |row| row.get::<_, String>(0))
            .ok();
        Ok(result)
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<(), DbError> {
        self.conn.execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = ?2",
            [key, value],
        )?;
        Ok(())
    }
}
