<template>
  <v-card>
    <v-card-title class="d-flex align-center gap-2">
      <v-icon color="primary">mdi-video</v-icon>
      فيديو التعريف (اختياري)
    </v-card-title>

    <v-card-text>
      <!-- Upload Section -->
      <div v-if="!videoFile" class="text-center py-12">
        <v-icon size="64" color="primary" class="mb-4">mdi-video</v-icon>
        <h3 class="text-h6 mb-2">ارفع فيديو تعريفي عنك</h3>
        <p class="text-body-2 text-medium-emphasis mb-4">
          يساعد الفيديو الطلاب على التعرف عليك بشكل أفضل
        </p>
        <input ref="fileInputRef" type="file" accept="video/*" @change="onVideoSelected" style="display: none;"
          id="video-upload" />
        <v-btn color="primary" @click="() => fileInputRef?.click()">
          <v-icon start>mdi-upload</v-icon>
          اختر فيديو
        </v-btn>
        <p class="text-caption text-medium-emphasis mt-2">
          يدعم: MP4, MOV, AVI. الحد الأقصى للمدة: {{ formatTime(maxDuration) }}
        </p>
      </div>

      <!-- Video Editor Section -->
      <div v-else class="d-flex flex-column gap-4">
        <!-- Auto-trim Alert -->
        <v-alert v-if="wasAutoTrimmed" type="warning" variant="tonal" density="compact">
          <template #prepend>
            <v-icon>mdi-alert</v-icon>
          </template>
          تم قص الفيديو تلقائياً إلى {{ formatTime(maxDuration) }} (الحد الأقصى المسموح).
          يمكنك تحريك المقطع المحدد إلى أي جزء من الفيديو باستخدام السحب.
        </v-alert>

        <v-alert v-else type="info" variant="tonal" density="compact">
          <template #prepend>
            <v-icon>mdi-information</v-icon>
          </template>
          اسحب الحدود لتحديد الجزء المطلوب، أو اسحب المنطقة الوسطى لتحريك المقطع بالكامل.
          الحد الأقصى: {{ formatTime(maxDuration) }}
        </v-alert>

        <!-- Large File Warning -->
        <v-alert v-if="videoFile && videoFile.size > 50 * 1024 * 1024" type="error" variant="tonal" density="compact">
          <template #prepend>
            <v-icon>mdi-alert</v-icon>
          </template>
          حجم الفيديو الأصلي: {{ formatBytes(videoFile.size) }}.
          يرجى قص الفيديو لتقليل الحجم
        </v-alert>

        <!-- Video Player -->
        <div class="video-container rounded-lg overflow-hidden bg-black">
          <video ref="videoRef" :src="videoUrl" class="w-100" style="max-block-size: 400px;" controls
            @loadedmetadata="onVideoLoaded" @timeupdate="onVideoTimeUpdate" />
        </div>

        <!-- Stats Cards -->
        <v-row>
          <v-col cols="12" md="4">
            <v-card>
              <v-card-text class="text-center">
                <p class="text-caption text-medium-emphasis">المدة الأصلية</p>
                <p class="text-h4 font-weight-bold">{{ formatTime(originalDuration) }}</p>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="4">
            <v-card color="primary">
              <v-card-text class="text-center">
                <p class="text-caption">المدة بعد القص</p>
                <p class="text-h4 font-weight-bold">{{ formatTime(trimmedDuration) }}</p>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="4">
            <v-card>
              <v-card-text class="text-center">
                <p class="text-caption text-medium-emphasis">الحجم التقريبي</p>
                <p class="text-h4 font-weight-bold">{{ estimatedSize }}</p>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Trimming Section -->
        <v-card>
          <v-card-text>
            <div class="d-flex align-center gap-2 mb-3">
              <v-icon size="small">mdi-content-cut</v-icon>
              <span class="text-body-2 font-weight-medium">قص الفيديو</span>
            </div>

            <!-- Instructions -->
            <v-alert type="info" variant="tonal" density="compact" class="mb-4">
              <div class="d-flex align-start gap-2">
                <v-icon size="small">mdi-information</v-icon>
                <div>
                  <p class="font-weight-medium mb-1">كيفية الاستخدام:</p>
                  <ul class="text-caption" style="list-style-position: inside;">
                    <li>اسحب الحدود اليمنى أو اليسرى لتغيير طول المقطع</li>
                    <li>اسحب المنطقة الوسطى (بين الحدود) لتحريك المقطع بالكامل</li>
                    <li>لا يمكن توسيع المقطع أكثر من {{ formatTime(maxDuration) }}</li>
                  </ul>
                </div>
              </div>
            </v-alert>

            <!-- Timeline -->
            <div ref="timelineRef" class="timeline-container rounded-lg overflow-hidden"
              style=" position: relative; background: #1a1a1a;block-size: 80px; user-select: none;">
              <!-- Video Frames -->
              <div class="d-flex h-100">
                <img v-for="(frame, index) in videoFrames" :key="index" :src="frame" :alt="`Frame ${index}`"
                  class="h-100" style=" border-inline-end: 1px solid rgba(255, 255, 255, 10%);object-fit: cover;"
                  :style="{ width: `${100 / numberOfFrames}%` }" />
              </div>

              <!-- Selection Overlay -->
              <div style="position: absolute; inset: 0; pointer-events: none;">
                <!-- Left Dimmed Area -->
                <div
                  style="position: absolute; background: rgba(0, 0, 0, 0.7); block-size: 100%; inset-block-start: 0; inset-inline-start: 0;"
                  :style="{ width: selectionLeft + 'px' }" />

                <!-- Selection Box -->
                <div
                  style="position: absolute; block-size: 100%; border-block-end: 2px solid #2196f3; border-block-start: 2px solid #2196f3; inset-block-start: 0; background: transparent;"
                  :style="{
                    left: selectionLeft + 'px',
                    width: selectionWidth + 'px',
                  }">
                  <!-- Left Handle -->
                  <div class="handle-left"
                    style="position: absolute; display: flex; align-items: center; justify-content: center; border-radius: 4px 0 0 4px; background: #2196f3; block-size: 100%; cursor: ew-resize; inline-size: 12px; inset-block-start: 0; left: -6px; pointer-events: auto;"
                    @mousedown="(e) => startDrag('left', e)" @touchstart="(e) => startDrag('left', e)">
                    <div style=" background: rgba(255, 255, 255, 80%); block-size: 100%;inline-size: 2px;" />
                    <div
                      style="position: absolute; display: flex; align-items: center; justify-content: center; border: 2px solid white; border-radius: 50%; background: #2196f3; block-size: 28px; box-shadow: 0 2px 8px rgba(0, 0, 0, 30%); inline-size: 28px;">
                      <v-icon size="small" color="white">mdi-chevron-right</v-icon>
                    </div>
                  </div>

                  <!-- Middle Draggable Area -->
                  <div class="handle-middle"
                    style="position: absolute; cursor: move; inset: 0; margin-block: 0; margin-inline: 12px; pointer-events: auto;"
                    @mousedown="(e) => startDrag('middle', e)" @touchstart="(e) => startDrag('middle', e)">
                    <div class="middle-hover"
                      style="position: absolute; display: flex; align-items: center; justify-content: center; inset: 0; opacity: 0; transition: opacity 0.2s;">
                      <div
                        style=" padding: 8px; border-radius: 50%;background: rgba(33, 150, 243, 90%); box-shadow: 0 2px 8px rgba(0, 0, 0, 30%);">
                        <v-icon color="white">mdi-arrow-all</v-icon>
                      </div>
                    </div>
                  </div>

                  <!-- Time Labels -->
                  <div
                    style="position: absolute; display: flex; justify-content: space-between; inset-block-start: -28px; inset-inline: 0; padding-block: 0; padding-inline: 8px; pointer-events: none;">
                    <span class="px-2 py-1 rounded text-caption font-weight-bold"
                      style="background: #2196f3; box-shadow: 0 2px 4px rgba(0, 0, 0, 20%); color: white;">
                      {{ formatTime(startTime) }}
                    </span>
                    <span class="px-2 py-1 rounded text-caption font-weight-bold"
                      style="background: #2196f3; box-shadow: 0 2px 4px rgba(0, 0, 0, 20%); color: white;">
                      {{ formatTime(endTime) }}
                    </span>
                  </div>

                  <!-- Right Handle -->
                  <div class="handle-right"
                    style="position: absolute; display: flex; align-items: center; justify-content: center; border-radius: 0 4px 4px 0; background: #2196f3; block-size: 100%; cursor: ew-resize; inline-size: 12px; inset-block-start: 0; right: -6px; pointer-events: auto;"
                    @mousedown="(e) => startDrag('right', e)" @touchstart="(e) => startDrag('right', e)">
                    <div style=" background: rgba(255, 255, 255, 80%); block-size: 100%;inline-size: 2px;" />
                    <div
                      style="position: absolute; display: flex; align-items: center; justify-content: center; border: 2px solid white; border-radius: 50%; background: #2196f3; block-size: 28px; box-shadow: 0 2px 8px rgba(0, 0, 0, 30%); inline-size: 28px;">
                      <v-icon size="small" color="white">mdi-chevron-left</v-icon>
                    </div>
                  </div>
                </div>

                <!-- Right Dimmed Area -->
                <div style="position: absolute; background: rgba(0, 0, 0, 0.7); block-size: 100%; inset-block-start: 0;"
                  :style="{
                    left: (selectionLeft + selectionWidth) + 'px',
                    width: Math.max(0, timelineWidth - selectionLeft - selectionWidth) + 'px',
                  }" />
              </div>
            </div>

            <!-- Duration Info -->
            <div class="d-flex align-center justify-space-between mt-4">
              <div class="d-flex align-center gap-2">
                <v-icon size="small" color="primary">mdi-clock-outline</v-icon>
                <span class="text-body-2 font-weight-medium">
                  المدة المحددة: {{ formatTime(trimmedDuration) }}
                </span>
                <span v-if="trimmedDuration === maxDuration" class="text-caption font-weight-medium"
                  style="color: #f57c00;">
                  (الحد الأقصى)
                </span>
              </div>
              <div v-if="originalDuration > maxDuration" class="text-caption text-medium-emphasis">
                من أصل {{ formatTime(originalDuration) }}
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="d-flex gap-2 mt-4">
              <v-btn variant="outlined" size="small" @click="resetTrim">
                <v-icon start>mdi-refresh</v-icon>
                إعادة تعيين
              </v-btn>
              <v-btn variant="outlined" size="small" @click="previewTrimmed">
                <v-icon start>mdi-play</v-icon>
                معاينة القص
              </v-btn>
            </div>
          </v-card-text>
        </v-card>

        <!-- Upload/Cancel Buttons -->
        <div class="d-flex gap-2">
          <v-btn color="primary" :disabled="isUploading" :loading="isUploading" block @click="uploadVideo">
            <v-icon start>mdi-upload</v-icon>
            {{ isUploading ? `جاري الرفع... ${uploadProgress}%` : 'رفع الفيديو' }}
          </v-btn>
          <v-btn variant="outlined" :disabled="isUploading" @click="cancelVideo">
            <v-icon start>mdi-close</v-icon>
            إلغاء
          </v-btn>
        </div>

        <!-- Upload Progress -->
        <v-progress-linear v-if="isUploading" :model-value="uploadProgress" color="primary" height="8" rounded />

        <!-- Success Alert -->
        <v-alert v-if="uploadSuccess" type="success" variant="tonal" density="compact">
          <template #prepend>
            <v-icon>mdi-check-circle</v-icon>
          </template>
          تم رفع الفيديو بنجاح! جاري معالجته...
        </v-alert>

        <!-- Error Alert -->
        <v-alert v-if="uploadError" type="error" variant="tonal" density="compact">
          <template #prepend>
            <v-icon>mdi-alert</v-icon>
          </template>
          {{ uploadError }}
        </v-alert>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import TeacherApi from '@/api/teacher/teacher_api';

