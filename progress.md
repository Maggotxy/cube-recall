# MCLauncher 进度日志

## 所有任务完成

### 已完成
- [x] 需求确认 & 技术选型
- [x] 项目规划文件
- [x] FastAPI 后端（注册/登录/Token验证/Mods MD5接口）
- [x] Electron + Vue3 项目初始化
- [x] Electron 核心模块（Java管理/游戏管理/Mod同步/机器码）
- [x] Vue3 Minecraft 像素风前端界面（登录/注册/主页）
- [x] Forge 1.20.1 服务端 Mod（玩家加入自动验证）
- [x] 后端新增 /auth/verify-player 接口（Mod专用）

### 设计亮点
- 使用 @xmcl/installer 从官方源/BMCLAPI 下载 MC + Forge
- 只从自己服务器同步 Mods（MD5 校验）
- Minecraft 像素风 UI（Press Start 2P 字体 + MC 配色 + 石头按钮）
- Mod 无需游戏内命令，全部通过启动器完成注册/登录
- Token + IP 双重校验
