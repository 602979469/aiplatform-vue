<template>
  <div class="app-container exam">
    <!-- ============ 1. 组卷配置 ============ -->
    <div v-if="stage === 'CONFIG'" class="exam-config">
      <div class="panel">
        <div class="panel-header">
          <span>组卷配置</span>
          <span class="panel-tip">按知识点抽题，默认排除你已经做对的题</span>
        </div>

        <el-form :inline="true" size="small" class="exam-config__template">
          <el-form-item label="使用模板">
            <el-select
              v-model="selectedTemplateId"
              placeholder="不选则临时选题"
              clearable
              filterable
              style="width: 280px"
              @change="onTemplateChange"
            >
              <el-option
                v-for="item in templates"
                :key="item.id"
                :label="item.name + '（' + item.questionCount + ' 题）'"
                :value="item.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="text" icon="el-icon-setting" @click="$router.push('/exam/template')">管理模板</el-button>
          </el-form-item>
        </el-form>

        <el-table :data="rules" size="small" border>
          <el-table-column label="分类" width="200">
            <template slot-scope="scope">
              <el-select
                v-model="scope.row.category"
                placeholder="选择分类"
                filterable
                style="width: 100%"
                @change="onRuleCategoryChange(scope.row)"
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
          <el-table-column label="知识点（可不选=整个分类）" min-width="220">
            <template slot-scope="scope">
              <el-select v-model="scope.row.subtopic" placeholder="全部知识点" filterable clearable style="width: 100%">
                <el-option
                  v-for="item in subtopicsOf(scope.row.category)"
                  :key="item.subtopic"
                  :label="item.subtopic + ' (' + item.total + ')'"
                  :value="item.subtopic"
                />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="题量" width="140">
            <template slot-scope="scope">
              <el-input-number v-model="scope.row.count" :min="1" :max="100" size="mini" controls-position="right" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="80" align="center">
            <template slot-scope="scope">
              <el-button type="text" size="mini" class="exam-danger" @click="removeRule(scope.$index)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-button type="text" icon="el-icon-plus" size="mini" @click="addRule">添加知识点</el-button>

        <el-form :inline="true" size="small" class="exam-config__form">
          <el-form-item label="每题限时">
            <el-input-number v-model="form.perQuestionSeconds" :min="10" :max="600" :step="10" size="mini" /> 秒
          </el-form-item>
          <el-form-item label="模式">
            <el-radio-group v-model="form.mode">
              <el-radio label="NORMAL">只出新题</el-radio>
              <el-radio label="REVIEW">复习（含做对过的题）</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="试卷标题">
            <el-input v-model="form.title" placeholder="不填自动生成" style="width: 220px" />
          </el-form-item>
        </el-form>

        <div class="exam-config__summary">
          共 <b>{{ totalCount }}</b> 题 · 预计 <b>{{ Math.ceil(totalCount * form.perQuestionSeconds / 60) }}</b> 分钟
          <el-button type="text" size="small" icon="el-icon-collection-tag" @click="saveAsTemplate">存为模板</el-button>
          <el-button type="primary" icon="el-icon-video-play" :loading="starting" @click="startExam">开始考试</el-button>
        </div>
      </div>
    </div>

    <!-- ============ 2. 答题 ============ -->
    <div v-else-if="stage === 'EXAM'" class="exam-taking">
      <div class="exam-taking__main">
        <div class="exam-taking__bar">
          <span>第 <b>{{ currentIndex + 1 }}</b> / {{ paper.questions.length }} 题</span>
          <span :class="['exam-timer', remaining <= 60 ? 'is-urgent' : '']">
            <i class="el-icon-alarm-clock" /> {{ formatDuration(remaining) }}
          </span>
          <el-button type="text" size="mini" @click="handleSubmit()">交卷</el-button>
        </div>
        <el-progress :percentage="progressPercent" :show-text="false" :stroke-width="4" />

        <div class="exam-question">
          <div class="exam-question__meta">
            <el-tag size="mini" effect="plain">{{ current.category }}</el-tag>
            <el-tag v-if="current.subtopic" size="mini" effect="plain">{{ current.subtopic }}</el-tag>
            <el-tag size="mini" type="danger" effect="plain">{{ current.questionType }}</el-tag>
          </div>
          <div class="exam-question__title">{{ current.title }}</div>

          <div v-if="currentOptions.length" class="exam-question__options">
            <div
              v-for="opt in currentOptions"
              :key="opt.key"
              class="exam-option"
              :class="{ 'is-selected': isSelected(opt.key) }"
              @click="toggleOption(opt.key)"
            >
              <span class="exam-option__key">{{ opt.key }}</span>
              <span class="exam-option__text">{{ opt.text }}</span>
            </div>
          </div>
          <el-input
            v-else
            v-model="answers[current.seq]"
            type="textarea"
            :rows="5"
            placeholder="这是一道解答题：写下你的思路，交卷后可对照参考答案自评"
          />

          <div class="exam-question__actions">
            <el-button size="small" :disabled="currentIndex === 0" @click="goTo(currentIndex - 1)">上一题</el-button>
            <el-button
              size="small"
              type="primary"
              :disabled="currentIndex >= paper.questions.length - 1"
              @click="goTo(currentIndex + 1)"
            >下一题</el-button>
          </div>
        </div>
      </div>

      <div class="exam-taking__side">
        <div class="exam-card">
          <div class="exam-card__title">答题卡</div>
          <div class="exam-card__grid">
            <span
              v-for="(q, index) in paper.questions"
              :key="q.seq"
              class="exam-card__item"
              :class="{ 'is-done': isAnswered(q.seq), 'is-current': index === currentIndex }"
              @click="goTo(index)"
            >{{ index + 1 }}</span>
          </div>
          <div class="exam-card__legend">
            已答 {{ answeredCount }} / {{ paper.questions.length }}
          </div>
          <el-button type="danger" size="small" style="width: 100%" @click="handleSubmit()">交卷</el-button>
        </div>
      </div>

      <!-- 手机端底部操作条 -->
      <div class="exam-mobile-bar">
        <div class="exam-mobile-bar__item" @click="cardVisible = true">
          <i class="el-icon-tickets" />
          <span>答题卡 {{ answeredCount }}/{{ paper.questions.length }}</span>
        </div>
        <div
          class="exam-mobile-bar__item"
          :class="{ 'is-disabled': currentIndex === 0 }"
          @click="goTo(currentIndex - 1)"
        >
          <i class="el-icon-arrow-left" />
          <span>上一题</span>
        </div>
        <div
          class="exam-mobile-bar__item"
          :class="{ 'is-disabled': currentIndex >= paper.questions.length - 1 }"
          @click="goTo(currentIndex + 1)"
        >
          <i class="el-icon-arrow-right" />
          <span>下一题</span>
        </div>
        <div class="exam-mobile-bar__item is-submit" @click="handleSubmit()">
          <i class="el-icon-upload" />
          <span>交卷</span>
        </div>
      </div>

      <!-- 手机端答题卡（底部弹出） -->
      <el-drawer
        title="答题卡"
        :visible.sync="cardVisible"
        direction="btt"
        size="55%"
        append-to-body
      >
        <div class="exam-sheet">
          <div class="exam-card__grid exam-card__grid--sheet">
            <span
              v-for="(q, index) in paper.questions"
              :key="q.seq"
              class="exam-card__item"
              :class="{ 'is-done': isAnswered(q.seq), 'is-current': index === currentIndex }"
              @click="goTo(index); cardVisible = false"
            >{{ index + 1 }}</span>
          </div>
          <div class="exam-card__legend">已答 {{ answeredCount }} / {{ paper.questions.length }}，点题号跳转</div>
          <el-button type="danger" size="small" style="width: 100%" @click="handleSubmit()">交卷</el-button>
        </div>
      </el-drawer>
    </div>

    <!-- ============ 3. 成绩 ============ -->
    <div v-else class="exam-result">
      <div class="panel">
        <div class="panel-header">
          <span>{{ result.title }} · 成绩</span>
          <span>
            <el-button type="text" size="mini" @click="backToConfig">再考一次</el-button>
            <el-button type="text" size="mini" @click="$router.push('/exam/wrong')">去错题集</el-button>
          </span>
        </div>
        <div class="exam-result__summary">
          <div class="exam-result__score">
            <b>{{ result.score }}</b><span>/ {{ result.totalScore }}</span>
          </div>
          <div class="exam-result__stats">
            <div>答对 <b class="is-ok">{{ result.correctCount }}</b> 题</div>
            <div>答错 <b class="is-bad">{{ result.wrongCount }}</b> 题</div>
            <div>未答 <b>{{ result.unansweredCount }}</b> 题</div>
            <div>用时 {{ formatDuration(result.costSeconds || 0) }}</div>
          </div>
        </div>

        <div v-for="item in result.questions" :key="item.seq" class="exam-result__item">
          <div class="exam-result__head">
            <span class="exam-result__seq">{{ item.seq }}</span>
            <span class="exam-result__title">{{ item.title }}</span>
            <el-tag v-if="item.isCorrect === 1" size="mini" type="success">答对</el-tag>
            <el-tag v-else-if="item.isCorrect === 0" size="mini" type="danger">答错</el-tag>
            <el-tag v-else size="mini" type="info">解答题（自评）</el-tag>
          </div>
          <div class="exam-result__answers">
            <span>我的答案：<b :class="item.isCorrect === 1 ? 'is-ok' : 'is-bad'">{{ item.userAnswer || '未作答' }}</b></span>
            <span>正确答案：<b class="is-ok">{{ item.answer }}</b></span>
          </div>
          <div v-if="item.explanation" class="exam-result__explanation" v-html="renderMarkdown(item.explanation)" />
          <div class="exam-result__more">
            <el-button type="text" size="mini" icon="el-icon-view" @click="openResultDetail(item)">查看完整题目与解析</el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 题目详情（与题库搜索详情一致：选项高亮 + Markdown） -->
    <el-drawer :title="detailItem.title" :visible.sync="detailVisible" direction="rtl" size="52%" append-to-body>
      <div class="exam-detail">
        <div class="exam-detail__meta">
          <el-tag v-if="detailItem.category" size="mini" effect="plain">{{ detailItem.category }}</el-tag>
          <el-tag v-if="detailItem.subtopic" size="mini" effect="plain">{{ detailItem.subtopic }}</el-tag>
          <el-tag v-if="detailItem.questionType" size="mini" type="danger" effect="plain">{{ detailItem.questionType }}</el-tag>
          <el-tag v-if="detailItem.isCorrect === 1" size="mini" type="success">答对</el-tag>
          <el-tag v-else-if="detailItem.isCorrect === 0" size="mini" type="danger">答错</el-tag>
        </div>
        <div v-if="detailOptions.length" class="exam-detail__options">
          <div
            v-for="opt in detailOptions"
            :key="opt.key"
            class="exam-detail__option"
            :class="{ 'is-answer': isAnswerKey(opt.key) }"
          >
            <b>{{ opt.key }}.</b> {{ opt.text }}
            <el-tag v-if="isAnswerKey(opt.key)" size="mini" type="success">正确答案</el-tag>
          </div>
        </div>
        <div class="exam-detail__answers">
          <div>我的答案：<b :class="detailItem.isCorrect === 1 ? 'is-ok' : 'is-bad'">{{ detailItem.userAnswer || '未作答' }}</b></div>
          <div>正确答案：<b class="is-ok">{{ detailItem.answer }}</b></div>
        </div>
        <div v-if="detailItem.content" class="exam-detail__content" v-html="renderMarkdown(detailItem.content)" />
        <div v-if="detailItem.explanation" class="exam-detail__explanation">
          <div class="exam-detail__section-title">解析</div>
          <div v-html="renderMarkdown(detailItem.explanation)" />
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script>
import { marked } from 'marked'
import {
  getQuestionMeta,
  startExam,
  answerExamQuestion,
  submitExam,
  getExamPaper,
  getExamResult,
  listExamTemplates,
  getExamTemplate,
  saveExamTemplate
} from '@/api/kb'

