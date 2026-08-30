<template>
  <div class="app-container workbench">
    <div class="panel">
      <div class="panel-header">
        <span><i class="el-icon-s-platform panel-header-icon" />集群节点信息</span>
        <span class="panel-summary">共 {{ nodes.length }} 个节点 · {{ totalPods }} 个业务 Pod</span>
        <el-button type="text" size="mini" icon="el-icon-refresh" @click="handleQuery">刷新</el-button>
      </div>

      <div v-loading="loading" class="node-grid">
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

          <div class="node-metric-cell pod-cell">
            <div class="metric-label"><i class="el-icon-box" />业务 Pod</div>
            <div class="pod-count">{{ nodePodTotal(node) }}<span class="stat-unit"> 个</span></div>
            <div class="metric-sub">
              <span v-for="(count, ns) in node.podCountByNamespace" :key="ns" class="pod-ns">
                <el-tag size="mini" type="info">{{ ns }}: {{ count }}</el-tag>
              </span>
              <span v-if="nodePodTotal(node) === 0">-</span>
            </div>
          </div>
        </div>

        <div v-if="!loading && nodes.length === 0" class="list-empty">
          <i class="el-icon-s-platform" />
          <p>暂无节点数据</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getDashboard } from '@/api/cluster'

export default {
  name: 'ClusterDashboard',
  data() {
    return {
      loading: false,
      dashboard: {}
    }
  },
  computed: {
    nodes() {
      return this.dashboard.nodes || []
    },
    totalPods() {
      return this.nodes.reduce((sum, node) => sum + this.nodePodTotal(node), 0)
    }
  },
  created() {
    this.handleQuery()
  },
  methods: {
    handleQuery() {
      this.loading = true
      getDashboard().then(res => {
        this.dashboard = res.data || {}
      }).catch(() => {
        this.dashboard = {}
      }).finally(() => {
        this.loading = false
      })
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

    nodePodTotal(node) {
      const map = node.podCountByNamespace || {}
      return Object.values(map).reduce((sum, count) => sum + count, 0)
    },

    formatCpu(milli) {
      if (milli === null || milli === undefined) return '-'
      return (milli / 1000).toFixed(2) + ' 核'
    },

    formatBytes(bytes) {
      if (bytes === null || bytes === undefined) return '-'
      const units = ['B', 'KB', 'MB', 'GB', 'TB']
      let i = 0
      let value = bytes
      while (value >= 1024 && i < units.length - 1) {
        value /= 1024
        i++
      }
      return value.toFixed(1) + ' ' + units[i]
    }
  }
}
</script>

<style scoped>
.workbench {
  padding-bottom: 24px;
}

.panel {
  background: #fff;
  border-radius: 8px;
  padding: 16px 16px 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  padding-bottom: 12px;
}
.panel-header-icon {
  margin-right: 6px;
  color: #409eff;
}
.panel-summary {
  flex: 1;
  margin-left: 12px;
  font-size: 12px;
  font-weight: 400;
  color: #909399;
}

.node-grid {
  min-height: 60px;
}
.node-row {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr 1fr;
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
.stat-unit {
  font-size: 13px;
  font-weight: 400;
  color: #909399;
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

.pod-count {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  line-height: 1.2;
}
.pod-ns {
  margin-right: 4px;
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

@media (max-width: 1100px) {
  .node-row {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 768px) {
  .node-row {
    grid-template-columns: 1fr;
  }
}
</style>
