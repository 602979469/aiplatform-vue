<template>
  <div class="app-container">
    <!-- 查询条件 -->
    <el-form :model="queryParams" ref="queryForm" size="small" :inline="true" v-show="showSearch" label-width="80px">
      <el-form-item label="命名空间" prop="namespace">
        <el-select v-model="queryParams.namespace" placeholder="全部" clearable style="width: 200px">
          <el-option v-for="ns in namespaceList" :key="ns" :label="ns" :value="ns" />
        </el-select>
      </el-form-item>
      <el-form-item label="文件名" prop="fileName">
        <el-input v-model="queryParams.fileName" placeholder="请输入文件名" clearable style="width: 200px" @keyup.enter.native="handleQuery" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="el-icon-search" size="mini" @click="handleQuery">搜索</el-button>
        <el-button icon="el-icon-refresh" size="mini" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="el-icon-upload2" size="mini" @click="handleUpload">上传文件</el-button>
      </el-col>
      <right-toolbar :showSearch.sync="showSearch" @queryTable="getList" />
    </el-row>

    <el-table v-loading="loading" :data="fileList" stripe>
      <el-table-column label="ID" prop="id" width="70" />
      <el-table-column label="命名空间" prop="namespace" min-width="100" />
      <el-table-column label="文件名" prop="originalName" min-width="180" show-overflow-tooltip />
      <el-table-column label="大小" prop="fileSize" width="100" align="center">
        <template slot-scope="scope">{{ formatSize(scope.row.fileSize) }}</template>
      </el-table-column>
      <el-table-column label="类型" prop="fileType" width="80" align="center">
        <template slot-scope="scope">
          <el-tag size="mini" type="info">{{ scope.row.fileType || '-' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="备注" prop="remark" min-width="120" show-overflow-tooltip />
      <el-table-column label="创建人" prop="createBy" width="100" />
      <el-table-column label="创建时间" prop="createTime" width="160" />
      <el-table-column label="更新时间" prop="updateTime" width="160" />
      <el-table-column label="操作" width="260" align="center" fixed="right">
        <template slot-scope="scope">
          <el-button size="mini" type="primary" icon="el-icon-download" @click="handleDownload(scope.row)">下载</el-button>
          <el-button size="mini" type="warning" icon="el-icon-edit" @click="handleUpdate(scope.row)">修改</el-button>
          <el-button size="mini" type="danger" icon="el-icon-delete" @click="handleDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination
      v-show="total > 0"
      :total="total"
      :page.sync="queryParams.pageNum"
      :limit.sync="queryParams.pageSize"
      @pagination="getList"
    />

    <!-- 上传文件对话框 -->
    <el-dialog title="上传文件" :visible.sync="uploadOpen" width="520px" append-to-body>
      <el-form ref="uploadForm" :model="uploadForm" :rules="uploadRules" label-width="80px">
        <el-form-item label="命名空间" prop="namespace">
          <el-select v-model="uploadForm.namespace" placeholder="请选择命名空间" style="width: 100%">
            <el-option v-for="ns in namespaceList" :key="ns" :label="ns" :value="ns" />
          </el-select>
        </el-form-item>
        <el-form-item label="文件" prop="file">
          <el-upload
            ref="upload"
            :auto-upload="false"
            :limit="1"
            :on-change="handleUploadFileChange"
            :on-remove="handleUploadFileRemove"
            :file-list="uploadFileList"
          >
            <el-button size="small" icon="el-icon-upload">选择文件</el-button>
            <div slot="tip" class="el-upload__tip">支持任意类型文件，单次一个</div>
          </el-upload>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="uploadForm.remark" type="textarea" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" :loading="uploading" @click="submitUpload">确 定</el-button>
        <el-button @click="cancelUpload">取 消</el-button>
      </div>
    </el-dialog>

    <!-- 修改（改名/备注）对话框 -->
    <el-dialog title="修改文件" :visible.sync="updateOpen" width="480px" append-to-body>
      <el-form ref="updateForm" :model="updateForm" :rules="updateRules" label-width="80px">
        <el-form-item label="文件名" prop="originalName">
          <el-input v-model="updateForm.originalName" placeholder="请输入文件名（含扩展名）" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="updateForm.remark" type="textarea" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" :loading="updating" @click="submitUpdate">确 定</el-button>
        <el-button @click="updateOpen = false">取 消</el-button>
      </div>
    </el-dialog>

  </div>
</template>

<script>
import { saveAs } from 'file-saver'
import { listNamespaces, pageFile, uploadFile, updateFile, delFile, downloadFile } from '@/api/file'

export default {
  name: 'File',
  data() {
    return {
      // 列表
      loading: false,
      fileList: [],
      total: 0,
      showSearch: true,
      namespaceList: [],
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        namespace: undefined,
        fileName: undefined
      },
      // 上传
      uploadOpen: false,
      uploading: false,
      uploadFileList: [],
      uploadFileRaw: null,
      uploadForm: {
        namespace: '',
        remark: undefined
      },
      uploadRules: {
        namespace: [{ required: true, message: '请选择命名空间', trigger: 'change' }],
        file: [{ required: true, message: '请选择文件', trigger: 'change' }]
      },
      // 修改
      updateOpen: false,
      updating: false,
      updateTargetId: null,
      updateForm: {
        originalName: undefined,
        remark: undefined
      },
      updateRules: {
        originalName: [{ required: true, message: '文件名不能为空', trigger: 'blur' }]
      },
    }
  },
  created() {
    this.getList()
    this.loadNamespaces()
  },
  methods: {
    /** 命名空间下拉列表 */
    loadNamespaces() {
      listNamespaces().then(res => {
        this.namespaceList = res.data || []
      })
    },
    /** 分页查询 */
    getList() {
      this.loading = true
      pageFile(this.queryParams).then(res => {
        this.fileList = (res.data && res.data.dataList) || []
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
      this.resetForm('queryForm')
      this.handleQuery()
    },
    /** 文件大小格式化 */
    formatSize(bytes) {
      if (bytes === null || bytes === undefined || bytes === 0) return '-'
      const units = ['B', 'KB', 'MB', 'GB']
      let size = bytes
      let unit = 0
      while (size >= 1024 && unit < units.length - 1) {
        size /= 1024
        unit += 1
      }
      return (unit === 0 ? size : size.toFixed(1)) + ' ' + units[unit]
    },
    /** 下载 */
    handleDownload(row) {
      downloadFile(row.id, row.namespace).then(blob => {
        saveAs(blob, row.originalName)
      })
    },
    /** 上传 */
    handleUpload() {
      this.uploadFileList = []
      this.uploadFileRaw = null
      this.uploadForm = { namespace: '', remark: undefined, file: null }
      this.uploadOpen = true
      this.$nextTick(() => {
        this.$refs.uploadForm && this.$refs.uploadForm.clearValidate()
      })
    },
    handleUploadFileChange(file) {
      this.uploadForm.file = file.raw
      this.uploadFileRaw = file.raw
      this.uploadFileList = [file]
    },
    handleUploadFileRemove() {
      this.uploadForm.file = null
      this.uploadFileRaw = null
      this.uploadFileList = []
    },
    cancelUpload() {
      this.uploadOpen = false
      this.uploadFileList = []
      this.uploadFileRaw = null
      this.uploadForm.file = null
    },
    submitUpload() {
      this.$refs.uploadForm.validate(valid => {
        if (!valid) return
        if (!this.uploadForm.file) {
          this.$message.warning('请选择文件')
          return
        }
        const formData = new FormData()
        formData.append('namespace', this.uploadForm.namespace)
        formData.append('file', this.uploadForm.file)
        if (this.uploadForm.remark) {
          formData.append('remark', this.uploadForm.remark)
        }
        this.uploading = true
        uploadFile(formData).then(() => {
          this.$modal.msgSuccess('上传成功')
          this.uploadOpen = false
          this.uploadFileList = []
          this.uploadFileRaw = null
          this.getList()
        }).catch(() => {
          // 错误提示已由请求拦截器统一弹出
        }).finally(() => {
          this.uploading = false
        })
      })
    },
    /** 修改（改名/备注） */
    handleUpdate(row) {
      this.updateForm = {
        namespace: row.namespace,
        originalName: row.originalName,
        remark: row.remark
      }
      this.updateTargetId = row.id
      this.updateOpen = true
      this.$nextTick(() => {
        this.$refs.updateForm && this.$refs.updateForm.clearValidate()
      })
    },
    submitUpdate() {
      this.$refs.updateForm.validate(valid => {
        if (!valid) return
        this.updating = true
        updateFile(this.updateTargetId, {
          namespace: this.updateForm.namespace,
          originalName: this.updateForm.originalName,
          remark: this.updateForm.remark
        }).then(() => {
          this.$modal.msgSuccess('修改成功')
          this.updateOpen = false
          this.getList()
        }).catch(() => {
          // 错误提示已由请求拦截器统一弹出
        }).finally(() => {
          this.updating = false
        })
      })
    },
    /** 删除 */
    handleDelete(row) {
      this.$modal.confirm('确认删除文件「' + row.originalName + '」吗？删除后不可恢复。').then(() => {
        return delFile(row.id, row.namespace)
      }).then(() => {
        this.getList()
        this.$modal.msgSuccess('删除成功')
      }).catch(() => {})
    }
  }
}
</script>
