<template>
  <div class="app-container material-page" :class="{ 'material-page--mobile': isMobile }">
    <!-- 筛选 -->
    <el-form :inline="true" size="small" class="material-filter" v-show="showSearch">
      <el-form-item label="类别">
        <el-select
          v-model="query.category"
          placeholder="全部类别"
          clearable
          filterable
          allow-create
          default-first-option
          style="width: 170px"
          @change="handleQuery"
        >
          <el-option v-for="item in categoryOptions" :key="item" :label="item" :value="item" />
        </el-select>
      </el-form-item>
      <el-form-item label="名称">
        <el-input v-model="query.fileName" placeholder="文件名" clearable style="width: 190px" @keyup.enter.native="handleQuery" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="el-icon-search" size="mini" @click="handleQuery">搜索</el-button>
        <el-button icon="el-icon-refresh" size="mini" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="el-icon-upload2" size="mini" @click="openUpload">上传素材</el-button>
      </el-col>
      <el-col :span="1.5">
        <span class="material-tip">素材图片暂不支持删除</span>
      </el-col>
      <right-toolbar :showSearch.sync="showSearch" @queryTable="getList" />
    </el-row>

    <!-- 电脑端：表格 -->
    <el-table v-if="!isMobile" v-loading="loading" :data="list" border size="small">
      <el-table-column label="图片" width="140" align="center">
        <template slot-scope="scope">
          <img
            class="material-thumb"
            :src="previewUrl(scope.row, 320)"
            alt="素材"
            loading="lazy"
            @click="openViewer(scope.$index)"
          >
        </template>
      </el-table-column>
      <el-table-column prop="originalName" label="名称" min-width="200" show-overflow-tooltip />
      <el-table-column label="类别" width="130" align="center">
        <template slot-scope="scope">
          <el-tag v-if="scope.row.category" size="mini" type="success">{{ scope.row.category }}</el-tag>
          <span v-else class="material-muted">未分类</span>
        </template>
      </el-table-column>
      <el-table-column label="大小" width="100" align="right">
        <template slot-scope="scope">{{ formatSize(scope.row.fileSize) }}</template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" min-width="140" show-overflow-tooltip />
      <el-table-column label="操作" width="150" align="center" fixed="right">
        <template slot-scope="scope">
          <el-button type="text" size="mini" icon="el-icon-zoom-in" @click="openViewer(scope.$index)">查看</el-button>
          <el-button type="text" size="mini" icon="el-icon-edit" @click="openEdit(scope.row)">修改</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 手机端：卡片网格 -->
    <div v-else v-loading="loading" class="material-grid">
      <div v-for="(row, index) in list" :key="row.id" class="material-card" @click="openViewer(index)">
        <img :src="previewUrl(row, 480)" alt="素材" loading="lazy">
        <div class="material-card__body">
          <div class="material-card__name">{{ row.originalName }}</div>
          <div class="material-card__meta">
            <span>{{ row.category || '未分类' }}</span>
            <span>{{ formatSize(row.fileSize) }}</span>
          </div>
        </div>
        <div class="material-card__edit" @click.stop="openEdit(row)">修改</div>
      </div>
    </div>

    <el-empty v-if="!loading && !list.length" description="还没有素材，点「上传素材」传几张吧" />

    <pagination
      v-show="total > 0"
      :total="total"
      :page.sync="query.pageNum"
      :limit.sync="query.pageSize"
      @pagination="getList"
    />

    <!-- 上传 -->
    <el-dialog title="上传素材" :visible.sync="uploadOpen" :width="isMobile ? '92%' : '480px'" append-to-body>
      <el-form label-width="64px" size="small">
        <el-form-item label="类别">
          <el-select
            v-model="uploadForm.category"
            placeholder="选择或直接输入新类别"
            filterable
            allow-create
            default-first-option
            style="width: 100%"
          >
            <el-option v-for="item in categoryOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="图片">
          <input ref="fileInput" type="file" accept="image/*" multiple class="material-file-input" @change="onFilesPicked">
          <div v-if="uploadForm.files.length" class="material-file-list">
            <span v-for="file in uploadForm.files" :key="file.name" class="material-file-item">{{ file.name }}</span>
          </div>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="uploadForm.remark" size="small" placeholder="选填" maxlength="200" />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button size="small" @click="uploadOpen = false">取消</el-button>
        <el-button type="primary" size="small" :loading="uploading" @click="doUpload">
          {{ uploading ? '上传中…' : '开始上传' }}
        </el-button>
      </div>
    </el-dialog>

    <!-- 修改 -->
    <el-dialog title="修改素材" :visible.sync="editOpen" :width="isMobile ? '92%' : '480px'" append-to-body>
      <el-form label-width="64px" size="small">
        <el-form-item label="预览">
          <img class="material-edit-preview" :src="previewUrl(editForm, 480)" alt="素材" @click="openViewer(indexOfEdit())">
        </el-form-item>
        <el-form-item label="名称">
          <el-input v-model="editForm.originalName" size="small" maxlength="200" />
        </el-form-item>
        <el-form-item label="类别">
          <el-select
            v-model="editForm.category"
            placeholder="选择或直接输入新类别"
            filterable
            allow-create
            default-first-option
            style="width: 100%"
          >
            <el-option v-for="item in categoryOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="editForm.remark" type="textarea" :rows="2" maxlength="500" />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button size="small" @click="editOpen = false">取消</el-button>
        <el-button type="primary" size="small" :loading="saving" @click="doSave">保存</el-button>
      </div>
    </el-dialog>

    <!-- 放大查看 -->
    <div v-if="viewerVisible" class="material-viewer" @click="viewerVisible = false">
      <div class="material-viewer__bar">
        <span>{{ viewerIndex + 1 }} / {{ list.length }}</span>
        <span class="material-viewer__close" @click.stop="viewerVisible = false">×</span>
      </div>
      <img v-if="list[viewerIndex]" class="material-viewer__img" :src="previewUrl(list[viewerIndex])" alt="素材" @click.stop>
      <div class="material-viewer__name">{{ list[viewerIndex] && list[viewerIndex].originalName }}</div>
      <div v-if="list.length > 1" class="material-viewer__nav">
        <button class="material-viewer__btn" @click.stop="viewerPrev">‹</button>
        <button class="material-viewer__btn" @click.stop="viewerNext">›</button>
      </div>
    </div>
  </div>
