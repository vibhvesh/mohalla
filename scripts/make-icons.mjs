import fs from "node:fs";
import zlib from "node:zlib";

function crc32(buffer) {
  let crc = ~0;
  for (let index = 0; index < buffer.length; index += 1) {
    crc ^= buffer[index];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const name = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, crc]);
}

function inRoundRect(x, y, left, top, right, bottom, radius) {
  if (x < left || y < top || x > right || y > bottom) return false;
  let cx = null;
  let cy = null;
  if (x < left + radius && y < top + radius) {
    cx = left + radius;
    cy = top + radius;
  } else if (x > right - radius && y < top + radius) {
    cx = right - radius;
    cy = top + radius;
  } else if (x < left + radius && y > bottom - radius) {
    cx = left + radius;
    cy = bottom - radius;
  } else if (x > right - radius && y > bottom - radius) {
    cx = right - radius;
    cy = bottom - radius;
  }
  if (cx == null || cy == null) return true;
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
}

function paint(x, y, size) {
  const px = x + 0.5;
  const py = y + 0.5;
  const margin = size * 0.04;
  if (!inRoundRect(px, py, margin, margin, size - margin, size - margin, size * 0.22)) {
    return [0, 0, 0, 0];
  }
  const pitch = inRoundRect(px, py, size * 0.16, size * 0.2, size * 0.84, size * 0.8, size * 0.08);
  if (!pitch) return [14, 59, 46, 255];
  const centerX = size / 2;
  const centerY = size / 2;
  const line = size * 0.012;
  const onHalfway = Math.abs(px - centerX) < line && py > size * 0.24 && py < size * 0.76;
  const circle = Math.abs(Math.hypot(px - centerX, py - centerY) - size * 0.11) < line;
  if (onHalfway || circle) return [223, 242, 90, 255];
  return [20, 96, 70, 255];
}

function png(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const [red, green, blue, alpha] = paint(x, y, size);
      const offset = row + 1 + x * 4;
      raw[offset] = red;
      raw[offset + 1] = green;
      raw[offset + 2] = blue;
      raw[offset + 3] = alpha;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

fs.mkdirSync("public", { recursive: true });
fs.writeFileSync("public/icon-192.png", png(192));
fs.writeFileSync("public/icon-512.png", png(512));
console.log("Wrote public/icon-192.png and public/icon-512.png");
