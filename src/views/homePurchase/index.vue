<template>
  <div class="hp" :class="{ 'hp--mobile': isMobile }">
    <!-- ==================== 手机端（客户端风格） ==================== -->
    <template v-if="isMobile">
      <div class="hp-hero">
        <div class="hp-hero__title">我的家装清单</div>
        <div class="hp-hero__sub">{{ heroSub }}</div>
        <div class="hp-hero__stats">
          <div class="hp-stat">
            <div class="hp-stat__num">{{ total }}</div>
            <div class="hp-stat__label">已录入</div>
          </div>
          <div class="hp-stat">
            <div class="hp-stat__num">{{ filledCount }}</div>
            <div class="hp-stat__label">已填预算</div>
          </div>
          <div class="hp-stat">
            <div class="hp-stat__num">{{ imageCount }}</div>
            <div class="hp-stat__label">参考图片</div>
          </div>
        </div>
      </div>

      <div class="hp-search">
        <i class="el-icon-search" />
        <input v-model="query.productName" placeholder="搜家具名称" @keyup.enter="handleQuery">
        <span v-if="query.productName" class="hp-search__clear" @click="clearSearch">×</span>
      </div>

      <div class="hp-chips">
        <div class="hp-chip" :class="{ 'is-active': !query.bigTypeCode }" @click="filterGroup(undefined)">全部</div>
        <div
          v-for="group in types"
          :key="group.code"
          class="hp-chip"
          :class="{ 'is-active': query.bigTypeCode === group.code }"
          @click="filterGroup(group.code)"
        >{{ group.icon }} {{ group.name }}</div>
      </div>

      <div v-if="loading && !list.length" class="hp-loading">正在加载…</div>

      <div class="hp-list">
        <div v-for="item in list" :key="item.id" class="hp-card" @click="openEdit(item)">
          <div class="hp-card__top">
            <div class="hp-card__icon">{{ typeIconFor(item) }}</div>
            <div class="hp-card__info">
              <div class="hp-card__name">{{ item.productName }}</div>
              <div class="hp-card__type">{{ item.bigTypeName }} · {{ item.typeName }}</div>
            </div>
            <div class="hp-card__arrow">›</div>
          </div>
          <div v-if="item.images && item.images.length" class="hp-card__photos">
            <img v-for="img in item.images.slice(0, 4)" :key="img.id" :src="imagePreviewUrl(img.fileId)" alt="">
            <span v-if="item.images.length > 4" class="hp-card__more">+{{ item.images.length - 4 }}</span>
          </div>
          <div class="hp-card__bottom">
            <span v-if="item.budgetText" class="hp-tag hp-tag--money">￥{{ item.budgetText }}</span>
            <span v-else class="hp-tag hp-tag--todo">待填预算</span>
            <span v-if="item.quantity > 1" class="hp-tag">×{{ item.quantity }}</span>
            <span v-if="item.installFee" class="hp-tag">安装费 ￥{{ item.installFee }}</span>
            <span v-if="item.remark" class="hp-card__remark">{{ item.remark }}</span>
          </div>
        </div>
      </div>

      <div v-if="!loading && !list.length" class="hp-empty">
        <div class="hp-empty__icon">🛋️</div>
        <div class="hp-empty__title">清单还没准备好</div>
        <div class="hp-empty__desc">等设计师在电脑端把家具录进来，你在这里填预算就行</div>
      </div>

      <div v-if="list.length && total > list.length" class="hp-more" @click="loadMore">加载更多（{{ list.length }}/{{ total }}）</div>

      <div class="hp-bottom">
        <button class="hp-bottom__btn" @click="openAdd">＋ 添加家具</button>
      </div>
    </template>

    <!-- ==================== 电脑端（保留表格） ==================== -->
    <template v-else>
      <el-form :inline="true" size="small" class="hp-filter">
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
          <el-button type="primary" plain icon="el-icon-plus" size="mini" @click="openAdd">新增采购项</el-button>
        </el-col>
        <el-col :span="1.5">
          <el-button type="warning" plain icon="el-icon-document" size="mini" @click="goReport">生成预算报告</el-button>
        </el-col>
      </el-row>

      <el-table v-loading="loading" :data="list" border size="small">
        <el-table-column label="类型" width="200">
          <template slot-scope="scope">{{ typeIconFor(scope.row) }} {{ scope.row.bigTypeName }} · {{ scope.row.typeName }}</template>
        </el-table-column>
        <el-table-column prop="productName" label="产品名称" min-width="150" show-overflow-tooltip />
        <el-table-column prop="quantity" label="数量" width="70" align="center" />
        <el-table-column prop="budgetText" label="预算（单件）" width="140">
          <template slot-scope="scope">{{ scope.row.budgetText || '待填写' }}</template>
        </el-table-column>
        <el-table-column label="安装费" width="100" align="right">
          <template slot-scope="scope">{{ scope.row.installFee ? '￥' + scope.row.installFee : '-' }}</template>
        </el-table-column>
        <el-table-column label="参考图片" width="150">
          <template slot-scope="scope">
            <div class="hp-table-photos">
              <img v-for="img in (scope.row.images || []).slice(0, 3)" :key="img.id" :src="imagePreviewUrl(img.fileId)" alt="">
              <span v-if="(scope.row.images || []).length > 3">+{{ scope.row.images.length - 3 }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
        <el-table-column label="操作" width="130" align="center">
          <template slot-scope="scope">
            <el-button type="text" size="mini" icon="el-icon-edit" @click="openEdit(scope.row)">修改</el-button>
            <el-button type="text" size="mini" icon="el-icon-delete" @click="removeItem(scope.row)">删除</el-button>
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

    <!-- ==================== 添加 / 编辑（手机端底部抽屉，电脑端居中弹层） ==================== -->
    <div v-if="formVisible" class="hp-mask" @click.self="closeForm">
      <div class="hp-sheet">
        <div v-if="isMobile" class="hp-sheet__handle" />
        <div class="hp-sheet__head">
          <div class="hp-sheet__title">{{ sheetTitle }}</div>
          <div class="hp-sheet__close" @click="closeForm">×</div>
        </div>

        <div class="hp-sheet__body">
          <!-- 手机端：这件是什么由设计师定好，只读展示，不让客户改 -->
          <div v-if="isMobile && form.id" class="hp-ro">
            <div class="hp-ro__icon">{{ typeIconFor(form) }}</div>
            <div class="hp-ro__info">
              <div class="hp-ro__name">{{ form.productName }}</div>
              <div class="hp-ro__type">{{ form.bigTypeName }} · {{ form.typeName }}</div>
            </div>
          </div>

          <!-- 电脑端：类型可选 -->
          <div v-if="!isMobile" class="hp-field">
            <div class="hp-field__label">这件家具属于</div>
            <div class="hp-groups">
              <div
                v-for="group in types"
                :key="group.code"
                class="hp-groups__item"
                :class="{ 'is-active': form.bigTypeCode === group.code }"
                @click="pickGroup(group)"
              >{{ group.icon }} {{ group.name }}</div>
            </div>
            <div class="hp-types">
              <div
                v-for="type in formTypeOptions"
                :key="type.code"
                class="hp-types__item"
                :class="{ 'is-active': form.typeCode === type.code }"
                @click="pickType(type)"
              >
                <span class="hp-types__icon">{{ type.icon }}</span>
                <span class="hp-types__name">{{ type.name }}</span>
              </div>
            </div>
          </div>

          <!-- 预算：手机端的核心操作，放在最前面 -->
          <div class="hp-field">
            <div class="hp-field__label">大概想花多少钱 <span class="hp-field__hint">（写区间或一个数都行）</span></div>
            <div class="hp-quick">
              <div
                v-for="quick in budgetQuicks"
                :key="quick"
                class="hp-quick__item"
                :class="{ 'is-active': form.budgetText === quick }"
                @click="pickBudget(quick)"
              >{{ quick }}</div>
            </div>
            <input v-model="form.budgetText" class="hp-input" placeholder="例如 3000~6000，或 4999">
          </div>

          <div class="hp-field">
            <div class="hp-field__label">想买什么 / 什么牌子型号</div>
            <!-- AI 推荐需要知道类型，手机端新增的家具还没归类，先不显示 -->
            <div v-if="!isMobile || form.id" class="hp-ai" @click="askAi">
              <span class="hp-ai__icon">✨</span>
              <span class="hp-ai__text">{{ recommendLoading ? 'AI 正在帮你挑…' : '不知道选哪个？让 AI 推荐 3 款' }}</span>
              <span class="hp-ai__arrow">›</span>
            </div>
            <input v-model="form.productName" class="hp-input" placeholder="例如：格力 云锦Ⅲ 1.5 匹空调">
          </div>

          <!-- 数量 / 安装费：只在电脑端出现，手机端客户不填 -->
          <div v-if="!isMobile" class="hp-field hp-field--row">
            <div class="hp-field__block">
              <div class="hp-field__label">数量</div>
              <div class="hp-stepper">
                <div class="hp-stepper__btn" @click="stepQuantity(-1)">−</div>
                <div class="hp-stepper__num">{{ form.quantity || 1 }}</div>
                <div class="hp-stepper__btn" @click="stepQuantity(1)">＋</div>
              </div>
            </div>
            <div class="hp-field__block">
              <div class="hp-field__label">安装费</div>
              <input v-model="form.installFee" class="hp-input hp-input--number" type="number" placeholder="选填">
            </div>
          </div>

          <div class="hp-field">
            <div class="hp-field__label">参考图片 <span class="hp-field__hint">（最多 10 张）</span></div>
            <div class="hp-photos">
              <div v-for="(photo, index) in photos" :key="photo.uid" class="hp-photos__item">
                <img :src="photo.url" alt="">
                <span class="hp-photos__del" @click.stop="removePhoto(index)">×</span>
              </div>
              <el-upload
                v-if="photos.length < 10"
                class="hp-photos__add"
                :action="uploadUrl"
                :headers="uploadHeaders"
                :data="{ namespace: 'aiplatform' }"
                :show-file-list="false"
                :before-upload="beforeUpload"
                :on-success="handleUploadSuccess"
                :on-error="handleUploadError"
              >
                <div class="hp-photos__addbox">
                  <span class="hp-photos__plus">＋</span>
                  <span class="hp-photos__text">加图</span>
                </div>
              </el-upload>
            </div>
          </div>

          <div class="hp-field">
            <div class="hp-field__label">备注 <span class="hp-field__hint">（选填）</span></div>
            <textarea v-model="form.remark" class="hp-input hp-input--area" rows="2" placeholder="户型、尺寸、品牌偏好…" />
          </div>
        </div>

        <div class="hp-sheet__foot">
          <button v-if="form.id" class="hp-btn hp-btn--danger" @click="removeItem(form)">删除</button>
          <button class="hp-btn hp-btn--primary" :disabled="saving" @click="submit">{{ saving ? '保存中…' : '保存' }}</button>
        </div>
      </div>
    </div>

    <!-- ==================== AI 推荐结果 ==================== -->
    <div v-if="recommendVisible" class="hp-mask" @click.self="recommendVisible = false">
      <div class="hp-sheet">
        <div v-if="isMobile" class="hp-sheet__handle" />
        <div class="hp-sheet__head">
          <div class="hp-sheet__title">为你挑了 3 款</div>
          <div class="hp-sheet__close" @click="recommendVisible = false">×</div>
        </div>
        <div class="hp-sheet__body">
          <div v-for="(item, index) in recommendList" :key="index" class="hp-reco">
            <div class="hp-reco__rank">推荐 {{ index + 1 }}</div>
            <div class="hp-reco__name">{{ item.name || '参考建议' }}</div>
            <div v-if="item.priceRange" class="hp-reco__price">￥{{ item.priceRange }}</div>
            <div class="hp-reco__reason">{{ item.reason }}</div>
            <div v-if="item.highlights && item.highlights.length" class="hp-reco__tags">
              <span v-for="tag in item.highlights" :key="tag" class="hp-tag hp-tag--soft">{{ tag }}</span>
            </div>
            <button v-if="item.name" class="hp-btn hp-btn--ghost" @click="applySuggestion(item)">就选这款</button>
          </div>
        </div>
      </div>
    </div>
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
      saving: false,
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
      formVisible: false,
      photos: [],
      form: this.emptyForm(),
      recommendVisible: false,
      recommendLoading: false,
      recommendList: [],
      budgetQuicks: ['1000 以内', '1000~3000', '3000~6000', '6000~10000', '10000 以上']
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
    },
    filledCount() {
      return this.list.filter(item => item.budgetText).length
    },
    imageCount() {
      return this.list.reduce((sum, item) => sum + (item.images ? item.images.length : 0), 0)
    },
    heroSub() {
      return this.filledCount >= this.total && this.total > 0
        ? '预算都填好啦，随时可以出报告'
        : '选好家具、填上预算，就能一键出预算报告'
    },
    sheetTitle() {
      if (this.form.id) {
        return this.isMobile ? '填写预算' : '编辑这件家具'
      }
      return this.isMobile ? '添加家具' : '添加一件家具'
    },
    /** 手机端不让客户选类型：新增的家具先落到「待分类」，由设计师在电脑端归类 */
    pendingType() {
      const group = this.types.find(item => item.code === 'pending')
      return group && group.children && group.children.length ? { group: group, type: group.children[0] } : null
    }
  },
  created() {
    this.getTypes()
    this.getList()
  },
  methods: {
    imagePreviewUrl,
    emptyForm() {
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
      pagePurchaseItem(this.query).then(response => {
        const page = response.data || {}
        this.list = this.list.concat(page.dataList || [])
      })
    },
    handleQuery() {
      this.query.pageNum = 1
      this.getList()
    },
    clearSearch() {
      this.query.productName = undefined
      this.handleQuery()
    },
    filterGroup(code) {
      this.query.bigTypeCode = code
      this.query.typeCode = undefined
      this.handleQuery()
    },
    resetQuery() {
      this.query = { bigTypeCode: undefined, typeCode: undefined, productName: undefined, pageNum: 1, pageSize: 10 }
      this.getList()
    },
    handleBigTypeChange() {
      this.query.typeCode = undefined
      this.handleQuery()
    },
    typeIconFor(row) {
      const group = this.types.find(item => item.code === row.bigTypeCode)
      if (!group) {
        return '🧾'
      }
      const type = (group.children || []).find(item => item.code === row.typeCode)
      return (type && type.icon) || group.icon || '🧾'
    },
    openAdd() {
      this.form = this.emptyForm()
      this.photos = []
      this.recommendList = []
      // 电脑端默认落到第一个大类，手机端留空（提交时落到待分类）
      if (!this.isMobile && this.types.length) {
        this.form.bigTypeCode = this.types[0].code
      }
      this.formVisible = true
    },
    openEdit(row) {
      this.form = {
        id: row.id,
        bigTypeCode: row.bigTypeCode,
        bigTypeName: row.bigTypeName,
        typeCode: row.typeCode,
        typeName: row.typeName,
        productName: row.productName,
        quantity: row.quantity || 1,
        budgetText: row.budgetText,
        installFee: row.installFee,
        remark: row.remark,
        fileIds: (row.images || []).map(image => image.fileId)
      }
      this.photos = (row.images || []).map(image => ({
        uid: 'image-' + image.id,
        url: imagePreviewUrl(image.fileId),
        fileId: image.fileId
      }))
      this.recommendList = []
      this.formVisible = true
    },
    closeForm() {
      this.formVisible = false
    },
    pickGroup(group) {
      this.form.bigTypeCode = group.code
      if (!(group.children || []).some(type => type.code === this.form.typeCode)) {
        this.form.typeCode = undefined
      }
    },
    pickType(type) {
      this.form.typeCode = type.code
    },
    pickBudget(quick) {
      this.form.budgetText = this.form.budgetText === quick ? undefined : quick
    },
    stepQuantity(delta) {
      const next = (this.form.quantity || 1) + delta
      this.form.quantity = next < 1 ? 1 : next
    },
    submit() {
      if (!this.form.productName) {
        this.$modal.msgWarning('写一下想买什么，或者让 AI 帮你推荐')
        return
      }
      // 手机端不选类型：新家具先落到「待分类」，设计师之后在电脑端归类
      let bigTypeCode = this.form.bigTypeCode
      let typeCode = this.form.typeCode
      if (!typeCode && this.isMobile) {
        const fallback = this.pendingType
        if (!fallback) {
          this.$modal.msgWarning('类型配置里缺少「待分类」，请让设计师在电脑端补一条')
          return
        }
        bigTypeCode = fallback.group.code
        typeCode = fallback.type.code
      }
      if (!bigTypeCode || !typeCode) {
        this.$modal.msgWarning('先选一下这件家具属于哪一类吧')
        return
      }
      this.saving = true
      const payload = {
        bigTypeCode: bigTypeCode,
        typeCode: typeCode,
        productName: this.form.productName,
        quantity: this.form.quantity || 1,
        budgetText: this.form.budgetText || undefined,
        // 空字符串会让后端 BigDecimal 解析失败，必须转成不传
        installFee: this.form.installFee === '' || this.form.installFee === null ? undefined : this.form.installFee,
        remark: this.form.remark || undefined,
        fileIds: this.form.fileIds
      }
      const request = this.form.id
        ? updatePurchaseItem(this.form.id, payload)
        : addPurchaseItem(payload)
      request.then(() => {
        this.$modal.msgSuccess(this.form.id ? '已保存' : '添加成功')
        this.formVisible = false
        this.handleQuery()
      }).finally(() => {
        this.saving = false
      })
    },
    removeItem(row) {
      this.$modal.confirm('确认删除「' + row.productName + '」？').then(() => {
        return delPurchaseItem(row.id)
      }).then(() => {
        this.$modal.msgSuccess('已删除')
        this.formVisible = false
        this.handleQuery()
      }).catch(() => {})
    },
    beforeUpload(file) {
      if (!/image\/(jpeg|jpg|png|gif|webp)/.test(file.type)) {
        this.$modal.msgError('只能上传图片哦')
        return false
      }
      if (file.size / 1024 / 1024 > 10) {
        this.$modal.msgError('图片不要超过 10MB')
        return false
      }
      return true
    },
    handleUploadSuccess(response, file) {
      if (!response || !response.success) {
        this.$modal.msgError((response && response.errorMessage) || '图片上传失败')
        return
      }
      this.photos.push({
        uid: file.uid,
        url: imagePreviewUrl(response.data.id),
        fileId: response.data.id
      })
      this.syncFileIds()
    },
    handleUploadError() {
      this.$modal.msgError('图片上传失败，再试一次')
    },
    removePhoto(index) {
      this.photos.splice(index, 1)
      this.syncFileIds()
    },
    syncFileIds() {
      this.form.fileIds = this.photos.map(photo => photo.fileId).filter(id => !!id)
    },
    askAi() {
      if (!this.form.bigTypeCode || !this.form.typeCode) {
        this.$modal.msgWarning('先选一下家具类型，AI 才知道要推荐什么')
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
      this.$modal.msgSuccess('已经帮你填好了，可以再改')
    },
    goReport() {
      this.$router.push({ path: '/home-purchase/report' })
    }
  }
}
</script>

