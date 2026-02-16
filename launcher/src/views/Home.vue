<template>
  <div class="home-page">
    <!-- 左侧面板 - 用户信息 & 状态 -->
    <aside class="sidebar mc-panel">
      <!-- 玩家头像区域 -->
      <div class="player-section">
        <div class="player-avatar">
          <svg viewBox="0 0 32 32" width="48" height="48" class="avatar-svg">
            <rect x="0" y="0" width="32" height="32" fill="#6B4226"/>
            <rect x="4" y="0" width="24" height="8" fill="#4A3728"/>
            <rect x="0" y="0" width="8" height="4" fill="#4A3728"/>
            <rect x="24" y="0" width="8" height="4" fill="#4A3728"/>
            <rect x="4" y="8" width="24" height="20" fill="#C8A97E"/>
            <rect x="8" y="12" width="4" height="4" fill="#fff"/>
            <rect x="20" y="12" width="4" height="4" fill="#fff"/>
            <rect x="10" y="12" width="2" height="4" fill="#4A3728"/>
            <rect x="22" y="12" width="2" height="4" fill="#4A3728"/>
            <rect x="12" y="20" width="8" height="4" fill="#BA8B6A"/>
          </svg>
        </div>
        <div class="player-info">
          <span class="player-name">
            {{ userStore.isLoggedIn ? userStore.username : t('home.guest') }}
          </span>
          <span :class="['player-status', userStore.isLoggedIn ? 'online' : 'offline']">
            {{ userStore.isLoggedIn ? t('home.online') : t('home.offline') }}
          </span>
        </div>
      </div>

      <!-- 状态面板 -->
      <div class="status-list">
        <!-- Java 状态 -->
        <div class="status-item">
          <svg viewBox="0 0 16 16" width="14" height="14" class="status-icon">
            <rect x="4" y="0" width="8" height="4" fill="#F89820"/>
            <rect x="2" y="4" width="12" height="4" fill="#F89820"/>
            <rect x="4" y="8" width="8" height="4" fill="#5382A1"/>
            <rect x="6" y="12" width="4" height="4" fill="#5382A1"/>
          </svg>
          <span class="status-label">{{ t('home.java') }}</span>
          <span :class="['status-value', javaStatus.found ? 'text-green' : 'text-red']">
            {{ javaStatus.found ? javaStatus.version : t('home.javaNotFound') }}
          </span>
        </div>

        <!-- 游戏状态 -->
        <div class="status-item">
          <svg viewBox="0 0 16 16" width="14" height="14" class="status-icon">
            <rect x="0" y="0" width="16" height="6" fill="#5D8C32"/>
            <rect x="0" y="6" width="16" height="10" fill="#866043"/>
            <rect x="4" y="2" width="2" height="6" fill="#4A3728"/>
            <rect x="2" y="4" width="6" height="2" fill="#3B5E1F"/>
          </svg>
          <span class="status-label">{{ t('home.game') }}</span>
          <span :class="['status-value', gameInstalled ? 'text-green' : 'text-yellow']">
            {{ gameInstalled ? t('home.gameInstalled') : t('home.gameNotInstalled') }}
          </span>
        </div>

        <!-- Mods 状态 -->
        <div class="status-item">
          <svg viewBox="0 0 16 16" width="14" height="14" class="status-icon">
            <rect x="2" y="2" width="12" height="12" fill="#8B8B8B"/>
            <rect x="4" y="4" width="3" height="3" fill="#AA44FF"/>
            <rect x="9" y="4" width="3" height="3" fill="#44AAFF"/>
            <rect x="4" y="9" width="3" height="3" fill="#44FF88"/>
            <rect x="9" y="9" width="3" height="3" fill="#FFAA44"/>
          </svg>
          <span class="status-label">{{ t('home.mods') }}</span>
          <span :class="['status-value', modsStatus === 'synced' ? 'text-green' : 'text-yellow']">
            {{ modsStatusText }}
          </span>
        </div>
      </div>

      <!-- 登出/登录按钮 -->
      <button
        v-if="userStore.isLoggedIn"
        class="mc-btn mc-btn-danger mc-btn-full logout-btn"
        @click="handleLogout"
      >
        {{ t('home.logout') }}
      </button>
      <button
        v-else
        class="mc-btn mc-btn-primary mc-btn-full logout-btn"
        @click="$emit('showLogin')"
      >
        {{ t('home.loginNow') }}
      </button>
    </aside>

    <!-- 右侧主区域 -->
    <main class="main-area">
      <!-- 顶部横幅 -->
      <div class="banner">
        <div class="banner-bg"></div>
        <div class="banner-content">
          <img src="@/assets/mclogo.png" alt="Cube Recall" class="banner-logo" />
          <div class="banner-text">
            <h1 class="banner-title">{{ t('home.bannerTitle') }}</h1>
            <p class="banner-version">{{ t('home.bannerVersion') }}</p>
          </div>
        </div>
      </div>

      <!-- 操作区域 -->
      <div class="action-area">
        <!-- 公告区域 -->
        <div v-if="announcements.length" class="announcement-section mc-panel">
          <div class="announcement-header">
            <svg viewBox="0 0 16 16" width="14" height="14" class="announcement-icon">
              <rect x="2" y="3" width="8" height="10" fill="#FCDB05"/>
              <rect x="10" y="5" width="4" height="6" fill="#FCDB05"/>
              <rect x="4" y="5" width="4" height="2" fill="#8B6914"/>
              <rect x="4" y="9" width="4" height="2" fill="#8B6914"/>
            </svg>
            <span class="announcement-title">{{ t('home.announcement') }}</span>
          </div>
          <div class="announcement-list">
            <div
              v-for="ann in announcements"
              :key="ann.id"
              class="announcement-item"
              :class="{ important: ann.important }"
            >
              <span class="ann-date">{{ formatDate(ann.created_at) }}</span>
              <span class="ann-title">{{ ann.title }}</span>
              <p v-if="ann.content" class="ann-content">{{ ann.content }}</p>
            </div>
          </div>
        </div>

        <!-- 进度显示 -->
        <div v-if="currentTask" class="progress-section mc-panel">
          <div class="progress-header">
            <span class="progress-title">{{ currentTask }}</span>
            <span class="progress-percent">{{ progressPercent }}%</span>
          </div>
          <div class="mc-progress">
            <div class="mc-progress-bar" :style="{ width: progressPercent + '%' }"></div>
          </div>
          <p class="progress-detail">{{ progressMessage }}</p>
        </div>

        <!-- 日志区域（始终显示，不用 v-if 避免销毁） -->
        <div v-show="logs.length > 0" class="log-section mc-panel">
          <div class="log-header">
            <span class="log-title">{{ t('home.console') }}</span>
            <div class="log-filters">
              <button
                v-for="f in LOG_FILTERS"
                :key="f.key"
                :class="['mc-btn', 'log-filter-btn', { active: logFilter === f.key }]"
                @click="logFilter = f.key"
              >{{ f.label }}</button>
            </div>
            <button class="mc-btn log-clear" @click="logs = []">{{ t('home.clear') }}</button>
          </div>
          <div class="log-content" ref="logContainer">
            <p
              v-for="(log, i) in filteredLogs"
              :key="i"
              :class="['log-line', 'log-' + log.level, 'log-src-' + log.source]"
            ><span class="log-tag" :class="'tag-' + log.source">{{ log.source === 'client' ? 'MC' : 'CR' }}</span>{{ log.display }}</p>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="!currentTask && !logs.length && !announcements.length" class="empty-state">
          <svg viewBox="0 0 64 64" width="64" height="64" class="empty-icon">
            <rect x="52" y="4" width="4" height="4" fill="#5DECF2"/>
            <rect x="48" y="8" width="4" height="4" fill="#5DECF2"/>
            <rect x="44" y="12" width="4" height="4" fill="#5DECF2"/>
            <rect x="40" y="16" width="4" height="4" fill="#5DECF2"/>
            <rect x="36" y="20" width="4" height="4" fill="#5DECF2"/>
            <rect x="32" y="24" width="4" height="4" fill="#5DECF2"/>
            <rect x="28" y="28" width="4" height="4" fill="#866043"/>
            <rect x="24" y="32" width="4" height="4" fill="#866043"/>
            <rect x="20" y="36" width="4" height="4" fill="#593D29"/>
            <rect x="16" y="40" width="4" height="4" fill="#4A3728"/>
            <rect x="16" y="36" width="4" height="4" fill="#8B8B8B"/>
            <rect x="24" y="28" width="4" height="4" fill="#8B8B8B"/>
          </svg>
          <p class="empty-text">{{ t('home.readyTitle') }}</p>
          <p class="empty-hint">{{ t('home.readyHint') }}</p>
        </div>
      </div>

      <!-- 底部启动栏 -->
      <div class="launch-bar">
        <div class="server-info">
          <svg viewBox="0 0 16 16" width="14" height="14">
            <rect x="0" y="4" width="16" height="8" fill="#8B8B8B"/>
            <rect x="2" y="6" width="3" height="2" fill="#5D8C32"/>
            <rect x="2" y="9" width="3" height="2" fill="#5D8C32"/>
            <rect x="7" y="6" width="6" height="1" fill="#555"/>
            <rect x="7" y="8" width="4" height="1" fill="#555"/>
            <rect x="7" y="10" width="5" height="1" fill="#555"/>
          </svg>
          <span class="server-text">{{ t('home.serverLabel') }}: {{ serverIp || t('home.serverNotConfigured') }}</span>
        </div>

        <button
          class="mc-btn mc-btn-primary launch-btn"
          @click="handleLaunch"
          :disabled="launching"
        >
          <svg v-if="!launching" viewBox="0 0 16 16" width="16" height="16" class="play-icon">
            <polygon points="3,1 13,8 3,15" fill="currentColor"/>
          </svg>
          {{ launching ? t('home.launching') : t('home.play') }}
        </button>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { t } from '../i18n'