export default {
  name: 'KbExamStart',
  data() {
    return {
      stage: 'CONFIG',
      meta: { categories: [] },
      rules: [{ category: undefined, subtopic: undefined, count: 5 }],
      form: { perQuestionSeconds: 60, mode: 'NORMAL', title: '' },
      starting: false,
      paper: { questions: [] },
      answers: {},
      currentIndex: 0,
      remaining: 0,
      timer: null,
      result: { questions: [] },
      templates: [],
      selectedTemplateId: undefined,
      detailVisible: false,
      detailItem: {},
      cardVisible: false
    }
  },
  computed: {
    current() {
      return this.paper.questions[this.currentIndex] || {}
    },
    currentOptions() {
      try {
        return this.current.options ? JSON.parse(this.current.options) : []
      } catch (e) {
        return []
      }
    },
    totalCount() {
      return this.rules.reduce((sum, rule) => sum + (rule.count || 0), 0)
    },
    answeredCount() {
      return Object.keys(this.answers).filter(key => this.answers[key]).length
    },
    progressPercent() {
      const total = this.paper.questions.length || 1
      return Math.round(((this.currentIndex + 1) / total) * 100)
    },
    detailOptions() {
      try {
        return this.detailItem.options ? JSON.parse(this.detailItem.options) : []
      } catch (e) {
        return []
      }
    }
  },
  created() {
    getQuestionMeta().then(res => {
      this.meta = (res && res.data) || { categories: [] }
    })
    this.loadTemplates()
    // 支持从配置管理页"用它开考"直接带模板进入
    const templateId = this.$route.query.templateId
    if (templateId) {
      this.selectedTemplateId = Number(templateId)
      this.onTemplateChange(this.selectedTemplateId)
    }
    // 从考试记录"继续考试"进入
    const paperId = this.$route.query.paperId
    if (paperId) {
      this.resumePaper(Number(paperId))
    }
  },
  beforeDestroy() {
    this.clearTimer()
  },
  methods: {
    subtopicsOf(category) {
      const item = this.meta.categories.find(node => node.category === category)
      return item ? item.subtopics : []
    },
    addRule() {
      this.rules.push({ category: undefined, subtopic: undefined, count: 5 })
    },
    removeRule(index) {
      this.rules.splice(index, 1)
      if (!this.rules.length) {
        this.addRule()
      }
    },
    onRuleCategoryChange(row) {
      row.subtopic = undefined
    },
    /** 模板列表（全局已发布 + 我的个人模板） */
    loadTemplates() {
      listExamTemplates().then(res => {
        this.templates = (res && res.data) || []
      })
    },
    /** 选中模板后回填组卷配置 */
    onTemplateChange(templateId) {
      if (!templateId) {
        return
      }
      getExamTemplate(templateId).then(res => {
        const data = (res && res.data) || {}
        this.rules = (data.rules || []).map(rule => ({
          category: rule.category,
          subtopic: rule.subtopic,
          count: rule.count
        }))
        if (!this.rules.length) {
          this.addRule()
        }
        this.form.perQuestionSeconds = data.perQuestionSeconds || 60
        this.form.mode = data.mode || 'NORMAL'
      })
    },
    /** 把当前组卷配置存成个人模板 */
    saveAsTemplate() {
      const rules = this.rules.filter(rule => rule.category && rule.count > 0)
      if (!rules.length) {
        this.$modal.msgWarning('请先配置知识点')
        return
      }
      this.$prompt('给这个模板起个名字', '存为模板', { inputValue: this.form.title || '' }).then(({ value }) => {
        return saveExamTemplate({
          name: value,
          scope: 'PERSONAL',
          status: 'PUBLISHED',
          mode: this.form.mode,
          perQuestionSeconds: this.form.perQuestionSeconds,
          excludeMastered: this.form.mode === 'REVIEW' ? 0 : 1,
          objectiveOnly: 1,
          rules: rules
        })
      }).then(() => {
        this.$modal.msgSuccess('模板已保存')
        this.loadTemplates()
      }).catch(() => {})
    },
    startExam() {
      const payload = {
        title: this.form.title,
        mode: this.form.mode,
        perQuestionSeconds: this.form.perQuestionSeconds,
        excludeMastered: this.form.mode === 'REVIEW' ? 0 : 1,
        objectiveOnly: 1
      }
      if (this.selectedTemplateId) {
        payload.templateId = this.selectedTemplateId
      } else {
        const rules = this.rules.filter(rule => rule.category && rule.count > 0)
        if (!rules.length) {
          this.$modal.msgWarning('请至少选择一个知识点')
          return
        }
        payload.rules = rules
      }
      this.starting = true
      startExam(payload).then(res => {
        this.paper = res.data
        this.answers = {}
        this.currentIndex = 0
        this.remaining = this.paper.remainingSeconds || this.paper.timeLimitSeconds || 0
        this.stage = 'EXAM'
        this.startTimer()
      }).catch(err => {
        this.$modal.msgError((err && err.message) || '组卷失败')
      }).finally(() => {
        this.starting = false
      })
    },
    startTimer() {
      this.clearTimer()
      this.timer = setInterval(() => {
        this.remaining -= 1
        if (this.remaining <= 0) {
          this.clearTimer()
          this.$modal.msgWarning('考试时间到，已自动交卷')
          this.handleSubmit(true)
        }
      }, 1000)
    },
    /** 续考：拉回试卷与已作答内容（已交卷的直接看成绩） */
    resumePaper(paperId) {
      getExamPaper(paperId).then(res => {
        const data = (res && res.data) || {}
        if (!data.paperId) {
          this.$modal.msgError('试卷不存在')
          return
        }
        if (data.status !== 'IN_PROGRESS') {
          this.result = { ...data, questions: [] }
          getExamResult(paperId).then(resultRes => {
            this.result = (resultRes && resultRes.data) || data
            this.stage = 'RESULT'
          })
          return
        }
        const answers = {}
        ;(data.questions || []).forEach(question => {
          if (question.userAnswer) {
            answers[question.seq] = question.userAnswer
          }
        })
        this.paper = data
        this.answers = answers
        this.currentIndex = 0
        this.remaining = data.remainingSeconds || 0
        this.stage = 'EXAM'
        this.startTimer()
      }).catch(() => {
        this.$modal.msgError('试卷加载失败')
      })
    },
    clearTimer() {
      if (this.timer) {
        clearInterval(this.timer)
        this.timer = null
      }
    },
    isSelected(key) {
      const value = this.answers[this.current.seq] || ''
      return value.split(',').indexOf(key) >= 0
    },
    toggleOption(key) {
      const seq = this.current.seq
      if (this.current.questionType === '多选') {
        const list = (this.answers[seq] || '').split(',').filter(Boolean)
        const index = list.indexOf(key)
        if (index >= 0) {
          list.splice(index, 1)
        } else {
          list.push(key)
        }
        this.answers = { ...this.answers, [seq]: list.sort().join(',') }
      } else {
        this.answers = { ...this.answers, [seq]: key }
      }
      this.saveAnswer(seq)
    },
    saveAnswer(seq) {
      if (!this.paper.paperId) {
        return
      }
      answerExamQuestion(this.paper.paperId, {
        seq: seq,
        userAnswer: this.answers[seq] || '',
        costSeconds: this.form.perQuestionSeconds
      })
    },
    goTo(index) {
      if (index < 0 || index >= this.paper.questions.length) {
        return
      }
      this.saveAnswer(this.current.seq)
      this.currentIndex = index
    },
    isAnswered(seq) {
      return !!(this.answers[seq] || '').trim()
    },
    handleSubmit(auto) {
      const submit = () => {
        this.saveAnswer(this.current.seq)
        this.clearTimer()
        submitExam(this.paper.paperId).then(res => {
          this.result = res.data
          this.stage = 'RESULT'
        })
      }
      if (auto) {
        submit()
        return
      }
      const unanswered = this.paper.questions.length - this.answeredCount
      this.$modal.confirm(unanswered > 0
        ? '还有 ' + unanswered + ' 题未作答，确认交卷？'
        : '确认交卷？').then(submit).catch(() => {})
    },
    backToConfig() {
      this.stage = 'CONFIG'
      this.result = { questions: [] }
    },
    /** 成绩页：点开单题详情（与题库搜索详情一致） */
    openResultDetail(item) {
      this.detailItem = item
      this.detailVisible = true
    },
    isAnswerKey(key) {
      const answer = this.detailItem.answer || ''
      return answer.split(',').map(value => value.trim().toUpperCase()).indexOf(key) >= 0
    },
    formatDuration(seconds) {
      const value = Math.max(seconds || 0, 0)
      const minutes = Math.floor(value / 60)
      const rest = value % 60
      return (minutes < 10 ? '0' : '') + minutes + ':' + (rest < 10 ? '0' : '') + rest
    },
    renderMarkdown(text) {
      return marked.parse(text || '')
    }
  }
}
</script>

