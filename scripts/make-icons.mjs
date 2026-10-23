// Generates the PWA PNG icons (a white house with a check mark on brand green) without
// any image libraries. Run: npm run icons -w web
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const GREEN = [14, 107, 80];
const WHITE = [255, 255, 255];
const GOLD = [242, 169, 0];

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size, pixel) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x / size, y / size);
      const i = y * (size * 3 + 1) + 1 + x * 3;
      raw[i] = r; raw[i + 1] = g; raw[i + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// Icon drawn in a unit square; `pad` shrinks the art for maskable icons.
function art(pad) {
  return (u, v) => {
    const x = (u - pad) / (1 - 2 * pad);
    const y = (v - pad) / (1 - 2 * pad);
    // roof: triangle apex (0.5,0.2), base y=0.48 from x=0.18..0.82
    const inRoof = y >= 0.2 && y <= 0.48 && Math.abs(x - 0.5) <= ((y - 0.2) / 0.28) * 0.32;
    const inBody = x >= 0.27 && x <= 0.73 && y >= 0.46 && y <= 0.8;
    // check mark inside body (gold)
    const d1 = Math.abs((y - 0.63) - (x - 0.42)) < 0.035 && x >= 0.36 && x <= 0.47;
    const d2 = Math.abs((y - 0.68) + (x - 0.47) * 1.1) < 0.035 && x >= 0.46 && x <= 0.64;
    if ((inBody || inRoof) && (d1 || d2) && inBody) return GOLD;
    if (inRoof || inBody) return WHITE;
    return GREEN;
  };
}

writeFileSync(new URL("../public/icon-192.png", import.meta.url), png(192, art(0)));
writeFileSync(new URL("../public/icon-512.png", import.meta.url), png(512, art(0)));
writeFileSync(new URL("../public/icon-maskable-512.png", import.meta.url), png(512, art(0.12)));
console.log("Icons written to web/public");
