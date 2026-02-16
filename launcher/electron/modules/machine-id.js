const { execSync } = require('child_process')
const crypto = require('crypto')

/**
 * 获取机器唯一标识
 * 基于 CPU ID + 主板序列号 + 磁盘序列号 生成 SHA256 hash
 */
function getMachineId() {
  const parts = []

  // CPU ID
  try {
    const cpuId = execSync(
      'wmic cpu get ProcessorId /value 2>nul',
      { encoding: 'utf8' }
    )
    const match = cpuId.match(/ProcessorId=(\S+)/)
    if (match) parts.push(match[1])
  } catch {
    // 忽略
  }

  // 主板序列号
  try {
    const boardSN = execSync(
      'wmic baseboard get SerialNumber /value 2>nul',
      { encoding: 'utf8' }
    )
    const match = boardSN.match(/SerialNumber=(\S+)/)
    if (match) parts.push(match[1])
  } catch {
    // 忽略
  }

  // 系统磁盘序列号
  try {
    const diskSN = execSync(
      'wmic diskdrive where "Index=0" get SerialNumber /value 2>nul',
      { encoding: 'utf8' }
    )
    const match = diskSN.match(/SerialNumber=(\S+)/)
    if (match) parts.push(match[1])
  } catch {
    // 忽略
  }

  // 如果所有信息都获取失败，使用 hostname 作为后备
  if (parts.length === 0) {
    try {
      parts.push(execSync('hostname', { encoding: 'utf8' }).trim())
    } catch {
      parts.push('unknown-machine')
    }
  }

  const raw = parts.join('|')
  return crypto.createHash('sha256').update(raw).digest('hex')
}

module.exports = { getMachineId }
