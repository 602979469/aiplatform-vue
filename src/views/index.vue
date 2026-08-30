<template>
  <div class="app-container workbench">
    <!-- 顶部问候横幅 -->
    <div class="hero">
      <div class="hero-avatar">
        <el-avatar v-if="avatar" :size="56" :src="avatar" />
        <el-avatar v-else :size="56" class="hero-avatar-default">{{ avatarText }}</el-avatar>
      </div>
      <div class="hero-text">
        <h2 class="hero-title">{{ greeting }}，{{ nickName }}</h2>
        <p class="hero-desc">{{ todayText }} · 欢迎回到 {{ title }}，从下面快速开始今天的工作。</p>
      </div>
      <div class="hero-actions">
        <el-button size="medium" circle plain icon="el-icon-refresh" title="刷新数据" @click="refresh" />
      </div>
    </div>

    <!-- 集群节点信息 -->
    <div class="panel">
      <div class="panel-header">
        <span><i class="el-icon-s-platform panel-header-icon" />集群节点信息</span>
        <el-button type="text" size="mini" icon="el-icon-refresh" @click="refresh">刷新</el-button>
      </div>
      <div v-loading="dashboardLoading" class="node-grid">
        <div v-for="node in nodes" :key="node.nodeName" class="node-row">
          <div class="node-name-cell">
            <div class="node-name">{{ node.nodeName }}</div>
            <div class="node-meta">
              <el-tag size="mini" :type="node.role === 'control-plane' ? 'danger' : 'primary'">
                {{ node.role === 'control-plane' ? 'master' : node.role }}
              </el-tag>
              <el-tag size="mini" type="warning">{{ node.arch }}</el-tag>
              <el-tag size="mini" :type="node.status === 'Ready' ? 'success' : 'danger'">{{ node.status }}</el-tag>
            </div>
          </div>
          <div class="node-metric-cell">
            <div class="metric-label"><i class="el-icon-cpu" />CPU</div>
            <div class="metric-value">{{ nodeCpuPercent(node) }}<span class="stat-unit">%</span></div>
            <el-progress :percentage="nodeCpuPercent(node)" :stroke-width="6" :show-text="false" :status="nodeCpuStatus(node)" />
            <div class="metric-sub">{{ formatCpu(node.cpuUsedMilli) }} / {{ formatCpu(node.cpuTotalMilli) }}</div>
          </div>
          <div class="node-metric-cell">
            <div class="metric-label"><i class="el-icon-coin" />内存</div>
            <div class="metric-value">{{ nodeMemoryPercent(node) }}<span class="stat-unit">%</span></div>
            <el-progress :percentage="nodeMemoryPercent(node)" :stroke-width="6" :show-text="false" :status="nodeMemoryStatus(node)" />
            <div class="metric-sub">{{ formatBytes(node.memoryUsedBytes) }} / {{ formatBytes(node.memoryTotalBytes) }}</div>
          </div>
        </div>
        <div v-if="!dashboardLoading && nodes.length === 0" class="list-empty">
          <i class="el-icon-s-platform" />
          <p>暂无节点数据</p>
        </div>
      </div>
    </div>

    <!-- 快捷入口 -->
    <div class="panel">
      <div class="panel-header">
        <span><i class="el-icon-magic-stick panel-header-icon" />快捷入口</span>
      </div>
      <div class="quick-grid">
        <div
          v-for="item in quickLinks"
          :key="item.path"
          class="quick-card"
          :style="{ borderLeftColor: item.color }"
          @click="handleQuick(item)"
        >
          <div class="quick-icon" :style="{ background: item.bg, color: item.color }">
            <i :class="item.icon" />
          </div>
          <div class="quick-info">
            <div class="quick-name">{{ item.name }}</div>
            <div class="quick-desc">{{ item.desc }}</div>
          </div>
          <i class="el-icon-right quick-arrow" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getDashboard } from '@/api/cluster'