import api from '../api'

const router = useRouter()
const userStore = useUserStore()
const emit = defineEmits(['showLogin'])

// 日志过滤器
const LOG_FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'launcher', label: '启动器' },
  { key: 'client', label: '客户端' },
  { key: 'important', label: '警告+' },
  { key: 'error', label: '错误' },
]

// 状态
const javaStatus = ref({ found: false, version: null })
const gameInstalled = ref(false)
const modsStatus = ref('unknown')
const currentTask = ref('')
const progressPercent = ref(0)
const progressMessage = ref('')
const logs = ref([])          // { time, level, text, display }
const logFilter = ref('all')
const launching = ref(false)
const logContainer = ref(null)
const serverUrl = ref('')
const serverIp = ref('加载中...')
const announcements = ref([])
const ipcCleanups = []

const modsStatusText = computed(() => {
  const map = {
    unknown: t('home.modsUnknown'),
    checking: t('home.modsChecking'),
    synced: t('home.modsSynced'),
    outdated: t('home.modsOutdated'),
  }
  return map[modsStatus.value] || modsStatus.value
})

const filteredLogs = computed(() => {
  const f = logFilter.value
  if (f === 'all') return logs.value
  if (f === 'launcher') return logs.value.filter(l => l.source === 'launcher')
  if (f === 'client') return logs.value.filter(l => l.source === 'client')
  if (f === 'important') return logs.value.filter(l => l.level !== 'INFO' && l.level !== 'DEBUG' && l.level !== 'LAUNCHER')
  if (f === 'error') return logs.value.filter(l => l.level === 'ERROR' || l.level === 'FATAL')
  return logs.value
})

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// 自动滚动日志
watch(filteredLogs, async () => {
  await nextTick()
  if (logContainer.value) {
    logContainer.value.scrollTop = logContainer.value.scrollHeight
  }
}, { deep: true })

