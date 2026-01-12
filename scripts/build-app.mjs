import { execSync } from 'node:child_process';

const platform = process.platform;

function timestampForFolder() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    String(now.getFullYear()) +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    '-' +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
}

let cmd;
if (platform === 'darwin') {
  cmd = 'npm run build:mac';
} else if (platform === 'win32') {
  // Windows에서는 실행 중인 앱이 release/win-unpacked/resources/app.asar를 잠그면
  // electron-builder가 기존 폴더를 비우는 단계에서 실패할 수 있습니다.
  // 매번 새 output 디렉터리로 빌드하면 이 잠금 문제를 회피할 수 있습니다.
  const outDir = `release/build-${timestampForFolder()}`;
  cmd = `npm run build && electron-builder -w portable --config.directories.output=${outDir}`;
} else {
  // 기본: 웹 빌드만 수행
  cmd = 'npm run build';
}

console.log(`[build:app] platform=${platform} -> ${cmd}`);
execSync(cmd, { stdio: 'inherit' });
