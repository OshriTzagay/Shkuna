const { createWriteStream } = require('fs');
const zlib = require('zlib');

function makePng(path, w, h, r, g, b) {
  function chunk(type, data) {
    const buf = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(require('crc-32').buf(buf) >>> 0, 0);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    return Buffer.concat([len, buf, crc]);
  }

  const rows = [];
  const row = Buffer.alloc(1 + w * 3);
  row[0] = 0;
  for (let x = 0; x < w; x++) {
    row[1 + x * 3] = r;
    row[2 + x * 3] = g;
    row[3 + x * 3] = b;
  }
  for (let y = 0; y < h; y++) rows.push(row);
  const raw = Buffer.concat(rows);
  const compressed = zlib.deflateSync(raw);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(w, 0);
  ihdrData.writeUInt32BE(h, 4);
  ihdrData[8] = 8; ihdrData[9] = 2;

  // manual CRC32
  function crc32(buf) {
    let c = 0xffffffff;
    for (const b of buf) {
      c ^= b;
      for (let i = 0; i < 8; i++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function ch(type, data) {
    const t = Buffer.from(type);
    const combined = Buffer.concat([t, data]);
    const crcVal = Buffer.alloc(4);
    crcVal.writeUInt32BE(crc32(combined), 0);
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);
    return Buffer.concat([lenBuf, combined, crcVal]);
  }

  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ch('IHDR', ihdrData),
    ch('IDAT', compressed),
    ch('IEND', Buffer.alloc(0)),
  ]);

  require('fs').writeFileSync(path, png);
  console.log('created', path);
}

require('fs').mkdirSync('assets/images', { recursive: true });
makePng('assets/images/icon.png',          1024, 1024, 21, 128, 61);
makePng('assets/images/adaptive-icon.png', 1024, 1024, 21, 128, 61);
makePng('assets/images/splash.png',        1284, 2778, 15,  26, 15);
