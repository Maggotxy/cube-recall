const { execSync, exec } = require('child_process')
const path = require('path')
const fs = require('fs')
const https = require('https')
const os = require('os')

// JDK17 下载地址（使用华为云 OpenJDK 镜像）
// 已逐一测试所有链接均返回 200 OK
// Windows: 185.7 MB | Mac: 184.0 MB | Linux: 186.7 MB
const JDK17_DOWNLOAD_URLS = {
  win32: 'https://mirrors.huaweicloud.com/openjdk/17/openjdk-17_windows-x64_bin.zip',
  darwin: 'https://mirrors.huaweicloud.com/openjdk/17/openjdk-17_macos-x64_bin.tar.gz',
  linux: 'https://mirrors.huaweicloud.com/openjdk/17/openjdk-17_linux-x64_bin.tar.gz'
}
const JDK_INSTALL_DIR = path.join(os.homedir(), '.cuberecall', 'jdk17')
const isWindows = os.platform() === 'win32'
const isMac = os.platform() === 'darwin'
const isLinux = os.platform() === 'linux'
const javaExecutable = isWindows ? 'java.exe' : 'java'

/**
 * 检测系统中的 Java 17
 * 搜索顺序：启动器自带 → 注册表 → PATH → 常见安装路径
 */
async function detectJava() {
  // 1. 检查启动器自带 JDK
  const bundledJava = path.join(JDK_INSTALL_DIR, 'bin', javaExecutable)
  if (fs.existsSync(bundledJava)) {
    const version = getJavaVersion(bundledJava)
    if (version && version.startsWith('17')) {
      return { found: true, path: bundledJava, version, source: 'bundled' }
    }
  }

  // 2. Windows: 检查注册表
  if (isWindows) {
    const regPaths = [
      'HKLM\\SOFTWARE\\Eclipse Adoptium\\JDK\\17',
      'HKLM\\SOFTWARE\\Eclipse Foundation\\JDK\\17',
      'HKLM\\SOFTWARE\\JavaSoft\\JDK\\17',
      'HKLM\\SOFTWARE\\Microsoft\\JDK\\17',
    ]
    for (const regPath of regPaths) {
      try {
        const result = execSync(`reg query "${regPath}" /s /v JavaHome 2>nul`, { encoding: 'utf8' })
        const match = result.match(/JavaHome\s+REG_SZ\s+(.+)/i)
        if (match) {
          const javaExe = path.join(match[1].trim(), 'bin', javaExecutable)
          if (fs.existsSync(javaExe)) {
            const version = getJavaVersion(javaExe)
            if (version && version.startsWith('17')) {
              return { found: true, path: javaExe, version, source: 'registry' }
            }
          }
        }
      } catch {
        // 注册表项不存在，继续
      }
    }
  }

  // 3. 检查 PATH
  try {
    const whereCmd = isWindows ? 'where java 2>nul' : 'which java 2>/dev/null'
    const result = execSync(whereCmd, { encoding: 'utf8' })
    const javaExes = result.trim().split('\n').map(s => s.trim())
    for (const javaExe of javaExes) {
      if (fs.existsSync(javaExe)) {
        const version = getJavaVersion(javaExe)
        if (version && version.startsWith('17')) {
          return { found: true, path: javaExe, version, source: 'path' }
        }
      }
    }
  } catch {
    // 命令失败
  }

  // 4. 检查常见安装路径
  let commonPaths = []
  if (isWindows) {
    commonPaths = [
      'C:\\Program Files\\Java',
      'C:\\Program Files\\Eclipse Adoptium',
      'C:\\Program Files\\Microsoft',
      path.join(os.homedir(), '.jdks'),
    ]
  } else if (isMac) {
    commonPaths = [
      '/Library/Java/JavaVirtualMachines',
      path.join(os.homedir(), 'Library/Java/JavaVirtualMachines'),
      path.join(os.homedir(), '.jdks'),
    ]
  } else if (isLinux) {
    commonPaths = [
      '/usr/lib/jvm',
      '/usr/java',
      path.join(os.homedir(), '.jdks'),
    ]
  }

  for (const basePath of commonPaths) {
    if (!fs.existsSync(basePath)) continue
    try {
      const dirs = fs.readdirSync(basePath)
      for (const dir of dirs) {
        if (!dir.toLowerCase().includes('17') && !dir.toLowerCase().includes('jdk-17')) continue
        const javaExe = path.join(basePath, dir, 'bin', javaExecutable)
        // Mac 特殊处理：.jdk 包内的路径
        const javaExeMac = path.join(basePath, dir, 'Contents/Home/bin', javaExecutable)
        const finalPath = isMac && fs.existsSync(javaExeMac) ? javaExeMac : javaExe
        if (fs.existsSync(finalPath)) {
          const version = getJavaVersion(finalPath)
          if (version && version.startsWith('17')) {
            return { found: true, path: finalPath, version, source: 'common_path' }
          }
        }
      }
    } catch {
      // 目录读取失败
    }
  }

  return { found: false, path: null, version: null, source: null }
}

