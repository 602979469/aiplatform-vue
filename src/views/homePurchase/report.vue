<template>
  <div class="app-container report-page" :class="{ 'report-page--mobile': isMobile }">
    <!-- ============ 选择区（打印时隐藏） ============ -->
    <div class="report-panel no-print">
      <div class="report-panel__head">
        <div class="report-panel__title">生成预算报告</div>
        <div class="report-panel__actions">
          <el-button size="mini" @click="toggleAll">{{ allChecked ? '取消全选' : '全选' }}</el-button>
          <el-button type="primary" size="mini" icon="el-icon-document" :disabled="!selectedIds.length" @click="buildReport">
            生成预算报告（{{ selectedIds.length }}）
          </el-button>
          <el-button v-if="report" size="mini" icon="el-icon-printer" @click="printReport">打印 / 导出 PDF</el-button>
        </div>
      </div>

      <el-form :inline="!isMobile" size="mini" class="report-panel__form">
        <el-form-item label="报告名称">
          <el-input v-model="reportName" placeholder="家庭装修采购预算报告" style="width: 260px" />
        </el-form-item>
        <el-form-item label="版本">
          <el-input v-model="reportVersion" placeholder="V1.0" style="width: 120px" />
        </el-form-item>
      </el-form>

      <el-empty v-if="!items.length" description="还没有采购项，先去采购清单录入" />

      <div v-for="group in groupedItems" :key="group.code" class="report-pick">
        <div class="report-pick__group">
          <el-checkbox :value="isGroupChecked(group)" :indeterminate="isGroupIndeterminate(group)" @change="toggleGroup(group)">
            {{ group.icon }} {{ group.name }}（{{ group.items.length }}）
          </el-checkbox>
        </div>
        <div v-for="child in group.children" :key="child.code" class="report-pick__child">
          <el-checkbox :value="isChildChecked(child)" :indeterminate="isChildIndeterminate(child)" @change="toggleChild(child)">
            {{ child.name }}（{{ child.items.length }}）
          </el-checkbox>
          <el-checkbox-group v-model="selectedIds" class="report-pick__items">
            <el-checkbox v-for="item in child.items" :key="item.id" :label="item.id">
              <span class="report-pick__name">{{ item.productName }}</span>
              <span class="report-pick__budget">{{ item.budgetText || '待填预算' }}</span>
            </el-checkbox>
          </el-checkbox-group>
        </div>
      </div>
    </div>

    <!-- ============ 报告正文 ============ -->
    <div v-if="report" ref="report" class="report-sheet">
      <div class="report-sheet__head">
        <h1>{{ report.name }}</h1>
        <div class="report-sheet__meta">
          <span>版本：{{ report.version }}</span>
          <span>生成时间：{{ report.generatedAt }}</span>
          <span>项目数：{{ report.itemCount }}</span>
        </div>
      </div>

      <div class="report-sheet__toc">
        <div class="report-sheet__section-title">目录</div>
        <ol>
          <li v-for="(group, groupIndex) in report.groups" :key="group.code">
            <span class="report-sheet__toc-name">{{ groupIndex + 1 }}. {{ group.name }}</span>
            <span class="report-sheet__toc-amount">￥{{ money(group.subtotalMin) }} ~ ￥{{ money(group.subtotalMax) }}</span>
            <ol class="report-sheet__toc-children">
              <li v-for="(child, childIndex) in group.children" :key="child.code">
                {{ groupIndex + 1 }}.{{ childIndex + 1 }} {{ child.name }}（{{ child.items.length }} 项）
                <span class="report-sheet__toc-amount">￥{{ money(child.subtotalMin) }} ~ ￥{{ money(child.subtotalMax) }}</span>
              </li>
            </ol>
          </li>
        </ol>
      </div>

      <div v-for="(group, groupIndex) in report.groups" :key="group.code" class="report-group">
        <h2>{{ groupIndex + 1 }}. {{ group.name }}（￥{{ money(group.subtotalMin) }} ~ ￥{{ money(group.subtotalMax) }}）</h2>
        <div v-for="(child, childIndex) in group.children" :key="child.code" class="report-sub">
          <h3>
            {{ groupIndex + 1 }}.{{ childIndex + 1 }} {{ child.name }}
            <small>（{{ child.items.length }} 项｜小计 ￥{{ money(child.subtotalMin) }} ~ ￥{{ money(child.subtotalMax) }}）</small>
          </h3>
          <table class="report-table">
            <thead>
              <tr>
                <th class="report-table__thumb">参考图</th>
                <th>产品名称</th>
                <th class="report-table__num">数量</th>
                <th class="report-table__num">单价区间</th>
                <th class="report-table__num">安装费</th>
                <th class="report-table__num">小计区间</th>
                <th>备注</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in child.items" :key="item.id">
                <td class="report-table__thumb">
                  <div class="report-thumbs">
                    <img v-for="img in item.images.slice(0, 3)" :key="img.id" :src="imagePreviewUrl(img.fileId)" alt="参考图" />
                    <span v-if="!item.images.length" class="report-thumbs__none">无</span>
                  </div>
                </td>
                <td>{{ item.productName }}</td>
                <td class="report-table__num">{{ item.quantity }}</td>
                <td class="report-table__num">{{ item.budgetText || '待定' }}</td>
                <td class="report-table__num">{{ item.installFee ? '￥' + money(item.installFee) : '-' }}</td>
                <td class="report-table__num">{{ totalLabel(item) }}</td>
                <td class="report-table__remark">{{ item.remark }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="report-summary">
        <table>
          <tbody>
            <tr v-for="group in report.groups" :key="group.code">
              <td>{{ group.name }}</td>
              <td class="report-summary__num">￥{{ money(group.subtotalMin) }} ~ ￥{{ money(group.subtotalMax) }}</td>
            </tr>
            <tr class="report-summary__total">
              <td>合计</td>
              <td class="report-summary__num">￥{{ money(report.totalMin) }} ~ ￥{{ money(report.totalMax) }}</td>
            </tr>
          </tbody>
        </table>
        <p class="report-summary__note">
          说明：金额为「单价区间 × 数量 + 安装费」的估算值，最终以实际采购价为准。
          <span v-if="report.pendingCount">还有 {{ report.pendingCount }} 项尚未填写预算，未计入以上合计。</span>
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import responsive from '@/mixins/responsive'
import { listPurchaseItem, listFurnitureTypes, imagePreviewUrl } from '@/api/homePurchase'

export default {
  name: 'HomePurchaseReport',
  mixins: [responsive],
  data() {
    return {
      items: [],
      typeIcons: {},
      selectedIds: [],
      reportName: '家庭装修采购预算报告',
      reportVersion: 'V1.0',
      report: null
    }
  },
  computed: {
    /** 按大类分组，组内按小类排好序，供勾选列表与报告共用 */
    groupedItems() {
      const groups = []
      const groupMap = {}
      this.items.forEach(item => {
        let group = groupMap[item.bigTypeCode]
        if (!group) {
          group = {
            code: item.bigTypeCode,
            name: item.bigTypeName,
            icon: this.typeIcons[item.bigTypeCode] || '🧾',
            items: [],
            children: [],
            childMap: {}
          }
          groupMap[item.bigTypeCode] = group
          groups.push(group)
        }
        group.items.push(item)
        let child = group.childMap[item.typeCode]
        if (!child) {
          child = { code: item.typeCode, name: item.typeName, items: [] }
          group.childMap[item.typeCode] = child
          group.children.push(child)
        }
        child.items.push(item)
      })
      return groups
    },
    allChecked() {
      return this.items.length > 0 && this.selectedIds.length === this.items.length
    }
  },
  created() {
    this.getTypes()
    this.getItems()
  },
  methods: {
    imagePreviewUrl,
    getTypes() {
      listFurnitureTypes().then(response => {
        const icons = {}
        const groups = response.data || []
        groups.forEach(group => {
          icons[group.code] = group.icon
        })
        this.typeIcons = icons
      })
    },
    getItems() {
      listPurchaseItem({}).then(response => {
        this.items = response.data || []
      })
    },
    isGroupChecked(group) {
      return group.items.every(item => this.selectedIds.includes(item.id))
    },
    isGroupIndeterminate(group) {
      const checked = group.items.filter(item => this.selectedIds.includes(item.id)).length
      return checked > 0 && checked < group.items.length
    },
    toggleGroup(group) {
      const checked = this.isGroupChecked(group)
      const ids = group.items.map(item => item.id)
      this.selectedIds = checked
        ? this.selectedIds.filter(id => !ids.includes(id))
        : Array.from(new Set(this.selectedIds.concat(ids)))
    },
    /** 小类（二级）勾选状态 */
    isChildChecked(child) {
      return child.items.every(item => this.selectedIds.includes(item.id))
    },
    isChildIndeterminate(child) {
      const checked = child.items.filter(item => this.selectedIds.includes(item.id)).length
      return checked > 0 && checked < child.items.length
    },
    toggleChild(child) {
      const checked = this.isChildChecked(child)
      const ids = child.items.map(item => item.id)
      this.selectedIds = checked
        ? this.selectedIds.filter(id => !ids.includes(id))
        : Array.from(new Set(this.selectedIds.concat(ids)))
    },
    toggleAll() {
      this.selectedIds = this.allChecked ? [] : this.items.map(item => item.id)
    },
    /** 单价区间 × 数量 + 安装费 */
    itemRange(item) {
      if (!item.budgetText || (item.budgetMin === null && item.budgetMax === null)) {
        return null
      }
      const quantity = Number(item.quantity || 1)
      const installFee = Number(item.installFee || 0)
      return {
        min: Number(item.budgetMin || 0) * quantity + installFee,
        max: Number(item.budgetMax || 0) * quantity + installFee
      }
    },
    totalLabel(item) {
      const range = this.itemRange(item)
      if (!range) {
        return '待定'
      }
      return range.min === range.max
        ? '￥' + this.money(range.min)
        : '￥' + this.money(range.min) + ' ~ ￥' + this.money(range.max)
    },
    money(value) {
      const number = Number(value || 0)
      return number.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    },
    /** 按「大类 → 小类 → 具体项」汇总，并累加各层金额区间 */
    buildReport() {
      const selected = this.items.filter(item => this.selectedIds.includes(item.id))
      const groupMap = {}
      const groups = []
      let pendingCount = 0
      selected.forEach(item => {
        let group = groupMap[item.bigTypeCode]
        if (!group) {
          group = {
            code: item.bigTypeCode,
            name: item.bigTypeName,
            children: [],
            childMap: {},
            subtotalMin: 0,
            subtotalMax: 0
          }
          groupMap[item.bigTypeCode] = group
          groups.push(group)
        }
        let child = group.childMap[item.typeCode]
        if (!child) {
          child = { code: item.typeCode, name: item.typeName, items: [], subtotalMin: 0, subtotalMax: 0 }
          group.childMap[item.typeCode] = child
          group.children.push(child)
        }
        const range = this.itemRange(item)
        child.items.push(item)
        if (range) {
          child.subtotalMin += range.min
          child.subtotalMax += range.max
          group.subtotalMin += range.min
          group.subtotalMax += range.max
        } else {
          pendingCount += 1
        }
      })
      this.report = {
        name: this.reportName || '家庭装修采购预算报告',
        version: this.reportVersion || 'V1.0',
        generatedAt: new Date().toLocaleString('zh-CN'),
        itemCount: selected.length,
        pendingCount: pendingCount,
        groups: groups,
        totalMin: groups.reduce((sum, group) => sum + group.subtotalMin, 0),
        totalMax: groups.reduce((sum, group) => sum + group.subtotalMax, 0)
      }
      this.$modal.msgSuccess('报告已生成，可用「打印 / 导出 PDF」保存')
      this.$nextTick(() => {
        const sheet = this.$refs.report
        if (sheet) {
          sheet.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      })
    },
    printReport() {
      window.print()
    }
  }
}
</script>

<style scoped>
.report-panel {
  background: #fff;
  border-radius: 8px;
  padding: 14px 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.05);
}

.report-panel__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.report-panel__title {
  font-size: 16px;
  font-weight: 600;
}

.report-pick {
  border-top: 1px dashed #ebeef5;
  padding: 8px 0;
}

.report-pick__group {
  font-weight: 600;
  color: #303133;
}

.report-pick__child {
  padding-left: 18px;
  margin-top: 2px;
}

.report-pick__child > .el-checkbox {
  color: #606266;
  font-weight: 600;
}

.report-pick__items {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 18px;
  padding-left: 24px;
}

.report-pick__budget {
  color: #e6a23c;
  margin-left: 6px;
  font-size: 12px;
}

.report-sheet {
  background: #fff;
  padding: 28px 32px;
  border-radius: 8px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.05);
}

