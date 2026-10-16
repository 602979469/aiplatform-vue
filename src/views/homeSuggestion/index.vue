<template>
  <div class="app-container suggestion-page" :class="{ 'suggestion-page--mobile': isMobile }">
    <!-- 筛选 -->
    <el-form :inline="true" size="small" class="suggestion-filter">
      <el-form-item label="区域">
        <el-select v-model="query.region" placeholder="全部区域" clearable style="width: 150px" @change="handleQuery">
          <el-option v-for="region in regions" :key="region" :label="region" :value="region" />
        </el-select>
      </el-form-item>
      <el-form-item label="标题">
        <el-input v-model="query.title" placeholder="意见标题" clearable style="width: 190px" @keyup.enter.native="handleQuery" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="el-icon-search" size="mini" @click="handleQuery">搜索</el-button>
        <el-button icon="el-icon-refresh" size="mini" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="el-icon-plus" size="mini" @click="openAdd">新增意见</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="warning" plain icon="el-icon-printer" size="mini" @click="goExport">一键导出 PDF</el-button>
      </el-col>
    </el-row>

    <!-- 电脑端：表格 -->
    <el-table v-if="!isMobile" v-loading="loading" :data="list" border size="small">
      <el-table-column prop="region" label="区域" width="110" align="center">
        <template slot-scope="scope"><el-tag size="mini">{{ scope.row.region }}</el-tag></template>
      </el-table-column>
      <el-table-column prop="title" label="意见标题" min-width="180" show-overflow-tooltip />
      <el-table-column prop="content" label="意见内容" min-width="260" show-overflow-tooltip />
      <el-table-column label="备注图片" width="190">
        <template slot-scope="scope">
          <div class="suggestion-thumbs">
            <img
              v-for="(img, index) in (scope.row.images || []).slice(0, 3)"
              :key="img.id"
              :src="suggestionImageUrl(img.fileId, 160)"
              alt=""
              loading="lazy"
              @click="openViewer(scope.row.images, index)"
            >
            <span v-if="(scope.row.images || []).length > 3">+{{ scope.row.images.length - 3 }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="130" align="center">
        <template slot-scope="scope">
          <el-button type="text" size="mini" icon="el-icon-edit" @click="openEdit(scope.row)">修改</el-button>
          <el-button type="text" size="mini" icon="el-icon-delete" @click="handleDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 手机端：卡片 -->
    <div v-else v-loading="loading" class="suggestion-cards">
      <div v-for="row in list" :key="row.id" class="suggestion-card" @click="openEdit(row)">
        <div class="suggestion-card__head">
          <el-tag size="mini">{{ row.region }}</el-tag>
          <span class="suggestion-card__title">{{ row.title }}</span>
        </div>
        <div v-if="row.content" class="suggestion-card__content">{{ row.content }}</div>
        <div v-if="row.images && row.images.length" class="suggestion-card__thumbs">
          <img
            v-for="(img, index) in row.images.slice(0, 4)"
            :key="img.id"
            :src="suggestionImageUrl(img.fileId, 320)"
            alt=""
            loading="lazy"
            @click.stop="openViewer(row.images, index)"
          >
          <span v-if="row.images.length > 4">+{{ row.images.length - 4 }}</span>
        </div>
      </div>
    </div>

    <el-empty v-if="!loading && !list.length" description="还没有意见，点「新增意见」记录一条" />

    <pagination
      v-show="total > 0"
      :total="total"
      :page.sync="query.pageNum"
      :limit.sync="query.pageSize"
      @pagination="getList"
    />

    <!-- 新增 / 修改 -->
    <el-dialog
      :title="form.id ? '修改装修意见' : '新增装修意见'"
      :visible.sync="formVisible"
      :width="isMobile ? '94%' : '620px'"
      :fullscreen="isMobile"
      append-to-body
    >
      <el-form label-width="86px" size="small">
        <el-form-item label="区域" required>
          <el-select v-model="form.region" placeholder="请选择区域" style="width: 100%">
            <el-option v-for="region in regions" :key="region" :label="region" :value="region" />
          </el-select>
        </el-form-item>
        <el-form-item label="意见标题" required>
          <el-input v-model="form.title" maxlength="200" placeholder="一句话说清这条意见" />
        </el-form-item>
        <el-form-item label="意见内容">
          <el-input v-model="form.content" type="textarea" :rows="4" maxlength="2000" placeholder="具体问题、建议做法…" />
        </el-form-item>
        <el-form-item label="备注图片">
          <el-upload
            :action="uploadUrl"
            :headers="uploadHeaders"
            :data="{ namespace: 'aiplatform' }"
            list-type="picture-card"
            :limit="10"
            :file-list="fileList"
            :on-success="handleUploadSuccess"
            :on-error="handleUploadError"
            :on-exceed="handleUploadExceed"
            :on-remove="handleUploadRemove"
            :on-preview="handlePreview"
            :before-upload="beforeUpload"
          >
            <i class="el-icon-plus" />
          </el-upload>
          <div class="el-upload__tip">最多 10 张，顺序即 PDF 里的展示顺序（一行三张）</div>
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button size="small" @click="formVisible = false">取消</el-button>
        <el-button type="primary" size="small" :loading="saving" @click="submit">保存</el-button>
      </div>
    </el-dialog>

    <!-- 图片放大 -->
    <div v-if="viewerVisible" class="suggestion-viewer" @click="viewerVisible = false">
      <div class="suggestion-viewer__bar">
        <span>{{ viewerIndex + 1 }} / {{ viewerImages.length }}</span>
        <span class="suggestion-viewer__close" @click.stop="viewerVisible = false">×</span>
      </div>
      <img v-if="viewerImages.length" class="suggestion-viewer__img" :src="suggestionImageUrl(viewerImages[viewerIndex].fileId)" alt="" @click.stop>
      <div v-if="viewerImages.length > 1" class="suggestion-viewer__nav">
        <button class="suggestion-viewer__btn" @click.stop="viewerPrev">‹</button>
        <button class="suggestion-viewer__btn" @click.stop="viewerNext">›</button>
      </div>
    </div>
  </div>
</template>

<script>
import { getToken } from '@/utils/auth'
import responsive from '@/mixins/responsive'
import {
  listSuggestionRegions,
  pageSuggestion,
  addSuggestion,
  updateSuggestion,
  delSuggestion,
  suggestionImageUrl,
  suggestionImageUploadUrl
} from '@/api/homeSuggestion'

export default {
  name: 'HomeSuggestion',
  mixins: [responsive],
  data() {
    return {
      loading: false,
      saving: false,
      regions: [],
      list: [],
      total: 0,
      query: { region: undefined, title: undefined, pageNum: 1, pageSize: 10 },
      formVisible: false,
      fileList: [],
      form: this.emptyForm(),
      viewerVisible: false,
      viewerImages: [],
      viewerIndex: 0
    }
  },
  computed: {
    uploadUrl() {
      return suggestionImageUploadUrl
    },
    uploadHeaders() {
      return { satoken: getToken() }
    }
  },
  created() {
    this.getRegions()
    this.getList()
  },
  methods: {
    suggestionImageUrl,
    emptyForm() {
      return { id: undefined, region: undefined, title: undefined, content: undefined, fileIds: [] }
    },
    getRegions() {
      listSuggestionRegions().then(res => {
        this.regions = res.data || []
      })
    },
    getList() {
      this.loading = true
      pageSuggestion(this.query).then(res => {
        const page = res.data || {}
        this.list = page.dataList || []
        this.total = page.total || 0
      }).finally(() => {
        this.loading = false
      })
    },
    handleQuery() {
      this.query.pageNum = 1
      this.getList()
    },
    resetQuery() {
      this.query = { region: undefined, title: undefined, pageNum: 1, pageSize: 10 }
      this.getList()
    },
    openAdd() {
      this.form = this.emptyForm()
      this.fileList = []
      this.formVisible = true
    },
    openEdit(row) {
      this.form = {
        id: row.id,
        region: row.region,
        title: row.title,
        content: row.content,
        fileIds: (row.images || []).map(image => image.fileId)
      }
      this.fileList = (row.images || []).map(image => ({
        name: '备注图 ' + (image.orderNum + 1),
        url: suggestionImageUrl(image.fileId, 320),
        fileId: image.fileId,
        uid: 'image-' + image.id
      }))
      this.formVisible = true
    },
    submit() {
      if (!this.form.region) {
        this.$modal.msgWarning('先选区域')
        return
      }
      if (!this.form.title) {
        this.$modal.msgWarning('写一句话说清这条意见')
        return
      }
      this.saving = true
      const request = this.form.id ? updateSuggestion(this.form.id, this.form) : addSuggestion(this.form)
      request.then(() => {
        this.$modal.msgSuccess(this.form.id ? '已保存' : '新增成功')
        this.formVisible = false
        this.getList()
      }).finally(() => {
        this.saving = false
      })
    },
    handleDelete(row) {
      this.$modal.confirm('确认删除「' + row.title + '」？').then(() => delSuggestion(row.id)).then(() => {
        this.$modal.msgSuccess('已删除')
        this.getList()
      }).catch(() => {})
    },
    goExport() {
      this.$router.push({ path: '/home-suggestion/export' })
    },
    beforeUpload(file) {
      if (!/image\/(jpeg|jpg|png|gif|webp)/.test(file.type)) {
        this.$modal.msgError('只能上传图片')
        return false
      }
      if (file.size / 1024 / 1024 > 10) {
        this.$modal.msgError('图片不要超过 10MB')
        return false
      }
      return true
    },
    handleUploadSuccess(response, file, fileList) {
      if (!response || !response.success) {
        this.$modal.msgError((response && response.errorMessage) || '图片上传失败')
        this.fileList = fileList.filter(item => item.uid !== file.uid)
        this.syncFileIds(this.fileList)
        return
      }
      file.fileId = response.data.id
      file.url = suggestionImageUrl(response.data.id, 320)
      this.fileList = fileList.map(item => item)
      this.syncFileIds(this.fileList)
    },
    handleUploadError() {
      this.$modal.msgError('图片上传失败')
    },
    handleUploadExceed() {
      this.$modal.msgError('最多 10 张图片')
    },
    handleUploadRemove(file, fileList) {
      this.fileList = fileList
      this.syncFileIds(fileList)
    },
    handlePreview(file) {
      const images = this.fileList.map(item => ({ fileId: item.fileId }))
      const index = this.fileList.findIndex(item => item.uid === file.uid)
      this.openViewer(images, index < 0 ? 0 : index)
    },
    syncFileIds(fileList) {
      this.form.fileIds = (fileList || [])
        .map(item => item.fileId || (item.response && item.response.data && item.response.data.id))
        .filter(id => !!id)
    },
    openViewer(images, index) {
      if (!images || !images.length) {
        return
      }
      this.viewerImages = images
      this.viewerIndex = index || 0
      this.viewerVisible = true
    },
    viewerPrev() {
      this.viewerIndex = (this.viewerIndex - 1 + this.viewerImages.length) % this.viewerImages.length
    },
    viewerNext() {
      this.viewerIndex = (this.viewerIndex + 1) % this.viewerImages.length
    }
  }
}
</script>

<style scoped>
.suggestion-thumbs {
  display: flex;
  align-items: center;
}

.suggestion-thumbs img,
.suggestion-card__thumbs img {
  width: 44px;
  height: 34px;
  object-fit: cover;
  border-radius: 4px;
  margin-right: 4px;
  border: 1px solid #ebeef5;
  cursor: zoom-in;
}

.suggestion-page--mobile {
  padding-bottom: 24px;
}

.suggestion-cards .suggestion-card {
  background: #fff;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 10px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);
}

.suggestion-card__head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.suggestion-card__title {
  font-size: 15px;
  font-weight: 600;
}

.suggestion-card__content {
  font-size: 13px;
  color: #606266;
  margin-top: 6px;
}

.suggestion-card__thumbs {
  margin-top: 8px;
  display: flex;
  align-items: center;
}

.suggestion-card__thumbs img {
  width: 64px;
  height: 64px;
}

.suggestion-viewer {
  position: fixed;
  inset: 0;
  background: rgba(12, 10, 9, 0.93);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.suggestion-viewer__bar {
  position: absolute;
  top: calc(10px + env(safe-area-inset-top));
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  padding: 0 18px;
  color: #fff;
}

.suggestion-viewer__close {
  font-size: 30px;
  cursor: pointer;
}

.suggestion-viewer__img {
  max-width: 100vw;
  max-height: 100vh;
  object-fit: contain;
  padding: 54px 8px calc(64px + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.suggestion-viewer__nav {
  position: absolute;
  bottom: calc(18px + env(safe-area-inset-bottom));
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 56px;
}

.suggestion-viewer__btn {
  width: 46px;
  height: 46px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  font-size: 24px;
}
</style>
