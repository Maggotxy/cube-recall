const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

// 设置 AppUserModelId，让 Windows 任务栏识别为独立应用（不复用 Electron 默认图标缓存）
app.setAppUserModelId('com.cuberecall.app')

// 绕过系统代理，避免代理软件未运行时 ECONNREFUSED
// 开发模式下不设置 no-proxy-server，否则 Chromium 无法连接 Vite dev server
if (app.isPackaged) {
  app.commandLine.appendSwitch('no-proxy-server')
}

// Node.js 侧也需要绕过代理环境变量
delete process.env.HTTP_PROXY
delete process.env.HTTPS_PROXY
delete process.env.http_proxy
delete process.env.https_proxy

// 配置
const { SERVER_URL } = require('./app-config')

// 模块
const javaManager = require('./modules/java-manager')
const gameManager = require('./modules/game-manager')
const modSync = require('./modules/mod-sync')
const machineId = require('./modules/machine-id')
const FileSyncManager = require('./modules/file-sync-manager')
const updater = require('./modules/auto-updater')

let mainWindow

// ========== 杀软兼容 ==========
app.disableHardwareAcceleration()
app.setPath('userData', path.join(app.getPath('appData'), 'CubeRecall'))

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 640,
    minWidth: 800,
    minHeight: 560,
    frame: false,
    resizable: true,
    show: false,
    backgroundColor: '#2C2C2C',
    icon: path.join(__dirname, '../public/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.once('ready-to-show', () => {
    console.log('ready-to-show fired, showing window')
    mainWindow.show()
  })

  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    const devUrl = 'http://localhost:5173'

    // 开发模式：5秒后强制显示窗口（防止 ready-to-show 不触发）
    setTimeout(() => {
      if (!mainWindow.isVisible()) {
        console.log('强制显示窗口（ready-to-show 未触发）')
        mainWindow.show()
      }
    }, 5000)

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.log(`did-fail-load: code=${errorCode} desc=${errorDescription} url=${validatedURL}`)
      if (validatedURL === devUrl + '/') {
        setTimeout(() => mainWindow.loadURL(devUrl), 2000)
      }
    })

    mainWindow.webContents.on('did-finish-load', () => {
      console.log('did-finish-load: 页面加载完成')
    })

    mainWindow.loadURL(devUrl)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

// 单实例锁定
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
  app.whenReady().then(() => {
    createWindow()

    // 初始化自动更新器
    updater.setupAutoUpdater(mainWindow)

    // 延迟10秒后检查更新并自动安装（开发环境跳过）
    setTimeout(async () => {
      if (process.env.NODE_ENV !== 'development' && app.isPackaged) {
        try {
          const result = await updater.checkForUpdates()
          if (result.updateAvailable) {
            await updater.downloadUpdate()
          }
        } catch (err) {
          console.error('自动更新失败:', err)
        }
      }
    }, 10000)
  })
}

app.on('window-all-closed', () => {
  app.quit()
})

// ========== 窗口控制 ==========
ipcMain.handle('window:minimize', () => mainWindow.minimize())
ipcMain.handle('window:maximize', () => {
  if (mainWindow.isMaximized()) mainWindow.unmaximize()
  else mainWindow.maximize()
})
ipcMain.handle('window:close', () => mainWindow.close())

// ========== 机器码 ==========
ipcMain.handle('machine:getId', () => machineId.getMachineId())

// ========== Java 管理 ==========
ipcMain.handle('java:detect', () => javaManager.detectJava())
ipcMain.handle('java:install', () => {
  return javaManager.installJava((progress) => {
    mainWindow.webContents.send('java:progress', progress)
  })
})

// ========== 应用配置 ==========
ipcMain.handle('app:getConfig', () => {
  return { serverUrl: SERVER_URL }
})
ipcMain.handle('app:getVersion', () => {
  return app.getVersion()
})

