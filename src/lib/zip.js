// 极简 ZIP 打包器：只做 store（不压缩），用于导出数据包这类小文件集合。
// 不引入第三方库，避免为一个下载功能增加依赖面。

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date) {
  const time =
    ((date.getHours() & 0x1f) << 11) |
    ((date.getMinutes() & 0x3f) << 5) |
    ((date.getSeconds() >> 1) & 0x1f);
  const day =
    (((date.getFullYear() - 1980) & 0x7f) << 9) |
    (((date.getMonth() + 1) & 0x0f) << 5) |
    (date.getDate() & 0x1f);
  return {time, day};
}

/**
 * 打包成 zip。
 * @param {{name: string, data: string | Uint8Array}[]} files
 * @returns {Blob}
 */
export function createZip(files) {
  const encoder = new TextEncoder();
  const now = new Date();
  const {time, day} = dosDateTime(now);

  const entries = files.map((file) => {
    const nameBytes = encoder.encode(file.name);
    const data = typeof file.data === 'string' ? encoder.encode(file.data) : file.data;
    return {nameBytes, data, crc: crc32(data)};
  });

  let localSize = 0;
  let centralSize = 0;
  for (const entry of entries) {
    localSize += 30 + entry.nameBytes.length + entry.data.length;
    centralSize += 46 + entry.nameBytes.length;
  }

  const buffer = new Uint8Array(localSize + centralSize + 22);
  const view = new DataView(buffer.buffer);
  let offset = 0;
  const offsets = [];

  for (const entry of entries) {
    offsets.push(offset);
    view.setUint32(offset, 0x04034b50, true);
    view.setUint16(offset + 4, 20, true); // version needed
    view.setUint16(offset + 6, 0x0800, true); // UTF-8 文件名
    view.setUint16(offset + 8, 0, true); // store
    view.setUint16(offset + 10, time, true);
    view.setUint16(offset + 12, day, true);
    view.setUint32(offset + 14, entry.crc, true);
    view.setUint32(offset + 18, entry.data.length, true);
    view.setUint32(offset + 22, entry.data.length, true);
    view.setUint16(offset + 26, entry.nameBytes.length, true);
    view.setUint16(offset + 28, 0, true);
    offset += 30;
    buffer.set(entry.nameBytes, offset);
    offset += entry.nameBytes.length;
    buffer.set(entry.data, offset);
    offset += entry.data.length;
  }

  const centralStart = offset;
  entries.forEach((entry, index) => {
    view.setUint32(offset, 0x02014b50, true);
    view.setUint16(offset + 4, 20, true); // version made by
    view.setUint16(offset + 6, 20, true); // version needed
    view.setUint16(offset + 8, 0x0800, true);
    view.setUint16(offset + 10, 0, true);
    view.setUint16(offset + 12, time, true);
    view.setUint16(offset + 14, day, true);
    view.setUint32(offset + 16, entry.crc, true);
    view.setUint32(offset + 20, entry.data.length, true);
    view.setUint32(offset + 24, entry.data.length, true);
    view.setUint16(offset + 28, entry.nameBytes.length, true);
    view.setUint16(offset + 30, 0, true);
    view.setUint16(offset + 32, 0, true);
    view.setUint16(offset + 34, 0, true);
    view.setUint16(offset + 36, 0, true);
    view.setUint32(offset + 38, 0, true);
    view.setUint32(offset + 42, offsets[index], true);
    offset += 46;
    buffer.set(entry.nameBytes, offset);
    offset += entry.nameBytes.length;
  });

  view.setUint32(offset, 0x06054b50, true);
  view.setUint16(offset + 4, 0, true);
  view.setUint16(offset + 6, 0, true);
  view.setUint16(offset + 8, entries.length, true);
  view.setUint16(offset + 10, entries.length, true);
  view.setUint32(offset + 12, offset - centralStart, true);
  view.setUint32(offset + 16, centralStart, true);
  view.setUint16(offset + 20, 0, true);

  return new Blob([buffer], {type: 'application/zip'});
}
