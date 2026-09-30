<template>
  <div class="app-container purchase-page" :class="{ 'purchase-page--mobile': isMobile }">
    <!-- ============ 移动端：搜索 + 卡片流 ============ -->
    <template v-if="isMobile">
      <div class="purchase-mobile-bar">
        <el-input v-model="query.productName" size="small" placeholder="搜索产品名称" clearable @keyup.enter.native="handleQuery">
          <el-button slot="append" icon="el-icon-search" @click="handleQuery" />
        </el-input>
        <el-select v-model="query.bigTypeCode" size="small" placeholder="全部大类" clearable @change="handleBigTypeChange">
          <el-option v-for="group in types" :key="group.code" :label="group.icon + ' ' + group.name" :value="group.code" />
        </el-select>
      </div>

      <div class="purchase-cards">
        <div v-for="item in list" :key="item.id" class="purchase-card" @click="handleEdit(item)">
          <div class="purchase-card__head">
            <span class="purchase-card__icon">{{ typeIcon(item) }}</span>
            <div class="purchase-card__title">
              <div class="purchase-card__name">{{ item.productName }}</div>
              <div class="purchase-card__sub">{{ item.bigTypeName }} · {{ item.typeName }}</div>
            </div>
            <div class="purchase-card__budget">{{ item.budgetText }}</div>
          </div>
          <div v-if="item.images && item.images.length" class="purchase-card__thumbs">
            <img v-for="img in item.images.slice(0, 4)" :key="img.id" :src="imagePreviewUrl(img.fileId)" alt="参考图" />
            <span v-if="item.images.length > 4" class="purchase-card__more">+{{ item.images.length - 4 }}</span>
          </div>
          <div class="purchase-card__foot">
            <span>数量 {{ item.quantity }}</span>
            <span v-if="item.installFee">安装费 ¥{{ item.installFee }}</span>
            <span v-if="item.remark" class="purchase-card__remark">{{ item.remark }}</span>
          </div>
        </div>
        <div v-if="!loading && !list.length" class="purchase-empty">还没有采购项，点右下角「+」开始添加</div>
      </div>

      <div class="purchase-fab" @click="handleAdd">+</div>
      <div v-if="total > list.length" class="purchase-loadmore" @click="loadMore">加载更多（{{ list.length }}/{{ total }}）</div>
    </template>

    <!-- ============ 桌面端：筛选 + 表格 ============ -->
    <template v-else>
      <el-form :inline="true" size="small" class="purchase-page__filter">
        <el-form-item label="大类">
          <el-select v-model="query.bigTypeCode" placeholder="全部" clearable style="width: 150px" @change="handleBigTypeChange">
            <el-option v-for="group in types" :key="group.code" :label="group.icon + ' ' + group.name" :value="group.code" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="query.typeCode" placeholder="全部" clearable filterable style="width: 150px">
            <el-option v-for="type in typeOptions" :key="type.code" :label="type.icon + ' ' + type.name" :value="type.code" />
          </el-select>
        </el-form-item>
        <el-form-item label="产品名称">
          <el-input v-model="query.productName" placeholder="模糊搜索" clearable style="width: 180px" @keyup.enter.native="handleQuery" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" size="mini" @click="handleQuery">搜索</el-button>
          <el-button icon="el-icon-refresh" size="mini" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <el-row :gutter="10" class="mb8">
        <el-col :span="1.5">
          <el-button type="primary" plain icon="el-icon-plus" size="mini" @click="handleAdd">新增采购项</el-button>
        </el-col>
        <el-col :span="1.5">
          <el-button type="warning" plain icon="el-icon-document" size="mini" @click="goReport">生成预算报告</el-button>
        </el-col>
      </el-row>

      <el-table v-loading="loading" :data="list" border size="small">
        <el-table-column label="类型" width="200">
          <template slot-scope="scope">
            <span class="purchase-type">{{ typeIcon(scope.row) }} {{ scope.row.bigTypeName }} · {{ scope.row.typeName }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="productName" label="产品名称" min-width="150" show-overflow-tooltip />
        <el-table-column prop="quantity" label="数量" width="70" align="center" />
        <el-table-column prop="budgetText" label="预算（单件）" width="140" />
        <el-table-column label="安装费" width="100" align="right">
          <template slot-scope="scope">{{ scope.row.installFee ? '¥' + scope.row.installFee : '-' }}</template>
        </el-table-column>
        <el-table-column label="小计区间" width="180" align="right">
          <template slot-scope="scope">{{ itemTotalLabel(scope.row) }}</template>
        </el-table-column>
        <el-table-column label="参考图片" width="150">
          <template slot-scope="scope">
            <div class="purchase-table__thumbs">
              <img v-for="img in (scope.row.images || []).slice(0, 3)" :key="img.id" :src="imagePreviewUrl(img.fileId)" alt="参考图" />
              <span v-if="(scope.row.images || []).length > 3">+{{ scope.row.images.length - 3 }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
        <el-table-column label="操作" width="130" align="center">
          <template slot-scope="scope">
            <el-button type="text" size="mini" icon="el-icon-edit" @click="handleEdit(scope.row)">修改</el-button>
            <el-button type="text" size="mini" icon="el-icon-delete" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <pagination
        v-show="total > 0"
        :total="total"
        :page.sync="query.pageNum"
        :limit.sync="query.pageSize"
        @pagination="getList"
      />
    </template>

    <!-- ============ 新增 / 修改 ============ -->
    <el-dialog
      :title="form.id ? '修改采购项' : '新增采购项'"
      :visible.sync="dialogVisible"
      :width="isMobile ? '94%' : '620px'"
      :fullscreen="isMobile"
      append-to-body
      @closed="resetForm"
    >
      <el-form ref="form" :model="form" :rules="rules" label-width="86px" size="small">
        <el-form-item label="大类" prop="bigTypeCode">
          <el-select v-model="form.bigTypeCode" placeholder="请选择大类" style="width: 100%" @change="handleFormBigTypeChange">
            <el-option v-for="group in types" :key="group.code" :label="group.icon + ' ' + group.name" :value="group.code" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型" prop="typeCode">
          <el-select v-model="form.typeCode" placeholder="请选择类型" filterable style="width: 100%">
            <el-option v-for="type in formTypeOptions" :key="type.code" :label="type.icon + ' ' + type.name" :value="type.code" />
          </el-select>
        </el-form-item>
        <el-form-item label="产品名称" prop="productName">
          <el-input v-model="form.productName" placeholder="如 格力 云锦Ⅲ 1.5匹" maxlength="200" />
        </el-form-item>
        <el-form-item label="预算" prop="budgetText">
          <el-input v-model="form.budgetText" placeholder="区间写 800~1200，精确值写 999">
            <el-button slot="append" icon="el-icon-magic-stick" :loading="recommendLoading" @click="handleRecommend">AI 推荐</el-button>
          </el-input>
        </el-form-item>
        <el-row :gutter="10">
          <el-col :span="12">
            <el-form-item label="数量" prop="quantity">
              <el-input-number v-model="form.quantity" :min="1" :max="999" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="安装费">
              <el-input-number v-model="form.installFee" :min="0" :precision="2" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="参考图片">
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
            :before-upload="beforeUpload"
          >
            <i class="el-icon-plus" />
          </el-upload>
          <div class="el-upload__tip">最多 10 张，顺序即报告里的展示顺序；可以先不传，之后回来补。</div>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="500" placeholder="户型、品牌偏好、尺寸等" />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button size="small" @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" size="small" :loading="submitting" @click="submitForm">保存</el-button>
      </div>
    </el-dialog>

    <!-- ============ AI 推荐结果 ============ -->
    <el-dialog title="AI 推荐（经济性好 / 销量高 / 口碑好）" :visible.sync="recommendVisible" :width="isMobile ? '94%' : '680px'" append-to-body>
      <div v-if="recommendList.length" class="recommend-list">
        <div v-for="(item, index) in recommendList" :key="index" class="recommend-card">
          <div class="recommend-card__title">{{ item.name || '推荐 ' + (index + 1) }}</div>
          <div v-if="item.priceRange" class="recommend-card__price">参考价 ¥{{ item.priceRange }}</div>
          <div class="recommend-card__reason">{{ item.reason }}</div>
          <div v-if="item.highlights && item.highlights.length" class="recommend-card__tags">
            <el-tag v-for="tag in item.highlights" :key="tag" size="mini" type="success">{{ tag }}</el-tag>
          </div>
          <el-button v-if="item.name" type="primary" plain size="mini" @click="applySuggestion(item)">用这款</el-button>
        </div>
      </div>
      <div v-else class="recommend-empty">暂时没有推荐结果</div>
    </el-dialog>
  </div>
</template>

<script>
import { getToken } from '@/utils/auth'
import responsive from '@/mixins/responsive'
import {
  listFurnitureTypes,
  pagePurchaseItem,
  addPurchaseItem,
  updatePurchaseItem,
  delPurchaseItem,
  recommendProducts,
  imagePreviewUrl,
  imageUploadUrl
} from '@/api/homePurchase'

export default {
  name: 'HomePurchaseList',
  mixins: [responsive],
  data() {
    return {
      loading: false,
      submitting: false,
      types: [],
      list: [],
      total: 0,
      query: {
        bigTypeCode: undefined,
        typeCode: undefined,
        productName: undefined,
        pageNum: 1,
        pageSize: 10
      },
      dialogVisible: false,
      fileList: [],
      form: this.buildEmptyForm(),
      rules: {
        bigTypeCode: [{ required: true, message: '请选择大类', trigger: 'change' }],
        typeCode: [{ required: true, message: '请选择类型', trigger: 'change' }],
        productName: [{ required: true, message: '请填写产品名称', trigger: 'blur' }],
        budgetText: [{ required: true, message: '请填写预算', trigger: 'blur' }]
      },
      recommendVisible: false,
      recommendLoading: false,
      recommendList: []
    }
  },
  computed: {
    uploadUrl() {
      return imageUploadUrl
    },
    uploadHeaders() {
      return { satoken: getToken() }
    },
    typeOptions() {
      const group = this.types.find(item => item.code === this.query.bigTypeCode)
      return group ? group.children : []
    },
    formTypeOptions() {
      const group = this.types.find(item => item.code === this.form.bigTypeCode)
      return group ? group.children : []
    }
  },
  created() {
    this.getTypes()
    this.getList()
  },
  methods: {
    imagePreviewUrl,
    buildEmptyForm() {
      return {
        id: undefined,
        bigTypeCode: undefined,
        typeCode: undefined,
        productName: undefined,
        quantity: 1,
        budgetText: undefined,
        installFee: undefined,
        remark: undefined,
        fileIds: []
      }
    },
    getTypes() {
      listFurnitureTypes().then(response => {
        this.types = response.data || []
      })
    },
    getList() {
      this.loading = true
      pagePurchaseItem(this.query).then(response => {
        const page = response.data || {}
        this.list = page.dataList || []
        this.total = page.total || 0
      }).finally(() => {
        this.loading = false
      })
    },
    loadMore() {
      this.query.pageNum += 1
      this.loading = true
      pagePurchaseItem(this.query).then(response => {
        const page = response.data || {}
        this.list = this.list.concat(page.dataList || [])
      }).finally(() => {
        this.loading = false
      })
    },
    handleQuery() {
      this.query.pageNum = 1
      this.getList()
    },
    resetQuery() {
      this.query = { bigTypeCode: undefined, typeCode: undefined, productName: undefined, pageNum: 1, pageSize: 10 }
      this.getList()
    },
    handleBigTypeChange() {
      this.query.typeCode = undefined
      this.handleQuery()
    },
    handleFormBigTypeChange() {
      this.form.typeCode = undefined
    },
    typeIcon(row) {
      const group = this.types.find(item => item.code === row.bigTypeCode)
      if (!group) {
        return '🧾'
      }
      const type = (group.children || []).find(item => item.code === row.typeCode)
      return (type && type.icon) || group.icon || '🧾'
    },
    /** 单件区间 × 数量 + 安装费 */
    itemTotalLabel(row) {
      const min = Number(row.budgetMin || 0)
      const max = Number(row.budgetMax || 0)
      const quantity = Number(row.quantity || 1)
      const installFee = Number(row.installFee || 0)
      const low = min * quantity + installFee
      const high = max * quantity + installFee
      return low === high ? '¥' + low : '¥' + low + ' ~ ¥' + high
    },
    handleAdd() {
      this.form = this.buildEmptyForm()
      this.fileList = []
      this.dialogVisible = true
    },
    handleEdit(row) {
      this.form = {
        id: row.id,
        bigTypeCode: row.bigTypeCode,
        typeCode: row.typeCode,
        productName: row.productName,
        quantity: row.quantity || 1,
        budgetText: row.budgetText,
        installFee: row.installFee,
        remark: row.remark,
        fileIds: (row.images || []).map(image => image.fileId)
      }
      this.fileList = (row.images || []).map(image => ({
        name: '参考图 ' + (image.orderNum + 1),
        url: imagePreviewUrl(image.fileId),
        fileId: image.fileId,
        uid: 'image-' + image.id
      }))
      this.dialogVisible = true
    },
    submitForm() {
      this.$refs.form.validate(valid => {
        if (!valid) {
          return
        }
        this.submitting = true
        const request = this.form.id
          ? updatePurchaseItem(this.form.id, this.form)
          : addPurchaseItem(this.form)
        request.then(() => {
          this.$modal.msgSuccess(this.form.id ? '修改成功' : '新增成功')
          this.dialogVisible = false
          this.getList()
        }).finally(() => {
          this.submitting = false
        })
      })
    },
    handleDelete(row) {
      this.$modal.confirm('确认删除采购项「' + row.productName + '」？').then(() => {
        return delPurchaseItem(row.id)
      }).then(() => {
        this.$modal.msgSuccess('删除成功')
        this.getList()
      }).catch(() => {})
    },
    resetForm() {
      this.form = this.buildEmptyForm()
      this.fileList = []
      this.recommendList = []
      if (this.$refs.form) {
        this.$refs.form.clearValidate()
      }
    },
    /** 上传前限制图片格式与大小 */
    beforeUpload(file) {
      const isImage = /image\/(jpeg|jpg|png|gif|webp)/.test(file.type)
      if (!isImage) {
        this.$modal.msgError('只能上传图片文件')
        return false
      }
      if (file.size / 1024 / 1024 > 10) {
        this.$modal.msgError('图片大小不能超过 10MB')
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
      file.url = imagePreviewUrl(response.data.id)
      this.fileList = fileList.map(item => item)
      this.syncFileIds(this.fileList)
    },
    handleUploadError() {
      this.$modal.msgError('图片上传失败')
    },
    handleUploadExceed() {
      this.$modal.msgError('最多上传 10 张图片')
    },
    handleUploadRemove(file, fileList) {
      this.fileList = fileList
      this.syncFileIds(fileList)
    },
    syncFileIds(fileList) {
      this.form.fileIds = (fileList || [])
        .map(item => item.fileId || (item.response && item.response.data && item.response.data.id))
        .filter(id => !!id)
    },
    handleRecommend() {
      if (!this.form.bigTypeCode || !this.form.typeCode) {
        this.$modal.msgWarning('请先选择大类与类型')
        return
      }
      this.recommendLoading = true
      recommendProducts({
        bigTypeCode: this.form.bigTypeCode,
        typeCode: this.form.typeCode,
        budgetText: this.form.budgetText,
        remark: this.form.remark
      }).then(response => {
        this.recommendList = response.data || []
        this.recommendVisible = true
      }).finally(() => {
        this.recommendLoading = false
      })
    },
    applySuggestion(item) {
      this.form.productName = item.name
      if (item.priceRange) {
        this.form.budgetText = item.priceRange
      }
      this.recommendVisible = false
      this.$modal.msgSuccess('已填入表单，可继续调整')
    },
    goReport() {
      this.$router.push({ path: '/home-purchase/report' })
    }
  }
}
</script>

<style scoped>
.purchase-page__filter {
  margin-bottom: 6px;
}

.purchase-type {
  white-space: nowrap;
}

.purchase-table__thumbs img,
.purchase-card__thumbs img {
  width: 34px;
  height: 34px;
  object-fit: cover;
  border-radius: 4px;
  margin-right: 4px;
  border: 1px solid #ebeef5;
}

.purchase-table__thumbs {
  display: flex;
  align-items: center;
}

/* ---------- 移动端 ---------- */
.purchase-page--mobile {
  padding: 10px 10px 70px;
}

.purchase-mobile-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.purchase-mobile-bar .el-select {
  width: 130px;
  flex: none;
}

.purchase-card {
  background: #fff;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 10px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);
}

.purchase-card__head {
  display: flex;
  align-items: center;
}

.purchase-card__icon {
  font-size: 24px;
  margin-right: 8px;
}

.purchase-card__title {
  flex: 1;
  min-width: 0;
}

.purchase-card__name {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.purchase-card__sub {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.purchase-card__budget {
  font-size: 14px;
  font-weight: 600;
  color: #e6a23c;
  margin-left: 8px;
}

.purchase-card__thumbs {
  margin-top: 10px;
  display: flex;
  align-items: center;
}

.purchase-card__thumbs img {
  width: 52px;
  height: 52px;
}

.purchase-card__more {
  font-size: 12px;
  color: #909399;
}

.purchase-card__foot {
  margin-top: 8px;
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #606266;
}

.purchase-card__remark {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.purchase-empty,
.purchase-loadmore {
  text-align: center;
  color: #909399;
  font-size: 13px;
  padding: 16px 0;
}

.purchase-fab {
  position: fixed;
  right: 18px;
  bottom: 26px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #409eff;
  color: #fff;
  font-size: 30px;
  line-height: 50px;
  text-align: center;
  box-shadow: 0 3px 10px rgba(64, 158, 255, 0.45);
  z-index: 1500;
}

/* ---------- AI 推荐卡片 ---------- */
.recommend-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.recommend-card {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 12px;
}

.recommend-card__title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.recommend-card__price {
  color: #e6a23c;
  font-size: 13px;
  margin: 4px 0;
}

.recommend-card__reason {
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
  margin-bottom: 6px;
}

.recommend-card__tags {
  margin-bottom: 8px;
}

.recommend-card__tags .el-tag {
  margin-right: 6px;
}

.recommend-empty {
  color: #909399;
  text-align: center;
  padding: 20px 0;
}
</style>
