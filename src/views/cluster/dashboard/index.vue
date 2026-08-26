<template>
  <div class="app-container">
    <!-- 资源概览 -->
    <el-row :gutter="16" class="mb8">
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-title">节点数量</div>
          <div class="stat-value">{{ dashboard.nodes ? dashboard.nodes.length : 0 }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-title">CPU 使用</div>
          <div class="stat-value">{{ cpuPercent }}%</div>
          <div class="stat-sub">{{ formatCpu(dashboard.cpuUsedMilli) }} / {{ formatCpu(dashboard.cpuTotalMilli) }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-title">内存使用</div>
          <div class="stat-value">{{ memoryPercent }}%</div>
          <div class="stat-sub">{{ formatBytes(dashboard.memoryUsedBytes) }} / {{ formatBytes(dashboard.memoryTotalBytes) }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-title">业务 Pod 总数</div>
          <div class="stat-value">{{ dashboard.podTotal || 0 }}</div>
          <div class="stat-sub">
            <el-tag size="mini" type="success">运行 {{ dashboard.podRunning || 0 }}</el-tag>
            <el-tag size="mini" type="info" style="margin-left:4px">停止 {{ dashboard.podStopped || 0 }}</el-tag>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 节点信息 -->
    <el-card shadow="never" class="mb8">
      <div slot="header" class="card-header">
        <span>节点信息</span>
        <el-button size="mini" icon="el-icon-refresh" @click="handleQuery">刷新</el-button>
      </div>
      <el-table v-loading="loading" :data="dashboard.nodes || []" stripe>
        <el-table-column prop="nodeName" label="节点名称" min-width="160" />
        <el-table-column prop="role" label="角色" width="100">
          <template slot-scope="scope">
            <el-tag size="mini" :type="scope.row.role === 'master' ? 'danger' : 'primary'">{{ scope.row.role }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="arch" label="架构" width="100">
          <template slot-scope="scope">
            <el-tag size="mini" :type="scope.row.arch === 'AMD' ? 'warning' : 'success'">{{ scope.row.arch }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template slot-scope="scope">
            <el-tag size="mini" :type="scope.row.status === 'Ready' ? 'success' : 'danger'">{{ scope.row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="业务 Pod 数量（按命名空间）" min-width="220">
          <template slot-scope="scope">
            <span v-for="(count, ns) in scope.row.podCountByNamespace" :key="ns" style="margin-right:8px">
              <el-tag size="mini" type="info">{{ ns }}: {{ count }}</el-tag>
            </span>
            <span v-if="!scope.row.podCountByNamespace || Object.keys(scope.row.podCountByNamespace).length === 0">-</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
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
    cpuPercent() {
      const total = this.dashboard.cpuTotalMilli || 0
      const used = this.dashboard.cpuUsedMilli || 0
      return total > 0 ? ((used / total) * 100).toFixed(1) : '0.0'
    },
    memoryPercent() {
      const total = this.dashboard.memoryTotalBytes || 0
      const used = this.dashboard.memoryUsedBytes || 0
      return total > 0 ? ((used / total) * 100).toFixed(1) : '0.0'
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
        this.loading = false
      }).catch(() => {
        this.loading = false
      })
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
.stat-title {
  font-size: 13px;
  color: #909399;
}
.stat-value {
  font-size: 26px;
  font-weight: 600;
  margin: 6px 0;
}
.stat-sub {
  font-size: 12px;
  color: #909399;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
