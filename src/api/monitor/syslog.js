import request from '@/utils/request'

// 查询日志文件列表
export function listLogFiles(query) {
  return request({
    url: '/sys/log/list',
    method: 'get',
    params: query
  })
}

// 查询日志详情（分页 + 关键词搜索）
export function getLogDetail(query) {
  return request({
    url: '/sys/log/detail',
    method: 'get',
    params: query
  })
}
