<template>
  <div class="board">
    <div class="board-head">
      <div class="board-head-left">
        <span class="board-logo">💬</span>
        <div class="board-head-text">
          <h3 class="board-title">留言板</h3>
        </div>
      </div>
      <button class="board-refresh" :class="{ busy: loading }" title="看看有没有新留言" @click="loadLatest">
        <i class="el-icon-refresh" />
      </button>
    </div>

    <div ref="scroller" v-loading="loading" class="board-body">
      <div
        v-if="messages.length"
        class="board-more"
        :class="{ clickable: hasMore, busy: loadingOlder }"
        @click="loadOlder"
      >
        {{ hasMore ? (loadingOlder ? '正在翻…' : '查看更早的留言') : '— 已经是最早的留言了 —' }}
      </div>

      <div v-if="!messages.length && !loading" class="board-empty">
        <div class="board-empty-emoji">🐣</div>
        <p>还没有人留言，来做第一个吧～</p>
      </div>

      <div v-for="msg in messages" :key="msg.id" class="board-row" :class="{ mine: msg.mine }">
        <img v-if="msg.avatarUrl" class="board-avatar" :src="fullUrl(msg.avatarUrl)" :alt="msg.avatarName">
        <span v-else class="board-avatar board-avatar-text" :style="avatarStyle(msg)">
          {{ (msg.avatarName || '匿').slice(0, 1) }}
        </span>
        <div class="board-main">
          <div class="board-meta">
            <span class="board-time">{{ relativeTime(msg.createTimestamp) }}</span>
          </div>
          <div class="board-bubble" :class="{ mine: msg.mine }" :style="bubbleStyle(msg)">{{ msg.content }}</div>
        </div>
      </div>
    </div>

    <div class="board-foot">
      <textarea
        v-model="draft"
        class="board-input"
        maxlength="200"
        placeholder="说点什么吧～（Shift + Enter 换行）"
        @keydown.enter.exact.prevent="send"
      />
      <button class="board-send" :disabled="sending || !draft.trim()" @click="send">
        {{ sending ? '发送中' : '发送' }}
      </button>
    </div>
  </div>
</template>

<script>
import { pageMessage, postMessage } from '@/api/homeMessage'

/** 每页条数：留言板固定展示最近 10 条。 */
const PAGE_SIZE = 10

/** 每个 IP 一种气泡颜色（下标由服务端给出，同一 IP 恒定）。 */
const PALETTE = [
  { bg: '#e8f3ff', text: '#1f4e79' },
  { bg: '#e6f8ef', text: '#1c5c40' },
  { bg: '#fff3d6', text: '#7a5300' },
  { bg: '#ffe8ee', text: '#8a2b45' },
  { bg: '#efe9ff', text: '#4a2f8f' },
  { bg: '#e3f7f5', text: '#155e5f' },
  { bg: '#fdece1', text: '#8a4a1c' },
  { bg: '#eef4e3', text: '#4a5a22' },
  { bg: '#fde8f5', text: '#7a2a5c' },
  { bg: '#e9eef6', text: '#31465f' },
  { bg: '#e5f4ff', text: '#1a5f8a' },
  { bg: '#f6ecff', text: '#5b2f8a' }
]

export default {
  name: 'MessageBoard',
  data() {
    return {
      messages: [],
      draft: '',
      pageNum: 1,
      total: 0,
      loading: false,
      loadingOlder: false,
      sending: false
    }
  },
  computed: {
    hasMore() {
      return this.pageNum * PAGE_SIZE < this.total
    }
  },
  mounted() {
    this.loadLatest()
  },
  methods: {
    /** 首屏 / 刷新：取最新一页 */
    loadLatest() {
      if (this.loading) {
        return
      }
      this.loading = true
      pageMessage({ pageNum: 1, pageSize: PAGE_SIZE }).then(response => {
        const page = response.data || {}
        this.messages = (page.dataList || []).slice().reverse()
        this.pageNum = 1
        this.total = page.total || 0
        this.$nextTick(() => this.scrollToBottom())
      }).catch(() => {}).finally(() => {
        this.loading = false
      })
    },
    /** 翻页：往上看更早的留言，保持当前浏览位置不跳 */
    loadOlder() {
      if (!this.hasMore || this.loadingOlder) {
        return
      }
      this.loadingOlder = true
      const scroller = this.$refs.scroller
      const prevHeight = scroller ? scroller.scrollHeight : 0
      const nextPage = this.pageNum + 1
      pageMessage({ pageNum: nextPage, pageSize: PAGE_SIZE }).then(response => {
        const page = response.data || {}
        const older = (page.dataList || []).slice().reverse()
        this.messages = older.concat(this.messages)
        this.pageNum = nextPage
        this.total = page.total || this.total
        this.$nextTick(() => {
          if (scroller) {
            scroller.scrollTop = scroller.scrollHeight - prevHeight
          }
        })
      }).catch(() => {}).finally(() => {
        this.loadingOlder = false
      })
    },
    /** 发言：成功即贴到自己这一侧，不用整页刷新 */
    send() {
      const content = (this.draft || '').trim()
      if (!content || this.sending) {
        return
      }
      this.sending = true
      postMessage(content).then(response => {
        const created = response.data
        this.draft = ''
        if (!created) {
          this.loadLatest()
          return
        }
        this.messages = this.messages.concat([{
          ...created,
          createTimestamp: created.createTimestamp || Date.now()
        }])
        this.total = this.total + 1
        this.$nextTick(() => this.scrollToBottom())
      }).catch(() => {}).finally(() => {
        this.sending = false
      })
    },
    scrollToBottom() {
      const scroller = this.$refs.scroller
      if (scroller) {
        scroller.scrollTop = scroller.scrollHeight
      }
    },
    fullUrl(url) {
      return process.env.VUE_APP_BASE_API + url
    },
    palette(msg) {
      const index = Number(msg.colorIndex)
      return PALETTE[(Number.isFinite(index) ? index : 0) % PALETTE.length]
    },
    bubbleStyle(msg) {
      const color = this.palette(msg)
      return { background: color.bg, color: color.text }
    },
    avatarStyle(msg) {
      return this.bubbleStyle(msg)
    },
    /** 相对时间：刚发的看起来才像群聊 */
    relativeTime(timestamp) {
      if (!timestamp) {
        return ''
      }
      const date = new Date(timestamp)
      const now = new Date()
      const pad = value => (value < 10 ? '0' + value : '' + value)
      const hm = pad(date.getHours()) + ':' + pad(date.getMinutes())
      const diff = now.getTime() - date.getTime()
      if (diff < 60 * 1000) {
        return '刚刚'
      }
      if (diff < 60 * 60 * 1000) {
        return Math.floor(diff / 60000) + ' 分钟前'
      }
      if (date.toDateString() === now.toDateString()) {
        return hm
      }
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      if (date.toDateString() === yesterday.toDateString()) {
        return '昨天 ' + hm
      }
      const monthDay = (date.getMonth() + 1) + '月' + date.getDate() + '日'
      if (date.getFullYear() === now.getFullYear()) {
        return monthDay + ' ' + hm
      }
      return date.getFullYear() + '年' + monthDay
    }
  }
}
</script>

