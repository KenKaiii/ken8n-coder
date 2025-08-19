import { N8nClient } from './dist/n8n-client.js';

async function testFilteredResponse() {
  const client = new N8nClient('http://localhost:5678', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyNDkyMDJjMC05N2NlLTRkNmQtODk3Mi0xODY2ZjA2ZjU2NTEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU1NjI4MTkxfQ.VywL9o_2Vk4X64esEFUhhHAVFnmgP9Q7mO3sZQiyXmo');
  
  const execution = await client.getExecution('158');
  
  // Simulate what the MCP now returns (filtered version)
  const result = {
    success: true,
    executionId: execution.id,
    status: execution.status,
    finished: execution.finished,
    workflowId: execution.workflowId,
    startedAt: execution.startedAt,
    stoppedAt: execution.stoppedAt,
  };

  // If there are errors, extract them
  if (execution.status === 'error' || execution.data?.resultData?.error) {
    result.errors = [];
    
    // Add main execution error if present
    if (execution.data?.resultData?.error) {
      result.errors.push({
        type: 'main',
        nodeName: execution.data.resultData.error.node?.name,
        message: execution.data.resultData.error.message,
        code: execution.data.resultData.error.node?.parameters?.code,
      });
    }

    // Add per-node errors from runData
    if (execution.data?.resultData?.runData) {
      for (const [nodeName, nodeExecutions] of Object.entries(execution.data.resultData.runData)) {
        for (let i = 0; i < nodeExecutions.length; i++) {
          const nodeExec = nodeExecutions[i];
          if (nodeExec.error && nodeExec.executionStatus === 'error') {
            // Avoid duplicating the main error
            if (!result.errors.some(e => e.nodeName === nodeName && e.message === nodeExec.error.message)) {
              result.errors.push({
                type: 'node',
                nodeName: nodeName,
                executionIndex: i,
                message: nodeExec.error.message,
                code: nodeExec.error.node?.parameters?.code,
              });
            }
          }
        }
      }
    }
  }
  
  console.log('=== FILTERED MCP RESPONSE ===');
  console.log(JSON.stringify(result, null, 2));
  
  console.log('\n=== SIZE COMPARISON ===');
  console.log('Filtered response size:', JSON.stringify(result).length, 'characters');
  console.log('(Previously was 8,460 characters)');
  
  if (result.errors && result.errors.length > 0) {
    console.log('\n=== ERRORS AGENT CAN SEE ===');
    result.errors.forEach((error, index) => {
      console.log(`\nError ${index + 1}:`);
      console.log('  Type:', error.type);
      console.log('  Node:', error.nodeName);
      console.log('  Message preview:', error.message?.substring(0, 100) + '...');
      if (error.code) {
        console.log('  Code included: Yes');
      }
    });
  }
}

testFilteredResponse().catch(console.error);