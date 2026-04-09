# Contributing to Oryon

Thank you for your interest in contributing. This document covers how to report
bugs, propose features, and submit code changes.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Pull Requests](#pull-requests)
- [Code Style](#code-style)
- [Commit Messages](#commit-messages)

---

## Code of Conduct

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md). By
participating you agree to uphold it.

---

## Getting Started

1. Fork the repository and clone your fork.
2. Install prerequisites: Rust 1.77.2+, Node.js 20+, and the
   [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/) for your
   platform.
3. Read the project overview in [README.md](README.md) and, for larger changes,
   the architecture notes in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
4. Install frontend dependencies:
   ```bash
   npm install
   ```
5. Start the development build:
   ```bash
   npm run tauri dev
   ```

---

## Reporting Bugs

Use the **Bug Report** issue template on GitHub. Before filing, please search
existing issues to avoid duplicates and confirm the issue still reproduces on
the latest `main` branch when possible.

A good bug report includes:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected vs. actual behaviour
- Your OS, Rust version (`rustc --version`), and Node version (`node --version`)
- Relevant log output or screenshots

---

## Suggesting Features

Use the **Feature Request** issue template. Describe the problem you want to
solve rather than jumping straight to a solution — this makes it easier to
discuss trade-offs.

---

## Pull Requests

1. Open an issue first for non-trivial changes so the approach can be agreed on
   before you invest time in an implementation.
2. Create a feature branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. Keep changes focused and minimal — one concern per PR.
4. Make sure the project validates cleanly:
   ```bash
   npm run build
   cargo check --manifest-path src-tauri/Cargo.toml
   ```
5. If your change touches packaging, installers, or native bundle assets, also
   run `npm run tauri build` before opening the PR when practical.
6. Fill in the pull request template when opening the PR.
7. A maintainer will review and may request changes before merging.

---

## Code Style

- **TypeScript / React**: functional components, `const` arrow functions, no
  `any`, Tailwind utility classes, no inline styles.
- **Rust**: Rust 2021 edition idioms, `thiserror` for errors, `serde` for
  serialization, async where possible.
- **Naming**: English identifiers and comments, PascalCase for components and
  files, camelCase for functions and variables.
- Formatting is enforced by Prettier (frontend) and `rustfmt` (backend). Run
  them before committing:
  ```bash
  npx prettier --write src/
  cargo fmt --manifest-path src-tauri/Cargo.toml
  ```

Match the existing patterns in the codebase and avoid unrelated refactors in
the same PR.

---

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add web search tool
fix: prevent crash on empty workspace name
refactor: extract message rendering into MessageBubble
docs: update prerequisites table
chore: bump tauri to 2.5.0
```

The type must be one of: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`,
`style`, `perf`.
