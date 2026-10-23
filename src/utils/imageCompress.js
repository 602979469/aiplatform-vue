/**
 * 图片上传前压缩。
 *
 * 背景：上传走 公网 VPS → frp 隧道，带宽约 6 Mbps，
 * 手机原图 5–8MB 要传 8–15 秒。这里在浏览器本地把长边压到 2560、
 * JPEG 质量 0.85，通常剩 300–800KB，肉眼几乎无差别；
 * 单据/截图（png）保持无损，只做尺寸缩放，保证文字清楚。
 */

const KB = 1024

const DEFAULTS = {
  maxEdge: 2560,
  quality: 0.85,
  // 小于这个体积不动（头像、小图没必要处理）
  minBytes: 600 * KB,
  // 超过这个体积交给后端限制（前端已有 10MB 校验）
  maxBytes: 30 * KB * KB
}

export function compressImage(file, options = {}) {
  const opts = Object.assign({}, DEFAULTS, options)
  if (!file || !/^image\//.test(file.type || '')) {
    return Promise.resolve(file)
  }
  // 动图压缩会丢帧，直接放过
  if (file.type === 'image/gif') {
    return Promise.resolve(file)
  }
  if (file.size < opts.minBytes || file.size > opts.maxBytes) {
    return Promise.resolve(file)
  }

  return loadBitmap(file)
    .then(bitmap => {
      const maxSide = Math.max(bitmap.width, bitmap.height)
      const scale = maxSide > opts.maxEdge ? opts.maxEdge / maxSide : 1
      const width = Math.max(1, Math.round(bitmap.width * scale))
      const height = Math.max(1, Math.round(bitmap.height * scale))

      // 尺寸没超且本来就不大：不折腾
      if (scale === 1 && file.size <= opts.minBytes * 2) {
        bitmap.release()
        return file
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      // 透明 png 转 jpeg 时避免黑底
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(bitmap.source, 0, 0, width, height)
      bitmap.release()

      // 截图/单据（png）保持 png，只缩尺寸，文字不会被有损压缩糊掉
      const isPng = /png/i.test(file.type)
      const mime = isPng ? 'image/png' : 'image/jpeg'
      const quality = isPng ? 1 : opts.quality

      return toBlob(canvas, mime, quality).then(blob => {
        // 压完反而更大就保留原图
        if (!blob || blob.size >= file.size * 0.92) {
          return file
        }
        const name = (file.name || 'image').replace(/\.[^.]+$/, '') + (isPng ? '.png' : '.jpg')
        return new File([blob], name, { type: mime, lastModified: Date.now() })
      })
    })
    .catch(() => file) // 压缩失败不影响上传
}

function loadBitmap(file) {
  if (window.createImageBitmap) {
    return createImageBitmap(file, { imageOrientation: 'from-image' })
      .then(bmp => ({
        source: bmp,
        width: bmp.width,
        height: bmp.height,
        release: () => bmp.close && bmp.close()
      }))
      .catch(() => loadViaImage(file))
  }
  return loadViaImage(file)
}

function loadViaImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({
        source: img,
        width: img.naturalWidth,
        height: img.naturalHeight,
        release: () => {}
      })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('image decode failed'))
    }
    img.src = url
  })
}

function toBlob(canvas, mime, quality) {
  return new Promise(resolve => {
    if (canvas.toBlob) {
      canvas.toBlob(resolve, mime, quality)
      return
    }
    try {
      const dataUrl = canvas.toDataURL(mime, quality)
      const binary = atob(dataUrl.split(',')[1])
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      resolve(new Blob([bytes], { type: mime }))
    } catch (e) {
      resolve(null)
    }
  })
}
