const path = require('path')
const fs = require('fs')
const os = require('os')
const { MinecraftFolder, Version, generateArguments } = require('@xmcl/core')
const { installTask, installForge, installLibraries, installAssets, diagnoseInstall, getVersionList } = require('@xmcl/installer')
const { spawn } = require('child_process')

// ✅ Electron 28 内置 Node.js 18，没有全局 File 类，undici 7.x 需要它
if (typeof globalThis.File === 'undefined') {
  const { Blob } = require('buffer')
  globalThis.File = class File extends Blob {
    #name
    #lastModified
    constructor(bits, name, options = {}) {
      super(bits, options)
      this.#name = name
      this.#lastModified = options.lastModified || Date.now()
    }
    get name() { return this.#name }
    get lastModified() { return this.#lastModified }
  }
}

const { Agent, interceptors } = require('undici')

// ✅ 解决Node.js 20+的超时问题
// 增加网络自动选择超时时间（Happy Eyeballs问题）
process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS || '') + ' --network-family-autoselection-attempt-timeout=2000'

// 默认 .minecraft 路径
const MINECRAFT_DIR = path.join(os.homedir(), '.cuberecall', 'minecraft')

// 目标版本
const MC_VERSION = '1.20.1'
const FORGE_VERSION = '47.4.16'

// 🇨🇳 中国镜像源配置（多源冗余，按优先级排序）
// 不使用任何国外官方源（maven.minecraftforge.net / libraries.minecraft.net），在中国会被墙
// SJTUG / LZU 的 maven 路径返回 404，已移除，只保留实测可用的源
// 1. BMCLAPI - 国内最大的 MC 公益镜像（bangbang93 维护）
// 2. OSS - 自建雨云 S3 备用（最终兜底）
const MIRROR_SOURCES = [
  { name: 'BMCLAPI', maven: 'https://bmclapi2.bangbang93.com/maven', assets: 'https://bmclapi2.bangbang93.com/assets' },
  { name: 'OSS',    maven: 'https://cube.cn-nb1.rains3.com/maven', assets: 'https://cube.cn-nb1.rains3.com/assets' },
]

// ✅ 创建带超时的 undici dispatcher（@xmcl/file-transfer 内部使用 undici，不使用 Node.js http Agent）
function createUndiciDispatcher() {
  return new Agent({
    connections: 32,            // 每个 origin 的最大连接数
    connectTimeout: 15000,      // TCP 连接超时 15s
    headersTimeout: 30000,      // 等待响应头超时 30s
    bodyTimeout: 60000,         // 响应体读取超时 60s（单个 chunk 间隔）
    keepAliveTimeout: 15000,    // keep-alive 空闲超时 15s
    keepAliveMaxTimeout: 30000, // keep-alive 最大超时 30s
    pipelining: 1,              // 禁用 pipelining，每个连接一个请求
  }).compose(
    interceptors.retry({
      maxRetries: 3,
      minTimeout: 1000,
      maxTimeout: 10000,
      timeoutFactor: 2,
      errorCodes: ['ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'ENETDOWN', 'ENETUNREACH', 'EHOSTDOWN', 'EHOSTUNREACH', 'EPIPE', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT', 'UND_ERR_SOCKET'],
    }),
    interceptors.redirect({ maxRedirections: 5 })
  )
}

// ✅ 创建下载选项（多源冗余 + undici dispatcher 超时控制）
function createDownloadOptions() {
  // 所有 Maven 源 URL 列表
  const mavenHosts = MIRROR_SOURCES.filter(s => s.maven).map(s => s.maven)
  // 所有 Assets 源 URL 列表
  const assetsHosts = MIRROR_SOURCES.filter(s => s.assets).map(s => s.assets)

  return {
    // Maven 仓库镜像（多源 fallback）
    mavenHost: mavenHosts,
    // 资源文件镜像（多源 fallback，官方源会自动加到末尾）
    assetsHost: assetsHosts,
    // 库文件镜像函数（返回完整 URL 数组，单文件级多源 fallback）
    libraryHost(library) {
      return mavenHosts.map(host => `${host}/${library.path}`)
    },
    // undici dispatcher：带连接/头/体超时 + 自动重试
    dispatcher: createUndiciDispatcher(),
    // 并发数：镜像站 QPS 有限，设为 10 避免触发限流
    assetsDownloadConcurrency: 10,
    librariesDownloadConcurrency: 10,
  }
}

function getMinecraftDir() {
  fs.mkdirSync(MINECRAFT_DIR, { recursive: true })
  return MINECRAFT_DIR
}

/**
 * 检查游戏是否已安装（检查 versions 目录下是否有对应版本）
 */
function isInstalled() {
  const versionsDir = path.join(MINECRAFT_DIR, 'versions')
  if (!fs.existsSync(versionsDir)) return false
  const dirs = fs.readdirSync(versionsDir)
  // 查找包含 forge 的版本目录
  return dirs.some(d => d.includes('forge') && d.includes(MC_VERSION))
}

/**
 * 获取已安装的 Forge 版本 ID
 */
function getInstalledForgeVersion() {
  const versionsDir = path.join(MINECRAFT_DIR, 'versions')
  if (!fs.existsSync(versionsDir)) return null
  const dirs = fs.readdirSync(versionsDir)
  const forgeDir = dirs.find(d => d.includes('forge') && d.includes(MC_VERSION))
  return forgeDir || null
}

/**
 * 安装并启动 Minecraft + Forge
 * 使用 @xmcl/installer 和 @xmcl/client
 */
async function installAndLaunch(username, token, serverIp, javaPath, onProgress, onLog) {
  try {
    fs.mkdirSync(MINECRAFT_DIR, { recursive: true })

    const minecraftLocation = new MinecraftFolder(MINECRAFT_DIR)

    onLog(`=== 方块回召启动器 ===`)
    onLog(`Minecraft版本: ${MC_VERSION}`)
    onLog(`Forge版本: ${FORGE_VERSION}`)
    onLog(`Java路径: ${javaPath}`)
    onLog(`Minecraft目录: ${MINECRAFT_DIR}`)
    onLog(`镜像源: ${MIRROR_SOURCES.map(s => s.name).join(' → ')}`)
    onLog(`服务器: ${serverIp || '无'}`)
    onLog(``)

    // ============ 步骤1: 检查并安装 Vanilla Minecraft ============
    onProgress({ stage: 'download', percent: 0, message: '正在检查 Minecraft 1.20.1...' })
    onLog(`[1/4] 检查 Minecraft ${MC_VERSION}`)

    const vanillaVersionPath = minecraftLocation.getVersionJson(MC_VERSION)
    let needInstallVanilla = false

    if (!fs.existsSync(vanillaVersionPath)) {
      needInstallVanilla = true
      onLog(`Minecraft ${MC_VERSION} 未安装，准备下载...`)
    } else {
      // 诊断是否缺少文件
      try {
        const version = await Version.parse(minecraftLocation, MC_VERSION)
        const issues = await diagnoseInstall(version, minecraftLocation)
        if (issues.length > 0) {
          needInstallVanilla = true
          onLog(`检测到 ${issues.length} 个缺失文件，需要重新下载`)
        } else {
          onLog(`✓ Minecraft ${MC_VERSION} 已安装`)
        }
      } catch (e) {
        needInstallVanilla = true
        onLog(`版本文件损坏: ${e.message}`)
      }
    }

    if (needInstallVanilla) {
      onProgress({ stage: 'download', percent: 10, message: `下载 Minecraft ${MC_VERSION}...` })
      onLog(`开始下载 Minecraft ${MC_VERSION}...`)

      // 获取版本列表并找到目标版本
      onLog(`正在获取版本信息...`)
      const versionList = await getVersionList({ remote: 'https://bmclapi2.bangbang93.com/mc/game/version_manifest.json' })
      const versionMeta = versionList.versions.find(v => v.id === MC_VERSION)

      if (!versionMeta) {
        throw new Error(`未找到 Minecraft ${MC_VERSION} 版本`)
      }

      onLog(`找到版本: ${versionMeta.id} (类型: ${versionMeta.type})`)

      // 下载 vanilla（使用中国镜像 + 重试机制）
      const downloadOpts = createDownloadOptions()
      let retryCount = 0
      const maxRetries = 3
      let success = false

      while (!success && retryCount < maxRetries) {
        try {
          if (retryCount > 0) {
            onLog(`⚠️ 第 ${retryCount} 次重试下载...`)
          }

          const task = installTask(versionMeta, minecraftLocation, {
            side: 'client',
            ...downloadOpts
          })

          let lastPercent = 10
          let lastLogTime = 0
          const failedTasks = []

          await task.startAndWait({
            onUpdate(task, chunkSize) {
              if (task.total > 0) {
                const percent = Math.round((task.progress / task.total) * 30) + 10
                if (percent > lastPercent) {
                  lastPercent = percent
                  onProgress({ stage: 'download', percent, message: `下载中: ${task.progress}/${task.total}` })
                  onLog(`下载进度: ${percent}% (${task.progress}/${task.total})`)
                }
                // 每10秒输出一次详细进度
                const now = Date.now()
                if (now - lastLogTime > 10000) {
                  lastLogTime = now
                  onLog(`  -> 正在下载: ${task.path || task.name}`)
                }
              }
            },
            onFailed(task, error) {
              failedTasks.push({ task: task.name, error: error.message })
              onLog(`⚠️ 下载失败: ${task.name} - ${error.message || '未知错误'}`)
            }
          })

          if (failedTasks.length > 0) {
            throw new Error(`${failedTasks.length} 个文件下载失败`)
          }

          success = true
          onLog(`✓ Minecraft ${MC_VERSION} 下载完成`)
        } catch (error) {
          retryCount++
          if (retryCount >= maxRetries) {
            onLog(`❌ 下载失败，已重试 ${maxRetries} 次`)
            throw error
          }
          onLog(`等待 3 秒后重试...`)
          await new Promise(resolve => setTimeout(resolve, 3000))
        }
      }
    }

    // ============ 步骤2: 检查并安装 Forge ============
    onProgress({ stage: 'download', percent: 40, message: `检查 Forge ${FORGE_VERSION}...` })
    onLog(`[2/4] 检查 Forge ${FORGE_VERSION}`)

    const forgeVersionId = `${MC_VERSION}-forge-${FORGE_VERSION}`
    const forgeVersionPath = minecraftLocation.getVersionJson(forgeVersionId)
    let needInstallForge = false

    if (!fs.existsSync(forgeVersionPath)) {
      needInstallForge = true
      onLog(`Forge ${FORGE_VERSION} 未安装，准备下载...`)
    } else {
      try {
        const version = await Version.parse(minecraftLocation, forgeVersionId)
        const issues = await diagnoseInstall(version, minecraftLocation)
        if (issues.length > 0) {
          needInstallForge = true
          onLog(`检测到 ${issues.length} 个缺失文件，需要重新下载`)
        } else {
          onLog(`✓ Forge ${FORGE_VERSION} 已安装`)
        }
      } catch (e) {
        needInstallForge = true
        onLog(`Forge版本文件损坏: ${e.message}`)
      }
    }

    if (needInstallForge) {
      onProgress({ stage: 'download', percent: 50, message: `安装 Forge ${FORGE_VERSION}...` })
      onLog(`开始安装 Forge ${FORGE_VERSION}...`)
      onLog(`这可能需要几分钟，请耐心等待...`)

      // 安装 Forge（使用中国镜像 + 重试机制）
      const downloadOpts = createDownloadOptions()
      let retryCount = 0
      const maxRetries = 3
      let success = false

      // 清理 libraries 目录下的空文件（0 字节），防止 @xmcl/installer 跳过重新下载
      const libDir = path.join(MINECRAFT_DIR, 'libraries')
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
                onLog(`  清理空文件: ${fullPath}`)
                cleaned++
              }
            } catch (_) {}
          }
        }
        return cleaned
      }

      while (!success && retryCount < maxRetries) {
        try {
          if (retryCount > 0) {
            onLog(`⚠️ 第 ${retryCount} 次重试安装 Forge...`)
          }

          // 每次尝试前清理空文件
          const cleaned = cleanEmptyFiles(libDir)
          if (cleaned > 0) {
            onLog(`已清理 ${cleaned} 个损坏的空文件`)
          }

          await installForge({
            version: FORGE_VERSION,
            mcversion: MC_VERSION
          }, minecraftLocation, {
            java: javaPath,
            inheritsFrom: MC_VERSION,
            ...downloadOpts
          })

          success = true
          onLog(`✓ Forge ${FORGE_VERSION} 安装完成`)
        } catch (error) {
          retryCount++
          onLog(`⚠️ Forge 安装失败: ${error.message}`)
          if (retryCount >= maxRetries) {
            onLog(`❌ Forge 安装失败，已重试 ${maxRetries} 次`)
            throw error
          }
          onLog(`等待 5 秒后重试...`)
          await new Promise(resolve => setTimeout(resolve, 5000))
        }
      }
    }

    // ============ 步骤3: 检查并安装依赖库 ============
    onProgress({ stage: 'download', percent: 70, message: '检查依赖库...' })
    onLog(`[3/4] 检查依赖库和资源文件`)

    const version = await Version.parse(minecraftLocation, forgeVersionId)
    const issues = await diagnoseInstall(version, minecraftLocation)

    if (issues.length > 0) {
      onLog(`发现 ${issues.length} 个缺失文件，正在下载...`)

      // 使用中国镜像下载缺失的库和资源（带重试）
      const downloadOpts = createDownloadOptions()

      // 分别安装缺失的库和资源
      const libraryIssues = issues.filter(i => i.type === 'library')
      const assetIssues = issues.filter(i => i.type === 'asset')

      // 下载库文件（带重试）
      if (libraryIssues.length > 0) {
        onLog(`下载 ${libraryIssues.length} 个库文件...`)
        let retryCount = 0
        const maxRetries = 3
        let success = false

        while (!success && retryCount < maxRetries) {
          try {
            if (retryCount > 0) {
              onLog(`⚠️ 第 ${retryCount} 次重试下载库文件...`)
            }
            await installLibraries(version, minecraftLocation, downloadOpts)
            success = true
          } catch (error) {
            retryCount++
            onLog(`⚠️ 库文件下载失败: ${error.message}`)
            if (retryCount >= maxRetries) {
              throw error
            }
            await new Promise(resolve => setTimeout(resolve, 3000))
          }
        }
      }

      // 下载资源文件（带重试）
      if (assetIssues.length > 0) {
        onLog(`下载 ${assetIssues.length} 个资源文件...`)
        let retryCount = 0
        const maxRetries = 3
        let success = false

        while (!success && retryCount < maxRetries) {
          try {
            if (retryCount > 0) {
              onLog(`⚠️ 第 ${retryCount} 次重试下载资源文件...`)
            }
            await installAssets(version, minecraftLocation, downloadOpts)
            success = true
          } catch (error) {
            retryCount++
            onLog(`⚠️ 资源文件下载失败: ${error.message}`)
            if (retryCount >= maxRetries) {
              throw error
            }
            await new Promise(resolve => setTimeout(resolve, 3000))
          }
        }
      }

      onProgress({ stage: 'download', percent: 85, message: '依赖库下载完成' })
      onLog(`✓ 依赖库下载完成`)
    } else {
      onLog(`✓ 所有依赖库已就绪`)
    }

    // ============ 步骤4: 启动游戏 ============
    onProgress({ stage: 'launch', percent: 90, message: '正在启动游戏...' })
    onLog(`[4/4] 启动 Minecraft`)

    // 生成启动参数（不传 yggdrasilAgent，离线模式不需要）
    const args = await generateArguments({
      gamePath: MINECRAFT_DIR,
      resourcePath: MINECRAFT_DIR,
      version: version.id,
      gameProfile: {
        name: username,
        id: generateOfflineUUID(username)
      },
      accessToken: token || 'offline',
      properties: {},
      launcherBrand: 'CubeRecall',
      launcherVersion: '1.0.0',
      javaPath: javaPath,
      minMemory: 2048,
      maxMemory: 4096,
      extraJvmArgs: [
        '-Dfile.encoding=UTF-8',
        '-Dsun.stdout.encoding=UTF-8',
        '-Dsun.stderr.encoding=UTF-8',
        '-Djava.net.preferIPv4Stack=true',
      ],
      extraMcArgs: []
    })

    // generateArguments 返回的第一个元素是 javaPath，需要分离
    const execPath = args[0]
    const execArgs = args.slice(1)

    // 添加服务器连接参数（Forge 1.20+ 使用 --quickPlayMultiplayer）
    if (serverIp) {
      execArgs.push('--quickPlayMultiplayer', serverIp)
      onLog(`自动连接服务器: ${serverIp}`)
    }

    onLog(`启动命令: ${execPath}`)
    onLog(`JVM参数数量: ${execArgs.filter(a => a.startsWith('-')).length}`)
    onLog(`游戏参数数量: ${execArgs.filter(a => !a.startsWith('-')).length}`)

    // 初始化日志文件
    const logFile = createGameLogFile()

    // 启动游戏进程
    const gameProcess = spawn(execPath, execArgs, {
      cwd: MINECRAFT_DIR,
      detached: false
    })

    onLog(`✓ 游戏进程已启动 (PID: ${gameProcess.pid})`)
    onProgress({ stage: 'done', percent: 100, message: '游戏已启动！' })

    // 监听游戏输出（带解析、过滤、写文件）
    setupGameLogHandlers(gameProcess, onLog, logFile)

    return { success: true, process: gameProcess }

  } catch (error) {
    onLog(`启动失败: ${error.message}`)
    if (error.stack) {
      onLog(`错误堆栈: ${error.stack}`)
    }
    throw error
  }
}

