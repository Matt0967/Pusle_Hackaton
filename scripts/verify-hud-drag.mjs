import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const targetUrl = process.env.PULSE_URL ?? "http://localhost:5173";
const chromiumExecutable =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ??
  join(
    process.env.HOME ?? "",
    "Library/Caches/ms-playwright/chromium_headless_shell-1226/chrome-headless-shell-mac-arm64/chrome-headless-shell",
  );
const { chromium } = require("playwright-core");

const browser = await chromium.launch({
  executablePath: chromiumExecutable,
  headless: true,
  args: ["--use-angle=swiftshader"],
});

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 }, deviceScaleFactor: 1 });
  await page.addInitScript(() => {
    window.localStorage.setItem("pulse:onboarding:v1", "playwright");
    window.localStorage.setItem("pulse:onboarding:v2", "playwright");
    window.localStorage.removeItem("pulse:hud-position:desktop:game-state");
  });
  await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("canvas", { state: "attached" });
  await page.getByRole("button", { name: "Entrer dans la citadelle" }).click();

  const handle = page.getByLabel("Deplacer Etat du jeu");
  const before = await page.locator("section", { has: handle }).evaluate((element) => getComputedStyle(element).transform);
  const box = await handle.boundingBox();

  if (!box) {
    throw new Error("Poignee de drag introuvable");
  }

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 140, box.y + box.height / 2 + 82, { steps: 8 });
  await page.mouse.up();

  const after = await page.locator("section", { has: handle }).evaluate((element) => getComputedStyle(element).transform);
  const saved = await page.evaluate(() => window.localStorage.getItem("pulse:hud-position:desktop:game-state"));

  if (before === after) {
    throw new Error(`Le panneau n'a pas bouge: ${before}`);
  }

  if (!saved) {
    throw new Error("Position HUD non persistee");
  }

  console.log(JSON.stringify({ targetUrl, before, after, saved: JSON.parse(saved) }, null, 2));
} finally {
  await browser.close();
}