.report-sheet__head h1 {
  font-size: 22px;
  text-align: center;
  margin: 0 0 6px;
}

.report-sheet__meta {
  display: flex;
  justify-content: center;
  gap: 18px;
  color: #909399;
  font-size: 12px;
  padding-bottom: 12px;
  border-bottom: 2px solid #303133;
}

.report-sheet__section-title {
  font-size: 15px;
  font-weight: 600;
  margin: 18px 0 8px;
}

.report-sheet__toc ol {
  padding-left: 20px;
  line-height: 1.9;
  font-size: 13px;
}

.report-sheet__toc-name {
  font-weight: 600;
}

.report-sheet__toc-children {
  padding-left: 22px;
  font-size: 12px;
  color: #606266;
  line-height: 1.8;
}

.report-sheet__toc-amount {
  float: right;
  color: #e6a23c;
}

.report-group h2 {
  font-size: 17px;
  margin: 22px 0 10px;
  padding-left: 8px;
  border-left: 4px solid #409eff;
}

.report-sub h3 {
  font-size: 14px;
  margin: 14px 0 8px;
  color: #303133;
}

.report-sub h3 small {
  color: #e6a23c;
  font-weight: 400;
  margin-left: 8px;
}

.report-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.report-table th,
.report-table td {
  border: 1px solid #dcdfe6;
  padding: 6px 8px;
  vertical-align: middle;
}

