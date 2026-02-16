export default {
  // 通用
  app: {
    title: '方块回召',
    version: 'v1.0.0',
    login: '登录',
  },

  // 标题栏
  titleBar: {
    minimize: '最小化',
    maximize: '最大化',
    close: '关闭',
  },

  // 登录页
  login: {
    title: '方块回召',
    subtitle: 'Minecraft 服务器启动器',
    username: '用户名',
    password: '密码',
    usernamePlaceholder: '输入用户名...',
    passwordPlaceholder: '输入密码...',
    submit: '登 录',
    submitting: '连接中...',
    or: '或',
    createAccount: '创建新账号',
    noAccount: '没有账号？',
    register: '立即注册',
    errorEmpty: '请填写用户名和密码',
    errorFailed: '登录失败',
    forgeVersion: 'Forge 1.20.1',
  },

  // 注册页
  register: {
    title: '创建账号',
    subtitle: '注册新的启动器账号',
    username: '用户名',
    password: '密码',
    confirmPassword: '确认密码',
    usernamePlaceholder: '英文、数字、下划线',
    passwordPlaceholder: '至少6位',
    confirmPlaceholder: '再次输入密码',
    usernameHint: '3-16位，a-z A-Z 0-9 _',
    submit: '注 册',
    submitting: '创建中...',
    or: '或',
    haveAccount: '已有账号？',
    backToLogin: '返回登录',
    errorEmpty: '请填写所有字段',
    errorUsername: '用户名只能包含英文、数字、下划线 (3-16位)',
    errorPasswordLength: '密码长度不能少于6位',
    errorPasswordMatch: '两次输入的密码不一致',
    errorFailed: '注册失败',
    success: '注册成功！正在跳转登录...',
  },

  // 主页
  home: {
    // 侧边栏
    notLoggedIn: '未登录',
    clickToLogin: '点击启动后登录',
    guest: '游客',
    online: '在线',
    offline: '离线',
    loginNow: '立即登录',
    java: 'Java',
    game: '游戏',
    mods: '模组',
    logout: '退出登录',

    // 状态值
    javaFound: '已安装',
    javaNotFound: '未找到',
    gameInstalled: '已安装',
    gameNotInstalled: '未安装',
    modsUnknown: '未知',
    modsChecking: '检查中...',
    modsSynced: '已同步',
    modsOutdated: '需同步',

    // 横幅
    bannerTitle: 'Cube Recall',
    bannerVersion: 'MINECRAFT Forge 1.20.1',

    // 操作区
    console: '控制台',
    clear: '清除',
    readyTitle: '准备就绪！',
    readyHint: '点击下方按钮开始游戏',

    // 进度
    installingJava: '正在安装 Java 17',
    installingGame: '正在安装游戏',
    syncingMods: '正在同步模组',

    // 启动栏
    serverLabel: '服务器',
    serverNotConfigured: '未配置',
    play: '启 动',
    launching: '启动中...',

    // 公告
    announcement: '公告',
    noAnnouncement: '暂无公告',

    // 日志
    // 登录弹窗
    loginRequired: '需要登录',
    loginRequiredHint: '启动游戏前请先登录',
    switchToRegister: '没有账号？创建一个',
    switchToLogin: '已有账号？去登录',

    logInit: '正在初始化启动器...',
    logJavaFound: 'Java {version} 已找到 ({source})',
    logJavaNotFound: '未找到 Java 17',
    logJavaDetectError: 'Java 检测出错: {error}',
    logGameInstalled: '游戏已安装',
    logGameNotInstalled: '游戏未安装',
    logGameCheckError: '游戏检查出错: {error}',
    logNeedLogin: '请先登录才能启动游戏',
    logPreparingEnvironment: '正在准备游戏环境...',
    logEnvironmentReady: '游戏环境准备完成',
    logLaunchingGame: '正在启动游戏...',
    logLaunchCancelled: '启动已取消',
    logStartLaunch: '开始启动流程...',
    logJavaInstalling: '未找到 Java 17，正在安装...',
    logJavaInstalled: 'Java {version} 安装完成',
    logGameDownloading: '游戏未安装，正在下载...',
    logGameDownloaded: '游戏安装完成',
    logModsSyncing: '正在同步模组...',
    logModsSynced: '模组同步完成',
    logLaunching: '正在启动 Minecraft...',
    logLaunched: '游戏已启动！',
    logError: '错误: {error}',
  },

  // 语言
  lang: {
    label: '语言',
    zhCN: '简体中文',
    enUS: 'English',
  },
}
