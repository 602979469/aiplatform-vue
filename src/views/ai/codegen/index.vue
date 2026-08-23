<template>
  <div class="codegen-container">
    <iframe
      :src="url"
      class="codegen-frame"
      title="代码生成器"
    />
  </div>
</template>

<script>
export default {
  name: 'Codegen',
  data() {
    return {
      // 本机 hosts 已指向 192.168.3.131；其他设备需公网 DNS + :8080
      url: 'http://generate.jakt.online'
    }
  }
}
</script>

<style scoped>
.codegen-container {
  height: 100%;
  width: 100%;
}
.codegen-frame {
  width: 100%;
  height: calc(100vh - 84px);
  border: 0;
}
</style>