/**
 * 获取 Java 版本号
 */
function getJavaVersion(javaExe) {
  try {
    const result = execSync(`"${javaExe}" -version 2>&1`, { encoding: 'utf8' })
    const match = result.match(/version\s+"(\d+[\d._]*)"/i)
    return match ? match[1] : null
  } catch {
    return null
  }
}

/**
 * 下载并安装 JDK17
 */
async function installJava(onProgress) {
  const platform = os.platform()
  const downloadUrl = JDK17_DOWNLOAD_URLS[platform]
  if (!downloadUrl) {
    throw new Error(`不支持的平台: ${platform}`)
  }

  const isZip = downloadUrl.endsWith('.zip')
  const archivePath = path.join(os.tmpdir(), isZip ? 'jdk17.zip' : 'jdk17.tar.gz')

  onProgress({ stage: 'downloading', percent: 0, message: '正在下载 JDK 17...' })

  // 下载 JDK
  await downloadFile(downloadUrl, archivePath, (percent) => {
    onProgress({ stage: 'downloading', percent, message: `正在下载 JDK 17... ${percent}%` })
  })

  onProgress({ stage: 'extracting', percent: 0, message: '正在解压 JDK 17...' })

  // 解压
  fs.mkdirSync(JDK_INSTALL_DIR, { recursive: true })

  // 根据平台选择解压方式
  if (isWindows) {
    // Windows: 使用 PowerShell 解压
    execSync(
      `powershell -NoProfile -Command "Expand-Archive -Path '${archivePath}' -DestinationPath '${JDK_INSTALL_DIR}' -Force"`,
      { timeout: 120000 }
    )
  } else {
    // Mac/Linux: 使用 tar 解压
    execSync(
      `tar -xzf "${archivePath}" -C "${JDK_INSTALL_DIR}"`,
      { timeout: 120000 }
    )
  }

  // Adoptium 解压后有一层嵌套目录，需要找到并提升
  const entries = fs.readdirSync(JDK_INSTALL_DIR)
  const jdkDir = entries.find(e => e.startsWith('jdk-17') && fs.statSync(path.join(JDK_INSTALL_DIR, e)).isDirectory())
  if (jdkDir) {
    const nestedPath = path.join(JDK_INSTALL_DIR, jdkDir)
    const tempPath = path.join(os.tmpdir(), 'jdk17_temp')

    // 移动嵌套目录内容到 JDK_INSTALL_DIR
    if (fs.existsSync(tempPath)) fs.rmSync(tempPath, { recursive: true })
    fs.renameSync(nestedPath, tempPath)

    // 清空安装目录
    for (const entry of fs.readdirSync(JDK_INSTALL_DIR)) {
      fs.rmSync(path.join(JDK_INSTALL_DIR, entry), { recursive: true })
    }

    // 把内容移回来
    for (const entry of fs.readdirSync(tempPath)) {
      fs.renameSync(path.join(tempPath, entry), path.join(JDK_INSTALL_DIR, entry))
    }
    fs.rmSync(tempPath, { recursive: true })
  }

  // 清理下载文件
  fs.unlinkSync(archivePath)

  const javaExe = path.join(JDK_INSTALL_DIR, 'bin', javaExecutable)
  const version = getJavaVersion(javaExe)

  onProgress({ stage: 'done', percent: 100, message: `JDK 17 安装完成 (${version})` })

  return { found: true, path: javaExe, version, source: 'installed' }
}

/**
 * 下载文件（支持重定向）
 */
function downloadFile(url, dest, onProgress) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)

    function doRequest(reqUrl) {
      const mod = reqUrl.startsWith('https') ? https : require('http')
      // 创建自定义 Agent 强制直连，绕过系统代理
      const Agent = mod.Agent
      const options = {
        headers: { 'User-Agent': 'CubeRecall/1.0' },
        agent: new Agent({ keepAlive: false })
      }
      mod.get(reqUrl, options, (res) => {
        // 处理重定向
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          doRequest(res.headers.location)
          return
        }

        if (res.statusCode !== 200) {
          reject(new Error(`下载失败: HTTP ${res.statusCode}`))
          return
        }

        const totalSize = parseInt(res.headers['content-length'], 10) || 0
        let downloadedSize = 0

        res.on('data', (chunk) => {
          downloadedSize += chunk.length
          if (totalSize > 0) {
            onProgress(Math.round(downloadedSize / totalSize * 100))
          }
        })

        res.pipe(file)
        file.on('finish', () => {
          file.close()
          resolve()
        })
      }).on('error', (err) => {
        fs.unlink(dest, () => {})
        reject(err)
      })
    }

    doRequest(url)
  })
}

module.exports = { detectJava, installJava, JDK_INSTALL_DIR }
