// 浏览器端图片压缩：解码用浏览器原生能力，编码用自托管的 WASM 编码器。
// 不发起任何网络请求（WASM 从本站 /wasm 加载，图片不离开本机）。

const WASM_BASE = '/wasm/';

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 单文件 25MB
const MAX_PIXELS = 40_000_000; // 4000 万像素，超过则自动缩放，避免手机内存爆掉
const HARD_MAX_EDGE = 4096;

export const LIMITS = {
  maxFiles: 20,
  maxFileBytes: MAX_FILE_BYTES,
};

let webpCodec = null;
let jpegCodec = null;
let oxipngCodec = null;

function withBase(name) {
  return `${WASM_BASE}${name}`;
}

async function ensureWebp() {
  if (!webpCodec) {
    webpCodec = (async () => {
      // 注意：包的入口只导出 encode/decode，init 要从 encode.js 具名导入
      const mod = await import('@jsquash/webp/encode.js');
      await mod.init({
        locateFile: (file) => withBase(file.split('/').pop()),
      });
      return {encode: mod.default};
    })().catch((error) => {
      webpCodec = null;
      throw error;
    });
  }
  return webpCodec;
}

async function ensureJpeg() {
  if (!jpegCodec) {
    jpegCodec = (async () => {
      const mod = await import('@jsquash/jpeg/encode.js');
      await mod.init({
        locateFile: (file) => withBase(file.split('/').pop()),
      });
      return {encode: mod.default};
    })().catch((error) => {
      jpegCodec = null;
      throw error;
    });
  }
  return jpegCodec;
}

async function ensureOxipng() {
  if (!oxipngCodec) {
    oxipngCodec = (async () => {
      const mod = await import('@jsquash/oxipng/optimise.js');
      await mod.init(withBase('squoosh_oxipng_bg.wasm'));
      return {optimise: mod.default};
    })().catch((error) => {
      oxipngCodec = null;
      throw error;
    });
  }
  return oxipngCodec;
}

function formatLabel(format) {
  if (format === 'webp') return 'WebP';
  if (format === 'jpeg') return 'JPEG';
  if (format === 'png') return 'PNG';
  return format;
}

function extensionFor(format) {
  return format === 'jpeg' ? 'jpg' : format;
}

export function resolveFormat(requested, inputType) {
  if (requested !== 'auto') {
    return requested;
  }
  if (inputType === 'image/png') return 'png';
  if (inputType === 'image/webp') return 'webp';
  return 'jpeg';
}

/**
 * 把文件解码成 ImageData，必要时等比缩放。
 * @param {File} file
 * @param {{maxEdge?: number, background?: string|null, locale?: 'zh'|'en'}} options
 */
export async function decodeToImageData(file, {maxEdge = 0, background = null, locale = 'zh'} = {}) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(
      locale === 'en'
        ? 'The browser cannot decode this image — it may be HEIC. Export it as JPG/PNG first.'
        : '浏览器无法解码这张图片，可能是 HEIC 等格式，请先转成 JPG/PNG',
    );
  }

  try {
    let targetEdge = maxEdge;
    const pixels = bitmap.width * bitmap.height;
    if (pixels > MAX_PIXELS) {
      targetEdge = HARD_MAX_EDGE;
    }

    const scale = targetEdge
      ? Math.min(1, targetEdge / Math.max(bitmap.width, bitmap.height))
      : 1;

    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d', {willReadFrequently: true});
    if (!context) {
      throw new Error('当前浏览器不支持 Canvas 2D');
    }
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';

    if (background) {
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);
    }

    context.drawImage(bitmap, 0, 0, width, height);

    return {
      imageData: context.getImageData(0, 0, width, height),
      width,
      height,
      resized: width !== bitmap.width || height !== bitmap.height,
    };
  } finally {
    bitmap.close?.();
  }
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('导出图片失败'))),
      type,
      quality,
    );
  });
}

/**
 * 压缩一张图片。
 * @param {File} file
 * @param {{format: 'auto'|'webp'|'jpeg'|'png', quality: number, maxEdge: number}} options
 */
export async function compressImage(file, {format = 'auto', quality = 75, maxEdge = 0, locale = 'zh'} = {}) {
  const targetFormat = resolveFormat(format, file.type);

  // PNG → PNG 且不需要缩放：走无损优化，像素完全不变
  if (targetFormat === 'png' && file.type === 'image/png' && !maxEdge) {
    const oxipng = await ensureOxipng();
    const buffer = await file.arrayBuffer();
    const optimized = await oxipng.optimise(buffer, {level: 2});
    const blob = new Blob([optimized], {type: 'image/png'});
    return {
      blob: blob.size < file.size ? blob : file,
      width: null,
      height: null,
      format: 'png',
      engine: 'oxipng（无损）',
      note: blob.size < file.size ? '' : '已是最优，保留原图',
    };
  }

  const {imageData, width, height, resized} = await decodeToImageData(file, {
    maxEdge,
    background: targetFormat === 'jpeg' ? '#ffffff' : null,
    locale,
  });

  let blob;
  let engine;

  if (targetFormat === 'webp') {
    const {encode} = await ensureWebp();
    const buffer = await encode(imageData, {quality: quality / 100});
    blob = new Blob([buffer], {type: 'image/webp'});
    engine = 'libwebp（WASM）';
  } else if (targetFormat === 'jpeg') {
    const {encode} = await ensureJpeg();
    const buffer = await encode(imageData, {quality});
    blob = new Blob([buffer], {type: 'image/jpeg'});
    engine = 'mozjpeg（WASM）';
  } else {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').putImageData(imageData, 0, 0);
    const raw = await canvasToBlob(canvas, 'image/png');
    const oxipng = await ensureOxipng();
    const optimized = await oxipng.optimise(await raw.arrayBuffer(), {level: 2});
    blob = new Blob([optimized], {type: 'image/png'});
    engine = 'oxipng（WASM）';
  }

  const keepOriginal = blob.size >= file.size;
  return {
    blob: keepOriginal ? file : blob,
    width,
    height,
    format: targetFormat,
    engine,
    resized,
    note: keepOriginal ? '压缩后没有更小，保留原图' : '',
  };
}

export function buildOutputName(file, format) {
  const base = file.name.replace(/\.[^.]+$/, '');
  return `${base}-compressed.${extensionFor(format)}`;
}

/**
 * 预热编码器：用户选完图就提前把对应格式的 WASM 拉下来，
 * 真正点「开始压缩」时不用再等下载。失败不影响后续压缩。
 * @param {'auto'|'webp'|'jpeg'|'png'} format
 * @param {string} sampleType 第一张图的 MIME 类型
 */
export async function warmup(format, sampleType = 'image/jpeg') {
  const target = resolveFormat(format, sampleType);
  if (target === 'png') {
    await ensureOxipng();
    return 'png';
  }
  if (target === 'webp') {
    await ensureWebp();
    return 'webp';
  }
  await ensureJpeg();
  return 'jpeg';
}

export function describeFormat(format) {
  return formatLabel(format);
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** index;
  return `${value >= 10 || index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`;
}

export function savingPercent(before, after) {
  if (!before || before <= 0) return 0;
  return Math.max(0, Math.round((1 - after / before) * 100));
}
