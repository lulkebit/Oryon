use serde::Serialize;
use std::sync::Mutex;
use sysinfo::System;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HardwareInfo {
    pub total_ram: u64,
    pub available_ram: u64,
    pub cpu_cores: u32,
    pub cpu_name: String,
    pub os: String,
    pub arch: String,
    pub metal_support: bool,
    pub cuda_support: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessStats {
    pub app_cpu_percent: f32,
    pub app_memory_bytes: u64,
    pub system_cpu_percent: f32,
    pub system_memory_used: u64,
    pub system_memory_total: u64,
}

pub struct SystemMonitor {
    sys: Mutex<System>,
}

impl SystemMonitor {
    pub fn new() -> Self {
        let mut sys = System::new_all();
        sys.refresh_all();
        Self {
            sys: Mutex::new(sys),
        }
    }

    pub fn get_stats(&self) -> ProcessStats {
        let mut sys = self.sys.lock().unwrap();
        sys.refresh_all();

        let pid = sysinfo::Pid::from_u32(std::process::id());
        let (app_cpu, app_mem) = sys
            .process(pid)
            .map(|p| (p.cpu_usage(), p.memory()))
            .unwrap_or((0.0, 0));

        ProcessStats {
            app_cpu_percent: app_cpu,
            app_memory_bytes: app_mem,
            system_cpu_percent: sys.global_cpu_usage(),
            system_memory_used: sys.used_memory(),
            system_memory_total: sys.total_memory(),
        }
    }
}

pub fn detect() -> HardwareInfo {
    let mut sys = System::new_all();
    sys.refresh_all();

    HardwareInfo {
        total_ram: sys.total_memory(),
        available_ram: sys.available_memory(),
        cpu_cores: sys.cpus().len() as u32,
        cpu_name: sys
            .cpus()
            .first()
            .map(|c| c.brand().to_string())
            .unwrap_or_default(),
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        metal_support: cfg!(target_os = "macos"),
        cuda_support: false,
    }
}
