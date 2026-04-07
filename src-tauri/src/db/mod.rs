mod schema;
pub mod types;

use rusqlite::Connection;
use std::path::Path;
use thiserror::Error;
use types::{Agent, Chat, Message, StoredModel, Workspace};

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

    // ── Settings ─────────────────────────────────────────

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

    // ── Workspaces ───────────────────────────────────────

    pub fn list_workspaces(&self) -> Result<Vec<Workspace>, DbError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, path, created_at, updated_at, last_opened, sort_order
             FROM workspaces ORDER BY sort_order, name",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(Workspace {
                id: row.get(0)?,
                name: row.get(1)?,
                path: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
                last_opened: row.get(5)?,
                sort_order: row.get(6)?,
            })
        })?;
        rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
    }

    pub fn create_workspace(&self, name: &str, path: &str) -> Result<Workspace, DbError> {
        let id = uuid::Uuid::now_v7().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        self.conn.execute(
            "INSERT INTO workspaces (id, name, path, created_at, updated_at, last_opened, sort_order)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0)",
            rusqlite::params![id, name, path, now, now, now],
        )?;
        Ok(Workspace {
            id,
            name: name.to_string(),
            path: path.to_string(),
            created_at: now.clone(),
            updated_at: now.clone(),
            last_opened: Some(now),
            sort_order: 0,
        })
    }

    pub fn get_workspace(&self, id: &str) -> Result<Option<Workspace>, DbError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, path, created_at, updated_at, last_opened, sort_order
             FROM workspaces WHERE id = ?1",
        )?;
        let mut rows = stmt.query_map([id], |row| {
            Ok(Workspace {
                id: row.get(0)?,
                name: row.get(1)?,
                path: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
                last_opened: row.get(5)?,
                sort_order: row.get(6)?,
            })
        })?;
        match rows.next() {
            Some(Ok(w)) => Ok(Some(w)),
            Some(Err(e)) => Err(e.into()),
            None => Ok(None),
        }
    }

    pub fn rename_workspace(&self, id: &str, name: &str) -> Result<(), DbError> {
        let now = chrono::Utc::now().to_rfc3339();
        self.conn.execute(
            "UPDATE workspaces SET name = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![name, now, id],
        )?;
        Ok(())
    }

    pub fn delete_workspace(&self, id: &str) -> Result<(), DbError> {
        self.conn
            .execute("DELETE FROM workspaces WHERE id = ?1", [id])?;
        Ok(())
    }

    // ── Chats ────────────────────────────────────────────

    pub fn list_all_chats(&self) -> Result<Vec<Chat>, DbError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, workspace_id, title, created_at, updated_at, is_archived
             FROM chats WHERE is_archived = 0
             ORDER BY updated_at DESC",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(Chat {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                title: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
                is_archived: row.get::<_, i32>(5)? != 0,
            })
        })?;
        rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
    }

    pub fn get_chat(&self, id: &str) -> Result<Option<Chat>, DbError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, workspace_id, title, created_at, updated_at, is_archived
             FROM chats WHERE id = ?1",
        )?;
        let mut rows = stmt.query_map([id], |row| {
            Ok(Chat {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                title: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
                is_archived: row.get::<_, i32>(5)? != 0,
            })
        })?;
        match rows.next() {
            Some(Ok(c)) => Ok(Some(c)),
            Some(Err(e)) => Err(e.into()),
            None => Ok(None),
        }
    }

    pub fn create_chat(&self, workspace_id: &str, title: &str) -> Result<Chat, DbError> {
        let id = uuid::Uuid::now_v7().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        self.conn.execute(
            "INSERT INTO chats (id, workspace_id, title, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![id, workspace_id, title, now, now],
        )?;
        Ok(Chat {
            id,
            workspace_id: workspace_id.to_string(),
            title: title.to_string(),
            created_at: now.clone(),
            updated_at: now,
            is_archived: false,
        })
    }

    pub fn rename_chat(&self, id: &str, title: &str) -> Result<(), DbError> {
        let now = chrono::Utc::now().to_rfc3339();
        self.conn.execute(
            "UPDATE chats SET title = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![title, now, id],
        )?;
        Ok(())
    }

    pub fn delete_chat(&self, id: &str) -> Result<(), DbError> {
        self.conn
            .execute("DELETE FROM chats WHERE id = ?1", [id])?;
        Ok(())
    }

    // ── Messages ─────────────────────────────────────────

    pub fn list_messages(&self, chat_id: &str) -> Result<Vec<Message>, DbError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, chat_id, agent_id, role, content, metadata, created_at, sort_order
             FROM messages WHERE chat_id = ?1 ORDER BY sort_order",
        )?;
        let rows = stmt.query_map([chat_id], |row| {
            Ok(Message {
                id: row.get(0)?,
                chat_id: row.get(1)?,
                agent_id: row.get(2)?,
                role: row.get(3)?,
                content: row.get(4)?,
                metadata: row.get(5)?,
                created_at: row.get(6)?,
                sort_order: row.get(7)?,
            })
        })?;
        rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
    }

    pub fn create_message(
        &self,
        chat_id: &str,
        role: &str,
        content: &str,
        agent_id: Option<&str>,
        metadata: Option<&str>,
    ) -> Result<Message, DbError> {
        let id = uuid::Uuid::now_v7().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        let sort_order: i32 = self.conn.query_row(
            "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM messages WHERE chat_id = ?1",
            [chat_id],
            |row| row.get(0),
        )?;

        self.conn.execute(
            "INSERT INTO messages (id, chat_id, agent_id, role, content, metadata, created_at, sort_order)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![id, chat_id, agent_id, role, content, metadata, now, sort_order],
        )?;

        self.conn.execute(
            "UPDATE chats SET updated_at = ?1 WHERE id = ?2",
            [&now, chat_id],
        )?;

        Ok(Message {
            id,
            chat_id: chat_id.to_string(),
            agent_id: agent_id.map(String::from),
            role: role.to_string(),
            content: content.to_string(),
            metadata: metadata.map(String::from),
            created_at: now,
            sort_order,
        })
    }

    // ── Models ───────────────────────────────────────────

    pub fn save_model(
        &self,
        model_id: &str,
        filename: &str,
        hf_repo_id: &str,
        file_size: u64,
        storage_path: &str,
        sha256: Option<&str>,
    ) -> Result<(), DbError> {
        let now = chrono::Utc::now().to_rfc3339();
        let name = filename
            .strip_suffix(".gguf")
            .unwrap_or(filename)
            .to_string();
        self.conn.execute(
            "INSERT OR REPLACE INTO models (id, name, filename, hf_repo_id, file_size, storage_path, sha256, downloaded_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![model_id, name, filename, hf_repo_id, file_size as i64, storage_path, sha256, now],
        )?;
        Ok(())
    }

    pub fn list_models(&self) -> Result<Vec<StoredModel>, DbError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, filename, hf_repo_id, file_size, storage_path, downloaded_at
             FROM models ORDER BY downloaded_at DESC",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(StoredModel {
                id: row.get(0)?,
                name: row.get(1)?,
                filename: row.get(2)?,
                hf_repo_id: row.get(3)?,
                file_size: row.get::<_, i64>(4)? as u64,
                storage_path: row.get(5)?,
                downloaded_at: row.get(6)?,
            })
        })?;
        rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
    }

    pub fn get_model(&self, id: &str) -> Result<Option<StoredModel>, DbError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, filename, hf_repo_id, file_size, storage_path, downloaded_at
             FROM models WHERE id = ?1",
        )?;
        let result = stmt
            .query_row([id], |row| {
                Ok(StoredModel {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    filename: row.get(2)?,
                    hf_repo_id: row.get(3)?,
                    file_size: row.get::<_, i64>(4)? as u64,
                    storage_path: row.get(5)?,
                    downloaded_at: row.get(6)?,
                })
            })
            .ok();
        Ok(result)
    }

    pub fn delete_model(&self, id: &str) -> Result<(), DbError> {
        self.conn.execute("DELETE FROM models WHERE id = ?1", [id])?;
        Ok(())
    }

    // ── Agents ────────────────────────────────────────────

    pub fn list_agents(&self) -> Result<Vec<Agent>, DbError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, model_id, system_prompt, tools, temperature,
                    max_tokens, color, created_at, updated_at
             FROM agents ORDER BY created_at",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(Agent {
                id: row.get(0)?,
                name: row.get(1)?,
                model_id: row.get(2)?,
                system_prompt: row.get(3)?,
                tools: row.get(4)?,
                temperature: row.get(5)?,
                max_tokens: row.get(6)?,
                color: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })?;
        rows.collect::<Result<Vec<_>, _>>().map_err(Into::into)
    }

    pub fn get_agent(&self, id: &str) -> Result<Option<Agent>, DbError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, model_id, system_prompt, tools, temperature,
                    max_tokens, color, created_at, updated_at
             FROM agents WHERE id = ?1",
        )?;
        let mut rows = stmt.query_map([id], |row| {
            Ok(Agent {
                id: row.get(0)?,
                name: row.get(1)?,
                model_id: row.get(2)?,
                system_prompt: row.get(3)?,
                tools: row.get(4)?,
                temperature: row.get(5)?,
                max_tokens: row.get(6)?,
                color: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })?;
        match rows.next() {
            Some(Ok(a)) => Ok(Some(a)),
            Some(Err(e)) => Err(e.into()),
            None => Ok(None),
        }
    }

    pub fn create_agent(
        &self,
        name: &str,
        system_prompt: &str,
        tools: &str,
        temperature: f64,
        max_tokens: i32,
        color: &str,
    ) -> Result<Agent, DbError> {
        let id = uuid::Uuid::now_v7().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        self.conn.execute(
            "INSERT INTO agents (id, name, system_prompt, tools, temperature, max_tokens, color, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            rusqlite::params![id, name, system_prompt, tools, temperature, max_tokens, color, now, now],
        )?;
        Ok(Agent {
            id,
            name: name.to_string(),
            model_id: None,
            system_prompt: system_prompt.to_string(),
            tools: tools.to_string(),
            temperature,
            max_tokens,
            color: color.to_string(),
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub fn update_agent(
        &self,
        id: &str,
        name: &str,
        system_prompt: &str,
        tools: &str,
        temperature: f64,
        max_tokens: i32,
        color: &str,
        model_id: Option<&str>,
    ) -> Result<(), DbError> {
        let now = chrono::Utc::now().to_rfc3339();
        self.conn.execute(
            "UPDATE agents SET name=?1, system_prompt=?2, tools=?3, temperature=?4,
             max_tokens=?5, color=?6, model_id=?7, updated_at=?8 WHERE id=?9",
            rusqlite::params![name, system_prompt, tools, temperature, max_tokens, color, model_id, now, id],
        )?;
        Ok(())
    }

    pub fn delete_agent(&self, id: &str) -> Result<(), DbError> {
        self.conn
            .execute("DELETE FROM agents WHERE id = ?1", [id])?;
        Ok(())
    }

    pub fn ensure_default_agent(&self) -> Result<Agent, DbError> {
        let agents = self.list_agents()?;
        if let Some(a) = agents.into_iter().next() {
            return Ok(a);
        }
        let default_tools = r#"["file_read","file_write","file_create","file_patch","file_delete","glob","grep","shell_exec","git_status","git_diff","git_commit","git_log"]"#;
        self.create_agent(
            "Oryon",
            "You are a helpful AI coding assistant. Answer concisely and accurately. Use the given tool calls as much as possible and wisely.",
            default_tools,
            0.7,
            4096,
            "#C2D8C4",
        )
    }

    pub fn get_chat_agent(&self, chat_id: &str) -> Result<Option<Agent>, DbError> {
        let mut stmt = self.conn.prepare(
            "SELECT a.id, a.name, a.model_id, a.system_prompt, a.tools, a.temperature,
                    a.max_tokens, a.color, a.created_at, a.updated_at
             FROM agents a JOIN chat_agents ca ON a.id = ca.agent_id
             WHERE ca.chat_id = ?1 AND ca.is_active = 1
             LIMIT 1",
        )?;
        let mut rows = stmt.query_map([chat_id], |row| {
            Ok(Agent {
                id: row.get(0)?,
                name: row.get(1)?,
                model_id: row.get(2)?,
                system_prompt: row.get(3)?,
                tools: row.get(4)?,
                temperature: row.get(5)?,
                max_tokens: row.get(6)?,
                color: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })?;
        match rows.next() {
            Some(Ok(a)) => Ok(Some(a)),
            Some(Err(e)) => Err(e.into()),
            None => Ok(None),
        }
    }

    pub fn set_chat_agent(&self, chat_id: &str, agent_id: &str) -> Result<(), DbError> {
        let now = chrono::Utc::now().to_rfc3339();
        self.conn.execute(
            "UPDATE chat_agents SET is_active = 0 WHERE chat_id = ?1",
            [chat_id],
        )?;
        self.conn.execute(
            "INSERT OR REPLACE INTO chat_agents (chat_id, agent_id, added_at, is_active)
             VALUES (?1, ?2, ?3, 1)",
            rusqlite::params![chat_id, agent_id, now],
        )?;
        Ok(())
    }
}