onMounted(async () => {
  // 初始化机器ID（无需登录）
  await userStore.initMachineId()

  // 获取应用配置（后端 API 地址）
  try {
    const config = await window.electronAPI.getAppConfig()
    serverUrl.value = config.serverUrl
    api.setBaseURL(config.serverUrl)
  } catch (e) {
    serverUrl.value = 'http://mc.sivita.xyz:5806'
  }

  addLog(t('home.logInit'))

  // 并行: 检测 Java、检查游戏、拉取公告、获取服务器配置
  const tasks = []

  tasks.push(
    (async () => {
      try {
        javaStatus.value = await window.electronAPI.detectJava()
        addLog(javaStatus.value.found
          ? t('home.logJavaFound', { version: javaStatus.value.version, source: javaStatus.value.source })
          : t('home.logJavaNotFound')
        )
      } catch (e) {
        addLog(t('home.logJavaDetectError', { error: e.message }))
      }
    })()
  )

  tasks.push(
    (async () => {
      try {
        gameInstalled.value = await window.electronAPI.isGameInstalled()
        addLog(gameInstalled.value ? t('home.logGameInstalled') : t('home.logGameNotInstalled'))
      } catch (e) {
        addLog(t('home.logGameCheckError', { error: e.message }))
      }
    })()
  )

  tasks.push(
    (async () => {
      try {
        const data = await api.getAnnouncements()
        announcements.value = data.announcements || []
      } catch (_) {
        // 公告获取失败静默处理
      }
    })()
  )

  // 从后端同步配置获取 MC 服务器 IP
  tasks.push(
    (async () => {
      try {
        const res = await fetch(`${serverUrl.value}/sync/config`)
        const syncConfig = await res.json()
        if (syncConfig.server_ip) {
          serverIp.value = syncConfig.server_ip
          addLog(`服务器地址: ${syncConfig.server_ip}`)
        }
      } catch (_) {
        serverIp.value = 'mc.sivita.xyz'
      }
    })()
  )

  // 检查模组同步状态
  tasks.push(
    (async () => {
      try {
        modsStatus.value = 'checking'
        const result = await window.electronAPI.checkSync(serverUrl.value)
        if (result.success) {
          modsStatus.value = result.needsSync ? 'outdated' : 'synced'
          if (result.needsSync) {
            addLog(`模组状态: 需要同步 (${result.toDownload} 个待下载, ${result.toDelete} 个待删除)`)
          } else {
            addLog('模组状态: 已是最新')
          }
        } else {
          modsStatus.value = 'unknown'
        }
      } catch (_) {
        modsStatus.value = 'unknown'
      }
    })()
  )

  await Promise.all(tasks)

  // 注册所有进度回调（只注册一次），保存 cleanup 函数
  const cleanups = []

  cleanups.push(window.electronAPI.onJavaProgress((data) => {
    currentTask.value = t('home.installingJava')
    progressPercent.value = data.percent
    progressMessage.value = data.message
  }))

  cleanups.push(window.electronAPI.onGameProgress((data) => {
    currentTask.value = t('home.installingGame')
    progressPercent.value = data.percent
    progressMessage.value = data.message
    if (data.stage === 'done') {
      gameInstalled.value = true
      setTimeout(() => { currentTask.value = '' }, 2000)
    }
  }))

  cleanups.push(window.electronAPI.onModsProgress((data) => {
    currentTask.value = t('home.syncingMods')
    progressPercent.value = data.percent
    progressMessage.value = data.message
    if (data.stage === 'done') {
      modsStatus.value = 'synced'
      setTimeout(() => { currentTask.value = '' }, 2000)
    }
  }))

  // 通用同步进度回调（支持多文件夹）
  cleanups.push(window.electronAPI.onSyncProgress((data) => {
    const folderName = data.folderName || '文件'
    currentTask.value = `正在同步: ${folderName}`
    progressPercent.value = data.percent
    progressMessage.value = data.message
    if (data.stage === 'done') {
      modsStatus.value = 'synced'
    }
  }))

  // 环境准备进度回调（只更新进度条，不写日志，详细日志由 onGameLog 负责）
  cleanups.push(window.electronAPI.onPrepareProgress((data) => {
    currentTask.value = data.message
    progressPercent.value = Math.round(data.percent)
    progressMessage.value = data.message
  }))

  // 启动进度回调（只更新进度条，不写日志）
  cleanups.push(window.electronAPI.onLaunchProgress((data) => {
    currentTask.value = data.message
    progressPercent.value = Math.round(data.percent)
    progressMessage.value = data.message

    if (data.stage === 'done') {
      gameInstalled.value = true
      modsStatus.value = 'synced'
      setTimeout(() => { currentTask.value = '' }, 3000)
    }
    if (data.stage === 'error') {
      setTimeout(() => { currentTask.value = '' }, 5000)
    }
  }))

  cleanups.push(window.electronAPI.onGameLog((data) => {
    addLog(data)
  }))

  ipcCleanups.push(...cleanups)
})

