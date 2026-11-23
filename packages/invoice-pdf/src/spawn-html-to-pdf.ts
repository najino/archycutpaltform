import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PDF_TIMEOUT_MS = 45_000;

function resolveWorker(): { script: string; cwd: string } {
  let here: string | null = null;
  try {
    here = path.dirname(fileURLToPath(import.meta.url));
  } catch {
    here = null;
  }

  const candidates = [
    here ? path.join(here, "html-to-pdf.mjs") : null,
    path.resolve(process.cwd(), "src/html-to-pdf.mjs"),
    path.resolve(process.cwd(), "packages/invoice-pdf/src/html-to-pdf.mjs"),
    path.resolve(process.cwd(), "../packages/invoice-pdf/src/html-to-pdf.mjs"),
    path.resolve(process.cwd(), "../../packages/invoice-pdf/src/html-to-pdf.mjs"),
  ].filter((p): p is string => Boolean(p));

  const script = candidates.find((p) => existsSync(p));
  if (!script) {
    throw new Error(
      `html-to-pdf.mjs not found. Tried: ${candidates.join(", ")}`,
    );
  }
  return { script, cwd: path.resolve(path.dirname(script), "..") };
}

export function htmlToPdf(html: string): Promise<Buffer> {
  const { script, cwd } = resolveWorker();

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
      windowsHide: true,
    });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const timer = setTimeout(() => {
      child.kill();
      finish(() => reject(new Error("pdf process timeout")));
    }, PDF_TIMEOUT_MS);

    child.stdout.on("data", (chunk: Buffer) => out.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => err.push(chunk));
    child.on("error", (error) => finish(() => reject(error)));
    child.stdin.on("error", (error) => finish(() => reject(error)));
    child.on("close", (code) => {
      finish(() => {
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
    });
    child.stdin.end(html, "utf8");
  });
}
