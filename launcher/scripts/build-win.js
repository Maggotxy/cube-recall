/**
 * Windows 构建脚本
 * 1. vite build
 * 2. electron-builder --dir (打包 unpacked)
 * 3. rcedit 替换图标和版本信息
 * 4. electron-builder --win portable --prepackaged (NSIS portable)
 */
const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const ROOT = path.resolve(__dirname, '..')
const ICON = path.join(ROOT, 'public', 'icon.ico')
const OUTPUT = path.join(ROOT, 'release')
const UNPACKED = path.join(OUTPUT, 'win-unpacked')
const EXE_NAME = 'Cube Recall.exe'

function findRcedit() {
  const cacheDir = path.join(
    process.env.LOCALAPPDATA || '',
    'electron-builder', 'Cache', 'winCodeSign'
  )
  if (!fs.existsSync(cacheDir)) return null

  for (const dir of fs.readdirSync(cacheDir)) {
    const rcedit = path.join(cacheDir, dir, 'rcedit-x64.exe')
    if (fs.existsSync(rcedit)) return rcedit
  }
  return null
}

function run(cmd, label) {
  console.log(`\n>> ${label}`)
  execSync(cmd, { cwd: ROOT, stdio: 'inherit' })
}

try {
  // Step 1: Build Vue
  run('npx vite build', 'Building Vue frontend...')

  // Step 2: Build unpacked
  run('npx electron-builder --win --dir', 'Packaging Electron app (unpacked)...')

  // Step 3: Apply rcedit for icon and version info
  const rcedit = findRcedit()
  const exePath = path.join(UNPACKED, EXE_NAME)

  if (rcedit && fs.existsSync(exePath) && fs.existsSync(ICON)) {
    console.log(`\n>> Applying rcedit: ${rcedit}`)
    const pkg = require(path.join(ROOT, 'package.json'))
    const version = pkg.version || '1.0.0'

    execSync([
      `"${rcedit}" "${exePath}"`,
      `--set-icon "${ICON}"`,
      `--set-version-string "ProductName" "Cube Recall"`,
      `--set-version-string "FileDescription" "Cube Recall - Minecraft Launcher"`,
      `--set-version-string "CompanyName" "Cube Recall Team"`,
      `--set-version-string "LegalCopyright" "Copyright (c) 2026 Cube Recall Team"`,
      `--set-file-version "${version}"`,
      `--set-product-version "${version}"`,
    ].join(' '), { cwd: ROOT, stdio: 'inherit' })

    console.log('>> Icon and version info applied successfully')
  } else {
    console.warn('>> WARNING: rcedit not found or exe/icon missing, skipping')
  }

  // Step 4: Build NSIS portable from modified unpacked
  // electron-builder 的 --prepackaged 默认用 7z SFX，
  // 但我们需要 NSIS portable（设置 PORTABLE_EXECUTABLE_FILE 环境变量）
  // 通过 --win portable 强制使用 NSIS 模板
  run(`npx electron-builder --win portable --prepackaged "${UNPACKED}"`, 'Building portable exe...')

  console.log('\n>> Build complete!')
  const pkg = require(path.join(ROOT, 'package.json'))
  const portableExe = path.join(OUTPUT, `CubeRecall-${pkg.version}.exe`)
  if (fs.existsSync(portableExe)) {
    const size = (fs.statSync(portableExe).size / 1024 / 1024).toFixed(1)
    console.log(`>> Output: ${portableExe} (${size} MB)`)
  }
} catch (e) {
  console.error('\n>> Build failed:', e.message)
  process.exit(1)
}
