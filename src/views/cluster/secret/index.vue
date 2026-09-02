<template>
  <div class="app-container">
    <el-alert
      title="密钥以集群为准（实时读取）：只展示键名，值仅支持填写覆盖、永不回显；不支持删除，避免误删影响业务。"
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom: 14px"
    />

    <!-- 查询条件 -->
    <el-form :model="queryParams" ref="queryForm" size="small" :inline="true" label-width="70px">
      <el-form-item label="命名空间">
        <el-select v-model="queryParams.namespace" placeholder="请选择" clearable style="width: 140px">
          <el-option v-for="ns in namespaceList" :key="ns" :label="ns" :value="ns" />
        </el-select>
      </el-form-item>
      <el-form-item label="名称">
        <el-input v-model="queryParams.keyword" placeholder="Secret 名称关键字" clearable style="width: 200px"
                  @keyup.enter.native="handleQuery" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="el-icon-search" size="mini" @click="handleQuery">搜索</el-button>
        <el-button icon="el-icon-refresh" size="mini" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="el-icon-plus" size="mini" @click="openEdit(null)">新增密钥</el-button>
      </el-col>
      <right-toolbar :showSearch.sync="showSearch" @queryTable="getList" />
    </el-row>

    <el-table v-loading="loading" :data="secretList">
      <el-table-column label="名称" prop="name" min-width="180" />
      <el-table-column label="命名空间" prop="namespace" width="100" />
      <el-table-column label="类型" prop="type" min-width="160" />
      <el-table-column label="纳管" width="90" align="center">
        <template slot-scope="scope">
          <el-tag v-if="scope.row.managed" size="mini" type="success">managed</el-tag>
          <el-tag v-else size="mini" type="info">未纳管</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="键名" min-width="240">
        <template slot-scope="scope">
          <el-tag v-for="k in scope.row.keys" :key="k" size="mini" style="margin-right: 4px">{{ k }}</el-tag>
          <span v-if="!scope.row.keys || scope.row.keys.length === 0">-</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" align="center" fixed="right">
        <template slot-scope="scope">
          <el-button size="mini" type="info" icon="el-icon-view" @click="handleView(scope.row)">查看</el-button>
          <el-button size="mini" type="warning" icon="el-icon-edit" @click="openEdit(scope.row)">编辑</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" :page.sync="queryParams.pageNum"
                :limit.sync="queryParams.pageSize" @pagination="getList" />

    <!-- 查看弹窗（键名 + 掩码值，值不可见） -->
    <el-dialog :title="'密钥 - ' + viewData.name" :visible.sync="viewOpen" width="640px" append-to-body>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="名称">{{ viewData.name }}</el-descriptions-item>
        <el-descriptions-item label="命名空间">{{ viewData.namespace }}</el-descriptions-item>
        <el-descriptions-item label="类型" :span="2">{{ viewData.type }}</el-descriptions-item>
        <el-descriptions-item label="纳管" :span="2">
          {{ viewData.managed ? '是（aiplatform-managed）' : '否' }}
        </el-descriptions-item>
      </el-descriptions>
      <el-table :data="viewKeys" size="small" style="margin-top: 12px" border>
        <el-table-column label="键名" prop="key" min-width="160" />
        <el-table-column label="值" width="120">
          <template slot-scope="scope">
            <span v-if="scope.row.masked">{{ scope.row.value }}</span>
            <span v-else style="color: #909399">（无值）</span>
          </template>
        </el-table-column>
      </el-table>
      <div slot="footer">
        <el-button @click="viewOpen = false">关 闭</el-button>
      </div>
    </el-dialog>

    <!-- 新增/编辑弹窗（值只写不回显） -->
    <el-dialog :title="editTitle" :visible.sync="editOpen" width="720px" append-to-body>
      <el-form ref="editForm" :model="editForm" label-width="90px">
        <el-row>
          <el-col :span="12">
            <el-form-item label="命名空间" prop="namespace">
              <el-select v-model="editForm.namespace" :disabled="!!editForm.name" style="width: 100%">
                <el-option v-for="ns in namespaceList" :key="ns" :label="ns" :value="ns" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Secret 名" prop="name">
              <el-input v-model="editForm.name" :disabled="!!editForm.name"
                        placeholder="小写，如 mysql-secret" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item v-if="!editForm.name" label="类型">
          <el-input v-model="editForm.type" placeholder="Opaque（默认）" style="width: 240px" />
        </el-form-item>
        <el-divider content-position="left">键值（已有键值不回显，填写即覆盖；新增键直接填写）</el-divider>
        <div v-for="(row, index) in editForm.keys" :key="index" class="key-row">
          <el-input v-model="row.key" :disabled="row.existing" placeholder="键名"
                    style="width: 230px; margin-right: 8px" />
          <el-input v-model="row.value" type="password" show-password
                    :placeholder="row.existing ? '输入新值覆盖（不填则不修改）' : '值'"
                    style="width: 320px; margin-right: 8px" />
          <el-button v-if="!row.existing" type="danger" plain icon="el-icon-delete" size="mini"
                     @click="removeKeyRow(index)" />
        </div>
        <el-button type="primary" plain icon="el-icon-plus" size="mini" @click="addKeyRow">添加键值</el-button>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" @click="submitForm">保 存</el-button>
        <el-button @click="editOpen = false">取 消</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { pageClusterSecrets, getClusterSecret, upsertClusterSecret, listNamespaces } from '@/api/cluster'