<style scoped>
/* ==================== 通用 ==================== */
.hp-table-photos {
  display: flex;
  align-items: center;
}

.hp-table-photos img {
  width: 34px;
  height: 34px;
  object-fit: cover;
  border-radius: 6px;
  margin-right: 4px;
  border: 1px solid #ebeef5;
}

.hp-mask {
  position: fixed;
  inset: 0;
  background: rgba(23, 20, 18, 0.45);
  z-index: 2100;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: hp-fade 0.18s ease;
}

@keyframes hp-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

.hp-sheet {
  background: #fff;
  border-radius: 18px;
  width: 620px;
  max-width: 92vw;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.22);
}

.hp-sheet__handle {
  width: 42px;
  height: 4px;
  background: #e4e0db;
  border-radius: 4px;
  margin: 10px auto 0;
}

.hp-sheet__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 10px;
}

.hp-sheet__title {
  font-size: 17px;
  font-weight: 600;
  color: #2b2b2b;
}

.hp-sheet__close {
  font-size: 22px;
  line-height: 1;
  color: #b3aca4;
  cursor: pointer;
  padding: 0 4px;
}

.hp-sheet__body {
  padding: 4px 20px 8px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.hp-sheet__foot {
  display: flex;
  gap: 10px;
  padding: 12px 20px 18px;
  border-top: 1px solid #f2efeb;
}

.hp-field {
  margin-bottom: 18px;
}

.hp-field--row {
  display: flex;
  gap: 16px;
}

.hp-field__block {
  flex: 1;
}

.hp-field__label {
  font-size: 13px;
  color: #8a8179;
  margin-bottom: 8px;
}

.hp-field__hint {
  color: #bbb4ac;
}

.hp-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #eee7e0;
  background: #fbf9f7;
  border-radius: 12px;
  padding: 11px 14px;
  font-size: 15px;
  color: #2b2b2b;
  outline: none;
  transition: border-color 0.15s;
}

