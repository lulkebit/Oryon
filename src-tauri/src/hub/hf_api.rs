use serde::{Deserialize, Serialize};

const HF_API_BASE: &str = "https://huggingface.co/api";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HfModelResult {
    pub id: String,
    pub author: Option<String>,
    pub downloads: Option<u64>,
    pub likes: Option<u64>,
    pub tags: Vec<String>,
    pub files: Vec<GgufFile>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GgufFile {
    pub filename: String,
    pub size: u64,
    pub quantization: Option<String>,
}

#[derive(Debug, Deserialize)]
struct HfApiModel {
    id: String,
    author: Option<String>,
    downloads: Option<u64>,
    likes: Option<u64>,
    #[serde(default)]
    tags: Vec<String>,
    #[serde(default)]
    siblings: Vec<HfSibling>,
}

#[derive(Debug, Deserialize)]
struct HfSibling {
    rfilename: String,
}

#[derive(Debug, Deserialize)]
struct TreeEntry {
    path: String,
    #[serde(default)]
    size: Option<u64>,
    #[serde(default)]
    lfs: Option<LfsInfo>,
}

#[derive(Debug, Deserialize)]
struct LfsInfo {
    size: u64,
}

impl TreeEntry {
    fn file_size(&self) -> u64 {
        self.lfs
            .as_ref()
            .map(|l| l.size)
            .or(self.size)
            .unwrap_or(0)
    }
}

fn extract_quant(filename: &str) -> Option<String> {
    let lower = filename.to_lowercase();
    let quants = [
        "q2_k", "q3_k_s", "q3_k_m", "q3_k_l", "q4_0", "q4_1", "q4_k_s",
        "q4_k_m", "q5_0", "q5_1", "q5_k_s", "q5_k_m", "q6_k", "q8_0",
        "f16", "f32", "iq1_s", "iq2_m", "iq2_xxs", "iq2_xs", "iq3_xxs",
        "iq3_xs", "iq3_m", "iq4_xs", "iq4_nl",
    ];
    for q in quants {
        if lower.contains(q) {
            return Some(q.to_uppercase());
        }
    }
    None
}

fn client() -> reqwest::Client {
    reqwest::Client::builder()
        .user_agent("Oryon/0.1.0")
        .build()
        .unwrap_or_else(|_| reqwest::Client::new())
}

pub async fn search_models(query: &str) -> Result<Vec<HfModelResult>, String> {
    search_models_inner(query, false).await
}

pub async fn search_models_with_sizes(query: &str) -> Result<Vec<HfModelResult>, String> {
    search_models_inner(query, true).await
}

async fn search_models_inner(
    query: &str,
    fetch_sizes: bool,
) -> Result<Vec<HfModelResult>, String> {
    let http = client();

    let url = format!(
        "{HF_API_BASE}/models?search={}&filter=gguf&sort=downloads&direction=-1&limit=20&expand[]=siblings",
        urlencoding::encode(query)
    );

    let resp = http
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("HF API request failed: {e}"))?;

    if !resp.status().is_success() {
        return Err(format!("HF API returned {}", resp.status()));
    }

    let models: Vec<HfApiModel> = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse HF response: {e}"))?;

    let mut results: Vec<HfModelResult> = models
        .into_iter()
        .filter_map(|m| {
            let gguf_files: Vec<GgufFile> = m
                .siblings
                .iter()
                .filter(|s| s.rfilename.ends_with(".gguf"))
                .map(|s| GgufFile {
                    filename: s.rfilename.clone(),
                    size: 0,
                    quantization: extract_quant(&s.rfilename),
                })
                .collect();

            if gguf_files.is_empty() {
                return None;
            }

            Some(HfModelResult {
                id: m.id,
                author: m.author,
                downloads: m.downloads,
                likes: m.likes,
                tags: m.tags,
                files: gguf_files,
            })
        })
        .collect();

    if fetch_sizes {
        let futs: Vec<_> = results
            .iter()
            .map(|m| fetch_file_sizes(&http, &m.id))
            .collect();

        let sizes = futures_util::future::join_all(futs).await;

        for (model, size_map) in results.iter_mut().zip(sizes) {
            if let Ok(map) = size_map {
                for file in &mut model.files {
                    if let Some(&sz) = map.get(&file.filename) {
                        file.size = sz;
                    }
                }
            }
        }
    }

    Ok(results)
}

async fn fetch_file_sizes(
    http: &reqwest::Client,
    repo_id: &str,
) -> Result<std::collections::HashMap<String, u64>, String> {
    let url = format!(
        "{HF_API_BASE}/models/{}/tree/main",
        urlencoding::encode(repo_id)
    );

    let resp = http
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Tree request failed: {e}"))?;

    if !resp.status().is_success() {
        return Err(format!("Tree API returned {}", resp.status()));
    }

    let entries: Vec<TreeEntry> = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse tree: {e}"))?;

    let map = entries
        .into_iter()
        .filter(|e| e.path.ends_with(".gguf"))
        .map(|e| {
            let size = e.file_size();
            (e.path, size)
        })
        .collect();

    Ok(map)
}

pub fn download_url(repo_id: &str, filename: &str) -> String {
    format!("https://huggingface.co/{repo_id}/resolve/main/{filename}")
}
