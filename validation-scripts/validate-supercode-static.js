#!/usr/bin/env node

/**
 * SuperCode Static Validator for n8n
 * Performs static analysis without requiring library dependencies
 *
 * Usage: node validate-supercode-static.js <file.js>
 */

const fs = require("fs")
const path = require("path")

// ANSI colors
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
}

class ValidationResult {
  constructor() {
    this.errors = []
    this.warnings = []
    this.info = []
  }

  addError(message) {
    this.errors.push(message)
  }

  addWarning(message) {
    this.warnings.push(message)
  }

  addInfo(message) {
    this.info.push(message)
  }

  print() {
    if (this.errors.length > 0) {
      console.log(`\n${colors.red}❌ ERRORS:${colors.reset}`)
      this.errors.forEach((err) => console.log(`   ${colors.red}• ${err}${colors.reset}`))
    }

    if (this.warnings.length > 0) {
      console.log(`\n${colors.yellow}⚠️  WARNINGS:${colors.reset}`)
      this.warnings.forEach((warn) => console.log(`   ${colors.yellow}• ${warn}${colors.reset}`))
    }

    if (this.info.length > 0) {
      console.log(`\n${colors.blue}ℹ️  INFO:${colors.reset}`)
      this.info.forEach((info) => console.log(`   ${colors.blue}• ${info}${colors.reset}`))
    }

    const passed = this.errors.length === 0
    console.log(`\n${colors.bright}═══════════════════════════════════${colors.reset}`)

    if (passed) {
      console.log(`${colors.green}${colors.bright}✅ VALIDATION PASSED${colors.reset}`)
      console.log(`${colors.green}Ready for n8n SuperCode node!${colors.reset}`)
    } else {
      console.log(`${colors.red}${colors.bright}❌ VALIDATION FAILED${colors.reset}`)
      console.log(`${colors.red}Fix the errors above before using in n8n${colors.reset}`)
    }

    return passed
  }
}

// Check import/require patterns
function checkImports(code, result) {
  if (/\brequire\s*\(/.test(code)) {
    result.addError("Uses require() - libraries are pre-loaded as globals in n8n")
    result.addInfo("Use libraries directly: lodash.map(), axios.get(), etc.")
  }

  if (/\bimport\s+/.test(code)) {
    result.addError("Uses import statements - not supported in SuperCode")
    result.addInfo("Libraries are available as globals")
  }

  if (/module\.exports|exports\.|export\s+(default|const|function|class)/.test(code)) {
    result.addError("Uses module.exports or export - code runs directly, not as module")
  }
}

// Check code structure
function checkStructure(code, result) {
  // Check for various n8n input methods
  const inputPatterns = [
    "$input",
    "$json",
    "$node",
    "$items",
    "$parameter",
    "$execution",
    "$workflow",
    '$("', // $("NodeName") syntax
    "$('", // $('NodeName') syntax
  ]

  const usesInput = inputPatterns.some((pattern) => code.includes(pattern))

  if (!usesInput) {
    result.addWarning("Code does not appear to use n8n input variables")
    result.addInfo('Common input methods: $input, $json, $node, $("NodeName")')
    result.addInfo("For webhooks/triggers: Access data directly from $json")
  }

  if (!code.includes("return")) {
    result.addError("Code does not return any data")
    result.addInfo("End with: return result")
  }

  if (/return\s*\[\s*{\s*json\s*:/.test(code)) {
    result.addError("Returns [{ json: data }] format - should return data directly")
    result.addInfo("Use: return data (not return [{ json: data }])")
  }

  if (/^\s*\(\s*function|\(\s*\(\s*\)|^\s*\(\s*async/.test(code.trim())) {
    result.addError("Code wrapped in IIFE - runs directly in node")
  }

  const entireCodeInTryCatch = /^\s*try\s*{[\s\S]*}\s*catch[\s\S]*}\s*$/
  if (entireCodeInTryCatch.test(code.trim())) {
    result.addWarning("Entire code wrapped in try-catch - node handles errors automatically")
  }
}

// Check for security issues
function checkSecurity(code, result) {
  if (/\beval\s*\(|new\s+Function\s*\(/.test(code)) {
    result.addError("Uses eval() or new Function() - security risk")
  }
}

// Check library usage
function checkLibraries(code, result) {
  const libraryPatterns = {
    lodash: /\b(lodash\.|_\.)/,
    axios: /\baxios\./,
    moment: /\bmoment\(/,
    dayjs: /\bdayjs\(/,
    uuid: /\buuid\./,
    validator: /\bvalidator\./,
    cheerio: /\bcheerio\./,
    XLSX: /\bXLSX\./,
  }

  const usedLibraries = []
  for (const [lib, pattern] of Object.entries(libraryPatterns)) {
    if (pattern.test(code)) {
      usedLibraries.push(lib)
    }
  }

  if (usedLibraries.length > 0) {
    result.addInfo(`Detected library usage: ${usedLibraries.join(", ")}`)
    result.addInfo("These are available as globals in n8n SuperCode")
  }
}

// Check for common mistakes
function checkCommonMistakes(code, result) {
  if (/\$\('/.test(code) && !code.includes("cheerio")) {
    result.addWarning("Uses $() selector - did you mean to use cheerio?")
  }

  if (/document\.|window\.|alert\(|console\.log/.test(code)) {
    result.addWarning("References browser/DOM APIs - SuperCode runs in Node.js")
  }

  // Check for any valid n8n data access pattern
  const hasN8nDataAccess =
    code.includes("$input") ||
    code.includes("$json") ||
    code.includes("$node") ||
    code.includes("$items") ||
    code.includes("$parameter") ||
    /\$\(['"]/.test(code) // $("NodeName") or $('NodeName')

  const hasReturn = code.includes("return")

  if (hasN8nDataAccess && hasReturn) {
    result.addInfo("Structure looks good: accesses n8n data and returns result")
  } else if (hasReturn && !hasN8nDataAccess) {
    result.addInfo("Returns data but doesn't access n8n variables - may be a utility function")
  }
}

function validateCode(code) {
  const result = new ValidationResult()

  console.log(`\n${colors.bright}${colors.blue}═══ SuperCode Static Validator ═══${colors.reset}\n`)
  console.log(`${colors.yellow}Note: This performs static analysis only${colors.reset}`)
  console.log(`${colors.yellow}For full validation, install dependencies first${colors.reset}\n`)

  checkImports(code, result)
  checkStructure(code, result)
  checkSecurity(code, result)
  checkLibraries(code, result)
  checkCommonMistakes(code, result)

  return result
}

// Main execution
function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log("Usage: node validate-supercode-static.js <file.js>")
    console.log("Example: node validate-supercode-static.js process-data.js")
    process.exit(1)
  }

  const filePath = args[0]

  if (!fs.existsSync(filePath)) {
    console.error(`${colors.red}Error: File not found: ${filePath}${colors.reset}`)
    process.exit(1)
  }

  const code = fs.readFileSync(filePath, "utf8")
  const result = validateCode(code)
  const passed = result.print()

  process.exit(passed ? 0 : 1)
}

main()