.hp-input:focus {
  border-color: #eda267;
  background: #fff;
}

.hp-input--area {
  resize: none;
  font-family: inherit;
}

.hp-input--number {
  width: 100%;
}

/* 大类 / 小类选择 */
.hp-groups {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  margin-bottom: 10px;
}

.hp-groups__item {
  flex: none;
  padding: 7px 14px;
  border-radius: 20px;
  background: #f5f2ef;
  color: #6b635b;
  font-size: 14px;
  cursor: pointer;
}

.hp-groups__item.is-active {
  background: #2b2b2b;
  color: #fff;
}

.hp-types {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.hp-types__item {
  border: 1px solid #f0ebe5;
  border-radius: 12px;
  padding: 10px 4px;
  text-align: center;
  cursor: pointer;
  background: #fff;
}

.hp-types__item.is-active {
  border-color: #eda267;
  background: #fff6ef;
}

.hp-types__icon {
  display: block;
  font-size: 22px;
  line-height: 1.2;
}

.hp-types__name {
  display: block;
  font-size: 12px;
  color: #6b635b;
  margin-top: 2px;
}

.hp-types__item.is-active .hp-types__name {
  color: #c96a1e;
  font-weight: 600;
}

/* 预算快捷选择 */
.hp-quick {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.hp-quick__item {
  padding: 7px 12px;
  border-radius: 10px;
  background: #f5f2ef;
  color: #6b635b;
  font-size: 13px;
  cursor: pointer;
}

.hp-quick__item.is-active {
  background: #fff1e5;
  color: #c96a1e;
  font-weight: 600;
}

/* 数量步进 */
.hp-stepper {
  display: flex;
  align-items: center;
  background: #fbf9f7;
  border: 1px solid #eee7e0;
  border-radius: 12px;
  overflow: hidden;
  height: 43px;
}

.hp-stepper__btn {
  width: 46px;
  text-align: center;
  font-size: 20px;
  color: #6b635b;
  cursor: pointer;
  user-select: none;
}

.hp-stepper__num {
  flex: 1;
  text-align: center;
  font-size: 16px;
  font-weight: 600;
}

/* 图片 */
.hp-photos {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.hp-photos__item {
  position: relative;
  width: 78px;
  height: 78px;
}

.hp-photos__item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 12px;
}

.hp-photos__del {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 20px;
  height: 20px;
  line-height: 18px;
  text-align: center;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}

.hp-photos__addbox {
  width: 78px;
  height: 78px;
  border: 1px dashed #e0d8d0;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #b3aca4;
  background: #fcfaf8;
}

.hp-photos__plus {
  font-size: 20px;
  line-height: 1;
}

.hp-photos__text {
  font-size: 11px;
  margin-top: 2px;
}

/* AI 入口 */
.hp-ro {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  margin-bottom: 18px;
  background: #faf7f4;
  border-radius: 14px;
}

.hp-ro__icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.hp-ro__info {
  flex: 1;
  min-width: 0;
}

.hp-ro__name {
  font-size: 15px;
  font-weight: 600;
  color: #2b2b2b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hp-ro__type {
  font-size: 12px;
  color: #a49c94;
  margin-top: 3px;
}

.hp-ai {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 14px;
  margin-bottom: 10px;
  border-radius: 12px;
  background: linear-gradient(135deg, #fff3e6, #fff8f2);
  border: 1px solid #ffe4cb;
  color: #c96a1e;
  font-size: 14px;
  cursor: pointer;
}

.hp-ai__icon {
  font-size: 16px;
}

.hp-ai__text {
  flex: 1;
}

.hp-ai__arrow {
  color: #e0b083;
}

/* 按钮 */
.hp-btn {
  flex: 1;
  border: none;
  border-radius: 14px;
  padding: 13px 18px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.hp-btn--primary {
  background: linear-gradient(135deg, #f6a56a, #ec8140);
  color: #fff;
  box-shadow: 0 6px 16px rgba(236, 129, 64, 0.32);
}

.hp-btn--danger {
  flex: none;
  width: 92px;
  background: #fdf0ef;
  color: #d9534f;
}

.hp-btn--ghost {
  width: 100%;
  margin-top: 10px;
  background: #fff;
  border: 1px solid #eda267;
  color: #c96a1e;
  font-size: 14px;
  padding: 9px;
}

/* AI 推荐卡片 */
.hp-reco {
  border: 1px solid #f2ece6;
  border-radius: 16px;
  padding: 14px;
  margin-bottom: 12px;
  background: #fff;
}

.hp-reco__rank {
  display: inline-block;
  font-size: 11px;
  color: #c96a1e;
  background: #fff1e5;
  border-radius: 6px;
  padding: 2px 8px;
  margin-bottom: 6px;
}

.hp-reco__name {
  font-size: 16px;
  font-weight: 600;
  color: #2b2b2b;
}

.hp-reco__price {
  color: #e0873a;
  font-size: 14px;
  margin: 4px 0;
}

.hp-reco__reason {
  font-size: 13px;
  color: #6b635b;
  line-height: 1.6;
}

.hp-reco__tags {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* ==================== 手机端 ==================== */
.hp--mobile {
  background: #f6f4f2;
  min-height: 100vh;
  padding-bottom: 92px;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.hp-hero {
  background: linear-gradient(150deg, #ffb98a, #ec8140);
  padding: 26px 20px 22px;
  color: #fff;
  border-radius: 0 0 22px 22px;
}

.hp-hero__title {
  font-size: 22px;
  font-weight: 700;
}

.hp-hero__sub {
  font-size: 13px;
  opacity: 0.9;
  margin-top: 4px;
}

.hp-hero__stats {
  display: flex;
  margin-top: 18px;
  background: rgba(255, 255, 255, 0.18);
  border-radius: 14px;
  padding: 12px 0;
}

.hp-stat {
  flex: 1;
  text-align: center;
}

.hp-stat__num {
  font-size: 20px;
  font-weight: 700;
}

.hp-stat__label {
  font-size: 12px;
  opacity: 0.9;
  margin-top: 2px;
}

.hp-search {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: -14px 16px 0;
  background: #fff;
  border-radius: 14px;
  padding: 12px 14px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);
  position: relative;
  color: #b3aca4;
}

.hp-search input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 15px;
  background: transparent;
  color: #2b2b2b;
}

.hp-search__clear {
  font-size: 18px;
  color: #c9c2ba;
  padding: 0 4px;
}

.hp-chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 14px 16px 4px;
}

.hp-chip {
  flex: none;
  padding: 7px 14px;
  background: #fff;
  border-radius: 20px;
  font-size: 13px;
  color: #6b635b;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.hp-chip.is-active {
  background: #2b2b2b;
  color: #fff;
}

.hp-loading,
.hp-more {
  text-align: center;
  color: #b3aca4;
  font-size: 13px;
  padding: 14px 0;
}

.hp-list {
  padding: 10px 16px 0;
}

.hp-card {
  background: #fff;
  border-radius: 18px;
  padding: 14px;
  margin-bottom: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.hp-card__top {
  display: flex;
  align-items: center;
}

.hp-card__icon {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  background: #fff6ef;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin-right: 12px;
}

.hp-card__info {
  flex: 1;
  min-width: 0;
}

.hp-card__name {
  font-size: 16px;
  font-weight: 600;
  color: #2b2b2b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hp-card__type {
  font-size: 12px;
  color: #a49c94;
  margin-top: 3px;
}

.hp-card__arrow {
  color: #d5cec6;
  font-size: 22px;
  padding-left: 6px;
}

.hp-card__photos {
  display: flex;
  gap: 6px;
  margin-top: 12px;
}

.hp-card__photos img {
  width: 58px;
  height: 58px;
  object-fit: cover;
  border-radius: 10px;
}

.hp-card__more {
  align-self: center;
  font-size: 12px;
  color: #a49c94;
}

.hp-card__bottom {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}

.hp-card__remark {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: #a49c94;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hp-tag {
  font-size: 12px;
  color: #6b635b;
  background: #f5f2ef;
  border-radius: 8px;
  padding: 3px 9px;
}

.hp-tag--money {
  color: #c96a1e;
  background: #fff1e5;
  font-weight: 600;
}

.hp-tag--todo {
  color: #b9895f;
  background: #fdf6ef;
  border: 1px dashed #f0d9c2;
}

.hp-tag--soft {
  color: #7a9b7a;
  background: #f1f7f1;
}

.hp-empty {
  text-align: center;
  padding: 60px 30px;
  color: #a49c94;
}

.hp-empty__icon {
  font-size: 44px;
}

.hp-empty__title {
  font-size: 15px;
  color: #6b635b;
  margin-top: 12px;
}

.hp-empty__desc {
  font-size: 13px;
  margin-top: 6px;
}

.hp-bottom {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, rgba(246, 244, 242, 0.6), #f6f4f2 40%);
  z-index: 1500;
}

.hp-bottom__btn {
  width: 100%;
  border: none;
  border-radius: 16px;
  padding: 15px;
  font-size: 17px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #f6a56a, #ec8140);
  box-shadow: 0 8px 20px rgba(236, 129, 64, 0.34);
}

/* 手机端抽屉 */
.hp--mobile .hp-mask {
  align-items: flex-end;
}

.hp--mobile .hp-sheet {
  width: 100%;
  max-width: 100%;
  border-radius: 22px 22px 0 0;
  max-height: 90vh;
}

.hp--mobile .hp-input {
  font-size: 16px;
  padding: 13px 14px;
}

.hp--mobile .hp-types {
  grid-template-columns: repeat(4, 1fr);
}

.hp--mobile .hp-sheet__foot {
  padding: 12px 16px calc(16px + env(safe-area-inset-bottom));
}
</style>
