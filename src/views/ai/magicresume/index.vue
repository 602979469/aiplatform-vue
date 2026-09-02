<template>
  <div class="tool-frame-container">
    <iframe
      :src="url"
      class="tool-frame"
      title="魔方简历"
    />
  </div>
</template>

<script>
export default {
  name: 'AiMagicResume',
  data() {
    return {
      url: 'https://jianli.jakt.online/app/dashboard/resumes'
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
