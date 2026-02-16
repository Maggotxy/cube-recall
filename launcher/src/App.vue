<template>
  <div class="app-container">
    <!-- MC 风格标题栏 -->
    <div class="title-bar">
      <div class="title-bar-drag">
        <img src="@/assets/mclogo.png" alt="" class="title-icon" />
        <span class="title-text">Cube Recall</span>
        <span class="title-version">v{{ currentVersion }}</span>
      </div>

      <!-- 语言切换 -->
      <div class="lang-switch">
        <button
          v-for="opt in localeOptions"
          :key="opt.value"
          :class="['lang-btn', { active: currentLocale === opt.value }]"
          @click="setLocale(opt.value)"
        >
          {{ opt.value === 'zh-CN' ? '中' : 'EN' }}
        </button>
      </div>

      <!-- 登录按钮（未登录时显示） -->
      <button
        v-if="!userStore.isLoggedIn"
        class="login-btn-header"
        @click="showLoginDialog = true"
      >
        {{ t('app.login') }}
      </button>

      <div class="title-bar-buttons">
        <button class="title-btn" @click="minimize" :aria-label="t('titleBar.minimize')">
          <svg viewBox="0 0 12 12" width="12" height="12"><rect x="1" y="5" width="10" height="2" fill="currentColor"/></svg>
        </button>
        <button class="title-btn" @click="maximize" :aria-label="t('titleBar.maximize')">
          <svg viewBox="0 0 12 12" width="12" height="12"><rect x="1" y="1" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2"/></svg>
        </button>
        <button class="title-btn title-btn-close" @click="closeWin" :aria-label="t('titleBar.close')">
          <svg viewBox="0 0 12 12" width="12" height="12">
            <line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="2"/>
            <line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- 草地分隔线 -->
    <div class="grass-strip"></div>

    <!-- 主内容 -->
    <div class="main-content">
      <router-view @showLogin="showLoginDialog = true" />
    </div>

    <!-- 登录弹窗 -->
    <LoginDialog
      :visible="showLoginDialog"
      @close="showLoginDialog = false"
      @success="onLoginSuccess"
      @switchToRegister="switchToRegister"
    />

    <!-- 注册弹窗 -->
    <RegisterDialog
      :visible="showRegisterDialog"
      @close="showRegisterDialog = false"
      @switchToLogin="switchToLogin"
    />

    <!-- 更新对话框 -->
    <UpdateDialog
      ref="updateDialogRef"
      :visible="showUpdateDialog"
      :updateInfo="updateInfo"
      :currentVersion="currentVersion"
      @close="showUpdateDialog = false"
      @download="handleDownloadUpdate"
      @install="handleInstallUpdate"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from './stores/user'
import { t, setLocale, currentLocale, localeOptions } from './i18n'
import LoginDialog from './components/LoginDialog.vue'
import RegisterDialog from './components/RegisterDialog.vue'
import UpdateDialog from './components/UpdateDialog.vue'

const userStore = useUserStore()
const showLoginDialog = ref(false)
const showRegisterDialog = ref(false)
const showUpdateDialog = ref(false)
const updateInfo = ref({})
const updateDialogRef = ref(null)

// 从 package.json 读取当前版本
const currentVersion = ref('1.0.0')

// 登录成功回调
function onLoginSuccess() {
  showLoginDialog.value = false
}

// 切换到注册
function switchToRegister() {
  showLoginDialog.value = false
  showRegisterDialog.value = true
}

// 切换到登录
function switchToLogin() {
  showRegisterDialog.value = false
  showLoginDialog.value = true
}

const minimize = () => window.electronAPI.minimize()
const maximize = () => window.electronAPI.maximize()
const closeWin = () => window.electronAPI.close()

// 自动更新相关
async function handleDownloadUpdate() {
  try {
    await window.electronAPI.downloadUpdate()
  } catch (err) {
    console.error('下载更新失败:', err)
    if (updateDialogRef.value) {
      updateDialogRef.value.setError(err.message || '下载失败')
    }
  }
}

function handleInstallUpdate() {
  window.electronAPI.installUpdate()
}

