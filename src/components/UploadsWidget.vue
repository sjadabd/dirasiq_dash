<script setup>
// Floating "uploads in progress" tray. Sits in the corner across every
// authenticated page so a teacher can navigate away from the lesson
// dialog without losing visibility on their video uploads. Collapses
// to a small chip when the user wants to focus elsewhere.

import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUploadsStore } from '@/stores/uploads.js'

const store = useUploadsStore()
const router = useRouter()

const visible = computed(() => store.items.length > 0)

function go (slot) {
  if (!slot.courseId) return
  router.push(`/teacher/video-courses/${slot.courseId}`)
}

function statusBadge (status) {
  switch (status) {
  case 'uploading': return { color: 'primary',   label: 'يرفع'   }
  case 'syncing':   return { color: 'info',      label: 'مزامنة' }
  case 'completed': return { color: 'success',   label: 'تم'     }
  case 'failed':    return { color: 'error',     label: 'فشل'    }
  case 'cancelled': return { color: 'secondary', label: 'مُلغى'  }
  default:          return { color: 'default',   label: status   }
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="uploads-fade">
      <div
        v-if="visible"
        class="uploads-widget"
      >
        <!-- Header / collapsed chip -->
        <div
          class="uploads-header"
          @click="store.toggleExpanded()"
        >
          <div class="header-left">
            <VIcon
              :icon="store.isBusy ? 'ri-loader-2-line' : 'ri-checkbox-circle-line'"
              :class="{ spinning: store.isBusy }"
              :color="store.isBusy ? 'primary' : (store.failedCount ? 'error' : 'success')"
              size="18"
            />
            <span class="header-title">
              <template v-if="store.isBusy">
                جاري رفع {{ store.inFlightCount }} فيديو
              </template>
              <template v-else-if="store.failedCount">
                {{ store.failedCount }} رفع فاشل
              </template>
              <template v-else>
                اكتمل الرفع
              </template>
            </span>
          </div>
          <VIcon
            :icon="store.expanded ? 'ri-arrow-down-s-line' : 'ri-arrow-up-s-line'"
            size="18"
          />
        </div>

        <!-- Expanded body -->
        <Transition name="uploads-collapse">
          <div
            v-if="store.expanded"
            class="uploads-body"
          >
            <div
              v-for="slot in store.items"
              :key="slot.id"
              class="upload-row"
              :class="{ 'is-failed': slot.status === 'failed' }"
            >
              <div class="row-head">
                <button
                  type="button"
                  class="row-title"
                  :title="slot.courseTitle || ''"
                  @click="go(slot)"
                >
                  {{ slot.lessonTitle || slot.fileName || 'فيديو' }}
                </button>
                <VChip
                  size="x-small"
                  variant="tonal"
                  :color="statusBadge(slot.status).color"
                >
                  {{ statusBadge(slot.status).label }}
                </VChip>
              </div>
              <div
                v-if="slot.courseTitle"
                class="row-course"
              >
                <VIcon
                  icon="ri-folder-video-line"
                  size="11"
                />
                {{ slot.courseTitle }}
              </div>
              <VProgressLinear
                v-if="slot.status === 'uploading' || slot.status === 'syncing'"
                :model-value="slot.progress"
                :indeterminate="slot.status === 'syncing'"
                color="primary"
                height="4"
                rounded
                class="mt-1"
              />
              <div
                v-if="slot.errorMessage"
                class="row-err"
              >
                {{ slot.errorMessage }}
              </div>
              <div class="row-actions">
                <button
                  v-if="slot.status === 'uploading' || slot.status === 'syncing'"
                  type="button"
                  class="row-action danger"
                  @click="store.cancel(slot.id)"
                >
                  إلغاء
                </button>
                <button
                  v-else
                  type="button"
                  class="row-action"
                  @click="store.evict(slot.id)"
                >
                  إخفاء
                </button>
              </div>
            </div>

            <button
              v-if="!store.isBusy && store.items.length > 0"
              type="button"
              class="clear-btn"
              @click="store.clearFinished()"
            >
              مسح المكتمل
            </button>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.uploads-widget {
  position: fixed;
  bottom: 16px;
  inset-inline-end: 16px;
  z-index: 1300;
  width: 320px;
  max-width: calc(100vw - 24px);
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 10px 32px rgba(11,37,69,.18);
  border: 1px solid rgba(11,37,69,.08);
  overflow: hidden;
  font-family: inherit;
}
.uploads-header {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 10px 14px;
  background: #f8fafd;
  border-bottom: 1px solid rgba(11,37,69,.06);
  cursor: pointer;
  user-select: none;
}
.header-left { display: flex; align-items: center; gap: 8px; }
.header-title { font-weight: 700; font-size: 13px; color: #0B2545; }
.uploads-body {
  max-height: 60vh;
  overflow-y: auto;
  padding: 8px;
}
.upload-row {
  padding: 10px 12px;
  border: 1px solid rgba(11,37,69,.05);
  border-radius: 8px;
  margin-bottom: 6px;
  background: #fafbff;
}
.upload-row.is-failed { background: rgba(239,68,68,.04); border-color: rgba(239,68,68,.18); }
.row-head { display: flex; align-items: center; gap: 8px; }
.row-title {
  flex: 1; min-width: 0;
  background: transparent; border: 0; padding: 0;
  font-size: 13px; font-weight: 700; color: #0B2545;
  text-align: start;
  cursor: pointer;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.row-title:hover { text-decoration: underline; }
.row-course {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; color: #6b7280; margin-top: 2px;
}
.row-err {
  font-size: 11px; color: rgb(var(--v-theme-error));
  margin-top: 4px;
}
.row-actions {
  display: flex; justify-content: flex-end; gap: 6px;
  margin-top: 4px;
}
.row-action {
  background: transparent; border: 0;
  font-size: 11px; color: #6b7280;
  cursor: pointer; padding: 2px 4px;
}
.row-action:hover { color: #0B2545; }
.row-action.danger { color: rgb(var(--v-theme-error)); }
.clear-btn {
  width: 100%;
  background: transparent; border: 0;
  font-size: 12px; color: #6b7280;
  padding: 8px 4px; cursor: pointer;
}
.clear-btn:hover { color: #0B2545; }

.uploads-fade-enter-active,
.uploads-fade-leave-active { transition: opacity .2s ease, transform .2s ease; }
.uploads-fade-enter-from,
.uploads-fade-leave-to { opacity: 0; transform: translateY(8px); }
.uploads-collapse-enter-active,
.uploads-collapse-leave-active { transition: max-height .25s ease, opacity .2s; overflow: hidden; }
.uploads-collapse-enter-from,
.uploads-collapse-leave-to { max-height: 0; opacity: 0; }

.spinning { animation: spin 1.2s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
