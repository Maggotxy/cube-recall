<template>
  <div v-if="visible" class="dialog-overlay" @click.self="handleClose">
    <div class="mc-panel update-dialog">
      <div class="dialog-header">
        <h2 class="dialog-title">发现新版本</h2>
        <button class="close-btn" @click="handleClose">✕</button>
      </div>

      <div class="dialog-content">
        <div class="version-info">
          <span class="current-version">当前版本: v{{ currentVersion }}</span>
          <svg viewBox="0 0 16 16" width="16" height="16" class="arrow-icon">
            <polygon points="3,8 13,8" fill="#7EC850"/>
            <polygon points="10,5 13,8 10,11" fill="#7EC850"/>
          </svg>
          <span class="new-version">新版本: v{{ updateInfo.version }}</span>
        </div>

        <div v-if="updateInfo.releaseNotes" class="release-notes">
          <h3 class="notes-title">更新内容:</h3>
          <div class="notes-content">{{ updateInfo.releaseNotes }}</div>
        </div>

        <!-- 下载进度 -->
        <div v-if="isDownloading" class="download-progress">
          <div class="progress-header">
            <span class="progress-label">下载中...</span>
            <span class="progress-percent">{{ downloadPercent }}%</span>
          </div>
          <div class="mc-progress">
            <div class="mc-progress-bar" :style="{ width: downloadPercent + '%' }"></div>
          </div>
          <div class="progress-detail">
            {{ formatBytes(transferred) }} / {{ formatBytes(total) }}
            <span v-if="bytesPerSecond"> - {{ formatBytes(bytesPerSecond) }}/s</span>
          </div>
        </div>

        <!-- 错误信息 -->
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
      </div>

      <div class="dialog-actions">
        <button
          v-if="!isDownloaded && !isDownloading"
          class="mc-btn mc-btn-primary"
          @click="handleDownload"
        >
          立即更新
        </button>
        <button
          v-if="isDownloading"
          class="mc-btn"
          disabled
        >
          下载中...
        </button>
        <button
          v-if="isDownloaded"
          class="mc-btn mc-btn-success"
          @click="handleInstall"
        >
          重启并安装
        </button>
        <button
          v-if="!isDownloaded"
          class="mc-btn"
          @click="handleClose"
        >
          稍后提醒
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  updateInfo: {
    type: Object,
    default: () => ({})
  },
  currentVersion: {
    type: String,
    default: '1.0.0'
  }
})

const emit = defineEmits(['close', 'download', 'install'])

const isDownloading = ref(false)
const isDownloaded = ref(false)
const downloadPercent = ref(0)
const transferred = ref(0)
const total = ref(0)
const bytesPerSecond = ref(0)
const errorMessage = ref('')

const handleClose = () => {
  if (!isDownloading.value) {
    emit('close')
  }
}

const handleDownload = async () => {
  isDownloading.value = true
  errorMessage.value = ''
  emit('download')
}

const handleInstall = () => {
  emit('install')
}

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 暴露方法供父组件调用
defineExpose({
  updateProgress: (progress) => {
    downloadPercent.value = progress.percent
    transferred.value = progress.transferred
    total.value = progress.total
    bytesPerSecond.value = progress.bytesPerSecond
  },
  setDownloaded: () => {
    isDownloading.value = false
    isDownloaded.value = true
  },
  setError: (message) => {
    isDownloading.value = false
    errorMessage.value = message
  }
})
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.update-dialog {
  width: 500px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  background: rgba(40, 40, 40, 0.95);
  border: 3px solid #000;
  box-shadow:
    inset 3px 3px 0 0 #555,
    inset -3px -3px 0 0 #222,
    0 0 30px rgba(0, 0, 0, 0.8);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 2px solid #333;
  background: rgba(0, 0, 0, 0.3);
}

.dialog-title {
  font-family: var(--font-heading);
  font-size: 12px;
  color: var(--mc-gold);
  text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.5);
  letter-spacing: 2px;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.close-btn:hover {
  color: var(--mc-redstone);
}

.dialog-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.version-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid #333;
}

.current-version,
.new-version {
  font-family: var(--font-body);
  font-size: 18px;
}

.current-version {
  color: var(--text-secondary);
}

.new-version {
  color: var(--mc-grass-light);
  font-weight: bold;
}

.arrow-icon {
  image-rendering: pixelated;
  flex-shrink: 0;
}

.release-notes {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notes-title {
  font-family: var(--font-heading);
  font-size: 8px;
  color: var(--text-primary);
  text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.5);
}

.notes-content {
  font-family: var(--font-body);
  font-size: 16px;
  color: var(--text-secondary);
  padding: 12px;
  background: rgba(0, 0, 0, 0.3);
  border-left: 3px solid var(--mc-grass);
  white-space: pre-wrap;
  max-height: 200px;
  overflow-y: auto;
}

.download-progress {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-label {
  font-family: var(--font-heading);
  font-size: 8px;
  color: var(--text-primary);
}

.progress-percent {
  font-family: var(--font-heading);
  font-size: 8px;
  color: var(--mc-grass-light);
}

.progress-detail {
  font-family: var(--font-body);
  font-size: 15px;
  color: var(--text-secondary);
  text-align: center;
}

.error-message {
  padding: 12px;
  background: rgba(255, 51, 51, 0.1);
  border: 1px solid var(--mc-redstone);
  border-left: 3px solid var(--mc-redstone);
  font-family: var(--font-body);
  font-size: 16px;
  color: var(--mc-redstone);
}

.dialog-actions {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  border-top: 2px solid #333;
  background: rgba(0, 0, 0, 0.3);
}

.dialog-actions .mc-btn {
  flex: 1;
  font-size: 9px;
  padding: 10px;
}

.mc-btn-success {
  background: linear-gradient(180deg, var(--mc-grass-light) 0%, var(--mc-grass) 100%);
  border-color: var(--mc-grass);
}

.mc-btn-success:hover {
  background: linear-gradient(180deg, var(--mc-grass-light) 0%, var(--mc-grass-light) 100%);
}
</style>
