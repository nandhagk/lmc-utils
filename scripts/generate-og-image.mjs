import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PORT = 4321;
const URL = `http://localhost:${PORT}/`;
const PUBLIC_DIR = join(ROOT, 'public');
const DIST_DIR = join(ROOT, 'dist');
const OG_OUT = join(PUBLIC_DIR, 'og-image.png');
const APPLE_OUT = join(PUBLIC_DIR, 'apple-touch-icon.png');

if (!existsSync(join(DIST_DIR, 'index.html'))) {
  console.error('dist/index.html missing — run `pnpm build` first.');
  process.exit(1);
}
mkdirSync(PUBLIC_DIR, { recursive: true });

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`server did not start within ${timeoutMs}ms`);
}

async function captureOgImage(browser) {
  const context = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.setContent(`<!doctype html>
    <html><head><style>
      html, body { margin: 0; padding: 0; }
      body {
        width: 1200px;
        height: 630px;
        font-family: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
        background: radial-gradient(ellipse at top left, #1a1a1a 0%, #0a0a0a 60%);
        color: #fafafa;
      }
      #card {
        width: 1200px;
        height: 630px;
        padding: 56px 80px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        position: relative;
        overflow: hidden;
      }
      #card::before {
        content: "";
        position: absolute;
        right: -120px;
        top: -120px;
        width: 520px;
        height: 520px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(99, 102, 241, 0.18) 0%, rgba(99, 102, 241, 0) 70%);
      }
      #card::after {
        content: "";
        position: absolute;
        left: -160px;
        bottom: -160px;
        width: 520px;
        height: 520px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(16, 185, 129, 0.14) 0%, rgba(16, 185, 129, 0) 70%);
      }
      .top {
        display: flex;
        align-items: center;
        gap: 20px;
        position: relative;
        z-index: 1;
      }
      .logo {
        width: 72px;
        height: 72px;
        border-radius: 16px;
        background: #fafafa;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .logo svg {
        width: 46px;
        height: 46px;
      }
      .brand {
        font-size: 24px;
        font-weight: 600;
        letter-spacing: 0.02em;
        color: #a1a1aa;
      }
      .body {
        position: relative;
        z-index: 1;
      }
      .body h1 {
        font-size: 72px;
        font-weight: 800;
        margin: 0 0 14px;
        letter-spacing: -0.03em;
        line-height: 1;
        color: #fafafa;
      }
      .tagline {
        font-size: 24px;
        color: #a1a1aa;
        font-weight: 500;
        margin: 0 0 28px;
        line-height: 1.35;
        max-width: 860px;
      }
      .features {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px 48px;
        max-width: 980px;
      }
      .feature {
        display: flex;
        align-items: center;
        gap: 14px;
        font-size: 20px;
        color: #d4d4d8;
        font-weight: 500;
      }
      .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex: 0 0 auto;
      }
      .dot.indigo { background: #818cf8; box-shadow: 0 0 16px rgba(129, 140, 248, 0.6); }
      .dot.emerald { background: #34d399; box-shadow: 0 0 16px rgba(52, 211, 153, 0.6); }
      .footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        position: relative;
        z-index: 1;
      }
      .url {
        font-size: 20px;
        color: #fafafa;
        font-weight: 600;
        letter-spacing: 0.01em;
      }
      .source {
        font-size: 17px;
        color: #71717a;
        font-style: italic;
      }
    </style></head><body>
      <div id="card">
        <div class="top">
          <div class="logo">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" stroke="#0a0a0a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="10" cy="16" r="3.2"/>
              <circle cx="22" cy="16" r="3.2"/>
              <circle cx="22" cy="16" r="5"/>
              <path d="M 13.2 16 L 18.8 16"/>
              <path d="M 17 13.5 L 18.8 16 L 17 18.5"/>
              <path d="M 4 16 L 6.8 16"/>
              <path d="M 5.6 14.5 L 6.8 16 L 5.6 17.5"/>
            </svg>
          </div>
          <div class="brand">LMC Utils</div>
        </div>

        <div class="body">
          <h1>Automata &amp; formal<br/>languages, in&nbsp;your&nbsp;browser.</h1>
          <p class="tagline">Convert, normalize, and check equivalence — for NFAs, regular expressions, CFGs, and PDAs.</p>
          <div class="features">
            <div class="feature"><span class="dot indigo"></span>NFA to RegEx</div>
            <div class="feature"><span class="dot emerald"></span>CFG to CNF</div>
            <div class="feature"><span class="dot indigo"></span>RegEx equivalence</div>
            <div class="feature"><span class="dot emerald"></span>CFG membership</div>
            <div class="feature"><span class="dot indigo"></span>PDA to CFG</div>
            <div class="feature"><span class="dot emerald"></span>CFG (in)equivalence</div>
          </div>
        </div>

        <div class="footer">
          <div class="url">lmc-utils.web.app</div>
          <div class="source">Sipser · Theory of Computation</div>
        </div>
      </div>
    </body></html>`);
  await page.waitForTimeout(250);
  console.log('Capturing OG image →', OG_OUT);
  await page.screenshot({ path: OG_OUT, fullPage: false, type: 'png' });
  await context.close();
}

async function captureAppleTouchIcon(browser) {
  const context = await browser.newContext({
    viewport: { width: 180, height: 180 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.setContent(`<!doctype html>
    <html><head><style>
      html, body { margin: 0; padding: 0; background: #0a0a0a; width: 180px; height: 180px; overflow: hidden; }
      svg { display: block; width: 180px; height: 180px; }
    </style></head><body>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
        <rect x="0" y="0" width="32" height="32" rx="6" fill="#0a0a0a"/>
        <g fill="none" stroke="#fafafa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="10" cy="16" r="3.2"/>
          <circle cx="22" cy="16" r="3.2"/>
          <circle cx="22" cy="16" r="5"/>
          <path d="M 13.2 16 L 18.8 16"/>
          <path d="M 17 13.5 L 18.8 16 L 17 18.5"/>
          <path d="M 4 16 L 6.8 16"/>
          <path d="M 5.6 14.5 L 6.8 16 L 5.6 17.5"/>
        </g>
      </svg>
    </body></html>`);
  console.log('Capturing apple-touch-icon →', APPLE_OUT);
  await page.screenshot({ path: APPLE_OUT, fullPage: false, type: 'png' });
  await context.close();
}

async function main() {
  console.log(`Starting vite preview on port ${PORT}`);
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (d) => process.stderr.write(`[vite] ${d}`));
  server.stderr.on('data', (d) => process.stderr.write(`[vite!] ${d}`));

  try {
    await waitForServer(URL);
    console.log('Launching Chromium');
    const browser = await chromium.launch();
    try {
      await captureOgImage(browser);
      await captureAppleTouchIcon(browser);
    } finally {
      await browser.close();
    }
  } finally {
    console.log('Stopping vite preview');
    server.kill('SIGTERM');
    setTimeout(() => server.kill('SIGKILL'), 2000).unref();
  }

  for (const src of [OG_OUT, APPLE_OUT]) {
    const dst = join(DIST_DIR, basename(src));
    copyFileSync(src, dst);
    console.log(`Copied ${basename(src)} → dist/`);
  }
}

main().catch((err) => {
  console.error('OG generation failed:', err);
  process.exit(1);
});
