/**
 * 启动器应用配置
 * serverUrl 为后端 API 地址，构建时确定
 * serverIp 从后端 /sync/config 动态获取
 */
module.exports = {
  // 后端 API 地址（部署时需修改为实际地址）
  SERVER_URL: process.env.SERVER_URL || 'http://mc.sivita.xyz:5806',
}
