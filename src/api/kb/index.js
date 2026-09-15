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
