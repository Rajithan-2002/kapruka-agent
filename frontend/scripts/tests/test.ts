import { mcpSearchProducts } from '@/lib/mcp'; mcpSearchProducts('cream cracker biscuits').then((x: any) => console.log(JSON.stringify(x).slice(0, 500)));
