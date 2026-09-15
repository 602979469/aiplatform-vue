<template>
  <div class="app-container">
    <el-table v-loading="loading" :data="list" border size="small">
      <el-table-column prop="title" label="试卷" min-width="220" show-overflow-tooltip />
      <el-table-column prop="questionCount" label="题量" width="80" align="center" />
      <el-table-column label="状态" width="90" align="center">
        <template slot-scope="scope">
          <el-tag v-if="scope.row.status === 'IN_PROGRESS'" size="mini" type="warning">未完成</el-tag>
          <el-tag v-else size="mini" type="success">已交卷</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="得分" width="110" align="center">
        <template slot-scope="scope">
          <template v-if="scope.row.status === 'IN_PROGRESS'">-</template>
          <template v-else><b class="history-score">{{ scope.row.score }}</b> / {{ scope.row.totalScore }}</template>
        </template>
      </el-table-column>
      <el-table-column label="对 / 错 / 未答" width="140" align="center">
        <template slot-scope="scope">
          <span class="is-ok">{{ scope.row.correctCount }}</span> /
          <span class="is-bad">{{ scope.row.wrongCount }}</span> /
          <span>{{ scope.row.unansweredCount }}</span>
        </template>
      </el-table-column>
      <el-table-column label="用时" width="90" align="center">
        <template slot-scope="scope">{{ formatDuration(scope.row.costSeconds) }}</template>
      </el-table-column>
      <el-table-column prop="submitTime" label="交卷时间" width="180" align="center" />
      <el-table-column label="操作" width="170" align="center">
        <template slot-scope="scope">
          <el-button
            v-if="scope.row.status === 'IN_PROGRESS'"
            type="text"
            size="mini"
            @click="resumeExam(scope.row)"
          >继续考试</el-button>
          <el-button v-else type="text" size="mini" @click="openResult(scope.row)">查看成绩</el-button>
          <el-button type="text" size="mini" class="history-danger" @click="handleDelete(scope.row)">删除</el-button>
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

    <el-drawer
      :title="result.title"
      :visible.sync="resultVisible"
      :direction="isMobile ? 'btt' : 'rtl'"
      :size="isMobile ? '92%' : '55%'"
      append-to-body
    >
      <div v-loading="resultLoading" class="exam-result">
        <div class="exam-result__summary">
          <div class="exam-result__score"><b>{{ result.score }}</b><span>/ {{ result.totalScore }}</span></div>
          <div class="exam-result__stats">
            <div>答对 <b class="is-ok">{{ result.correctCount }}</b> 题</div>
            <div>答错 <b class="is-bad">{{ result.wrongCount }}</b> 题</div>
            <div>未答 <b>{{ result.unansweredCount }}</b> 题</div>
            <div>用时 {{ formatDuration(result.costSeconds) }}</div>
          </div>
        </div>
        <div v-for="item in result.questions" :key="item.seq" class="exam-result__item">
          <div class="exam-result__head">
            <span class="exam-result__seq">{{ item.seq }}</span>
            <span class="exam-result__title">{{ item.title }}</span>
            <el-tag v-if="item.isCorrect === 1" size="mini" type="success">答对</el-tag>
            <el-tag v-else-if="item.isCorrect === 0" size="mini" type="danger">答错</el-tag>
            <el-tag v-else size="mini" type="info">解答题</el-tag>
          </div>
          <div class="exam-result__answers">
            <span>我的答案：<b>{{ item.userAnswer || '未作答' }}</b></span>
            <span>正确答案：<b class="is-ok">{{ item.answer }}</b></span>
          </div>
          <div v-if="item.explanation" class="exam-result__explanation" v-html="renderMarkdown(item.explanation)" />
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script>
import { marked } from 'marked'
import { listExamHistory, getExamResult, deleteExamPaper } from '@/api/kb'
import responsive from '@/mixins/responsive'

export default {
  name: 'KbExamHistory',
  mixins: [responsive],
  data() {
    return {
      loading: false,
      list: [],
      total: 0,
      query: { pageNum: 1, pageSize: 10 },
      resultVisible: false,
      resultLoading: false,
      result: { questions: [] }
    }
  },
  created() {
    this.getList()
  },
  methods: {
    getList() {
      this.loading = true
      listExamHistory(this.query).then(res => {
        const data = (res && res.data) || {}
        this.list = data.dataList || []
        this.total = data.total || 0
      }).finally(() => {
        this.loading = false
      })
    },
    openResult(row) {
      this.resultVisible = true
      this.resultLoading = true
      this.result = { title: row.title, questions: [] }
      getExamResult(row.id).then(res => {
        this.result = (res && res.data) || {}
      }).finally(() => {
        this.resultLoading = false
      })
    },
    /** 未完成的考试继续作答 */
    resumeExam(row) {
      this.$router.push({ path: '/exam/start', query: { paperId: row.id } })
    },
    /** 删除考试记录（错题集/掌握度不受影响） */
    handleDelete(row) {
      this.$modal.confirm('确认删除这条考试记录？删除后不可恢复（错题集与掌握度保留）。').then(() => {
        return deleteExamPaper(row.id)
      }).then(() => {
        this.$modal.msgSuccess('删除成功')
        this.getList()
      }).catch(() => {})
    },
    formatDuration(seconds) {
      const value = Math.max(seconds || 0, 0)
      const minutes = Math.floor(value / 60)
      const rest = value % 60
      return minutes + ' 分 ' + rest + ' 秒'
    },
    renderMarkdown(text) {
      return marked.parse(text || '')
    }
  }
}
</script>

<style scoped>
.history-score {
  color: #409eff;
  font-size: 15px;
}
.is-ok {
  color: #67c23a;
}
.is-bad {
  color: #f56c6c;
}
.history-danger {
  color: #f56c6c;
}
.exam-result {
  padding: 0 20px 20px;
}
.exam-result__summary {
  display: flex;
  align-items: center;
  gap: 32px;
  padding: 12px 4px 20px;
  border-bottom: 1px solid #f0f2f5;
}
.exam-result__score b {
  font-size: 40px;
  color: #409eff;
}
.exam-result__score span {
  color: #909399;
  margin-left: 4px;
}
.exam-result__stats div {
  font-size: 13px;
  color: #606266;
  margin-bottom: 4px;
}
.exam-result__item {
  padding: 14px 4px;
  border-bottom: 1px dashed #ebeef5;
}
.exam-result__head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.exam-result__seq {
  display: inline-block;
  width: 22px;
  height: 22px;
  line-height: 22px;
  text-align: center;
  border-radius: 50%;
  background: #f0f2f5;
  font-size: 12px;
}
.exam-result__title {
  flex: 1;
  font-weight: 500;
}
.exam-result__answers {
  margin: 8px 0 0 30px;
  font-size: 13px;
  color: #606266;
}
.exam-result__answers span {
  margin-right: 18px;
}
.exam-result__explanation {
  margin: 10px 0 0 30px;
  padding: 10px 12px;
  background: #fafbfc;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.7;
  color: #606266;
}
</style>
