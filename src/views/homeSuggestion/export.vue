<template>
  <div class="app-container export-page">
    <!-- 工具栏（打印时隐藏） -->
    <div class="no-print export-toolbar">
      <el-button v-if="!isAnonymous" icon="el-icon-back" size="mini" @click="$router.push('/home-purchase/suggestion')">返回装修意见</el-button>
      <el-input v-model="title" size="mini" style="width: 240px" placeholder="文档标题" />
      <el-button type="primary" icon="el-icon-printer" size="mini" @click="print">打印 / 导出 PDF</el-button>
      <span class="export-tip">在打印对话框里选「目标：另存为 PDF」即可</span>
    </div>

    <div v-loading="loading" class="export-sheet">
      <h1 class="export-title">{{ title }}</h1>
      <div class="export-meta">
        <span>导出时间：{{ exportedAt }}</span>
        <span>未采纳 {{ itemCount }} 条</span>
        <span>{{ imageCount }} 张图</span>
      </div>

      <el-empty v-if="!loading && !groups.length" description="还没有装修意见，先去录入" />

      <section v-for="group in groups" :key="group.region" class="export-region">
        <h2>{{ group.region }}<small>（{{ group.items.length }} 条）</small></h2>
        <article v-for="item in group.items" :key="item.id" class="export-item">
          <h3>{{ item.title }}</h3>
          <!-- 匿名访客（外部打开链接）不给采纳/驳回按钮：这两个接口需要登录，点了只会报 401 -->
          <div v-if="!isAnonymous" class="no-print export-actions">
            <el-button size="mini" type="success" plain icon="el-icon-check" @click="adopt(item)">已采纳</el-button>
            <el-button size="mini" type="danger" plain icon="el-icon-close" @click="reject(item)">驳回</el-button>
          </div>
          <div v-if="item.status === 'REJECTED' && item.rejectReason" class="export-reject">驳回原因：{{ item.rejectReason }}</div>
          <div v-if="item.content" class="export-content">{{ item.content }}</div>
          <div v-if="item.images && item.images.length" class="export-images">
            <img
              v-for="img in item.images"
              :key="img.id"
              :src="suggestionImageUrl(img.fileId, 640)"
              alt="备注图片"
              loading="lazy"
            >
          </div>
        </article>
      </section>
    </div>
  </div>
</template>

<script>
import { listSuggestion, listSuggestionRegions, adoptSuggestion, rejectSuggestion, suggestionImageUrl } from '@/api/homeSuggestion'
import { getToken } from '@/utils/auth'

export default {
  name: 'HomeSuggestionExport',
  data() {
    return {
      loading: false,
      title: '白金海岸装修意见',
      exportedAt: '',
      regions: [],
      items: [],
      acting: false
    }
  },
  computed: {
    /** 匿名访客（外部访客，无登录态）隐藏返回后台的入口，避免被带到登录页 */
    isAnonymous() {
      return !getToken()
    },
    /** 按区域分组（顺序跟后端配置的区域顺序一致，只输出有意见的区域） */
    groups() {
      const groups = []
      const order = this.regions.length ? this.regions : Array.from(new Set(this.items.map(item => item.region)))
      order.forEach(region => {
        const items = this.items.filter(item => item.region === region)
        if (items.length) {
          groups.push({ region: region, items: items })
        }
      })
      // 兜底：配置外的区域也输出，避免漏
      const extra = Array.from(new Set(this.items.map(item => item.region)))
        .filter(region => !order.includes(region))
      extra.forEach(region => {
        groups.push({ region: region, items: this.items.filter(item => item.region === region) })
      })
      return groups
    },
    itemCount() {
      return this.items.length
    },
    imageCount() {
      return this.items.reduce((sum, item) => sum + ((item.images || []).length), 0)
    }
  },
  created() {
    this.exportedAt = new Date().toLocaleString('zh-CN')
    this.load()
  },
  methods: {
    suggestionImageUrl,
    load() {
      this.loading = true
      Promise.all([
        // 已采纳的不进 PDF：这里直接排除已采纳，页面上也就只剩未采纳的
        listSuggestion({ excludeStatus: 'ADOPTED' }),
        listSuggestionRegions().catch(() => ({ data: [] }))
      ]).then(([listRes, regionRes]) => {
        this.items = listRes.data || []
        this.regions = regionRes.data || []
      }).finally(() => {
        this.loading = false
      })
    },
    /** 采纳：这条随即从 PDF 清单里消失（后端过滤掉已采纳） */
    adopt(item) {
      if (this.acting) {
        return
      }
      this.$modal.confirm('采纳「' + item.title + '」？采纳后不再出现在这份 PDF 里。').then(() => {
        this.acting = true
        return adoptSuggestion(item.id)
      }).then(() => {
        this.$modal.msgSuccess('已采纳，已从清单移除')
        this.load()
      }).catch(() => {}).finally(() => {
        this.acting = false
      })
    },
    /** 驳回：必须填原因，原因会打印在 PDF 上（这项仍保留在清单里） */
    reject(item) {
      if (this.acting) {
        return
      }
      this.$prompt('填写驳回原因（会打印在 PDF 上）', '驳回：' + item.title, {
        confirmButtonText: '确定驳回',
        cancelButtonText: '取消',
        inputType: 'textarea',
        inputValue: item.rejectReason || '',
        inputPlaceholder: '例如：费用太高，改用普通做法',
        inputValidator: value => ((value && value.trim()) ? true : '驳回要写个原因')
      }).then(result => {
        this.acting = true
        return rejectSuggestion(item.id, result.value.trim())
      }).then(() => {
        this.$modal.msgSuccess('已驳回')
        this.load()
      }).catch(() => {}).finally(() => {
        this.acting = false
      })
    },
    print() {
      window.print()
    }
  }
}
</script>