/**
 * 仅启动游戏（不执行任何安装/检查步骤）
 * 前提：prepareEnvironment 已确保 Java、Minecraft、Forge、库文件、资源文件全部就绪
 */
async function launchOnly(username, token, serverIp, javaPath, onLog, launchToken) {
  const minecraftLocation = new MinecraftFolder(MINECRAFT_DIR)
  const forgeVersionId = `${MC_VERSION}-forge-${FORGE_VERSION}`

  onLog(`=== 方块回召启动器 ===`)
  onLog(`用户: ${username}`)
  onLog(`服务器: ${serverIp || '无'}`)
  onLog(`Java: ${javaPath}`)

  // 解析已安装的版本
  const version = await Version.parse(minecraftLocation, forgeVersionId)

  // 构建额外 JVM 参数
  const extraJvmArgs = [
    '-Dfile.encoding=UTF-8',
    '-Dsun.stdout.encoding=UTF-8',
    '-Dsun.stderr.encoding=UTF-8',
    '-Djava.net.preferIPv4Stack=true',
  ]
  // 注入一次性启动令牌（auth mod 客户端侧读取并发送给服务端验证）
  if (launchToken) {
    extraJvmArgs.push(`-Dcuberecall.launchToken=${launchToken}`)
    onLog('启动令牌已注入')
  }

  // 生成启动参数
  const args = await generateArguments({
    gamePath: MINECRAFT_DIR,
    resourcePath: MINECRAFT_DIR,
    version: version.id,
    gameProfile: {
      name: username,
      id: generateOfflineUUID(username)
    },
    accessToken: token || 'offline',
    properties: {},
    launcherBrand: 'CubeRecall',
    launcherVersion: '1.0.0',
    javaPath: javaPath,
    minMemory: 2048,
    maxMemory: 4096,
    extraJvmArgs,
    extraMcArgs: []
  })

  // generateArguments 返回的第一个元素是 javaPath，需要分离
  const execPath = args[0]
  const execArgs = args.slice(1)

  // 添加服务器连接参数（Forge 1.20+ 使用 --quickPlayMultiplayer）
  if (serverIp) {
    execArgs.push('--quickPlayMultiplayer', serverIp)
    onLog(`自动连接服务器: ${serverIp}`)
  }

  onLog(`启动命令: ${execPath}`)
  onLog(`JVM参数数量: ${execArgs.filter(a => a.startsWith('-')).length}`)
  onLog(`游戏参数数量: ${execArgs.filter(a => !a.startsWith('-')).length}`)

  // 初始化日志文件
  const logFile = createGameLogFile()

  // 启动游戏进程
  const gameProcess = spawn(execPath, execArgs, {
    cwd: MINECRAFT_DIR,
    detached: false
  })

  onLog(`✓ 游戏进程已启动 (PID: ${gameProcess.pid})`)

  // 监听游戏输出（带解析、过滤、写文件）
  setupGameLogHandlers(gameProcess, onLog, logFile)

  return { success: true, pid: gameProcess.pid }
}

