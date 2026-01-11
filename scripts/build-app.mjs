import { execSync } from 'node:child_process';

const platform = process.platform;

let cmd;
if (platform === 'darwin') {
  cmd = 'npm run build:mac';
} else if (platform === 'win32') {
  cmd = 'npm run build:win';
} else {
  // 기본: 웹 빌드만 수행
  cmd = 'npm run build';
}

console.log(`[build:app] platform=${platform} -> ${cmd}`);
execSync(cmd, { stdio: 'inherit' });
