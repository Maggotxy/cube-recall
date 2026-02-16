# MCLauncher - Minecraft 启动器项目规划

## 项目概述
Windows Minecraft 启动器，支持自动 JDK17 管理、从官方源/BMCLAPI下载MC+Forge、Mods MD5 校验同步、账号注册/登录（机器码绑定）。
使用 @xmcl/installer + @xmcl/core 作为MC下载和启动核心库，只从自己服务器同步Mods。

## 技术栈
| 组件 | 技术 |
|------|------|
| 启动器客户端 | Electron + Vue3 + Vite |
| 后端API | FastAPI (Python) |
| 数据库 | MySQL |
| 服务端Mod | Forge 1.20.1 (Java) |
| 机器码 | 系统硬件信息 hash |

## 项目结构
```
mclauncher/
├── launcher/                # Electron + Vue3 启动器
│   ├── electron/            # Electron 主进程
│   │   ├── main.js
│   │   ├── preload.js
│   │   └── modules/
│   │       ├── java-manager.js    # JDK17 检测/安装
│   │       ├── client-manager.js  # 客户端下载
│   │       ├── mod-sync.js        # Mods 同步
│   │       └── machine-id.js      # 机器码
│   ├── src/                 # Vue3 前端
│   │   ├── views/
│   │   │   ├── Login.vue
│   │   │   ├── Register.vue
│   │   │   └── Home.vue
│   │   ├── components/
│   │   ├── stores/
│   │   └── api/
│   └── package.json
├── server/                  # FastAPI 后端
│   ├── main.py
│   ├── routers/
│   │   ├── auth.py          # 登录/注册
│   │   └── mods.py          # Mods MD5 接口
│   ├── models.py            # 数据库模型
│   ├── database.py
│   ├── mods_manifest.json   # Mods MD5 清单
│   └── requirements.txt
└── server-mod/              # Forge 1.20.1 服务端 Mod
    └── (Forge mod 项目)
```

## 阶段规划

### 阶段 0：项目初始化 [pending]
- [ ] 创建项目目录结构
- [ ] 初始化 Electron + Vue3 项目
- [ ] 初始化 FastAPI 项目
- [ ] 初始化 Forge Mod 项目

### 阶段 1：FastAPI 后端 [pending]
- [ ] 数据库模型（用户表、机器码绑定表、登录Token表）
- [ ] 注册接口（账号规则校验、机器码绑定检查）
- [ ] 登录接口（返回Token、记录IP）
- [ ] Token验证接口（供服务端Mod调用）
- [ ] Mods MD5 接口（读取清单文件返回）

### 阶段 2：Electron 启动器核心 [pending]
- [ ] JDK17 自动检测（注册表/PATH/常见路径）
- [ ] JDK17 自动下载安装（Adoptium）
- [ ] 客户端整包下载与解压
- [ ] Mods MD5 校验与同步
- [ ] 机器码生成
- [ ] Minecraft 启动逻辑

### 阶段 3：Vue3 前端界面 [pending]
- [ ] 登录页面
- [ ] 注册页面
- [ ] 主页（启动按钮、状态显示、Mods同步进度）
- [ ] 设置页面（Java路径、游戏目录等）

### 阶段 4：Forge 服务端 Mod [pending]
- [ ] Mod 项目搭建（Forge 1.20.1 MDK）
- [ ] 玩家加入事件监听
- [ ] Token + IP 双重校验
- [ ] 未验证玩家踢出
- [ ] 配套登录/注册命令（游戏内 /login /register）

### 阶段 5：集成测试 [pending]
- [ ] 全流程测试
- [ ] 打包发布配置

## 关键设计决策

### 登录流程
1. 用户在启动器注册/登录 → 后端返回Token
2. 启动器记录用户IP → 后端保存IP+Token映射
3. 启动器启动MC，传入用户名
4. 玩家进入服务器 → 服务端Mod获取玩家IP和用户名
5. Mod调用后端API验证Token+IP → 通过则放行，否则踢出
6. 游戏内也可通过 /login 命令验证

### 机器码方案
- 获取：CPU ID + 主板序列号 + 磁盘序列号
- Hash：SHA256 生成唯一机器码
- 限制：一个机器码最多绑定2个账号

### Mods 同步流程
1. 启动器请求后端获取 mods 清单（文件名+MD5）
2. 对比本地 mods 目录
3. 下载缺失/不同的 mod
4. 删除服务器清单中不存在的 mod
5. 校验完成后启动游戏