/**
 * 根据用户名生成离线模式 UUID
 */
function generateOfflineUUID(username) {
  const crypto = require('crypto')
  const hash = crypto.createHash('md5').update(`OfflinePlayer:${username}`).digest('hex')
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '3' + hash.substring(13, 16),
    ((parseInt(hash.substring(16, 18), 16) & 0x3f) | 0x80).toString(16) + hash.substring(18, 20),
    hash.substring(20, 32),
  ].join('-')
}

/**
 * 验证 Forge 安装完整性
 * 检查版本 JSON 可解析 + 关键库文件存在
 * 返回 { valid: true } 或 { valid: false, reason: string }
 */
async function verifyForgeInstallation() {
  const minecraftLocation = new MinecraftFolder(MINECRAFT_DIR)
  const forgeVersionId = `${MC_VERSION}-forge-${FORGE_VERSION}`
  const forgeVersionPath = minecraftLocation.getVersionJson(forgeVersionId)

  // 1. 检查版本 JSON 是否存在
  if (!fs.existsSync(forgeVersionPath)) {
    return { valid: false, reason: 'Forge 版本 JSON 不存在' }
  }

  try {
    // 2. 检查版本 JSON 可以被解析（inheritsFrom 链完整）
    const version = await Version.parse(minecraftLocation, forgeVersionId)

    // 3. 检查关键库文件是否存在
    let missingLibs = 0
    for (const lib of version.libraries) {
      if (lib.download && lib.download.path) {
        const libPath = path.join(MINECRAFT_DIR, 'libraries', lib.download.path)
        if (!fs.existsSync(libPath)) {
          missingLibs++
        }
      }
    }

    if (missingLibs > 0) {
      return { valid: false, reason: `缺失 ${missingLibs} 个库文件` }
    }

    // 4. 检查主客户端 jar 是否存在
    const clientJar = path.join(MINECRAFT_DIR, 'versions', MC_VERSION, `${MC_VERSION}.jar`)
    if (!fs.existsSync(clientJar)) {
      return { valid: false, reason: 'Minecraft 客户端 jar 不存在' }
    }

    return { valid: true }
  } catch (e) {
    return { valid: false, reason: `版本解析失败: ${e.message}` }
  }
}

