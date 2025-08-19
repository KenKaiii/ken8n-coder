import { N8nClient } from './dist/n8n-client.js';

async function analyzeSize() {
  const client = new N8nClient('http://localhost:5678', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyNDkyMDJjMC05N2NlLTRkNmQtODk3Mi0xODY2ZjA2ZjU2NTEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU1NjI4MTkxfQ.VywL9o_2Vk4X64esEFUhhHAVFnmgP9Q7mO3sZQiyXmo');
  
  const execution = await client.getExecution('158');
  
  console.log('=== SIZE BREAKDOWN ===\n');
  
  // Check size of each major section
  console.log('Full execution:', JSON.stringify(execution).length, 'characters');
  console.log('');
  
  if (execution.data) {
    console.log('execution.data:', JSON.stringify(execution.data).length, 'characters');
    
    if (execution.data.resultData) {
      console.log('  - resultData:', JSON.stringify(execution.data.resultData).length, 'characters');
      
      if (execution.data.resultData.error) {
        console.log('    - error only:', JSON.stringify(execution.data.resultData.error).length, 'characters');
        console.log('    - error message only:', execution.data.resultData.error.message.length, 'characters');
      }
    }
    
    if (execution.data.executionData) {
      console.log('  - executionData:', JSON.stringify(execution.data.executionData).length, 'characters');
    }
    
    if (execution.data.startData) {
      console.log('  - startData:', JSON.stringify(execution.data.startData).length, 'characters');
    }
  }
  
  if (execution.workflowData) {
    console.log('\nexecution.workflowData:', JSON.stringify(execution.workflowData).length, 'characters');
  }
  
  console.log('\n=== WHAT\'S BLOATING IT ===');
  // The error appears multiple times
  const errorCount = JSON.stringify(execution).split('SyntaxError').length - 1;
  console.log('Error message appears', errorCount, 'times in the response');
  
  // Workflow data is included
  if (execution.workflowData) {
    console.log('Workflow definition included with', execution.workflowData.nodes?.length, 'nodes');
  }
}

analyzeSize().catch(console.error);
