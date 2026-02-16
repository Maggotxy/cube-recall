const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const https = require('https')
const http = require('http')
const pLimit = require('p-limit')

/**
 * 通用文件同步管理器
 * 支持递归目录、并发下载、重试机制、MD5 校验
 */
class FileSyncManager {
  constructor(targetDir, options = {}) {
    this.targetDir = targetDir
    this.maxConcurrent = options.maxConcurrent || 3
    this.retryAttempts = options.retryAttempts || 3
    this.retryDelay = options.retryDelay || 1000
    this.timeout = options.timeout || 300000 // 5分钟
    this.limit = pLimit(this.maxConcurrent)
  }

  /**
   * 流式计算文件 MD5（适用于大文件）
   */
  async computeMD5(filepath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('md5')
      const stream = fs.createReadStream(filepath)

      stream.on('data', chunk => hash.update(chunk))
      stream.on('end', () => resolve(hash.digest('hex')))
      stream.on('error', reject)
    })
  }

  /**
   * 获取 JSON 数据
   */
  fetchJSON(url) {
    return new Promise((resolve, reject) => {
      const mod = url.startsWith('https') ? https : http
      const Agent = mod.Agent
      const options = {
        headers: { 'User-Agent': 'CubeRecall/1.0' },
        agent: new Agent({ keepAlive: false }),
        timeout: this.timeout
      }

      mod.get(url, options, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`))
          return
        }
        let data = ''
        res.on('data', chunk => data += chunk)
        res.on('end', () => {
          try { resolve(JSON.parse(data)) }
          catch (e) { reject(e) }
        })
      }).on('error', reject).on('timeout', () => reject(new Error('Request timeout')))
    })
  }

  /**
   * 下载文件（带重定向支持）
   */
  downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
      // 确保目标目录存在
      const dir = path.dirname(dest)
      fs.mkdirSync(dir, { recursive: true })

      const file = fs.createWriteStream(dest)

      const doRequest = (reqUrl) => {
        const reqMod = reqUrl.startsWith('https') ? https : http
        const Agent = reqMod.Agent
        const options = {
          headers: { 'User-Agent': 'CubeRecall/1.0' },
          agent: new Agent({ keepAlive: false }),
          timeout: this.timeout
        }

        reqMod.get(reqUrl, options, (res) => {
          // 处理重定向
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            file.close()
            fs.unlinkSync(dest)
            doRequest(res.headers.location)
            return
          }

          if (res.statusCode !== 200) {
            file.close()
            fs.unlinkSync(dest)
            reject(new Error(`下载失败: HTTP ${res.statusCode}`))
            return
          }

          res.pipe(file)
          file.on('finish', () => {
            file.close()
            resolve()
          })
        }).on('error', (err) => {
          file.close()
          fs.unlink(dest, () => {})
          reject(err)
        }).on('timeout', () => {
          file.close()
          fs.unlink(dest, () => {})
          reject(new Error('Download timeout'))
        })
      }

      doRequest(url)
    })
  }

  /**
   * 带重试机制的下载（指数退避）
   */
  async downloadFileWithRetry(url, dest, attempt = 0) {
    try {
      await this.downloadFile(url, dest)
    } catch (err) {
      if (attempt < this.retryAttempts) {
        const delay = this.retryDelay * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.downloadFileWithRetry(url, dest, attempt + 1)
      }
      throw err
    }
  }

  /**
   * 扫描本地目录并计算文件清单
   */
  async scanLocalFiles(extensions) {
    const manifest = {}

    if (!fs.existsSync(this.targetDir)) {
      return manifest
    }

    const scanDir = async (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
          await scanDir(fullPath)
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name)
          if (extensions.includes(ext)) {
            const relativePath = path.relative(this.targetDir, fullPath).replace(/\\/g, '/')
            manifest[relativePath] = await this.computeMD5(fullPath)
          }
        }
      }
    }

    await scanDir(this.targetDir)
    return manifest
  }

  /**
   * 检查文件差异
   */
  async checkDiff(serverManifest, extensions) {
    const localManifest = await this.scanLocalFiles(extensions)

    const toDownload = []
    const toDelete = []

    // 需要下载的（服务器有但本地没有，或 MD5 不同）
    for (const [filepath, info] of Object.entries(serverManifest)) {
      if (!localManifest[filepath] || localManifest[filepath] !== info.md5) {
        toDownload.push({
          path: filepath,
          url: info.url,
          size: info.size,
          md5: info.md5
        })
      }
    }

    // 需要删除的（本地有但服务器没有）
    for (const filepath of Object.keys(localManifest)) {
      if (!serverManifest[filepath]) {
        toDelete.push(filepath)
      }
    }

    return {
      upToDate: toDownload.length === 0 && toDelete.length === 0,
      toDownload,
      toDelete,
      serverCount: Object.keys(serverManifest).length,
      localCount: Object.keys(localManifest).length
    }
  }

  /**
   * 清理目录中不在服务器清单里的文件和子目录
   */
  cleanUntracked(serverManifest, extensions) {
    if (!fs.existsSync(this.targetDir)) return []
    const removed = []
    const serverFiles = new Set(Object.keys(serverManifest))

    const entries = fs.readdirSync(this.targetDir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(this.targetDir, entry.name)
      if (entry.isDirectory()) {
        // 服务器清单里没有以此目录为前缀的文件 → 删除整个目录
        const prefix = entry.name + '/'
        const hasMatch = [...serverFiles].some(f => f.startsWith(prefix))
        if (!hasMatch) {
          fs.rmSync(fullPath, { recursive: true, force: true })
          removed.push(entry.name + '/')
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name)
        // 扩展名匹配但不在清单里 → 已由 checkDiff 处理
        // 扩展名不匹配且不在清单里 → 额外清理
        if (!extensions.includes(ext) && !serverFiles[entry.name]) {
          // 保留不匹配扩展名但在清单里的文件
          if (!serverFiles.has(entry.name)) {
            fs.unlinkSync(fullPath)
            removed.push(entry.name)
          }
        }
      }
    }
    return removed
  }

  /**
   * 执行同步
   */
  async sync(manifestUrl, extensions, onProgress) {
    // 确保目标目录存在
    fs.mkdirSync(this.targetDir, { recursive: true })

    // 1. 获取服务器清单
    onProgress({ stage: 'checking', percent: 0, message: '正在检查文件差异...' })
    const manifest = await this.fetchJSON(manifestUrl)

    // 1.5 清理不在清单中的文件和目录
    const cleaned = this.cleanUntracked(manifest, extensions)
    if (cleaned.length > 0) {
      onProgress({ stage: 'cleaning', percent: 5, message: `已清理 ${cleaned.length} 个多余文件/目录` })
    }

    // 2. 对比差异
    const diff = await this.checkDiff(manifest, extensions)

    if (diff.upToDate) {
      onProgress({ stage: 'done', percent: 100, message: '文件已是最新' })
      return { success: true, message: '文件已是最新' }
    }

    const totalTasks = diff.toDownload.length + diff.toDelete.length
    let completed = 0

    // 3. 删除多余文件
    for (const filepath of diff.toDelete) {
      const fullPath = path.join(this.targetDir, filepath)
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath)
      }
      completed++
      onProgress({
        stage: 'deleting',
        percent: Math.round((completed / totalTasks) * 100),
        message: `已删除: ${filepath}`
      })
    }

    // 4. 并发下载缺失文件
    const downloadTasks = diff.toDownload.map(file =>
      this.limit(async () => {
        const destPath = path.join(this.targetDir, file.path)
        await this.downloadFileWithRetry(file.url, destPath)

        // 验证 MD5
        const actualMD5 = await this.computeMD5(destPath)
        if (actualMD5 !== file.md5) {
          throw new Error(`MD5 校验失败: ${file.path}`)
        }

        completed++
        onProgress({
          stage: 'downloading',
          percent: Math.round((completed / totalTasks) * 100),
          message: `已下载: ${file.path}`
        })
      })
    )

    await Promise.all(downloadTasks)

    onProgress({
      stage: 'done',
      percent: 100,
      message: `同步完成: 下载 ${diff.toDownload.length} 个, 删除 ${diff.toDelete.length} 个`
    })

    return {
      success: true,
      downloaded: diff.toDownload.length,
      deleted: diff.toDelete.length
    }
  }
}

module.exports = FileSyncManager