<style scoped>
.panel {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 12px;
}
.panel-tip {
  font-size: 12px;
  font-weight: 400;
  color: #909399;
}
.exam-danger {
  color: #f56c6c;
}
.exam-config__form {
  margin-top: 16px;
}
.exam-config__template {
  margin-bottom: 12px;
}
.exam-config__summary {
  margin-top: 8px;
  font-size: 14px;
  color: #606266;
}
.exam-config__summary .el-button {
  margin-left: 16px;
}

/* 答题 */
.exam-taking {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.exam-taking__main {
  flex: 1;
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.exam-taking__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  margin-bottom: 8px;
}
.exam-timer {
  font-size: 16px;
  font-weight: 600;
  color: #409eff;
}
.exam-timer.is-urgent {
  color: #f56c6c;
}
.exam-question {
  margin-top: 18px;
}
.exam-question__meta .el-tag {
  margin-right: 6px;
}
.exam-question__title {
  font-size: 17px;
  line-height: 1.7;
  margin: 12px 0 16px;
}
.exam-option {
  display: flex;
  align-items: flex-start;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 12px 14px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.15s;
}
.exam-option:hover {
  border-color: #c6e2ff;
  background: #f5f9ff;
}
.exam-option.is-selected {
  border-color: #409eff;
  background: #ecf5ff;
}
.exam-option__key {
  font-weight: 700;
  margin-right: 10px;
}
.exam-option__text {
  line-height: 1.6;
}
.exam-question__actions {
  margin-top: 18px;
}
.exam-taking__side {
  width: 240px;
}
.exam-card {
  background: #fff;
  border-radius: 8px;
  padding: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.exam-card__title {
  font-weight: 600;
  margin-bottom: 10px;
}
.exam-card__grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.exam-card__item {
  width: 30px;
  height: 30px;
  line-height: 30px;
  text-align: center;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}
.exam-card__item.is-done {
  background: #ecf5ff;
  border-color: #b3d8ff;
}
.exam-card__item.is-current {
  background: #409eff;
  border-color: #409eff;
  color: #fff;
}
.exam-card__legend {
  font-size: 12px;
  color: #909399;
  margin: 12px 0;
}

/* 成绩 */
.exam-result__summary {
  display: flex;
  align-items: center;
  gap: 32px;
  padding: 12px 4px 20px;
  border-bottom: 1px solid #f0f2f5;
}
.exam-result__score b {
  font-size: 44px;
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
.is-ok {
  color: #67c23a;
}
.is-bad {
  color: #f56c6c;
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
.exam-result__more {
  margin: 6px 0 0 30px;
}

/* 题目详情抽屉（与题库搜索详情一致） */
.exam-detail {
  padding: 0 20px 20px;
}
.exam-detail__meta .el-tag {
  margin-right: 6px;
}
.exam-detail__options {
  margin-top: 14px;
}
.exam-detail__option {
  padding: 8px 10px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  margin-bottom: 8px;
  font-size: 13px;
  line-height: 1.6;
}
.exam-detail__option.is-answer {
  border-color: #67c23a;
  background: #f0f9eb;
}
.exam-detail__answers {
  margin-top: 12px;
  font-size: 13px;
  color: #606266;
}
.exam-detail__answers div {
  margin-bottom: 4px;
}
.exam-detail__content,
.exam-detail__explanation {
  margin-top: 16px;
  font-size: 14px;
  line-height: 1.75;
  word-break: break-word;
}
.exam-detail__section-title {
  font-weight: 600;
  margin-bottom: 6px;
}

/* 手机端适配：答题卡收进底部弹层，题干占满宽度 */
.exam-mobile-bar {
  display: none;
}
.exam-sheet {
  padding: 0 16px 16px;
}

@media (max-width: 768px) {
  .exam-taking {
    display: block;
  }
  .exam-taking__side {
    display: none;
  }
  .exam-taking__main {
    padding: 12px 14px 84px;
  }
  .exam-question__title {
    font-size: 16px;
    margin: 10px 0 14px;
  }
  .exam-option {
    padding: 11px 12px;
    margin-bottom: 8px;
  }
  .exam-taking__bar {
    font-size: 13px;
  }
  .exam-mobile-bar {
    display: flex;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    background: #fff;
    border-top: 1px solid #ebeef5;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
    padding: 6px 0 calc(6px + env(safe-area-inset-bottom));
    z-index: 2000;
  }
  .exam-mobile-bar__item {
    flex: 1;
    text-align: center;
    font-size: 11px;
    color: #606266;
  }
  .exam-mobile-bar__item i {
    display: block;
    font-size: 18px;
    margin-bottom: 2px;
  }
  .exam-mobile-bar__item.is-disabled {
    color: #c0c4cc;
  }
  .exam-mobile-bar__item.is-submit {
    color: #f56c6c;
  }
  .exam-card__grid--sheet {
    gap: 10px;
  }
  .exam-card__grid--sheet .exam-card__item {
    width: 38px;
    height: 38px;
    line-height: 38px;
    font-size: 14px;
  }
  .exam-result__summary {
    gap: 16px;
    flex-wrap: wrap;
  }
  .exam-result__score b {
    font-size: 34px;
  }
}
</style>
