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
