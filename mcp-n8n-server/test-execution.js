const { N8nClient } = require('./dist/n8n-client.js');

async function test() {
  const client = new N8nClient('http://localhost:5678', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyNDkyMDJjMC05N2NlLTRkNmQtODk3Mi0xODY2ZjA2ZjU2NTEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU1NjI4MTkxfQ.VywL9o_2Vk4X64esEFUhhHAVFnmgP9Q7mO3sZQiyXmo');
  
  const execution = await client.getExecution('158');
  
  // Check what the MCP would return
  console.log('=== FULL EXECUTION (what MCP returns now) ===');
  console.log(JSON.stringify({
    success: true,
    execution: execution
  }, null, 2));
  
  console.log('\n\n=== JUST THE ERROR (if we filtered) ===');
  if (execution.data?.resultData?.error) {
    console.log(JSON.stringify({
      success: true,
      hasError: true,
      error: {
        message: execution.data.resultData.error.message,
        node: execution.data.resultData.error.node?.name,
        code: execution.data.resultData.error.node?.parameters?.code
      }
    }, null, 2));
  }
}

test().catch(console.error);
