import { N8nClient } from './dist/n8n-client.js';

async function simulateMCPResponse() {
  const client = new N8nClient('http://localhost:5678', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyNDkyMDJjMC05N2NlLTRkNmQtODk3Mi0xODY2ZjA2ZjU2NTEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU1NjI4MTkxfQ.VywL9o_2Vk4X64esEFUhhHAVFnmgP9Q7mO3sZQiyXmo');
  
  const execution = await client.getExecution('158');
  
  // This is what the MCP returns now (full execution)
  const mcpResponse = {
    success: true,
    execution: execution
  };
  
  console.log('=== MCP RESPONSE SIZE ===');
  console.log('Full response:', JSON.stringify(mcpResponse).length, 'characters');
  
  console.log('\n=== KEY ERROR INFORMATION AGENT CAN ACCESS ===');
  if (execution.data?.resultData?.error) {
    console.log('Error found at: execution.data.resultData.error');
    console.log('\nError message:');
    console.log(execution.data.resultData.error.message);
    console.log('\nError node:', execution.data.resultData.error.node?.name);
    console.log('\nBroken code:');
    console.log(execution.data.resultData.error.node?.parameters?.code);
  }
}

simulateMCPResponse().catch(console.error);
