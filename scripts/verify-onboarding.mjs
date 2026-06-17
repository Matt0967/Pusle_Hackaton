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
  await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => window.localStorage.removeItem("pulse:onboarding:v1"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Entrer dans la citadelle" }).click();
  await page.getByRole("dialog", { name: "Nara t'ouvre la porte" }).waitFor({ timeout: 5000 });
  await page.getByLabel("Fermer le tutoriel").click();
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Entrer dans la citadelle" }).click();

  const dialogsAfterReload = await page.getByRole("dialog").count();

  if (dialogsAfterReload !== 0) {
    throw new Error(`Le tutoriel reapparait apres refresh: ${dialogsAfterReload} dialog(s)`);
  }

  await page.getByLabel("Revoir le tutoriel").click();
  await page.getByRole("dialog", { name: "Nara t'ouvre la porte" }).waitFor({ timeout: 5000 });
  console.log(JSON.stringify({ targetUrl, firstOpen: "shown", refresh: "hidden", manualReplay: "shown" }, null, 2));
} finally {
  await browser.close();
}
