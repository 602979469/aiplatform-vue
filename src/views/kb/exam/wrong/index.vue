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
          <el-button type="text" size="mini" @click="toggle(scope.row)">解析</el-button>
          <el-button type="text" size="mini" @click="markMastered(scope.row)">已掌握</el-button>
        </template>
      </el-table-column>
      <el-table-column type="expand">
        <template slot-scope="scope">
          <div class="wrong-explanation" v-html="renderMarkdown(scope.row.explanation || '（暂无解析）')" />
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
  </div>
</template>

<script>
import { marked } from 'marked'
import { listWrongQuestions, markQuestionMastered, getQuestionMeta } from '@/api/kb'

export default {
  name: 'KbExamWrong',
  data() {
    return {
      loading: false,
      list: [],
      total: 0,
      categories: [],
      query: { pageNum: 1, pageSize: 10, category: undefined }
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
    toggle(row) {
      const table = this.$refs.table
      if (table) {
        table.toggleRowExpansion(row)
      }
    },
    markMastered(row) {
      this.$modal.confirm('确认把这道题移出错题集（标记为已掌握）？').then(() => {
        return markQuestionMastered(row.questionId)
      }).then(() => {
        this.$modal.msgSuccess('已移出错题集')
        this.getList()
      }).catch(() => {})
    },
    renderMarkdown(text) {
      return marked.parse(text || '')
    }
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
.wrong-explanation {
  padding: 12px 24px;
  font-size: 13px;
  line-height: 1.75;
  color: #606266;
}
</style>
