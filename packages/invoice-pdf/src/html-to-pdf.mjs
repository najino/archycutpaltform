import { chromium } from "playwright";

const html = await new Promise((resolve, reject) => {
  const chunks = [];
  process.stdin.on("data", (chunk) => chunks.push(chunk));
  process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  process.stdin.on("error", reject);
});

if (!html.trim()) {
  console.error("empty html");
  process.exit(1);
}

const watchdog = setTimeout(() => {
  console.error("pdf worker timeout");
  process.exit(2);
}, 40_000);

async function launchBrowser() {
  const extra = {
    headless: true,
    args: [
      "--disable-dev-shm-usage",
      "--no-sandbox",
      "--font-render-hinting=none",
    ],
  };
  const attempts = [{}, { channel: "chrome" }, { channel: "msedge" }];
  let lastError;
  for (const option of attempts) {
    try {
      return await chromium.launch({ ...extra, ...option });
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

const browser = await launchBrowser();
try {
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "load", timeout: 20_000 });
  try {
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
  } catch {
    /* فونت وب لود نشد؛ PDF با فونت سیستم ساخته می‌شود */
  }
  const pdf = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "16mm", bottom: "16mm", left: "12mm", right: "12mm" },
  });
  process.stdout.write(pdf);
} finally {
  clearTimeout(watchdog);
  await browser.close();
}
