import fs from 'fs';
import path from 'path';

// Recursively calculate the size of all client-side JavaScript chunks
function getClientPayloadSize(dirPath: string): number {
    let totalSize = 0;
    if (!fs.existsSync(dirPath)) return 0;
    
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            totalSize += getClientPayloadSize(fullPath);
        } else if (fullPath.endsWith('.js')) {
            totalSize += fs.statSync(fullPath).size;
        }
    }
    return totalSize;
}

// Dynamically resolve paths for the GitHub Actions runner
const cwd = process.cwd();
const baseDir = path.join(cwd, '.next-base/static/chunks');
const prDir = path.join(cwd, '.next-pr/static/chunks');

const baseSizeBytes = getClientPayloadSize(baseDir);
const prSizeBytes = getClientPayloadSize(prDir);

const baseKB = (baseSizeBytes / 1024).toFixed(2);
const prKB = (prSizeBytes / 1024).toFixed(2);
const diffKB = ((prSizeBytes - baseSizeBytes) / 1024).toFixed(2);
const diffBytes = prSizeBytes - baseSizeBytes;

let statusIcon = '⚖️';
let statusText = 'No Change';
let diffDisplay = `${diffKB} KB`;

if (diffBytes > 0) {
    statusIcon = '🚨';
    statusText = 'Regression Detected';
    diffDisplay = `+${diffKB} KB`;
} else if (diffBytes < 0) {
    statusIcon = '✅';
    statusText = 'Improvement';
    diffDisplay = `${diffKB} KB`;
}

// Generate standard GitHub Markdown
const markdown = `
### ⚡ NextPerf CI: Client Boundary Check

**Status:** ${statusIcon} **${statusText}**

| Metric | Size (KB) |
| :--- | :--- |
| **Main Branch** | \`${baseKB} KB\` |
| **Pull Request** | \`${prKB} KB\` |
| **Difference** | **\`${diffDisplay}\`** |

> *NextPerf analyzed the physical payload of \`.next/static/chunks\` to ensure no heavy server dependencies leaked into the client browser bundle.*
`;

console.log(markdown);