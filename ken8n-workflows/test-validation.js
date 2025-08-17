#!/usr/bin/env node

import { validateWorkflow, VALIDATION_CONFIG } from './validate.js'
import fs from 'fs'

console.log('🧪 SUPER CODE NODE VALIDATION TEST SUITE')
console.log('=' .repeat(50))

// Test different validation configurations
const testConfigs = [
  {
    name: 'Basic Validation',
    config: { enableAdvancedValidation: false }
  },
  {
    name: 'Advanced Validation (No Execution)',
    config: { enableAdvancedValidation: true, validateExecution: false }
  },
  {
    name: 'Full Validation (With Execution)',
    config: { enableAdvancedValidation: true, validateExecution: true }
  }
]

// Test workflow files
const testFiles = [
  'quick-supercode-demo.json',
  'supercode-demo-workflow.json'
]

async function runTests() {
  for (const testConfig of testConfigs) {
    console.log(`\n🔬 Testing: ${testConfig.name}`)
    console.log('-'.repeat(40))
    
    for (const file of testFiles) {
      if (fs.existsSync(file)) {
        console.log(`\n📝 File: ${file}`)
        const result = validateWorkflow(file, testConfig.config)
        console.log(`Result: ${result.success ? '✅ PASS' : '❌ FAIL'} (${result.errors} errors, ${result.warnings} warnings)`)
      }
    }
  }
  
  // Test invalid workflow
  console.log('\n🔬 Testing: Invalid Workflow Handling')
  console.log('-'.repeat(40))
  
  const invalidWorkflow = {
    name: 'Test Invalid',
    nodes: [{
      name: 'Bad SuperCode',
      type: '@kenkaiii/n8n-nodes-supercode.superCodeNodeVmSafe',
      parameters: {
        code: `
          // This should trigger multiple validation errors
          require('fs')
          import something from 'somewhere'
          
          while(true) {
            console.log('infinite loop')
          }
          
          // Missing return statement
        `
      }
    }]
  }
  
  // Write temporary test file
  const tempFile = 'temp-invalid-test.json'
  fs.writeFileSync(tempFile, JSON.stringify(invalidWorkflow, null, 2))
  
  try {
    console.log(`\n📝 File: ${tempFile}`)
    const result = validateWorkflow(tempFile, { enableAdvancedValidation: true })
    console.log(`Result: ${result.success ? '✅ PASS' : '❌ FAIL'} (${result.errors} errors, ${result.warnings} warnings)`)
  } finally {
    // Clean up temp file
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile)
    }
  }
  
  console.log('\n🎉 Test Suite Complete!')
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error)
}

export { runTests }