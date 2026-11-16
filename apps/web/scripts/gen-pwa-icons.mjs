import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const resvgEntry = process.env.RESVG_ENTRY;
if (!resvgEntry) throw new Error("RESVG_ENTRY is required");
const { Resvg } = await import(pathToFileURL(resvgEntry).href);

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public/icons");

const PATH =
  "M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800l80 160h120l-80-160h80l80 160h120l-80-160h80l80 160h120l-80-160h120q33 0 56.5 23.5T880-720v171q-38-17-81-10t-75 39L480-276v116H160Zm400 40v-123l221-220q9-9 20-13t22-4q12 0 23 4.5t20 13.5l37 37q8 9 12.5 20t4.5 22q0 11-4 22.5T903-340L683-120H560Zm263-224 37-39-37-37-38 38 38 38Z";

function iconSvg(size, maskable) {
  const radius = Math.round(size * 0.26);
  const stroke = Math.max(2, Math.round(size * 0.055));
  const glyph = Math.round(size * (maskable ? 0.5 : 0.62));
  const scale = glyph / 960;
  const ox = ((size - glyph) / 2).toFixed(2);
  const oy = ((size - glyph) / 2 + glyph).toFixed(2);
  const plate = maskable
    ? `<rect width="${size}" height="${size}" fill="#ff3d8a"/>`
    : `<rect width="${size}" height="${size}" rx="${radius}" fill="#ff3d8a"/>
       <rect x="${stroke / 2}" y="${stroke / 2}" width="${size - stroke}" height="${size - stroke}" rx="${Math.max(0, radius - stroke / 2)}" fill="none" stroke="#ffffff" stroke-width="${stroke}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${plate}
  <g transform="translate(${ox} ${oy}) scale(${scale})" fill="#ffffff">
    <path d="${PATH}"/>
  </g>
</svg>`;
}

function raster(svg, file) {
  const png = new Resvg(svg, { fitTo: { mode: "width", value: Number(/width="(\d+)"/.exec(svg)[1]) } }).render().asPng();
  writeFileSync(file, png);
}

mkdirSync(outDir, { recursive: true });

const favicon = iconSvg(64, false);
writeFileSync(join(root, "public/favicon.svg"), favicon);
raster(iconSvg(32, false), join(outDir, "favicon-32.png"));
raster(iconSvg(192, false), join(outDir, "icon-192.png"));
raster(iconSvg(512, false), join(outDir, "icon-512.png"));
raster(iconSvg(512, true), join(outDir, "icon-maskable-512.png"));
console.log("icons written", outDir);
