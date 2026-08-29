import request from '@/utils/request'

// ==================== 文件管理（FileInfoController） ====================

// 命名空间下拉列表
export function listNamespaces() {
  return request({
    url: '/api/file/namespaces',
    method: 'get',
    timeout: 15000
  })
}

// 分页查询文件列表
export function pageFile(query) {
  return request({
    url: '/api/file/page',
    method: 'get',
    params: query,
    timeout: 30000
  })
}

// 上传文件（multipart：namespace + file + remark）
export function uploadFile(data) {
  return request({
    url: '/api/file/upload',
    method: 'post',
    data: data,
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000
  })
}

// 更新文件元信息（改名/备注）
export function updateFile(id, data) {
  return request({
    url: '/api/file/' + id,
    method: 'put',
    data: data,
    timeout: 30000
  })
}

// 删除文件（物理删除 DB 行 + 磁盘文件）
export function delFile(id, namespace) {
  return request({
    url: '/api/file/' + id,
    method: 'delete',
    params: { namespace: namespace },
    timeout: 60000
  })
}

// 下载文件（二进制流）
export function downloadFile(id, namespace) {
  return request({
    url: '/api/file/' + id + '/download',
    method: 'get',
    params: { namespace: namespace },
    responseType: 'blob',
    timeout: 60000
  })
}
