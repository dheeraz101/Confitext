import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const rootDir = process.cwd();
const confitextDir = path.join(rootDir, 'dist', 'confitext');
const confitextZip = path.join(rootDir, 'Confitext-Obsidian-Plugin.zip');

// Clean and recreate dist subdir
if (fs.existsSync(confitextDir)) {
	fs.rmSync(confitextDir, { recursive: true, force: true });
}
fs.mkdirSync(confitextDir, { recursive: true });

// Copy distribution files
const filesToCopy = ['main.js', 'manifest.json', 'styles.css'];
for (const file of filesToCopy) {
	const src = path.join(rootDir, file);
	if (!fs.existsSync(src)) {
		console.error(`Error: Required file ${file} does not exist. Run "npm run build" first.`);
		process.exit(1);
	}
	fs.copyFileSync(src, path.join(confitextDir, file));
	console.log(`Copied ${file} -> dist/confitext/${file}`);
}

// Remove old zip if present
if (fs.existsSync(confitextZip)) {
	fs.unlinkSync(confitextZip);
}

// Use native PowerShell Compress-Archive on Windows or zip on Unix
try {
	if (process.platform === 'win32') {
		execSync(`powershell -Command "Compress-Archive -Path '${confitextDir}' -DestinationPath '${confitextZip}' -Force"`, { stdio: 'inherit' });
	} else {
		execSync(`cd dist && zip -r "${confitextZip}" confitext/`, { stdio: 'inherit' });
	}
	console.log(`Successfully generated release package:\n  - ${confitextZip}`);
} catch (err) {
	console.error('Failed to create ZIP archive:', err);
	process.exit(1);
}
