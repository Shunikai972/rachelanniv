import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = 5177;
const baseUrl = `http://127.0.0.1:${port}`;
const artifactsDir = path.join(root, 'artifacts');

async function waitForServer(url) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function launchBrowser() {
  const launchOptions = {
    headless: true,
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=swiftshader'],
  };

  try {
    return await chromium.launch(launchOptions);
  } catch (firstError) {
    try {
      return await chromium.launch({ ...launchOptions, channel: 'msedge' });
    } catch {
      throw firstError;
    }
  }
}

async function canvasStats(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      return {
        error: 'missing canvas',
        fallback: Boolean(document.querySelector('.fallback')),
        bodyText: document.body.innerText.slice(0, 240),
      };
    }

    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return { error: 'missing webgl context' };

    const width = canvas.width;
    const height = canvas.height;
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    let sampled = 0;
    let lit = 0;
    let totalLum = 0;

    for (let index = 0; index < pixels.length; index += 4 * 41) {
      const lum = pixels[index] + pixels[index + 1] + pixels[index + 2];
      sampled += 1;
      totalLum += lum;
      if (lum > 18) lit += 1;
    }

    return {
      width,
      height,
      sampled,
      lit,
      litRatio: lit / sampled,
      averageLum: totalLum / sampled,
    };
  });
}

function assertCanvas(label, stats) {
  if (stats.error) {
    throw new Error(`${label}: ${stats.error} ${JSON.stringify(stats)}`);
  }

  if (stats.litRatio < 0.002 || stats.averageLum < 1.2) {
    throw new Error(`${label}: canvas looks blank (${JSON.stringify(stats)})`);
  }
}

async function verifyViewport(browser, name, viewport) {
  const page = await browser.newPage({ viewport });
  const diagnostics = [];
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      diagnostics.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    diagnostics.push(`pageerror: ${error.message}`);
  });

  await page.goto(`${baseUrl}/?verify=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3300);
  const introStats = await canvasStats(page);
  try {
    assertCanvas(`${name} intro`, introStats);
  } catch (error) {
    throw new Error(`${error.message}\n${diagnostics.join('\n')}`);
  }
  await page.screenshot({ path: path.join(artifactsDir, `${name}-intro.png`), fullPage: false });

  await page.waitForTimeout(5300);

  const galaxyStats = await canvasStats(page);
  try {
    assertCanvas(`${name} galaxy`, galaxyStats);
  } catch (error) {
    throw new Error(`${error.message}\n${diagnostics.join('\n')}`);
  }
  await page.screenshot({ path: path.join(artifactsDir, `${name}-galaxy.png`), fullPage: false });

  const imageCount = await page.evaluate(() => window.__RACHEL_IMAGE_COUNT__ || 0);
  if (imageCount < 1) {
    throw new Error(`${name}: no image source was detected`);
  }

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.28));
  await page.waitForTimeout(1600);
  const clickTargets = [
    [0.5, 0.5],
    [0.47, 0.5],
    [0.53, 0.48],
    [0.5, 0.56],
  ];
  let calloutAppeared = false;
  for (const [x, y] of clickTargets) {
    await page.mouse.click(viewport.width * x, viewport.height * y);
    await page.waitForTimeout(420);
    calloutAppeared = await page.evaluate(() => Boolean(document.querySelector('.point-callout')));
    if (calloutAppeared) break;
  }
  if (!calloutAppeared) {
    throw new Error(`${name}: sphere point click did not show a compliment`);
  }

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.57));
  await page.waitForTimeout(2400);
  const waveStats = await canvasStats(page);
  assertCanvas(`${name} waves`, waveStats);
  await page.screenshot({ path: path.join(artifactsDir, `${name}-waves.png`), fullPage: false });

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.84));
  await page.waitForTimeout(3600);
  const helixStats = await canvasStats(page);
  assertCanvas(`${name} helix`, helixStats);
  const texturesLoaded = await page.evaluate(() => window.__RACHEL_TEXTURES_LOADED__ || 0);
  await page.screenshot({ path: path.join(artifactsDir, `${name}-helix.png`), fullPage: false });

  const photoClickTargets = [
    [0.08, 0.52],
    [0.92, 0.52],
    [0.14, 0.58],
    [0.83, 0.57],
    [0.31, 0.5],
    [0.69, 0.5],
    [0.5, 0.56],
  ];
  let lightboxOpened = false;
  for (const [x, y] of photoClickTargets) {
    await page.mouse.click(viewport.width * x, viewport.height * y);
    await page.waitForTimeout(500);
    lightboxOpened = await page.evaluate(() => Boolean(document.querySelector('.photo-lightbox img')));
    if (lightboxOpened) break;
  }
  if (!lightboxOpened) {
    throw new Error(`${name}: photo click did not open the enlarged view`);
  }
  await page.screenshot({ path: path.join(artifactsDir, `${name}-photo-open.png`), fullPage: false });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(240);

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(3600);
  const finalStats = await canvasStats(page);
  assertCanvas(`${name} final`, finalStats);
  await page.screenshot({ path: path.join(artifactsDir, `${name}-final.png`), fullPage: false });

  await page.close();
  return { introStats, galaxyStats, waveStats, helixStats, finalStats, imageCount, texturesLoaded };
}

await mkdir(artifactsDir, { recursive: true });

const serverCommand = process.platform === 'win32' ? 'cmd.exe' : 'npm';
const serverArgs =
  process.platform === 'win32'
    ? ['/d', '/s', '/c', `npm run dev -- --port ${port} --strictPort`]
    : ['run', 'dev', '--', '--port', String(port), '--strictPort'];
const server = spawn(serverCommand, serverArgs, {
  cwd: root,
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
});

let serverOutput = '';
server.stdout.on('data', (chunk) => {
  serverOutput += chunk.toString();
});
server.stderr.on('data', (chunk) => {
  serverOutput += chunk.toString();
});

let browser;

try {
  await waitForServer(baseUrl);
  browser = await launchBrowser();

  const results = [];
  results.push(await verifyViewport(browser, 'desktop', { width: 1440, height: 920 }));
  results.push(await verifyViewport(browser, 'mobile', { width: 390, height: 844 }));

  results.forEach((result, index) => {
    const name = index === 0 ? 'desktop' : 'mobile';
    console.log(
      `${name}: images=${result.imageCount}, texturesLoaded=${result.texturesLoaded}, ` +
        `introLit=${result.introStats.litRatio.toFixed(4)}, ` +
        `galaxyLit=${result.galaxyStats.litRatio.toFixed(4)}, ` +
        `waveLit=${result.waveStats.litRatio.toFixed(4)}, ` +
        `helixLit=${result.helixStats.litRatio.toFixed(4)}, ` +
        `finalLit=${result.finalStats.litRatio.toFixed(4)}`,
    );
  });
} catch (error) {
  console.error(serverOutput);
  throw error;
} finally {
  if (browser) await browser.close();
  if (process.platform === 'win32' && server.pid) {
    spawn('taskkill.exe', ['/pid', String(server.pid), '/t', '/f'], {
      stdio: 'ignore',
      windowsHide: true,
    });
  } else {
    server.kill();
  }
}