/**
 * 首次启动时确保 options.txt 中语言设为中文
 * 使用标记文件避免重复覆盖用户自定义设置
 */
function ensureDefaultOptions() {
  const markerPath = path.join(MINECRAFT_DIR, '.cuberecall-lang-initialized')
  if (fs.existsSync(markerPath)) return // 已初始化过，不再修改

  const optionsPath = path.join(MINECRAFT_DIR, 'options.txt')

  if (fs.existsSync(optionsPath)) {
    // options.txt 已存在，修改语言行
    let content = fs.readFileSync(optionsPath, 'utf-8')
    if (content.includes('lang:')) {
      content = content.replace(/lang:\S+/, 'lang:zh_cn')
    } else {
      content = 'lang:zh_cn\n' + content
    }
    fs.writeFileSync(optionsPath, content, 'utf-8')
  } else {
    // options.txt 不存在，创建
    fs.writeFileSync(optionsPath, 'lang:zh_cn\n', 'utf-8')
  }

  // 写入标记文件
  fs.writeFileSync(markerPath, new Date().toISOString(), 'utf-8')
}

// ========== 游戏日志处理 ==========

const GAME_LOG_DIR = path.join(MINECRAFT_DIR, 'launcher-logs')

/**
 * 创建游戏日志文件，返回写入流
 */
