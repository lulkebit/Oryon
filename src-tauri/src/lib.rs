mod commands;
mod db;

use db::Database;
use std::sync::Mutex;
use tauri::Manager;

pub struct AppState {
    pub db: Mutex<Database>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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
            std::fs::create_dir_all(&app_dir)
                .expect("failed to create app data dir");

            let db_path = app_dir.join("oryon.db");
            let database =
                Database::new(&db_path).expect("failed to initialize database");

            app.manage(AppState {
                db: Mutex::new(database),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_app_info,
            commands::get_theme,
            commands::set_theme,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
