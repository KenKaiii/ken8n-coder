#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { N8nClient } from './n8n-client.js';
// Removed fs, path, os imports - no longer needed for config file

// Input schemas
const DeployWorkflowSchema = z.object({
  workflow: z.object({}).passthrough(), // Accept any workflow JSON object
  name: z.string().optional(),
  active: z.boolean().optional().default(true)
});

const TestWorkflowSchema = z.object({
  workflowId: z.string().optional(),
  workflow: z.object({}).passthrough().optional(),
  testData: z.object({}).passthrough().optional()
});

const UpdateWorkflowSchema = z.object({
  workflowId: z.string(),
  updates: z.object({}).passthrough()
});

const GetExecutionSchema = z.object({
  executionId: z.string()
});

const ListWorkflowsSchema = z.object({
  limit: z.number().optional().default(20),
  active: z.boolean().optional()
});

const DeleteWorkflowSchema = z.object({
  workflowId: z.string()
});

interface N8nConfig {
  baseUrl: string;
  apiKey: string;
}

class N8nMCPServer {
  private server: Server;
  private n8nClient: N8nClient;

  constructor() {
    this.server = new Server(
      {
        name: 'mcp-n8n-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Load config from environment variables only
    const config = this.loadConfig();
    this.n8nClient = new N8nClient(config.baseUrl, config.apiKey);

    this.setupHandlers();
  }

  private loadConfig(): N8nConfig {
    // Use environment variables only
    const baseUrl = process.env.N8N_BASE_URL || 'http://localhost:5678';
    const apiKey = process.env.N8N_API_KEY || '';
    
    if (!apiKey) {
      throw new Error('N8N_API_KEY environment variable is required. Set it in your claude_mcp.json environment configuration.');
    }
    
    return { baseUrl, apiKey };
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'n8n_deploy',
            description: 'Deploy a workflow to n8n',
            inputSchema: {
              type: 'object',
              properties: {
                workflow: {
                  type: 'object',
                  description: 'The workflow JSON object'
                },
                name: {
                  type: 'string',
                  description: 'Optional workflow name'
                },
                active: {
                  type: 'boolean',
                  description: 'Whether the workflow should be active',
                  default: true
                }
              },
              required: ['workflow']
            }
          },
          {
            name: 'n8n_test',
            description: 'Test a workflow execution',
            inputSchema: {
              type: 'object',
              properties: {
                workflowId: {
                  type: 'string',
                  description: 'ID of existing workflow to test'
                },
                workflow: {
                  type: 'object',
                  description: 'Workflow JSON for direct testing'
                },
                testData: {
                  type: 'object',
                  description: 'Test data to pass to the workflow'
                }
              }
            }
          },
          {
            name: 'n8n_update',
            description: 'Update an existing workflow',
            inputSchema: {
              type: 'object',
              properties: {
                workflowId: {
                  type: 'string',
                  description: 'ID of the workflow to update'
                },
                updates: {
                  type: 'object',
                  description: 'Updates to apply to the workflow'
                }
              },
              required: ['workflowId', 'updates']
            }
          },
          {
            name: 'n8n_get_execution',
            description: 'Get execution details by ID',
            inputSchema: {
              type: 'object',
              properties: {
                executionId: {
                  type: 'string',
                  description: 'ID of the execution to retrieve'
                }
              },
              required: ['executionId']
            }
          },
          {
            name: 'n8n_list_workflows',
            description: 'List workflows with optional filters',
            inputSchema: {
              type: 'object',
              properties: {
                limit: {
                  type: 'number',
                  description: 'Maximum number of workflows to return',
                  default: 20
                },
                active: {
                  type: 'boolean',
                  description: 'Filter by active status'
                }
              }
            }
          },
          {
            name: 'n8n_delete',
            description: 'Delete a workflow by ID',
            inputSchema: {
              type: 'object',
              properties: {
                workflowId: {
                  type: 'string',
                  description: 'ID of the workflow to delete'
                }
              },
              required: ['workflowId']
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case 'n8n_deploy':
            return await this.deployWorkflow(request.params.arguments);
          
          case 'n8n_test':
            return await this.testWorkflow(request.params.arguments);
          
          case 'n8n_update':
            return await this.updateWorkflow(request.params.arguments);
          
          case 'n8n_get_execution':
            return await this.getExecution(request.params.arguments);
          
          case 'n8n_list_workflows':
            return await this.listWorkflows(request.params.arguments);
          
          case 'n8n_delete':
            return await this.deleteWorkflow(request.params.arguments);
          
          default:
            throw new Error(`Unknown tool: ${request.params.name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ]
        };
      }
    });
  }

  private async deployWorkflow(args: unknown) {
    const { workflow, name, active } = DeployWorkflowSchema.parse(args);
    
    // Use workflow JSON directly - no file reading!
    const workflowToDeply = {
      ...workflow,
      name: name || workflow.name || 'Unnamed Workflow',
      nodes: workflow.nodes || []
    } as any; // Type assertion since workflow comes from zod validation

    try {
      const result = await this.n8nClient.deployWorkflow(workflowToDeply);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              workflowId: result.workflowId,
              webhookUrl: result.webhookUrl,
              status: result.status,
              active: active !== false // Default to true unless explicitly false
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }, null, 2)
          }
        ]
      };
    }
  }

  private async testWorkflow(args: unknown) {
    const { workflowId, workflow, testData } = TestWorkflowSchema.parse(args);

    try {
      let result;
      
      if (workflowId) {
        // Test existing workflow by ID
        result = await this.n8nClient.testWorkflow(workflowId, testData || {});
      } else if (workflow) {
        // For direct workflow testing, we need to deploy it first temporarily
        // This matches the behavior users expect - test the workflow as-is
        const deployResult = await this.n8nClient.deployWorkflow({
          ...workflow,
          name: `temp-test-${Date.now()}`,
          nodes: workflow.nodes || []
        } as any); // Type assertion since workflow comes from zod validation
        
        result = await this.n8nClient.testWorkflow(deployResult.workflowId, testData || {});
        
        // Clean up temporary workflow
        try {
          await this.n8nClient.deleteWorkflow(deployResult.workflowId);
        } catch {
          // Ignore cleanup errors
        }
      } else {
        throw new Error('Either workflowId or workflow must be provided');
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }, null, 2)
          }
        ]
      };
    }
  }

  private async updateWorkflow(args: unknown) {
    const { workflowId, updates } = UpdateWorkflowSchema.parse(args);

    try {
      const result = await this.n8nClient.updateWorkflow(workflowId, updates);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              workflowId: result.id,
              name: result.name,
              active: result.active,
              updatedAt: result.updatedAt
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }, null, 2)
          }
        ]
      };
    }
  }

  private async getExecution(args: unknown) {
    const { executionId } = GetExecutionSchema.parse(args);

    try {
      const execution = await this.n8nClient.getExecution(executionId);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              execution: {
                id: execution.id,
                finished: execution.finished,
                mode: execution.mode,
                startedAt: execution.startedAt,
                stoppedAt: execution.stoppedAt,
                workflowId: execution.workflowId,
                data: execution.data
              }
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }, null, 2)
          }
        ]
      };
    }
  }

  private async listWorkflows(args: unknown) {
    const { limit, active } = ListWorkflowsSchema.parse(args);

    try {
      const workflows = await this.n8nClient.listWorkflows(limit, active);
      
      const workflowSummaries = workflows.map(workflow => ({
        id: workflow.id,
        name: workflow.name,
        active: workflow.active,
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              count: workflowSummaries.length,
              workflows: workflowSummaries
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }, null, 2)
          }
        ]
      };
    }
  }

  private async deleteWorkflow(args: unknown) {
    const { workflowId } = DeleteWorkflowSchema.parse(args);

    try {
      await this.n8nClient.deleteWorkflow(workflowId);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Workflow ${workflowId} deleted successfully`
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }, null, 2)
          }
        ]
      };
    }
  }


  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    // Log server start to stderr so it doesn't interfere with MCP communication
    console.error('MCP n8n Server running on stdio');
  }
}

// Start the server
const server = new N8nMCPServer();
server.run().catch(console.error);