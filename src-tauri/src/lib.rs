mod commands;
mod db;
mod engine;
mod hub;
pub mod tools;

use db::Database;
use std::sync::Mutex;
use tauri::Manager;

pub struct AppState {
    pub db: Mutex<Database>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let inference_engine =
        engine::Engine::spawn().expect("failed to start inference engine");
    let system_monitor = engine::hardware::SystemMonitor::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let app_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir");
            std::fs::create_dir_all(&app_dir).expect("failed to create app data dir");

            let db_path = app_dir.join("oryon.db");
            let database = Database::new(&db_path).expect("failed to initialize database");

            if let Err(e) = database.ensure_default_agent() {
                log::warn!("Failed to ensure default agent: {e}");
            }

            app.manage(AppState {
                db: Mutex::new(database),
            });

            Ok(())
        })
        .manage(inference_engine)
        .manage(system_monitor)
        .manage(commands::hub::DownloadState::new())
        .manage(commands::pty::PtyState::default())
        .invoke_handler(tauri::generate_handler![
            commands::get_app_info,
            commands::get_theme,
            commands::set_theme,
            commands::get_setting,
            commands::set_setting,
            commands::read_file_text,
            commands::list_workspaces,
            commands::create_workspace,
            commands::rename_workspace,
            commands::delete_workspace,
            commands::set_workspace_icon,
            commands::detect_workspace_icon,
            commands::list_all_chats,
            commands::create_chat,
            commands::rename_chat,
            commands::delete_chat,
            commands::list_messages,
            commands::create_message,
            commands::engine::load_model,
            commands::engine::unload_model,
            commands::engine::start_inference,
            commands::engine::stop_inference,
            commands::engine::get_engine_status,
            commands::engine::get_hardware_info,
            commands::engine::get_process_stats,
            commands::engine::get_context_budget,
            commands::engine::estimate_context,
            commands::hub::search_models,
            commands::hub::search_models_featured,
            commands::hub::download_model,
            commands::hub::pause_download,
            commands::hub::cancel_download,
            commands::hub::list_downloaded_models,
            commands::hub::delete_model,
            commands::tools::execute_tool,
            commands::tools::list_available_tools,
            commands::agent::list_agents,
            commands::agent::get_agent,
            commands::agent::create_agent,
            commands::agent::update_agent,
            commands::agent::delete_agent,
            commands::agent::get_chat_agent,
            commands::agent::set_chat_agent,
            commands::git::git_get_status,
            commands::git::git_get_file_diff,
            commands::fs_browse::fs_list_directory,
            commands::fs_browse::fs_read_file,
            commands::pty::pty_create,
            commands::pty::pty_write,
            commands::pty::pty_resize,
            commands::pty::pty_kill,
            commands::pty::pty_list,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
