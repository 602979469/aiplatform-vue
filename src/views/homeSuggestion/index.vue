<template>
  <div class="app-container suggestion-page" :class="{ 'suggestion-page--mobile': isMobile }">
    <!-- 电脑端：筛选 + 工具栏 -->
    <template v-if="!isMobile">
      <el-form :inline="true" size="small" class="suggestion-filter">
        <el-form-item label="区域">
          <el-select v-model="query.region" placeholder="全部区域" clearable style="width: 150px" @change="handleQuery">
            <el-option v-for="region in regions" :key="region" :label="region" :value="region" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部状态" clearable style="width: 130px" @change="handleQuery">
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
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
          <el-button type="success" plain icon="el-icon-magic-stick" size="mini" @click="openAi">AI 识别</el-button>
        </el-col>
        <el-col :span="1.5">
          <el-button type="warning" plain icon="el-icon-printer" size="mini" @click="goExport">一键导出 PDF</el-button>
        </el-col>
      </el-row>
    </template>

    <!-- 手机端：区域 chips + 搜索 -->
    <div v-else class="suggestion-mobile-bar">
      <div class="suggestion-chips">
        <span class="suggestion-chip" :class="{ 'suggestion-chip--on': !query.region }" @click="pickRegion(undefined)">全部</span>
        <span
          v-for="region in regions"
          :key="region"
          class="suggestion-chip"
          :class="{ 'suggestion-chip--on': query.region === region }"
          @click="pickRegion(region)"
        >{{ region }}</span>
      </div>
      <div class="suggestion-mobile-search">
        <el-input
          v-model="query.title"
          size="small"
          clearable
          prefix-icon="el-icon-search"
          placeholder="搜意见标题"
          @keyup.enter.native="handleQuery"
          @clear="handleQuery"
        />
        <el-select v-model="query.status" size="small" clearable placeholder="状态" @change="handleQuery">
          <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </div>
    </div>

    <!-- 电脑端：表格 -->
    <el-table v-if="!isMobile" v-loading="loading" :data="list" border size="small">
      <el-table-column prop="region" label="区域" width="110" align="center">
        <template slot-scope="scope"><el-tag size="mini">{{ scope.row.region }}</el-tag></template>
      </el-table-column>
      <el-table-column label="状态" width="110" align="center">
        <template slot-scope="scope">
          <el-tag size="mini" :type="statusTagType(scope.row.status)">{{ statusText(scope.row) }}</el-tag>
          <div v-if="scope.row.rejectReason" class="suggestion-reason">
            <el-tooltip :content="scope.row.rejectReason" placement="top">
              <span>驳回原因</span>
            </el-tooltip>
          </div>
        </template>
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
      <el-table-column label="操作" width="215" align="center">
        <template slot-scope="scope">
          <el-button type="text" size="mini" icon="el-icon-check" @click="handleAdopt(scope.row)">采纳</el-button>
          <el-button type="text" size="mini" icon="el-icon-close" @click="handleReject(scope.row)">驳回</el-button>
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
          <el-tag size="mini" class="suggestion-card__status" :type="statusTagType(row.status)">{{ statusText(row) }}</el-tag>
        </div>
        <div v-if="row.content" class="suggestion-card__content">{{ row.content }}</div>
        <div v-if="row.rejectReason" class="suggestion-card__reject">驳回原因：{{ row.rejectReason }}</div>
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
        <div class="suggestion-card__ops" @click.stop>
          <button type="button" class="suggestion-card__op" @click="handleAdopt(row)">✓ 采纳</button>
          <button type="button" class="suggestion-card__op" @click="handleReject(row)">✕ 驳回</button>
        </div>
      </div>
    </div>

    <el-empty v-if="!loading && !list.length" :description="isMobile ? '还没有意见，点下方「一句话记意见」说一句就行' : '还没有意见，点「AI 识别」说一句就能记一条'" />

    <!-- 手机端：底部固定入口（添加一律走 AI） -->
    <div v-if="isMobile" class="suggestion-fab">
      <button type="button" class="suggestion-fab__main" @click="openAi">✨ 一句话记意见</button>
      <button type="button" class="suggestion-fab__sub" @click="goExport">导出 PDF</button>
    </div>

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
        <el-form-item v-if="formRejectReason" label="驳回原因">
          <div class="suggestion-reject-text">{{ formRejectReason }}</div>
        </el-form-item>
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
        <el-button
          v-if="form.id"
          type="text"
          style="float: left; color: #f56c6c"
          @click="handleDelete(form)"
        >删除</el-button>
        <el-button size="small" @click="formVisible = false">取消</el-button>
        <el-button type="primary" size="small" :loading="saving" @click="submit">保存</el-button>
      </div>
    </el-dialog>

    <!-- AI 一句话识别 -->
    <el-dialog title="AI 识别装修意见" :visible.sync="aiVisible" :width="isMobile ? '94%' : '560px'" :fullscreen="isMobile" append-to-body>
      <div class="ai-tip">
        随口说一句就行，例如：<b>厨房台面想做 85cm，不然洗碗一直弯腰</b>；AI 会自动判断区域、拟好标题和内容，
        识别完弹到表单里，确认无误（有照片可以顺手传）点保存就创建。
      </div>
      <el-input
        v-model="aiText"
        type="textarea"
        :rows="4"
        maxlength="500"
        placeholder="例：主卧床头插座被床头柜挡住了，想上移到 75cm，最好带两个 USB"
      />
      <div v-if="aiError" class="ai-error">{{ aiError }}</div>
      <div slot="footer">
        <el-button size="small" @click="aiVisible = false">取消</el-button>
        <el-button type="primary" size="small" :loading="aiLoading" @click="submitAi">
          {{ aiLoading ? '识别中…' : '识别' }}
        </el-button>
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
  parseSuggestion,
  adoptSuggestion,
  rejectSuggestion,
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
      query: { region: undefined, title: undefined, status: undefined, pageNum: 1, pageSize: 10 },
      statusOptions: [
        { value: 'PENDING', label: '待处理' },
        { value: 'ADOPTED', label: '已采纳' },
        { value: 'REJECTED', label: '已驳回' }
      ],
      formVisible: false,
      fileList: [],
      form: this.emptyForm(),
      formRejectReason: '',
      viewerVisible: false,
      viewerImages: [],
      viewerIndex: 0,
      aiVisible: false,
      aiText: '',
      aiLoading: false,
      aiError: ''
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
    pickRegion(region) {
      if (this.query.region === region) {
        return
      }
      this.query.region = region
      this.handleQuery()
    },
    resetQuery() {
      this.query = { region: undefined, title: undefined, status: undefined, pageNum: 1, pageSize: 10 }
      this.getList()
    },
    /** 状态文案：后端返回 statusName 时直接用它，兜底查本地映射 */
    statusText(row) {
      if (row.statusName) {
        return row.statusName
      }
      const hit = this.statusOptions.find(item => item.value === row.status)
      return hit ? hit.label : '待处理'
    },
    statusTagType(status) {
      if (status === 'ADOPTED') {
        return 'success'
      }
      if (status === 'REJECTED') {
        return 'danger'
      }
      return 'info'
    },
    /** 采纳：采纳后导出 PDF 不再展示这条 */
    handleAdopt(row) {
      if (row.status === 'ADOPTED') {
        this.$modal.msgWarning('这条已经是「已采纳」了')
        return
      }
      this.$modal.confirm('采纳「' + row.title + '」？采纳后导出 PDF 不再显示这条。').then(() => {
        return adoptSuggestion(row.id)
      }).then(() => {
        this.$modal.msgSuccess('已采纳')
        this.getList()
      }).catch(() => {})
    },
    /** 驳回：必须填原因，重复驳回会覆盖旧原因 */
    handleReject(row) {
      this.$prompt('填写驳回原因（会打印在导出的 PDF 上）', '驳回：' + row.title, {
        confirmButtonText: '确定驳回',
        cancelButtonText: '取消',
        inputType: 'textarea',
        inputValue: row.rejectReason || '',
        inputPlaceholder: '例如：按标准做法即可，不做定制',
        inputValidator: value => ((value && value.trim()) ? true : '驳回要写个原因')
      }).then(result => {
        return rejectSuggestion(row.id, result.value.trim())
      }).then(() => {
        this.$modal.msgSuccess('已驳回')
        this.getList()
      }).catch(() => {})
    },
    openEdit(row) {
      this.formRejectReason = row.rejectReason || ''
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
        if (this.form.id === row.id) {
          this.formVisible = false
        }
        this.getList()
      }).catch(() => {})
    },
    goExport() {
      this.$router.push({ path: '/home-suggestion/export' })
    },
    /** 打开 AI 一句话识别 */
    openAi() {
      this.aiText = ''
      this.aiError = ''
      this.aiVisible = true
    },
    /**
     * 识别 → 把结果预填到新增表单，用户确认后点「保存」才真正落库
     * （图片之后再补，所以这里只填区域/标题/内容）
     */
    submitAi() {
      const text = (this.aiText || '').trim()
      if (!text) {
        this.$modal.msgWarning('先说一句装修意见')
        return
      }
      this.aiLoading = true
      this.aiError = ''
      parseSuggestion({ text: text }).then(res => {
        const draft = res.data || null
        if (!draft) {
          this.aiError = '没听清，换个说法试试'
          return
        }
        this.aiVisible = false
        this.formRejectReason = ''
        this.form = {
          id: undefined,
          region: draft.region,
          title: draft.title,
          content: draft.content,
          fileIds: []
        }
        this.fileList = []
        this.formVisible = true
        this.$modal.msgSuccess('AI 已识别，确认无误点「保存」即可创建')
      }).catch(error => {
        this.aiError = (error && error.message) || '没听清，换个说法试试'
      }).finally(() => {
        this.aiLoading = false
      })
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
  padding-bottom: calc(88px + env(safe-area-inset-bottom));
}

