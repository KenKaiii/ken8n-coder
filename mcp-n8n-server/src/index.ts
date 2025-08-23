#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js"
import { z } from "zod"
import { N8nClient } from "./n8n-client.js"
import { execSync } from "child_process"
import path from "path"
import fs from "fs"

// Input schemas
const DeployWorkflowSchema = z.object({
  workflowFile: z.string(), // File path to workflow JSON
  name: z.string().optional(),
  active: z.boolean().optional().default(true),
})

const TestWorkflowSchema = z.object({
  workflowId: z.string().optional(),
  workflow: z.object({}).passthrough().optional(),
  testData: z.object({}).passthrough().optional(),
})

const UpdateWorkflowSchema = z.object({
  workflowId: z.string(),
  updates: z.object({}).passthrough(),
})

const GetExecutionSchema = z.object({
  executionId: z.string(),
})

const ListWorkflowsSchema = z.object({
  limit: z.number().optional().default(20),
  active: z.boolean().optional(),
})

const DeleteWorkflowSchema = z.object({
  workflowId: z.string(),
})

const ListExecutionsSchema = z.object({
  workflowId: z.string().optional(),
  status: z.enum(["success", "error", "running", "waiting"]).optional(),
  limit: z.number().optional().default(3),
})

interface N8nConfig {
  baseUrl: string
  apiKey: string
}

class N8nMCPServer {
  private readonly server: Server
  private readonly n8nClient: N8nClient

