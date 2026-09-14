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