function createGameLogFile() {
  try {
    fs.mkdirSync(GAME_LOG_DIR, { recursive: true })
    const now = new Date()
    const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const logPath = path.join(GAME_LOG_DIR, `game-${ts}.log`)
    const stream = fs.createWriteStream(logPath, { encoding: 'utf-8' })
    // 清理旧日志（保留最近 10 个）
    try {
      const files = fs.readdirSync(GAME_LOG_DIR)
        .filter(f => f.startsWith('game-') && f.endsWith('.log'))
        .sort()
      if (files.length > 10) {
        for (const old of files.slice(0, files.length - 10)) {
          fs.unlinkSync(path.join(GAME_LOG_DIR, old))
        }
      }
    } catch (_) {}
    return stream
  } catch (_) {
    return null
  }
}

/**
 * Minecraft 日志格式解析
 * 格式: [HH:MM:SS] [Thread/LEVEL] [Source/Category]: Message
 * 返回 { level: 'INFO'|'WARN'|'ERROR'|'DEBUG'|'FATAL', source: string, message: string }
 */
const MC_LOG_RE = /^\[[\d:]+\]\s+\[([^\]]+)\/(INFO|WARN|ERROR|DEBUG|FATAL)\]\s+\[([^\]]*)\]:\s*(.*)$/
function parseMinecraftLog(line) {
  const m = line.match(MC_LOG_RE)
  if (!m) return null
  return { thread: m[1], level: m[2], source: m[3], message: m[4] }
}

