# Oryon

**Local-first desktop app for working with open-source AI models** — chat, tools,
and on-device inference without a cloud API.

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
- **Tool-using agents** (files, shell, git, search, web — as implemented in the
current build)
- **Dark and light** UI (Tailwind CSS 4)

## Requirements

Roughly what the codebase expects today (see `src-tauri/Cargo.toml` and
`package.json` if you need exact versions):


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

Specifications and design notes live under `[docs/](docs/)`, including
architecture, UI, data model, tools, and the model engine.

## Contributing

Contributions are welcome. This repository will gain **contributing guidelines**,
a **code of conduct**, and a **security policy** as they are finalized; until
then, open issues and pull requests on GitHub for bugs and small improvements,
and keep changes focused and easy to review.

## License

**To be announced.** A `LICENSE` file and SPDX identifier will be added to the
repository. Do not assume redistribution terms until that file is published.