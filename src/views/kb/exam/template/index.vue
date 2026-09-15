<template>
  <div class="app-container">
    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="el-icon-plus" size="mini" @click="handleAdd">新建模板</el-button>
      </el-col>
    </el-row>

    <el-table v-loading="loading" :data="list" border size="small">
      <el-table-column prop="name" label="模板名称" min-width="200" show-overflow-tooltip />
      <el-table-column label="范围" width="90" align="center">
        <template slot-scope="scope">
          <el-tag size="mini" :type="scope.row.scope === 'GLOBAL' ? 'danger' : 'info'" effect="plain">
            {{ scope.row.scope === 'GLOBAL' ? '全局' : '个人' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="questionCount" label="题量" width="70" align="center" />
      <el-table-column label="限时" width="90" align="center">
        <template slot-scope="scope">{{ scope.row.perQuestionSeconds }} 秒/题</template>
      </el-table-column>
      <el-table-column label="模式" width="90" align="center">
        <template slot-scope="scope">{{ scope.row.mode === 'REVIEW' ? '复习' : '新题' }}</template>
      </el-table-column>
      <el-table-column label="已做对是否排除" width="130" align="center">
        <template slot-scope="scope">{{ scope.row.excludeMastered === 1 ? '排除' : '不排除' }}</template>
      </el-table-column>
      <el-table-column prop="description" label="说明" min-width="160" show-overflow-tooltip />
      <el-table-column prop="updateTime" label="更新时间" width="170" align="center" />
      <el-table-column label="操作" width="200" align="center" fixed="right">
        <template slot-scope="scope">
          <el-button type="text" size="mini" @click="handleStart(scope.row)">用它开考</el-button>
          <el-button type="text" size="mini" @click="handleEdit(scope.row)">编辑</el-button>
          <el-button type="text" size="mini" class="exam-danger" @click="handleDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新增 / 编辑 -->
    <el-dialog :title="dialogTitle" :visible.sync="open" width="780px" append-to-body>
      <el-form ref="form" :model="form" :rules="rules" label-width="110px" size="small">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="模板名称" prop="name">
              <el-input v-model="form.name" placeholder="如：并发编程专项 20 题" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="范围">
              <el-select v-model="form.scope" style="width: 100%">
                <el-option label="个人" value="PERSONAL" />
                <el-option label="全局" value="GLOBAL" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="状态">
              <el-select v-model="form.status" style="width: 100%">
                <el-option label="已发布" value="PUBLISHED" />
                <el-option label="草稿" value="DRAFT" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="每题限时">
              <el-input-number v-model="form.perQuestionSeconds" :min="10" :max="600" :step="10" size="mini" /> 秒
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="模式">
              <el-select v-model="form.mode" style="width: 100%">
                <el-option label="只出新题" value="NORMAL" />
                <el-option label="复习（含做对过的）" value="REVIEW" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="排除已做对">
              <el-switch v-model="form.excludeMastered" :active-value="1" :inactive-value="0" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="说明">
          <el-input v-model="form.description" placeholder="可选" />
        </el-form-item>

        <el-form-item label="知识点范围">
          <el-table :data="form.rules" size="mini" border>
            <el-table-column label="分类" width="180">
              <template slot-scope="scope">
                <el-select
                  v-model="scope.row.category"
                  filterable
                  placeholder="选择分类"
                  style="width: 100%"
                  @change="scope.row.subtopic = undefined"
                >
                  <el-option
                    v-for="item in meta.categories"
                    :key="item.category"
                    :label="item.category + ' (' + item.total + ')'"
                    :value="item.category"
                  />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="知识点（可空=整个分类）" min-width="200">
              <template slot-scope="scope">
                <el-select v-model="scope.row.subtopic" filterable clearable placeholder="全部" style="width: 100%">
                  <el-option
                    v-for="item in subtopicsOf(scope.row.category)"
                    :key="item.subtopic"
                    :label="item.subtopic + ' (' + item.total + ')'"
                    :value="item.subtopic"
                  />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="题量" width="120">
              <template slot-scope="scope">
                <el-input-number v-model="scope.row.count" :min="1" :max="100" size="mini" controls-position="right" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="70" align="center">
              <template slot-scope="scope">
                <el-button type="text" size="mini" class="exam-danger" @click="form.rules.splice(scope.$index, 1)">删</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-button type="text" size="mini" icon="el-icon-plus" @click="addRule">添加知识点</el-button>
          <span class="template-total">合计 {{ totalCount }} 题</span>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="open = false">取 消</el-button>
        <el-button type="primary" @click="submitForm">确 定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { listExamTemplates, getExamTemplate, saveExamTemplate, deleteExamTemplate, getQuestionMeta } from '@/api/kb'

export default {
  name: 'KbExamTemplate',
  data() {
    return {
      loading: false,
      list: [],
      meta: { categories: [] },
      open: false,
      dialogTitle: '',
      form: this.emptyForm(),
      rules: {
        name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }]
      }
    }
  },
  computed: {
    totalCount() {
      return this.form.rules.reduce((sum, rule) => sum + (rule.count || 0), 0)
    }
  },
  created() {
    getQuestionMeta().then(res => {
      this.meta = (res && res.data) || { categories: [] }
    })
    this.getList()
  },
  methods: {
    emptyForm() {
      return {
        id: undefined,
        name: '',
        description: '',
        scope: 'PERSONAL',
        status: 'PUBLISHED',
        mode: 'NORMAL',
        perQuestionSeconds: 60,
        excludeMastered: 1,
        objectiveOnly: 1,
        rules: [{ category: undefined, subtopic: undefined, count: 5 }]
      }
    },
    subtopicsOf(category) {
      const item = this.meta.categories.find(node => node.category === category)
      return item ? item.subtopics : []
    },
    getList() {
      this.loading = true
      listExamTemplates().then(res => {
        this.list = (res && res.data) || []
      }).finally(() => {
        this.loading = false
      })
    },
    handleAdd() {
      this.form = this.emptyForm()
      this.dialogTitle = '新建试卷模板'
      this.open = true
    },
    handleEdit(row) {
      getExamTemplate(row.id).then(res => {
        const data = (res && res.data) || {}
        this.form = {
          id: data.id,
          name: data.name,
          description: data.description,
          scope: data.scope || 'PERSONAL',
          status: data.status || 'PUBLISHED',
          mode: data.mode || 'NORMAL',
          perQuestionSeconds: data.perQuestionSeconds || 60,
          excludeMastered: data.excludeMastered === 0 ? 0 : 1,
          objectiveOnly: data.objectiveOnly === 0 ? 0 : 1,
          rules: (data.rules || []).length ? data.rules : [{ category: undefined, subtopic: undefined, count: 5 }]
        }
        this.dialogTitle = '编辑试卷模板'
        this.open = true
      })
    },
    addRule() {
      this.form.rules.push({ category: undefined, subtopic: undefined, count: 5 })
    },
    submitForm() {
      this.$refs.form.validate(valid => {
        if (!valid) {
          return
        }
        const rules = this.form.rules.filter(rule => rule.category && rule.count > 0)
        if (!rules.length) {
          this.$modal.msgWarning('请至少配置一个知识点')
          return
        }
        saveExamTemplate({ ...this.form, rules: rules, questionCount: null }).then(() => {
          this.$modal.msgSuccess('保存成功')
          this.open = false
          this.getList()
        })
      })
    },
    handleDelete(row) {
      this.$modal.confirm('确认删除模板「' + row.name + '」？').then(() => {
        return deleteExamTemplate(row.id)
      }).then(() => {
        this.$modal.msgSuccess('删除成功')
        this.getList()
      }).catch(() => {})
    },
    handleStart(row) {
      this.$router.push({ path: '/exam/start', query: { templateId: row.id } })
    }
  }
}
</script>

<style scoped>
.exam-danger {
  color: #f56c6c;
}
.template-total {
  margin-left: 12px;
  font-size: 12px;
  color: #909399;
}
</style>
