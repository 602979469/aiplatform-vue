<template>
  <div class="app-container">
    <!-- 查询条件 -->
    <el-form :model="queryParams" ref="queryForm" size="small" :inline="true" v-show="showSearch" label-width="80px">
      <el-form-item label="资源名称" prop="resourceName">
        <el-input v-model="queryParams.resourceName" placeholder="请输入资源名称" clearable style="width: 200px" @keyup.enter.native="handleQuery" />
      </el-form-item>
      <el-form-item label="pod名称" prop="podName">
        <el-input v-model="queryParams.podName" placeholder="请输入pod名称" clearable style="width: 200px" @keyup.enter.native="handleQuery" />
      </el-form-item>
      <el-form-item label="命名空间" prop="namespace">
        <el-select v-model="queryParams.namespace" placeholder="全部" clearable style="width: 140px">
          <el-option v-for="ns in namespaceList" :key="ns" :label="ns" :value="ns" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="el-icon-search" size="mini" @click="handleQuery">搜索</el-button>
        <el-button icon="el-icon-refresh" size="mini" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="el-icon-plus" size="mini" @click="handleAdd">新增配置</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="el-icon-edit" size="mini" :disabled="editDisabled" @click="handleUpdateTop()">修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="primary" plain icon="el-icon-copy-document" size="mini" :disabled="copyDisabled" @click="handleCopyTop()">复制</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="el-icon-delete" size="mini" :disabled="multiple" @click="handleDelete">删除</el-button>
      </el-col>
      <right-toolbar :showSearch.sync="showSearch" @queryTable="getList" />
    </el-row>

    <el-table v-loading="loading" :data="configList" stripe @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="50" align="center" />
      <el-table-column label="ID" prop="id" width="70" />
      <el-table-column label="资源名称" prop="resourceName" min-width="120" />
      <el-table-column label="pod名称" prop="podName" min-width="120" />
      <el-table-column label="状态" prop="status" width="100" align="center">
        <template slot-scope="scope">
          <el-tag size="mini" :type="statusType(scope.row.status)">{{ statusText(scope.row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="命名空间" prop="namespace" width="90" />
      <el-table-column label="分支" prop="gitBranch" min-width="100" />
      <el-table-column label="自动刷新" width="90" align="center">
        <template slot-scope="scope">
          <el-tag size="mini" :type="scope.row.autoRefresh === 1 ? 'success' : 'info'">
            {{ scope.row.autoRefresh === 1 ? '开' : '关' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" prop="createTime" width="160" />
      <el-table-column label="操作" width="220" align="center" fixed="right">
        <template slot-scope="scope">
          <el-button v-if="scope.row.status !== 'DRAFT'" size="mini" type="warning" icon="el-icon-document" @click="handleBuildLog(scope.row)">日志</el-button>
          <el-button v-if="canDeploy(scope.row)" size="mini" type="primary" icon="el-icon-video-play" @click="handleDeploy(scope.row)">部署</el-button>
          <el-button size="mini" type="info" icon="el-icon-view" @click="handleView(scope.row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" :page.sync="queryParams.pageNum" :limit.sync="queryParams.pageSize" @pagination="getList" />

    <!-- 新增/修改对话框 -->
    <el-dialog :title="title" :visible.sync="open" width="1040px" append-to-body>
      <el-form ref="form" :model="form" :rules="rules" label-width="120px">
        <el-row>
          <el-col :span="12">
            <el-form-item label="资源名称" prop="resourceName">
              <el-input v-model="form.resourceName" placeholder="中文名，如：用户中心" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="pod名称" prop="podName">
              <el-input v-model="form.podName" placeholder="小写，如：user-center" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="命名空间" prop="namespace">
              <el-select v-model="form.namespace" placeholder="请选择" style="width: 100%">
                <el-option v-for="ns in namespaceList" :key="ns" :label="ns" :value="ns" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="git 地址" prop="gitUrl">
              <el-input v-model="form.gitUrl" placeholder="https://github.com/xxx/yyy.git（公开仓库无需 token；私有仓库请在地址中携带，如 https://用户名:token@github.com/xxx/yyy.git）" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="git 分支" prop="gitBranch">
              <el-input v-model="form.gitBranch" placeholder="如：main" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="自动刷新">
              <el-switch v-model="form.autoRefresh" :active-value="1" :inactive-value="0" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="备注">
              <el-input v-model="form.remark" placeholder="备注" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="Dockerfile" prop="dockerfile">
          <el-input v-model="form.dockerfile" type="textarea" :rows="10" placeholder="用户必须提供完整 Dockerfile" class="code-editor" />
        </el-form-item>
        <el-divider content-position="left">Deployment 生成辅助（不落库，仅用于生成 YAML 样板）</el-divider>
        <div class="gen-bar">
          <div class="gen-item">
            <span class="gen-label">架构选择</span>
            <el-select v-model="form.genArch" placeholder="请选择" style="width: 120px">
              <el-option label="仅 AMD" value="amd" />
              <el-option label="仅 ARM" value="arm" />
              <el-option label="两者" value="both" />
            </el-select>
          </div>
          <div class="gen-item">
            <span class="gen-label">副本数</span>
            <el-input-number v-model="form.genReplicas" :min="1" :max="100" :controls="false" style="width: 90px" />
          </div>
          <div class="gen-item">
            <span class="gen-label">开启 Ingress</span>
            <el-switch v-model="form.genIngress" />
          </div>
          <div class="gen-item gen-btn">
            <el-button type="primary" icon="el-icon-magic-stick" @click="handleGenerateYaml">生成 Deployment</el-button>
          </div>
        </div>
        <div class="gen-tip">点击「生成 Deployment」后，将按上面选项生成基础 YAML 填充到下方编辑框</div>
        <el-form-item label="Deployment YAML" prop="deployYaml">
          <el-input v-model="form.deployYaml" type="textarea" :rows="18" placeholder="点击「生成 Deployment」自动预填基础 YAML，可继续编辑；提交时仅校验 YAML 格式" class="code-editor" />
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" @click="submitForm">确 定</el-button>
        <el-button @click="cancel">取 消</el-button>
      </div>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog title="配置详情" :visible.sync="viewOpen" width="1040px" append-to-body>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="资源名称">{{ viewData.resourceName }}</el-descriptions-item>
        <el-descriptions-item label="pod名称">{{ viewData.podName }}</el-descriptions-item>
        <el-descriptions-item label="命名空间">{{ viewData.namespace }}</el-descriptions-item>
        <el-descriptions-item label="git 分支">{{ viewData.gitBranch }}</el-descriptions-item>
        <el-descriptions-item label="自动刷新">{{ viewData.autoRefresh === 1 ? '开' : '关' }}</el-descriptions-item>
        <el-descriptions-item label="git 地址" :span="2">{{ viewData.gitUrl }}</el-descriptions-item>
        <el-descriptions-item label="创建时间" :span="2">{{ viewData.createTime }}</el-descriptions-item>
        <el-descriptions-item label="Dockerfile" :span="2">
          <pre class="view-pre">{{ viewData.dockerfile }}</pre>
        </el-descriptions-item>
        <el-descriptions-item label="Deployment YAML" :span="2">
          <pre class="view-pre">{{ viewData.deployYaml }}</pre>
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>

    <!-- 构建日志对话框 -->
    <el-dialog :title="'构建日志 - ' + buildLogPodName" :visible.sync="buildLogOpen" width="900px" append-to-body>
      <pre class="build-log">{{ buildLogContent || '暂无日志' }}</pre>
      <div slot="footer">
        <el-button type="primary" icon="el-icon-refresh" @click="loadBuildLog">刷新</el-button>
        <el-button @click="buildLogOpen = false">关闭</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { pagePodConfig, addPodConfig, updatePodConfig, delPodConfig, deployPodConfig, getBuildLog, listNamespaces } from '@/api/cluster'

export default {
  name: 'ClusterConfig',
  data() {
    return {
      loading: false,
      showSearch: true,
      configList: [],
      namespaceList: [],
      total: 0,
      ids: [],
      selectedRow: null,
      single: true,
      multiple: true,
      editDisabled: true,
      copyDisabled: true,
      title: '',
      open: false,
      viewOpen: false,
      buildLogOpen: false,
      buildLogContent: '',
      buildLogPodName: '',
      buildLogConfigId: null,
      isEdit: false,
      viewData: {},
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        resourceName: undefined,
        podName: undefined,
        namespace: undefined
      },
      form: {
        genArch: 'amd',
        genReplicas: 1,
        genIngress: false
      },
      rules: {
        resourceName: [{ required: true, message: '资源名称不能为空', trigger: 'blur' }],
        podName: [{ required: true, message: 'pod名称不能为空', trigger: 'blur' }],
        namespace: [{ required: true, message: '命名空间不能为空', trigger: 'change' }],
        gitUrl: [{ required: true, message: 'git 地址不能为空', trigger: 'blur' }],
        gitBranch: [{ required: true, message: 'git 分支不能为空', trigger: 'blur' }],
        dockerfile: [{ required: true, message: 'Dockerfile 不能为空', trigger: 'blur' }],
        deployYaml: [{ required: true, message: 'Deployment YAML 不能为空', trigger: 'blur' }]
      }
    }
  },
  created() {
    this.getList()
    this.loadNamespaces()
  },
  methods: {
    getList() {
      this.loading = true
      pagePodConfig(this.queryParams).then(res => {
        this.configList = (res.data && res.data.dataList) || []
        this.total = (res.data && res.data.total) || 0
        // 刷新后勾选失效，重置选中状态
        this.selectedRow = null
        this.editDisabled = true
        this.copyDisabled = true
        this.loading = false
      }).catch(() => {
        this.loading = false
      })
    },
    loadNamespaces() {
      listNamespaces().then(res => {
        this.namespaceList = res.data || []
      })
    },
    handleQuery() {
      this.queryParams.pageNum = 1
      this.getList()
    },
    resetQuery() {
      this.resetForm('queryForm')
      this.handleQuery()
    },
    handleSelectionChange(selection) {
      this.ids = selection.map(item => item.id)
      this.single = selection.length !== 1
      this.multiple = !selection.length
      // 构建中不允许修改；任意状态均可复制（复制 = 回填新增表单）
      const row = this.findRowById(this.ids[0])
      const s = row ? row.status : null
      this.editDisabled = s === 'BUILDING'
      this.copyDisabled = selection.length !== 1
    },
    reset() {
      this.form = {
        id: undefined,
        resourceName: '',
        podName: '',
        namespace: '',
        gitUrl: '',
        gitBranch: '',
        dockerfile: '',
        deployYaml: '',
        autoRefresh: 0,
        remark: '',
        genArch: 'amd',
        genReplicas: 1,
        genIngress: false
      }
    },
    handleAdd() {
      this.reset()
      this.isEdit = false
      this.title = '新增业务pod配置'
      this.open = true
    },
    handleUpdate(row) {
      this.reset()
      this.isEdit = true
      this.title = '修改业务pod配置'
      Object.assign(this.form, row)
      this.form.autoRefresh = row.autoRefresh === 1 ? 1 : 0
      this.open = true
    },
    // 顶部修改按钮：基于勾选的 id 从列表取行
    handleUpdateTop() {
      const row = this.findRowById(this.ids[0])
      if (row) {
        this.handleUpdate(row)
      }
    },
    // 顶部复制按钮：基于勾选的 id 从列表取行
    handleCopyTop() {
      const row = this.findRowById(this.ids[0])
      if (row) {
        this.handleCopy(row)
      } else {
        this.$modal.msgError('请先勾选一条配置')
      }
    },
    // 按 id 从当前列表取行
    findRowById(id) {
      return this.configList.find(item => item.id === id) || null
    },
    handleView(row) {
      this.viewData = row
      this.viewOpen = true
    },
    // 根据辅助控件生成 Deployment YAML 基础样板（约完成 80%，用户可继续编辑）
    handleGenerateYaml() {
      if (!this.form.podName) {
        this.$message.warning('请先填写 pod 名称再生成 YAML')
        return
      }
      if (!this.form.namespace) {
        this.$message.warning('请先选择命名空间再生成 YAML')
        return
      }
      const podName = this.form.podName
      const namespace = this.form.namespace
      const replicas = this.form.genReplicas || 1
      const archValues = this.form.genArch === 'amd' ? ['amd64']
        : this.form.genArch === 'arm' ? ['arm64']
          : ['amd64', 'arm64']

      let yaml = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${podName}
  namespace: ${namespace}
  labels:
    app: ${podName}
    aiplatform-managed: "true"
spec:
  replicas: ${replicas}
  selector:
    matchLabels:
      app: ${podName}
  template:
    metadata:
      labels:
        app: ${podName}
        aiplatform-managed: "true"
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: kubernetes.io/arch
                operator: In
                values:
                - ${archValues.join('\n                - ')}
      containers:
      - name: ${podName}
        image: ${podName}:latest
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 8080
          name: http
---
apiVersion: v1
kind: Service
metadata:
  name: ${podName}
  namespace: ${namespace}
  labels:
    app: ${podName}
    aiplatform-managed: "true"
spec:
  ports:
  - port: 8080
    targetPort: 8080
    name: http
  selector:
    app: ${podName}
`
      if (this.form.genIngress) {
        yaml += `---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${podName}
  namespace: ${namespace}
  labels:
    app: ${podName}
    aiplatform-managed: "true"
  annotations:
    nginx.ingress.kubernetes.io/use-forwarded-headers: "true"
    nginx.ingress.kubernetes.io/ssl-redirect: "false"
spec:
  ingressClassName: nginx
  rules:
  - host: ${podName}.jakt.online
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ${podName}
            port:
              number: 8080
`
      }
      this.$set(this.form, 'deployYaml', yaml)
      this.$nextTick(() => {
        this.$message.success('已生成 Deployment YAML 基础样板，可继续编辑')
      })
    },
    submitForm() {
      this.$refs.form.validate(valid => {
        if (!valid) return
        // 剔除前端辅助字段（genArch/genReplicas/genIngress 只用于生成 YAML，不落库）
        const { genArch, genReplicas, genIngress, ...payload } = this.form
        const req = this.isEdit ? updatePodConfig(payload.id, payload) : addPodConfig(payload)
        req.then(() => {
          this.$modal.msgSuccess('保存成功')
          this.open = false
          this.getList()
        }).catch(err => {
          this.$modal.msgError((err && err.message) || '保存失败')
        })
      })
    },
    handleDelete(row) {
      const ids = row.id || this.ids
      const idList = Array.isArray(ids) ? ids : [ids]
      this.$modal.confirm('确认删除选中的 ' + idList.length + ' 条配置？删除不可恢复。').then(() => {
        return delPodConfig(idList)
      }).then(() => {
        this.getList()
        this.$modal.msgSuccess('删除成功')
      })
    },
    handleDeploy(row) {
      this.$modal.confirm('触发部署将拉取代码并构建双架构镜像，确认部署？').then(() => {
        return deployPodConfig(row.id)
      }).then(() => {
        this.$modal.msgSuccess('部署已受理，请到实时管理页查看进度')
        this.getList()
      })
    },
    handleBuildLog(row) {
      this.buildLogPodName = row.podName
      this.buildLogConfigId = row.id
      this.buildLogOpen = true
      this.buildLogContent = ''
      this.loadBuildLog(row)
    },
    loadBuildLog(row) {
      const configId = row ? row.id : this.buildLogConfigId
      if (configId == null) return
      this.buildLogContent = '加载中...'
      getBuildLog(configId).then(res => {
        this.buildLogContent = (res && res.data) || ''
      }).catch(() => {
        this.buildLogContent = '日志读取失败'
      })
    },
    handleCopy(row) {
      const target = row || this.selectedRow
      if (!target) {
        this.$modal.msgError('请先勾选一条配置')
        return
      }
      // 复制 = 打开新增表单并回填选中配置，由用户修改后保存（不调复制接口）
      this.reset()
      this.isEdit = false
      this.title = '复制配置（可修改后保存为新草稿）'
      Object.assign(this.form, {
        resourceName: target.resourceName + '（副本）',
        podName: target.podName + '-copy',
        namespace: target.namespace,
        gitUrl: target.gitUrl,
        gitBranch: target.gitBranch,
        dockerfile: target.dockerfile,
        deployYaml: target.deployYaml,
        autoRefresh: target.autoRefresh === 1 ? 1 : 0,
        remark: target.remark || ''
      })
      this.open = true
    },
    // 状态展示与权限
    statusType(status) {
      const map = {
        DRAFT: 'info',
        BUILDING: 'warning',
        BUILD_FAILED: 'danger',
        PUBLISHED: 'success'
      }
      return map[status] || 'info'
    },
    statusText(status) {
      const map = {
        DRAFT: '草稿',
        BUILDING: '构建中',
        BUILD_FAILED: '构建失败',
        PUBLISHED: '发布'
      }
      return map[status] || status
    },
    canDeploy(row) {
      return row.status !== 'BUILDING'
    },
    cancel() {
      this.open = false
    }
  }
}
</script>

<style scoped>
/* VSCode 浅色风格代码输入框（Light+） */
.code-editor /deep/ .el-textarea__inner {
  font-family: 'SF Mono', Menlo, Consolas, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  background-color: #ffffff;
  color: #000000;
  border-color: #d4d4d4;
  border-radius: 6px;
  padding: 12px 14px;
  caret-color: #569cd6;
}
.code-editor /deep/ .el-textarea__inner:focus {
  border-color: #007acc;
  box-shadow: 0 0 0 1px #007acc inset;
}
.code-editor /deep/ .el-textarea__inner::placeholder {
  color: #a0a0a0;
}
.view-pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: Menlo, Consolas, monospace;
  font-size: 12px;
  background: #f5f7fa;
  padding: 8px;
  border-radius: 4px;
  max-height: 300px;
  overflow: auto;
}
.build-log {
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
/* Deployment 生成辅助条 */
.gen-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  padding: 12px 16px;
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  margin-bottom: 6px;
}
.gen-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.gen-label {
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
}
.gen-btn {
  margin-left: auto;
}
.gen-tip {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}
</style>