interface Props {
  maxDuration?: number
  minDuration?: number
  numberOfFrames?: number
  maxFileSizeMB?: number
}

const props = withDefaults(defineProps<Props>(), {
  maxDuration: 120,
  minDuration: 1,
  numberOfFrames: 10,
  maxFileSizeMB: 50,
})

// Refs
const videoFile = ref<File | null>(null)
const videoUrl = ref<string | null>(null)
const originalDuration = ref(0)
const startTime = ref(0)
const endTime = ref(0)
const isUploading = ref(false)
const uploadProgress = ref(0)
const uploadSuccess = ref(false)
const uploadError = ref('')
const wasAutoTrimmed = ref(false)

// Timeline state
const videoFrames = ref<string[]>([])
const timelineWidth = ref(0)
const selectionLeft = ref(0)
const selectionWidth = ref(0)
const isDragging = ref(false)
const dragType = ref<'left' | 'right' | 'middle' | null>(null)
const dragStartX = ref(0)
const dragStartLeft = ref(0)
const dragStartWidth = ref(0)

// Element refs
const videoRef = ref<HTMLVideoElement | null>(null)
const timelineRef = ref<HTMLDivElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

// Computed
const trimmedDuration = computed(() => Math.max(0, endTime.value - startTime.value))

const estimatedSize = computed(() => {
  if (!videoFile.value) return '0 MB'
  return formatBytes(videoFile.value.size * (trimmedDuration.value / originalDuration.value))
})

