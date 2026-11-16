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

async function launchBrowser() {
  const extra = {
    headless: true,
    args: ["--disable-dev-shm-usage", "--no-sandbox", "--font-render-hinting=none"],
  };
  try {
    return await chromium.launch(extra);
  } catch (first) {
    for (const channel of ["chrome", "msedge"]) {
      try {
        return await chromium.launch({ ...extra, channel });
      } catch {
        /* کانال بعدی */
      }
    }
    throw first;
  }
}

const browser = await launchBrowser();
try {
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "load", timeout: 20000 });
  await new Promise((resolve) => setTimeout(resolve, 400));
  const pdf = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "16mm", bottom: "16mm", left: "12mm", right: "12mm" },
  });
  process.stdout.write(pdf);
} finally {
  await browser.close();
}
