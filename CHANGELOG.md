# 更新日志 (Changelog)

本文档记录项目的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [1.0.0] - 2026-02-15

### 🎉 首次发布

这是方块回召 (Cube Recall) 的首个正式版本！

### ✨ 新增功能

#### 核心功能
- **游客模式**: 无需登录即可浏览启动器界面
- **延迟登录**: 仅在启动游戏时要求登录
- **MC 像素风格 UI**: 完全还原 Minecraft 原版界面风格
- **国际化支持**: 中文/英文语言切换

#### 环境管理
- **自动 Java 检测**: 智能扫描系统中的 Java 17
  - 支持多路径扫描（注册表、PATH、常见安装路径）
  - 检测优先级：启动器自带 → 注册表 → PATH → 常见路径
- **自动 JDK 下载**: 使用华为云 OpenJDK 17 镜像
  - 支持 Windows / macOS / Linux
  - 文件大小：~180-186 MB
  - 自动安装到 `~/.cuberecall/jdk17`
- **游戏文件管理**: 自动下载 Minecraft 1.20.1 + Forge 47.3.0
  - 使用 BMCLAPI 中国镜像加速
  - 支持增量下载
  - 自动校验文件完整性

#### Mod 管理
- **Mod 自动同步**: 与服务器 Mods 保持一致
  - MD5 校验确保文件完整性
  - 增量更新节省带宽
  - 自动删除多余 Mod
  - 自动下载缺失 Mod

#### 认证系统
- **用户注册/登录**: 基于用户名+密码的认证
- **机器码绑定**: 防止账号共享
  - 基于硬件信息生成唯一 ID
  - 支持多平台（Windows/macOS/Linux）

#### 其他功能
- **公告系统**: 从服务器动态拉取公告
- **游戏日志**: 实时显示启动过程日志
- **进度提示**: 详细的下载/安装进度显示

### 🐛 Bug 修复

#### 网络问题
- **修复代理导致的 ECONNREFUSED 错误**
  - 问题：系统代理（Clash/v2rayN）导致连接失败
  - 解决：Electron 主进程添加 `no-proxy-server` 参数
  - 解决：所有下载模块使用自定义 Agent 绕过代理
- **修复 undici 在 Electron 中的兼容性问题**
  - 问题：undici 库的 `File` API 在 Electron 中不可用
  - 解决：改用 Node.js 原生 `https.Agent`
- **修复 Node.js 20+ 超时问题**
  - 问题：Happy Eyeballs 机制导致 IPv6 连接超时
  - 解决：设置 `--network-family-autoselection-attempt-timeout=2000`

#### 启动器问题
- **修复批处理文件中文编码问题**
  - 问题：UTF-8 编码在 Windows CMD 中显示乱码
  - 解决：创建纯英文版启动脚本
- **修复端口冲突问题**
  - 问题：端口 5173 被占用导致启动失败
  - 解决：启动脚本自动清理端口占用进程
- **修复 wait-on 端口配置错误**
  - 问题：Vite 改为 5173 但 wait-on 仍等待 9527
  - 解决：更新 `package.json` 中的端口配置

### ⚡ 性能优化

#### 下载优化
- **使用 @xmcl 替代 minecraft-java-core**
  - 性能提升约 50%
  - 更好的错误处理
  - 更稳定的下载体验
- **降低并发下载数**
  - 从默认 16 降低到 8
  - 提升下载稳定性
  - 减少超时错误
- **增加下载重试机制**
  - 失败后自动重试最多 3 次
  - 每次重试间隔 3-5 秒
  - 提高下载成功率

#### 镜像加速
- **BMCLAPI 中国镜像**: 游戏文件下载
  - Maven 库: `bmclapi2.bangbang93.com/maven`
  - 资源文件: `bmclapi2.bangbang93.com/assets`
- **华为云镜像**: JDK 下载
  - `mirrors.huaweicloud.com/openjdk/17/`
- **阿里云镜像**: 备用 Maven 库
  - `maven.aliyun.com/repository/public`

### 🔧 技术栈

#### 前端
- **Electron**: 28.3.3
- **Vue**: 3.5.28
- **Pinia**: 2.3.1
- **Vue Router**: 4.6.4
- **Vite**: 5.4.21
- **Axios**: 1.13.5

#### 后端
- **FastAPI**: Latest
- **SQLite**: 3
- **Uvicorn**: Latest

#### 游戏
- **Minecraft**: 1.20.1
- **Forge**: 47.3.0
- **@xmcl/installer**: 6.1.2
- **@xmcl/core**: 2.15.1

### 📦 构建

- **Windows**: `CubeRecall-Setup-x.x.x.exe` (NSIS 安装包，支持自动更新)
- **macOS**: `CubeRecall.dmg`
- **Linux**: `CubeRecall.AppImage`