</template>

<script>
import { pageFile, uploadFile, updateFile } from '@/api/file'
import responsive from '@/mixins/responsive'

/** 素材类别默认候选（下拉里也可以直接手输新类别） */
const DEFAULT_CATEGORIES = ['产品图', '材质样本', '参考风格', '家具', '家电', '灯具', '其他']

export default {
  name: 'MaterialLibrary',
  mixins: [responsive],
  data() {
    return {
      loading: false,
      saving: false,
      uploading: false,
      showSearch: true,
      list: [],
      total: 0,
      query: {
        namespace: 'aiplatform',
        category: undefined,
        fileName: undefined,
        imageOnly: true,
        pageNum: 1,
        pageSize: 12
      },
      categoryOptions: DEFAULT_CATEGORIES.slice(),
      uploadOpen: false,
      uploadForm: { category: undefined, remark: undefined, files: [] },
      editOpen: false,
      editForm: { id: undefined, namespace: 'aiplatform', originalName: undefined, category: undefined, remark: undefined },
      viewerVisible: false,
      viewerIndex: 0
    }
  },
  created() {
    this.getList()
  },
  methods: {
    /**
     * 素材直出地址（inline 图片流）
     * @param row 文件行
     * @param width 可选：缩略图宽度；不带则取原图（看大图用）
     */
    previewUrl(row, width) {
      if (!row || !row.id) {
        return ''
      }
      const suffix = width ? '&w=' + width : ''
      return process.env.VUE_APP_BASE_API + '/api/file/' + row.id + '/preview?namespace='
        + (row.namespace || 'aiplatform') + suffix
    },
    getList() {
      this.loading = true
      pageFile(this.query).then(res => {
        const page = res.data || {}
        this.list = page.dataList || []
        this.total = page.total || 0
        this.collectCategories()
      }).finally(() => {
        this.loading = false
      })
    },
    /** 把列表里出现过的类别补进下拉候选 */
    collectCategories() {
      const merged = DEFAULT_CATEGORIES.slice()
      this.list.forEach(row => {
        if (row.category && !merged.includes(row.category)) {
          merged.push(row.category)
        }
      })
      this.categoryOptions = merged
    },
    handleQuery() {
      this.query.pageNum = 1
      this.getList()
    },
    resetQuery() {
      this.query.category = undefined
      this.query.fileName = undefined
      this.handleQuery()
    },
    formatSize(size) {
      const bytes = Number(size || 0)
      if (bytes < 1024) {
        return bytes + ' B'
      }
      if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(1) + ' KB'
      }
      return (bytes / 1024 / 1024).toFixed(2) + ' MB'
    },
    /* ---------- 上传 ---------- */
    openUpload() {
      this.uploadForm = { category: undefined, remark: undefined, files: [] }
      this.uploadOpen = true
      this.$nextTick(() => {
        if (this.$refs.fileInput) {
          this.$refs.fileInput.value = ''
        }
      })
    },
    onFilesPicked(event) {
      const files = Array.from(event.target.files || []).filter(file => /^image\//.test(file.type))
      if (!files.length) {
        this.$modal.msgWarning('只支持图片文件')
      }
      this.uploadForm.files = files
    },
    doUpload() {
      if (!this.uploadForm.files.length) {
        this.$modal.msgWarning('先选几张图片吧')
        return
      }
      if (!this.uploadForm.category) {
        this.$modal.msgWarning('给素材选个类别吧（也可以直接输入新的）')
        return
      }
      this.uploading = true
      const tasks = this.uploadForm.files.map(file => {
        const formData = new FormData()
        formData.append('namespace', 'aiplatform')
        formData.append('category', this.uploadForm.category)
        if (this.uploadForm.remark) {
          formData.append('remark', this.uploadForm.remark)
        }
        formData.append('file', file)
        return uploadFile(formData)
      })
      Promise.all(tasks).then(() => {
        this.$modal.msgSuccess('上传成功 ' + this.uploadForm.files.length + ' 张')
        this.uploadOpen = false
        this.getList()
        this.$forceUpdate()
      }).finally(() => {
        this.uploading = false
      })
    },
    /* ---------- 修改 ---------- */
    openEdit(row) {
      this.editForm = {
        id: row.id,
        namespace: row.namespace || 'aiplatform',
        originalName: row.originalName,
        category: row.category,
        remark: row.remark
      }
      this.editOpen = true
    },
    /** 编辑弹层里预览对应的列表下标（用于点预览放大） */
    indexOfEdit() {
      return this.list.findIndex(item => item.id === this.editForm.id)
    },
    doSave() {
      this.saving = true
      updateFile(this.editForm.id, {
        namespace: this.editForm.namespace,
        originalName: this.editForm.originalName,
        category: this.editForm.category,
        remark: this.editForm.remark
      }).then(() => {
        this.$modal.msgSuccess('保存成功')
        this.editOpen = false
        this.getList()
      }).finally(() => {
        this.saving = false
      })
    },
    /* ---------- 放大查看 ---------- */
    openViewer(index) {
      if (index < 0 || index >= this.list.length) {
        return
      }
      this.viewerIndex = index
      this.viewerVisible = true
    },
    viewerPrev() {
      this.viewerIndex = (this.viewerIndex - 1 + this.list.length) % this.list.length
    },
    viewerNext() {
      this.viewerIndex = (this.viewerIndex + 1) % this.list.length
    }
  }
}
</script>

