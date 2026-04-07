use serde::Serialize;
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
