<template>
  <div class="app-container">
    <el-alert
      title="列表 = 集群已有 Ingress 的域名（只读，开关控制公网暴露）+ 自定义域名。打开开关即在公网 Caddy 加站点并 reload，瞬间生效；首次开启需等约 10 秒签证书。"
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom: 14px"
    />

    <el-form :inline="true" size="small">
      <el-form-item label="域名">
        <el-input v-model="keyword" placeholder="按域名筛选" clearable style="width: 220px" />
      </el-form-item>
      <el-form-item>
        <el-button icon="el-icon-refresh" size="mini" @click="loadList">刷新</el-button>
        <el-button type="primary" plain icon="el-icon-plus" size="mini" @click="openAdd">新增自定义域名</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="filteredList" border>
      <el-table-column label="域名" min-width="260" show-overflow-tooltip>
        <template slot-scope="scope">
          <a v-if="scope.row.caddy" :href="'https://' + scope.row.domain" target="_blank" rel="noopener">{{ scope.row.domain }}</a>
          <span v-else>{{ scope.row.domain }}</span>
        </template>
      </el-table-column>
      <el-table-column label="Caddy 开关" width="120" align="center">
        <template slot-scope="scope">
          <el-switch
            v-model="scope.row.caddy"
            :loading="scope.row._loading"
            :disabled="scope.row._loading"
            @change="val => onToggle(scope.row, val)"
          />
        </template>
      </el-table-column>
      <el-table-column label="类型" width="110" align="center">
        <template slot-scope="scope">
          <el-tag v-if="scope.row.type === 'ingress'" size="mini">ingress</el-tag>
          <el-tag v-else size="mini" type="warning">自定义</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="目标服务" min-width="240" show-overflow-tooltip>
        <template slot-scope="scope">
          <span v-if="scope.row.type === 'ingress'">
            {{ scope.row.namespace }} / {{ scope.row.service }}:{{ scope.row.port }}
          </span>
          <span v-else-if="scope.row.upstream">{{ scope.row.upstream }}</span>
          <span v-else style="color: #909399">127.0.0.1:8080（默认）</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="110" align="center" fixed="right">
        <template slot-scope="scope">
          <el-button
            v-if="scope.row.type !== 'ingress'"
            size="mini"
            type="text"
            style="color: #F56C6C"
            @click="handleDelete(scope.row)"
          >删除</el-button>
          <span v-else style="color: #909399; font-size: 12px">由 Ingress 决定</span>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog title="新增自定义域名" :visible.sync="addOpen" width="560px" append-to-body>
      <el-form ref="addForm" :model="addForm" :rules="addRules" label-width="110px">
        <el-form-item label="域名" prop="domain">
          <el-input v-model="addForm.domain" placeholder="例如 demo.jakt.online（只允许 *.jakt.online）" />
        </el-form-item>
        <el-form-item label="上游地址" prop="upstream">
          <el-input v-model="addForm.upstream" placeholder="默认 127.0.0.1:8080（集群 frp）；其他 frp 可填对应地址" />
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" @click="submitAdd">保 存</el-button>
        <el-button @click="addOpen = false">取 消</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { listDomains, enableDomain, disableDomain } from '@/api/cluster'

const DOMAIN_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?\.jakt\.online$/
const UPSTREAM_PATTERN = /^[A-Za-z0-9._-]+:[0-9]{1,5}$/

export default {
  name: 'ClusterDomain',
  data() {
    return {
      loading: false,
      list: [],
      keyword: '',
      addOpen: false,
      addForm: { domain: '', upstream: '127.0.0.1:8080' },
      addRules: {
        domain: [
          { required: true, message: '域名不能为空', trigger: 'blur' },
          {
            validator: (rule, value, callback) => {
              if (!value || DOMAIN_PATTERN.test(value)) {
                callback()
              } else {
                callback(new Error('只允许 xxxx.jakt.online 形式'))
              }
            },
            trigger: 'blur'
          }
        ],
        upstream: [
          {
            validator: (rule, value, callback) => {
              if (!value || UPSTREAM_PATTERN.test(value)) {
                callback()
              } else {
                callback(new Error('上游格式如 127.0.0.1:8080'))
              }
            },
            trigger: 'blur'
          }
        ]
      }
    }
  },
  computed: {
    filteredList() {
      const kw = (this.keyword || '').trim().toLowerCase()
      if (!kw) {
        return this.list
      }
      return this.list.filter(row => (row.domain || '').toLowerCase().includes(kw))
    }
  },
  created() {
    this.loadList()
  },
  methods: {
    loadList() {
      this.loading = true
      listDomains().then(res => {
        const rows = (res && res.data) || []
        this.list = rows.map(row => {
          this.$set(row, '_loading', false)
          return row
        })
      }).finally(() => {
        this.loading = false
      })
    },
    onToggle(row, value) {
      this.$set(row, '_loading', true)
      const action = value ? enableDomain(row.domain, row.upstream) : disableDomain(row.domain)
      action.then(() => {
        this.$message.success(value ? '已开启公网映射（首次访问约 10 秒后生效）' : '已关闭公网映射')
        this.loadList()
      }).catch(() => {
        row.caddy = !value
      }).finally(() => {
        this.$set(row, '_loading', false)
      })
    },
    openAdd() {
      this.addForm = { domain: '', upstream: '127.0.0.1:8080' }
      this.addOpen = true
      this.$nextTick(() => {
        this.$refs.addForm && this.$refs.addForm.clearValidate()
      })
    },
    submitAdd() {
      this.$refs.addForm.validate(valid => {
        if (!valid) {
          return
        }
        enableDomain(this.addForm.domain, this.addForm.upstream).then(() => {
          this.$message.success('已新增并开启（首次访问等约 10 秒签证书）')
          this.addOpen = false
          this.loadList()
        })
      })
    },
    handleDelete(row) {
      this.$confirm('确认删除自定义域名 ' + row.domain + ' ？将删除公网 Caddy 配置。',
        '提示', { type: 'warning' }).then(() => {
        disableDomain(row.domain).then(() => {
          this.$message.success('已删除')
          this.loadList()
        })
      }).catch(() => {})
    }
  }
}
</script>
