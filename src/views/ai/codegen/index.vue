<template>
  <div class="tool-frame-container">
    <iframe
      :src="url"
      class="tool-frame"
      title="代码生成器"
    />
  </div>
</template>

<script>
export default {
  name: 'AiCodegen',
  data() {
    return {
      url: 'https://generate.jakt.online/?embed=1&cluster=1'
    }
  }
}
</script>

<style scoped>
.tool-frame-container {
  height: 100%;
  width: 100%;
}
.tool-frame {
  width: 100%;
  height: calc(100vh - 84px);
  border: 0;
}
</style>
