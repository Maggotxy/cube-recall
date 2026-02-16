# Cube Recall 服务器信息手册

## 1. 服务器连接信息

| 项目 | 值 |
|------|-----|
| SSH 主机 | `np.xfywz.cn` |
| SSH 端口 | `58261` |
| SSH 用户名 | `root` |
| SSH 认证方式 | 公钥 (`~/.ssh/id_rsa_mclauncher`) |
| 公网 IP | `110.42.109.10` |
| 域名 | `mc.sivita.xyz` → `110.42.109.10` |

### SSH 快捷连接

本地 `~/.ssh/config` 已配置别名，直接使用：

```bash
ssh mclauncher
scp -r ./file mclauncher:/remote/path/
```

等价于：
```bash
ssh -i ~/.ssh/id_rsa_mclauncher -p 58261 root@np.xfywz.cn
```

---

## 2. 服务器硬件信息

| 项目 | 值 |
|------|-----|
| 操作系统 | Ubuntu 22.04 (Linux 5.15) |
| CPU | AMD Ryzen 9 9950X (4 vCPU) |
| 内存 | 8 GB |
| 磁盘 | 58 GB (已用 ~13 GB) |
| Java | OpenJDK 17.0.18 |
| 面板 | 1Panel |

---

## 3. 服务架构

```
                    ┌─────────────────────────┐
                    │     mc.sivita.xyz        │
                    │   (110.42.109.10)        │
                    └────────┬────────────────-┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
         :5801          :5805         :5806
     MCSManager      MC Server     FastAPI
      (Web面板)      (Forge 1.20.1)  (Cube Recall)
         │              │              │
    Docker容器      Docker容器     systemd服务
   mcsm-web-1     mcsm-daemon-1  cuberecall.service
```

### 端口分配

| 端口 | 服务 | 说明 |
|------|------|------|
| 5801 | MCSManager Web | 服务器管理面板 (Docker) |
| 5802 | MCSManager Daemon | 守护进程 API (Docker) |
| 5805 | Minecraft Server | Forge 1.20.1-47.3.33 服务端 (Docker 内) |
| 5806 | Cube Recall API | FastAPI 后端 (systemd) |
| 58261 | SSH | 远程管理 |

---

## 4. 目录结构

### 4.1 Cube Recall 后端 (FastAPI)

```
/opt/cuberecall-server/
├── .env                    # 环境变量（密钥、数据库等）
├── main.py                 # FastAPI 入口
├── config.py               # 配置模块
├── database.py             # 数据库连接
├── models.py               # ORM 模型
├── init_db.sql             # 数据库初始化 SQL
├── mclauncher.db           # SQLite 本地数据库
├── sync_config.json        # 文件同步配置
├── requirements.txt        # Python 依赖
├── venv/                   # Python 虚拟环境
├── routers/                # API 路由
│   ├── auth.py             # 用户认证（登录/注册/验证）
│   ├── sync.py             # 文件同步接口
│   ├── mods.py             # Mod 管理
│   ├── admin.py            # 管理后台
│   ├── announcements.py    # 公告
│   ├── anticheat.py        # 反作弊
│   └── landing.py          # 落地页
├── client-sync/            # 客户端同步缓存
│   ├── mods/
│   ├── config/
│   ├── resourcepacks/
│   └── tacz/
├── server-mod/             # Auth Mod 源码（服务器副本）
│   ├── src/
│   ├── build.gradle
│   └── build/libs/mclauncherauth-1.0.0.jar
├── mods/                   # Mod 仓库
├── client_pack/            # 客户端整合包
└── updates/                # 启动器更新文件（.exe + .yml）
```

**systemd 服务**: `cuberecall.service`
```bash
# 管理命令
sudo systemctl status cuberecall      # 查看状态
sudo systemctl restart cuberecall     # 重启
sudo journalctl -u cuberecall -f      # 查看日志
```

### 4.2 Minecraft 服务端 (Forge)

