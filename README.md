<p align="center">
  <a href="https://github.com/kenkaiii/ken8n-coder">
    <picture>
      <source srcset="packages/web/src/assets/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/web/src/assets/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/web/src/assets/logo-ornate-light.svg" alt="ken8n-coder logo">
    </picture>
  </a>
</p>
<p align="center">AI n8n workflow creation agent, built for the terminal.</p>
<p align="center">
  <a href="https://opencode.ai/discord"><img alt="Discord" src="https://img.shields.io/discord/1391832426048651334?style=flat-square&label=discord" /></a>
  <a href="https://www.npmjs.com/package/opencode-ai"><img alt="npm" src="https://img.shields.io/npm/v/opencode-ai?style=flat-square" /></a>
  <a href="https://github.com/sst/opencode/actions/workflows/publish.yml"><img alt="Build status" src="https://img.shields.io/github/actions/workflow/status/sst/opencode/publish.yml?style=flat-square&branch=dev" /></a>
</p>

[![opencode Terminal UI](packages/web/src/assets/lander/screenshot.png)](https://opencode.ai)

---

### Installation

```bash
# YOLO
curl -fsSL https://raw.githubusercontent.com/kenkaiii/ken8n-coder/main/install | bash

# Package managers
npm i -g ken8n-coder@latest        # or bun/pnpm/yarn
# brew install kenkaiii/tap/ken8n-coder      # macOS and Linux (coming soon)
# paru -S ken8n-coder-bin               # Arch Linux (coming soon)
```

> [!TIP]
> Remove versions older than 0.1.x before installing.

#### Installation Directory

The install script respects the following priority order for the installation path:

1. `$KEN8N_CODER_INSTALL_DIR` - Custom installation directory
2. `$XDG_BIN_DIR` - XDG Base Directory Specification compliant path
3. `$HOME/bin` - Standard user binary directory (if exists or can be created)
4. `$HOME/.ken8n-coder/bin` - Default fallback

```bash
# Examples
KEN8N_CODER_INSTALL_DIR=/usr/local/bin curl -fsSL https://raw.githubusercontent.com/kenkaiii/ken8n-coder/main/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://raw.githubusercontent.com/kenkaiii/ken8n-coder/main/install | bash
```

### Documentation

For more info on how to configure ken8n-coder [**head over to our docs**](https://github.com/kenkaiii/ken8n-coder/wiki).

### Contributing

ken8n-coder is focused on n8n workflow creation. Feel free to contribute:

- Bug fixes in workflow generation
- Improvements to n8n workflow creation accuracy
- Support for additional n8n node types
- Super Code node enhancements
- n8n pattern libraries
- Documentation improvements

Take a look at the git history to see what kind of contributions we accept.

To run ken8n-coder locally you need:

- Bun
- Golang 1.24.x
- n8n instance for testing (optional)

And run:

```bash
$ bun install
$ bun dev
```

#### Development Notes

**API Client**: After making changes to the TypeScript API endpoints in `packages/opencode/src/server/server.ts`, you will need to regenerate the stainless SDK for the clients.

### FAQ

#### How is this different than standard n8n workflow creation?

ken8n-coder transforms workflow creation from manual node configuration to natural language descriptions:

- **AI-powered**: Describe workflows in plain English, get working n8n JSON
- **Super Code focus**: Optimized for JavaScript-based automation with 46+ pre-loaded libraries
- **Terminal-first**: Built for developers who prefer command-line interfaces
- **Provider-agnostic**: Works with OpenAI, Anthropic, Google, or local models
- **Rapid prototyping**: Generate, test, and iterate on workflows quickly

#### What n8n features are supported?

Currently focused on:
- Super Code node JavaScript generation
- Basic workflow structure and connections
- Webhook triggers and common actions
- Support for 46+ JavaScript libraries in Super Code nodes

#### How do I use the generated workflows?

1. Copy the generated JSON workflow
2. Import into your n8n instance via the UI
3. Configure any required credentials
4. Test and activate the workflow

---

**Join our community** [GitHub Discussions](https://github.com/kenkaiii/ken8n-coder/discussions) | [Issues](https://github.com/kenkaiii/ken8n-coder/issues)
