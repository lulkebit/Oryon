use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    io::{Read, Write},
    sync::{Arc, Mutex},
};
use tauri::{AppHandle, Emitter, State};
use uuid::Uuid;

pub struct PtyHandle {
    pub id: String,
    pub title: String,
    pub cwd: String,
    pub shell: String,
    pub writer: Mutex<Box<dyn Write + Send>>,
    pub master: Mutex<Box<dyn MasterPty + Send>>,
    pub child: Mutex<Box<dyn Child + Send + Sync>>,
}

pub struct PtyState {
    pub sessions: Mutex<HashMap<String, Arc<PtyHandle>>>,
}

impl Default for PtyState {
    fn default() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PtySessionInfo {
    pub id: String,
    pub title: String,
    pub cwd: String,
    pub shell: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct PtyDataPayload {
    session_id: String,
    data: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct PtyExitPayload {
    session_id: String,
    code: Option<i32>,
}

fn detect_shell() -> String {
    std::env::var("SHELL").unwrap_or_else(|_| {
        if cfg!(target_os = "windows") {
            "cmd.exe".to_string()
        } else {
            "/bin/zsh".to_string()
        }
    })
}

#[tauri::command]
pub fn pty_create(
    app_handle: AppHandle,
    state: State<'_, PtyState>,
    cwd: String,
    cols: u16,
    rows: u16,
    shell: Option<String>,
) -> Result<PtySessionInfo, String> {
    let shell_path = shell.unwrap_or_else(detect_shell);
    let id = Uuid::new_v7(uuid::timestamp::Timestamp::now(uuid::NoContext)).to_string();

    let pty_system = native_pty_system();
    let pty_pair = pty_system
        .openpty(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Failed to open PTY: {e}"))?;

    let shell_name = std::path::Path::new(&shell_path)
        .file_name()
        .map(|f| f.to_string_lossy().to_string())
        .unwrap_or_else(|| shell_path.clone());

    let mut cmd = CommandBuilder::new(&shell_path);
    cmd.cwd(&cwd);
    cmd.env("TERM", "xterm-256color");
    cmd.env("COLORTERM", "truecolor");

    let child = pty_pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn shell: {e}"))?;

    let writer = pty_pair
        .master
        .take_writer()
        .map_err(|e| format!("Failed to get PTY writer: {e}"))?;

    let mut reader = pty_pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("Failed to get PTY reader: {e}"))?;

    let handle = Arc::new(PtyHandle {
        id: id.clone(),
        title: shell_name.clone(),
        cwd: cwd.clone(),
        shell: shell_path.clone(),
        writer: Mutex::new(writer),
        master: Mutex::new(pty_pair.master),
        child: Mutex::new(child),
    });

    // Insert into sessions map
    {
        let mut sessions = state.sessions.lock().map_err(|e| e.to_string())?;
        sessions.insert(id.clone(), Arc::clone(&handle));
    }

    // Spawn reader thread (runs independently, owns the reader)
    let session_id_thread = id.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) | Err(_) => {
                    let _ = app_handle.emit(
                        "pty:exit",
                        PtyExitPayload {
                            session_id: session_id_thread.clone(),
                            code: None,
                        },
                    );
                    break;
                }
                Ok(n) => {
                    let encoded = BASE64.encode(&buf[..n]);
                    let _ = app_handle.emit(
                        "pty:data",
                        PtyDataPayload {
                            session_id: session_id_thread.clone(),
                            data: encoded,
                        },
                    );
                }
            }
        }
    });

    Ok(PtySessionInfo {
        id,
        title: shell_name,
        cwd,
        shell: shell_path,
    })
}

#[tauri::command]
pub fn pty_write(
    state: State<'_, PtyState>,
    session_id: String,
    data: String,
) -> Result<(), String> {
    let sessions = state.sessions.lock().map_err(|e| e.to_string())?;
    let handle = sessions
        .get(&session_id)
        .ok_or_else(|| format!("Session not found: {session_id}"))?;

    let mut writer = handle.writer.lock().map_err(|e| e.to_string())?;
    writer
        .write_all(data.as_bytes())
        .map_err(|e| format!("Write error: {e}"))?;
    writer.flush().map_err(|e| format!("Flush error: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn pty_resize(
    state: State<'_, PtyState>,
    session_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let sessions = state.sessions.lock().map_err(|e| e.to_string())?;
    let handle = sessions
        .get(&session_id)
        .ok_or_else(|| format!("Session not found: {session_id}"))?;

    let master = handle.master.lock().map_err(|e| e.to_string())?;
    master
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Resize error: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn pty_kill(state: State<'_, PtyState>, session_id: String) -> Result<(), String> {
    let mut sessions = state.sessions.lock().map_err(|e| e.to_string())?;
    if let Some(handle) = sessions.remove(&session_id) {
        if let Ok(mut child) = handle.child.lock() {
            let _ = child.kill();
        }
    }
    Ok(())
}

#[tauri::command]
pub fn pty_list(state: State<'_, PtyState>) -> Result<Vec<PtySessionInfo>, String> {
    let sessions = state.sessions.lock().map_err(|e| e.to_string())?;
    let list = sessions
        .values()
        .map(|h| PtySessionInfo {
            id: h.id.clone(),
            title: h.title.clone(),
            cwd: h.cwd.clone(),
            shell: h.shell.clone(),
        })
        .collect();
    Ok(list)
}

