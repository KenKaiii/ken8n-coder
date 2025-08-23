#!/usr/bin/env node

/**
 * Deploy workflow to n8n using copy-paste method
 * Usage: node deploy-workflow.js <workflow.json> [workflow-name]
 *
 * This script reads a workflow JSON file and deploys it to n8n
 * WITHOUT manually recreating the JSON structure
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function deployWorkflow(jsonFilePath, workflowName = null) {
  try {
    // Step 1: Read the entire file (this is the "copy")
    const fileContent = fs.readFileSync(jsonFilePath, "utf8")

    // Step 2: Parse the JSON
    const workflow = JSON.parse(fileContent)

    // Step 3: Optionally override the name
    if (workflowName) {
      workflow.name = workflowName
    }

    // Step 4: Output the command for the agent to use
    console.log("COPY-PASTE DEPLOYMENT READY")
    console.log("========================")
    console.log(`Workflow: ${workflow.name || "Unnamed"}`)
    console.log(`Nodes: ${workflow.nodes?.length || 0}`)
    console.log(`Size: ${fileContent.length} characters`)
    console.log("")
    console.log("To deploy, use this with n8n MCP:")
    console.log("```")
    console.log('const fileContent = Read("' + jsonFilePath + '");')
    console.log("const workflow = JSON.parse(fileContent);")
    console.log("n8n_deploy({ workflow: workflow, active: true });")
    console.log("```")

    // Save the workflow for verification
    const outputPath = "/tmp/ready-to-deploy.json"
    fs.writeFileSync(outputPath, JSON.stringify({ workflow: workflow, active: true }, null, 2))
    console.log(`\nPayload saved to: ${outputPath}`)

    return workflow
  } catch (error) {
    console.error("Error:", error.message)
    process.exit(1)
  }
}

// Main execution
const args = process.argv.slice(2)

if (args.length < 1) {
  console.log("Usage: node deploy-workflow.js <workflow.json> [workflow-name]")
  process.exit(1)
}

const jsonOutputMode = args.includes("--json-output")
const filePath = args[0]
const name = jsonOutputMode ? null : args[1] || null

if (jsonOutputMode) {
  // MCP mode: Output only the JSON workflow for the MCP tool to consume
  try {
    const fileContent = fs.readFileSync(filePath, "utf8")
    const workflow = JSON.parse(fileContent)

    // Override name if provided
    if (name) {
      workflow.name = name
    }

    // Output only the workflow JSON to stdout
    console.log(JSON.stringify(workflow))
  } catch (error) {
    console.error(`Error: ${error.message}`)
    process.exit(1)
  }
} else {
  // Agent mode: Output deployment instructions
  deployWorkflow(filePath, name)
}
