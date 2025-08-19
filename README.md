# ken8n-coder

```text
 ██╗  ██╗███████╗███╗   ██╗ █████╗ ███╗   ██╗      ██████╗ ██████╗ ██████╗ ███████╗██████╗
 ██║ ██╔╝██╔════╝████╗  ██║██╔══██╗████╗  ██║     ██╔════╝██╔═══██╗██╔══██╗██╔════╝██╔══██╗
 █████╔╝ █████╗  ██╔██╗ ██║╚█████╔╝██╔██╗ ██║     ██║     ██║   ██║██║  ██║█████╗  ██████╔╝
 ██╔═██╗ ██╔══╝  ██║╚██╗██║██╔══██╗██║╚██╗██║     ██║     ██║   ██║██║  ██║██╔══╝  ██╔══██╗
 ██║  ██╗███████╗██║ ╚████║╚█████╔╝██║ ╚████║     ╚██████╗╚██████╔╝██████╔╝███████╗██║  ██║
 ╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝ ╚════╝ ╚═╝  ╚═══╝      ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝
```

<metadata>
purpose: AI-powered n8n workflow creation with Super Code node specialization
type: CLI tool for workflow automation
language: TypeScript/JavaScript
dependencies: Bun, n8n, AI providers (OpenAI/Anthropic)
last-updated: 2025-08-16
</metadata>

**AI-powered n8n workflow creation agent, built for the terminal.**

