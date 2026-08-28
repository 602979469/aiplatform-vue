<template>
  <div class="app-container">
    <!-- 查询条件 -->
    <el-form :model="queryParams" ref="queryForm" size="small" :inline="true" v-show="showSearch" label-width="68px" @submit.native.prevent>
      <el-form-item label="文件名" prop="fileName">
        <el-input
          v-model="queryParams.fileName"
          placeholder="请输入文件名"
          clearable
          style="width: 240px;"
          @keyup.enter.native="handleQuery"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="el-icon-search" size="mini" @click="handleQuery">搜索</el-button>
        <el-button icon="el-icon-refresh" size="mini" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <right-toolbar :showSearch.sync="showSearch" @queryTable="getList" />
    </el-row>

    <el-table v-loading="loading" :data="fileList" stripe @row-click="handleViewLog">
      <el-table-column label="文件名" prop="fileName" min-width="200" show-overflow-tooltip />
      <el-table-column label="文件路径" prop="filePath" min-width="300" show-overflow-tooltip />
      <el-table-column label="文件大小" prop="fileSize" width="120" align="center" />
      <el-table-column label="最后修改时间" prop="lastModified" width="180" align="center" />
      <el-table-column label="操作" width="100" align="center">
        <template slot-scope="scope">
          <el-button size="mini" type="text" icon="el-icon-view" @click.stop="handleViewLog(scope.row)">查看</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination
      v-show="total > 0"
      :total="total"
      :page.sync="queryParams.pageNum"
      :limit.sync="queryParams.pageSize"
      @pagination="getList"
    />

    <!-- 日志详情对话框 -->
    <el-dialog :title="'日志查看 - ' + detail.fileName" :visible.sync="detailOpen" width="1100px" append-to-body top="5vh">
      <!-- 文件信息 -->
      <el-descriptions :column="3" border size="small" class="mb10">
        <el-descriptions-item label="文件大小">{{ detail.fileSize }}</el-descriptions-item>
        <el-descriptions-item label="最后修改">{{ detail.lastModified }}</el-descriptions-item>
        <el-descriptions-item label="总行数">{{ detail.totalLines }}</el-descriptions-item>
      </el-descriptions>

      <!-- 关键词搜索 -->
      <el-form :inline="true" size="small" class="mb10">
        <el-form-item>
          <el-input
            v-model="detailQuery.keyword"
            placeholder="搜索关键词"
            clearable
            style="width: 300px;"
            @keyup.enter.native="loadDetail(1)"
          >
            <el-button slot="append" icon="el-icon-search" @click="loadDetail(1)" />
          </el-input>
        </el-form-item>
      </el-form>

      <!-- 日志内容 -->
      <div v-loading="detailLoading" class="log-content-wrap">
        <pre v-if="detail.content && detail.content.length" class="log-content">{{ detail.content.join('\n') }}</pre>
        <el-empty v-else description="暂无日志内容" />
      </div>

      <!-- 分页 -->
      <div class="detail-pagination" v-if="detail.totalLines > 0">
        <el-pagination
          small
          background
          layout="total, prev, pager, next, jumper"
          :total="detail.totalLines"
          :page-size="detailQuery.pageSize"
          :current-page="detailQuery.pageNum"
          @current-change="loadDetail"
        />
      </div>

      <div slot="footer">
        <el-button @click="detailOpen = false">关闭</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { listLogFiles, getLogDetail } from '@/api/monitor/syslog'

export default {
  name: 'SysLog',
  data() {
    return {
      loading: false,
      showSearch: true,
      fileList: [],
      total: 0,
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        fileName: undefined
      },
      // 详情
      detailOpen: false,
      detailLoading: false,
      detail: {},
      detailQuery: {
        fileName: '',
        pageNum: 1,
        pageSize: 200,
        keyword: ''
      }
    }
  },
  created() {
    this.getList()
  },
  methods: {
    getList() {
      this.loading = true
      listLogFiles(this.queryParams).then(res => {
        this.fileList = res.data || []
        this.total = (res.data && res.data.length) || 0
        this.loading = false
      }).catch(() => {
        this.loading = false
      })
    },
    handleQuery() {
      this.queryParams.pageNum = 1
      this.getList()
    },
    resetQuery() {
      this.resetForm('queryForm')
      this.handleQuery()
    },
    handleViewLog(row) {
      this.detail = {}
      this.detailQuery.fileName = row.fileName
      this.detailQuery.pageNum = 1
      this.detailQuery.keyword = ''
      this.detailOpen = true
      this.loadDetail(1)
    },
    loadDetail(page) {
      if (page) {
        this.detailQuery.pageNum = page
      }
      this.detailLoading = true
      getLogDetail(this.detailQuery).then(res => {
        this.detail = res.data || {}
        this.detailLoading = false
      }).catch(() => {
        this.detailLoading = false
      })
    }
  }
}
</script>

<style scoped>
.mb10 {
  margin-bottom: 10px;
}
.log-content-wrap {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  min-height: 200px;
  max-height: 60vh;
  overflow: auto;
  background: #1e1e1e;
}
.log-content {
  margin: 0;
  padding: 12px;
  font-family: Menlo, Consolas, 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.6;
  color: #d4d4d4;
  white-space: pre-wrap;
  word-break: break-all;
}
.detail-pagination {
  margin-top: 10px;
  text-align: right;
}
</style>