```
/opt/1panel/apps/mcsm/daemon/data/InstanceData/57aa6eb2972141c9982dd9fa7e4bada1/
├── mods/                       # 服务端 Mod（35个）
│   ├── mclauncherauth-1.0.0.jar   # ← Auth 验证 Mod
│   ├── chaojiamod-0.1.0.jar       # ← 自定义 Mod
│   ├── mobtracker-1.0.0.jar       # ← 自定义 Mod
│   ├── tacz-1.20.1-1.1.7-hotfix.jar  # TACZ 枪械
│   ├── kubejs-forge-*.jar         # KubeJS 脚本引擎
│   └── ... (其他公共 Mod)
├── client/                     # 客户端同步文件（sync_config 指向这里）
│   ├── mods/                   # 客户端 Mod（和服务端不完全相同）
│   ├── config/                 # 客户端配置
│   ├── defaultconfigs/         # 默认配置
│   └── tacz/                   # TACZ 枪械包
├── config/                     # 服务端配置
│   └── mclauncher-auth.json    # Auth Mod 配置
├── world/                      # 主世界存档
├── world2/                     # 第二世界（Multiworld）
├── libraries/                  # Forge 库文件
├── crash-reports/              # 崩溃报告
├── logs/                       # 服务端日志
├── server.properties           # 服务器配置
├── forge-1.20.1-47.3.33-installer.jar
├── run.sh / run.bat
└── eula.txt
```

通过 **MCSManager** 面板管理：`http://mc.sivita.xyz:5801`

### 4.3 客户端与服务端 Mod 分离

服务端和客户端使用**不同的 mods 目录**：

| 类型 | 路径 | 说明 |
|------|------|------|
| 服务端 mods | `.../57aa6eb2.../mods/` | 服务端加载的所有 Mod |
| 客户端 mods | `.../57aa6eb2.../client/mods/` | 通过 sync API 同步给客户端的 Mod |

**注意**：`mclauncherauth` 需要同时存在于两个目录：
- 服务端 `mods/` — 执行玩家验证逻辑
- 客户端 `client/mods/` — 客户端侧读取 launch token 并发送给服务端

---

## 5. 关键配置文件

### 5.1 Auth Mod 配置

路径：`.../57aa6eb2.../config/mclauncher-auth.json`

```json
{
  "apiBaseUrl": "http://172.20.0.1:5806",
  "apiKey": "cuberecall-mod-key-2024",
  "verifyTimeoutSeconds": 10,
  "enabled": true,
  "whitelist": ["LazyDog2"]
}
```

> `172.20.0.1` 是 Docker 网桥地址，MC 服务端在 Docker 容器内，通过此地址访问宿主机上的 FastAPI。

### 5.2 FastAPI 环境变量

路径：`/opt/cuberecall-server/.env`

```
ENV=production
SECRET_KEY=a1b2c3...
ADMIN_TOKEN=cuberecall-admin-2024
MOD_API_KEY=cuberecall-mod-key-2024
DATABASE_URL=mysql+pymysql://fkhzmc:fkhzmc@114.66.55.158:3306/fkhzmc
CORS_ORIGINS=*
SYNC_CONFIG_FILE=./sync_config.json
PORT=5806
```

### 5.3 Minecraft server.properties (关键项)

```properties
server-port=5805
online-mode=false
difficulty=easy
max-players=20
view-distance=10
simulation-distance=10
pvp=true
enforce-secure-profile=false
```

---

## 6. 常用运维操作

### 6.1 部署 Auth Mod 更新

```bash
# 1. 本地编译（在 D:\mclauncher\server-mod\）
cd D:/mclauncher/server-mod && ./gradlew build

# 2. 上传到服务端 mods
scp D:/mclauncher/server-mod/build/libs/mclauncherauth-1.0.0.jar \
    mclauncher:/opt/1panel/apps/mcsm/daemon/data/InstanceData/57aa6eb2972141c9982dd9fa7e4bada1/mods/

# 3. 上传到客户端同步 mods（如果是双端 mod）
scp D:/mclauncher/server-mod/build/libs/mclauncherauth-1.0.0.jar \
    mclauncher:/opt/1panel/apps/mcsm/daemon/data/InstanceData/57aa6eb2972141c9982dd9fa7e4bada1/client/mods/

# 4. 通过 MCSManager 重启 MC 服务端
```

### 6.2 部署 FastAPI 后端更新

