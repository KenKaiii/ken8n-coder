import { N8nClient } from './dist/n8n-client.js';

async function checkAllErrors() {
  const client = new N8nClient('http://localhost:5678', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyNDkyMDJjMC05N2NlLTRkNmQtODk3Mi0xODY2ZjA2ZjU2NTEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU1NjI4MTkxfQ.VywL9o_2Vk4X64esEFUhhHAVFnmgP9Q7mO3sZQiyXmo');
  
  const execution = await client.getExecution('158');
  
  console.log('=== ALL ERROR LOCATIONS IN EXECUTION DATA ===\n');
  
  // 1. Main execution error
  if (execution.data?.resultData?.error) {
    console.log('1. MAIN EXECUTION ERROR (execution.data.resultData.error):');
    console.log('   Message:', execution.data.resultData.error.message?.substring(0, 100) + '...');
    console.log('   Node:', execution.data.resultData.error.node?.name);
    console.log('');
  }
  
  // 2. Per-node errors in runData
  if (execution.data?.resultData?.runData) {
    console.log('2. PER-NODE ERRORS (execution.data.resultData.runData):');
    for (const [nodeName, nodeExecutions] of Object.entries(execution.data.resultData.runData)) {
      for (let i = 0; i < nodeExecutions.length; i++) {
        const nodeExec = nodeExecutions[i];
        if (nodeExec.error) {
          console.log(`   Node "${nodeName}" execution ${i}:`);
          console.log('   Status:', nodeExec.executionStatus);
          console.log('   Error:', nodeExec.error.message?.substring(0, 100) + '...');
          console.log('');
        }
      }
    }
  }
  
  // 3. Execution status
  console.log('3. OVERALL EXECUTION STATUS:');
  console.log('   Status:', execution.status);
  console.log('   Finished:', execution.finished);
  console.log('   Mode:', execution.mode);
  
  // 4. Check for other error fields
  console.log('\n4. OTHER POTENTIAL ERROR FIELDS:');
  console.log('   execution.error:', execution.error);
  console.log('   execution.data.error:', execution.data?.error);
  console.log('   execution.data.executionData:', Object.keys(execution.data?.executionData || {}));
}

checkAllErrors().catch(console.error);
