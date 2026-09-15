<template>
  <div class="app-container kb-manage">
    <!-- 筛选条件 -->
    <el-form :inline="true" size="small" class="kb-manage__filter">
      <el-form-item label="关键词">
        <el-input
          v-model="query.keyword"
          placeholder="题干 / 正文"
          clearable
          style="width: 190px"
          @keyup.enter.native="handleQuery"
        />
      </el-form-item>
      <el-form-item label="分类">
        <el-select
          v-model="query.category"
          placeholder="全部"
          clearable
          filterable
          style="width: 170px"
          @change="handleCategoryChange"
        >
          <el-option
            v-for="item in meta.categories"
            :key="item.category"
            :label="item.category + ' (' + item.total + ')'"
            :value="item.category"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="知识点">
        <el-select v-model="query.subtopic" placeholder="全部" clearable filterable style="width: 190px">
          <el-option
            v-for="item in subtopicOptions"
            :key="item.subtopic"
            :label="item.subtopic + ' (' + item.total + ')'"
            :value="item.subtopic"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="题型">
        <el-select v-model="query.questionType" placeholder="全部" clearable style="width: 110px">
          <el-option v-for="item in typeOptions" :key="item" :label="item" :value="item" />
        </el-select>
      </el-form-item>
      <el-form-item label="难度">
        <el-select v-model="query.difficulty" placeholder="全部" clearable style="width: 110px">
          <el-option v-for="item in difficultyOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="el-icon-search" @click="handleQuery">查询</el-button>
        <el-button icon="el-icon-refresh" @click="resetQuery">重置</el-button>
        <el-button v-hasPermi="['kb:question:add']" type="success" icon="el-icon-plus" @click="handleAdd">新增题目</el-button>
      </el-form-item>
    </el-form>

    <!-- 题目列表 -->
    <el-table v-loading="loading" :data="list" border size="small">
      <el-table-column prop="id" label="ID" width="70" align="center" />
      <el-table-column prop="title" label="题干" min-width="320" show-overflow-tooltip />
      <el-table-column prop="category" label="分类" width="120" show-overflow-tooltip />
      <el-table-column prop="subtopic" label="知识点" width="130" show-overflow-tooltip />
      <el-table-column prop="questionType" label="题型" width="80" align="center" />
      <el-table-column prop="difficulty" label="难度" width="80" align="center" />
      <el-table-column prop="tags" label="标签" width="150" show-overflow-tooltip />
      <el-table-column prop="updateTime" label="更新时间" width="160" align="center" />
      <el-table-column label="操作" width="170" align="center" fixed="right">
        <template slot-scope="scope">
          <el-button type="text" size="mini" @click="openDetail(scope.row)">详情</el-button>
          <el-button v-hasPermi="['kb:question:edit']" type="text" size="mini" @click="handleEdit(scope.row)">编辑</el-button>
          <el-button v-hasPermi="['kb:question:remove']" type="text" size="mini" class="kb-manage__danger" @click="handleDelete(scope.row)">删除</el-button>
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

    <!-- 题目详情 -->
    <el-drawer :title="detail.title" :visible.sync="detailVisible" direction="rtl" size="52%" append-to-body>
      <div v-loading="detailLoading" class="kb-detail">
        <div class="kb-detail__meta">
          <el-tag v-if="detail.category" size="mini" effect="plain">{{ detail.category }}</el-tag>
          <el-tag v-if="detail.subtopic" size="mini" effect="plain">{{ detail.subtopic }}</el-tag>
          <el-tag v-if="detail.docType" size="mini" type="danger" effect="plain">{{ detail.docType }}</el-tag>
          <el-tag v-if="detail.difficulty" size="mini" type="warning" effect="plain">{{ detail.difficulty }}</el-tag>
          <el-tag v-for="tag in splitTags(detail.tags)" :key="tag" size="mini" type="success" effect="plain">{{ tag }}</el-tag>
        </div>
        <div v-if="detailOptions.length" class="kb-detail__options">
          <div
            v-for="opt in detailOptions"
            :key="opt.key"
            class="kb-detail__option"
            :class="{ 'is-answer': isAnswer(opt.key) }"
          >
            <b>{{ opt.key }}.</b> {{ opt.text }}
            <el-tag v-if="isAnswer(opt.key)" size="mini" type="success">正确</el-tag>
          </div>
        </div>
        <div v-if="detail.answer" class="kb-detail__answer">正确答案：<b>{{ detail.answer }}</b></div>
        <div class="kb-detail__content" v-html="detailHtml"></div>
      </div>
    </el-drawer>

    <!-- 新增 / 编辑 -->
    <el-dialog :title="dialogTitle" :visible.sync="open" width="860px" append-to-body>
      <el-form ref="form" :model="form" :rules="rules" label-width="90px" size="small">
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="题型" prop="questionType">
              <el-select v-model="form.questionType" style="width: 100%" @change="handleTypeChange">
                <el-option v-for="item in typeOptions" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="分类" prop="category">
              <el-select
                v-model="form.category"
                filterable
                allow-create
                default-first-option
                placeholder="选择或输入"
                style="width: 100%"
                @change="handleFormCategoryChange"
              >
                <el-option v-for="item in meta.categories" :key="item.category" :label="item.category" :value="item.category" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="知识点">
              <el-select
                v-model="form.subtopic"
                filterable
                allow-create
                default-first-option
                clearable
                placeholder="选择或输入"
                style="width: 100%"
              >
                <el-option
                  v-for="item in formSubtopicOptions"
                  :key="item.subtopic"
                  :label="item.subtopic"
                  :value="item.subtopic"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="题干" prop="title">
          <el-input v-model="form.title" type="textarea" :rows="2" placeholder="题目内容" />
        </el-form-item>

        <el-form-item v-if="form.questionType !== '解答'" label="选项">
          <div v-for="(opt, index) in form.options" :key="index" class="kb-manage__option">
            <el-tag size="mini" class="kb-manage__option-key">{{ opt.key }}</el-tag>
            <el-input v-model="opt.text" size="small" placeholder="选项内容" style="width: calc(100% - 120px)" />
            <el-button
              v-if="form.questionType !== '判断'"
              type="text"
              size="mini"
              class="kb-manage__danger"
              @click="removeOption(index)"
            >删除</el-button>
          </div>
          <el-button v-if="form.questionType !== '判断'" type="text" size="mini" icon="el-icon-plus" @click="addOption">添加选项</el-button>
        </el-form-item>

        <el-form-item label="答案" prop="answer">
          <el-radio-group v-if="form.questionType === '单选' || form.questionType === '判断'" v-model="form.answer">
            <el-radio v-for="opt in form.options" :key="opt.key" :label="opt.key">{{ opt.key }}</el-radio>
          </el-radio-group>
          <el-checkbox-group v-else-if="form.questionType === '多选'" v-model="answerList">
            <el-checkbox v-for="opt in form.options" :key="opt.key" :label="opt.key">{{ opt.key }}</el-checkbox>
          </el-checkbox-group>
          <el-input v-else v-model="form.answer" type="textarea" :rows="3" placeholder="参考答案（解答题不自动判分）" />
        </el-form-item>

        <el-form-item label="解析">
          <el-input v-model="form.explanation" type="textarea" :rows="4" placeholder="支持 Markdown" />
        </el-form-item>

        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="难度">
              <el-select v-model="form.difficulty" clearable placeholder="可不填" style="width: 100%">
                <el-option v-for="item in difficultyOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="标签">
              <el-input v-model="form.tags" placeholder="逗号分隔，如 并发编程,线程池" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="来源路径">
              <el-input v-model="form.sourcePath" placeholder="可选" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="cancel">取 消</el-button>
        <el-button type="primary" @click="submitForm">确 定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { marked } from 'marked'