// 监听更新事件
onMounted(() => {
  // 获取当前版本
  window.electronAPI.getAppVersion()
    .then(ver => { currentVersion.value = ver })
    .catch(() => { currentVersion.value = '1.0.0' })

  // 监听更新可用事件
  window.electronAPI.onUpdateAvailable((data) => {
    console.log('发现新版本:', data)
    updateInfo.value = data
    showUpdateDialog.value = true
  })

  // 监听下载进度
  window.electronAPI.onUpdateProgress((progress) => {
    console.log('下载进度:', progress)
    if (updateDialogRef.value) {
      updateDialogRef.value.updateProgress(progress)
    }
  })

  // 监听下载完成
  window.electronAPI.onUpdateDownloaded((data) => {
    console.log('下载完成:', data)
    if (updateDialogRef.value) {
      updateDialogRef.value.setDownloaded()
    }
  })

  // 监听更新错误
  window.electronAPI.onUpdateError((error) => {
    console.error('更新错误:', error)
    if (updateDialogRef.value) {
      updateDialogRef.value.setError(error.message || '更新失败')
    }
  })
})
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
  overflow: hidden;
}

/* MC 风格标题栏 - 深色石砖质感 */
.title-bar {
  display: flex;
  align-items: center;
  height: 34px;
  background: #2A2A2A;
  border-bottom: 2px solid #000;
  box-shadow: inset 0 -2px 0 0 #1A1A1A, inset 0 1px 0 0 #3A3A3A;
  -webkit-app-region: no-drag;
  user-select: none;
  flex-shrink: 0;
}

.title-bar-drag {
  flex: 1;
  -webkit-app-region: drag;
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 10px;
  height: 100%;
}

.title-icon {
  width: 18px;
  height: 18px;
  image-rendering: pixelated;
  flex-shrink: 0;
}

.title-text {
  font-family: var(--font-heading);
  font-size: 9px;
  color: var(--mc-grass-light);
  text-shadow: 1px 1px 0 #000;
  letter-spacing: 1px;
}

.title-version {
  font-family: var(--font-body);
  font-size: 13px;
  color: #666;
  margin-left: 4px;
}

/* 语言切换 */
.lang-switch {
  display: flex;
  gap: 2px;
  margin-right: 8px;
}

.lang-btn {
  width: 28px;
  height: 22px;
  border: 2px solid #444;
  background: #333;
  color: #888;
  font-family: var(--font-body);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lang-btn:hover {
  background: #444;
  color: #ccc;
}

.lang-btn.active {
  background: var(--mc-grass-dark);
  border-color: var(--mc-grass);
  color: #fff;
}

/* 登录按钮 */
.login-btn-header {
  height: 24px;
  padding: 0 12px;
  margin-right: 8px;
  border: 2px solid var(--mc-grass);
  background: var(--mc-grass-dark);
  color: #fff;
  font-family: var(--font-body);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset -2px -2px 0 0 #2d4517, inset 2px 2px 0 0 #7EC850;
}

.login-btn-header:hover {
  background: var(--mc-grass);
  border-color: var(--mc-grass-light);
}

.login-btn-header:active {
  box-shadow: inset 2px 2px 0 0 #2d4517;
}

.title-bar-buttons {
  display: flex;
  height: 100%;
}

.title-btn {
  width: 42px;
  height: 100%;
  border: none;
  background: transparent;
  color: #888;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.title-btn:hover {
  background: rgba(255,255,255,0.08);
  color: #fff;
}
.title-btn-close:hover {
  background: var(--mc-redstone);
  color: #fff;
}

/* 草地分隔条 */
.grass-strip {
  height: 6px;
  flex-shrink: 0;
  background: repeating-linear-gradient(
    90deg,
    var(--mc-grass) 0px,
    var(--mc-grass) 6px,
    var(--mc-grass-dark) 6px,
    var(--mc-grass-dark) 12px,
    var(--mc-grass-light) 12px,
    var(--mc-grass-light) 18px
  );
  image-rendering: pixelated;
  border-bottom: 2px solid #000;
}

.main-content {
  flex: 1;
  overflow: auto;
}
</style>
