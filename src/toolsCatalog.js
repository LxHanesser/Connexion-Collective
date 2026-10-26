// 工具清单的唯一数据源。
// 导航栏下拉、/tools 列表页、工具页顶部切换条都从这里取，新增工具只改这一个文件。

export const TOOL_GROUPS = [
  {
    id: 'practical',
    zh: {
      title: '现实工具',
      lead: '处理日常文件：图片、PDF、矢量图、照片元数据，以及开发者常用的小转换。',
    },
    en: {
      title: 'Everyday tools',
      lead: 'Files you deal with day to day: images, PDFs, vector graphics, photo metadata, and small developer conversions.',
    },
    tools: [
      {
        slug: 'image-compress',
        icon: '🗜️',
        zh: {name: '图片压缩', desc: '批量压缩 JPG / PNG / WebP，可调质量与尺寸，支持 WebP 输出与 PNG 无损优化。'},
        en: {
          name: 'Image compression',
          desc: 'Batch compress JPG / PNG / WebP with adjustable quality and size. WebP output and lossless PNG optimisation included.',
        },
      },
      {
        slug: 'image-convert',
        icon: '🔄',
        zh: {name: '格式转换', desc: '在 WebP / JPEG / PNG 之间互转，透明背景自动处理，批量转换后直接下载。'},
        en: {
          name: 'Format converter',
          desc: 'Convert between WebP, JPEG and PNG. Transparency is handled automatically, and batches download directly.',
        },
      },
      {
        slug: 'image-crop',
        icon: '✂️',
        zh: {name: '裁剪旋转', desc: '拖拽框选裁剪区域，支持旋转 90°、水平翻转与常用比例。'},
        en: {
          name: 'Crop & rotate',
          desc: 'Drag to select a crop area, rotate by 90°, flip horizontally, and use common ratios.',
        },
      },
      {
        slug: 'watermark',
        icon: '💧',
        zh: {name: '加水印', desc: '给图片加文字水印，9 个位置、字号透明度可调，按原图分辨率导出。'},
        en: {
          name: 'Watermark',
          desc: 'Add a text watermark in one of nine positions, with adjustable size and opacity.',
        },
      },
      {
        slug: 'image-ico',
        icon: '🪟',
        zh: {name: '转 ICO', desc: '把 PNG / JPG 转成多尺寸 ICO，适用于 Windows 图标与网页 favicon。'},
        en: {name: 'To ICO', desc: 'Turn PNG / JPG into a multi-size ICO for Windows icons and web favicons.'},
      },
      {
        slug: 'image-base64',
        icon: '🖼️',
        zh: {name: '转 Base64', desc: '生成 Data URI，可直接内联进 HTML、CSS 或 Markdown，省掉一次请求。'},
        en: {name: 'To Base64', desc: 'Produce a data URI you can inline in HTML, CSS or Markdown.'},
      },
      {
        slug: 'pixel-art',
        icon: '👾',
        zh: {name: '像素画', desc: '降采样加有限调色板，生成像素画风格，支持 PICO-8 / Game Boy 配色。'},
        en: {
          name: 'Pixel art',
          desc: 'Downsample with a limited palette for a pixel-art look, including PICO-8 and Game Boy colours.',
        },
      },
      {
        slug: 'svg-optimize',
        icon: '🧬',
        zh: {name: 'SVG 优化', desc: '清理编辑器元数据、注释与多余精度，减小体积，保留 id 与引用关系。'},
        en: {name: 'SVG optimiser', desc: 'Strip editor metadata, comments and excess precision while keeping ids intact.'},
      },
      {
        slug: 'exif',
        icon: '🔍',
        zh: {name: 'EXIF', desc: '查看照片的相机、时间与 GPS 信息，确认后一键清除再保存。'},
        en: {name: 'EXIF', desc: 'Inspect camera, timestamp and GPS data, then strip it and save a clean copy.'},
      },
      {
        slug: 'pdf',
        icon: '📄',
        zh: {name: 'PDF 合并拆分', desc: '合并多个 PDF，按页码范围拆分，或把每页导出成单独的压缩包。'},
        en: {name: 'PDF merge/split', desc: 'Merge several PDFs, extract page ranges, or export every page in a ZIP.'},
      },
      {
        slug: 'qr-code',
        icon: '📱',
        zh: {name: '二维码', desc: '输入链接或文字实时生成二维码，支持中文、自定义尺寸与纠错级别。'},
        en: {
          name: 'QR code',
          desc: 'Turn a link or text into a QR code with configurable size, margin, error correction and colours.',
        },
      },
      {
        slug: 'dev-tools',
        icon: '🧰',
        zh: {name: '开发工具', desc: 'JSON 格式化、Base64 / URL 编解码、哈希、时间戳、UUID，一页搞定。'},
        en: {name: 'Dev tools', desc: 'JSON formatting, Base64 / URL encoding, hashing, timestamps and UUIDs.'},
      },
    ],
  },
  {
    id: 'games',
    zh: {title: '游戏工具', lead: '游戏里算坐标、写命令、生成资源包这类事，也都不需要服务端。'},
    en: {
      title: 'Game tools',
      lead: 'Coordinates, commands and resource packs — none of which need a server either.',
    },
    tools: [
      {
        slug: 'cs2-crosshair',
        icon: '🎯',
        zh: {name: 'CS2 准星生成', desc: '可视化调准星参数，实时预览并生成 cl_crosshair* 控制台命令。'},
        en: {
          name: 'CS2 crosshair',
          desc: 'Tune the crosshair with a live preview and generate cl_crosshair* console commands.',
        },
      },
      {
        slug: 'cs2-sensitivity',
        icon: '🖱️',
        zh: {name: 'CS2 灵敏度换算', desc: '在 CS2 / Valorant / Apex / 守望先锋之间按 cm/360 换算灵敏度。'},
        en: {
          name: 'CS2 sensitivity',
          desc: 'Convert sensitivity between CS2, Valorant, Apex and Overwatch at equal cm/360.',
        },
      },
      {
        slug: 'cs2-viewmodel',
        icon: '🔫',
        zh: {name: 'CS2 视角模型', desc: '调 viewmodel_fov 与三轴偏移，带示意图，可导出 cfg。'},
        en: {
          name: 'CS2 viewmodel',
          desc: 'Tune viewmodel_fov and the three offsets with a schematic, then export a cfg.',
        },
      },
      {
        slug: 'cs2-autoexec',
        icon: '⚙️',
        zh: {name: 'CS2 autoexec', desc: '勾选常用设置，生成可直接使用的 autoexec.cfg 与启动项。'},
        en: {
          name: 'CS2 autoexec',
          desc: 'Tick the settings you want and generate a ready-to-use autoexec.cfg plus launch options.',
        },
      },
      {
        slug: 'mc-coords',
        icon: '🧭',
        zh: {name: 'MC 坐标换算', desc: '主世界与下界 8:1 互转，算出区块坐标、区块内偏移与 region 文件名。'},
        en: {
          name: 'MC coordinates',
          desc: 'Convert Overworld and Nether coordinates at 8:1, plus chunk coordinates and region names.',
        },
      },
      {
        slug: 'mc-datapack',
        icon: '📦',
        zh: {name: 'MC 数据包生成器', desc: '把命令打包成 datapacks 可直接使用的 ZIP，自动生成 pack.mcmeta 与标签。'},
        en: {
          name: 'MC datapack generator',
          desc: 'Bundle commands into a ready-to-use datapack ZIP with pack.mcmeta and tags generated for you.',
        },
      },
    ],
  },
];

/** 按语言取分组，附带本地化字段 */
export function getToolGroups(locale) {
  const isEnglish = locale === 'en';
  return TOOL_GROUPS.map((group) => ({
    id: group.id,
    title: isEnglish ? group.en.title : group.zh.title,
    lead: isEnglish ? group.en.lead : group.zh.lead,
    tools: group.tools.map((tool) => ({
      slug: tool.slug,
      icon: tool.icon,
      to: `/tools/${tool.slug}`,
      name: isEnglish ? tool.en.name : tool.zh.name,
      desc: isEnglish ? tool.en.desc : tool.zh.desc,
    })),
  }));
}

export const TOOL_COUNT = TOOL_GROUPS.reduce((sum, group) => sum + group.tools.length, 0);
