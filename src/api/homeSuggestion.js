import request from '@/utils/request'

// ==================== 装修意见（HomeSuggestionController） ====================

// 区域选项（后端配置）
export function listSuggestionRegions() {
  return request({
    url: '/api/v1/homeSuggestions/regions',
    method: 'get',
    timeout: 15000
  })
}

// 分页查询意见
export function pageSuggestion(query) {
  return request({
    url: '/api/v1/homeSuggestions/page',
    method: 'get',
    params: query,
    timeout: 30000
  })
}

// 列表查询（不分页，导出 PDF 用）
export function listSuggestion(query) {
  return request({
    url: '/api/v1/homeSuggestions/list',
    method: 'get',
    params: query,
    timeout: 30000
  })
}

// 新增意见
export function addSuggestion(data) {
  return request({
    url: '/api/v1/homeSuggestions',
    method: 'post',
    data: data,
    timeout: 30000
  })
}

// 一句话录入：把一段话识别成 区域 + 标题 + 内容（草稿，用户确认后再调新增）
export function parseSuggestion(data) {
  return request({
    url: '/api/v1/homeSuggestions/parse',
    method: 'post',
    data: data,
    timeout: 90000
  })
}

// 修改意见（全量，图片整体替换）
export function updateSuggestion(id, data) {
  return request({
    url: '/api/v1/homeSuggestions/' + id,
    method: 'put',
    data: data,
    timeout: 30000
  })
}

// 删除意见
export function delSuggestion(id) {
  return request({
    url: '/api/v1/homeSuggestions/' + id,
    method: 'delete',
    timeout: 15000
  })
}

/** 图片上传地址（el-upload 内置上传用，namespace=aiplatform） */
export const suggestionImageUploadUrl = process.env.VUE_APP_BASE_API + '/api/file/upload'

/**
 * 图片直出地址
 * @param fileId 文件ID
 * @param width 可选：缩略图宽度（列表传，看大图不传）
 */
export function suggestionImageUrl(fileId, width) {
  const suffix = width ? '&w=' + width : ''
  return process.env.VUE_APP_BASE_API + '/api/file/' + fileId + '/preview?namespace=aiplatform' + suffix
}
