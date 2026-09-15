import request from '@/utils/request'

// 题库搜索（走 ES）
export function searchQuestions(params) {
  return request({
    url: '/api/kb/question/search',
    method: 'get',
    params: params,
    timeout: 30000
  })
}

// 题目详情（完整解答，Markdown）
export function getQuestionDetail(id) {
  return request({
    url: '/api/kb/question/' + id,
    method: 'get',
    timeout: 30000
  })
}

// 题库筛选项（题型/技术方向/知识点/难度 + 数量）
export function getQuestionFacets() {
  return request({
    url: '/api/kb/question/facets',
    method: 'get',
    timeout: 30000
  })
}

// ==================== 题库管理（MySQL，物理删除） ====================

// 题目分页（关键词 + 分类/子主题/题型/难度筛选）
export function pageQuestions(params) {
  return request({
    url: '/api/kb/question/page',
    method: 'get',
    params: params,
    timeout: 30000
  })
}

// 知识点元数据（分类 → 子主题 + 题量）
export function getQuestionMeta() {
  return request({
    url: '/api/kb/question/meta',
    method: 'get',
    timeout: 30000
  })
}

// 新增题目
export function createQuestion(data) {
  return request({
    url: '/api/kb/question',
    method: 'post',
    data: data,
    timeout: 30000
  })
}

// 修改题目
export function updateQuestion(id, data) {
  return request({
    url: '/api/kb/question/' + id,
    method: 'put',
    data: data,
    timeout: 30000
  })
}

// 删除题目（物理删除）
export function deleteQuestion(id) {
  return request({
    url: '/api/kb/question/' + id,
    method: 'delete',
    timeout: 30000
  })
}

// ==================== 考试中心 ====================

// 开始考试（选模板或快速创建）
export function startExam(data) {
  return request({
    url: '/api/kb/exam/start',
    method: 'post',
    data: data,
    timeout: 60000
  })
}

// 续考：取回试卷与已作答内容
export function getExamPaper(paperId) {
  return request({
    url: '/api/kb/exam/paper/' + paperId,
    method: 'get',
    timeout: 30000
  })
}

// 提交单题作答
export function answerExamQuestion(paperId, data) {
  return request({
    url: '/api/kb/exam/paper/' + paperId + '/answer',
    method: 'put',
    data: data,
    timeout: 30000
  })
}

// 交卷判分
export function submitExam(paperId) {
  return request({
    url: '/api/kb/exam/paper/' + paperId + '/submit',
    method: 'post',
    timeout: 60000
  })
}

// 成绩详情
export function getExamResult(paperId) {
  return request({
    url: '/api/kb/exam/paper/' + paperId + '/result',
    method: 'get',
    timeout: 30000
  })
}

// 考试记录
export function listExamHistory(params) {
  return request({
    url: '/api/kb/exam/history',
    method: 'get',
    params: params,
    timeout: 30000
  })
}

// 错题集
export function listWrongQuestions(params) {
  return request({
    url: '/api/kb/exam/wrong',
    method: 'get',
    params: params,
    timeout: 30000
  })
}

// 标记已掌握（移出错题集）
export function markQuestionMastered(questionId) {
  return request({
    url: '/api/kb/exam/wrong/' + questionId + '/mastered',
    method: 'post',
    timeout: 30000
  })
}

// ==================== 试卷模板（配置管理） ====================

// 模板列表（全局已发布 + 我的个人模板）
export function listExamTemplates() {
  return request({
    url: '/api/kb/exam/template/list',
    method: 'get',
    timeout: 30000
  })
}

// 模板详情（含知识点规则）
export function getExamTemplate(id) {
  return request({
    url: '/api/kb/exam/template/' + id,
    method: 'get',
    timeout: 30000
  })
}

// 保存模板（新增/修改）
export function saveExamTemplate(data) {
  return request({
    url: '/api/kb/exam/template',
    method: 'post',
    data: data,
    timeout: 30000
  })
}

// 删除模板
export function deleteExamTemplate(id) {
  return request({
    url: '/api/kb/exam/template/' + id,
    method: 'delete',
    timeout: 30000
  })
}
