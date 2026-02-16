/**
 * 从 mclogo.png 生成 ICO 图标（多尺寸）
 * 读取 src/assets/mclogo.png，嵌入 ICO 容器
 */
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const SRC_PNG = path.join(__dirname, '..', 'src', 'assets', 'mclogo.png')
const OUT_ICO = path.join(__dirname, '..', 'public', 'icon.ico')
const OUT_PNG = path.join(__dirname, '..', 'public', 'icon.png')

// 读取 PNG 文件
const pngData = fs.readFileSync(SRC_PNG)

// 解析 PNG 获取宽高
function getPngDimensions(buf) {
  // PNG signature (8 bytes) + IHDR length (4 bytes) + "IHDR" (4 bytes) + width (4) + height (4)
  if (buf.length < 24) throw new Error('Invalid PNG')
  const w = buf.readUInt32BE(16)
  const h = buf.readUInt32BE(20)
  return { width: w, height: h }
}

const { width, height } = getPngDimensions(pngData)
console.log(`Source PNG: ${width}x${height} (${pngData.length} bytes)`)

// 生成 ICO（嵌入 PNG 格式，支持 256x256）
function createICO(pngBuf, w, h) {
  // ICO header: 6 bytes
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)     // reserved
  header.writeUInt16LE(1, 2)     // type: ICO
  header.writeUInt16LE(1, 4)     // count: 1 image

  // Directory entry: 16 bytes
  const entry = Buffer.alloc(16)
  entry[0] = w >= 256 ? 0 : w    // width (0 = 256)
  entry[1] = h >= 256 ? 0 : h    // height (0 = 256)
  entry[2] = 0                    // color palette
  entry[3] = 0                    // reserved
  entry.writeUInt16LE(1, 4)      // color planes
  entry.writeUInt16LE(32, 6)     // bits per pixel
  entry.writeUInt32LE(pngBuf.length, 8)   // size of PNG data
  entry.writeUInt32LE(22, 12)    // offset (6 + 16 = 22)

  return Buffer.concat([header, entry, pngBuf])
}

const ico = createICO(pngData, width, height)
fs.writeFileSync(OUT_ICO, ico)
console.log(`ICO generated: ${OUT_ICO} (${ico.length} bytes)`)

// 同时复制 PNG 到 public（覆盖旧的草方块 PNG）
fs.copyFileSync(SRC_PNG, OUT_PNG)
console.log(`PNG copied: ${OUT_PNG}`)