<style scoped>
.material-filter {
  margin-bottom: 4px;
}

.material-tip {
  color: #909399;
  font-size: 12px;
  line-height: 28px;
}

.material-muted {
  color: #c0c4cc;
}

.material-thumb {
  width: 120px;
  height: 84px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid #ebeef5;
  cursor: zoom-in;
  transition: transform 0.15s;
}

.material-thumb:hover {
  transform: scale(1.03);
}

.material-edit-preview {
  max-width: 180px;
  max-height: 140px;
  border-radius: 6px;
  border: 1px solid #ebeef5;
  cursor: zoom-in;
}

.material-file-input {
  font-size: 13px;
}

.material-file-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.material-file-item {
  font-size: 12px;
  color: #606266;
  background: #f5f7fa;
  border-radius: 4px;
  padding: 2px 8px;
}

/* ---------- 手机端卡片 ---------- */
.material-page--mobile .material-filter .el-form-item {
  display: block;
  margin-bottom: 8px;
}

.material-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.material-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.06);
  position: relative;
}

.material-card img {
  width: 100%;
  height: 120px;
  object-fit: cover;
  display: block;
}

.material-card__body {
  padding: 8px 10px 10px;
}

.material-card__name {
  font-size: 13px;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.material-card__meta {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #909399;
  margin-top: 4px;
}

.material-card__edit {
  position: absolute;
  right: 8px;
  top: 8px;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 11px;
  border-radius: 10px;
  padding: 3px 10px;
}

/* ---------- 放大查看 ---------- */
.material-viewer {
  position: fixed;
  inset: 0;
  background: rgba(12, 10, 9, 0.93);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.material-viewer__bar {
  position: absolute;
  top: calc(10px + env(safe-area-inset-top));
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 18px;
  color: #fff;
  font-size: 14px;
}

.material-viewer__close {
  font-size: 30px;
  line-height: 1;
  cursor: pointer;
}

.material-viewer__img {
  max-width: 100vw;
  max-height: 100vh;
  width: auto;
  height: auto;
  object-fit: contain;
  padding: 56px 8px calc(88px + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.material-viewer__name {
  position: absolute;
  bottom: calc(56px + env(safe-area-inset-bottom));
  left: 0;
  right: 0;
  text-align: center;
  color: #d8d3ce;
  font-size: 12px;
  padding: 0 20px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.material-viewer__nav {
  position: absolute;
  bottom: calc(10px + env(safe-area-inset-bottom));
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 56px;
}

.material-viewer__btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  font-size: 22px;
  line-height: 1;
}
</style>