.suggestion-mobile-bar {
  background: #fff;
  border-radius: 10px;
  padding: 10px 10px 10px;
  margin-bottom: 10px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.05);
}

.suggestion-chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 8px;
  -webkit-overflow-scrolling: touch;
}

.suggestion-chips::-webkit-scrollbar {
  display: none;
}

.suggestion-mobile-search {
  display: flex;
  align-items: center;
  gap: 8px;
}

.suggestion-mobile-search .el-select {
  flex: 0 0 92px;
  width: 92px;
}

.suggestion-reason {
  margin-top: 4px;
  font-size: 12px;
  color: #f56c6c;
  cursor: help;
}

.suggestion-reject-text {
  font-size: 13px;
  color: #f56c6c;
  line-height: 1.7;
  background: #fdf0ef;
  border-radius: 6px;
  padding: 8px 10px;
}

.suggestion-chip {
  flex: 0 0 auto;
  padding: 5px 12px;
  border-radius: 999px;
  background: #f2f3f5;
  color: #606266;
  font-size: 13px;
  line-height: 18px;
}

.suggestion-chip--on {
  background: #409eff;
  color: #fff;
  font-weight: 600;
}

.suggestion-fab {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 10px;
  padding: 8px 12px calc(10px + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.08);
  z-index: 1500;
}