  constructor() {
    this.server = new Server(
      {
        name: "mcp-n8n-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    )

    // Load config from environment variables only
    const config = this.loadConfig()
    this.n8nClient = new N8nClient(config.baseUrl, config.apiKey)

    this.setupHandlers()
  }

  private loadConfig(): N8nConfig {
    // Use environment variables only
    const baseUrl = process.env.N8N_BASE_URL || "http://localhost:5678"
    const apiKey = process.env.N8N_API_KEY || ""

    if (!apiKey) {
      throw new Error(
        "N8N_API_KEY environment variable is required. Set it in your claude_mcp.json environment configuration.",
      )
    }

    return { baseUrl, apiKey }
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "n8n_deploy",
            description: "Deploy a workflow to n8n using file path",
            inputSchema: {
              type: "object",
              properties: {
                workflowFile: {
                  type: "string",
                  description: "Path to the workflow JSON file",
                },
                name: {
                  type: "string",
                  description: "Optional workflow name override",
                },
                active: {
                  type: "boolean",
                  description: "Whether the workflow should be active",
                  default: true,
                },
              },
              required: ["workflowFile"],
            },
          },
          {
            name: "n8n_test",
            description: "Test a workflow execution",
            inputSchema: {
              type: "object",
              properties: {
                workflowId: {
                  type: "string",
                  description: "ID of existing workflow to test",
                },
                workflow: {
                  type: "object",
                  description: "Workflow JSON for direct testing",
                },
                testData: {
                  type: "object",
                  description: "Test data to pass to the workflow",
                },
              },
            },
          },
          {
            name: "n8n_update",
            description: "Update an existing workflow",
            inputSchema: {
              type: "object",
              properties: {
                workflowId: {
                  type: "string",
                  description: "ID of the workflow to update",
                },
                updates: {
                  type: "object",
                  description: "Updates to apply to the workflow",
                },
              },
              required: ["workflowId", "updates"],
            },
          },
          {
            name: "n8n_get_execution",
            description: "Get execution details by ID",
            inputSchema: {
              type: "object",
              properties: {
                executionId: {
                  type: "string",
                  description: "ID of the execution to retrieve",
                },
              },
              required: ["executionId"],
            },
          },
          {
            name: "n8n_list_workflows",
            description: "List workflows with optional filters",
            inputSchema: {
              type: "object",
              properties: {
                limit: {
                  type: "number",
                  description: "Maximum number of workflows to return",
                  default: 20,
                },
                active: {
                  type: "boolean",
                  description: "Filter by active status",
                },
              },
            },
          },
          {
            name: "n8n_delete",
            description: "Delete a workflow by ID",
            inputSchema: {
              type: "object",
              properties: {
                workflowId: {
                  type: "string",
                  description: "ID of the workflow to delete",
                },
              },
              required: ["workflowId"],
            },
          },
          {
            name: "n8n_list_executions",
            description: "List workflow executions with optional filters (returns most recent first)",
            inputSchema: {
              type: "object",
              properties: {
                workflowId: {
                  type: "string",
                  description: "Filter executions by workflow ID",
                },
                status: {
                  type: "string",
                  enum: ["success", "error", "running", "waiting"],
                  description: "Filter by execution status",
                },
                limit: {
                  type: "number",
                  description: "Maximum number of executions to return (default: 3)",
                  default: 3,
                },
              },
            },
          },
        ],
      }
    })

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case "n8n_deploy":
            return await this.deployWorkflow(request.params.arguments)

          case "n8n_test":
            return await this.testWorkflow(request.params.arguments)

          case "n8n_update":
            return await this.updateWorkflow(request.params.arguments)

          case "n8n_get_execution":
            return await this.getExecution(request.params.arguments)

          case "n8n_list_workflows":
            return await this.listWorkflows(request.params.arguments)

          case "n8n_delete":
            return await this.deleteWorkflow(request.params.arguments)

          case "n8n_list_executions":
            return await this.listExecutions(request.params.arguments)

          default:
            throw new Error(`Unknown tool: ${request.params.name}`)
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        }
      }
    })
  }

  private async deployWorkflow(args: unknown) {
    const { workflowFile, name, active } = DeployWorkflowSchema.parse(args)

    let workflowToDeply: any

    try {
      // Execute the deploy-script to extract JSON from file
      const userScriptPath = path.join(process.env.HOME || "~", ".ken8n-coder", "deploy-script", "deploy-workflow.js")
      const currentDir = path.dirname(new URL(import.meta.url).pathname)
      const packageScriptPath = path.join(currentDir, "..", "deploy-script", "deploy-workflow.js")
      const localScriptPath = path.join(currentDir, "..", "..", "deploy-script", "deploy-workflow.js")

      // Try user script first, then package script, then local script
      let scriptPath: string
      if (fs.existsSync(userScriptPath)) {
        scriptPath = userScriptPath
      } else if (fs.existsSync(packageScriptPath)) {
        scriptPath = packageScriptPath
      } else {
        scriptPath = localScriptPath
      }
      const scriptCommand = `node "${scriptPath}" "${workflowFile}" --json-output`

      const scriptOutput = execSync(scriptCommand, {
        encoding: "utf8",
        timeout: 30000, // 30 second timeout
      })

      // Parse the JSON output from the script
      const workflow = JSON.parse(scriptOutput.trim())

      // Use workflow JSON from script
      workflowToDeply = {
        ...workflow,
        name: name || workflow.name || "Unnamed Workflow",
        nodes: workflow.nodes || [],
      }
    } catch (scriptError) {
      throw new Error(
        `Failed to execute deploy script: ${scriptError instanceof Error ? scriptError.message : "Unknown error"}`,
      )
    }

    try {
      const result = await this.n8nClient.deployWorkflow(workflowToDeply)

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                workflowId: result.workflowId,
                webhookUrl: result.webhookUrl,
                status: result.status,
                active: active !== false, // Default to true unless explicitly false
              },
              null,
              2,
            ),
          },
        ],
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
              },
              null,
              2,
            ),
          },
        ],
      }
    }
  }

  private async testWorkflow(args: unknown) {
    const { workflowId, workflow, testData } = TestWorkflowSchema.parse(args)

    try {
      let result

      if (workflowId) {
        // Test existing workflow by ID
        result = await this.n8nClient.testWorkflow(workflowId, testData || {})
      } else if (workflow) {
        // For direct workflow testing, we need to deploy it first temporarily
        // This matches the behavior users expect - test the workflow as-is
        const deployResult = await this.n8nClient.deployWorkflow({
          ...workflow,
          name: `temp-test-${Date.now()}`,
          nodes: workflow.nodes || [],
        } as any) // Type assertion since workflow comes from zod validation

        result = await this.n8nClient.testWorkflow(deployResult.workflowId, testData || {})

        // Clean up temporary workflow
        try {
          await this.n8nClient.deleteWorkflow(deployResult.workflowId)
        } catch {
          // Ignore cleanup errors
        }
      } else {
        throw new Error("Either workflowId or workflow must be provided")
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
              },
              null,
              2,
            ),
          },
        ],
      }
    }
  }

  private async updateWorkflow(args: unknown) {
    const { workflowId, updates } = UpdateWorkflowSchema.parse(args)

    try {
      const result = await this.n8nClient.updateWorkflow(workflowId, updates)

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                workflowId: result.id,
                name: result.name,
                active: result.active,
                updatedAt: result.updatedAt,
              },
              null,
              2,
            ),
          },
        ],
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
              },
              null,
              2,
            ),
          },
        ],
      }
    }
  }

  private extractExecutionErrors(execution: any) {
    const errors = []

    // Add main execution error if present
    if (execution.data?.resultData?.error) {
      errors.push({
        type: "main",
        nodeName: execution.data.resultData.error.node?.name,
        message: execution.data.resultData.error.message,
        code: execution.data.resultData.error.node?.parameters?.code,
      })
    }

    // Add per-node errors from runData
    if (execution.data?.resultData?.runData) {
      for (const [nodeName, nodeExecutions] of Object.entries(execution.data.resultData.runData)) {
        this.extractNodeErrors(nodeName, nodeExecutions as any[], errors)
      }
    }

    return errors.length > 0 ? errors : undefined
  }

  private extractNodeErrors(nodeName: string, nodeExecutions: any[], errors: any[]) {
    for (let i = 0; i < nodeExecutions.length; i++) {
      const nodeExec = nodeExecutions[i]
      if (nodeExec.error && nodeExec.executionStatus === "error") {
        // Avoid duplicating the main error
        if (!errors.some((e: any) => e.nodeName === nodeName && e.message === nodeExec.error.message)) {
          errors.push({
            type: "node",
            nodeName: nodeName,
            executionIndex: i,
            message: nodeExec.error.message,
            code: nodeExec.error.node?.parameters?.code,
          })
        }
      }
    }
  }

  private async getExecution(args: unknown) {
    const { executionId } = GetExecutionSchema.parse(args)

    try {
      const execution = await this.n8nClient.getExecution(executionId)

      // Extract essential information
      const result: any = {
        success: true,
        executionId: execution.id,
        status: (execution as any).status || "unknown",
        finished: execution.finished,
        workflowId: execution.workflowId,
        startedAt: execution.startedAt,
        stoppedAt: execution.stoppedAt,
      }

      // If there are errors, extract them
      if ((execution as any).status === "error" || execution.data?.resultData?.error) {
        const errors = this.extractExecutionErrors(execution)
        if (errors) result.errors = errors
      }

      // Include successful execution data if no errors
      if (!result.errors && execution.data) {
        result.data = execution.data
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
              },
              null,
              2,
            ),
          },
        ],
      }
    }
  }

  private async listWorkflows(args: unknown) {
    const { limit, active } = ListWorkflowsSchema.parse(args)

    try {
      const workflows = await this.n8nClient.listWorkflows(limit, active)

      const workflowSummaries = workflows.map((workflow) => ({
        id: workflow.id,
        name: workflow.name,
        active: workflow.active,
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt,
      }))

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                count: workflowSummaries.length,
                workflows: workflowSummaries,
              },
              null,
              2,
            ),
          },
        ],
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
              },
              null,
              2,
            ),
          },
        ],
      }
    }
  }

  private async deleteWorkflow(args: unknown) {
    const { workflowId } = DeleteWorkflowSchema.parse(args)

    try {
      await this.n8nClient.deleteWorkflow(workflowId)

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                message: `Workflow ${workflowId} deleted successfully`,
              },
              null,
              2,
            ),
          },
        ],
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
              },
              null,
              2,
            ),
          },
        ],
      }
    }
  }

  private async listExecutions(args: unknown) {
    const { workflowId, status, limit } = ListExecutionsSchema.parse(args)

    try {
      const executions = await this.n8nClient.listExecutions({
        workflowId,
        status,
        limit,
      })

      // Extract essential info from each execution (already sorted by most recent)
      const executionSummaries = executions.map((exec) => ({
        id: exec.id,
        workflowId: exec.workflowId,
        status: (exec as any).status || (exec.finished ? "success" : "running"),
        finished: exec.finished,
        mode: exec.mode,
        startedAt: exec.startedAt,
        stoppedAt: exec.stoppedAt,
        error: exec.data?.resultData?.error
          ? {
              message: exec.data.resultData.error.message,
              node: exec.data.resultData.error.node?.name,
            }
          : undefined,
      }))

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                count: executionSummaries.length,
                executions: executionSummaries,
              },
              null,
              2,
            ),
          },
        ],
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
              },
              null,
              2,
            ),
          },
        ],
      }
    }
  }

  async run() {
    const transport = new StdioServerTransport()
    await this.server.connect(transport)

    // Log server start to stderr so it doesn't interfere with MCP communication
    console.error("MCP n8n Server running on stdio")
  }
}

// Start the server
const server = new N8nMCPServer()
server.run().catch(console.error)
