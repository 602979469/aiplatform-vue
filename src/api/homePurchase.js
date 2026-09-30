import request from '@/utils/request'

// ==================== 家庭装修采购（HomePurchaseItemController） ====================

// 家具类型树（大类 → 小类，含简易图标）
export function listFurnitureTypes() {
  return request({
    url: '/api/v1/homePurchaseItems/types',
    method: 'get',
    timeout: 15000
  })
}

// 分页查询采购项
export function pagePurchaseItem(query) {
  return request({
    url: '/api/v1/homePurchaseItems/page',
    method: 'get',
    params: query,
    timeout: 30000
  })
}

// 列表查询（不分页，预算报告页用）
export function listPurchaseItem(query) {
  return request({
    url: '/api/v1/homePurchaseItems/list',
    method: 'get',
    params: query,
    timeout: 30000
  })
}

// 采购项详情（含参考图片）
export function getPurchaseItem(id) {
  return request({
    url: '/api/v1/homePurchaseItems/' + id,
    method: 'get',
    timeout: 15000
  })
}

// 新增采购项
export function addPurchaseItem(data) {
  return request({
    url: '/api/v1/homePurchaseItems',
    method: 'post',
    data: data,
    timeout: 30000
  })
}

// 修改采购项（全量，图片整体替换）
export function updatePurchaseItem(id, data) {
  return request({
    url: '/api/v1/homePurchaseItems/' + id,
    method: 'put',
    data: data,
    timeout: 30000
  })
}

// 删除采购项
export function delPurchaseItem(id) {
  return request({
    url: '/api/v1/homePurchaseItems/' + id,
    method: 'delete',
    timeout: 15000
  })
}

// AI 推荐 3 款候选产品
export function recommendProducts(data) {
  return request({
    url: '/api/v1/homePurchaseItems/recommend',
    method: 'post',
    data: data,
    timeout: 90000
  })
}

/** 图片上传地址（el-upload 内置上传用，namespace=aiplatform） */
export const imageUploadUrl = process.env.VUE_APP_BASE_API + '/api/file/upload'

/** 图片直出地址（inline 预览，可直接放进 img 的 src） */
export function imagePreviewUrl(fileId) {
  return process.env.VUE_APP_BASE_API + '/api/file/' + fileId + '/preview?namespace=aiplatform'
}