.suggestion-fab__main {
  flex: 1;
  height: 44px;
  border: none;
  border-radius: 22px;
  background: linear-gradient(135deg, #5b8cff, #7a5cff);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(91, 140, 255, 0.35);
}

.suggestion-fab__sub {
  height: 44px;
  padding: 0 16px;
  border: 1px solid #dcdfe6;
  border-radius: 22px;
  background: #fff;
  color: #606266;
  font-size: 14px;
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

.suggestion-card__status {
  margin-left: auto;
  flex: 0 0 auto;
}

.suggestion-card__reject {
  margin-top: 6px;
  font-size: 12px;
  color: #f56c6c;
}

.suggestion-card__ops {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #f2f3f5;
}

.suggestion-card__op {
  flex: 1;
  height: 32px;
  border: 1px solid #dcdfe6;
  border-radius: 16px;
  background: #fff;
  color: #606266;
  font-size: 13px;
}

.suggestion-card__op:first-child {
  border-color: #b3e19d;
  color: #67c23a;
}

.suggestion-card__op:last-child {
  border-color: #fbc4c4;
  color: #f56c6c;
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

.ai-tip {
  font-size: 13px;
  color: #606266;
  line-height: 1.8;
  background: #f5f7fa;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 12px;
}

.ai-error {
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  background: #fdf0ef;
  color: #d9534f;
  font-size: 13px;
}
</style>
