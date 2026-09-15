<template>
  <div class="app-container cdc-sync">
    <el-alert
      title="这里管理 canal CDC 的 ES 同步映射（对应 cdc 命名空间下 canal-adapter-es8-mapping 这个 ConfigMap，一条映射 = 一个 yml）。增量同步由 canal 读 MySQL binlog 自动完成；改配置后需要重启适配器才生效，存量数据用「全量导入」补。"
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom: 14px"
    />

    <div class="cdc-sync__status">
      <span>
        <b>适配器</b>
        <el-tag v-if="status.readyReplicas > 0" size="mini" type="success">就绪 {{ status.readyReplicas }}/{{ status.replicas }}</el-tag>
        <el-tag v-else size="mini" type="danger">未就绪 {{ status.readyReplicas || 0 }}/{{ status.replicas || 0 }}</el-tag>
      </span>
      <span style="margin-left: 18px">
        <b>canal 实例</b>
        <el-tag size="mini" :type="status.destinations && status.destinations.indexOf('on') >= 0 ? 'success' : 'info'">
          {{ status.destinations || '-' }}
        </el-tag>
      </span>
    </div>

    <el-form :inline="true" size="small" style="margin-top: 12px">
      <el-form-item>
        <el-button icon="el-icon-refresh" size="mini" :disabled="busy" @click="loadAll">刷新</el-button>
        <el-button type="primary" plain icon="el-icon-plus" size="mini" @click="openAdd">新建映射</el-button>
        <el-button icon="el-icon-refresh-right" size="mini" :disabled="busy" @click="handleRestart">重启适配器</el-button>
        <span v-if="busy" style="margin-left: 10px; color: #E6A23C; font-size: 12px">
          <i class="el-icon-loading" /> 正在执行，请稍候…
        </span>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="list" border>
      <el-table-column label="任务名" min-width="150">
        <template slot-scope="scope">
          <span>{{ scope.row.name }}</span>
          <el-tag size="mini" style="margin-left: 6px">{{ scope.row.esIndex }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="来源表" prop="tableName" width="170" show-overflow-tooltip />
      <el-table-column label="主键" prop="pk" width="90" align="center" />
      <el-table-column label="映射 SQL" min-width="280" show-overflow-tooltip>
        <template slot-scope="scope">
          <span style="font-family: Menlo, Consolas, monospace; font-size: 12px">{{ scope.row.sql }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="230" align="center" fixed="right">
        <template slot-scope="scope">
          <el-button v-hasPermi="['cdc:sync:edit']" type="text" size="mini" @click="openEdit(scope.row)">编辑</el-button>
          <el-button v-hasPermi="['cdc:sync:edit']" type="text" size="mini" :disabled="busy" @click="handleEtl(scope.row)">全量导入</el-button>
          <el-button v-hasPermi="['cdc:sync:edit']" type="text" size="mini" style="color: #F56C6C" @click="handleDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog :title="editing ? '编辑同步映射' : '新建同步映射'" :visible.sync="open" width="880px" append-to-body>
      <el-alert type="warning" :closable="false" show-icon style="margin-bottom: 12px">
        <template slot="title">
          <div style="line-height: 20px">
            <b>创建四步：</b>
            ① ES 里先把目标索引建好（canal 不会自动建索引）；
            ② SQL 必须写成 <code>select 别名.列 as 列 from 表 别名</code>（缺表别名时 canal 增量 UPDATE 会空指针，
            这张表后续所有变更都会卡住）；
            ③ 保存并重启适配器让配置生效；
            ④ 用「全量导入」把存量数据补进 ES。
          </div>
        </template>
      </el-alert>

      <el-form ref="form" :model="form" :rules="rules" label-width="110px">
        <el-form-item label="任务名" prop="name">
          <el-input v-model="form.name" :disabled="editing" placeholder="例如 kb_question（小写字母/数字/下划线）" style="width: 320px" />
          <span class="cdc-sync__hint">会作为 ConfigMap 的 key 和任务名，保存后不建议改名</span>
        </el-form-item>
        <el-form-item label="目标索引" prop="esIndex">
          <el-select v-model="form.esIndex" filterable allow-create default-first-option placeholder="选择或输入 ES 索引名" style="width: 320px">
            <el-option v-for="item in esIndices" :key="item" :label="item" :value="item" />
          </el-select>
          <span class="cdc-sync__hint">下拉是 ES 里现有的业务索引；索引不存在会被预检拦下来</span>
        </el-form-item>
        <el-form-item label="主键字段" prop="pk">
          <el-input v-model="form.pk" style="width: 200px" />
          <span class="cdc-sync__hint">决定 ES 文档 _id，通常就是 id</span>
        </el-form-item>
        <el-form-item label="不存在则插入">
          <el-switch v-model="form.upsert" />
          <span class="cdc-sync__hint">upsert：ES 里没有这条就插入，建议开启</span>
        </el-form-item>
        <el-form-item label="批量条数">
          <el-input-number v-model="form.commitBatch" :min="1" :max="10000" :step="100" controls-position="right" />
          <span class="cdc-sync__hint">commitBatch：canal 攒够多少条提交一次</span>
        </el-form-item>
        <el-form-item label="映射 SQL" prop="sql">
          <el-input v-model="form.sql" type="textarea" :rows="6" placeholder="select a.id as id, a.title as title from kb_question a" />
          <div style="margin-top: 6px">
            <el-button icon="el-icon-magic-stick" size="mini" @click="handleFormat">格式化 SQL（自动补表别名）</el-button>
            <el-button icon="el-icon-view" size="mini" :disabled="busy" @click="handlePreview">预检</el-button>
            <span class="cdc-sync__hint">只想同步部分字段，就只保留需要的列</span>
          </div>
        </el-form-item>
      </el-form>

      <div v-if="preview">
        <div class="cdc-sync__section">预检结果</div>
        <ul class="cdc-sync__checks">
          <li v-for="(check, index) in preview.checks" :key="index">
            <i :class="iconOf(check)" :style="{ color: colorOf(check) }" />
            <b>{{ check.item }}</b>
            <span>{{ check.message }}</span>
          </li>
        </ul>
        <div class="cdc-sync__section">将写入的配置（yml）</div>
        <pre class="cdc-sync__yml">{{ preview.yml }}</pre>
      </div>

      <div slot="footer" class="dialog-footer">
        <el-button @click="open = false">取消</el-button>
        <el-button :loading="saving" @click="handleSave(false)">仅保存</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave(true)">保存并重启适配器</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import {
  listMappings,
  getMapping,
  previewMapping,
  saveMapping,
  deleteMapping,
  formatMappingSql,
  triggerEtl,
  restartAdapter,
  getSyncStatus,
  listEsIndices
} from '@/api/cdc'

export default {
  name: 'CdcSync',
  data() {
    return {
      loading: false,
      busy: false,
      saving: false,
      list: [],
      status: {},
      esIndices: [],
      open: false,
      editing: false,
      preview: null,
      form: {
        name: '',
        esIndex: '',
        pk: 'id',
        upsert: true,
        commitBatch: 3000,
        sql: ''
      },
      rules: {
        name: [{ required: true, message: '任务名不能为空', trigger: 'blur' }],
        esIndex: [{ required: true, message: '目标索引不能为空', trigger: 'change' }],
        pk: [{ required: true, message: '主键字段不能为空', trigger: 'blur' }],
        sql: [{ required: true, message: '映射 SQL 不能为空', trigger: 'blur' }]
      }
    }
  },
  created() {
    this.loadAll()
  },
  methods: {
    // 加载列表 + 状态 + 索引
    loadAll() {
      this.loadList()
      this.loadStatus()
      listEsIndices()
        .then(res => {
          this.esIndices = (res && res.data) || []
        })
        .catch(() => {
          this.esIndices = []
        })
    },
    // 映射列表
    loadList() {
      this.loading = true
      listMappings()
        .then(res => {
          this.list = (res && res.data) || []
        })
        .finally(() => {
          this.loading = false
        })
    },
    // 运行状态
    loadStatus() {
      getSyncStatus()
        .then(res => {
          this.status = (res && res.data) || {}
        })
        .catch(() => {
          this.status = {}
        })
    },
    // 新建
    openAdd() {
      this.editing = false
      this.preview = null
      this.form = {
        name: '',
        esIndex: this.esIndices.length ? this.esIndices[0] : '',
        pk: 'id',
        upsert: true,
        commitBatch: 3000,
        sql: ''
      }
      this.open = true
      this.$nextTick(() => {
        if (this.$refs.form) {
          this.$refs.form.clearValidate()
        }
      })
    },
    // 编辑
    openEdit(row) {
      this.editing = true
      this.preview = null
      getMapping(row.name).then(res => {
        const data = (res && res.data) || {}
        this.form = {
          name: data.name || row.name,
          esIndex: data.esIndex || row.esIndex,
          pk: data.pk || 'id',
          upsert: data.upsert !== false,
          commitBatch: data.commitBatch || 3000,
          sql: data.sql || ''
        }
        this.open = true
        this.$nextTick(() => {
          if (this.$refs.form) {
            this.$refs.form.clearValidate()
          }
        })
        this.handlePreview()
      })
    },
    // SQL 格式化
    handleFormat() {
      if (!this.form.sql) {
        this.$modal.msgWarning('请先填写 SQL')
        return
      }
      formatMappingSql(this.form.sql).then(res => {
        this.form.sql = (res && res.data) || this.form.sql
        this.preview = null
        this.$modal.msgSuccess('已格式化：补齐表别名与列限定名')
      })
    },
    // 预检
    handlePreview() {
      if (!this.form.sql || !this.form.name || !this.form.esIndex) {
        this.$modal.msgWarning('任务名、目标索引、映射 SQL 都填好后再预检')
        return Promise.resolve()
      }
      return previewMapping(this.form).then(res => {
        this.preview = (res && res.data) || null
      })
    },
    // 保存
    handleSave(restart) {
      this.$refs.form.validate(valid => {
        if (!valid) {
          return
        }
        const payload = Object.assign({}, this.form, { restart: restart })
        this.saving = true
        this.busy = true
        saveMapping(payload)
          .then(() => {
            this.open = false
            this.$modal.msgSuccess(restart ? '已保存并重启适配器（约 20 秒后生效）' : '已保存，记得重启适配器才会生效')
            setTimeout(this.loadAll, restart ? 5000 : 500)
          })
          .finally(() => {
            this.saving = false
            this.busy = false
          })
      })
    },
    // 删除映射
    handleDelete(row) {
      this.$modal
        .confirm('确认删除映射「' + row.name + '」？删除后该表不再同步到 ES，已同步的数据保留。')
        .then(() => {
          this.busy = true
          deleteMapping({ name: row.name, restart: true })
            .then(() => {
              this.$modal.msgSuccess('已删除并重启适配器')
              setTimeout(this.loadAll, 5000)
            })
            .finally(() => {
              this.busy = false
            })
        })
        .catch(() => {})
    },
    // 全量导入
    handleEtl(row) {
      this.$modal
        .confirm('对「' + row.name + '」执行一次全量导入？会把 MySQL 现有数据整体写进 ES，数据量大时耗时较长。')
        .then(() => {
          this.busy = true
          triggerEtl(row.name)
            .then(res => {
              const data = (res && res.data) || ''
              this.$modal.msgSuccess('全量导入完成：' + data)
            })
            .finally(() => {
              this.busy = false
            })
        })
        .catch(() => {})
    },
    // 重启适配器
    handleRestart() {
      this.$modal.confirm('重启 canal-adapter？约 20 秒后配置生效，期间同步会短暂中断。').then(() => {
        this.busy = true
        restartAdapter()
          .then(() => {
            this.$modal.msgSuccess('已触发滚动重启')
            setTimeout(this.loadStatus, 6000)
          })
          .finally(() => {
            this.busy = false
          })
      }).catch(() => {})
    },
    // 校验项图标
    iconOf(check) {
      if (check.level === 'ERROR') {
        return check.pass ? 'el-icon-success' : 'el-icon-error'
      }
      if (check.level === 'WARN') {
        return check.pass ? 'el-icon-success' : 'el-icon-warning'
      }
      return 'el-icon-info'
    },
    // 校验项颜色
    colorOf(check) {
      if (check.level === 'ERROR') {
        return check.pass ? '#67C23A' : '#F56C6C'
      }
      if (check.level === 'WARN') {
        return check.pass ? '#67C23A' : '#E6A23C'
      }
      return '#909399'
    }
  }
}
</script>

<style scoped>
.cdc-sync__status {
  font-size: 13px;
  color: #606266;
  background: #f5f7fa;
  border-radius: 4px;
  padding: 8px 12px;
}

.cdc-sync__hint {
  margin-left: 10px;
  color: #909399;
  font-size: 12px;
}

.cdc-sync__section {
  margin: 12px 0 6px;
  font-weight: 600;
  color: #303133;
}

.cdc-sync__checks {
  margin: 0;
  padding-left: 4px;
  list-style: none;
  font-size: 13px;
  line-height: 22px;
}

.cdc-sync__checks li {
  margin-bottom: 4px;
}

.cdc-sync__checks b {
  margin: 0 6px 0 4px;
}

.cdc-sync__yml {
  background: #282c34;
  color: #abb2bf;
  padding: 10px 12px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 18px;
  max-height: 240px;
  overflow: auto;
  white-space: pre-wrap;
}
</style>