### 📝 文档

- 完整开发文档 (`开发文档.md`)
- 英文开发文档 (`DEVELOPMENT.md`)
- 快速参考卡片 (`快速参考.md`)
- 启动指南 (`HOW-TO-START.txt`)
- 项目 README (`README.md`)

### 🔐 安全

- 密码不明文存储（未实现加密）⚠️
- 机器码绑定防止账号共享
- HTTPS 连接（开发环境使用 HTTP）

### ⚠️ 已知问题

- 密码未加密存储（计划在 v1.1.0 修复）
- 首次下载游戏文件较慢（约 1-2GB）
- Electron DevTools 有时无法正常加载
- macOS 和 Linux 平台未充分测试

### 📋 待办事项

见 [开发文档.md](开发文档.md) 的"待办事项"章节。

---

## [1.1.0] - 2026-02-15

### ✨ 新增功能

#### 可配置文件夹同步
- **通用文件同步器** (`FileSyncManager`): 支持任意文件夹的递归同步
  - 并发下载控制（p-limit，默认 3 并发）
  - 指数退避重试机制（默认 3 次重试）
  - 流式 MD5 校验（适用于大文件）
  - 按优先级顺序同步多个文件夹
- **后端同步配置** (`sync_config.json`): 管理员可动态配置同步目录
  - 支持 mods、config、resourcepacks、tacz 等多文件夹
  - 新增 `/sync/config`、`/sync/{folder_id}/manifest`、`/sync/{folder_id}/download/{filepath}` 端点
  - 无需重新编译启动器，修改配置即可新增同步目录
- **重构 mod-sync 模块**: 基于通用同步器重构，保持向后兼容

#### 启动器自动更新
- **electron-updater 集成**: 完整的自动更新流程
  - 启动 10 秒后自动检查更新（打包环境）
  - 手动控制下载（不自动下载）
  - 实时下载进度（百分比、速度、已传输/总量）
  - MC 像素风格更新对话框
  - 一键重启并安装
- **NSIS 安装包**: 从 portable 切换为 NSIS 安装包格式
  - 支持选择安装目录
  - 创建桌面和开始菜单快捷方式
- **后端静态文件服务**: `/updates` 端点托管更新包和 `latest.yml`

#### 服务器地址可配置
- **后端配置驱动**: MC 服务器 IP 从 `sync_config.json` 动态获取
- **应用配置模块** (`app-config.js`): 后端 API 地址集中管理
- 消除所有硬编码地址

### 🐛 Bug 修复
- **修复 p-limit ESM 兼容性问题**: 降级到 v3（最后支持 CommonJS 的版本）
- **修复下载端点路径穿越安全漏洞**: 使用 `os.path.abspath` 统一路径比较
- **修复同步路由配置引用**: 使用 `config.py` 中的 `SYNC_CONFIG_FILE` 而非硬编码路径

### ⚡ 性能优化
- **消除冗余同步**: 重构启动流程，`prepareEnvironment` 和 `launchGame` 职责分离
  - `prepareEnvironment`: Java + Game + 多文件夹同步
  - `launchGame`: 仅启动游戏
- **登录弹窗增强**: 添加用户名格式提示和前端校验

### 📦 新增依赖
- `electron-updater`: ^6.7.3
- `electron-log`: ^5.4.3
- `p-limit`: ^3.1.0

### 📝 新增文件
- `server/sync_config.json` - 同步配置文件
- `server/routers/sync.py` - 通用同步路由
- `launcher/electron/modules/file-sync-manager.js` - 通用文件同步器
- `launcher/electron/modules/auto-updater.js` - 自动更新模块
- `launcher/electron/app-config.js` - 应用配置
- `launcher/src/components/UpdateDialog.vue` - 更新对话框

---

## [Unreleased]

### 计划中
- [ ] 多账号管理
- [ ] 密码加密存储
- [ ] 皮肤系统
- [ ] 崩溃日志自动上传

---

## 版本说明

### 版本号规则

```
MAJOR.MINOR.PATCH

MAJOR: 不兼容的 API 变更
MINOR: 向下兼容的功能性新增
PATCH: 向下兼容的问题修正
```

### 示例

- `1.0.0` → 首个正式版本
- `1.1.0` → 新增多账号管理功能
- `1.1.1` → 修复登录 bug
- `2.0.0` → 重构架构（不兼容 1.x）

---

## 链接

- [GitHub Repository](https://github.com/yourusername/cube-recall)
- [Issue Tracker](https://github.com/yourusername/cube-recall/issues)
- [Documentation](开发文档.md)

---

**最后更新**: 2026-02-15
