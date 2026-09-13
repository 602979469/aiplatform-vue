<template>
  <div class="app-container">
    <el-alert
      title="域名映射：新增时会同时创建集群 Ingress（内部路由）和公网 Caddy 入口；域名统一走泛解析 *.jakt.online，无需改 DNS。"
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom: 14px"
    />

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="el-icon-plus" size="mini" @click="openAdd">新增映射</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button icon="el-icon-refresh" size="mini" @click="loadList">刷新</el-button>
      </el-col>
    </el-row>

    <el-table v-loading="loading" :data="list" border>
      <el-table-column label="域名" min-width="240" show-overflow-tooltip>
        <template slot-scope="scope">
          <a :href="'https://' + scope.row.domain" target="_blank" rel="noopener">{{ scope.row.domain }}</a>
        </template>
      </el-table-column>
      <el-table-column label="公网入口(Caddy)" width="140" align="center">
        <template slot-scope="scope">
          <el-tag v-if="scope.row.caddy" type="success" size="mini">已开通</el-tag>
          <el-tag v-else type="info" size="mini">未开通</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="集群路由(Ingress)" width="140" align="center">
        <template slot-scope="scope">
          <el-tag v-if="scope.row.ingress" type="success" size="mini">已配置</el-tag>
          <el-tag v-else type="info" size="mini">无</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="目标服务" min-width="220" show-overflow-tooltip>
        <template slot-scope="scope">
          <span v-if="scope.row.service">
            {{ scope.row.namespace }} / {{ scope.row.service }}:{{ scope.row.port }}
          </span>
          <span v-else style="color: #909399">—</span>
        </template>
      </el-table-column>
      <el-table-column label="Ingress 名称" min-width="200" show-overflow-tooltip>
        <template slot-scope="scope">
          <span v-if="scope.row.ingressName">
            {{ scope.row.ingressName }}
            <el-tag v-if="scope.row.managed" size="mini" type="warning" style="margin-left: 4px">纳管</el-tag>
          </span>
          <span v-else style="color: #909399">—</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="110" fixed="right" align="center">
        <template slot-scope="scope">
          <el-button size="mini" type="text" style="color: #F56C6C" @click="handleRemove(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog title="新增域名映射" :visible.sync="addOpen" width="620px" append-to-body>
      <el-form ref="addForm" :model="addForm" :rules="addRules" label-width="110px">
        <el-form-item label="域名" prop="domain">
          <el-input v-model="addForm.domain" placeholder="例如 demo.jakt.online（只能填 *.jakt.online）" />
        </el-form-item>
        <el-divider content-position="left">集群内路由（可留空：只开公网入口，不建 Ingress）</el-divider>
        <el-row>
          <el-col :span="12">
            <el-form-item label="命名空间" prop="namespace">
              <el-select v-model="addForm.namespace" placeholder="请选择" clearable style="width: 100%">
                <el-option v-for="ns in namespaceList" :key="ns" :label="ns" :value="ns" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Service" prop="service">
              <el-input v-model="addForm.service" placeholder="如 code-generate" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="端口" prop="port">
          <el-input-number v-model="addForm.port" :min="1" :max="65535" controls-position="right" style="width: 160px" />
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
import { listDomains, addDomain, removeDomain, listNamespaces } from '@/api/cluster'

const DOMAIN_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?\.jakt\.online$/

export default {
  name: 'ClusterDomain',
  data() {
    return {
      loading: false,
      list: [],
      namespaceList: [],
      addOpen: false,
      addForm: {
        domain: '',
        namespace: 'tsk',
        service: '',
        port: 80
      },
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
        ]
      }
    }
  },
  created() {
    this.loadList()
    listNamespaces().then(res => {
      this.namespaceList = (res && res.data) || []
    }).catch(() => {
      this.namespaceList = ['tsk']
    })
  },
  methods: {
    loadList() {
      this.loading = true
      listDomains().then(res => {
        this.list = (res && res.data) || []
      }).finally(() => {
        this.loading = false
      })
    },
    openAdd() {
      this.addForm = { domain: '', namespace: 'tsk', service: '', port: 80 }
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
        const form = this.addForm
        if ((form.namespace && !form.service) || (!form.namespace && form.service)) {
          this.$message.warning('命名空间与 Service 需同时填写，或都留空（仅开公网入口）')
          return
        }
        addDomain({
          domain: form.domain,
          namespace: form.namespace || null,
          service: form.service || null,
          port: form.port || 80
        }).then(() => {
          this.$message.success('新增成功（首次访问需等待 Caddy 签发证书，约 10 秒）')
          this.addOpen = false
          this.loadList()
        })
      })
    },
    handleRemove(row) {
      this.$confirm('确认删除域名映射 ' + row.domain + ' ？将同时删除集群 Ingress（dm- 前缀）与公网 Caddy 配置。',
        '提示', { type: 'warning' }).then(() => {
        removeDomain(row.domain).then(() => {
          this.$message.success('已删除')
          this.loadList()
        })
      }).catch(() => {})
    }
  }
}
</script>
