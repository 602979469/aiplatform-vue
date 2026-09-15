<template>
  <div class="app-container kb-search">
    <div class="kb-search__box">
      <el-input
        v-model="keyword"
        size="large"
        clearable
        placeholder="搜索 Java 面试题 / 知识点，例如：线程池、JVM 垃圾回收、缓存穿透"
        @keyup.enter.native="doSearch()"
      >
        <el-button slot="append" icon="el-icon-search" @click="doSearch()">搜索</el-button>
      </el-input>

      <div class="kb-search__row">
        <span class="kb-search__label">热门搜索：</span>
        <el-tag
          v-for="word in hotWords"
          :key="word"
          size="small"
          effect="plain"
          class="kb-search__tag"
          @click.native="doSearch(word)"
        >{{ word }}</el-tag>
      </div>

      <div class="kb-search__row">
        <span class="kb-search__label">题型：</span>
        <el-tag
          v-for="b in facets.question_type"
          :key="b.key"
          size="small"
          :effect="filters.questionTypes.includes(b.key) ? 'dark' : 'plain'"
          class="kb-search__tag"
          @click.native="toggleType(b.key)"
        >{{ b.key }} ({{ b.count }})</el-tag>
        <span class="kb-search__label" style="margin-left: 12px">技术方向：</span>
        <el-select
          v-model="filters.categories"
          multiple
          collapse-tags
          clearable
          size="small"
          placeholder="全部"
          style="width: 300px"
          @change="doSearch()"
        >
          <el-option
            v-for="b in facets.category"
            :key="b.key"
            :label="b.key + ' (' + b.count + ')'"
            :value="b.key"
          />
        </el-select>
        <el-button v-if="hasFilter" type="text" size="mini" @click="clearFilters">清除筛选</el-button>
      </div>

      <div v-if="history.length" class="kb-search__row">
        <span class="kb-search__label">搜索历史：</span>
        <el-tag
          v-for="word in history"
          :key="word"
          size="mini"
          type="info"
          effect="plain"
          class="kb-search__tag"
          @click.native="doSearch(word)"
        >{{ word }}</el-tag>
        <el-button type="text" size="mini" @click="clearHistory">清空历史</el-button>
      </div>
    </div>

    <div v-loading="loading" class="kb-search__result">
      <div v-if="searched" class="kb-search__meta">
        共 <b>{{ total }}</b> 条结果<span v-if="cost">，耗时 {{ cost }} ms</span>
        <span v-if="total > pagerLimit" class="kb-search__limit">
          （结果过多，最多翻看前 {{ pagerLimit }} 条，请细化关键词）
        </span>
      </div>

      <div v-for="item in list" :key="item.id" class="kb-search__item" @click="openDetail(item)">
        <div class="kb-search__title" v-html="item.title"></div>
        <div class="kb-search__snippet" v-html="item.snippet"></div>
        <div class="kb-search__tags">
          <el-tag v-if="item.category" size="mini" effect="plain">{{ item.category }}</el-tag>
          <el-tag
            v-for="tag in splitTags(item.tags)"
            :key="tag"
            size="mini"
            type="success"
            effect="plain"
          >{{ tag }}</el-tag>
        </div>
      </div>

      <el-empty v-if="searched && !loading && !list.length" description="没有找到相关题目，换个关键词试试" />

      <el-pagination
        v-if="pagerTotal > queryParams.pageSize"
        class="kb-search__pager"
        background
        layout="prev, pager, next, total"
        :total="pagerTotal"
        :current-page.sync="queryParams.pageNum"
        :page-size="queryParams.pageSize"
        @current-change="fetchList"
      />
    </div>

    <el-drawer
      :title="detail.title"
      :visible.sync="detailVisible"
      direction="rtl"
      size="52%"
      append-to-body
      custom-class="kb-detail-drawer"
    >
      <div v-loading="detailLoading" class="kb-detail">
        <div class="kb-detail__meta">
          <el-tag v-if="detail.category" size="mini" effect="plain">{{ detail.category }}</el-tag>
          <el-tag v-if="detail.docType" size="mini" type="danger" effect="plain">{{ detail.docType }}</el-tag>
          <el-tag v-if="detail.difficulty" size="mini" type="warning" effect="plain">{{ detail.difficulty }}</el-tag>
          <el-tag v-for="tag in splitTags(detail.tags)" :key="tag" size="mini" type="success" effect="plain">{{ tag }}</el-tag>
        </div>
        <div v-if="detailOptions.length" class="kb-detail__options">
          <div
            v-for="opt in detailOptions"
            :key="opt.key"
            class="kb-detail__option"
            :class="{ 'is-answer': isAnswer(opt.key) }"
          >
            <b>{{ opt.key }}.</b> {{ opt.text }}
            <el-tag v-if="isAnswer(opt.key)" size="mini" type="success">正确</el-tag>
          </div>
        </div>
        <div v-if="detail.answer" class="kb-detail__answer">
          正确答案：<b>{{ detail.answer }}</b>
        </div>
        <div class="kb-detail__content" v-html="detailHtml"></div>
      </div>
    </el-drawer>
  </div>
