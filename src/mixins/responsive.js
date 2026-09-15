/**
 * 移动端判定 mixin：用于抽屉方向/尺寸等需要随屏幕宽度切换的场景。
 */
export default {
  data() {
    return {
      isMobile: typeof window !== 'undefined' && window.innerWidth <= 768
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
      this.isMobile = window.innerWidth <= 768
    }
  }
}
