import { cmd } from "./cmd"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import * as prompts from "@clack/prompts"
import { UI } from "../ui"
import fs from "fs/promises"
import path from "path"
import os from "os"
import { Filesystem } from "../../util/filesystem"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export const McpCommand = cmd({
  command: "mcp",
  builder: (yargs) => yargs.command(McpAddCommand).command(McpSetupCommand).demandCommand(),
  async handler() {},
})

export const McpAddCommand = cmd({
  command: "add",
  describe: "add an MCP server",
  async handler() {
    UI.empty()
    prompts.intro("Add MCP server")

    const name = await prompts.text({
      message: "Enter MCP server name",
      validate: (x) => (x && x.length > 0 ? undefined : "Required"),
    })
    if (prompts.isCancel(name)) throw new UI.CancelledError()

    const type = await prompts.select({
      message: "Select MCP server type",
      options: [
        {
          label: "Local",
          value: "local",
          hint: "Run a local command",
        },
        {
          label: "Remote",
          value: "remote",
          hint: "Connect to a remote URL",
        },
      ],
    })
    if (prompts.isCancel(type)) throw new UI.CancelledError()

    if (type === "local") {
      const command = await prompts.text({
        message: "Enter command to run",
        placeholder: "e.g., opencode x @modelcontextprotocol/server-filesystem",
        validate: (x) => (x && x.length > 0 ? undefined : "Required"),
      })
      if (prompts.isCancel(command)) throw new UI.CancelledError()

      prompts.log.info(`Local MCP server "${name}" configured with command: ${command}`)
      prompts.outro("MCP server added successfully")
      return
    }

    if (type === "remote") {
      const url = await prompts.text({
        message: "Enter MCP server URL",
        placeholder: "e.g., https://example.com/mcp",
        validate: (x) => {
          if (!x) return "Required"
          if (x.length === 0) return "Required"
          const isValid = URL.canParse(x)
          return isValid ? undefined : "Invalid URL"
        },
      })
      if (prompts.isCancel(url)) throw new UI.CancelledError()

      const client = new Client({
        name: "opencode",
        version: "1.0.0",
      })
      const transport = new StreamableHTTPClientTransport(new URL(url))
      await client.connect(transport)
      prompts.log.info(`Remote MCP server "${name}" configured with URL: ${url}`)
    }

    prompts.outro("MCP server added successfully")
  },
})

// Helper function to find or create config file
async function findConfigFile(cwd: string): Promise<{ path: string; config: any }> {
  const configFiles = ["ken8n-coder.json", "ken8n-coder.jsonc"]

  // First check the XDG config directory
  const configDir = path.join(os.homedir(), ".config", "ken8n-coder")
  for (const file of configFiles) {
    const configPath = path.join(configDir, file)
    try {
      const content = await fs.readFile(configPath, "utf-8")
      const existingConfig = JSON.parse(content)
      prompts.log.info(`Using existing configuration: ${configPath}`)
      return { path: configPath, config: existingConfig }
    } catch (error) {
      // File doesn't exist or is invalid, continue
    }
  }

  // Fallback to searching from current directory
  for (const file of configFiles) {
    const found = await Filesystem.findUp(file, cwd)
    if (found.length > 0) {
      const configPath = found[0]
      try {
        const content = await fs.readFile(configPath, "utf-8")
        const existingConfig = JSON.parse(content)
        prompts.log.info(`Using existing configuration: ${configPath}`)
        return { path: configPath, config: existingConfig }
      } catch (error) {
        // Continue searching if file is invalid
      }
    }
  }

  // Create new config file in the correct XDG config directory
  await fs.mkdir(configDir, { recursive: true })
  const configPath = path.join(configDir, "ken8n-coder.json")
  prompts.log.info(`Creating new configuration file: ${configPath}`)
  return { path: configPath, config: {} }
}

// Helper function to get user inputs
async function getUserInputs() {
  const baseUrl = await prompts.text({
    message: "Enter your n8n base URL",
    placeholder: "http://localhost:5678",
    defaultValue: "http://localhost:5678",
    validate: (x) => {
      if (!x) return "Required"
      try {
        new URL(x)
        return undefined
      } catch {
        return "Please enter a valid URL (e.g., http://localhost:5678)"
      }
    },
  })
  if (prompts.isCancel(baseUrl)) throw new UI.CancelledError()

  const apiKey = await prompts.password({
    message: "Enter your n8n API key",
    validate: (x) => (x && x.length > 0 ? undefined : "API key is required"),
  })
  if (prompts.isCancel(apiKey)) throw new UI.CancelledError()

  return { baseUrl, apiKey }
}

