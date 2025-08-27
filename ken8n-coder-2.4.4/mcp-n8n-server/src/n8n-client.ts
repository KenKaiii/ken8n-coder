interface N8nWorkflowNode {
  type: string
  typeVersion?: number
  position: number[]
  parameters?: any
  webhookId?: string
  name?: string
  id?: string
}

interface N8nWorkflow {
  name: string
  nodes: N8nWorkflowNode[]
  connections?: any
  settings?: any
  id?: string
  active?: boolean
  createdAt?: string
  updatedAt?: string
  versionId?: string
  staticData?: any
}

interface N8nExecution {
  id: string
  finished: boolean
  mode: string
  retryOf?: string
  retrySuccessId?: string
  startedAt: string
  stoppedAt?: string
  workflowId: string
  data?: {
    resultData?: {
      error?: {
        message: string
        description?: string
        node?: {
          name: string
        }
      }
      lastNodeExecuted?: string
      runData?: any
    }
  }
}

interface DeployResult {
  workflowId: string
  webhookUrl: string
  status: "created" | "updated"
}

interface TestResult {
  success: boolean
  executionId?: string
  output?: any
  error?: string
}

export class N8nClient {
  private readonly baseUrl: string
  private readonly apiKey: string

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "") // Remove trailing slash
    this.apiKey = apiKey
  }

  /**
   * Generate UUID v4 for webhook paths
   */
  private generateUUID(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0
      const v = c === "x" ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  /**
   * Validate and auto-fix workflow structure with all the robustness from original script
   */
  private validateWorkflow(workflow: N8nWorkflow): N8nWorkflowNode {
    this.validateWorkflowBasicStructure(workflow)
    const webhookNode = this.findWebhookNode(workflow)
    this.validateWebhookNode(webhookNode)
    this.applyWebhookAutoFixes(webhookNode)
    console.log("✅ Webhook node validated and fixed")
    return webhookNode
  }

  private validateWorkflowBasicStructure(workflow: N8nWorkflow): void {
    if (!workflow.name) {
      throw new Error('Invalid workflow: Missing "name" field. Workflow must have: {"name": "...", "nodes": [...]}')
    }
    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      throw new Error(
        'Invalid workflow: Missing or invalid "nodes" array. Workflow must have: {"name": "...", "nodes": [...]}',
      )
    }
    if (workflow.nodes.length === 0) {
      throw new Error("Invalid workflow: No nodes defined. Add at least one node to the workflow")
    }
  }

  private findWebhookNode(workflow: N8nWorkflow): N8nWorkflowNode {
    const webhookNode = workflow.nodes.find((n) => n.type === "n8n-nodes-base.webhook")
    if (!webhookNode) {
      throw new Error(
        'Workflow must have a webhook trigger node to be testable. Add a webhook trigger as the first node: Type: n8n-nodes-base.webhook, Parameters: path (e.g., "my-webhook")',
      )
    }
    return webhookNode
  }

  private validateWebhookNode(webhookNode: N8nWorkflowNode): void {
    if (!webhookNode.parameters) {
      throw new Error("Webhook node missing parameters. Add parameters.path to your webhook node")
    }
  }

  private applyWebhookAutoFixes(webhookNode: N8nWorkflowNode): void {
    this.fixWebhookVersion(webhookNode)
    this.fixWebhookIdAndPath(webhookNode)
    this.fixWebhookHttpMethod(webhookNode)
    this.fixWebhookResponseMode(webhookNode)
    this.fixWebhookOptions(webhookNode)
  }

  private fixWebhookVersion(webhookNode: N8nWorkflowNode): void {
    if (webhookNode.typeVersion !== 2.1) {
      console.log(`🔧 Auto-fixing: Upgrading webhook from version ${webhookNode.typeVersion || 2} to 2.1`)
      webhookNode.typeVersion = 2.1
    }
  }

  private fixWebhookIdAndPath(webhookNode: N8nWorkflowNode): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

    if (webhookNode.webhookId && uuidRegex.test(webhookNode.webhookId)) {
      if (webhookNode.parameters!.path !== webhookNode.webhookId) {
        console.log("🔧 Auto-fixing: Setting path to match existing webhookId")
        webhookNode.parameters!.path = webhookNode.webhookId
      }
      return
    }

    if (!webhookNode.webhookId || webhookNode.webhookId !== webhookNode.parameters!.path) {
      if (!webhookNode.parameters!.path || !uuidRegex.test(webhookNode.parameters!.path)) {
        const uuid = this.generateUUID()
        console.log(`🔧 Auto-fixing: Generating UUID for webhook path: ${uuid}`)
        webhookNode.parameters!.path = uuid
        webhookNode.webhookId = uuid
      } else {
        console.log("🔧 Auto-fixing: Setting webhookId to match path")
        webhookNode.webhookId = webhookNode.parameters!.path
      }
    }
  }

  private fixWebhookHttpMethod(webhookNode: N8nWorkflowNode): void {
    if (!webhookNode.parameters!.httpMethod) {
      console.log("🔧 Auto-fixing: Setting httpMethod to POST")
      webhookNode.parameters!.httpMethod = "POST"
    }
  }

  private fixWebhookResponseMode(webhookNode: N8nWorkflowNode): void {
    if (!webhookNode.parameters!.responseMode) {
      console.log("🔧 Auto-fixing: Setting responseMode to responseNode")
      webhookNode.parameters!.responseMode = "responseNode"
    }
  }

  private fixWebhookOptions(webhookNode: N8nWorkflowNode): void {
    if (!webhookNode.parameters!.options) {
      webhookNode.parameters!.options = {}
    }
  }

  /**
   * Ensure workflow has required structure fields
   */
  private ensureWorkflowStructure(workflow: N8nWorkflow): N8nWorkflow {
    // Ensure settings object exists
    if (!workflow.settings) {
      console.log("🔧 Auto-fixing: Adding required 'settings' field")
      workflow.settings = {}
    }

    // Ensure connections object exists
    if (!workflow.connections) {
      console.log("🔧 Auto-fixing: Adding required 'connections' field")
      workflow.connections = {}
    }

    return workflow
  }

  /**
   * Clean workflow object for API (remove read-only fields)
   */
  private cleanWorkflowForApi(
    workflow: N8nWorkflow,
  ): Omit<N8nWorkflow, "id" | "active" | "createdAt" | "updatedAt" | "versionId" | "staticData"> {
    const cleanWorkflow = { ...workflow }
    delete cleanWorkflow.id
    delete cleanWorkflow.active
    delete cleanWorkflow.createdAt
    delete cleanWorkflow.updatedAt
    delete cleanWorkflow.versionId
    delete cleanWorkflow.staticData
    return cleanWorkflow
  }

  /**
   * Handle API errors with detailed context like the original script
   */
  private handleApiError(error: any, context: { action: string }): never {
    if (error.response?.status === 401) {
      throw new Error(`Authentication failed. Check your API key. Get a new key from n8n Settings → n8n API`)
    } else if (error.response?.status === 404) {
      // More specific 404 messages based on context
      if (context.action === "Get execution") {
        throw new Error(`Execution not found. The execution ID may be invalid or has been deleted.`)
      } else if (context.action === "Delete workflow" || context.action === "Update workflow") {
        throw new Error(`Workflow not found. The workflow ID may be invalid or has been deleted.`)
      } else {
        throw new Error(`Resource not found. The requested item does not exist.`)
      }
    } else if (error.response?.status === 400) {
      const message = error.response?.data?.message ? `n8n error: ${error.response.data.message}` : "Bad request"
      throw new Error(`${context.action} failed: ${message}. Check workflow structure and node types`)
    } else if (error.code === "ECONNREFUSED") {
      throw new Error(`Cannot connect to n8n. Is it running at ${this.baseUrl}?`)
    } else if (error.code === "ETIMEDOUT") {
      throw new Error(`Connection timed out. Check network and n8n URL: ${this.baseUrl}`)
    } else {
      throw new Error(`${context.action} failed: ${error.message}`)
    }
  }

  /**
   * Make authenticated API request
   */
  private async makeRequest(method: string, endpoint: string, data?: any, params?: any): Promise<any> {
    try {
      let url = `${this.baseUrl}/api/v1${endpoint}`

      // Add query parameters if provided
      if (params) {
        const queryString = new URLSearchParams(params).toString()
        url += `?${queryString}`
      }

      const response = await fetch(url, {
        method: method.toUpperCase(),
        headers: {
          "X-N8N-API-KEY": this.apiKey,
          "Content-Type": "application/json",
        },
        body: data ? JSON.stringify(data) : undefined,
        signal: AbortSignal.timeout(30000),
      })

      if (!response.ok) {
        const errorData = await response.text()
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`)
        ;(error as any).response = {
          status: response.status,
          statusText: response.statusText,
          data: errorData ? JSON.parse(errorData) : undefined,
        }
        throw error
      }

      return await response.json()
    } catch (error: any) {
      if (error.name === "AbortError") {
        error.code = "ETIMEDOUT"
      }
      throw error
    }
  }

  /**
   * Deploy workflow with create/update logic and auto-activation
   */
  async deployWorkflow(workflow: N8nWorkflow): Promise<DeployResult> {
    try {
      // Validate and fix workflow
      const fixedWorkflow = this.ensureWorkflowStructure({ ...workflow })
      const webhookNode = this.validateWorkflow(fixedWorkflow)

      // Apply fixes back to workflow
      const webhookIndex = fixedWorkflow.nodes.findIndex((n) => n.type === "n8n-nodes-base.webhook")
      if (webhookIndex !== -1) {
        fixedWorkflow.nodes[webhookIndex] = webhookNode
      }

      // Check if workflow exists
      const workflows = await this.makeRequest("GET", "/workflows")
      const existing = workflows.data?.find((w: any) => w.name === fixedWorkflow.name)

      // Clean workflow for API
      const cleanWorkflow = this.cleanWorkflowForApi(fixedWorkflow)

      let result
      let status: "created" | "updated"

      if (existing) {
        // Update existing
        result = await this.makeRequest("PUT", `/workflows/${existing.id}`, cleanWorkflow)
        status = "updated"
        console.log(`✅ Updated workflow: ${fixedWorkflow.name} (ID: ${existing.id})`)
      } else {
        // Create new
        result = await this.makeRequest("POST", "/workflows", cleanWorkflow)
        status = "created"
        console.log(`✅ Created workflow: ${fixedWorkflow.name} (ID: ${result.id})`)
      }

      // Activate workflow if not already active
      if (!result.active) {
        try {
          await this.makeRequest("POST", `/workflows/${result.id}/activate`, {})
          console.log("✅ Workflow activated")
        } catch (error: unknown) {
          console.error("⚠️  Workflow created but not activated")
          if (error && typeof error === "object" && "response" in error) {
            const err = error as { response?: { data?: { message?: string } } }
            if (err.response?.data?.message) {
              console.error(`🔴 Activation error: ${err.response.data.message}`)
            }
          }
          console.error("💡 Workflow may have credential issues or missing connections")
        }
      }

      // Generate webhook URL
      const webhookPath = webhookNode.parameters?.path || webhookNode.webhookId || result.id
      const webhookUrl = `${this.baseUrl}/webhook/${webhookPath}`
      console.log(`🔗 Webhook URL: ${webhookUrl}`)

      return {
        workflowId: result.id,
        webhookUrl,
        status,
      }
    } catch (error) {
      this.handleApiError(error, { action: "Deploy workflow" })
    }
  }

  /**
   * Test workflow by triggering webhook and getting execution details
   */
  async testWorkflow(workflowId: string, testData: any = {}): Promise<TestResult> {
    try {
      // Get workflow details to find webhook
      const workflow = await this.makeRequest("GET", `/workflows/${workflowId}`)
      const webhookNode = workflow.nodes?.find((n: any) => n.type === "n8n-nodes-base.webhook")

      if (!webhookNode) {
        throw new Error("Workflow does not have a webhook trigger node")
      }

      // Trigger webhook
      const webhookPath = webhookNode.parameters?.path || webhookNode.webhookId || workflowId
      const webhookUrl = `${this.baseUrl}/webhook/${webhookPath}`
      const httpMethod = webhookNode.parameters?.httpMethod || "POST"

      console.log(`🚀 Testing via webhook: ${webhookUrl}`)

      const response = await fetch(webhookUrl, {
        method: httpMethod,
        headers: { "Content-Type": "application/json" },
        body: httpMethod !== "GET" ? JSON.stringify(testData) : undefined,
        signal: AbortSignal.timeout(30000),
      })

      if (!response.ok) {
        throw new Error(`Webhook test failed: HTTP ${response.status}: ${response.statusText}`)
      }

      console.log("✅ Webhook triggered successfully")

      // Wait for execution to complete
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Get execution details
      const execution = await this.getLatestExecution(workflowId)

      if (execution) {
        return this.processExecutionDetails(execution)
      }

      // Fallback to webhook response
      return this.processWebhookResponse(response)
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * Update existing workflow
   */
  async updateWorkflow(workflowId: string, updates: Partial<N8nWorkflow>): Promise<any> {
    try {
      // Get current workflow
      const current = await this.makeRequest("GET", `/workflows/${workflowId}`)

      // Merge updates with current workflow
      const updated = { ...current, ...updates }

      // Ensure required fields are present for PUT request
      const workflowToUpdate: any = {
        name: updated.name,
        nodes: updated.nodes || [],
        connections: updated.connections || {},
        settings: updated.settings || {},
      }

      // Add optional fields if they exist (but NOT active - it's read-only in PUT)
      if (updated.staticData) workflowToUpdate.staticData = updated.staticData
      if (updated.pinData) workflowToUpdate.pinData = updated.pinData
      if (updated.meta) workflowToUpdate.meta = updated.meta

      // Send PUT request with complete but minimal workflow
      const result = await this.makeRequest("PUT", `/workflows/${workflowId}`, workflowToUpdate)

      console.log(`✅ Updated workflow: ${workflowId}`)
      return result
    } catch (error) {
      this.handleApiError(error, { action: "Update workflow" })
    }
  }

  private processExecutionDetails(execution: N8nExecution): TestResult {
    if (execution.data?.resultData?.error) {
      const error = execution.data.resultData.error
      throw new Error(`Workflow failed in node "${error.node?.name || "unknown"}": ${error.message}`)
    }

    if (execution.finished) {
      console.log("✅ Workflow executed successfully")
      const output = this.extractExecutionOutput(execution)
      return {
        success: true,
        executionId: execution.id,
        output,
      }
    }

    throw new Error("Workflow still running or incomplete")
  }

  private extractExecutionOutput(execution: N8nExecution): any {
    if (!execution.data?.resultData?.runData) {
      return undefined
    }
    const nodes = Object.keys(execution.data.resultData.runData)
    const lastNode = nodes[nodes.length - 1]
    const nodeOutput = execution.data.resultData.runData[lastNode]
    if (nodeOutput?.[0]?.data?.main?.[0]) {
      const output = nodeOutput[0].data.main[0]
      console.log("📊 Output:", JSON.stringify(output, null, 2))
      return output
    }
    return undefined
  }

  private async processWebhookResponse(response: Response): Promise<TestResult> {
    const responseText = await response.text()
    let responseData: any

    if (responseText) {
      try {
        responseData = JSON.parse(responseText)
        console.log("📊 Response:", JSON.stringify(responseData, null, 2))
      } catch {
        responseData = responseText
        console.log("📊 Response (text):", responseData)
      }
    } else {
      responseData = null
      console.log("📊 Response: (empty)")
    }

    return {
      success: true,
      output: responseData,
    }
  }

  /**
   * Get execution with full data
   */
  async getExecution(executionId: string): Promise<N8nExecution> {
    try {
      return await this.makeRequest("GET", `/executions/${executionId}`, undefined, { includeData: true })
    } catch (error) {
      this.handleApiError(error, { action: "Get execution" })
    }
  }

  /**
   * Get latest execution for workflow
   */
  async getLatestExecution(workflowId: string): Promise<N8nExecution | null> {
    try {
      const executions = await this.makeRequest("GET", "/executions", undefined, { workflowId })

      if (executions.data && executions.data.length > 0) {
        const latestExecution = executions.data[0]
        return await this.getExecution(latestExecution.id)
      }

      return null
    } catch (error) {
      return null
    }
  }

  /**
   * List executions with optional filtering
   */
  async listExecutions(
    options: {
      workflowId?: string
      status?: "success" | "error" | "running" | "waiting"
      limit?: number
    } = {},
  ): Promise<N8nExecution[]> {
    try {
      const params: any = {}

      if (options.workflowId) params.workflowId = options.workflowId
      if (options.status) params.status = options.status
      if (options.limit) params.limit = options.limit

      const result = await this.makeRequest("GET", "/executions", undefined, params)

      // Return full execution details for each execution
      const executions = result.data || []
      const fullExecutions = []

      for (const exec of executions) {
        try {
          const fullExec = await this.getExecution(exec.id)
          fullExecutions.push(fullExec)
        } catch (error) {
          // If we can't get full details, include basic info
          fullExecutions.push(exec)
        }
      }

      return fullExecutions
    } catch (error) {
      this.handleApiError(error, { action: "List executions" })
    }
  }

  /**
   * List workflows with optional filtering
   */
  async listWorkflows(limit: number = 100, activeOnly: boolean = false): Promise<N8nWorkflow[]> {
    try {
      const params: any = { limit }
      if (activeOnly) {
        params.active = true
      }

      const result = await this.makeRequest("GET", "/workflows", undefined, params)
      return result.data || []
    } catch (error) {
      this.handleApiError(error, { action: "List workflows" })
    }
  }

  /**
   * Delete workflow
   */
  async deleteWorkflow(workflowId: string): Promise<void> {
    try {
      await this.makeRequest("DELETE", `/workflows/${workflowId}`)
      console.log(`✅ Deleted workflow: ${workflowId}`)
    } catch (error) {
      this.handleApiError(error, { action: "Delete workflow" })
    }
  }

  /**
   * Test connection to n8n instance
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.makeRequest("GET", "/workflows")
      console.log(`✅ Successfully connected to n8n! Found ${result.data?.length || 0} workflows`)
      return true
    } catch (error) {
      console.error("❌ Connection failed:", (error as Error).message)
      return false
    }
  }
}