// ========== 游戏状态 ==========
ipcMain.handle('game:getMinecraftDir', () => gameManager.getMinecraftDir())
ipcMain.handle('game:isInstalled', () => gameManager.isInstalled())

// ========== Mod 同步 ==========
ipcMain.handle('mods:sync', (event, { serverUrl }) => {
  return modSync.syncMods(serverUrl, (progress) => {
    mainWindow.webContents.send('mods:progress', progress)
  })
})
ipcMain.handle('mods:check', (event, { serverUrl }) => {
  return modSync.checkMods(serverUrl)
})

// ========== 同步状态检查（不下载，仅对比） ==========
ipcMain.handle('sync:check', async (event, { serverUrl }) => {
  try {
    const syncManager = new FileSyncManager('.')
    const url = (serverUrl || 'http://mc.sivita.xyz:5806').replace('://localhost', '://127.0.0.1')
    const config = await syncManager.fetchJSON(`${url}/sync/config`)
    const folders = config.folders || []

    let totalToDownload = 0
    let totalToDelete = 0

    for (const folder of folders) {
      const targetDir = path.join(gameManager.getMinecraftDir(), folder.id)
      const manager = new FileSyncManager(targetDir, config.global_settings)
      const manifest = await manager.fetchJSON(`${url}/sync/${folder.id}/manifest`)
      const diff = await manager.checkDiff(manifest, folder.extensions)
      totalToDownload += diff.toDownload.length
      totalToDelete += diff.toDelete.length
    }

    const needsSync = totalToDownload > 0 || totalToDelete > 0
    return { success: true, needsSync, toDownload: totalToDownload, toDelete: totalToDelete }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// ========== 通用多文件夹同步 ==========
ipcMain.handle('sync:multiFolder', async (event, { serverUrl }) => {
  try {
    // 获取同步配置
    const syncManager = new FileSyncManager('.')
    const config = await syncManager.fetchJSON(`${serverUrl}/sync/config`)

    // 按优先级排序
    const folders = config.folders.sort((a, b) => a.priority - b.priority)

    for (const folder of folders) {
      const targetDir = path.join(gameManager.getMinecraftDir(), folder.id)
      const manager = new FileSyncManager(targetDir, config.global_settings)

      await manager.sync(
        `${serverUrl}/sync/${folder.id}/manifest`,
        folder.extensions,
        (progress) => {
          mainWindow.webContents.send('sync:progress', {
            ...progress,
            folderName: folder.display_name,
            folderId: folder.id
          })
        }
      )
    }

    return { success: true, syncedFolders: folders.length }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// ========== 自动更新 ==========
ipcMain.handle('updater:check', async () => {
  try {
    return await updater.checkForUpdates()
  } catch (error) {
    return { error: error.message }
  }
})

ipcMain.handle('updater:download', async () => {
  try {
    return await updater.downloadUpdate()
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('updater:install', () => {
  updater.quitAndInstall()
  return { success: true }
})

// ========== 环境准备（Java + 游戏文件 + Mods 同步，不启动游戏）==========
ipcMain.handle('game:prepareEnvironment', async (event, { serverUrl }) => {
  const sendProgress = (stage, percent, message) => {
    mainWindow.webContents.send('prepare:progress', { stage, percent, message })
  }
  const sendLog = (msg) => {
    mainWindow.webContents.send('game:log', msg)
  }

  try {
    // ========== 步骤 1: 检测/安装 Java ==========
    sendProgress('java', 0, '正在检测 Java 环境...')
    sendLog('[1/3] 检测 Java 环境')
    let java = await javaManager.detectJava()
    if (!java.found) {
      sendProgress('java', 5, '未找到 Java 17，正在自动安装...')
      sendLog('未找到 Java 17，开始自动安装...')
      java = await javaManager.installJava((p) => {
        sendProgress('java', 5 + p.percent * 0.15, p.message)
      })
      sendLog(`✓ Java ${java.version} 安装完成`)
    } else {
      sendLog(`✓ Java ${java.version} 已就绪`)
    }
    sendProgress('java', 20, `Java ${java.version} 就绪`)

    // ========== 步骤 2: 下载/安装 Minecraft + Forge ==========
    sendProgress('game', 20, '正在准备 Minecraft...')
    sendLog('[2/3] 检查 Minecraft 和 Forge')

    const { MinecraftFolder, Version } = require('@xmcl/core')
    const { installVersion, installForge, getVersionList, installLibraries: installLibs, installAssets: installAsts } = require('@xmcl/installer')
    const minecraftLocation = new MinecraftFolder(gameManager.getMinecraftDir())
    const isGameInstalled = await gameManager.isInstalled()
    const fs = require('fs')

    // ===== 统一重试 + 超时辅助函数 =====
    // 所有网络下载操作都经过此函数，确保：
    // 1. 每次尝试有独立超时（防止 undici 连接挂起）
    // 2. 每次重试创建新的 dispatcher（丢弃旧连接池）
    // 3. 超时后主动关闭旧 dispatcher，防止连接泄漏
    // 4. 错误详细日志
    const withRetry = async (fn, label, { maxRetries = 5, timeoutMs = 180000 } = {}) => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        let dispatcher = null
        try {
          sendLog(`[${label}] 第 ${attempt}/${maxRetries} 次尝试...`)
          const opts = gameManager.createDownloadOptions()
          dispatcher = opts.dispatcher // 保存引用，超时时关闭

          // Promise.race：下载 vs 超时
          const result = await Promise.race([
            fn(opts),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`${label}超时 (${timeoutMs / 1000}s)`)), timeoutMs)
            )
          ])
          sendLog(`✓ ${label}完成`)
          return result
        } catch (err) {
          // 超时或失败时关闭 dispatcher，断开所有连接
          if (dispatcher) {
            try { dispatcher.close() } catch (_) {}
          }
          const errMsg = err.message || String(err)
          const errCount = err.errors ? err.errors.length : 1
          sendLog(`⚠️ ${label}失败 (${errCount} 个错误): ${errMsg}`)
          // 展开 AggregateError 子错误
          if (err.errors) {
            for (const sub of err.errors.slice(0, 5)) {
              sendLog(`  - ${sub.message || sub}${sub.url ? ' URL: ' + sub.url : ''}`)
            }
            if (err.errors.length > 5) sendLog(`  ... 还有 ${err.errors.length - 5} 个错误`)
          }
          if (attempt >= maxRetries) throw err
          const delay = attempt * 3000
          sendLog(`等待 ${delay / 1000} 秒后重试...`)
          await new Promise(r => setTimeout(r, delay))
        }
      }
    }

    if (!isGameInstalled) {
      sendLog('Minecraft/Forge 未安装，开始下载...')
      sendLog('这可能需要几分钟，请耐心等待...')

      // 获取版本列表（使用 BMCLAPI 镜像，官方 launchermeta.mojang.com 在中国被墙）
      sendProgress('game', 22, '正在获取版本列表...')
      const versionList = await withRetry(
        async () => getVersionList({ remote: 'https://bmclapi2.bangbang93.com/mc/game/version_manifest.json' }),
        '版本列表获取',
        { maxRetries: 3, timeoutMs: 30000 }
      )
      const versionMeta = versionList.versions.find(v => v.id === gameManager.MC_VERSION)
      if (!versionMeta) {
        throw new Error(`未找到 Minecraft ${gameManager.MC_VERSION}`)
      }

      sendProgress('game', 25, '正在下载 Minecraft 版本文件...')
      await withRetry(
        (opts) => installVersion(versionMeta, minecraftLocation, { side: 'client', ...opts }),
        'Minecraft 版本文件下载',
        { maxRetries: 5, timeoutMs: 120000 }
      )

      // 下载 MC 基础 libraries（Forge 安装器需要这些）（带重试）
      sendProgress('game', 30, '正在下载 Minecraft 库文件...')
      await withRetry(
        async (opts) => {
          const mcParsed = await Version.parse(minecraftLocation, gameManager.MC_VERSION)
          await installLibs(mcParsed, minecraftLocation, opts)
        },
        'MC 基础库文件下载',
        { maxRetries: 5, timeoutMs: 120000 }
      )
    } else {
      sendLog(`✓ Minecraft 已安装`)
    }

    // 检查 Forge 处理器输出（srg.jar, extra.jar, client.jar）是否存在
    const forgeProcessorOutputs = [
      path.join(gameManager.getMinecraftDir(), 'libraries', 'net', 'minecraft', 'client', '1.20.1-20230612.114412', 'client-1.20.1-20230612.114412-srg.jar'),
      path.join(gameManager.getMinecraftDir(), 'libraries', 'net', 'minecraft', 'client', '1.20.1-20230612.114412', 'client-1.20.1-20230612.114412-extra.jar'),
      path.join(gameManager.getMinecraftDir(), 'libraries', 'net', 'minecraftforge', 'forge', '1.20.1-47.4.16', 'forge-1.20.1-47.4.16-client.jar'),
    ]
    const missingOutputs = forgeProcessorOutputs.filter(p => !fs.existsSync(p))

    if (missingOutputs.length > 0) {
      sendLog(`Forge 处理器输出缺失 (${missingOutputs.length} 个文件)，运行 Forge 安装处理器...`)
      sendProgress('game', 35, '正在运行 Forge 安装处理器...')

      // 清理 libraries 目录下的空文件（0 字节），防止 @xmcl/installer 跳过重新下载
      const libDir = path.join(gameManager.getMinecraftDir(), 'libraries')
      const cleanEmptyFiles = (dir) => {
        if (!fs.existsSync(dir)) return 0
        let cleaned = 0
        const entries = fs.readdirSync(dir, { withFileTypes: true })
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name)
          if (entry.isDirectory()) {
            cleaned += cleanEmptyFiles(fullPath)
          } else if (entry.isFile()) {
            try {
              const stat = fs.statSync(fullPath)
              if (stat.size === 0) {
                fs.unlinkSync(fullPath)
                cleaned++
              }
            } catch (_) {}
          }
        }
        return cleaned
      }

      // 带重试的 Forge 安装
      await withRetry(
        async (opts) => {
          cleanEmptyFiles(libDir)
          await installForge({
            version: gameManager.FORGE_VERSION,
            mcversion: gameManager.MC_VERSION
          }, minecraftLocation, {
            java: java.path,
            inheritsFrom: gameManager.MC_VERSION,
            ...opts
          })
        },
        'Forge 安装',
        { maxRetries: 5, timeoutMs: 300000 }
      )
    } else {
      sendLog(`✓ Forge 已安装且处理器输出完整`)
    }

    // 安装依赖库和资源文件（带重试 + 超时保护）
    {
      const forgeVerId = `${gameManager.MC_VERSION}-forge-${gameManager.FORGE_VERSION}`
      sendProgress('game', 45, '正在检查依赖库...')
      sendLog('检查并下载依赖库和资源文件...')
      const parsedVersion = await Version.parse(minecraftLocation, forgeVerId)

      sendProgress('game', 48, '正在下载库文件...')
      await withRetry(
        (opts) => installLibs(parsedVersion, minecraftLocation, opts),
        '库文件下载',
        { maxRetries: 5, timeoutMs: 120000 }
      )

      sendProgress('game', 52, '正在下载资源文件...')
      await withRetry(
        (opts) => installAsts(parsedVersion, minecraftLocation, opts),
        '资源文件下载',
        { maxRetries: 5, timeoutMs: 300000 }
      )
    }

    // 验证 Forge 安装完整性
    sendProgress('game', 55, '正在验证 Forge 安装...')
    sendLog('验证 Forge 安装完整性...')
    const verification = await gameManager.verifyForgeInstallation()
    if (!verification.valid) {
      sendLog(`❌ Forge 安装验证失败: ${verification.reason}`)
      sendProgress('error', 0, `Forge 安装不完整: ${verification.reason}`)
      return { success: false, error: `Forge 安装不完整: ${verification.reason}` }
    }
    sendLog('✓ Forge 安装验证通过')

    // 首次安装时写入默认选项（中文语言）
    gameManager.ensureDefaultOptions()

    sendProgress('game', 60, 'Minecraft + Forge 准备完成')

    // ========== 步骤 3: 同步所有文件夹（Mods、Config 等）==========
    sendProgress('sync', 60, '正在同步游戏文件...')
    sendLog('[3/3] 同步服务器文件')
    const url = (serverUrl || 'http://mc.sivita.xyz:5806').replace('://localhost', '://127.0.0.1')
    sendLog(`同步地址: ${url}`)
    const syncManager = new FileSyncManager('.')
    const config = await syncManager.fetchJSON(`${url}/sync/config`)
    const folders = config.folders.sort((a, b) => a.priority - b.priority)

    for (const folder of folders) {
      sendLog(`正在同步: ${folder.display_name}...`)
      const targetDir = path.join(gameManager.getMinecraftDir(), folder.id)
      const manager = new FileSyncManager(targetDir, config.global_settings)

      await manager.sync(
        `${url}/sync/${folder.id}/manifest`,
        folder.extensions,
        (p) => {
          sendProgress('sync', 60 + p.percent * 0.4, `${folder.display_name}: ${p.message}`)
        }
      )
      sendLog(`✓ ${folder.display_name} 同步完成`)
    }

    sendProgress('done', 100, '✓ 所有环境准备完成！')
    sendLog('========================================')
    sendLog('✓ 环境准备完成，可以启动游戏')
    sendLog('========================================')
    return { success: true, java }
  } catch (error) {
    const msg = error.message || String(error)
    sendLog(`❌ 环境准备失败: ${msg}`)
    if (error.stack) sendLog(`堆栈: ${error.stack.split('\n').slice(0, 3).join(' | ')}`)
    sendProgress('error', 0, `环境准备失败: ${msg}`)
    return { success: false, error: msg }
  }
})

// ========== 启动游戏（环境已准备好，仅启动，不重新安装） ==========
ipcMain.handle('game:launch', async (event, { username, token, serverIp }) => {
  const sendProgress = (stage, percent, message) => {
    mainWindow.webContents.send('launch:progress', { stage, percent, message })
  }
  const sendLog = (msg) => {
    mainWindow.webContents.send('game:log', msg)
  }

  try {
    // 获取 Java 路径（prepareEnvironment 已确保安装）
    const java = await javaManager.detectJava()
    if (!java.found) {
      throw new Error('Java 环境未就绪，请先准备环境')
    }

    sendProgress('launch', 30, '正在生成启动令牌...')

    // 创建一次性 launch token（防止非官方启动器进服）
    let launchToken = null
    try {
      const axios = require('axios')
      const res = await axios.post(`${SERVER_URL}/auth/create-launch-token`, {
        username, token
      }, { timeout: 10000 })
      launchToken = res.data.launch_token
      sendLog('✓ 启动令牌已生成')
    } catch (err) {
      sendLog(`⚠️ 启动令牌生成失败: ${err.response?.data?.detail || err.message}`)
      // 不阻止启动，服务端 mod 会根据配置决定是否放行
    }

    sendProgress('launch', 50, '正在启动游戏...')
    sendLog('正在启动 Minecraft...')

    // 仅启动，不重新安装/检查
    const result = await gameManager.launchOnly(
      username, token, serverIp, java.path,
      (log) => sendLog(log),
      launchToken
    )

    sendProgress('done', 100, '游戏已启动！')
    return { success: true, pid: result.pid }
  } catch (error) {
    sendLog(`启动失败: ${error.message}`)
    sendProgress('error', 0, `启动失败: ${error.message}`)
    return { success: false, error: error.message }
  }
})
