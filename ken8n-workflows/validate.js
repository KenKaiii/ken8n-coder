#!/usr/bin/env node

import fs from "fs"

const SUPER_CODE_LIBRARIES = [
  "lodash", "axios", "cheerio", "dayjs", "moment", "dateFns", "dateFnsTz", 
  "joi", "Joi", "validator", "uuid", "Ajv", "yup", "csvParse", "xml2js", 
  "XMLParser", "YAML", "papaparse", "Papa", "Handlebars", "CryptoJS", 
  "forge", "jwt", "bcrypt", "bcryptjs", "XLSX", "pdfLib", "archiver", 
  "Jimp", "QRCode", "math", "fuzzy", "stringSimilarity", "slug", 
  "pluralize", "qs", "FormData", "ini", "toml", "nanoid", "bytes", 
  "phoneNumber", "iban", "ethers", "web3", "ytdl", "ffmpeg", "ffmpegStatic"
]

function validateWorkflow(filePath) {
  console.log(`🔍 Validating: ${filePath}`)
  console.log("━".repeat(60))
  
  const errors = []
  const warnings = []

  try {
    // 1. File and JSON validation
    if (!fs.existsSync(filePath)) {
      errors.push(`File does not exist: ${filePath}`)
      return generateReport(errors, warnings)
    }

    const workflow = JSON.parse(fs.readFileSync(filePath, "utf8"))

    // 2. Root structure validation
    if (Array.isArray(workflow)) {
      errors.push('Workflow must be an object, not an array. Use {"name": "...", "nodes": [...]} structure')
    }

    if (!workflow.name) errors.push('Missing required field: "name"')
    if (!workflow.nodes) errors.push('Missing required field: "nodes"')
    if (!workflow.connections) warnings.push('Missing recommended field: "connections"')
    if (!workflow.meta) warnings.push('Missing recommended field: "meta"')

    // 3. Nodes validation
    if (workflow.nodes) {
      const nodeIds = new Set()
      const nodeNames = new Set()

      workflow.nodes.forEach((node, index) => {
        const prefix = `Node[${index}]`
        
        if (!node.id) errors.push(`${prefix}: Missing required field "id"`)
        if (!node.name) errors.push(`${prefix}: Missing required field "name"`)
        if (!node.type) errors.push(`${prefix}: Missing required field "type"`)
        
        if (node.id && nodeIds.has(node.id)) {
          errors.push(`${prefix}: Duplicate node ID "${node.id}"`)
        }
        if (node.id) nodeIds.add(node.id)
        
        if (node.name && nodeNames.has(node.name)) {
          errors.push(`${prefix}: Duplicate node name "${node.name}"`)
        }
        if (node.name) nodeNames.add(node.name)
      })
    }

    // 4. Node-specific parameter validation
    if (workflow.nodes) {
      workflow.nodes.forEach(node => {
        const prefix = `Node[${node.name}]`
        
        // Super Code specific validation
        if (node.type === "@kenkaiii/n8n-nodes-supercode.superCodeNodeVmSafe") {
          if (node.parameters && "jsCode" in node.parameters) {
            errors.push(`${prefix}: Use "code" parameter, not "jsCode"`)
          }
          
          if (!node.parameters || !("code" in node.parameters)) {
            errors.push(`${prefix}: Missing required "code" parameter`)
          }
          
          if (node.parameters && node.parameters.code) {
            const code = node.parameters.code
            
            if (code.includes("require(")) {
              errors.push(`${prefix}: NEVER use require() statements - use global variables`)
            }
            
            if (code.includes("import ")) {
              errors.push(`${prefix}: NEVER use import statements - use global variables`)
            }
            
            try {
              new Function(code)
            } catch (syntaxError) {
              errors.push(`${prefix}: JavaScript syntax error - ${syntaxError.message}`)
            }
          }
        }
        
        // Common n8n node parameter validation
        if (node.parameters) {
          // Check for common missing parameter structures
          if (node.type === "n8n-nodes-base.set") {
            if (!node.parameters.values && !node.parameters.assignments) {
              errors.push(`${prefix}: Set node missing required "values" or "assignments" parameter`)
            }
            
            if (node.parameters.values && !node.parameters.values.values) {
              errors.push(`${prefix}: Set node "values" parameter must contain "values" array`)
            }
          }
          
          if (node.type === "n8n-nodes-base.httpRequest") {
            if (!node.parameters.url && !node.parameters.requestMethod) {
              warnings.push(`${prefix}: HTTP Request node should specify url and requestMethod`)
            }
          }
          
          if (node.type === "n8n-nodes-base.webhook") {
            if (!node.parameters.httpMethod && !node.parameters.path) {
              warnings.push(`${prefix}: Webhook node should specify httpMethod and path`)
            }
          }
          
          // Check for missing options objects that n8n often requires
          if (node.parameters.values && !node.parameters.options) {
            errors.push(`${prefix}: Missing "options" object - this will cause n8n import error "Could not find property option"`)
          }
          
          // Additional n8n property validation
          if (node.type === "n8n-nodes-base.code") {
            if (!node.parameters.jsCode && !node.parameters.code) {
              errors.push(`${prefix}: Code node missing "jsCode" parameter`)
            }
          }
          
          if (node.type === "n8n-nodes-base.if") {
            if (!node.parameters.conditions) {
              errors.push(`${prefix}: IF node missing required "conditions" parameter`)
            }
          }
          
          if (node.type.includes("trigger") && node.parameters && Object.keys(node.parameters).length === 0) {
            warnings.push(`${prefix}: Trigger node may need parameter configuration`)
          }
        } else {
          // Node has no parameters - might be missing required config
          if (node.type !== "n8n-nodes-base.manualTrigger") {
            warnings.push(`${prefix}: Node has no parameters - verify if configuration is needed`)
          }
        }
      })
    }

    // 5. Security validation
    const workflowStr = JSON.stringify(workflow)
    if (/password\s*[:=]\s*["'][^"']+["']/i.test(workflowStr)) {
      warnings.push("Security: Hardcoded password detected - use credentials instead")
    }
    if (/api[_-]?key\s*[:=]\s*["'][^"']+["']/i.test(workflowStr)) {
      warnings.push("Security: Hardcoded API key detected - use credentials instead")
    }

    return generateReport(errors, warnings)

  } catch (error) {
    errors.push(`Validation failed: ${error.message}`)
    return generateReport(errors, warnings)
  }
}