export default {
  name: 'Index',
  data() {
    return {
      title: process.env.VUE_APP_TITLE || 'AI工具箱',
      dashboard: {},
      dashboardLoading: false,
      quickLinks: [
        { name: 'AI 对话', desc: '与 AI 助手聊天', icon: 'el-icon-chat-dot-round', path: '/ai/chat', color: '#3b82f6', bg: '#eef4ff' },
        { name: '镜像加速器', desc: '搜索并拉取 Docker 镜像', icon: 'el-icon-connection', path: '/ai/mirror', color: '#22c55e', bg: '#f0fdf4' },
        { name: '集群大盘', desc: '查看集群资源使用', icon: 'el-icon-data-line', path: '/cluster/dashboard', color: '#8b5cf6', bg: '#f5f3ff' },
        { name: '实例管理', desc: '管理业务 Pod 部署', icon: 'el-icon-monitor', path: '/cluster/runtime', color: '#ec4899', bg: '#fdf2f8' },
        { name: '代码生成器', desc: '在线生成项目代码', icon: 'el-icon-cpu', path: 'https://generate.jakt.online/?embed=1&cluster=1', color: '#eab308', bg: '#fefce8' },
        { name: '魔方简历', desc: '在线制作个人简历', icon: 'el-icon-document', path: 'https://jianli.jakt.online/', color: '#06b6d4', bg: '#ecfeff' }
      ]
    }
  },
  computed: {
    nickName() {
      const user = this.$store.state.user || {}
      return user.nickName || user.name || '朋友'
    },
    avatar() {
      return this.$store.state.user && this.$store.state.user.avatar
    },
    avatarText() {
      return (this.nickName || '友').slice(0, 1)
    },
    greeting() {
      const hour = new Date().getHours()
      if (hour < 6) {
        return '夜深了'
      } else if (hour < 12) {
        return '早上好'
      } else if (hour < 14) {
        return '中午好'
      } else if (hour < 18) {
        return '下午好'
      }
      return '晚上好'
    },
    todayText() {
      const weekdays = ['日', '一', '二', '三', '四', '五', '六']
      const now = new Date()
      return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${weekdays[now.getDay()]}`
    },
    nodes() {
      return this.dashboard.nodes || []
    },
  },
  created() {
    this.refresh()
  },
  methods: {
    /** 拉取工作台全部数据，单项失败不影响其他模块展示 */
    refresh() {
      this.loadDashboard()
    },

    loadDashboard() {
      this.dashboardLoading = true
      getDashboard().then(response => {
        this.dashboard = response.data || {}
      }).catch(() => {
        this.dashboard = {}
      }).finally(() => {
        this.dashboardLoading = false
      })
    },

    /** 跳转内部路由或打开外部工具 */
    handleQuick(item) {
      if (/^https?:\/\//.test(item.path)) {
        window.open(item.path, '_blank')
      } else {
        this.go(item.path)
      }
    },

    go(path) {
      this.$router.push(path)
    },

    nodeCpuPercent(node) {
      const total = node.cpuTotalMilli || 0
      const used = node.cpuUsedMilli || 0
      return total > 0 ? Math.round((used / total) * 100) : 0
    },

    nodeCpuStatus(node) {
      const percent = this.nodeCpuPercent(node)
      return percent > 80 ? 'exception' : percent > 60 ? 'warning' : 'success'
    },

    nodeMemoryPercent(node) {
      const total = node.memoryTotalBytes || 0
      const used = node.memoryUsedBytes || 0
      return total > 0 ? Math.round((used / total) * 100) : 0
    },

    nodeMemoryStatus(node) {
      const percent = this.nodeMemoryPercent(node)
      return percent > 80 ? 'exception' : percent > 60 ? 'warning' : 'success'
    },

    formatCpu(milli) {
      if (milli === null || milli === undefined) {
        return '-'
      }
      return (milli / 1000).toFixed(2) + ' 核'
    },

    formatBytes(bytes) {
      if (bytes === null || bytes === undefined) {
        return '-'
      }
      const units = ['B', 'KB', 'MB', 'GB', 'TB']
      let i = 0
      let value = bytes
      while (value >= 1024 && i < units.length - 1) {
        value /= 1024
        i++
      }
      return value.toFixed(value >= 10 || i === 0 ? 0 : 1) + ' ' + units[i]
    }
  }
}
</script>

<style scoped>
.workbench {
  padding-bottom: 24px;
}

/* 顶部问候横幅 */
.hero {
  display: flex;
  align-items: center;
  border-radius: 8px;
  padding: 24px 28px;
  margin-bottom: 16px;
  color: #fff;
  background: linear-gradient(120deg, #2563eb 0%, #7c3aed 100%);
}
.hero-avatar {
  margin-right: 18px;
  flex-shrink: 0;
}
.hero-avatar-default {
  background: rgba(255, 255, 255, 0.25);
  color: #fff;
  font-size: 22px;
}
.hero-text {
  flex: 1;
  min-width: 0;
}
.hero-title {
  margin: 0 0 6px;
  font-size: 22px;
  font-weight: 600;
}
.hero-desc {
  margin: 0;
  font-size: 13px;
  opacity: 0.85;
}
.hero-actions {
  flex-shrink: 0;
}
.hero-actions .el-button--default {
  border-color: rgba(255, 255, 255, 0.7);
  background: transparent;
  color: #fff;
}
.hero-actions .el-button--default:hover,
.hero-actions .el-button--default:focus {
  border-color: #fff;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.stat-unit {
  font-size: 13px;
  font-weight: 400;
  color: #909399;
}

/* 集群节点信息 */
.node-grid {
  min-height: 60px;
}
.node-row {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr;
  gap: 16px;
  align-items: center;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 14px 18px;
  margin-bottom: 12px;
  background: #fafbfc;
}
.node-row:last-child {
  margin-bottom: 0;
}
.node-name-cell {
  min-width: 0;
}
.node-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 6px;
}
.node-meta .el-tag {
  margin-right: 6px;
}
.node-metric-cell {
  background: #fff;
  border: 1px solid #f0f2f5;
  border-radius: 6px;
  padding: 10px 14px;
}
.metric-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}
.metric-label i {
  margin-right: 4px;
}
.metric-value {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  line-height: 1.2;
}
.metric-sub {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.node-metric-cell .el-progress {
  margin-top: 6px;
}

/* 面板 */
.panel {
  background: #fff;
  border-radius: 8px;
  padding: 16px 16px 8px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  padding-bottom: 10px;
}
.panel-header-icon {
  margin-right: 6px;
  color: #409eff;
}
/* 快捷入口 */
.quick-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.quick-card {
  display: flex;
  align-items: center;
  border: 1px solid #ebeef5;
  border-left: 3px solid #dcdfe6;
  border-radius: 6px;
  padding: 12px;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.2s;
}
.quick-card:hover {
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}
.quick-icon {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 19px;
  margin-right: 10px;
  flex-shrink: 0;
}
.quick-info {
  flex: 1;
  min-width: 0;
}
.quick-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}
.quick-desc {
  margin-top: 2px;
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.quick-arrow {
  color: #c0c4cc;
  font-size: 14px;
  flex-shrink: 0;
}

.list-empty {
  padding: 32px 0;
  text-align: center;
  color: #c0c4cc;
}
.list-empty i {
  font-size: 30px;
}
.list-empty p {
  margin: 8px 0 0;
  font-size: 13px;
}

/* 小屏适配 */
@media (max-width: 1100px) {
  .quick-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 768px) {
  .hero {
    flex-wrap: wrap;
  }
  .hero-actions {
    margin-top: 14px;
    width: 100%;
  }
  .quick-grid,
  .node-row {
    grid-template-columns: 1fr;
  }
}
</style>
