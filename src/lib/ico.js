// ICO 编码器：把一个或多个 PNG 尺寸打包成 .ico（Vista 之后允许内嵌 PNG）。
// 零依赖，避免为一次转换引入图片库。

const ICO_HEADER = 6;
const ICO_ENTRY = 16;

/**
 * @param {{size: number, png: Uint8Array}[]} images 每个尺寸一张 PNG
 * @returns {Blob}
 */
export function encodeIco(images) {
  if (!images.length) throw new Error('没有可写入的尺寸');

  const count = images.length;
  const dirSize = ICO_HEADER + ICO_ENTRY * count;
  const total = dirSize + images.reduce((sum, item) => sum + item.png.length, 0);
  const buffer = new Uint8Array(total);
  const view = new DataView(buffer.buffer);

  view.setUint16(0, 0, true); // reserved
  view.setUint16(2, 1, true); // type: icon
  view.setUint16(4, count, true);

  let entryOffset = ICO_HEADER;
  let dataOffset = dirSize;

  for (const image of images) {
    // 256 用 0 表示
    const dimension = image.size >= 256 ? 0 : image.size;
    view.setUint8(entryOffset, dimension); // width
    view.setUint8(entryOffset + 1, dimension); // height
    view.setUint8(entryOffset + 2, 0); // 调色板颜色数
    view.setUint8(entryOffset + 3, 0); // reserved
    view.setUint16(entryOffset + 4, 1, true); // color planes
    view.setUint16(entryOffset + 6, 32, true); // bits per pixel
    view.setUint32(entryOffset + 8, image.png.length, true);
    view.setUint32(entryOffset + 12, dataOffset, true);
    entryOffset += ICO_ENTRY;

    buffer.set(image.png, dataOffset);
    dataOffset += image.png.length;
  }

  return new Blob([buffer], {type: 'image/x-icon'});
}

export const ICO_SIZES = [16, 32, 48, 64, 128, 256];