import { pageQuestions, getQuestionMeta, getQuestionDetail, createQuestion, updateQuestion, deleteQuestion } from '@/api/kb'

const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

export default {
  name: 'KbQuestionManage',
  data() {
    return {
      loading: false,
      list: [],
      total: 0,
      query: {
        pageNum: 1,
        pageSize: 10,
        keyword: undefined,
        category: undefined,
        subtopic: undefined,
        questionType: undefined,
        difficulty: undefined
      },
      meta: { categories: [] },
      typeOptions: ['单选', '多选', '判断', '解答'],
      difficultyOptions: [
        { value: 'easy', label: '简单' },
        { value: 'medium', label: '中等' },
        { value: 'hard', label: '困难' }
      ],
      // 详情
      detailVisible: false,
      detailLoading: false,
      detail: {},
      detailHtml: '',
      detailOptions: [],
      // 新增/编辑
      open: false,
      dialogTitle: '',
      form: this.emptyForm(),
      rules: {
        questionType: [{ required: true, message: '请选择题型', trigger: 'change' }],
        category: [{ required: true, message: '请选择或输入分类', trigger: 'change' }],
        title: [{ required: true, message: '请输入题干', trigger: 'blur' }],
        answer: [{ validator: this.validateAnswer, trigger: 'change' }]
      }
    }
  },
  computed: {
    // 筛选：当前分类下的知识点
    subtopicOptions() {
      const current = this.meta.categories.find(item => item.category === this.query.category)
      return current ? current.subtopics : []
    },
    // 表单：当前分类下的知识点
    formSubtopicOptions() {
      const current = this.meta.categories.find(item => item.category === this.form.category)
      return current ? current.subtopics : []
    },
    // 多选答案：数组 ↔ 逗号字符串
    answerList: {
      get() {
        return this.form.answer ? this.form.answer.split(',').filter(Boolean) : []
      },
      set(value) {
        this.form.answer = (value || []).join(',')
      }
    }
  },
  created() {
    this.getMeta()
    this.getList()
  },
  methods: {
    emptyForm() {
      return {
        id: undefined,
        questionType: '单选',
        category: undefined,
        subtopic: undefined,
        title: '',
        content: '',
        options: [
          { key: 'A', text: '' },
          { key: 'B', text: '' }
        ],
        answer: '',
        explanation: '',
        difficulty: 'medium',
        tags: '',
        sourcePath: ''
      }
    },
    /** 知识点元数据（分类 / 子主题 / 题量） */
    getMeta() {
      getQuestionMeta().then(res => {
        this.meta = (res && res.data) || { categories: [] }
      })
    },
    /** 题目分页 */
    getList() {
      this.loading = true
      pageQuestions(this.query).then(res => {
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
      this.query = {
        pageNum: 1,
        pageSize: 10,
        keyword: undefined,
        category: undefined,
        subtopic: undefined,
        questionType: undefined,
        difficulty: undefined
      }
      this.getList()
    },
    handleCategoryChange() {
      this.query.subtopic = undefined
    },
    handleFormCategoryChange() {
      this.form.subtopic = undefined
    },
    /** 题型切换：判断题固定两个选项 */
    handleTypeChange(type) {
      if (type === '判断') {
        this.form.options = [
          { key: 'A', text: '正确' },
          { key: 'B', text: '错误' }
        ]
      } else if (type === '解答') {
        this.form.options = []
      } else if (!this.form.options || !this.form.options.length) {
        this.form.options = [
          { key: 'A', text: '' },
          { key: 'B', text: '' }
        ]
      }
      this.form.answer = ''
    },
    addOption() {
      const key = OPTION_KEYS[this.form.options.length] || String(this.form.options.length + 1)
      this.form.options.push({ key: key, text: '' })
    },
    removeOption(index) {
      this.form.options.splice(index, 1)
      this.form.options.forEach((opt, idx) => {
        opt.key = OPTION_KEYS[idx] || String(idx + 1)
      })
      this.form.answer = ''
    },
    /** 答案校验：客观题必填 */
    validateAnswer(rule, value, callback) {
      if (this.form.questionType === '解答') {
        callback()
        return
      }
      if (!value) {
        callback(new Error('请选择正确答案'))
        return
      }
      callback()
    },
    handleAdd() {
      this.form = this.emptyForm()
      this.open = true
      this.dialogTitle = '新增题目'
      this.$nextTick(() => {
        this.$refs.form && this.$refs.form.clearValidate()
      })
    },
    /** 编辑：列表不含答案，先拉详情再回填 */
    handleEdit(row) {
      getQuestionDetail(row.id).then(res => {
        const data = (res && res.data) || {}
        const form = this.emptyForm()
        form.id = data.id
        form.questionType = data.docType || '单选'
        form.category = data.category
        form.subtopic = data.subtopic
        form.title = data.title
        form.content = data.content
        form.answer = data.answer
        form.explanation = data.explanation
        form.difficulty = data.difficulty
        form.tags = data.tags
        form.sourcePath = data.sourcePath
        try {
          form.options = data.options ? JSON.parse(data.options) : []
        } catch (e) {
          form.options = []
        }
        if (form.questionType !== '解答' && !form.options.length) {
          form.options = [{ key: 'A', text: '' }, { key: 'B', text: '' }]
        }
        this.form = form
        this.open = true
        this.dialogTitle = '修改题目'
      })
    },
    submitForm() {
      this.$refs.form.validate(valid => {
        if (!valid) {
          return
        }
        const payload = { ...this.form }
        payload.options = this.form.questionType === '解答' ? null : JSON.stringify(this.form.options)
        const request = payload.id ? updateQuestion(payload.id, payload) : createQuestion(payload)
        request.then(() => {
          this.$modal.msgSuccess(payload.id ? '修改成功' : '新增成功')
          this.open = false
          this.getList()
          this.getMeta()
        })
      })
    },
    cancel() {
      this.open = false
    },
    handleDelete(row) {
      this.$modal.confirm('确认删除题目「' + row.title + '」？删除后不可恢复。').then(() => {
        return deleteQuestion(row.id)
      }).then(() => {
        this.$modal.msgSuccess('删除成功')
        this.getList()
        this.getMeta()
      }).catch(() => {})
    },
    openDetail(row) {
      this.detailVisible = true
      this.detailLoading = true
      this.detail = { title: row.title }
      this.detailHtml = ''
      this.detailOptions = []
      getQuestionDetail(row.id).then(res => {
        this.detail = (res && res.data) || {}
        this.detailHtml = marked.parse(this.detail.content || '')
        try {
          this.detailOptions = this.detail.options ? JSON.parse(this.detail.options) : []
        } catch (e) {
          this.detailOptions = []
        }
      }).finally(() => {
        this.detailLoading = false
      })
    },
    splitTags(tags) {
      return tags ? tags.split(',').filter(Boolean) : []
    },
    isAnswer(key) {
      const answer = this.detail.answer || ''
      return answer.split(',').map(item => item.trim()).indexOf(key) >= 0
    }
  }
}
</script>

<style scoped>
.kb-manage__filter {
  margin-bottom: 4px;
}
.kb-manage__danger {
  color: #f56c6c;
}
.kb-manage__option {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
}
.kb-manage__option-key {
  margin-right: 8px;
  width: 24px;
  text-align: center;
}
.kb-detail {
  padding: 0 20px 20px;
}
.kb-detail__meta .el-tag {
  margin-right: 6px;
}
.kb-detail__options {
  margin-top: 14px;
}
.kb-detail__option {
  padding: 8px 10px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  margin-bottom: 8px;
  font-size: 13px;
  line-height: 1.6;
}
.kb-detail__option.is-answer {
  border-color: #67c23a;
  background: #f0f9eb;
}
.kb-detail__answer {
  margin-top: 10px;
  font-size: 13px;
}
.kb-detail__content {
  margin-top: 16px;
  font-size: 14px;
  line-height: 1.75;
  word-break: break-word;
}
</style>
