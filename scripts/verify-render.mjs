import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const targetUrl = process.env.PULSE_URL ?? "http://localhost:5173";
const chromiumExecutable =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ??
  join(
    process.env.HOME ?? "",
    "Library/Caches/ms-playwright/chromium_headless_shell-1226/chrome-headless-shell-mac-arm64/chrome-headless-shell",
  );

const { chromium } = await loadPlaywright();
await mkdir("output/playwright", { recursive: true });

const browser = await chromium.launch({
  executablePath: chromiumExecutable,
  headless: true,
  args: ["--use-angle=swiftshader"],
});

try {
  const desktop = await verifyViewport(browser, "desktop", 1440, 980);
  const mobile = await verifyViewport(browser, "mobile", 390, 844);
  console.log(JSON.stringify({ targetUrl, desktop, mobile }, null, 2));
} finally {
  await browser.close();
}

async function loadPlaywright() {
  try {
    return normalizePlaywrightModule(require("playwright"));
  } catch {
    try {
      return normalizePlaywrightModule(require("playwright-core"));
    } catch {
      if (process.env.PLAYWRIGHT_CORE_PATH) {
        return normalizePlaywrightModule(require(process.env.PLAYWRIGHT_CORE_PATH));
      }

      throw new Error(
        "Playwright introuvable. Installe playwright ou passe PLAYWRIGHT_CORE_PATH=/chemin/playwright-core/index.js.",
      );
    }
  }
}

function normalizePlaywrightModule(module) {
  return module.default ?? module;
}

async function verifyViewport(browser, name, width, height) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const browserLogs = [];
  page.on("console", (message) => browserLogs.push(`${message.type()}: ${message.text()}`));
  page.on("pageerror", (error) => browserLogs.push(`pageerror: ${error.message}`));
  await page.addInitScript(() => {
    window.localStorage.setItem("pulse:onboarding:v1", "playwright");
    window.localStorage.setItem("pulse:onboarding:v2", "playwright");
  });

  let cityPixels;
  let oraclePixels;

  try {
    await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => undefined);
    await page.waitForSelector("canvas", { state: "attached", timeout: 10000 });
    await page.getByRole("button", { name: "Entrer dans la citadelle" }).click();
    await page.waitForTimeout(1200);

    cityPixels = await sampleCanvas(page);
    await page.screenshot({ path: `output/playwright/${name}-city.png`, fullPage: true });

    await page.getByLabel("Mode Oracle").click();
    await page.waitForTimeout(900);
    oraclePixels = await sampleCanvas(page);
    await page.screenshot({ path: `output/playwright/${name}-oracle.png`, fullPage: true });
  } catch (error) {
    await page.screenshot({ path: `output/playwright/${name}-failure.png`, fullPage: true }).catch(() => undefined);
    const bodyText = await page.locator("body").innerText({ timeout: 1000 }).catch(() => "");
    throw new Error(
      `${name} render verification failed: ${error instanceof Error ? error.message : String(error)}\n` +
        `body=${bodyText.slice(0, 600)}\nlogs=${browserLogs.join("\n").slice(0, 2000)}`,
    );
  } finally {
    await page.close();
  }

  assertRenderable(`${name} city`, cityPixels, 24, 0.08);
  assertRenderable(`${name} oracle`, oraclePixels, 12, 0.02);

  return { cityPixels, oraclePixels };
}

function assertRenderable(label, pixels, minUniqueColors, minNonBackgroundRatio) {
  if (pixels.uniqueColors < minUniqueColors || pixels.nonBackgroundRatio < minNonBackgroundRatio) {
    throw new Error(`${label} canvas semble vide: ${JSON.stringify(pixels)}`);
  }
}

async function sampleCanvas(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector("canvas");

    if (!canvas) {
      throw new Error("Canvas introuvable");
    }

    const probe = document.createElement("canvas");
    const width = 96;
    const height = 64;
    probe.width = width;
    probe.height = height;
    const context = probe.getContext("2d", { willReadFrequently: true });

    if (!context) {
      throw new Error("Contexte 2D introuvable");
    }

    context.drawImage(canvas, 0, 0, width, height);
    const { data } = context.getImageData(0, 0, width, height);
    const buckets = new Set();
    let nonBackground = 0;

    for (let index = 0; index < data.length; index += 16) {
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      buckets.add(`${r >> 4}-${g >> 4}-${b >> 4}`);

      if (r + g + b > 42) {
        nonBackground += 1;
      }
    }

    return {
      uniqueColors: buckets.size,
      nonBackgroundRatio: nonBackground / (data.length / 16),
    };
  });
}