</template>

<script>
import { marked } from 'marked'
import { searchQuestions, getQuestionDetail } from '@/api/kb'

const HISTORY_KEY = 'kb_search_history'
const HISTORY_MAX = 10

export default {
  name: 'KbQuestionSearch',
  data() {
    return {
      keyword: '',
      hotWords: ['线程池', 'JVM 垃圾回收', 'HashMap', 'synchronized', 'Spring 事务', 'MySQL 索引', '缓存穿透', '分布式锁'],
      history: [],
      list: [],
      total: 0,
      cost: 0,
      loading: false,
      searched: false,
      pagerLimit: 1000,
      facets: {},
      filters: { questionTypes: [], categories: [] },
      detailVisible: false,
      detailLoading: false,
      detail: {},
      detailHtml: '',
      detailOptions: [],
      queryParams: { pageNum: 1, pageSize: 10 }
    }
  },
  computed: {
    pagerTotal() {
      return Math.min(this.total, this.pagerLimit)
    },
    hasFilter() {
      return this.filters.questionTypes.length > 0 || this.filters.categories.length > 0
    }
  },
  created() {
    try {
      this.history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
    } catch (e) {
      this.history = []
    }
  },
  methods: {
    splitTags(tags) {
      return tags ? tags.split(',').filter(Boolean) : []
    },
    openDetail(item) {
      this.detailVisible = true
      this.detailLoading = true
      this.detail = { title: item.title }
      this.detailHtml = ''
      getQuestionDetail(item.id).then(res => {
        this.detail = (res && res.data) || {}
        this.detailHtml = marked.parse(this.detail.content || '')
        try {
          this.detailOptions = this.detail.options ? JSON.parse(this.detail.options) : []
        } catch (e) {
          this.detailOptions = []
        }
      }).finally(() => {
        this.detailLoading = false
      })
    },
    doSearch(word) {
      if (typeof word === 'string') {
        this.keyword = word
      }
      this.queryParams.pageNum = 1
      this.saveHistory(this.keyword)
      this.fetchList()
    },
    fetchList() {
      const kw = (this.keyword || '').trim()
      this.loading = true
      this.searched = true
      const start = Date.now()
      searchQuestions({
        keyword: kw,
        questionType: this.filters.questionTypes.join(','),
        category: this.filters.categories.join(','),
        pageNum: this.queryParams.pageNum,
        pageSize: this.queryParams.pageSize
      }).then(res => {
        const data = (res && res.data) || {}
        this.list = data.list || []
        this.total = data.total || 0
        this.facets = data.facets || {}
        this.cost = Date.now() - start
      }).finally(() => {
        this.loading = false
      })
    },
    saveHistory(word) {
      const value = (word || '').trim()
      if (!value) {
        return
      }
      const next = [value].concat(this.history.filter(item => item !== value)).slice(0, HISTORY_MAX)
      this.history = next
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
    },
    clearHistory() {
      this.history = []
      localStorage.removeItem(HISTORY_KEY)
    },
    toggleType(key) {
      const idx = this.filters.questionTypes.indexOf(key)
      if (idx >= 0) {
        this.filters.questionTypes.splice(idx, 1)
      } else {
        this.filters.questionTypes.push(key)
      }
      this.doSearch()
    },
    clearFilters() {
      this.filters = { questionTypes: [], categories: [] }
      this.doSearch()
    },
    isAnswer(key) {
      if (!this.detail.answer) {
        return false
      }
      return String(this.detail.answer).toUpperCase().split(',').map(s => s.trim()).includes(String(key).toUpperCase())
    }
  }
}
</script>

