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
          <el-button v-else type="text" size="mini" @click="viewResult(scope.row)">查看成绩</el-button>
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
  </div>
</template>

<script>
import { listExamHistory, deleteExamPaper } from '@/api/kb'

export default {
  name: 'KbExamHistory',
  data() {
    return {
      loading: false,
      list: [],
      total: 0,
      query: { pageNum: 1, pageSize: 10 }
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
    /** 未完成的考试：回到答题页继续作答 */
    resumeExam(row) {
      this.$router.push({ path: '/exam/start', query: { paperId: row.id } })
    },
    /** 已结束的考试：整页跳到成绩页（与考完试后的成绩页同一个页面） */
    viewResult(row) {
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
</style>
