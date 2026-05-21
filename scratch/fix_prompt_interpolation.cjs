const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'services', 'deckArchitectService.js');
let content = fs.readFileSync(filePath, 'utf8');

// We want to replace all occurrences of \\${ with ${ inside the STRICT_INSTRUCTIONS_PROMPT
// Let's do a simple replace since it is a safe operation in this block
content = content.replace(/\\\$\{/g, '${');

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully fixed the template literal interpolation escaping!");
