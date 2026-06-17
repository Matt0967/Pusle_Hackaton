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
  await page.evaluate(() => {
    window.localStorage.removeItem("pulse:onboarding:v2");
    window.localStorage.removeItem("pulse:citadel:v2");
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Entrer dans la citadelle" }).click();
  await page.getByRole("dialog", { name: "Nara t'ouvre la porte" }).waitFor({ timeout: 5000 });
  await page.getByRole("button", { name: /Suivant/ }).click();
  await page.getByRole("dialog", { name: "Proteger, c'est agir" }).waitFor({ timeout: 5000 });

  const disabledNext = await page.getByRole("button", { name: /A toi/ }).isDisabled();

  if (!disabledNext) {
    throw new Error("L'etape de protection n'attend pas l'action du joueur.");
  }

  await page.getByRole("button", { name: "Valider" }).click();
  await page.getByRole("dialog", { name: "Le bouclier absorbe les pics" }).waitFor({ timeout: 5000 });
  await page.getByRole("button", { name: /Suivant/ }).click();
  await page.getByRole("dialog", { name: "Rendre la protection durable" }).waitFor({ timeout: 5000 });

  const disabledUpgradeNext = await page.getByRole("button", { name: /A toi/ }).isDisabled();

  if (!disabledUpgradeNext) {
    throw new Error("L'etape d'amelioration n'attend pas l'achat du joueur.");
  }

  await page.getByRole("button", { name: /Toits solaires/ }).click();
  await page.getByRole("dialog", { name: "Oracle et previsions" }).waitFor({ timeout: 5000 });

  console.log(JSON.stringify({ targetUrl, guidedQuestAction: "passed", guidedUpgradeAction: "passed" }, null, 2));
} finally {
  await browser.close();
}
