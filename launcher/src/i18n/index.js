import { ref, computed } from 'vue'
import zhCN from './zh-CN'
import enUS from './en-US'

const messages = {
  'zh-CN': zhCN,
  'en-US': enUS,
}

// 从 localStorage 读取保存的语言，默认中文
const savedLocale = typeof localStorage !== 'undefined'
  ? localStorage.getItem('mclauncher-locale') || 'zh-CN'
  : 'zh-CN'

const currentLocale = ref(savedLocale)

/**
 * 获取嵌套对象属性，支持 'a.b.c' 路径
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((o, key) => (o && o[key] !== undefined ? o[key] : null), obj)
}

/**
 * 翻译函数，支持插值：t('home.logJavaFound', { version: '17' })
 */
function t(key, params = {}) {
  const msg = getNestedValue(messages[currentLocale.value], key)
  if (msg === null || msg === undefined) {
    // fallback 到中文
    const fallback = getNestedValue(messages['zh-CN'], key)
    if (fallback === null || fallback === undefined) return key
    return interpolate(fallback, params)
  }
  return interpolate(msg, params)
}

function interpolate(str, params) {
  if (typeof str !== 'string') return str
  return str.replace(/\{(\w+)\}/g, (_, key) => {
    return params[key] !== undefined ? params[key] : `{${key}}`
  })
}

function setLocale(locale) {
  if (messages[locale]) {
    currentLocale.value = locale
    localStorage.setItem('mclauncher-locale', locale)
  }
}

function getLocale() {
  return currentLocale.value
}

const localeOptions = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en-US', label: 'English' },
]

export { t, setLocale, getLocale, currentLocale, localeOptions }