```bash
# 1. 上传文件
scp -r D:/mclauncher/server/*.py mclauncher:/opt/cuberecall-server/
scp -r D:/mclauncher/server/routers/*.py mclauncher:/opt/cuberecall-server/routers/

# 2. 重启服务
ssh mclauncher "systemctl restart cuberecall"

# 3. 查看日志
ssh mclauncher "journalctl -u cuberecall -f --no-pager -n 50"
```

### 6.3 部署启动器更新

```bash
# 1. 本地编译
cd D:/mclauncher/launcher && npm run build

# 2. 上传 exe 和 yml
scp D:/mclauncher/launcher/release/CubeRecall-1.0.0.exe mclauncher:/opt/cuberecall-server/updates/
scp D:/mclauncher/launcher/release/latest.yml mclauncher:/opt/cuberecall-server/updates/
```

### 6.4 查看服务状态

```bash
# FastAPI 后端
ssh mclauncher "systemctl status cuberecall"

# Docker 容器（MCSManager + MC Server）
ssh mclauncher "docker ps"

# MC 服务端日志
ssh mclauncher "tail -100 /opt/1panel/apps/mcsm/daemon/data/InstanceData/57aa6eb2972141c9982dd9fa7e4bada1/logs/latest.log"

# 崩溃报告
ssh mclauncher "ls -lt /opt/1panel/apps/mcsm/daemon/data/InstanceData/57aa6eb2972141c9982dd9fa7e4bada1/crash-reports/ | head -5"
```

### 6.5 同步配置更新

```bash
# 上传 sync_config.json
scp D:/mclauncher/server/sync_config.json mclauncher:/opt/cuberecall-server/

# 重启 FastAPI 使配置生效
ssh mclauncher "systemctl restart cuberecall"
```

---

## 7. 关键路径速查表

| 简称 | 完整路径 |
|------|----------|
| MC 实例 | `/opt/1panel/apps/mcsm/daemon/data/InstanceData/57aa6eb2972141c9982dd9fa7e4bada1/` |
| 服务端 mods | `<MC实例>/mods/` |
| 客户端 mods | `<MC实例>/client/mods/` |
| Auth 配置 | `<MC实例>/config/mclauncher-auth.json` |
| FastAPI | `/opt/cuberecall-server/` |
| FastAPI 环境变量 | `/opt/cuberecall-server/.env` |
| 同步配置 | `/opt/cuberecall-server/sync_config.json` |
| MC 日志 | `<MC实例>/logs/latest.log` |
| 崩溃报告 | `<MC实例>/crash-reports/` |

---

## 8. GitHub 仓库

- 地址：https://github.com/Maggotxy/cube-recall
- 分支：`main`

### 本地项目结构

```
D:\mclauncher\
├── launcher/           # Electron + Vue3 启动器
│   ├── electron/       # 主进程代码
│   ├── src/            # Vue 前端
│   ├── scripts/        # 构建脚本
│   └── release/        # 编译输出
├── server/             # FastAPI 后端
├── server-mod/         # Forge Auth Mod (Gradle)
└── mcserver/           # MC 服务端本地副本
```

### 编译命令

```bash
# 启动器 exe
cd D:/mclauncher/launcher && npm run build
# 输出: launcher/release/CubeRecall-1.0.0.exe

# Auth Mod jar
cd D:/mclauncher/server-mod && ./gradlew build
# 输出: server-mod/build/libs/mclauncherauth-1.0.0.jar
```

---

## 9. 已知注意事项

1. **MC 服务端在 Docker 内**，通过 `172.20.0.1` 访问宿主机 FastAPI
2. **BMCLAPI 镜像不稳定**，可能返回空文件，启动器已加入空文件清理 + 重试机制
3. **MC 实例根目录有一个旧的 `mclauncherauth-1.0.0.jar`**（15122 字节），这不是 Mod 加载目录，不影响运行，但建议清理
4. **防火墙未启用** (ufw inactive)，所有端口对外开放
5. **online-mode=false**，使用离线模式，Auth Mod 负责验证合法性
6. **数据库是远程 MySQL** (`114.66.55.158:3306`)，不在本机
