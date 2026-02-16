# 贡献指南 (Contributing Guide)

感谢你对方块回召 (Cube Recall) 项目的关注！我们欢迎任何形式的贡献。

---

## 📖 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发流程](#开发流程)
- [代码规范](#代码规范)
- [提交规范](#提交规范)
- [Pull Request 流程](#pull-request-流程)
- [问题反馈](#问题反馈)

---

## 行为准则

### 我们的承诺

为了营造一个开放、友好的环境，我们承诺：

- ✅ 尊重不同的观点和经验
- ✅ 优雅地接受批评性反馈
- ✅ 关注对社区最有利的事情
- ✅ 对其他社区成员表示同情

### 不可接受的行为

- ❌ 使用性别化语言或图像
- ❌ 人身攻击或政治攻击
- ❌ 公开或私下骚扰
- ❌ 未经许可发布他人私人信息

---

## 如何贡献

### 报告 Bug

如果你发现 Bug，请：

1. 检查 [Issues](https://github.com/yourusername/cube-recall/issues) 是否已存在
2. 如果没有，创建新 Issue
3. 使用清晰的标题描述问题
4. 提供详细的复现步骤
5. 附上错误日志和截图

### 建议功能

如果你有功能建议，请：

1. 检查 [Issues](https://github.com/yourusername/cube-recall/issues) 是否已提出
2. 创建新 Issue，标记为 `enhancement`
3. 详细描述功能的用途和价值
4. 如有可能，提供设计稿或伪代码

### 贡献代码

1. Fork 本仓库
2. 创建功能分支
3. 编写代码和测试
4. 提交 Pull Request

---

## 开发流程

### 1. 环境准备

```bash
# 克隆你的 Fork
git clone https://github.com/your-username/cube-recall.git
cd cube-recall

# 添加上游仓库
git remote add upstream https://github.com/original-owner/cube-recall.git

# 安装依赖
cd launcher && npm install
cd ../server && pip install -r requirements.txt
```

### 2. 创建分支

```bash
# 更新主分支
git checkout main
git pull upstream main

# 创建功能分支
git checkout -b feature/your-feature-name

# 或修复分支
git checkout -b bugfix/issue-number
```

### 3. 开发

```bash
# 启动开发服务器
cd launcher
npm run dev

# 在另一个终端启动后端（如需要）
cd server
python main.py
```

### 4. 测试

```bash
# 运行测试（如果有）
npm test
pytest
```

### 5. 提交

```bash
git add .
git commit -m "feat: 添加新功能"
git push origin feature/your-feature-name
```

### 6. 创建 Pull Request

在 GitHub 上创建 Pull Request，描述你的更改。

---

## 代码规范

### JavaScript/Vue

遵循 [Vue Style Guide](https://vuejs.org/style-guide/)：

```javascript
// ✅ 好的写法
const userName = ref('')

function handleLogin() {
  console.log('Logging in...')
}

// ❌ 不好的写法
const user_name = ref('')

function HandleLogin() {
  console.log('Logging in...')
}
```

### Python

遵循 [PEP 8](https://pep8.org/)：

```python
# ✅ 好的写法
def get_user_by_id(user_id: int) -> User:
    return db.query(User).filter(User.id == user_id).first()

# ❌ 不好的写法
def GetUserById(userId):
    return db.query(User).filter(User.id==userId).first()
```

### 命名规范

| 类型 | 规则 | 示例 |
|------|------|------|
| 变量 | camelCase | `userName`, `isLoggedIn` |
| 常量 | UPPER_SNAKE_CASE | `API_BASE_URL`, `MAX_RETRIES` |
| 函数 | camelCase | `getUserInfo()`, `handleClick()` |
| 类 | PascalCase | `UserStore`, `GameManager` |
| 组件 | PascalCase | `LoginDialog.vue`, `HomeView.vue` |
| 文件 | kebab-case | `user-store.js`, `game-manager.js` |

### 注释规范

```javascript
/**
 * 获取用户信息
 * @param {string} username - 用户名
 * @returns {Promise<User>} 用户对象
 */
async function getUserInfo(username) {
  // TODO: 添加缓存
  const response = await api.get(`/users/${username}`)
  return response.data
}
```

---

## 提交规范

### 提交消息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

| Type | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(launcher): 添加多账号管理` |
| `fix` | Bug 修复 | `fix(backend): 修复登录接口 500 错误` |
| `docs` | 文档更新 | `docs(readme): 更新安装步骤` |
| `style` | 代码格式 | `style: 格式化代码` |
| `refactor` | 重构 | `refactor(game): 重构启动逻辑` |
| `perf` | 性能优化 | `perf(download): 优化下载速度` |
| `test` | 测试 | `test(auth): 添加登录测试` |
| `chore` | 构建/工具 | `chore: 更新依赖` |

### 示例

```bash
# 好的提交消息 ✅
git commit -m "feat(launcher): 添加多账号切换功能

- 支持保存多个账号
- 快速切换账号
- 记住密码（加密存储）

Closes #123"

# 不好的提交消息 ❌
git commit -m "update"
git commit -m "fix bug"
git commit -m "添加功能"
```

---

## Pull Request 流程

### 1. 准备工作

- [ ] 代码已通过测试
- [ ] 代码符合规范
- [ ] 已更新相关文档
- [ ] 提交消息符合规范
- [ ] 已解决冲突

### 2. 创建 PR

**标题格式**：
```
<type>(<scope>): <description>
```

**描述模板**：
```markdown
## 变更类型
- [ ] Bug 修复
- [ ] 新功能
- [ ] 重构
- [ ] 文档更新

## 变更说明
描述你的更改...

## 相关 Issue
Closes #123

## 测试
- [ ] 已添加测试
- [ ] 已通过现有测试

## 截图（如有）
![screenshot](url)

## 检查清单
- [ ] 代码符合规范
- [ ] 已更新文档
- [ ] 已添加测试
```

### 3. Code Review

等待维护者审查：
- 回应审查意见
- 修改代码
- 推送更新

### 4. 合并

通过审查后，维护者会合并你的 PR。

---

## 问题反馈

### Bug 报告模板

```markdown
## Bug 描述
简要描述 Bug

## 复现步骤
1. 进入 xxx 页面
2. 点击 xxx 按钮
3. 看到错误

## 预期行为
应该...

## 实际行为
实际...

## 环境信息
- 操作系统: Windows 11
- Node.js 版本: 18.0.0
- 启动器版本: 1.0.0

## 日志
```
粘贴错误日志
```

## 截图
![screenshot](url)
```

### 功能建议模板

```markdown
## 功能描述
简要描述功能

## 使用场景
用户在什么情况下需要这个功能？

## 建议方案
如何实现这个功能？

## 替代方案
是否有其他实现方式？

## 额外信息
其他补充说明
```

---

## 开发技巧

### 调试技巧

```javascript
// 启动器调试
console.log('Debug:', data)  // 在 DevTools Console 查看

// Electron 主进程调试
console.log('[Main]', data)  // 在终端查看
```

### 常用命令

```bash
# 启动器热重载
cd launcher && npm run dev

# 构建生产版本
cd launcher && npm run build

# 清理端口
kill-launcher-port.bat

# 查看日志
tail -f launcher/logs/app.log
```

---

## 获取帮助

如有疑问，可以通过以下方式获取帮助：

- 📖 阅读 [开发文档](开发文档.md)
- 💬 在 [GitHub Discussions](https://github.com/yourusername/cube-recall/discussions) 提问
- 🐛 在 [GitHub Issues](https://github.com/yourusername/cube-recall/issues) 报告问题
- 📧 发送邮件到 [邮箱地址]

---

## 致谢

感谢所有贡献者！

[![Contributors](https://contrib.rocks/image?repo=yourusername/cube-recall)](https://github.com/yourusername/cube-recall/graphs/contributors)

---

**最后更新**: 2026-02-15