onUnmounted(() => {
  ipcCleanups.forEach(fn => fn && fn())
  ipcCleanups.length = 0
})

function addLog(msg) {
  const time = new Date().toLocaleTimeString('en-US', { hour12: false })
  let level = 'LAUNCHER'
  let text = msg
  let source = 'launcher'

  // 结构化数据（来自游戏进程）
  if (msg && typeof msg === 'object') {
    level = msg.level || 'INFO'
    text = msg.text || ''
    source = 'client'
  }

  logs.value.push({
    time,
    level,
    text,
    source,
    display: `[${time}] ${text}`,
  })
  if (logs.value.length > 300) {
    logs.value = logs.value.slice(-150)
  }
}

async function handleLaunch() {
  // 防止重复点击
  if (launching.value) {
    addLog('启动中，请勿重复点击')
    return
  }

  launching.value = true
  addLog(t('home.logStartLaunch'))

  try {
    // 第一步：环境准备（Java + 游戏文件 + Mods，无需登录）
    addLog(t('home.logPreparingEnvironment'))
    const prepareResult = await window.electronAPI.prepareEnvironment(serverUrl.value)

    if (!prepareResult.success) {
      addLog(t('home.logError', { error: prepareResult.error }))
      launching.value = false
      return
    }

    addLog(t('home.logEnvironmentReady'))

    // 第二步：检查登录状态
    if (!userStore.isLoggedIn) {
      addLog(t('home.logNeedLogin'))
      launching.value = false
      // 触发登录弹窗
      await showLoginAndWait()
      // 重新设置 launching 状态
      launching.value = true
      // 登录成功后继续启动
      if (!userStore.isLoggedIn) {
        addLog(t('home.logLaunchCancelled'))
        launching.value = false
        return
      }
    }

    // 第三步：启动游戏（环境已准备好，仅启动）
    addLog(t('home.logLaunchingGame'))
    const result = await window.electronAPI.launchGame(
      userStore.username,
      userStore.token,
      serverIp.value
    )

    if (result.success) {
      addLog(t('home.logLaunched'))
    } else {
      addLog(t('home.logError', { error: result.error }))
    }
  } catch (e) {
    addLog(t('home.logError', { error: e.message }))
  } finally {
    launching.value = false
  }
}

