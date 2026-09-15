import request from '@/utils/request'

// ==================== ES 同步（canal CDC）====================
// 映射列表
export function listMappings() {
  return request({
    url: '/api/cdc/sync/list',
    method: 'get',
    timeout: 30000
  })
}

// 映射详情
export function getMapping(name) {
  return request({
    url: '/api/cdc/sync/detail',
    method: 'get',
    params: { name: name },
    timeout: 30000
  })
}

// 预检 + yml 预览
export function previewMapping(data) {
  return request({
    url: '/api/cdc/sync/preview',
    method: 'post',
    data: data,
    timeout: 30000
  })
}

// 保存映射（新增或覆盖）
export function saveMapping(data) {
  return request({
    url: '/api/cdc/sync/save',
    method: 'post',
    data: data,
    timeout: 120000
  })
}

// 删除映射
export function deleteMapping(data) {
  return request({
    url: '/api/cdc/sync/delete',
    method: 'post',
    data: data,
    timeout: 120000
  })
}

// SQL 格式化
export function formatMappingSql(sql) {
  return request({
    url: '/api/cdc/sync/format',
    method: 'post',
    data: { sql: sql },
    timeout: 15000
  })
}

// 触发全量导入
export function triggerEtl(name) {
  return request({
    url: '/api/cdc/sync/etl',
    method: 'post',
    data: { name: name },
    timeout: 600000
  })
}

// 滚动重启 canal-adapter
export function restartAdapter() {
  return request({
    url: '/api/cdc/sync/restart',
    method: 'post',
    timeout: 120000
  })
}

// 运行状态
export function getSyncStatus() {
  return request({
    url: '/api/cdc/sync/status',
    method: 'get',
    timeout: 30000
  })
}

// ES 业务索引列表
export function listEsIndices() {
  return request({
    url: '/api/cdc/sync/indices',
    method: 'get',
    timeout: 30000
  })
}
