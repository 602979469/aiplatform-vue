/**
 * 移动端判定 mixin：用于抽屉方向/尺寸等需要随屏幕宽度切换的场景。
 */
export default {
  data() {
    return {
      isMobile: typeof window !== 'undefined' && isMobileEnv()
    }
  },
  mounted() {
    window.addEventListener('resize', this.handleScreenResize)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.handleScreenResize)
  },
  methods: {
    handleScreenResize() {
      this.isMobile = isMobileEnv()
    }
  }
}

/** 判断移动端环境：窄屏或移动 UA（App WebView 常见 UA 与手机浏览器都覆盖） */
function isMobileEnv() {
  if (typeof window === 'undefined') {
    return false
  }
  const ua = navigator.userAgent || ''
  const mobileUa = /Android|iPhone|iPad|iPod|Mobile|HarmonyOS|MicroMessenger|okhttp|Dalvik/i.test(ua)
  return mobileUa || window.innerWidth <= 768
}
