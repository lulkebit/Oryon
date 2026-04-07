pub fn migrations() -> Vec<(i32, &'static str)> {
    vec![(1, MIGRATION_001)]
}

const MIGRATION_001: &str = "
CREATE TABLE workspaces (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    path        TEXT NOT NULL UNIQUE,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    last_opened TEXT,
    sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_workspaces_path ON workspaces(path);

CREATE TABLE chats (
    id            TEXT PRIMARY KEY,
    workspace_id  TEXT NOT NULL,
    title         TEXT NOT NULL DEFAULT 'New Chat',
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL,
    is_archived   INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX idx_chats_workspace ON chats(workspace_id, updated_at DESC);

CREATE TABLE messages (
    id          TEXT PRIMARY KEY,
    chat_id     TEXT NOT NULL,
    agent_id    TEXT,
    role        TEXT NOT NULL,
    content     TEXT NOT NULL,
    metadata    TEXT,
    created_at  TEXT NOT NULL,
    sort_order  INTEGER NOT NULL,
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_chat ON messages(chat_id, sort_order);
CREATE INDEX idx_messages_role ON messages(chat_id, role);

CREATE TABLE agents (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    model_id       TEXT,
    system_prompt  TEXT NOT NULL DEFAULT '',
    tools          TEXT NOT NULL DEFAULT '[]',
    temperature    REAL NOT NULL DEFAULT 0.7,
    max_tokens     INTEGER NOT NULL DEFAULT 4096,
    color          TEXT NOT NULL DEFAULT '#C2D8C4',
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL,
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE SET NULL
);

CREATE TABLE chat_agents (
    chat_id    TEXT NOT NULL,
    agent_id   TEXT NOT NULL,
    added_at   TEXT NOT NULL,
    is_active  INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (chat_id, agent_id),
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE TABLE models (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    filename        TEXT NOT NULL,
    hf_repo_id      TEXT,
    hf_filename     TEXT,
    file_size       INTEGER NOT NULL,
    quantization    TEXT,
    parameters      TEXT,
    architecture    TEXT,
    context_length  INTEGER,
    family          TEXT,
    license         TEXT,
    sha256          TEXT,
    downloaded_at   TEXT NOT NULL,
    last_used_at    TEXT,
    storage_path    TEXT NOT NULL
);

CREATE INDEX idx_models_family ON models(family);
CREATE INDEX idx_models_architecture ON models(architecture);

CREATE TABLE downloads (
    id              TEXT PRIMARY KEY,
    model_name      TEXT NOT NULL,
    hf_repo_id      TEXT NOT NULL,
    hf_filename     TEXT NOT NULL,
    url             TEXT NOT NULL,
    file_size       INTEGER NOT NULL,
    downloaded      INTEGER NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'queued',
    error_message   TEXT,
    sha256_expected TEXT,
    temp_path       TEXT NOT NULL,
    target_path     TEXT NOT NULL,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    queue_position  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_downloads_status ON downloads(status);

CREATE TABLE settings (
    key    TEXT PRIMARY KEY,
    value  TEXT NOT NULL
);

INSERT INTO settings (key, value) VALUES ('theme', '\"system\"');
INSERT INTO settings (key, value) VALUES ('sidebar_width', '260');
INSERT INTO settings (key, value) VALUES ('reduced_motion', 'false');
INSERT INTO settings (key, value) VALUES ('default_tools', '[\"file_read\",\"file_write\",\"file_create\",\"file_patch\",\"file_delete\",\"glob\",\"grep\",\"shell_exec\",\"git_status\",\"git_diff\",\"git_commit\",\"git_log\",\"web_fetch\",\"web_search\"]');
";