.report-table th {
  background: #f5f7fa;
  font-weight: 600;
}

.report-table__num {
  text-align: right;
  white-space: nowrap;
}

.report-table__thumb {
  width: 132px;
}

.report-table__remark {
  max-width: 160px;
  color: #606266;
}

.report-thumbs {
  display: flex;
  gap: 4px;
}

.report-thumbs img {
  width: 38px;
  height: 38px;
  object-fit: cover;
  border-radius: 3px;
  border: 1px solid #ebeef5;
}

.report-thumbs__none {
  color: #c0c4cc;
}

.report-summary {
  margin-top: 26px;
}

.report-summary table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.report-summary td {
  border: 1px solid #dcdfe6;
  padding: 8px 12px;
}

.report-summary__num {
  text-align: right;
}

.report-summary__total {
  font-weight: 700;
  background: #f5f7fa;
}

.report-summary__note {
  color: #909399;
  font-size: 12px;
  margin-top: 10px;
}

/* ---------- 移动端 ---------- */
.report-page--mobile .report-sheet {
  padding: 16px 12px;
}

.report-page--mobile .report-table__thumb {
  width: 96px;
}

.report-page--mobile .report-pick__items {
  padding-left: 0;
  flex-direction: column;
}

/* ---------- 打印：只留报告正文 ---------- */
@media print {
  .no-print {
    display: none !important;
  }

  .report-sheet {
    box-shadow: none;
    padding: 0;
  }

  .report-group {
    page-break-inside: auto;
  }

  .report-table tr {
    page-break-inside: avoid;
  }
}
</style>
