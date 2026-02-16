# 自动更新机制

## 原理

Portable exe 模式下无法使用 electron-updater（缺少 app-update.yml），采用自定义方案：

1. 启动 10 秒后从服务器拉取 `latest.yml` 比对版本号
2. 发现新版本 → 下载新 exe 到**当前 exe 同目录**（文件名含版本号）
3. `spawn` 启动新版本 exe → 当前进程退出
4. 新版本启动时自动删除旧版本文件

## 服务器配置

更新文件放在 `/opt/cuberecall-server/updates/` 目录，通过 FastAPI 静态路由提供：

```
/opt/cuberecall-server/updates/
├── latest.yml              # 版本描述文件
└── CubeRecall-1.0.1.exe    # 新版本 portable exe
```

### latest.yml 格式

```yaml
version: 1.0.1
files:
  - url: CubeRecall-1.0.1.exe
    sha512: <base64 sha512>
    size: 72990168
path: CubeRecall-1.0.1.exe
sha512: <base64 sha512>
releaseDate: '2026-02-16T14:35:00.000Z'
```

### 生成 sha512

```bash
node -e "
const fs = require('fs'), crypto = require('crypto')
const buf = fs.readFileSync('release/CubeRecall-1.0.1.exe')
console.log(crypto.createHash('sha512').update(buf).digest('base64'))
console.log(buf.length)
"
```

## 发布新版本流程

```bash
# 1. 修改 package.json 中的 version
# 2. 编译
cd launcher && npm run build

# 3. 生成 latest.yml（用上面的命令获取 sha512 和 size 填入）

# 4. 上传到服务器
scp release/CubeRecall-X.Y.Z.exe mclauncher:/opt/cuberecall-server/updates/
scp release/latest.yml mclauncher:/opt/cuberecall-server/updates/

# 5. 把 package.json version 改回当前开发版本
```

## 关键代码

- 更新器：`launcher/electron/modules/auto-updater.js`
- 触发入口：`launcher/electron/main.js` 第 105-115 行
- 更新 URL：`http://mc.sivita.xyz:5806/updates`
- 环境变量：`PORTABLE_EXECUTABLE_FILE`（NSIS portable 自动设置，指向用户实际运行的 exe 路径）

## 注意事项

- 构建脚本必须使用 `--win portable`（NSIS 模式），不能只用 `--prepackaged`（7z SFX 不设置 PORTABLE_EXECUTABLE_FILE）
- 新旧版本 exe 共存于同一目录，新版本启动后清理旧文件
- `package.json` 中的 `version` 决定当前版本号，`latest.yml` 中的 `version` 决定远程版本号