function generateReport(errors, warnings) {
  console.log("\n📊 VALIDATION REPORT")
  console.log("━".repeat(40))

  if (errors.length === 0 && warnings.length === 0) {
    console.log("✅ Workflow Clear, No problems!")
    console.log("🎉 Ready for n8n import")
    return { success: true, errors: 0, warnings: 0 }
  }

  if (errors.length > 0) {
    console.log(`❌ ERRORS (${errors.length}):`)
    errors.forEach((error, i) => console.log(`  ${i + 1}. ${error}`))
    console.log("")
  }

  if (warnings.length > 0) {
    console.log(`⚠️  WARNINGS (${warnings.length}):`)
    warnings.forEach((warning, i) => console.log(`  ${i + 1}. ${warning}`))
    console.log("")
  }

  if (errors.length > 0) {
    console.log("🚫 VALIDATION FAILED - Fix errors before importing to n8n")
    return { success: false, errors: errors.length, warnings: warnings.length }
  } else {
    console.log("✅ VALIDATION PASSED - Warnings should be reviewed but workflow is importable")
    return { success: true, errors: 0, warnings: warnings.length }
  }
}

// Command line usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const filePath = process.argv[2]
  
  if (!filePath) {
    console.log("Usage: node validate.js <workflow.json>")
    console.log("Example: node validate.js my-workflow.json")
    process.exit(1)
  }

  const result = validateWorkflow(filePath)
  process.exit(result.success ? 0 : 1)
}

export { validateWorkflow }