const NAME_PATTERN = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/

export default {
  name: 'ClusterSecret',
  data() {
    return {
      loading: false,
      showSearch: true,
      secretList: [],
      total: 0,
      namespaceList: [],
      queryParams: {
        pageNum: 1,
        pageSize: 10,
        namespace: 'tsk',
        keyword: undefined
      },
      viewOpen: false,
      viewData: {},
      viewKeys: [],
      editOpen: false,
      editTitle: '',
      editForm: {
        namespace: 'tsk',
        name: '',
        type: 'Opaque',
        keys: []
      }
    }
  },
  created() {
    listNamespaces().then(res => {
      this.namespaceList = (res && res.data) || []
      if (this.namespaceList.length && !this.namespaceList.includes(this.queryParams.namespace)) {
        this.queryParams.namespace = this.namespaceList[0]
      }
      this.getList()
    }).catch(() => {
      this.getList()
    })
  },
  methods: {
    getList() {
      this.loading = true
      pageClusterSecrets(this.queryParams).then(res => {
        this.secretList = (res.data && res.data.dataList) || []
        this.total = (res.data && res.data.total) || 0
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
      this.queryParams = {
        pageNum: 1,
        pageSize: 10,
        namespace: 'tsk',
        keyword: undefined
      }
      this.handleQuery()
    },
    handleView(row) {
      getClusterSecret(row.namespace, row.name).then(res => {
        const data = res.data || {}
        this.viewData = data
        this.viewKeys = (data.keys || []).map(key => ({ key, value: '********', masked: true }))
        this.viewOpen = true
      })
    },
    openEdit(row) {
      this.editForm = {
        namespace: (row && row.namespace) || this.queryParams.namespace || 'tsk',
        name: (row && row.name) || '',
        type: (row && row.type) || 'Opaque',
        keys: []
      }
      this.editTitle = row ? '编辑密钥 - ' + row.name : '新增密钥'
      if (row) {
        getClusterSecret(row.namespace, row.name).then(res => {
          const data = res.data || {}
          this.editForm.keys = (data.keys || []).map(key => ({ key, value: '', existing: true }))
          this.editOpen = true
        })
      } else {
        this.editForm.keys = [{ key: '', value: '', existing: false }]
        this.editOpen = true
      }
    },
    addKeyRow() {
      this.editForm.keys.push({ key: '', value: '', existing: false })
    },
    removeKeyRow(index) {
      this.editForm.keys.splice(index, 1)
    },
    submitForm() {
      const f = this.editForm
      if (!NAME_PATTERN.test(f.namespace)) {
        this.$modal.msgError('命名空间格式不合法')
        return
      }
      if (!f.name || !NAME_PATTERN.test(f.name)) {
        this.$modal.msgError('Secret 名称必须为小写字母/数字/中划线（DNS-1123）')
        return
      }
      const items = []
      const seen = new Set()
      for (const row of f.keys) {
        if (!row.key) continue
        if (!/^[A-Za-z0-9._-]+$/.test(row.key) || row.key.startsWith('.') || row.key.endsWith('.')) {
          this.$modal.msgError('键名不合法: ' + row.key)
          return
        }
        if (seen.has(row.key)) {
          this.$modal.msgError('重复的键名: ' + row.key)
          return
        }
        // 已有键不填值 = 不改；新键必须填值
        if (row.existing && !row.value) continue
        if (!row.value) {
          this.$modal.msgError('键 ' + row.key + ' 的值不能为空')
          return
        }
        seen.add(row.key)
        items.push({ key: row.key, value: row.value })
      }
      if (!items.length) {
        this.$modal.msgError('至少填写一个需要新增/覆盖的键值')
        return
      }
      upsertClusterSecret({
        namespace: f.namespace,
        name: f.name,
        type: f.type || 'Opaque',
        keys: items
      }).then(() => {
        this.$modal.msgSuccess('保存成功，已同步集群')
        this.editOpen = false
        this.getList()
      }).catch(err => {
        this.$modal.msgError((err && err.message) || '保存失败')
      })
    }
  }
}
</script>

<style scoped>
.key-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}
</style>