// Methods
const formatTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '00:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

const onVideoSelected = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  if (!file.type.startsWith('video/')) {
    uploadError.value = 'يرجى اختيار ملف فيديو صالح'
    return
  }

  videoFile.value = file
  videoUrl.value = URL.createObjectURL(file)
  uploadError.value = ''
  uploadSuccess.value = false
}

const generateVideoFrames = async () => {
  const video = videoRef.value
  if (!video || !timelineRef.value) return

  const container = timelineRef.value
  const width = container.offsetWidth
  timelineWidth.value = width

  const frameWidth = Math.floor(width / props.numberOfFrames)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const aspectRatio = video.videoHeight / video.videoWidth
  canvas.width = frameWidth
  canvas.height = frameWidth * aspectRatio

  const frames: string[] = []

  for (let i = 0; i < props.numberOfFrames; i++) {
    const time = (i / (props.numberOfFrames - 1)) * originalDuration.value

    await new Promise<void>((resolve) => {
      video.currentTime = time
      video.onseeked = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        frames.push(canvas.toDataURL('image/jpeg', 0.7))
        resolve()
      }
    })
  }

  videoFrames.value = frames
  video.currentTime = startTime.value
}

const updateSelectionFromTime = () => {
  if (!timelineWidth.value || !originalDuration.value) return

  const startRatio = startTime.value / originalDuration.value
  const endRatio = endTime.value / originalDuration.value

  selectionLeft.value = startRatio * timelineWidth.value
  selectionWidth.value = (endRatio - startRatio) * timelineWidth.value
}