<style scoped>
.kb-search__box {
  max-width: 900px;
  margin: 0 auto 18px;
}
.kb-search__row {
  margin-top: 12px;
  line-height: 28px;
}
.kb-search__label {
  color: #909399;
  font-size: 13px;
}
.kb-search__tag {
  margin-right: 8px;
  cursor: pointer;
}
.kb-search__result {
  max-width: 900px;
  margin: 0 auto;
}
.kb-search__meta {
  color: #909399;
  font-size: 13px;
  margin-bottom: 12px;
}
.kb-search__limit {
  color: #e6a23c;
  margin-left: 6px;
}
.kb-search__item {
  padding: 14px 0;
  border-bottom: 1px solid #ebeef5;
  cursor: pointer;
  transition: background 0.2s;
}
.kb-search__item:hover {
  background: #f5f7fa;
}
.kb-search__title {
  font-size: 16px;
  color: #409eff;
  margin-bottom: 6px;
}
.kb-search__snippet {
  color: #606266;
  font-size: 13px;
  line-height: 22px;
  margin-bottom: 8px;
  word-break: break-all;
}
.kb-search__snippet >>> em,
.kb-search__title >>> em {
  color: #f56c6c;
  font-style: normal;
}
.kb-search__tags {
  line-height: 24px;
}
.kb-search__tags .el-tag {
  margin-right: 6px;
}
.kb-search__pager {
  margin-top: 18px;
  text-align: center;
}
.kb-detail {
  padding: 0 20px 24px;
}
.kb-detail__meta {
  margin-bottom: 12px;
}
.kb-detail__meta .el-tag {
  margin-right: 6px;
}
.kb-detail__content {
  font-size: 14px;
  line-height: 1.8;
  color: #303133;
  word-break: break-word;
}
.kb-detail__options {
  margin-bottom: 12px;
}
.kb-detail__option {
  padding: 6px 10px;
  margin-bottom: 6px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  font-size: 13px;
  line-height: 20px;
}
.kb-detail__option.is-answer {
  border-color: #67c23a;
  background: #f0f9eb;
}
.kb-detail__answer {
  margin-bottom: 12px;
  color: #67c23a;
  font-size: 14px;
}
.kb-detail__content img {
  max-width: 100%;
}
.kb-detail__content h1,
.kb-detail__content h2,
.kb-detail__content h3 {
  font-size: 16px;
  margin: 14px 0 8px;
}
.kb-detail__content pre {
  background: #f6f8fa;
  padding: 10px;
  border-radius: 4px;
  overflow: auto;
}
.kb-detail__content code {
  background: #f6f8fa;
  padding: 1px 4px;
  border-radius: 3px;
  font-family: Menlo, Consolas, monospace;
  font-size: 12px;
}
.kb-detail__content pre code {
  background: transparent;
  padding: 0;
}
.kb-detail__content table {
  border-collapse: collapse;
  width: 100%;
  margin: 8px 0;
}
.kb-detail__content th,
.kb-detail__content td {
  border: 1px solid #dcdfe6;
  padding: 6px 10px;
}
.kb-detail__content blockquote {
  margin: 8px 0;
  padding: 6px 12px;
  border-left: 4px solid #dcdfe6;
  color: #606266;
  background: #fafafa;
}
</style>
