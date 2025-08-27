import { N8nClient } from './dist/n8n-client.js';

async function test() {
  const client = new N8nClient('http://localhost:5678', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyNDkyMDJjMC05N2NlLTRkNmQtODk3Mi0xODY2ZjA2ZjU2NTEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU1NjI4MTkxfQ.VywL9o_2Vk4X64esEFUhhHAVFnmgP9Q7mO3sZQiyXmo');
  
  const execution = await client.getExecution('158');
  
  console.log('=== RAW EXECUTION OBJECT ===');
  console.log(JSON.stringify(execution, null, 2));
}

test().catch(console.error);