const updateTimeFromSelection = () => {
  if (!timelineWidth.value || !originalDuration.value) return

  const startRatio = selectionLeft.value / timelineWidth.value
  const endRatio = (selectionLeft.value + selectionWidth.value) / timelineWidth.value

  const newStartTime = Math.max(0, startRatio * originalDuration.value)
  let newEndTime = Math.min(originalDuration.value, endRatio * originalDuration.value)

  if (newEndTime - newStartTime < props.minDuration) {
    newEndTime = Math.min(originalDuration.value, newStartTime + props.minDuration)
  }

  startTime.value = newStartTime
  endTime.value = newEndTime
}

const onVideoLoaded = async () => {
  const video = videoRef.value
  if (!video) return

  const duration = video.duration
  originalDuration.value = duration

  // Auto-trim by duration cap
  let targetEnd = Math.min(duration, props.maxDuration)

  // Auto-trim by file size if needed
  if (videoFile.value && props.maxFileSizeMB && videoFile.value.size > props.maxFileSizeMB * 1024 * 1024) {
    const sizeRatio = (props.maxFileSizeMB * 1024 * 1024) / videoFile.value.size
    const sizeLimitedDuration = Math.max(props.minDuration, duration * sizeRatio)
    targetEnd = Math.min(targetEnd, sizeLimitedDuration)
    wasAutoTrimmed.value = true
  } else {
    wasAutoTrimmed.value = duration > props.maxDuration
  }

  startTime.value = 0
  endTime.value = Math.max(props.minDuration, targetEnd)

  await nextTick()
  setTimeout(() => {
    generateVideoFrames()
  }, 100)
}

