import fs from 'node:fs';
import path from 'node:path';

const runtime = process.version;
const properties = ['White_Space', 'Cc', 'Cf'];

function enumerateProperty(propertyName) {
  const values = [];
  for (let codePoint = 0; codePoint <= 0x10ffff; codePoint += 1) {
    const char = String.fromCodePoint(codePoint);
    if (new RegExp(`\\p{${propertyName}}`, 'u').test(char)) {
      values.push(codePoint);
    }
  }
  return values;
}

const generated = {
  nodeVersion: runtime,
  generatedAt: new Date().toISOString(),
  properties: Object.fromEntries(properties.map((propertyName) => [propertyName, enumerateProperty(propertyName)]))
};

const outputDir = path.join(process.cwd(), 'scripts', 'generated');
fs.mkdirSync(outputDir, { recursive: true });
const targetPath = path.join(outputDir, 'unicode_validation.json');
fs.writeFileSync(targetPath, JSON.stringify(generated, null, 2) + '\n');
console.log(`Wrote ${targetPath} with ${generated.properties.White_Space.length} White_Space, ${generated.properties.Cc.length} Cc and ${generated.properties.Cf.length} Cf entries.`);
