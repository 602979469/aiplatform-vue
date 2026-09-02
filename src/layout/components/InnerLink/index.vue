<template>
  <div :style="'height:' + height" v-loading="loading" element-loading-text="正在加载页面，请稍候！">
    <iframe
      :id="iframeId"
      style="width: 100%; height: 100%"
      :src="resolvedSrc"
      frameborder="no"
    ></iframe>
  </div>
</template>

<script>
export default {
  props: {
    src: {
      type: String,
      default: "/"
    },
    iframeId: {
      type: String
    }
  },
  data() {
    return {
      loading: false,
      height: document.documentElement.clientHeight - 94.5 + "px;"
    }
  },
  computed: {
    // 路由未传 props 时回退读 $route.meta.link（外链菜单）
    resolvedSrc() {
      if (this.src && this.src !== '/') {
        return this.src
      }
      const meta = this.$route && this.$route.meta
      return (meta && meta.link) || '/'
    }
  },
  mounted() {
    var _this = this
    const iframeId = ("#" + this.iframeId).replace(/\//g, "\\/")
    const iframe = document.querySelector(iframeId)
    // iframe页面loading控制
    if (iframe.attachEvent) {
      this.loading = true
      iframe.attachEvent("onload", function () {
        _this.loading = false
      })
    } else {
      this.loading = true
      iframe.onload = function () {
        _this.loading = false
      }
    }
  }
}
</script>