// Helper function to test n8n connection
async function testN8nConnection(baseUrl: string, apiKey: string): Promise<void> {
  const spinner = prompts.spinner()
  spinner.start("🔍 Testing n8n connection...")

  try {
    // Test basic connectivity to n8n API
    const response = await fetch(`${baseUrl}/api/v1/workflows`, {
      method: "GET",
      headers: {
        "X-N8N-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication failed. Please check your API key.")
      } else if (response.status === 404) {
        throw new Error(`n8n API not found at: ${baseUrl}. Please check your n8n URL.`)
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    }

    const data = await response.json()
    spinner.stop("✅ Connection successful!")
    prompts.log.info(`Found ${data.data?.length || 0} workflows in your n8n instance`)
  } catch (error: any) {
    if (error.name === "AbortError") {
      spinner.stop("❌ Connection timed out")
      throw new Error(`Connection timed out. Please check your n8n URL: ${baseUrl}`)
    }

    spinner.stop("❌ Connection failed")

    if (error.code === "ECONNREFUSED") {
      throw new Error(`Cannot connect to n8n. Is it running at ${baseUrl}?`)
    }

    const retry = await prompts.confirm({
      message: `Connection failed: ${error.message}\nWould you like to continue with setup anyway?`,
    })
    if (prompts.isCancel(retry) || !retry) {
      throw new UI.CancelledError()
    }
  }
}

// Helper function to show completion message
function showCompletionMessage(baseUrl: string, apiKey: string, configPath: string): void {
  prompts.log.success("✅ Configuration updated successfully!")
  prompts.log.info("🔧 MCP server configuration:")
  prompts.log.info(`   • Base URL: ${baseUrl}`)
  prompts.log.info(`   • API Key: ${"*".repeat(8)}${apiKey.slice(-4)}`)
  prompts.log.info(`   • Config file: ${configPath}`)

  prompts.note(
    "The n8n MCP server is now configured and enabled.\n" +
      "Restart ken8n-coder to load the new configuration.\n\n" +
      "You can now use n8n-related tools in your conversations!",
    "🎉 Setup Complete",
  )

  prompts.outro("Ken8n-Coder MCP setup completed successfully!")
}

export const McpSetupCommand = cmd({
  command: "setup",
  describe: "setup n8n MCP server with interactive configuration",
  async handler() {
    UI.empty()
    prompts.intro("🚀 Ken8n-Coder MCP Setup")

    try {
      const cwd = process.cwd()
      const { path: configPath, config: existingConfig } = await findConfigFile(cwd)
      const { baseUrl, apiKey } = await getUserInputs()

      await testN8nConnection(baseUrl, apiKey)

      // Update configuration
      // ALWAYS use npx to ensure latest version
      let mcpCommand: string[]

      // Check if Node.js is available
      try {
        await execAsync("node --version")
        mcpCommand = ["npx", "-y", "@kenkaiii/ken8n-mcp"]
        prompts.log.info("✓ Will use npx to run MCP server (always latest version)")
      } catch {
        prompts.log.warning("⚠️  Node.js not found. MCP server requires Node.js to run.")
        prompts.log.warning("   Install Node.js from https://nodejs.org/ and run setup again.")
        prompts.log.info("   Saving configuration anyway...")
        mcpCommand = ["npx", "-y", "@kenkaiii/ken8n-mcp"]
      }

      const updatedConfig = {
        ...existingConfig,
        mcp: {
          ...existingConfig.mcp,
          n8n: {
            type: "local",
            command: mcpCommand,
            environment: {
              N8N_BASE_URL: baseUrl,
              N8N_API_KEY: apiKey,
            },
            enabled: true,
          },
        },
      }

      await fs.writeFile(configPath, JSON.stringify(updatedConfig, null, 2), "utf-8")
      showCompletionMessage(baseUrl, apiKey, configPath)
    } catch (error) {
      if (error instanceof UI.CancelledError) {
        prompts.cancel("Setup cancelled")
        return
      }

      prompts.log.error(`Setup failed: ${(error as Error).message}`)
      throw error
    }
  },
})
