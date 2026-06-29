const fs = require('fs');
const path = require('path');

const promptContent = fs.readFileSync(path.join(__dirname, '../documentations/kapruka_master_system_prompt.md'), 'utf8');

// Escape backticks and backslashes for template literal
const escapedContent = promptContent.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');

const tsContent = `export const KAPPY_PERSONA_INSTRUCTION = \`${escapedContent}\`;\n`;

fs.writeFileSync(path.join(__dirname, 'src/lib/masterPrompt.ts'), tsContent, 'utf8');
console.log('masterPrompt.ts generated successfully');
