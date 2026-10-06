const fs = require('fs');
const path = require('path');

function searchDir(dir) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file === '.vite' || file === 'typescript' || file === '@types') continue;
      const full = path.join(dir, file);
      const stat = fs.statSync(full);
      if (stat.isDirectory() && !file.startsWith('.')) {
        searchDir(full);
      } else if (file.endsWith('.js') || file.endsWith('.mjs')) {
        const content = fs.readFileSync(full, 'utf8');
        if (content.includes('react-dom')) {
          const matches = content.match(/import\s*\{[^}]*\}\s*from\s*['"]react-dom['"]/g);
          if (matches) {
            console.log(full, matches);
          }
        }
      }
    }
  } catch (e) {}
}

searchDir('node_modules');
