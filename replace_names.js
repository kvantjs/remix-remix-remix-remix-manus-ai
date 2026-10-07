const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

walkDir('./src', (filePath) => {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.css')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = content
      .replace(/Kopilot AI/g, 'Sparkle AI')
      .replace(/Kopilot/g, 'Sparkle')
      .replace(/kopilot/g, 'sparkle');
    if (content !== updated) {
      fs.writeFileSync(filePath, updated, 'utf8');
      console.log(`Updated: ${filePath}`);
    }
  }
});
console.log('Replacement complete.');