const onVideoTimeUpdate = (event: Event) => {
  const video = event.target as HTMLVideoElement
  if (video.currentTime >= endTime.value) {
    video.pause()
    video.currentTime = startTime.value
  }
}

const startDrag = (type: 'left' | 'right' | 'middle', event: MouseEvent | TouchEvent) => {
  event.preventDefault()
  isDragging.value = true
  dragType.value = type
  dragStartX.value = 'touches' in event ? event.touches[0].clientX : event.clientX
  dragStartLeft.value = selectionLeft.value
  dragStartWidth.value = selectionWidth.value
}

const onDrag = (event: MouseEvent | TouchEvent) => {
  if (!isDragging.value || !dragType.value) return

  event.preventDefault()
  const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
  const deltaX = clientX - dragStartX.value

  const minWidthPx = (props.minDuration / originalDuration.value) * timelineWidth.value
  const maxWidthPx = (props.maxDuration / originalDuration.value) * timelineWidth.value

  if (dragType.value === 'left') {
    let newLeft = dragStartLeft.value + deltaX
    let newWidth = dragStartWidth.value - deltaX

    newLeft = Math.max(0, newLeft)
    newLeft = Math.min(newLeft, dragStartLeft.value + dragStartWidth.value - minWidthPx)
    newWidth = dragStartLeft.value + dragStartWidth.value - newLeft

    if (newWidth > maxWidthPx) {
      newWidth = maxWidthPx
      newLeft = dragStartLeft.value + dragStartWidth.value - maxWidthPx
    }

    selectionLeft.value = newLeft
    selectionWidth.value = newWidth
  } else if (dragType.value === 'right') {
    let newWidth = dragStartWidth.value + deltaX

    newWidth = Math.max(minWidthPx, newWidth)
    newWidth = Math.min(newWidth, timelineWidth.value - selectionLeft.value)

    if (newWidth > maxWidthPx) {
      newWidth = maxWidthPx
    }

    selectionWidth.value = newWidth
  } else if (dragType.value === 'middle') {
    let newLeft = dragStartLeft.value + deltaX

    newLeft = Math.max(0, newLeft)
    newLeft = Math.min(newLeft, timelineWidth.value - selectionWidth.value)

    selectionLeft.value = newLeft
  }
}

const stopDrag = () => {
  if (isDragging.value) {
    isDragging.value = false
    dragType.value = null
    updateTimeFromSelection()

    if (videoRef.value) {
      videoRef.value.currentTime = startTime.value
    }
  }
}

const resetTrim = () => {
  startTime.value = 0
  if (originalDuration.value > props.maxDuration) {
    endTime.value = props.maxDuration
    wasAutoTrimmed.value = true
  } else {
    endTime.value = originalDuration.value
    wasAutoTrimmed.value = false
  }

  if (videoRef.value) {
    videoRef.value.currentTime = 0
  }
}

const previewTrimmed = () => {
  if (videoRef.value) {
    videoRef.value.currentTime = startTime.value
    videoRef.value.play()
  }
}

