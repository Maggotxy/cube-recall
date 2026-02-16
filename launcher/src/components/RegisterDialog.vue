<template>
  <div v-if="visible" class="dialog-overlay" @click.self="close">
    <div class="register-dialog mc-panel">
      <!-- 关闭按钮 -->
      <button class="dialog-close" @click="close">×</button>

      <!-- Logo 和标题 -->
      <div class="dialog-header">
        <img src="@/assets/mclogo.png" alt="Cube Recall Logo" class="dialog-logo" />
        <h2>{{ t('register.title') }}</h2>
        <p class="dialog-sub">{{ t('register.subtitle') }}</p>
      </div>

      <!-- 注册表单 -->
      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <label>{{ t('register.username') }}</label>
          <input
            class="mc-input"
            v-model="form.username"
            :placeholder="t('register.usernamePlaceholder')"
            autocomplete="username"
          />
          <p class="field-hint">{{ t('register.usernameHint') }}</p>
        </div>

        <div class="form-group">
          <label>{{ t('register.password') }}</label>
          <input
            class="mc-input"
            v-model="form.password"
            type="password"
            :placeholder="t('register.passwordPlaceholder')"
            autocomplete="new-password"
          />
        </div>

        <div class="form-group">
          <label>{{ t('register.confirmPassword') }}</label>
          <input
            class="mc-input"
            v-model="form.confirmPassword"
            type="password"
            :placeholder="t('register.confirmPlaceholder')"
            autocomplete="new-password"
          />
        </div>

        <p v-if="error" class="msg-error">{{ error }}</p>
        <p v-if="success" class="msg-success">{{ success }}</p>

        <button
          class="mc-btn mc-btn-primary mc-btn-full"
          type="submit"
          :disabled="loading"
        >
          {{ loading ? t('register.submitting') : t('register.submit') }}
        </button>
      </form>

      <!-- 返回登录 -->
      <div class="dialog-footer">
        <span>{{ t('register.haveAccount') }}</span>
        <button class="link-btn" @click="switchToLogin">{{ t('register.backToLogin') }}</button>
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

const emit = defineEmits(['close', 'success', 'switchToLogin'])

const userStore = useUserStore()
const form = ref({ username: '', password: '', confirmPassword: '' })
const error = ref('')
const success = ref('')
const loading = ref(false)

// 监听 visible 变化，重置表单
watch(() => props.visible, (val) => {
  if (val) {
    form.value = { username: '', password: '', confirmPassword: '' }
    error.value = ''
    success.value = ''
  }
})

async function handleRegister() {
  error.value = ''
  success.value = ''

  if (!form.value.username || !form.value.password || !form.value.confirmPassword) {
    error.value = t('register.errorEmpty')
    return
  }

  const usernameRegex = /^[a-zA-Z0-9_]{3,16}$/
  if (!usernameRegex.test(form.value.username)) {
    error.value = t('register.errorUsername')
    return
  }

  if (form.value.password.length < 6) {
    error.value = t('register.errorPasswordLength')
    return
  }

  if (form.value.password !== form.value.confirmPassword) {
    error.value = t('register.errorPasswordMatch')
    return
  }

  loading.value = true
  try {
    await userStore.register(form.value.username, form.value.password)
    success.value = t('register.success')
    setTimeout(() => {
      emit('success')
      emit('switchToLogin')
    }, 1500)
  } catch (e) {
    error.value = e.response?.data?.detail || e.message || t('register.errorFailed')
  } finally {
    loading.value = false
  }
}

function close() {
  emit('close')
}

function switchToLogin() {
  emit('switchToLogin')
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

.register-dialog {
  width: 400px;
  padding: 24px;
  background: rgba(0, 0, 0, 0.85);
  border: 3px solid #555;
  box-shadow: inset -3px -3px 0 0 #222, inset 3px 3px 0 0 #666;
  position: relative;
  max-height: 90vh;
  overflow-y: auto;
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
  margin-bottom: 6px;
}

.dialog-sub {
  font-family: var(--font-body);
  font-size: 16px;
  color: var(--text-secondary);
}

.form-group {
  margin-bottom: 14px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-family: var(--font-body);
  font-size: 16px;
  color: var(--text-secondary);
}

.field-hint {
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

.msg-success {
  font-family: var(--font-body);
  font-size: 16px;
  color: var(--mc-grass-light);
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
