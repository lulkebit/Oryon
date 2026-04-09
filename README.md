<div align="center">
  <img src="app-icon.svg" width="132" height="132" alt="Oryon logo" />
  <h1>Oryon</h1>
  <p><strong>Local-first desktop app for working with open-source AI models</strong></p>
  <p>Chat, tools, and on-device inference without relying on a cloud API.</p>
  <p>
    <a href="#overview">Overview</a> ·
    <a href="#development">Development</a> ·
    <a href="docs/ARCHITECTURE.md">Architecture</a> ·
    <a href="CONTRIBUTING.md">Contributing</a> ·
    <a href="SECURITY.md">Security</a>
  </p>
</div>

> **Alpha software.** Oryon is under active development. Expect rough edges,
> breaking changes, and incomplete workflows. Do not rely on it for production
> or critical data without your own review.

## Overview

Oryon is a **Tauri 2** desktop application (Rust backend, **React 19** +
**TypeScript** frontend). You organize work in **workspaces** (one folder per
workspace), chat with models that run **entirely on your machine** via
**llama.cpp**, and use **agent tools** for files, terminal commands, git, code
search, and more — scoped to the workspace.

**Models and privacy:** Model weights are fetched as **GGUF** files from the
**Hugging Face Hub** when you choose to download them. Inference runs locally;
Oryon is not a hosted inference service. Apart from downloads you initiate from
the in-app model hub, network use depends on the tools you enable (for example
web-related tools). There is no requirement to send prompts or code to a vendor
API to use the core product.

## Features

- **On-device inference** via llama.cpp bindings (GGUF models)
- **In-app Model Hub** to browse and download compatible models
- **Workspace-based chat** with persistence (SQLite + filesystem)
- **Tool-using agents** (files, shell, git, search, web — as implemented in the current build)
- **Dark and light** UI (Tailwind CSS 4)

## Requirements

| Tool        | Notes                                                |
| ----------- | ---------------------------------------------------- |
| **Rust**    | **1.77.2** or newer (`rust-version` in `Cargo.toml`) |
| **Node.js** | **20.x or newer** (current LTS recommended)          |
| **OS**      | **macOS**, **Windows**, or **Linux** (desktop)       |

Install [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for
your platform (WebView, C toolchain on Windows, etc.) before the first build.

## Development

```bash
git clone https://github.com/lulkebit/Oryon.git
cd Oryon
npm install
npm run tauri dev
```

Other useful scripts:

- `npm run dev` — Vite frontend only
- `npm run build` — Typecheck and production frontend build
- `npm run tauri build` — Produce an application bundle (platform-dependent)

**Prebuilt installers and GitHub Releases** are not set up yet; building from
source is the supported path for now.

## Documentation

Specifications and design notes live under [`docs/`](docs/), including
architecture, UI, data model, tools, and the model engine.

## Community

- Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md)
  before opening issues or pull requests.
- Community participation is covered by
  [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
- To report a vulnerability, follow [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © Luke Schröter
