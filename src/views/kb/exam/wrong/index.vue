<template>
  <div class="app-container">
    <el-form :inline="true" size="small" class="mb8">
      <el-form-item label="分类">
        <el-select v-model="query.category" placeholder="全部" clearable filterable style="width: 200px" @change="handleQuery">
          <el-option v-for="item in categories" :key="item" :label="item" :value="item" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="el-icon-search" @click="handleQuery">查询</el-button>
        <el-button icon="el-icon-refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table ref="table" v-loading="loading" :data="list" border size="small">
      <el-table-column prop="title" label="题干" min-width="320" show-overflow-tooltip />
      <el-table-column prop="category" label="分类" width="130" show-overflow-tooltip />
      <el-table-column prop="subtopic" label="知识点" width="130" show-overflow-tooltip />
      <el-table-column prop="questionType" label="题型" width="80" align="center" />
      <el-table-column label="我的答案" width="100" align="center">
        <template slot-scope="scope"><span class="is-bad">{{ scope.row.userAnswer || '-' }}</span></template>
      </el-table-column>
      <el-table-column label="正确答案" width="100" align="center">
        <template slot-scope="scope"><span class="is-ok">{{ scope.row.answer }}</span></template>
      </el-table-column>
      <el-table-column prop="wrongCount" label="错次" width="70" align="center" />
      <el-table-column prop="lastAnswerTime" label="最近作答" width="170" align="center" />
      <el-table-column label="操作" width="150" align="center" fixed="right">
        <template slot-scope="scope">
          <el-button type="text" size="mini" @click="openDetail(scope.row)">详情/解析</el-button>
          <el-button type="text" size="mini" @click="markMastered(scope.row)">已掌握</el-button>
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

    <!-- 错题详情：与题库搜索详情一致（选项高亮 + Markdown 正文/解析） -->
    <el-drawer :title="detail.title" :visible.sync="detailVisible" direction="rtl" size="52%" append-to-body>
      <div v-loading="detailLoading" class="wrong-detail">
        <div class="wrong-detail__meta">
          <el-tag v-if="detail.category" size="mini" effect="plain">{{ detail.category }}</el-tag>
          <el-tag v-if="detail.subtopic" size="mini" effect="plain">{{ detail.subtopic }}</el-tag>
          <el-tag v-if="detail.docType" size="mini" type="danger" effect="plain">{{ detail.docType }}</el-tag>
          <el-tag v-if="detail.difficulty" size="mini" type="warning" effect="plain">{{ detail.difficulty }}</el-tag>
        </div>

        <div class="wrong-detail__answers">
          <div>我的答案：<b class="is-bad">{{ currentWrongAnswer || '未作答' }}</b></div>
          <div>正确答案：<b class="is-ok">{{ detail.answer || currentAnswer }}</b></div>
        </div>

        <div v-if="detailOptions.length" class="wrong-detail__options">
          <div
            v-for="opt in detailOptions"
            :key="opt.key"
            class="wrong-detail__option"
            :class="{ 'is-answer': isAnswer(opt.key) }"
          >
            <b>{{ opt.key }}.</b> {{ opt.text }}
            <el-tag v-if="isAnswer(opt.key)" size="mini" type="success">正确答案</el-tag>
            <el-tag v-else-if="isMyAnswer(opt.key)" size="mini" type="danger">我选的</el-tag>
          </div>
        </div>

        <div v-if="detailHtml" class="wrong-detail__content" v-html="detailHtml" />
        <el-empty v-if="!detailLoading && !detailHtml" description="该题暂无解析内容" />
      </div>
    </el-drawer>
  </div>
</template>

<script>
import { marked } from 'marked'
import { listWrongQuestions, markQuestionMastered, getQuestionMeta, getQuestionDetail } from '@/api/kb'

export default {
  name: 'KbExamWrong',
  data() {
    return {
      loading: false,
      list: [],
      total: 0,
      categories: [],
      query: { pageNum: 1, pageSize: 10, category: undefined },
      detailVisible: false,
      detailLoading: false,
      detail: {},
      detailHtml: '',
      detailOptions: [],
      currentWrongAnswer: '',
      currentAnswer: ''
    }
  },
  created() {
    getQuestionMeta().then(res => {
      const data = (res && res.data) || { categories: [] }
      this.categories = (data.categories || []).map(item => item.category)
    })
    this.getList()
  },
  methods: {
    getList() {
      this.loading = true
      listWrongQuestions(this.query).then(res => {
        const data = (res && res.data) || {}
        this.list = data.dataList || []
        this.total = data.total || 0
      }).finally(() => {
        this.loading = false
      })
    },
    handleQuery() {
      this.query.pageNum = 1
      this.getList()
    },
    resetQuery() {
      this.query = { pageNum: 1, pageSize: 10, category: undefined }
      this.getList()
    },
    /** 打开详情：与题库搜索详情一致（题干 + 选项高亮 + Markdown 正文/解析） */
    openDetail(row) {
      this.detailVisible = true
      this.detailLoading = true
      this.detail = { title: row.title }
      this.detailHtml = ''
      this.detailOptions = []
      this.currentWrongAnswer = row.userAnswer
      this.currentAnswer = row.answer
      getQuestionDetail(row.questionId).then(res => {
        this.detail = (res && res.data) || {}
        // 搜索详情页的正文即解析内容；explanation 单独有值时一并拼接
        const parts = [this.detail.content, this.detail.explanation].filter(Boolean)
        this.detailHtml = parts.length ? marked.parse(parts.join('\n\n')) : ''
        try {
          this.detailOptions = this.detail.options ? JSON.parse(this.detail.options) : []
        } catch (e) {
          this.detailOptions = []
        }
      }).finally(() => {
        this.detailLoading = false
      })
    },
    isAnswer(key) {
      const answer = this.detail.answer || this.currentAnswer || ''
      return answer.split(',').map(value => value.trim().toUpperCase()).indexOf(key) >= 0
    },
    isMyAnswer(key) {
      const answer = this.currentWrongAnswer || ''
      return answer.split(',').map(value => value.trim().toUpperCase()).indexOf(key) >= 0
    },
    markMastered(row) {
      this.$modal.confirm('确认把这道题移出错题集（标记为已掌握）？').then(() => {
        return markQuestionMastered(row.questionId)
      }).then(() => {
        this.$modal.msgSuccess('已移出错题集')
        this.getList()
      }).catch(() => {})
    },
  }
}
</script>

<style scoped>
.is-ok {
  color: #67c23a;
  font-weight: 600;
}
.is-bad {
  color: #f56c6c;
  font-weight: 600;
}
.wrong-detail {
  padding: 0 20px 20px;
}
.wrong-detail__meta .el-tag {
  margin-right: 6px;
}
.wrong-detail__answers {
  margin-top: 12px;
  font-size: 13px;
  color: #606266;
}
.wrong-detail__answers div {
  margin-bottom: 4px;
}
.wrong-detail__options {
  margin-top: 14px;
}
.wrong-detail__option {
  padding: 8px 10px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  margin-bottom: 8px;
  font-size: 13px;
  line-height: 1.6;
}
.wrong-detail__option.is-answer {
  border-color: #67c23a;
  background: #f0f9eb;
}
.wrong-detail__content {
  margin-top: 16px;
  font-size: 14px;
  line-height: 1.75;
  word-break: break-word;
}
</style>