// 显示登录弹窗并等待用户操作
function showLoginAndWait() {
  return new Promise((resolve) => {
    emit('showLogin')

    const stopWatch = watch(
      () => userStore.isLoggedIn,
      (loggedIn) => {
        if (loggedIn) {
          stopWatch()
          clearTimeout(timer)
          resolve(true)
        }
      }
    )

    // 超时兜底（10分钟）
    const timer = setTimeout(() => {
      stopWatch()
      resolve(false)
    }, 600000)
  })
}

function handleLogout() {
  userStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.home-page {
  display: flex;
  height: calc(100vh - 42px);
  background: var(--bg-primary);
}

/* ===== 左侧面板 ===== */
.sidebar {
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.6);
  border: none;
  border-right: 3px solid #000;
  box-shadow: inset -3px 0 0 0 #222;
  padding: 16px;
}

.player-section {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 14px;
  border-bottom: 2px solid #333;
  margin-bottom: 14px;
}

.player-avatar {
  flex-shrink: 0;
}

.avatar-svg {
  image-rendering: pixelated;
  border: 2px solid #555;
  box-shadow:
    inset -2px -2px 0 0 #333,
    inset 2px 2px 0 0 #777;
}

.player-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.player-name {
  font-family: var(--font-heading);
  font-size: 9px;
  color: var(--mc-gold);
  text-shadow: 1px 1px 0 rgba(0,0,0,0.5);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-status {
  font-family: var(--font-body);
  font-size: 15px;
  letter-spacing: 1px;
}

.player-status.online {
  color: var(--mc-grass-light);
  text-shadow: 0 0 6px rgba(126,200,80,0.4);
}

.player-status.offline {
  color: var(--text-muted);
}

/* 状态列表 */
.status-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: rgba(255,255,255,0.03);
  border: 1px solid #333;
}

