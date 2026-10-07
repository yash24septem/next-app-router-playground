import os from 'os';
import fs from 'fs';
import path from 'path';

function getRouteSize(buildDir: string, route: string): number {
    if (!fs.existsSync(buildDir)) {
        console.error(`🚨 Directory not found: ${buildDir}`);
        return 0;
    }

    // Target the highly-specific App Router manifest for this exact route
    const manifestPath = path.join(buildDir, 'server', 'app', route, 'build-manifest.json');

    if (!fs.existsSync(manifestPath)) {
        console.error(`🚨 Route manifest not found: ${manifestPath}`);
        return 0;
    }

    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    
    // BULLETPROOF PARSING: Extract all .js chunk paths regardless of the JSON schema
    const jsFilesMatches = manifestContent.match(/[^"]+\.js/g) || [];
    const uniqueJsChunks = [...new Set(jsFilesMatches)];

    let totalSizeBytes = 0;
    
    uniqueJsChunks.forEach((chunk) => {
        // Normalize paths (sometimes Next.js prepends /_next/ to the static paths)
        const cleanChunkPath = chunk.startsWith('/_next/') ? chunk.replace('/_next/', '') : chunk;
        const fullPath = path.join(buildDir, cleanChunkPath);
        
        if (fs.existsSync(fullPath)) {
            totalSizeBytes += fs.statSync(fullPath).size;
        }
    });

    return totalSizeBytes;
}

import os from 'os';
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

const homeDir = os.homedir();

// ... (keep the getClientPayloadSize function the same)

const baseDir = path.resolve('.next-base/static/chunks');
const prDir = path.resolve('.next-pr/static/chunks');

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