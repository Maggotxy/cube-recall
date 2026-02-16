const { autoUpdater } = require('electron-updater')
const log = require('electron-log')

// 配置日志
log.transports.file.level = 'info'
autoUpdater.logger = log

// 禁用自动下载，手动控制
autoUpdater.autoDownload = false

let mainWindow = null

/**
 * 初始化自动更新器
 */
function setupAutoUpdater(window) {
  mainWindow = window

  function safeSend(channel, data) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, data)
    }
  }

  autoUpdater.on('update-available', (info) => {
    log.info('发现新版本:', info.version)
    safeSend('updater:available', {
      version: info.version,
      releaseNotes: info.releaseNotes,
      releaseDate: info.releaseDate
    })
  })

  autoUpdater.on('update-not-available', () => {
    log.info('当前已是最新版本')
  })

  autoUpdater.on('download-progress', (progress) => {
    log.info(`下载进度: ${progress.percent.toFixed(2)}%`)
    safeSend('updater:progress', {
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    log.info('更新下载完成:', info.version)
    safeSend('updater:downloaded', { version: info.version })
  })

  autoUpdater.on('error', (err) => {
    log.error('自动更新错误:', err)
    safeSend('updater:error', { message: err.message })
  })

  log.info('自动更新器已初始化')
}

/**
 * 检查更新
 */
async function checkForUpdates() {
  try {
    log.info('开始检查更新...')
    const result = await autoUpdater.checkForUpdates()
    return result
  } catch (err) {
    log.error('检查更新失败:', err)
    throw err
  }
}

/**
 * 下载更新
 */
async function downloadUpdate() {
  try {
    log.info('开始下载更新...')
    await autoUpdater.downloadUpdate()
    return { success: true }
  } catch (err) {
    log.error('下载更新失败:', err)
    throw err
  }
}

/**
 * 退出并安装更新
 */
function quitAndInstall() {
  log.info('准备退出并安装更新...')
  // setImmediate 确保在退出前完成所有操作
  setImmediate(() => {
    autoUpdater.quitAndInstall(false, true)
  })
}

module.exports = {
  setupAutoUpdater,
  checkForUpdates,
  downloadUpdate,
  quitAndInstall
}