<style scoped>
.board {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  margin-bottom: 16px;
  overflow: hidden;
}

.board-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: linear-gradient(120deg, #f5f3ff 0%, #eef9ff 100%);
}

.board-head-left {
  display: flex;
  align-items: center;
  min-width: 0;
}

.board-logo {
  font-size: 22px;
  margin-right: 10px;
  line-height: 1;
}

.board-title {
  position: relative;
  margin: 0;
  padding: 0 2px 3px;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 4px;
  line-height: 1.1;
  color: #6d5bff;
  background: linear-gradient(100deg, #4f46e5 0%, #8b5cf6 42%, #ec4899 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* 艺术字底部的一抹流光 */
.board-title::after {
  content: '';
  position: absolute;
  left: 2px;
  right: 2px;
  bottom: -1px;
  height: 5px;
  border-radius: 3px;
  background: linear-gradient(90deg, rgba(79, 70, 229, 0.35) 0%, rgba(236, 72, 153, 0.35) 100%);
  -webkit-mask-image: linear-gradient(90deg, #000 0%, #000 62%, transparent 100%);
  mask-image: linear-gradient(90deg, #000 0%, #000 62%, transparent 100%);
}

.board-refresh {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.85);
  color: #6b7280;
  font-size: 14px;
  cursor: pointer;
  transition: transform 0.2s, color 0.2s;
}

.board-refresh:hover {
  color: #5b6bff;
}

.board-refresh.busy {
  animation: board-spin 1s linear infinite;
}

@keyframes board-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.board-body {
  height: 360px;
  overflow-y: auto;
  padding: 12px 16px 4px;
  background: #fafbfd;
  scroll-behavior: smooth;
}

.board-more {
  text-align: center;
  font-size: 12px;
  color: #b6bccb;
  padding: 6px 0 12px;
  user-select: none;
}

.board-more.clickable {
  color: #98a0b3;
  cursor: pointer;
}

.board-more.clickable:hover {
  color: #5b6bff;
}

.board-empty {
  padding: 70px 0;
  text-align: center;
  color: #b6bccb;
}

.board-empty-emoji {
  font-size: 34px;
  margin-bottom: 8px;
}

.board-empty p {
  margin: 0;
  font-size: 13px;
}

.board-row {
  display: flex;
  align-items: flex-start;
  margin-bottom: 14px;
}

.board-row.mine {
  flex-direction: row-reverse;
}

.board-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #fff;
  object-fit: contain;
  flex-shrink: 0;
}

.board-avatar-text {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 600;
}

.board-main {
  max-width: 76%;
  margin: 0 10px;
  min-width: 0;
}

.board-row.mine .board-main {
  text-align: right;
}

.board-meta {
  font-size: 11px;
  color: #a8aeba;
  margin-bottom: 4px;
}

.board-row.mine .board-meta {
  text-align: right;
}

.board-time {
  letter-spacing: 0.5px;
}

.board-bubble {
  display: inline-block;
  padding: 8px 12px;
  border-radius: 12px 12px 12px 4px;
  font-size: 13px;
  line-height: 1.55;
  text-align: left;
  white-space: pre-wrap;
  word-break: break-word;
}

.board-bubble.mine {
  border-radius: 12px 12px 4px 12px;
}

.board-foot {
  display: flex;
  align-items: center;
  padding: 12px 16px 14px;
  background: #fff;
  border-top: 1px solid #f0f2f7;
}

.board-input {
  flex: 1;
  resize: none;
  height: 40px;
  padding: 9px 14px;
  border: 1px solid #eceff5;
  border-radius: 20px;
  background: #f7f8fa;
  font-size: 13px;
  line-height: 20px;
  color: #303133;
  outline: none;
  font-family: inherit;
  transition: border-color 0.2s, background 0.2s;
}

.board-input:focus {
  border-color: #c7d2ff;
  background: #fff;
}

.board-send {
  flex-shrink: 0;
  margin-left: 10px;
  height: 40px;
  padding: 0 22px;
  border: none;
  border-radius: 20px;
  background: linear-gradient(120deg, #5b6bff 0%, #7c3aed 100%);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.board-send:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .board-body {
    height: 300px;
  }

  .board-main {
    max-width: 82%;
  }
}
</style>
