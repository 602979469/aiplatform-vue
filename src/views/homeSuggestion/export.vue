<template>
  <div class="app-container export-page">
    <!-- 工具栏（打印时隐藏） -->
    <div class="no-print export-toolbar">
      <el-button icon="el-icon-back" size="mini" @click="$router.push('/home-purchase/suggestion')">返回装修意见</el-button>
      <el-input v-model="title" size="mini" style="width: 240px" placeholder="文档标题" />
      <el-button type="primary" icon="el-icon-printer" size="mini" @click="print">打印 / 导出 PDF</el-button>
      <span class="export-tip">在打印对话框里选「目标：另存为 PDF」即可</span>
    </div>

    <div v-loading="loading" class="export-sheet">
      <h1 class="export-title">{{ title }}</h1>
      <div class="export-meta">
        <span>导出时间：{{ exportedAt }}</span>
        <span>共 {{ itemCount }} 条意见</span>
        <span>{{ imageCount }} 张图</span>
      </div>

      <el-empty v-if="!loading && !groups.length" description="还没有装修意见，先去录入" />

      <section v-for="group in groups" :key="group.region" class="export-region">
        <h2>{{ group.region }}<small>（{{ group.items.length }} 条）</small></h2>
        <article v-for="item in group.items" :key="item.id" class="export-item">
          <h3>{{ item.title }}</h3>
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
import { listSuggestion, listSuggestionRegions, suggestionImageUrl } from '@/api/homeSuggestion'

export default {
  name: 'HomeSuggestionExport',
  data() {
    return {
      loading: false,
      title: '白金海岸装修意见',
      exportedAt: '',
      regions: [],
      items: []
    }
  },
  computed: {
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
        listSuggestion({}),
        listSuggestionRegions().catch(() => ({ data: [] }))
      ]).then(([listRes, regionRes]) => {
        this.items = listRes.data || []
        this.regions = regionRes.data || []
      }).finally(() => {
        this.loading = false
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
