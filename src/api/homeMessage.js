import request from '@/utils/request'

// ==================== 首页留言板（HomeMessageController） ====================

/** 分页查询留言（最新在前，默认每页 10 条） */
export function pageMessage(query) {
  return request({
    url: '/api/message/page',
    method: 'get',
    params: query,
    timeout: 15000
  })
}

/** 发布留言（匿名：身份由服务端按客户端 IP 分配） */
export function postMessage(content) {
  return request({
    url: '/api/message',
    method: 'post',
    data: { content: content },
    timeout: 15000
  })
}
