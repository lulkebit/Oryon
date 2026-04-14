use crate::db::types::Workspace;
use crate::AppState;
use std::fs;
use std::path::Path;
use tauri::State;

/// Scan a workspace folder and return the best-matching icon id.
pub fn detect_icon(path: &str) -> String {
    let root = Path::new(path);

    // ── JavaScript / TypeScript ecosystem ─────────────────
    if root.join("package.json").exists() {
        if let Ok(pkg) = fs::read_to_string(root.join("package.json")) {
            // Check for specific frameworks before generic React/JS
            if pkg.contains("\"next\":") {
                return "nextjs".into();
            }
            if pkg.contains("\"@angular/core\"") {
                return "angular".into();
            }
            if pkg.contains("\"@sveltejs/kit\"") || pkg.contains("\"svelte\":") {
                return "svelte".into();
            }
            if pkg.contains("\"astro\":") {
                return "astro".into();
            }
            if pkg.contains("\"vue\":") || pkg.contains("\"@vue/") {
                return "vue".into();
            }
            if pkg.contains("\"react\":") || pkg.contains("\"react-dom\":") {
                return "react".into();
            }
            if root.join("tsconfig.json").exists() {
                return "typescript".into();
            }
            return "javascript".into();
        }
    }

    if root.join("tsconfig.json").exists() {
        return "typescript".into();
    }

    // ── Systems / compiled languages ──────────────────────
    if root.join("Cargo.toml").exists() {
        return "rust".into();
    }
    if root.join("go.mod").exists() {
        return "go".into();
    }

    // ── Python ────────────────────────────────────────────
    if root.join("pyproject.toml").exists()
        || root.join("requirements.txt").exists()
        || root.join("setup.py").exists()
        || root.join("Pipfile").exists()
        || root.join("uv.lock").exists()
        || root.join("poetry.lock").exists()
    {
        return "python".into();
    }

    // ── JVM ───────────────────────────────────────────────
    if root.join("build.gradle.kts").exists() {
        return "kotlin".into();
    }
    if root.join("pom.xml").exists() || root.join("build.gradle").exists() {
        return "java".into();
    }

    // ── Other languages ───────────────────────────────────
    if root.join("Package.swift").exists() {
        return "swift".into();
    }
    if root.join("Gemfile").exists() {
        return "ruby".into();
    }
    if root.join("composer.json").exists() {
        return "php".into();
    }
    if root.join("mix.exs").exists() {
        return "elixir".into();
    }

    "folder".into()
}

#[tauri::command]
pub fn list_workspaces(state: State<'_, AppState>) -> Result<Vec<Workspace>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.list_workspaces().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_workspace(
    state: State<'_, AppState>,
    name: String,
    path: String,
) -> Result<Workspace, String> {
    let icon = detect_icon(&path);
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.create_workspace(&name, &path, &icon)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn rename_workspace(
    state: State<'_, AppState>,
    id: String,
    name: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.rename_workspace(&id, &name)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_workspace(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.delete_workspace(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_workspace_icon(
    state: State<'_, AppState>,
    id: String,
    icon: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.set_workspace_icon(&id, &icon)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn detect_workspace_icon(
    state: State<'_, AppState>,
    id: String,
) -> Result<String, String> {
    let path = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        db.get_workspace(&id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Workspace not found".to_string())?
            .path
    };
    Ok(detect_icon(&path))
}