.status-icon {
  flex-shrink: 0;
  image-rendering: pixelated;
}

.status-label {
  font-family: var(--font-heading);
  font-size: 7px;
  color: var(--text-secondary);
  flex: 1;
}

.status-value {
  font-family: var(--font-body);
  font-size: 15px;
  text-align: right;
}

.text-green { color: var(--mc-grass-light); }
.text-red { color: var(--mc-redstone); }
.text-yellow { color: var(--mc-gold); }

/* 登出按钮 */
.logout-btn {
  margin-top: auto;
  font-size: 9px;
  padding: 8px;
  min-height: 36px;
}

/* ===== 右侧主区域 ===== */
.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* 横幅 */
.banner {
  height: 120px;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  border-bottom: 3px solid #000;
}

.banner-bg {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg,
      #1a1a3e 0%,
      #2d2d5e 30%,
      #4a6741 70%,
      #3B5E1F 85%,
      #2d4517 100%
    );
}

.banner-bg::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 24px;
  background-color: #866043;
  background-image:
    radial-gradient(ellipse 3px 3px at 4px 4px, #593D29 50%, transparent 50%),
    radial-gradient(ellipse 3px 3px at 12px 14px, #9B7653 50%, transparent 50%);
  background-size: 20px 16px;
  image-rendering: pixelated;
  border-top: 4px solid #5D8C32;
}

.banner-bg::before {
  content: '';
  position: absolute;
  top: 10px;
  left: 0;
  right: 0;
  height: 40px;
  background-image:
    radial-gradient(1px 1px at 10% 20%, #fff 100%, transparent 100%),
    radial-gradient(1px 1px at 25% 60%, #fff 100%, transparent 100%),
    radial-gradient(1px 1px at 40% 15%, #fff 100%, transparent 100%),
    radial-gradient(1px 1px at 55% 50%, #fff 100%, transparent 100%),
    radial-gradient(1px 1px at 70% 25%, #fff 100%, transparent 100%),
    radial-gradient(1px 1px at 85% 45%, #fff 100%, transparent 100%),
    radial-gradient(2px 2px at 15% 40%, #FFE4AA 100%, transparent 100%),
    radial-gradient(2px 2px at 60% 30%, #FFE4AA 100%, transparent 100%),
    radial-gradient(2px 2px at 90% 10%, #FFE4AA 100%, transparent 100%);
  image-rendering: pixelated;
}

.banner-content {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  z-index: 1;
  padding-bottom: 20px;
  gap: 16px;
}

.banner-logo {
  width: 80px;
  height: 80px;
  image-rendering: pixelated;
  filter: drop-shadow(3px 3px 0 rgba(0,0,0,0.5));
}

.banner-text {
  display: flex;
  flex-direction: column;
}

.banner-title {
  font-family: var(--font-heading);
  font-size: 24px;
  color: var(--mc-gold);
  text-shadow:
    3px 3px 0 #8B6914,
    4px 4px 0 rgba(0,0,0,0.6);
  letter-spacing: 4px;
}

.banner-version {
  font-family: var(--font-body);
  font-size: 20px;
  color: var(--text-secondary);
  text-shadow: 1px 1px 0 rgba(0,0,0,0.8);
  margin-top: 4px;
}

/* 操作区域 */
.action-area {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ===== 公告区域 ===== */
.announcement-section {
  padding: 12px 14px;
}

.announcement-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.announcement-icon {
  image-rendering: pixelated;
  flex-shrink: 0;
}

.announcement-title {
  font-family: var(--font-heading);
  font-size: 8px;
  color: var(--mc-gold);
  text-shadow: 1px 1px 0 rgba(0,0,0,0.5);
}

.announcement-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 120px;
  overflow-y: auto;
}

.announcement-item {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  padding: 6px 8px;
  background: rgba(255,255,255,0.03);
  border-left: 3px solid var(--mc-grass);
}

.announcement-item.important {
  border-left-color: var(--mc-redstone);
  background: rgba(255,51,51,0.05);
}

.ann-date {
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.ann-title {
  font-family: var(--font-body);
  font-size: 18px;
  color: var(--text-primary);
  flex: 1;
}

.ann-content {
  width: 100%;
  font-family: var(--font-body);
  font-size: 16px;
  color: var(--text-secondary);
  margin-top: 2px;
}

/* 进度区域 */
.progress-section {
  padding: 12px 14px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.progress-title {
  font-family: var(--font-heading);
  font-size: 9px;
  color: var(--text-primary);
  text-shadow: 1px 1px 0 rgba(0,0,0,0.5);
}

.progress-percent {
  font-family: var(--font-heading);
  font-size: 9px;
  color: var(--mc-grass-light);
}

.progress-detail {
  font-family: var(--font-body);
  font-size: 16px;
  color: var(--text-secondary);
  margin-top: 6px;
}

/* 日志区域 */
.log-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 10px 12px;
  min-height: 100px;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.log-title {
  font-family: var(--font-heading);
  font-size: 8px;
  color: var(--text-secondary);
}

.log-clear {
  font-size: 7px;
  padding: 3px 10px;
  min-height: auto;
}

.log-content {
  flex: 1;
  overflow-y: auto;
  background: #000;
  border: 2px solid #222;
  padding: 8px;
  font-family: var(--font-body);
  font-size: 15px;
  color: var(--mc-grass-light);
  line-height: 1.5;
}

.log-line {
  word-break: break-all;
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 1px 0;
  border-bottom: 1px solid rgba(255,255,255,0.03);
}

/* 来源标签 */
.log-tag {
  flex-shrink: 0;
  font-family: var(--font-heading);
  font-size: 6px;
  padding: 1px 4px;
  border: 1px solid;
  letter-spacing: 0;
}

.tag-launcher {
  color: var(--mc-diamond);
  border-color: rgba(93,236,242,0.3);
  background: rgba(93,236,242,0.1);
}

.tag-client {
  color: var(--mc-gold);
  border-color: rgba(252,219,5,0.3);
  background: rgba(252,219,5,0.1);
}

/* 日志级别颜色 */
.log-LAUNCHER { color: var(--mc-diamond); }
.log-INFO { color: var(--mc-grass-light); opacity: 0.7; }
.log-WARN { color: var(--mc-gold); }
.log-ERROR, .log-FATAL { color: var(--mc-redstone); font-weight: bold; }
.log-DEBUG { color: var(--text-muted); opacity: 0.5; }

/* 日志过滤按钮 */
.log-filters {
  display: flex;
  gap: 4px;
}

.log-filter-btn {
  font-size: 6px;
  padding: 2px 8px;
  min-height: auto;
  background: transparent;
  border: 1px solid #444;
  box-shadow: none;
  color: var(--text-muted);
  letter-spacing: 0;
}

.log-filter-btn.active {
  background: var(--mc-grass-dark);
  border-color: var(--mc-grass);
  color: var(--mc-grass-light);
  box-shadow: inset -1px -1px 0 0 #2a4a12, inset 1px 1px 0 0 #7EC850;
}

/* 空状态 */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  opacity: 0.6;
}

.empty-icon {
  image-rendering: pixelated;
}

.empty-text {
  font-family: var(--font-heading);
  font-size: 12px;
  color: var(--text-secondary);
  text-shadow: 1px 1px 0 rgba(0,0,0,0.5);
}

.empty-hint {
  font-family: var(--font-body);
  font-size: 18px;
  color: var(--text-muted);
}

/* ===== 底部启动栏 ===== */
.launch-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: rgba(0, 0, 0, 0.5);
  border-top: 3px solid #000;
  box-shadow: inset 0 3px 0 0 #222;
}

.server-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-body);
  font-size: 16px;
  color: var(--text-secondary);
}

.server-info svg {
  image-rendering: pixelated;
  flex-shrink: 0;
}

.launch-btn {
  padding: 12px 48px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.play-icon {
  flex-shrink: 0;
}
</style>
