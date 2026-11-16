import { spawn } from "node:child_process";
import path from "node:path";

export function htmlToPdf(html: string): Promise<Buffer> {
  const script = path.resolve(
    process.cwd(),
    "../../packages/invoice-pdf/src/html-to-pdf.mjs",
  );

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], {
      cwd: path.resolve(process.cwd(), "../../packages/invoice-pdf"),
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
    });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    child.stdout.on("data", (chunk) => out.push(chunk as Buffer));
    child.stderr.on("data", (chunk) => err.push(chunk as Buffer));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0 && out.length) {
        resolve(Buffer.concat(out));
        return;
      }
      reject(
        new Error(
          Buffer.concat(err).toString("utf8").trim() ||
            `pdf process exited ${code ?? "null"}`,
        ),
      );
    });
    child.stdin.end(html, "utf8");
  });
}
