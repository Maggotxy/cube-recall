const path = require('path')
const FileSyncManager = require('./file-sync-manager')
const gameManager = require('./game-manager')

/**
 * 同步 Mods（使用通用同步器，保持向后兼容）
 */
async function syncMods(serverUrl, onProgress) {
  const modsDir = path.join(gameManager.getMinecraftDir(), 'mods')

  // 创建同步器实例
  const syncManager = new FileSyncManager(modsDir, {
    maxConcurrent: 3,
    retryAttempts: 3,
    retryDelay: 1000
  })

  // 调用通用同步方法
  return await syncManager.sync(
    `${serverUrl}/mods/manifest`,
    ['.jar'],
    onProgress
  )
}

/**
 * 检查 Mods 差异（保持向后兼容）
 */
async function checkMods(serverUrl) {
  const modsDir = path.join(gameManager.getMinecraftDir(), 'mods')

  const syncManager = new FileSyncManager(modsDir)
  const manifest = await syncManager.fetchJSON(`${serverUrl}/mods/manifest`)
  const diff = await syncManager.checkDiff(manifest, ['.jar'])

  return diff
}

module.exports = { syncMods, checkMods }
