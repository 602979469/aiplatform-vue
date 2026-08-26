import request from '@/utils/request'

// ==================== 数据大盘 ====================
// 集群大盘数据
export function getDashboard() {
  return request({
    url: '/api/cluster/dashboard',
    method: 'get',
    timeout: 30000
  })
}

// 业务命名空间列表
export function listNamespaces() {
  return request({
    url: '/api/cluster/namespaces',
    method: 'get',
    timeout: 15000
  })
}

// ==================== 配置管理 ====================
// 业务pod配置分页查询
export function pagePodConfig(data) {
  return request({
    url: '/api/cluster/pod-config/page',
    method: 'get',
    params: data,
    timeout: 30000
  })
}

// 新增业务pod配置版本
export function addPodConfig(data) {
  return request({
    url: '/api/cluster/pod-config',
    method: 'post',
    data: data,
    timeout: 30000
  })
}

// 编辑业务pod配置版本（全量）
export function updatePodConfig(id, data) {
  return request({
    url: '/api/cluster/pod-config/' + id,
    method: 'put',
    data: data,
    timeout: 30000
  })
}

// 删除业务pod配置（含 K8s 资源）
export function delPodConfig(id) {
  return request({
    url: '/api/cluster/pod-config/' + id,
    method: 'delete',
    timeout: 60000
  })
}

// 触发部署（异步受理）
export function deployPodConfig(id) {
  return request({
    url: '/api/cluster/pod-config/' + id + '/deploy',
    method: 'post',
    timeout: 30000
  })
}

// 停用（缩容 0）
export function stopPodConfig(id) {
  return request({
    url: '/api/cluster/pod-config/' + id + '/stop',
    method: 'post',
    timeout: 30000
  })
}

// 启用（扩容到配置副本数）
export function startPodConfig(id) {
  return request({
    url: '/api/cluster/pod-config/' + id + '/start',
    method: 'post',
    timeout: 30000
  })
}

// ==================== 实时管理 ====================
// 实时管理列表
export function listRuntimePods() {
  return request({
    url: '/api/cluster/runtime/list',
    method: 'get',
    timeout: 30000
  })
}

// 运行 Pod 日志
export function getPodLogs(podName) {
  return request({
    url: '/api/cluster/runtime/' + podName + '/logs',
    method: 'get',
    timeout: 60000
  })
}

// 运行事件
export function getPodEvents(podName) {
  return request({
    url: '/api/cluster/runtime/' + podName + '/events',
    method: 'get',
    timeout: 30000
  })
}
