const { app } = require('electron')
const log = require('electron-log')
const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')
const yaml = require('js-yaml')

const UPDATE_URL = 'http://mc.sivita.xyz:5806/updates'

log.transports.file.level = 'info'

let mainWindow = null
let isDownloading = false

function safeSend(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data)
  }
}

/**
 * HTTP GET 请求（返回 Buffer）
 */
function httpGet(url, options = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http
    const req = mod.get(url, { timeout: options.timeout || 15000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpGet(res.headers.location, options).then(resolve, reject)
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`))
        return
      }
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
  })
}

/**
 * 比较语义版本号: 返回 1 (a>b), -1 (a<b), 0 (a==b)
 */
function compareVersions(a, b) {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1
    if ((pa[i] || 0) < (pb[i] || 0)) return -1
  }
  return 0
}

/**
 * 启动时清理旧版本 exe（由上一次更新留下的）
 */
function cleanupOldVersions() {
  const currentExe = process.env.PORTABLE_EXECUTABLE_FILE
  if (!currentExe) return

  const dir = path.dirname(currentExe)
  const currentName = path.basename(currentExe)

  try {
    const files = fs.readdirSync(dir)
    for (const file of files) {
      // 匹配 CubeRecall-*.exe 但排除当前文件
      if (file !== currentName && /^CubeRecall-.*\.exe$/i.test(file)) {
        const fullPath = path.join(dir, file)
        try {
          fs.unlinkSync(fullPath)
          log.info(`已清理旧版本: ${file}`)
        } catch (e) {
          log.info(`清理旧版本失败（可能仍在使用）: ${file}`)
        }
      }
    }
  } catch (e) {
    log.info(`清理旧版本目录扫描失败: ${e.message}`)
  }
}

/**
 * 初始化
 */
function setupAutoUpdater(window) {
  mainWindow = window
  log.info('自动更新器已初始化 (portable mode)')
  // 启动时清理旧版本
  cleanupOldVersions()
}

/**
 * 检查更新：获取 latest.yml，比对版本
 */
async function checkForUpdates() {
  const currentVersion = app.getVersion()
  log.info(`检查更新... 当前版本: ${currentVersion}`)

  const buf = await httpGet(`${UPDATE_URL}/latest.yml`)
  const info = yaml.load(buf.toString('utf-8'))
  const remoteVersion = info.version

  log.info(`远程版本: ${remoteVersion}`)

  if (compareVersions(remoteVersion, currentVersion) > 0) {
    log.info(`发现新版本 ${remoteVersion}`)
    safeSend('updater:available', { version: remoteVersion })
    return { updateAvailable: true, version: remoteVersion, info }
  }

  log.info('当前已是最新版本')
  return { updateAvailable: false }
}

/**
 * 下载新版本 exe 到同目录，然后启动新版本
 */
async function downloadUpdate() {
  if (isDownloading) {
    log.info('下载已在进行中，跳过重复调用')
    return
  }
  isDownloading = true
  log.info('开始下载更新...')

  try {
    // 1. 获取 latest.yml
    const buf = await httpGet(`${UPDATE_URL}/latest.yml`)
    const info = yaml.load(buf.toString('utf-8'))
    const fileName = info.files?.[0]?.url || info.path
    const fileSize = info.files?.[0]?.size || 0
    const downloadUrl = `${UPDATE_URL}/${fileName}`

    log.info(`下载: ${downloadUrl} (${fileSize} bytes)`)

    // 2. 确定下载目标路径（与当前 exe 同目录，新文件名）
    const currentExe = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath
    const exeDir = path.dirname(currentExe)
    // 新版本文件名：CubeRecall-{version}.exe
    const newFileName = `CubeRecall-${info.version}.exe`
    const newExePath = path.join(exeDir, newFileName)

    log.info(`下载目标: ${newExePath}`)

    // 如果目标文件已存在且大小匹配，跳过下载
    if (fs.existsSync(newExePath)) {
      const stat = fs.statSync(newExePath)
      if (stat.size === fileSize) {
        log.info('新版本文件已存在，跳过下载')
        launchNewVersion(newExePath)
        return
      }
      // 大小不匹配，删掉重新下载
      fs.unlinkSync(newExePath)
    }

    // 3. 下载到目标路径
    await downloadFile(downloadUrl, newExePath, fileSize)

    // 4. 验证文件大小
    const stat = fs.statSync(newExePath)
    if (fileSize > 0 && stat.size !== fileSize) {
      log.error(`下载文件大小不匹配: ${stat.size} vs ${fileSize}`)
      fs.unlinkSync(newExePath)
      throw new Error('下载文件大小不匹配')
    }

    log.info(`下载完成: ${newExePath} (${stat.size} bytes)`)
    safeSend('updater:downloaded', { version: info.version })

    // 5. 启动新版本
    launchNewVersion(newExePath)
  } catch (err) {
    isDownloading = false
    throw err
  }
}

/**
 * 启动新版本 exe 并退出当前进程
 */
function launchNewVersion(newExePath) {
  log.info(`启动新版本: ${newExePath}`)

  const child = spawn(newExePath, [], {
    detached: true,
    stdio: 'ignore',
  })
  child.unref()

  log.info('新版本已启动，正在退出当前应用...')
  setTimeout(() => {
    app.quit()
  }, 500)
}

/**
 * 下载文件，带进度回调
 */
function downloadFile(url, dest, totalSize) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    let downloaded = 0

    const doRequest = (reqUrl) => {
      const reqMod = reqUrl.startsWith('https') ? https : http
      reqMod.get(reqUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close()
          try { fs.unlinkSync(dest) } catch (_) {}
          const f2 = fs.createWriteStream(dest)
          downloaded = 0
          doRequestPipe(res.headers.location, f2, resolve, reject)
          return
        }
        if (res.statusCode !== 200) {
          file.close()
          reject(new Error(`HTTP ${res.statusCode}`))
          return
        }

        const total = totalSize || parseInt(res.headers['content-length'], 10) || 0
        let lastReport = 0

        res.on('data', (chunk) => {
          downloaded += chunk.length
          const now = Date.now()
          if (total > 0 && now - lastReport > 500) {
            lastReport = now
            const percent = Math.round((downloaded / total) * 100)
            safeSend('updater:progress', {
              percent,
              transferred: downloaded,
              total,
              bytesPerSecond: 0
            })
          }
        })

        res.pipe(file)
        file.on('finish', () => { file.close(); resolve() })
      }).on('error', (err) => {
        file.close()
        try { fs.unlinkSync(dest) } catch (_) {}
        reject(err)
      })
    }

    const doRequestPipe = (reqUrl, fileStream, res, rej) => {
      const reqMod2 = reqUrl.startsWith('https') ? https : http
      reqMod2.get(reqUrl, (response) => {
        if (response.statusCode !== 200) {
          fileStream.close()
          rej(new Error(`HTTP ${response.statusCode}`))
          return
        }
        const total = totalSize || parseInt(response.headers['content-length'], 10) || 0
        let lastReport = 0

        response.on('data', (chunk) => {
          downloaded += chunk.length
          const now = Date.now()
          if (total > 0 && now - lastReport > 500) {
            lastReport = now
            const percent = Math.round((downloaded / total) * 100)
            safeSend('updater:progress', {
              percent,
              transferred: downloaded,
              total,
              bytesPerSecond: 0
            })
          }
        })
        response.pipe(fileStream)
        fileStream.on('finish', () => { fileStream.close(); res() })
      }).on('error', (err) => {
        fileStream.close()
        rej(err)
      })
    }

    doRequest(url)
  })
}

function quitAndInstall() {
  log.info('quitAndInstall called (no-op in portable mode)')
}

module.exports = {
  setupAutoUpdater,
  checkForUpdates,
  downloadUpdate,
  quitAndInstall
}