const cancelVideo = () => {
  if (videoUrl.value) {
    URL.revokeObjectURL(videoUrl.value)
  }
  videoFile.value = null
  videoUrl.value = null
  originalDuration.value = 0
  startTime.value = 0
  endTime.value = 0
  videoFrames.value = []
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

const trimVideo = async (): Promise<Blob> => {
  // Render the selected range to a canvas and record via MediaRecorder
  return await new Promise<Blob>((resolve, reject) => {
    const src = videoUrl.value
    if (!src) return reject(new Error('لا يوجد فيديو'))

    const tmpVideo = document.createElement('video')
    tmpVideo.src = src
    tmpVideo.muted = true
    tmpVideo.volume = 0
    ;(tmpVideo as any).playsInline = true

    tmpVideo.onloadedmetadata = () => {
      try {
        const canvas = document.createElement('canvas')
        const w = tmpVideo.videoWidth || 640
        const h = tmpVideo.videoHeight || 360
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas context not available'))

        const stream = canvas.captureStream(30)
        // Try to attach audio from original video if present
        if ((tmpVideo as any).captureStream) {
          const vStream: MediaStream = (tmpVideo as any).captureStream()
          const audioTracks = vStream.getAudioTracks()
          if (audioTracks.length > 0) {
            stream.addTrack(audioTracks[0])
          }
        }

        const recorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp8,opus',
          videoBitsPerSecond: 1_000_000,
        })

        const chunks: BlobPart[] = []
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data)
        }
        recorder.onstop = () => {
          resolve(new Blob(chunks, { type: 'video/webm' }))
        }

        recorder.start()
        tmpVideo.currentTime = startTime.value
        tmpVideo.onseeked = () => {
          tmpVideo.play()
          const draw = () => {
            if (tmpVideo.currentTime >= endTime.value) {
              tmpVideo.pause()
              recorder.stop()
              return
            }
            ctx.drawImage(tmpVideo, 0, 0, w, h)
            requestAnimationFrame(draw)
          }
          draw()
        }
      } catch (err) {
        reject(err as any)
      }
    }
    tmpVideo.onerror = () => reject(new Error('تعذر فتح ملف الفيديو'))
  })
}

const uploadVideo = async () => {
  if (!videoFile.value) return

  isUploading.value = true
  uploadProgress.value = 0
  uploadError.value = ''

  try {
    // Pause preview while processing
    if (videoRef.value && !videoRef.value.paused) videoRef.value.pause()

    // Trim
    const trimmed = await trimVideo()

    // Prepare form data
    const ext = (videoFile.value.name.split('.').pop() || 'webm').toLowerCase()
    const safeName = videoFile.value.name.replace(/[^\w\-.]+/g, '_') || `intro_video.${ext}`
    const file = new File([trimmed], safeName, { type: trimmed.type || 'video/webm' })
    const form = new FormData()
    form.append('video', file)
    form.append('startTime', String(startTime.value))
    form.append('endTime', String(endTime.value))

    await TeacherApi.uploadIntroVideo(form, {
      timeout: 300000,
      onUploadProgress: (e: any) => {
        if (e && e.total) {
          const percent = Math.min(99, Math.floor((e.loaded / e.total) * 100))
          uploadProgress.value = percent
        }
      },
    })

    uploadProgress.value = 100
    uploadSuccess.value = true

    setTimeout(() => {
      cancelVideo()
      uploadSuccess.value = false
    }, 1500)
  } catch (error: any) {
    uploadError.value = error?.response?.data?.message || 'حدث خطأ أثناء رفع الفيديو'
  } finally {
    isUploading.value = false
  }
}

// Watchers
watch([startTime, endTime], () => {
  updateSelectionFromTime()
})

// Lifecycle
onMounted(() => {
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  document.addEventListener('touchmove', onDrag)
  document.addEventListener('touchend', stopDrag)

  // Initialize timeline width
  if (timelineRef.value) {
    timelineWidth.value = timelineRef.value.offsetWidth
  }
  window.addEventListener('resize', () => {
    if (timelineRef.value) {
      timelineWidth.value = timelineRef.value.offsetWidth
      updateSelectionFromTime()
    }
  })
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('touchend', stopDrag)

  if (videoUrl.value) {
    URL.revokeObjectURL(videoUrl.value)
  }
})
</script>

<style scoped>
.handle-middle:hover .middle-hover {
  opacity: 1;
}

.handle-left:hover,
.handle-right:hover {
  background: #1976d2 !important;
}

.video-container video {
  display: block;
  inline-size: 100%;
}
</style>
