<template>
  <div v-if="visible" class="dialog-overlay" @click.self="close">
    <div class="login-dialog mc-panel">
      <!-- 关闭按钮 -->
      <button class="dialog-close" @click="close">×</button>

      <!-- Logo 和标题 -->
      <div class="dialog-header">
        <img src="@/assets/mclogo.png" alt="Cube Recall Logo" class="dialog-logo" />
        <h2>{{ t('login.title') }}</h2>
      </div>

      <!-- 登录表单 -->
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label>{{ t('login.username') }}</label>
          <input class="mc-input" v-model="form.username" autocomplete="username" />
          <p class="form-hint">{{ t('register.errorUsername') }}</p>
        </div>
        <div class="form-group">
          <label>{{ t('login.password') }}</label>
          <input class="mc-input" type="password" v-model="form.password" autocomplete="current-password" />
        </div>
        <p v-if="error" class="msg-error">{{ error }}</p>
        <button class="mc-btn mc-btn-primary mc-btn-full" type="submit" :disabled="loading">
          {{ loading ? t('login.submitting') : t('login.submit') }}
        </button>
      </form>

      <!-- 注册链接 -->
      <div class="dialog-footer">
        <span>{{ t('login.noAccount') }}</span>
        <button class="link-btn" @click="switchToRegister">{{ t('login.register') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useUserStore } from '../stores/user'
import { t } from '../i18n'

const props = defineProps({
  visible: Boolean
})

const emit = defineEmits(['close', 'success', 'switchToRegister'])

const userStore = useUserStore()
const form = ref({ username: '', password: '' })
const error = ref('')
const loading = ref(false)

// 监听 visible 变化，重置表单
watch(() => props.visible, (val) => {
  if (val) {
    form.value = { username: '', password: '' }
    error.value = ''
  }
})

async function handleLogin() {
  error.value = ''
  if (!form.value.username || !form.value.password) {
    error.value = t('login.errorEmpty')
    return
  }

  // 校验用户名格式（Minecraft 服务器兼容）
  const usernameRegex = /^[a-zA-Z0-9_]{3,16}$/
  if (!usernameRegex.test(form.value.username)) {
    error.value = t('register.errorUsername')
    return
  }
  loading.value = true
  try {
    await userStore.login(form.value.username, form.value.password)
    emit('success')
    emit('close')
  } catch (e) {
    error.value = e.response?.data?.detail || e.message || t('login.errorFailed')
  } finally {
    loading.value = false
  }
}

function close() {
  emit('close')
}

function switchToRegister() {
  emit('switchToRegister')
}
</script>

<style scoped>
/* MC 风格弹窗样式 */
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.login-dialog {
  width: 380px;
  padding: 24px;
  background: rgba(0, 0, 0, 0.85);
  border: 3px solid #555;
  box-shadow: inset -3px -3px 0 0 #222, inset 3px 3px 0 0 #666;
  position: relative;
}

.dialog-close {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border: 2px solid #555;
  background: #333;
  color: #ccc;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.dialog-close:hover {
  background: #444;
  border-color: #666;
}

.dialog-header {
  text-align: center;
  margin-bottom: 20px;
}

.dialog-logo {
  width: 120px;
  height: auto;
  margin-bottom: 12px;
  image-rendering: pixelated;
}

.dialog-header h2 {
  font-family: var(--font-heading);
  font-size: 14px;
  color: var(--mc-gold);
  text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.5);
  letter-spacing: 2px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-family: var(--font-body);
  font-size: 16px;
  color: var(--text-secondary);
}

.form-hint {
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--text-muted);
  margin-top: 4px;
}

.msg-error {
  font-family: var(--font-body);
  font-size: 16px;
  color: var(--mc-redstone);
  margin-bottom: 12px;
  text-align: center;
}

.dialog-footer {
  margin-top: 16px;
  text-align: center;
  font-family: var(--font-body);
  font-size: 16px;
  color: var(--text-secondary);
}

.link-btn {
  background: none;
  border: none;
  color: var(--mc-grass-light);
  cursor: pointer;
  text-decoration: underline;
  font-family: var(--font-body);
  font-size: 16px;
  margin-left: 4px;
}

.link-btn:hover {
  color: var(--mc-gold);
}
</style>
