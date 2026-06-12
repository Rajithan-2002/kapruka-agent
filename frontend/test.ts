import { mcpSearchProducts } from './src/lib/mcp'; mcpSearchProducts('cream cracker biscuits').then(x => console.log(JSON.stringify(x).slice(0, 500)));
