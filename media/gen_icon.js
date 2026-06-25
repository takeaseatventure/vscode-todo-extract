const fs = require('fs');
const zlib = require('zlib');

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) { c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); }
    table[i] = c;
  }
  for (let i = 0; i < buf.length; i++) { crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8); }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4); lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const w = 128, h = 128;
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

const raw = Buffer.alloc(h * (1 + w * 3));
for (let y = 0; y < h; y++) {
  raw[y * (1 + w * 3)] = 0;
  for (let x = 0; x < w; x++) {
    const o = y * (1 + w * 3) + 1 + x * 3;
    const cx = x - w/2, cy = y - h/2, dist = Math.sqrt(cx*cx + cy*cy);
    if (dist < 30) { raw[o] = 245; raw[o+1] = 158; raw[o+2] = 11; } // orange/amber for TODO
    else { raw[o] = 22; raw[o+1] = 27; raw[o+2] = 34; }
  }
}
const compressed = zlib.deflateSync(raw);
const png = Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
fs.writeFileSync('/workspace/products/vscode-todo-extract/media/icon.png', png);
console.log('Done:', png.length, 'bytes');