<style scoped>
.export-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  background: #fff;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.05);
}

.export-tip {
  color: #909399;
  font-size: 12px;
}

/* 手机端：工具栏换行、纸张内边距收窄、图片一屏两张 */
@media screen and (max-width: 768px) {
  .export-toolbar {
    gap: 8px;
  }

  .export-toolbar .el-input {
    width: 100% !important;
  }

  .export-sheet {
    padding: 18px 14px;
  }

  .export-title {
    font-size: 21px;
    letter-spacing: 2px;
  }

  .export-images {
    grid-template-columns: repeat(2, 1fr);
  }

  .export-images img {
    height: 120px;
  }
}

.export-sheet {
  background: #fff;
  padding: 32px 36px;
  border-radius: 8px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.05);
}

.export-title {
  text-align: center;
  font-size: 26px;
  letter-spacing: 4px;
  margin: 0 0 10px;
}

.export-meta {
  display: flex;
  justify-content: center;
  gap: 20px;
  color: #909399;
  font-size: 12px;
  padding-bottom: 14px;
  border-bottom: 2px solid #2b2b2b;
}

.export-region {
  margin-top: 26px;
}

.export-region h2 {
  font-size: 19px;
  margin: 0 0 12px;
  padding: 6px 10px;
  border-left: 5px solid #409eff;
  background: #f5f7fa;
}

.export-region h2 small {
  font-size: 12px;
  color: #909399;
  font-weight: 400;
  margin-left: 6px;
}

.export-item {
  margin: 0 0 18px;
  padding: 0 0 14px;
  border-bottom: 1px dashed #e4e7ed;
}

.export-item h3 {
  font-size: 15px;
  margin: 0 0 6px;
  color: #2b2b2b;
}

/* 采纳 / 驳回：只在屏幕上出现，打印时被 .no-print 隐藏 */
.export-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin: -2px 0 8px;
}

.export-reject {
  font-size: 12px;
  color: #f56c6c;
  margin-bottom: 6px;
}

.export-content {
  font-size: 13px;
  line-height: 1.8;
  color: #303133;
  white-space: pre-wrap;
  margin-bottom: 10px;
}

/* 图片：一行最多三张，多了自动换行 */
.export-images {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.export-images img {
  width: 100%;
  height: 150px;
  object-fit: cover;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fafafa;
}

/* ---------- 打印 / 导出 PDF ---------- */
@media print {
  .no-print {
    display: none !important;
  }

  .export-page {
    padding: 0 !important;
  }

  .export-sheet {
    box-shadow: none;
    padding: 0;
  }

  .export-region {
    break-inside: auto;
  }

  .export-item {
    break-inside: avoid;
  }

  .export-images img {
    height: 150px;
  }
}

@page {
  size: A4;
  margin: 14mm 12mm;
}
</style>
