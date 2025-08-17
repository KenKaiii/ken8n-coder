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

// Enhanced validation configuration
const VALIDATION_CONFIG = {
  enableAdvancedValidation: true,
  validateExecution: true,
  validateDataStructures: true,
  maxExecutionTime: 5000, // 5 seconds
  maxCodeLength: 50000 // 50KB
}

function validateWorkflow(filePath, options = {}) {
  console.log(`🔍 Validating: ${filePath}`)
  console.log("━".repeat(60))
  
  const errors = []
  const warnings = []
  const config = { ...VALIDATION_CONFIG, ...options }

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
            
            // Enhanced Super Code validation
            if (config.enableAdvancedValidation) {
              validateSuperCodeAdvanced(code, prefix, errors, warnings, config)
              
              // Execution context simulation
              if (config.validateExecution) {
                simulateN8nExecution(code, prefix, errors, warnings, config)
              }
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

    // 5. Advanced workflow validation
    if (config.enableAdvancedValidation) {
      validateWorkflowConnections(workflow, errors, warnings)
      validateWorkflowDataFlow(workflow, errors, warnings)
      validateN8nCompatibility(workflow, errors, warnings)
    }

    // 6. Security validation
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

// ========================================
// ADVANCED SUPER CODE NODE VALIDATION
// ========================================

function validateSuperCodeAdvanced(code, prefix, errors, warnings, config) {
  // 1. Library usage validation
  validateLibraryUsage(code, prefix, errors, warnings)
  
  // 2. n8n execution context validation
  validateN8nContext(code, prefix, errors, warnings)
  
  // 3. Return value structure validation
  validateReturnStructure(code, prefix, errors, warnings)
  
  // 4. Performance and security validation
  validatePerformanceAndSecurity(code, prefix, errors, warnings, config)
  
  // 5. Data flow patterns validation
  validateDataFlowPatterns(code, prefix, errors, warnings)
}

function validateLibraryUsage(code, prefix, errors, warnings) {
  // Check for unsupported library usage patterns
  const unsupportedPatterns = [
    { pattern: /require\s*\(/g, message: "Use global variables instead of require()" },
    { pattern: /import\s+.*from/g, message: "Use global variables instead of import statements" },
    { pattern: /eval\s*\(/g, message: "eval() is dangerous and not supported" },
    { pattern: /Function\s*\(/g, message: "Dynamic function creation may not work in n8n environment" }
  ]
  
  unsupportedPatterns.forEach(({ pattern, message }) => {
    if (pattern.test(code)) {
      errors.push(`${prefix}: ${message}`)
    }
  })
  
  // Check for missing library references that are used
  const usedLibraries = []
  SUPER_CODE_LIBRARIES.forEach(lib => {
    const regex = new RegExp(`\\b${lib}\\.`, 'g')
    if (regex.test(code)) {
      usedLibraries.push(lib)
    }
  })
  
  if (usedLibraries.length > 0) {
    warnings.push(`${prefix}: Uses libraries: ${usedLibraries.join(', ')} - ensure these are available in n8n`)
  }
}

function validateN8nContext(code, prefix, errors, warnings) {
  // Check for common n8n input patterns
  const n8nPatterns = [
    { pattern: /\$input\./g, found: false },
    { pattern: /\$node\./g, found: false },
    { pattern: /\$workflow\./g, found: false }
  ]
  
  n8nPatterns.forEach(p => {
    if (p.pattern.test(code)) p.found = true
  })
  
  // Check for proper input data handling
  if (code.includes('$input')) {
    const inputMethods = ['all()', 'first()', 'item']
    const hasValidInputMethod = inputMethods.some(method => code.includes(method))
    
    if (!hasValidInputMethod) {
      warnings.push(`${prefix}: Using $input but no standard method (all(), first(), item) detected`)
    }
  }
  
  // Check for common data access patterns
  if (code.includes('.json') && !code.includes('$input')) {
    warnings.push(`${prefix}: Accessing .json property without $input context - verify data source`)
  }
}

function validateReturnStructure(code, prefix, errors, warnings) {
  // Check for proper return statement
  if (!code.includes('return')) {
    errors.push(`${prefix}: Missing return statement - Super Code nodes must return data`)
    return
  }
  
  // Check for proper n8n data structure return
  const returnPattern = /return\s*\[\s*\{\s*json\s*:/
  if (!returnPattern.test(code)) {
    warnings.push(`${prefix}: Return value should follow n8n format: return [{json: {...}}]`)
  }
  
  // Check for common return mistakes
  if (code.includes('return json') || code.includes('return data')) {
    warnings.push(`${prefix}: Direct return of data - wrap in array with json property: [{json: data}]`)
  }
}

function validatePerformanceAndSecurity(code, prefix, errors, warnings, config) {
  // Code length check
  if (code.length > config.maxCodeLength) {
    warnings.push(`${prefix}: Code is ${code.length} characters (max recommended: ${config.maxCodeLength})`)
  }
  
  // Check for potentially blocking operations
  const blockingPatterns = [
    { pattern: /while\s*\(\s*true\s*\)/g, message: "Infinite while loop detected" },
    { pattern: /for\s*\(.*;;.*\)/g, message: "Potential infinite for loop" },
    { pattern: /setInterval|setTimeout/g, message: "Timers may not work properly in n8n execution context" }
  ]
  
  blockingPatterns.forEach(({ pattern, message }) => {
    if (pattern.test(code)) {
      warnings.push(`${prefix}: ${message}`)
    }
  })
  
  // Check for large data operations
  if (code.includes('new Array(') || code.includes('Array.from(')) {
    warnings.push(`${prefix}: Large array creation detected - consider memory implications`)
  }
  
  // Security checks
  const securityPatterns = [
    { pattern: /process\./g, message: "Process object access may be restricted" },
    { pattern: /global\./g, message: "Global object access may be restricted" },
    { pattern: /Buffer\./g, message: "Buffer usage should be validated for n8n compatibility" }
  ]
  
  securityPatterns.forEach(({ pattern, message }) => {
    if (pattern.test(code)) {
      warnings.push(`${prefix}: ${message}`)
    }
  })
}

function validateDataFlowPatterns(code, prefix, errors, warnings) {
  // Check for proper error handling
  if (code.includes('try') && !code.includes('catch')) {
    warnings.push(`${prefix}: Try block without catch - add error handling for workflow stability`)
  }
  
  // Check for async/await usage
  if (code.includes('async') || code.includes('await')) {
    warnings.push(`${prefix}: Async/await detected - ensure proper handling in n8n execution context`)
  }
  
  // Check for console usage
  if (code.includes('console.')) {
    warnings.push(`${prefix}: Console statements detected - use proper n8n logging or remove for production`)
  }
  
  // Check for data validation patterns
  if (!code.includes('if') && !code.includes('?')) {
    warnings.push(`${prefix}: No conditional logic detected - consider input validation`)
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

// ========================================
// EXECUTION CONTEXT SIMULATION
// ========================================

function simulateN8nExecution(code, prefix, errors, warnings, config) {
  if (!config.validateExecution) return
  
  try {
    // Create mock n8n context
    const mockContext = createMockN8nContext()
    
    // Create execution wrapper
    const wrappedCode = `
      with (mockContext) {
        ${code}
      }
    `
    
    // Test execution with timeout
    const startTime = Date.now()
    const result = executeWithTimeout(wrappedCode, mockContext, config.maxExecutionTime)
    const executionTime = Date.now() - startTime
    
    if (executionTime > 1000) {
      warnings.push(`${prefix}: Execution took ${executionTime}ms - consider optimization`)
    }
    
    // Validate result structure
    if (result && !Array.isArray(result)) {
      warnings.push(`${prefix}: Return value is not an array - n8n expects array format`)
    }
    
    if (result && Array.isArray(result) && result.length > 0) {
      result.forEach((item, index) => {
        if (!item.json) {
          warnings.push(`${prefix}: Item ${index} missing 'json' property`)
        }
      })
    }
    
  } catch (error) {
    warnings.push(`${prefix}: Execution simulation failed - ${error.message}`)
  }
}

function createMockN8nContext() {
  return {
    // Mock $input object
    $input: {
      all: () => [{ json: { test: 'data' } }],
      first: () => ({ json: { test: 'data' } }),
      item: { json: { test: 'data' } }
    },
    
    // Mock $node object
    $node: {
      name: 'Test Node',
      type: '@kenkaiii/n8n-nodes-supercode.superCodeNodeVmSafe'
    },
    
    // Mock $workflow object
    $workflow: {
      name: 'Test Workflow',
      id: 'test-workflow-id'
    },
    
    // Mock Super Code libraries (basic versions)
    lodash: { 
      map: (arr, fn) => arr.map(fn), 
      filter: (arr, fn) => arr.filter(fn),
      meanBy: (arr, prop) => arr.reduce((sum, item) => sum + (typeof prop === 'string' ? item[prop] : prop(item)), 0) / arr.length,
      minBy: (arr, prop) => arr.reduce((min, item) => {
        const val = typeof prop === 'string' ? item[prop] : prop(item)
        return !min || val < (typeof prop === 'string' ? min[prop] : prop(min)) ? item : min
      }),
      maxBy: (arr, prop) => arr.reduce((max, item) => {
        const val = typeof prop === 'string' ? item[prop] : prop(item)
        return !max || val > (typeof prop === 'string' ? max[prop] : prop(max)) ? item : max
      }),
      uniq: (arr) => [...new Set(arr)],
      sumBy: (arr, prop) => arr.reduce((sum, item) => sum + (typeof prop === 'string' ? item[prop] : prop(item)), 0),
      groupBy: (arr, prop) => arr.reduce((groups, item) => {
        const key = typeof prop === 'string' ? item[prop] : prop(item)
        groups[key] = groups[key] || []
        groups[key].push(item)
        return groups
      }, {}),
      mapValues: (obj, fn) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, fn(v, k)])),
      every: (arr, fn) => arr.every(fn),
      uniqBy: (arr, prop) => arr.filter((item, index, self) => 
        index === self.findIndex(t => (typeof prop === 'string' ? t[prop] : prop(t)) === (typeof prop === 'string' ? item[prop] : prop(item)))
      )
    },
    dayjs: () => ({ format: () => '2024-01-01', toISOString: () => '2024-01-01T00:00:00.000Z' }),
    uuid: { v4: () => 'test-uuid' },
    validator: { isEmail: () => true, isFloat: () => true, isSlug: () => true }
  }
}

function executeWithTimeout(code, context, timeout) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Execution timeout after ${timeout}ms`))
    }, timeout)
    
    try {
      const func = new Function('mockContext', `return (function() { ${code} })();`)
      const result = func(context)
      clearTimeout(timer)
      resolve(result)
    } catch (error) {
      clearTimeout(timer)
      reject(error)
    }
  })
}

// ========================================
// WORKFLOW-LEVEL VALIDATION
// ========================================

function validateWorkflowConnections(workflow, errors, warnings) {
  if (!workflow.connections || !workflow.nodes) return
  
  const nodeMap = new Map()
  workflow.nodes.forEach(node => {
    nodeMap.set(node.name, node)
  })
  
  // Validate all connection references
  Object.entries(workflow.connections).forEach(([sourceName, outputs]) => {
    if (!nodeMap.has(sourceName)) {
      errors.push(`Connection error: Source node "${sourceName}" does not exist`)
      return
    }
    
    Object.entries(outputs).forEach(([outputType, connections]) => {
      connections.forEach((connectionArray, outputIndex) => {
        connectionArray.forEach(connection => {
          if (!nodeMap.has(connection.node)) {
            errors.push(`Connection error: Target node "${connection.node}" does not exist`)
          }
          
          // Validate connection structure
          if (!connection.type || !Number.isInteger(connection.index)) {
            warnings.push(`Connection warning: Invalid connection structure from ${sourceName} to ${connection.node}`)
          }
        })
      })
    })
  })
  
  // Check for orphaned nodes (no connections)
  const connectedNodes = new Set()
  workflow.nodes.forEach(node => {
    if (node.type === 'n8n-nodes-base.manualTrigger' || node.type.includes('trigger')) {
      connectedNodes.add(node.name)
    }
  })
  
  Object.entries(workflow.connections).forEach(([sourceName, outputs]) => {
    connectedNodes.add(sourceName)
    Object.values(outputs).forEach(connectionType => {
      connectionType.forEach(connectionArray => {
        connectionArray.forEach(connection => {
          connectedNodes.add(connection.node)
        })
      })
    })
  })
  
  workflow.nodes.forEach(node => {
    if (!connectedNodes.has(node.name)) {
      warnings.push(`Workflow: Node "${node.name}" is not connected to any other nodes`)
    }
  })
}

function validateWorkflowDataFlow(workflow, errors, warnings) {
  if (!workflow.nodes) return
  
  // Check for proper trigger nodes
  const triggerNodes = workflow.nodes.filter(node => 
    node.type.includes('trigger') || 
    node.type === 'n8n-nodes-base.manualTrigger' ||
    node.type === 'n8n-nodes-base.webhook'
  )
  
  if (triggerNodes.length === 0) {
    errors.push('Workflow: Missing trigger node - workflow needs a starting point')
  } else if (triggerNodes.length > 1) {
    warnings.push(`Workflow: Multiple trigger nodes detected (${triggerNodes.length}) - verify intended behavior`)
  }
  
  // Check for proper workflow termination
  const terminationNodes = workflow.nodes.filter(node => 
    node.type === 'n8n-nodes-base.respondToWebhook' ||
    node.type === 'n8n-nodes-base.noOp' ||
    node.type.includes('write') ||
    node.type.includes('send')
  )
  
  if (terminationNodes.length === 0) {
    warnings.push('Workflow: No clear termination nodes detected - consider adding response or output nodes')
  }
  
  // Validate node ordering and dependencies
  const nodeTypes = workflow.nodes.map(node => node.type)
  const superCodeNodes = workflow.nodes.filter(node => 
    node.type === '@kenkaiii/n8n-nodes-supercode.superCodeNodeVmSafe'
  )
  
  if (superCodeNodes.length > 3) {
    warnings.push(`Workflow: ${superCodeNodes.length} Super Code nodes detected - consider consolidating logic for better performance`)
  }
}

function validateN8nCompatibility(workflow, errors, warnings) {
  // Check for required n8n metadata
  const requiredFields = ['name', 'nodes']
  requiredFields.forEach(field => {
    if (!workflow[field]) {
      errors.push(`N8N Compatibility: Missing required field "${field}"`)
    }
  })
  
  // Check for recommended n8n metadata
  const recommendedFields = {
    'meta': 'Workflow metadata for better organization',
    'pinData': 'Pin data for testing and development',
    'versionId': 'Version tracking for workflow updates'
  }
  
  Object.entries(recommendedFields).forEach(([field, description]) => {
    if (!workflow[field]) {
      warnings.push(`N8N Compatibility: Missing recommended field "${field}" - ${description}`)
    }
  })
  
  // Validate node structure for n8n compatibility
  if (workflow.nodes) {
    workflow.nodes.forEach((node, index) => {
      const prefix = `N8N Compatibility[${node.name || index}]`
      
      // Check for required node fields
      const requiredNodeFields = ['id', 'name', 'type', 'typeVersion', 'position']
      requiredNodeFields.forEach(field => {
        if (!node[field]) {
          if (field === 'typeVersion' || field === 'position') {
            warnings.push(`${prefix}: Missing recommended field "${field}"`)
          } else {
            errors.push(`${prefix}: Missing required field "${field}"`)
          }
        }
      })
      
      // Validate node ID format
      if (node.id && !/^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/.test(node.id)) {
        warnings.push(`${prefix}: Node ID should follow UUID format for n8n compatibility`)
      }
      
      // Validate position format
      if (node.position && (!Array.isArray(node.position) || node.position.length !== 2)) {
        warnings.push(`${prefix}: Position should be array with [x, y] coordinates`)
      }
      
      // Check for common n8n node type issues
      if (node.type && !node.type.includes('.') && !node.type.startsWith('@')) {
        warnings.push(`${prefix}: Node type "${node.type}" may not be valid n8n node type`)
      }
    })
  }
  
  // Validate connections structure
  if (workflow.connections) {
    Object.entries(workflow.connections).forEach(([nodeName, connections]) => {
      if (!connections.main) {
        warnings.push(`N8N Compatibility: Node "${nodeName}" connections missing "main" output type`)
      }
    })
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

export { validateWorkflow, SUPER_CODE_LIBRARIES, VALIDATION_CONFIG }