use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub path: String,
    pub created_at: String,
    pub updated_at: String,
    pub last_opened: Option<String>,
    pub sort_order: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Chat {
    pub id: String,
    pub workspace_id: String,
    pub title: String,
    pub created_at: String,
    pub updated_at: String,
    pub is_archived: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Message {
    pub id: String,
    pub chat_id: String,
    pub agent_id: Option<String>,
    pub role: String,
    pub content: String,
    pub metadata: Option<String>,
    pub created_at: String,
    pub sort_order: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StoredModel {
    pub id: String,
    pub name: String,
    pub filename: String,
    pub hf_repo_id: Option<String>,
    pub file_size: u64,
    pub storage_path: String,
    pub downloaded_at: String,
}