Transform your n8n workflow building from manual node configuration to natural language descriptions. Built by [Ken Kai](https://github.com/kenkaiii) who specializes in AI automation.

<p align="center">
  <a href="https://github.com/kenkaiii/ken8n-coder/discussions"><img alt="GitHub Discussions" src="https://img.shields.io/github/discussions/kenkaiii/ken8n-coder?style=flat-square&label=discussions" /></a>
  <a href="https://www.npmjs.com/package/ken8n-coder"><img alt="npm" src="https://img.shields.io/npm/v/ken8n-coder?style=flat-square" /></a>
  <a href="https://github.com/kenkaiii/ken8n-coder/blob/main/LICENSE"><img alt="License" src="https://img.shields.io/github/license/kenkaiii/ken8n-coder?style=flat-square" /></a>
</p>

## What This Does

ken8n-coder bridges the gap between natural language workflow descriptions and production-ready n8n automations. Instead of manually configuring nodes and connections, you describe what you want in plain English and get working JavaScript code for n8n's Super Code nodes.

Perfect for:

- **Automation engineers** building complex JavaScript-based workflows
- **Teams** standardizing on AI-assisted workflow development
- **Rapid prototyping** of automation ideas

## Quick Start

```bash
# Install via curl (recommended)
curl -fsSL https://raw.githubusercontent.com/KenKaiii/ken8n-coder/main/install.sh | bash

# Or install globally via npm
npm i -g ken8n-coder@latest

# Launch the terminal interface
ken8n-coder
```

<overview>
Terminal-based AI agent that generates n8n workflows with specialized focus on Super Code node JavaScript development. Supports 46+ pre-loaded libraries and multiple AI providers for comprehensive workflow automation.
</overview>

## Core Features

| Feature                       | Description                                                       | Benefit                                                             |
| ----------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| **Super Code Specialization** | Optimized for n8n's Super Code node with 46+ JavaScript libraries | Generate complex automation logic without manual library management |
| **Multi-Provider AI**         | OpenAI, Anthropic Claude, and other models                        | Choose the best AI for your workflow complexity                     |
| **Terminal TUI**              | Clean, keyboard-driven interface                                  | Stay in your development flow without context switching             |
| **Rapid Iteration**           | Generate, test, and refine workflows quickly                      | Accelerate development from idea to production                      |
| **Library-Rich Environment**  | Pre-loaded with utilities, data processing, crypto, and more      | Build sophisticated workflows without dependency management         |

## Interactive Commands

<functions>
<function name="/new">
  <purpose>Start creating a new n8n workflow</purpose>
  <description>Launches workflow creation dialog with AI assistance</description>
</function>

<function name="/sessions">
  <purpose>Manage and resume previous workflow sessions</purpose>
  <description>View, load, or delete saved workflow development sessions</description>
</function>

<function name="/models">
  <purpose>Configure AI model providers and settings</purpose>
  <description>Switch between OpenAI, Anthropic, or other supported providers</description>
</function>

<function name="/exit">
  <purpose>Exit the ken8n-coder interface</purpose>
  <description>Safely close the application with session preservation</description>
</function>
</functions>

## Super Code Node Libraries

ken8n-coder specializes in generating JavaScript for n8n's Super Code node environment with these pre-loaded libraries:

<configuration>
<setting name="Core Utilities" type="object">
  lodash, axios, cheerio, dayjs, moment, uuid, nanoid, bytes
</setting>

<setting name="Data Processing" type="object">
  joi/Joi, validator, Ajv, yup, csvParse, papaparse/Papa, xml2js, XMLParser, YAML, ini, toml, qs
</setting>

<setting name="Templating & Text" type="object">
  Handlebars, stringSimilarity, slug, pluralize, fuzzy
</setting>

<setting name="Cryptography" type="object">
  CryptoJS, forge, jwt, bcrypt, bcryptjs
</setting>

<setting name="File Processing" type="object">
  XLSX, pdfLib, archiver, Jimp, QRCode
</setting>

<setting name="Network & API" type="object">
  FormData, phoneNumber, iban
</setting>

<setting name="Blockchain" type="object">
  ethers, web3
</setting>

<setting name="Media" type="object">
  ytdl, ffmpeg, ffmpegStatic
</setting>
</configuration>

## Installation

Install ken8n-coder globally using npm. This universal method works on Windows, Mac, and Linux:

```bash
# Install with npm (recommended)
npm i -g ken8n-coder@latest

# Alternative package managers also work
bun add -g ken8n-coder@latest
pnpm add -g ken8n-coder@latest
yarn global add ken8n-coder@latest
```

<patterns>
<pattern name="workflow-creation">
```bash

# Launch ken8n-coder

ken8n-coder

# In the TUI

/new

# Import into your n8n instance

````
</pattern>

<pattern name="session-management">

```bash
# Save current work
/sessions

# Resume previous session
/sessions

# Select from list of saved sessions

# Continue iterating on workflow
````

</pattern>
</patterns>

## Examples

### Data Processing Workflow

```
Input: "Process CSV uploads, validate email fields with joi, transform data using lodash, and export to XLSX"

Output: Complete n8n workflow with Super Code nodes containing:
- CSV parsing with papaparse
- Email validation with joi
- Data transformation with lodash utilities
```

### API Integration Workflow

```
Input: "Fetch data from REST API, handle authentication with JWT, process responses, and store in database"

Output: n8n workflow featuring:
- axios HTTP client configuration
- JWT token handling
- Data validation and processing
```

### Notification System

```
Input: "Monitor webhook for events, filter based on criteria, format messages with templates, send via multiple channels"

Output: Workflow with:
- Webhook trigger configuration
- Event filtering logic
- Handlebars template processing
- Multi-channel notification delivery
```

## Configuration

ken8n-coder uses a configuration file at `ken8n-coder.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "context7": {
      "type": "remote",
      "url": "https://mcp.context7.com/sse"
    }
  }
}
```

## Contributing

ken8n-coder welcomes contributions focused on n8n workflow excellence:

- **Super Code enhancements** - New library integrations or code patterns
- **Workflow templates** - Common automation patterns for the community

- **n8n node support** - Expanding beyond Super Code to other node types
- **AI model optimization** - Better prompts and model configurations
- **Documentation** - Usage guides and best practices

### Development Setup

```bash
git clone https://github.com/kenkaiii/ken8n-coder.git
cd ken8n-coder
bun install
bun dev
```

Requirements:

- Bun (package manager)
- Golang 1.24.x
- n8n instance (for testing workflows)

## Why ken8n-coder?

| Traditional n8n | ken8n-coder |
| --------------- | ----------- |

| Manual node configuration | Natural language descriptions |
| Copy/paste code snippets | AI-generated, optimized JavaScript |
| Trial and error with libraries | 46+ libraries pre-configured |
| Individual workflow building | Consistent, shareable patterns |
| Context switching between docs | Terminal-focused development |

## Community

- **GitHub Discussions**: [Share workflows and get help](https://github.com/kenkaiii/ken8n-coder/discussions)
- **Issues**: [Report bugs or request features](https://github.com/kenkaiii/ken8n-coder/issues)
- **Wiki**: [Documentation and guides](https://github.com/kenkaiii/ken8n-coder/wiki)

---

**Built by [Ken Kai](https://github.com/kenkaiii)** • Specialized in AI automation • MIT Licensed
