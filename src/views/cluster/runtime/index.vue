<template>
  <div class="app-container">
    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="el-icon-refresh" size="mini" @click="handleQuery">刷新</el-button>
      </el-col>
    </el-row>

    <el-table v-loading="loading" :data="runtimeList" stripe>
      <el-table-column label="pod名称" prop="podName" min-width="130" />
      <el-table-column label="命名空间" prop="namespace" width="100" />
      <el-table-column label="状态" prop="status" width="100" align="center">
        <template slot-scope="scope">
          <el-tag size="mini" :type="statusType(scope.row.status)">{{ scope.row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="副本" width="90" align="center">
        <template slot-scope="scope">
          {{ scope.row.readyReplicas || 0 }}/{{ scope.row.desiredReplicas || 0 }}
        </template>
      </el-table-column>
      <el-table-column label="节点" prop="nodeName" min-width="130" />
      <el-table-column label="架构" prop="arch" width="90" align="center">
        <template slot-scope="scope">
          <el-tag size="mini" :type="scope.row.arch === 'AMD' ? 'warning' : 'success'">{{ scope.row.arch }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="镜像" prop="image" min-width="180" show-overflow-tooltip />
      <el-table-column label="最近部署" prop="lastDeployTime" width="160" />
      <el-table-column label="操作" width="220" align="center" fixed="right">
        <template slot-scope="scope">
          <el-button size="mini" type="info" icon="el-icon-document" @click="handleLogs(scope.row)">日志</el-button>
          <el-button size="mini" type="warning" icon="el-icon-bell" @click="handleEvents(scope.row)">事件</el-button>
          <el-button size="mini" type="warning" icon="el-icon-video-pause" @click="handleStop(scope.row)">停用</el-button>
          <el-button size="mini" type="success" icon="el-icon-video-play" @click="handleStart(scope.row)">启用</el-button>
          <el-button size="mini" type="danger" icon="el-icon-delete" @click="handleDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 日志对话框 -->
    <el-dialog :title="'日志 - ' + currentPodName" :visible.sync="logOpen" width="860px" append-to-body>
      <pre class="log-pre">{{ logContent || '暂无日志' }}</pre>
      <div slot="footer">
        <el-button type="primary" icon="el-icon-refresh" @click="loadLogs">刷新</el-button>
        <el-button @click="logOpen = false">关闭</el-button>
      </div>
    </el-dialog>

    <!-- 事件对话框 -->
    <el-dialog :title="'事件 - ' + currentPodName" :visible.sync="eventOpen" width="860px" append-to-body>
      <el-table v-loading="eventLoading" :data="eventList" stripe size="small">
        <el-table-column label="类型" prop="type" width="100">
          <template slot-scope="scope">
            <el-tag size="mini" :type="scope.row.type === 'Warning' ? 'warning' : 'info'">{{ scope.row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="原因" prop="reason" width="160" />
        <el-table-column label="消息" prop="message" min-width="280" show-overflow-tooltip />
        <el-table-column label="次数" prop="count" width="70" align="center" />
        <el-table-column label="最近时间" prop="lastTimestamp" width="160" />
      </el-table>
      <div slot="footer">
        <el-button type="primary" icon="el-icon-refresh" @click="loadEvents">刷新</el-button>
        <el-button @click="eventOpen = false">关闭</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { listRuntimePods, getPodLogs, getPodEvents, stopPodConfig, startPodConfig, deleteInstance, listNamespaces } from '@/api/cluster'

export default {
  name: 'ClusterRuntime',
  data() {
    return {
      loading: false,
      runtimeList: [],
      logOpen: false,
      eventOpen: false,
      eventLoading: false,
      currentPodName: '',
      currentConfigId: null,
      logContent: '',
      eventList: []
    }
  },
  created() {
    this.getList()
  },
  methods: {
    getList() {
      this.loading = true
      listRuntimePods().then(res => {
        this.runtimeList = res.data || []
        this.loading = false
      }).catch(() => {
        this.loading = false
      })
    },
    handleQuery() {
      this.getList()
    },
    statusType(status) {
      if (status === '运行中') return 'success'
      if (status === '已停止') return 'info'
      if (status === '部署中') return 'warning'
      return 'danger'
    },
    handleLogs(row) {
      this.currentPodName = row.podName
      this.currentConfigId = row.podConfigId
      this.logOpen = true
      this.logContent = ''
      this.loadLogs()
    },
    loadLogs() {
      getPodLogs(this.currentConfigId).then(res => {
        this.logContent = res.data || ''
      }).catch(() => {
        this.logContent = '日志查询失败'
      })
    },
    handleEvents(row) {
      this.currentPodName = row.podName
      this.currentConfigId = row.podConfigId
      this.eventOpen = true
      this.eventList = []
      this.loadEvents()
    },
    loadEvents() {
      this.eventLoading = true
      getPodEvents(this.currentConfigId).then(res => {
        this.eventList = res.data || []
        this.eventLoading = false
      }).catch(() => {
        this.eventList = []
        this.eventLoading = false
      })
    },
    handleStop(row) {
      this.$modal.confirm('确认停用该业务 pod？（缩容到 0）').then(() => {
        return stopPodConfig(row.podConfigId || row.id)
      }).then(() => {
        this.$modal.msgSuccess('停用成功')
        this.getList()
      })
    },
    handleStart(row) {
      this.$modal.confirm('确认启用该业务 pod？（扩容到配置副本数）').then(() => {
        return startPodConfig(row.podConfigId || row.id)
      }).then(() => {
        this.$modal.msgSuccess('启用成功')
        this.getList()
      })
    },
    handleDelete(row) {
      this.$modal.confirm('删除实例将删除 K8s 资源（Deployment/Service/Ingress，不可恢复），配置保留，确认删除？').then(() => {
        return deleteInstance(row.podConfigId)
      }).then(() => {
        this.$modal.msgSuccess('删除成功')
        this.getList()
      })
    }
  }
}
</script>

<style scoped>
.log-pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: Menlo, Consolas, monospace;
  font-size: 12px;
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 12px;
  border-radius: 4px;
  max-height: 500px;
  overflow: auto;
}
</style>
