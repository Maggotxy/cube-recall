# 方块回召 (Cube Recall)

<div align="center">

![Cube Recall Logo](https://via.placeholder.com/200x200?text=Cube+Recall)

**现代化的 Minecraft 启动器**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](package.json)
[![Minecraft](https://img.shields.io/badge/Minecraft-1.20.1-brightgreen.svg)](https://minecraft.net)
[![Forge](https://img.shields.io/badge/Forge-47.3.0-orange.svg)](https://files.minecraftforge.net)

[功能特性](#功能特性) • [快速开始](#快速开始) • [开发文档](#开发文档) • [问题反馈](#问题反馈)

</div>

---

## 📖 简介

**方块回召 (Cube Recall)** 是一个专为 Minecraft 1.20.1 + Forge 47.3.0 设计的现代化游戏启动器。采用 Electron + Vue 3 技术栈，提供流畅的用户体验和强大的功能。

### 🎯 设计理念

- **游客模式优先**: 无需登录即可浏览、检查环境
- **延迟登录**: 仅在启动游戏时要求登录
- **自动化**: 自动检测环境、下载依赖、同步 Mods
- **中国优化**: 使用 BMCLAPI 镜像和华为云 OpenJDK，下载速度快
- **MC 原味**: 完全还原 Minecraft 像素风格 UI

---

## ✨ 功能特性

### 已实现 ✅

- [x] **游客模式浏览**
  - 无需登录即可查看公告
  - 自动检测 Java、游戏文件、Mods 状态
  - 流畅的界面操作

- [x] **延迟登录系统**
  - 点击启动游戏时弹出登录窗口
  - MC 像素风格的登录/注册界面
  - 机器码绑定防作弊

- [x] **自动环境管理**
  - 智能检测 Java 17（多路径扫描）
  - 自动下载 JDK（华为云镜像，180MB）
  - 自动下载游戏文件（BMCLAPI 镜像）
  - 自动安装 Forge

- [x] **多文件夹可配置同步**
  - 支持 Mods、Config、ResourcePacks、TACZ 等多文件夹同步
  - 管理员通过 `sync_config.json` 动态配置，无需重编译启动器
  - 并发下载 + 指数退避重试 + 流式 MD5 校验
  - 按优先级顺序同步

- [x] **启动器自动更新**
  - 基于 electron-updater 实现
  - 启动 10 秒后自动检查更新
  - 下载进度实时显示
  - 一键重启安装

- [x] **自动进入服务器**
  - 启动游戏后自动连接 Minecraft 服务器
  - 服务器 IP 从后端配置动态获取
  - 用户名符合 Minecraft 服务器规范

- [x] **国际化支持**
  - 中文/英文切换
  - 易于扩展其他语言

- [x] **代理绕过优化**
  - 自动绕过系统代理
  - 避免 ECONNREFUSED 错误
  - 稳定的下载体验

### 开发中 🚧

- [ ] 多账号管理
- [ ] 皮肤系统
- [ ] 游戏内 Mod 管理
- [ ] 崩溃日志自动上传

---

## 🖼️ 界面预览

<div align="center">

### 主界面（游客模式）
![Home](https://via.placeholder.com/800x500?text=Home+Screen)

### 登录弹窗（MC 风格）
![Login](https://via.placeholder.com/400x300?text=Login+Dialog)

### 游戏启动中
![Launching](https://via.placeholder.com/800x500?text=Launching+Game)

</div>

---

## 🚀 快速开始

### 环境要求

| 工具 | 版本 | 下载地址 |
|------|------|----------|
| **Node.js** | 18.0+ | https://nodejs.org/ |
| **Python** | 3.8+ | https://www.python.org/ |
| **Java** | 17+ | https://adoptium.net/ |

### 一键启动（推荐）

```bash
# Windows 用户
双击运行: start-launcher.bat
```

### 手动启动

#### 1. 克隆项目

```bash
git clone <repository-url>
cd mcluancher
```

#### 2. 安装依赖

```bash
# 启动器依赖
cd launcher
npm install

# 后端依赖
cd ../server
pip install -r requirements.txt
```

#### 3. 启动服务

**启动器**
```bash
cd launcher
npm run dev
```

**后端**（可选，如需登录功能）
```bash
cd server
python main.py
```

**MC 服务器**（可选，如需联机）
```bash
cd mcserver
java @user_jvm_args.txt @libraries/net/minecraftforge/forge/1.20.1-47.2.0/win_args.txt nogui
```

---

## 📚 开发文档

完整的开发文档请查看：

- **[📖 开发文档.md](开发文档.md)** - 完整的技术文档（中文）
- **[📖 DEVELOPMENT.md](DEVELOPMENT.md)** - Development guide (English)
- **[⚡ 快速参考.md](快速参考.md)** - 快速查阅手册
- **[🔧 HOW-TO-START.txt](HOW-TO-START.txt)** - 启动指南

---

## 🏗️ 技术架构

```
┌─────────────────────────────────────────┐
│          Cube Recall Launcher            │
├─────────────────────────────────────────┤
│  Frontend: Vue 3 + Vite + Electron      │
│  State: Pinia                           │
│  UI: MC Pixel Style (Custom CSS)       │
├─────────────────────────────────────────┤
│  Backend: FastAPI + SQLite              │
│  Auth: Username + Password + MachineID │
│  Storage: Mods, Announcements, Users   │
├─────────────────────────────────────────┤
│  Game Launcher: @xmcl/installer         │
│  Mirror: BMCLAPI (China)                │
│  JDK: Huawei Cloud OpenJDK 17           │
└─────────────────────────────────────────┘
```

### 核心技术栈

| 层 | 技术 | 版本 |
|---|---|---|
| 桌面框架 | Electron | 28.3.3 |
| 前端框架 | Vue 3 | 3.5.28 |
| 状态管理 | Pinia | 2.3.1 |
| 构建工具 | Vite | 5.4.21 |
| 游戏启动 | @xmcl | 6.1.2 |
| 自动更新 | electron-updater | 6.7.3 |
| 后端框架 | FastAPI | Latest |
| 数据库 | SQLite | 3 |

---

## 📁 项目结构

```
mcluancher/
├── launcher/              # 启动器（Electron + Vue）
│   ├── electron/         # Electron 主进程
│   │   ├── main.js      # 入口文件
│   │   ├── preload.js   # 预加载脚本
│   │   ├── app-config.js # 应用配置
│   │   └── modules/     # 核心模块
│   │       ├── file-sync-manager.js  # 通用文件同步器
│   │       ├── auto-updater.js       # 自动更新模块
│   │       ├── game-manager.js       # 游戏管理
│   │       ├── java-manager.js       # Java 管理
│   │       ├── mod-sync.js           # Mod 同步（兼容层）
│   │       └── machine-id.js         # 机器码
│   ├── src/             # Vue 源码
│   │   ├── views/       # 页面组件
│   │   ├── components/  # 公共组件（含 UpdateDialog）
│   │   ├── stores/      # Pinia 状态
│   │   └── i18n/        # 国际化
│   └── package.json     # 依赖配置
│
├── server/               # FastAPI 后端
│   ├── routers/         # API 路由
│   │   ├── sync.py      # 通用同步路由
│   │   ├── auth.py      # 认证路由
│   │   ├── mods.py      # Mod 路由（兼容）
│   │   └── ...
│   ├── sync_config.json # 同步配置（管理员可修改）
│   ├── updates/         # 自动更新文件托管
│   ├── main.py          # 入口文件
│   └── mclauncher.db    # SQLite 数据库
│
├── mcserver/             # Minecraft 服务器
│
├── start-launcher.bat    # 启动器启动脚本
├── 开发文档.md           # 完整开发文档
└── README.md            # 本文件
```

---

## 🤝 贡献指南

欢迎贡献代码！请遵循以下流程：

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

### 提交规范

```
<type>(<scope>): <subject>

type:
  - feat: 新功能
  - fix: 修复 bug
  - docs: 文档更新
  - style: 代码格式
  - refactor: 重构
  - test: 测试
  - chore: 构建/工具

示例:
feat(launcher): 添加多账号管理功能
fix(backend): 修复登录接口 500 错误
```

---

## 📝 更新日志

### v1.0.0 (2026-02-15)

#### 新增
- ✅ 游客模式 + 延迟登录
- ✅ 自动环境检测
- ✅ BMCLAPI 镜像加速
- ✅ MC 像素风格 UI
- ✅ 国际化支持
- ✅ Mod 自动同步

#### 修复
- ✅ 代理导致的 ECONNREFUSED 错误
- ✅ undici 兼容性问题
- ✅ Node.js 20+ 超时问题

#### 优化
- ✅ 使用 @xmcl 替代 minecraft-java-core
- ✅ 降低并发下载数提升稳定性
- ✅ 增加下载重试机制

---

## ❓ 常见问题

<details>
<summary><b>Q: 启动器窗口一闪而过？</b></summary>

**A**: 手动在 CMD 中运行查看错误：
```bash
cd C:\Development\mcluancher\launcher
npm run dev
```
</details>

<details>
<summary><b>Q: 提示端口被占用？</b></summary>

**A**: 运行清理脚本：
```bash
双击: kill-launcher-port.bat
```
</details>

<details>
<summary><b>Q: 下载失败 ECONNREFUSED？</b></summary>

**A**: 已在代码中修复。如果仍有问题，尝试关闭系统代理。
</details>

<details>
<summary><b>Q: MC 服务器启动失败？</b></summary>

**A**: 确保安装了 Java 17+，检查端口 25565 是否被占用。
</details>

更多问题请查看 [开发文档.md](开发文档.md) 的"问题排查"章节。

---

## 📧 联系方式

- **问题反馈**: [GitHub Issues](https://github.com/yourusername/cube-recall/issues)
- **功能建议**: [GitHub Discussions](https://github.com/yourusername/cube-recall/discussions)
- **技术支持**: [邮箱地址]

---

## 📜 开源协议

本项目基于 [MIT License](LICENSE) 开源。

---

## 🙏 致谢

感谢以下开源项目：
- [Electron](https://www.electronjs.org/) - 跨平台桌面应用框架
- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [FastAPI](https://fastapi.tiangolo.com/) - 现代 Python Web 框架
- [XMCL](https://github.com/Voxelum/minecraft-launcher-core-node) - Minecraft 启动核心
- [BMCLAPI](https://bmclapidoc.bangbang93.com/) - Minecraft 中国镜像

---

## ⭐ Star History

如果这个项目对你有帮助，请给我们一个 ⭐ Star！

---

<div align="center">

**Made with ❤️ by Cube Recall Team**

[⬆ 回到顶部](#方块回召-cube-recall)

</div>
