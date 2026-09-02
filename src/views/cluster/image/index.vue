<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryForm" :inline="true" v-show="showSearch">
      <el-form-item label="镜像名" prop="imageName">
        <el-input v-model="queryParams.imageName" placeholder="镜像名" clearable style="width: 180px" @keyup.enter.native="handleQuery" />
      </el-form-item>
      <el-form-item label="版本" prop="version">
        <el-input v-model="queryParams.version" placeholder="版本/tag" clearable style="width: 140px" @keyup.enter.native="handleQuery" />
      </el-form-item>
      <el-form-item label="状态" prop="buildStatus">
        <el-select v-model="queryParams.buildStatus" placeholder="全部" clearable style="width: 130px">
          <el-option v-for="(v, k) in statusMap" :key="k" :label="v" :value="k" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="el-icon-search" @click="handleQuery">搜索</el-button>
        <el-button icon="el-icon-refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" icon="el-icon-plus" @click="handleAdd">新增镜像</el-button>
      </el-col>
    </el-row>

    <el-table v-loading="loading" :data="imageList">
      <el-table-column label="ID" prop="id" width="70" />
      <el-table-column label="镜像名" prop="imageName" min-width="130" />
      <el-table-column label="版本" prop="version" min-width="90" />
      <el-table-column label="类型" width="80" align="center">
        <template slot-scope="scope">
          <el-tag size="mini" :type="scope.row.imageType === 'BUILD' ? 'primary' : 'success'">
            {{ scope.row.imageType === 'BUILD' ? '自研' : '现成' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100" align="center">
        <template slot-scope="scope">
          <el-tag size="mini" :type="statusTagType(scope.row.buildStatus)">
            {{ statusMap[scope.row.buildStatus] || scope.row.buildStatus }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="重试" prop="buildRetryCount" width="60" align="center" />
      <el-table-column label="Harbor 引用" prop="harborRef" min-width="240" show-overflow-tooltip />
      <el-table-column label="tar 归档" prop="tarName" min-width="160" show-overflow-tooltip />
      <el-table-column label="创建时间" prop="createTime" width="160" />
      <el-table-column label="操作" width="210" align="center" fixed="right">
        <template slot-scope="scope">
          <el-button size="mini" type="info" icon="el-icon-view" @click="handleView(scope.row)">查看</el-button>
          <el-button v-if="canEdit(scope.row)" size="mini" type="warning" icon="el-icon-edit" @click="handleUpdate(scope.row)">编辑</el-button>
          <el-button v-if="canBuild(scope.row)" size="mini" type="primary" icon="el-icon-video-play" @click="handleBuild(scope.row)">{{ buildBtnText(scope.row) }}</el-button>
          <el-button v-if="canLog(scope.row)" size="mini" type="warning" icon="el-icon-document" @click="handleLog(scope.row)">日志</el-button>
          <el-button v-if="canDelete(scope.row)" size="mini" type="danger" icon="el-icon-delete" @click="handleDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" :page.sync="queryParams.pageNum" :limit.sync="queryParams.pageSize" @pagination="getList" />

    <!-- 新增/修改对话框 -->
    <el-dialog :title="title" :visible.sync="open" width="760px" append-to-body>
      <el-form ref="form" :model="form" :rules="rules" label-width="120px">
        <el-alert
          v-if="form.imageType === 'EXTERNAL'"
          title="现成镜像：保存后自动导入 Harbor，无需手动构建"
          type="info"
          :closable="false"
          show-icon
          style="margin-bottom: 14px"
        />
        <el-row>
          <el-col :span="12">
            <el-form-item label="镜像名" prop="imageName">
              <el-input v-model="form.imageName" placeholder="小写字母/数字/下划线，如 mysql_5_7" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="版本" prop="version">
              <el-input v-model="form.version" placeholder="如 8.0 / v1.0.0" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="来源类型" prop="imageType">
              <el-radio-group v-model="form.imageType">
                <el-radio label="BUILD">自研（git + Dockerfile）</el-radio>
                <el-radio label="EXTERNAL">现成（外部镜像地址）</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="备注">
              <el-input v-model="form.remark" placeholder="备注" />
            </el-form-item>
          </el-col>
        </el-row>
        <template v-if="form.imageType === 'BUILD'">
          <el-form-item label="git 地址" prop="gitUrl">
            <el-input v-model="form.gitUrl" placeholder="https://github.com/xxx/yyy.git" />
          </el-form-item>
          <el-form-item label="git 分支" prop="gitBranch">
            <el-input v-model="form.gitBranch" placeholder="如 main" />
          </el-form-item>
          <el-form-item label="Dockerfile" prop="dockerfile">
            <el-input v-model="form.dockerfile" type="textarea" :rows="10" placeholder="必须提供完整 Dockerfile" class="code-editor" />
          </el-form-item>
        </template>
        <template v-else>
          <el-form-item label="外部镜像地址" prop="externalImage">
            <el-input v-model="form.externalImage" placeholder="如 docker.io/mysql:8.0" />
          </el-form-item>
        </template>
        <el-divider content-position="left">生成结果预览</el-divider>
        <el-form-item label="Harbor 引用">
          <el-input :value="harborRefPreview" readonly placeholder="保存后生成" />
        </el-form-item>
        <el-form-item label="tar 归档名">
          <el-input :value="tarNamePreview" readonly placeholder="保存后生成" />
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" @click="submitForm">确 定</el-button>
        <el-button @click="cancel">取 消</el-button>
      </div>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog title="镜像详情" :visible.sync="viewOpen" width="760px" append-to-body>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="镜像名">{{ viewData.imageName }}</el-descriptions-item>
        <el-descriptions-item label="版本">{{ viewData.version }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ viewData.imageType === 'BUILD' ? '自研' : '现成' }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ statusMap[viewData.buildStatus] }}</el-descriptions-item>
        <el-descriptions-item label="重试次数">{{ viewData.buildRetryCount }}</el-descriptions-item>
        <el-descriptions-item label="Harbor 引用" :span="2">{{ viewData.harborRef }}</el-descriptions-item>
        <el-descriptions-item label="tar 归档名" :span="2">{{ viewData.tarName }}</el-descriptions-item>
        <el-descriptions-item label="构建日志路径" :span="2">{{ viewData.buildLogPath || '-' }}</el-descriptions-item>
        <el-descriptions-item v-if="viewData.imageType === 'BUILD'" label="git 地址" :span="2">{{ viewData.gitUrl }}</el-descriptions-item>
        <el-descriptions-item v-if="viewData.imageType === 'BUILD'" label="git 分支" :span="2">{{ viewData.gitBranch }}</el-descriptions-item>
        <el-descriptions-item v-else label="外部镜像地址" :span="2">{{ viewData.externalImage }}</el-descriptions-item>
        <el-descriptions-item v-if="viewData.imageType === 'BUILD'" label="Dockerfile" :span="2">
          <pre class="view-pre">{{ viewData.dockerfile }}</pre>
        </el-descriptions-item>
        <el-descriptions-item label="创建时间" :span="2">{{ viewData.createTime }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>

    <!-- 构建/导入日志对话框 -->
    <el-dialog :title="'构建日志 - ' + logImageName" :visible.sync="logOpen" width="900px" append-to-body @close="closeLog">
      <el-input v-model="buildLog" type="textarea" :rows="20" readonly class="code-editor" />
    </el-dialog>
  </div>
</template>

<script>
import { pageClusterImage, addClusterImage, updateClusterImage, delClusterImage, buildClusterImage, getClusterImage, getClusterImageLog } from '@/api/cluster'

export default {
  name: 'ClusterImage',
  data() {
    return {
      loading: false,
      showSearch: true,
      imageList: [],
      total: 0,
      title: '',
      open: false,
      viewOpen: false,
      logOpen: false,
      buildLog: '',
      logImageName: '',
      logImageId: null,
      logTimer: null,
      isEdit: false,
      viewData: {},
      statusMap: {
        DRAFT: '草稿',
        BUILDING: '构建中',
        BUILD_FAILED: '构建失败',
        PUBLISHED: '已发布'
      },
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        imageName: undefined,
        version: undefined,
        buildStatus: undefined
      },
      form: {},
      rules: {
        imageName: [
          { required: true, message: '镜像名不能为空', trigger: 'blur' },
          { pattern: /^[a-z0-9_]+$/, message: '仅允许小写字母、数字、下划线', trigger: 'blur' }
        ],
        version: [
          { required: true, message: '版本不能为空', trigger: 'blur' },
          { pattern: /^[a-zA-Z0-9._-]+$/, message: '仅允许字母、数字、点、横线、下划线', trigger: 'blur' }
        ],
        imageType: [{ required: true, message: '来源类型不能为空', trigger: 'change' }],
        gitUrl: [{ required: true, message: 'git 地址不能为空', trigger: 'blur' }],
        gitBranch: [{ required: true, message: 'git 分支不能为空', trigger: 'blur' }],
        dockerfile: [{ required: true, message: 'Dockerfile 不能为空', trigger: 'blur' }],
        externalImage: [{ required: true, message: '外部镜像地址不能为空', trigger: 'blur' }]
      }
    }
  },
  computed: {
    harborRefPreview() {
      if (!this.form.imageName || !this.form.version) return ''
      return 'harbor.jakt.online/library/' + this.form.imageName + ':' + this.form.version
    },
    tarNamePreview() {
      if (!this.form.imageName || !this.form.version) return ''
      return this.form.imageName + '_' + this.form.version + '.tar.gz'
    }
  },
  created() {
    this.getList()
  },
  methods: {
    getList() {
      this.loading = true
      pageClusterImage(this.queryParams).then(res => {
        this.imageList = (res.data && res.data.dataList) || []
        this.total = (res.data && res.data.total) || 0
        this.loading = false
      }).catch(() => {
        this.loading = false
      })
    },
    handleQuery() {
      this.queryParams.pageNum = 1
      this.getList()
    },
    resetQuery() {
      this.queryParams = { pageNum: 1, pageSize: 10, imageName: undefined, version: undefined, buildStatus: undefined }
      this.handleQuery()
    },
    statusTagType(status) {
      return { DRAFT: 'info', BUILDING: 'warning', BUILD_FAILED: 'danger', PUBLISHED: 'success' }[status] || 'info'
    },
    canEdit(row) {
      return row.buildStatus === 'DRAFT' || row.buildStatus === 'BUILD_FAILED'
    },
    canBuild(row) {
      // BUILDING 也放行：构建进程异常退出后状态残留，可手动重新触发（卡死恢复）
      return (row.imageType === 'BUILD' && (row.buildStatus === 'DRAFT' || row.buildStatus === 'BUILD_FAILED' || row.buildStatus === 'BUILDING'))
        || (row.imageType === 'EXTERNAL' && (row.buildStatus === 'BUILD_FAILED' || row.buildStatus === 'BUILDING'))
    },
    buildBtnText(row) {
      return row.imageType === 'EXTERNAL' ? '重新导入' : '构建'
    },
    canLog(row) {
      return row.buildStatus === 'BUILDING' || row.buildStatus === 'BUILD_FAILED'
    },
    canDelete(row) {
      return row.buildStatus !== 'BUILDING'
    },
    reset() {
      this.form = {
        id: undefined,
        imageName: '',
        version: '',
        imageType: 'BUILD',
        gitUrl: '',
        gitBranch: '',
        dockerfile: '',
        externalImage: '',
        remark: ''
      }
    },
    handleAdd() {
      this.reset()
      this.isEdit = false
      this.title = '新增镜像'
      this.open = true
    },
    handleUpdate(row) {
      this.reset()
      this.isEdit = true
      this.title = '修改镜像'
      this.form = Object.assign({}, row)
      this.open = true
    },
    handleView(row) {
      getClusterImage(row.id).then(res => {
        this.viewData = res.data || {}
        this.viewOpen = true
      })
    },
    handleLog(row) {
      this.logOpen = true
      this.logImageId = row.id
      this.logImageName = row.imageName + ':' + row.version
      this.refreshLog()
      if (this.logTimer) clearInterval(this.logTimer)
      this.logTimer = setInterval(() => this.refreshLog(), 3000)
    },
    refreshLog() {
      if (!this.logImageId) return
      getClusterImageLog(this.logImageId).then(res => {
        this.buildLog = (res.data || '').trim() || '（暂无日志）'
      })
    },
    closeLog() {
      if (this.logTimer) clearInterval(this.logTimer)
      this.logTimer = null
      this.logImageId = null
      this.buildLog = ''
    },
    submitForm() {
      this.$refs.form.validate(valid => {
        if (!valid) return
        const data = {
          imageName: this.form.imageName,
          version: this.form.version,
          imageType: this.form.imageType,
          gitUrl: this.form.gitUrl,
          gitBranch: this.form.gitBranch,
          dockerfile: this.form.dockerfile,
          externalImage: this.form.externalImage,
          remark: this.form.remark
        }
        if (this.isEdit) {
          updateClusterImage(this.form.id, data).then(() => {
            this.$modal.msgSuccess('修改成功')
            this.open = false
            this.getList()
          })
        } else {
          addClusterImage(data).then(() => {
            this.$modal.msgSuccess(data.imageType === 'EXTERNAL' ? '新增成功，开始自动导入' : '新增成功（草稿），可点击构建')
            this.open = false
            this.getList()
          })
        }
      })
    },
    cancel() {
      this.open = false
      this.reset()
    },
    handleBuild(row) {
      const action = row.imageType === 'EXTERNAL' ? '重新导入' : '发起构建'
      this.$confirm('确认对镜像 ' + row.imageName + ':' + row.version + ' ' + action + '？', '提示', {
        type: 'warning'
      }).then(() => {
        buildClusterImage(row.id).then(() => {
          this.$modal.msgSuccess(action === '重新导入' ? '已提交重新导入' : '已提交构建')
          this.getList()
        })
      }).catch(() => {})
    },
    handleDelete(row) {
      const tip = row.buildStatus === 'PUBLISHED'
        ? '已发布镜像删除将同步删除 Harbor 镜像、各节点镜像和 MinIO tar，确认删除？'
        : '确认删除镜像 ' + row.imageName + ':' + row.version + '？'
      this.$confirm(tip, '警告', { type: 'warning' }).then(() => {
        delClusterImage(row.id).then(() => {
          this.$modal.msgSuccess('删除成功')
          this.getList()
        })
      }).catch(() => {})
    }
  }
}
</script>

<style scoped>
/* 详情展示（Dockerfile 等长文本）：换行 + 超出滚动 */
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
</style>