/**
 * 噪音过滤：返回 true 表示应该隐藏该行（仅对 INFO 级别生效）
 */
const NOISE_PATTERNS = [
  /\[jei\//i,
  /\[mezz\.jei/i,
  /TextureAtlas/i,
  /Stitching:/,
  /Created:\s+\d+x\d+/,
  /Moonlight/i,
  /\[moonlight/i,
  /Registering\s+\d+\s+/,
  /Loading\s+\d+\s+recipe/i,
  /Reloading ResourceManager/,
  /SoundEngine/i,
  /\[FML\].*Loading/,
  /\[mixin\]/i,
  /\[OptiFine\]/i,
  /\[Render thread\/INFO\].*Loaded\s+\d+/,
  /\[Worker-/,
  /\[pool-/,
  /Applying\s+mixin/i,
  /Injecting\s+/i,
  /\[net\.minecraft\.client\.resources/,
  /\[net\.minecraft\.server\.packs/,
  /\[cpw\.mods\.modlauncher/,
]

function isNoisyLine(parsed) {
  if (!parsed || parsed.level !== 'INFO') return false
  const full = `[${parsed.source}]: ${parsed.message}`
  return NOISE_PATTERNS.some(re => re.test(full))
}

/**
 * 设置游戏进程的日志监听（解析、过滤、写文件、发送到前端）
 */
function setupGameLogHandlers(gameProcess, onLog, logFile) {
  // 处理 stdout/stderr 的 Buffer，用 UTF-8 解码
  // 需要处理跨 chunk 的不完整行
  function createLineHandler(isStderr) {
    let buffer = ''
    return (data) => {
      buffer += data.toString('utf-8')
      const lines = buffer.split('\n')
      // 最后一个元素可能是不完整的行，保留到下次
      buffer = lines.pop() || ''

      for (const rawLine of lines) {
        const line = rawLine.replace(/\r$/, '').trim()
        if (!line) continue

        // 写入日志文件（不过滤）
        if (logFile) {
          logFile.write(line + '\n')
        }

        // 解析日志级别
        const parsed = parseMinecraftLog(line)

        // 过滤噪音（仅 INFO）
        if (isNoisyLine(parsed)) continue

        // 构造发送给前端的结构化数据
        const level = parsed ? parsed.level : (isStderr ? 'WARN' : 'INFO')
        onLog({ level, text: line })
      }
    }
  }

  gameProcess.stdout.on('data', createLineHandler(false))
  gameProcess.stderr.on('data', createLineHandler(true))

  gameProcess.on('close', (code) => {
    if (logFile) logFile.end()
    onLog({ level: code === 0 ? 'INFO' : 'WARN', text: `游戏进程退出，退出码: ${code}` })
  })

  gameProcess.on('error', (err) => {
    if (logFile) logFile.end()
    onLog({ level: 'ERROR', text: `游戏进程错误: ${err.message}` })
  })
}

module.exports = {
  getMinecraftDir,
  isInstalled,
  getInstalledForgeVersion,
  installAndLaunch,
  launchOnly,
  createDownloadOptions,
  verifyForgeInstallation,
  ensureDefaultOptions,
  MC_VERSION,
  FORGE_VERSION,
}
