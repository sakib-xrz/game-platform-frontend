import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const ARTIFACT_DIR = '/Users/hello/.gemini/antigravity/brain/d3f46414-54b6-4e5e-9c39-ad2a5716360a';
mkdirSync(ARTIFACT_DIR, { recursive: true });

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function captureGameLeaderboard(port, gameCode, filename) {
  console.log(`Starting capture for ${gameCode}...`);
  const tabRes = await fetch(`http://127.0.0.1:${port}/json/new?http://localhost:3000/demo/${gameCode}`, { method: 'PUT' });
  const tab = await tabRes.json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);

  let msgId = 1;
  const pending = new Map();
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    }
  };

  await new Promise((res) => (ws.onopen = res));

  async function send(method, params = {}) {
    const id = msgId++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await send('Page.enable');
  await send('Runtime.enable');

  // Wait for game to render
  await sleep(3000);

  // Click leaderboard button
  console.log(`Clicking leaderboard button in ${gameCode}...`);
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = document.querySelector('button[aria-label="Today\\'s Leaderboard"]') ||
                    document.querySelector('.gc-toolbar__button--leaderboard') ||
                    document.querySelector('.machine-control--leaderboard') ||
                    document.querySelector('.tp-control--leaderboard') ||
                    document.querySelector('.l77-toolbar__leaderboard');
        if (btn) {
          btn.click();
          return "clicked";
        }
        return "not_found";
      })()
    `
  });

  // Wait for leaderboard modal to open and data to fetch
  await sleep(4000);

  // Capture screenshot
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const outPath = `${ARTIFACT_DIR}/${filename}`;
  writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
  console.log(`Saved screenshot: ${outPath}`);

  try {
    await send('Page.close');
  } catch {}
  ws.close();
}

async function main() {
  const port = 9521;
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    '--user-data-dir=/tmp/chrome-leaderboard-profile-' + Date.now(),
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=430,932', // Mobile portrait viewport matching games
    'about:blank'
  ]);

  const cleanup = () => {
    try { chrome.kill('SIGTERM'); } catch {}
  };
  process.on('exit', cleanup);
  process.on('SIGINT', cleanup);

  await sleep(1500);

  try {
    await captureGameLeaderboard(port, 'greedy-classic', 'greedy_classic_leaderboard_verified.png');
  } catch (err) {
    console.error('Capture error:', err);
  } finally {
    cleanup();
    process.exit(0);
  }
}

main();
