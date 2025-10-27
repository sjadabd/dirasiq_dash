<template>
  <v-card>
    <v-card-title class="d-flex align-center gap-2">
      <v-icon color="primary">mdi-video</v-icon>
      فيديو التعريف (اختياري)
    </v-card-title>

    <v-card-text>
      <input ref="fileInputRef" type="file" accept="video/*" @change="onVideoSelected" style="display: none;"
        id="video-upload" />

      <!-- Enhanced existing video display with better HLS support -->
      <div v-if="existingVideoUrl && !videoFile" class="d-flex align-center justify-space-between mb-4">
        <div class="d-flex align-center gap-3">
          <v-avatar size="56" rounded>
            <v-img :src="videoPoster || existingVideoUrl" alt="thumbnail" />
          </v-avatar>
          <div>
            <div class="d-flex align-center gap-2">
              <v-chip size="small" color="success" v-if="introStatus === 'ready'">جاهز</v-chip>
              <v-chip size="small" color="warning" v-else-if="introStatus === 'processing'">قيد المعالجة</v-chip>
              <v-chip size="small" color="info" v-else>{{ introStatus || 'غير معروف' }}</v-chip>
            </div>
            <div class="text-caption text-medium-emphasis mt-1">
              المدة: {{ formatTime(introDuration || 0) }}
            </div>
          </div>
        </div>
        <div class="d-flex gap-2">
          <v-btn size="small" variant="tonal" color="primary" @click="previewExistingVideo">
            <v-icon start>mdi-play</v-icon>
            معاينة
          </v-btn>
          <v-btn size="small" variant="tonal" color="primary" @click="openFilePicker">
            <v-icon start>mdi-upload</v-icon>
            استبدال الفيديو
          </v-btn>
        </div>
      </div>

      <!-- Preview modal for existing video -->
      <v-dialog v-model="showPreviewDialog" max-width="800">
        <v-card>
          <v-card-title class="d-flex align-center justify-space-between">
            <span>معاينة الفيديو</span>
            <v-btn icon variant="text" @click="showPreviewDialog = false">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </v-card-title>
          <v-card-text>
            <div class="video-container rounded-lg overflow-hidden bg-black">
              <video ref="previewVideoRef" :poster="videoPoster || undefined" class="w-100"
                style="max-block-size: 500px;" controls playsinline />
            </div>
          </v-card-text>
        </v-card>
      </v-dialog>


      <!-- Upload Section -->
      <div v-if="!videoUrl" class="text-center py-12">
        <v-icon size="64" color="primary" class="mb-4">mdi-video</v-icon>
        <h3 class="text-h6 mb-2">ارفع فيديو تعريفي عنك</h3>
        <p class="text-body-2 text-medium-emphasis mb-4">
          يساعد الفيديو الطلاب على التعرف عليك بشكل أفضل
        </p>
        <v-btn color="primary" @click="openFilePicker">
          <v-icon start>mdi-upload</v-icon>
          اختر فيديو
        </v-btn>
        <p class="text-caption text-medium-emphasis mt-2">
          يدعم: MP4, MOV, AVI. الحد الأقصى للمدة: {{ formatTime(maxDuration) }}
        </p>
      </div>

      <!-- Video Editor Section (only for new/base64 selection) -->
      <div v-else-if="isEditable" class="d-flex flex-column gap-4">
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
                <p class="text-caption" style="color: white;">المدة بعد القص</p>
                <p class="text-h4 font-weight-bold" style="color: white;">{{ formatTime(trimmedDuration) }}</p>
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
                  style="position: absolute; background: rgba(0, 0, 0, 70%); block-size: 100%; inset-block-start: 0; inset-inline-start: 0;"
                  :style="{ width: `${selectionLeft}px` }" />

                <!-- Selection Box -->
                <div
                  style="position: absolute; block-size: 100%; border-block-end: 2px solid #2196f3; border-block-start: 2px solid #2196f3; inset-block-start: 0;"
                  :style="{
                    left: `${selectionLeft}px`,
                    width: `${selectionWidth}px`,
                  }">
                  <!-- Left Handle -->
                  <div class="handle-left"
                    style="position: absolute; display: flex; align-items: center; justify-content: center; border-radius: 4px 0 0 4px; background: #2196f3; block-size: 100%; cursor: ew-resize; inline-size: 12px; inset-block-start: 0; inset-inline-start: -6px; pointer-events: auto;"
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
                    style="position: absolute; display: flex; align-items: center; justify-content: center; border-radius: 0 4px 4px 0; background: #2196f3; block-size: 100%; cursor: ew-resize; inline-size: 12px; inset-block-start: 0; inset-inline-end: -6px; pointer-events: auto;"
                    @mousedown="(e) => startDrag('right', e)" @touchstart="(e) => startDrag('right', e)">
                    <div style=" background: rgba(255, 255, 255, 80%); block-size: 100%;inline-size: 2px;" />
                    <div
                      style="position: absolute; display: flex; align-items: center; justify-content: center; border: 2px solid white; border-radius: 50%; background: #2196f3; block-size: 28px; box-shadow: 0 2px 8px rgba(0, 0, 0, 30%); inline-size: 28px;">
                      <v-icon size="small" color="white">mdi-chevron-left</v-icon>
                    </div>
                  </div>
                </div>

                <!-- Right Dimmed Area -->
                <div style="position: absolute; background: rgba(0, 0, 0, 70%); block-size: 100%; inset-block-start: 0;"
                  :style="{
                    left: `${selectionLeft + selectionWidth}px`,
                    width: `${timelineWidth - selectionLeft - selectionWidth}px`,
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

        <!-- Enhanced upload section with trimming progress -->
        <div class="d-flex gap-2">
          <v-btn color="primary" :disabled="isUploading || !videoFile || isProcessing"
            :loading="isUploading || isProcessing" block @click="uploadVideo">
            <v-icon start>mdi-upload</v-icon>
            {{ getUploadButtonText() }}
          </v-btn>
          <v-btn variant="outlined" :disabled="isUploading || isProcessing" @click="cancelVideo">
            <v-icon start>mdi-close</v-icon>
            إلغاء
          </v-btn>
        </div>

        <!-- Processing Progress -->
        <v-card v-if="isProcessing" color="info" variant="tonal">
          <v-card-text>
            <div class="d-flex align-center gap-3">
              <v-progress-circular indeterminate color="info" size="24" />
              <div class="flex-grow-1">
                <p class="font-weight-medium mb-1">{{ processingStatus }}</p>
                <p class="text-caption text-medium-emphasis">قد يستغرق هذا بضع ثوانٍ...</p>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <!-- Upload Progress -->
        <v-progress-linear v-if="isUploading" :model-value="uploadProgress" color="primary" height="8" rounded />

        <!-- Success Alert -->
        <v-alert v-if="uploadSuccess" type="success" variant="tonal" density="compact">
          <template #prepend>
            <v-icon>mdi-check-circle</v-icon>
          </template>
          تم رفع الفيديو بنجاح! جاري معالجته على الخادم...
        </v-alert>

        <!-- Error Alert -->
        <v-alert v-if="uploadError" type="error" variant="tonal" density="compact" closable
          @click:close="uploadError = ''">
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
import teacherApi from '@/api/teacher/teacher_api.js';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

interface Props {
  maxDuration?: number
  minDuration?: number
  numberOfFrames?: number
}

// Helper: trim with timeout to avoid hanging forever on slow networks/CDN
const trimWithTimeout = async (
  file: File,
  start: number,
  duration: number,
  timeoutMs = 120000,
): Promise<Blob> => {
  return await Promise.race([
    trimVideoWithFFmpeg(file, start, duration),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('trim-timeout')), timeoutMs)
    ),
  ])
}

const props = withDefaults(defineProps<Props>(), {
  maxDuration: 120,
  minDuration: 1,
  numberOfFrames: 10,
})

// Refs
const videoFile = ref<File | null>(null)
const videoUrl = ref<string | null>(null)
const existingVideoUrl = ref<string | null>(null)
const videoPoster = ref<string | null>(null)
const introStatus = ref<string>('')
const introDuration = ref<number>(0)
let hlsInstance: any = null
const originalDuration = ref(0)
const startTime = ref(0)
const endTime = ref(0)
const isUploading = ref(false)
const uploadProgress = ref(0)
const uploadSuccess = ref(false)
const uploadError = ref('')
const wasAutoTrimmed = ref(false)

const ffmpegRef = ref<FFmpeg | null>(null)
let ffmpegLoadPromise: Promise<FFmpeg> | null = null
const isProcessing = ref(false)
const processingStatus = ref('')
const showPreviewDialog = ref(false)
const ffmpegReady = ref(false)

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
const previewVideoRef = ref<HTMLVideoElement | null>(null)
const timelineRef = ref<HTMLDivElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

// Computed
const trimmedDuration = computed(() => endTime.value - startTime.value)

const estimatedSize = computed(() => {
  if (!videoFile.value) return '0 MB'
  return formatBytes(videoFile.value.size * (trimmedDuration.value / originalDuration.value))
})

const isEditable = computed(() => {
  const url = videoUrl.value || ''
  return !!videoFile.value || url.startsWith('data:')
})

const getUploadButtonText = () => {
  if (isProcessing.value) return processingStatus.value
  if (isUploading.value) return `جاري الرفع... ${uploadProgress.value}%`
  return 'رفع الفيديو'
}

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

const loadFFmpeg = async () => {
  if (ffmpegRef.value) return ffmpegRef.value
  if (ffmpegLoadPromise) return ffmpegLoadPromise

  try {
    ffmpegLoadPromise = (async () => {
      console.log('[v0] بدء تحميل FFmpeg...')
      const ffmpeg = new FFmpeg()

      ffmpeg.on('log', ({ message }) => {
        console.log('[v0] FFmpeg log:', message)
      })

      ffmpeg.on('progress', ({ progress }) => {
        console.log('[v0] FFmpeg progress:', progress)
        if (isProcessing.value) {
          const percent = Math.round(progress * 100)
          processingStatus.value = `جاري قص الفيديو... ${percent}%`
        }
      })
    ffmpeg.on('progress', ({ progress }) => {
      console.log('[v0] FFmpeg progress:', progress)
      if (isProcessing.value) {
        const percent = Math.round(progress * 100)
        processingStatus.value = `جاري قص الفيديو... ${percent}%`
      }
    })

    const bases = [
      'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd',
      'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd',
    ]
    let loaded = false
    let lastErr: any = null
    for (const baseURL of bases) {
      try {
        console.log('[v0] جاري تحميل ملفات FFmpeg من:', baseURL)
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        })
        loaded = true
        break
      } catch (e) {
        lastErr = e
        console.warn('[v0] فشل تحميل FFmpeg من:', baseURL, e)
      }
    }
    if (!loaded) throw lastErr || new Error('لم يتمكن من تحميل FFmpeg')

      console.log('[v0] تم تحميل FFmpeg بنجاح')
      ffmpegRef.value = ffmpeg
      return ffmpeg
    })()
    const r = await ffmpegLoadPromise
    return r
  } catch (error) {
    console.error('[v0] FFmpeg load error:', error)
    throw new Error('فشل تحميل أداة معالجة الفيديو')
  }
}

const trimVideoWithFFmpeg = async (file: File, start: number, duration: number): Promise<Blob> => {
  try {
    console.log('[v0] بدء عملية القص:', { start, duration, fileSize: file.size })
    isProcessing.value = true
    processingStatus.value = 'جاري تحميل أداة المعالجة...'

    const ffmpeg = await loadFFmpeg()
    console.log('[v0] FFmpeg جاهز للاستخدام')

    processingStatus.value = 'جاري تحضير الفيديو...'

    // Write input file
    const inputName = 'input.mp4'
    const outputName = 'output.mp4'

    console.log('[v0] جاري كتابة ملف الإدخال...')
    const fileData = await fetchFile(file)
    console.log('[v0] حجم البيانات:', fileData.byteLength)
    await ffmpeg.writeFile(inputName, fileData)
    console.log('[v0] تم كتابة ملف الإدخال بنجاح')

    processingStatus.value = 'جاري قص الفيديو...'

    console.log('[v0] جاري تنفيذ أمر FFmpeg...')
await ffmpeg.exec([
  '-ss', start.toString(),
  '-i', inputName,
  '-t', duration.toString(),
  '-c', 'copy',     // لا تعيد الترميز
  '-avoid_negative_ts', 'make_zero',
  '-y',
  outputName
])
    console.log('[v0] تم تنفيذ أمر FFmpeg بنجاح')

    processingStatus.value = 'جاري حفظ الفيديو...'

    // Read output file
    console.log('[v0] جاري قراءة ملف الإخراج...')
    const data = await ffmpeg.readFile(outputName)
    console.log('[v0] حجم الإخراج:', data.byteLength)
    const blob = new Blob([data], { type: 'video/mp4' })

    // Cleanup
    console.log('[v0] جاري تنظيف الملفات المؤقتة...')
    await ffmpeg.deleteFile(inputName)
    await ffmpeg.deleteFile(outputName)
    console.log('[v0] تمت عملية القص بنجاح')

    return blob
  } catch (error) {
    console.error('[v0] FFmpeg trim error:', error)
    const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف'
    throw new Error(`فشل قص الفيديو: ${errorMessage}. يرجى المحاولة مرة أخرى أو اختيار فيديو آخر.`)
  } finally {
    isProcessing.value = false
    processingStatus.value = ''
  }
}

const fileToBase64 = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const res = reader.result
        if (typeof res === 'string' && res.startsWith('data:')) {
          resolve(res)
          return
        }
        // Fallback: read as ArrayBuffer and build data URL
        const abReader = new FileReader()
        abReader.onload = () => {
          try {
            const buf = abReader.result as ArrayBuffer
            const bytes = new Uint8Array(buf)
            let binary = ''
            for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
            const b64 = btoa(binary)
            const mime = file instanceof File ? (file.type || 'video/mp4') : 'video/mp4'
            resolve(`data:${mime};base64,${b64}`)
          } catch (e) {
            reject(e as any)
          }
        }
        abReader.onerror = () => reject(abReader.error || new Error('File read error (ArrayBuffer)'))
        abReader.readAsArrayBuffer(file)
      } catch (e) {
        reject(e as any)
      }
    }
    reader.onerror = () => reject(reader.error || new Error('File read error'))
    reader.readAsDataURL(file)
  })
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

const openFilePicker = () => {
  if (fileInputRef.value) fileInputRef.value.click()
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

  if (duration > props.maxDuration) {
    startTime.value = 0
    endTime.value = props.maxDuration
    wasAutoTrimmed.value = true
  } else {
    startTime.value = 0
    endTime.value = duration
    wasAutoTrimmed.value = false
  }

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
  if (videoFile.value && videoUrl.value && videoUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(videoUrl.value)
  }
  videoFile.value = null
  videoUrl.value = existingVideoUrl.value
  originalDuration.value = 0
  startTime.value = 0
  endTime.value = 0
  videoFrames.value = []
  uploadError.value = ''
  uploadSuccess.value = false
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

const uploadVideo = async () => {
  if (!videoFile.value) return

  isUploading.value = false
  uploadProgress.value = 0
  uploadError.value = ''
  uploadSuccess.value = false

  try {
    let fileToUpload: File = videoFile.value

    // Check if trimming is needed
    const needsTrimming = startTime.value > 0 || endTime.value < originalDuration.value
    console.log('[v0] هل يحتاج القص؟', needsTrimming, { start: startTime.value, end: endTime.value, original: originalDuration.value })

    if (needsTrimming) {
      try {
        console.log('[v0] بدء عملية القص...')
        const trimmedBlob = await trimWithTimeout(
          videoFile.value,
          startTime.value,
          trimmedDuration.value
        )
        console.log('[v0] تم القص بنجاح، الحجم الجديد:', trimmedBlob.size)
        const name = (videoFile.value.name.replace(/\.[^/.]+$/, '') || 'intro') + '.mp4'
        fileToUpload = new File([trimmedBlob], name, { type: 'video/mp4' })
      } catch (trimError) {
        console.error('[v0] خطأ في القص:', trimError)
        uploadError.value = 'تعذر قص الفيديو. يرجى التحقق من اتصال الإنترنت والمحاولة مجدداً.'
        isUploading.value = false
        isProcessing.value = false
        processingStatus.value = ''
        return
      }
    }

    // Build FormData (multipart)
    isUploading.value = true
    processingStatus.value = 'جاري رفع الفيديو...'

    const form = new FormData()
    form.append('video', fileToUpload)

    console.log('[v0] جاري إرسال الطلب إلى الخادم (multipart/form-data)...')
    await teacherApi.uploadIntroVideo(form, {
      timeout: 600000, // allow up to 10 minutes for server-side processing
      onUploadProgress: (e) => {
        if (e.total) {
          const progress = Math.round((e.loaded * 100) / e.total)
          uploadProgress.value = progress
          console.log('[v0] تقدم الرفع:', progress + '%')
        }
      },
    })

    console.log('[v0] تم الرفع بنجاح')
    uploadSuccess.value = true

    // Refresh existing video from server after successful upload
    await loadExistingVideo()

    // Clear the editor
    cancelVideo()

    setTimeout(() => {
      uploadSuccess.value = false
    }, 3000)
  } catch (err: any) {
    const status = err?.response?.status
    const errors = Array.isArray(err?.response?.data?.errors) ? err.response.data.errors.join('، ') : ''
    const msg = err?.response?.data?.message || err?.message || 'حدث خطأ أثناء رفع الفيديو'
    uploadError.value = [msg, errors].filter(Boolean).join(' - ')
    console.error('[v0] upload error', { status, data: err?.response?.data, err })
  } finally {
    isUploading.value = false
    isProcessing.value = false
    processingStatus.value = ''
  }
}

const previewExistingVideo = async () => {
  showPreviewDialog.value = true
  await nextTick()

  const video = previewVideoRef.value
  if (!video || !existingVideoUrl.value) return

  const isM3u8 = existingVideoUrl.value.endsWith('.m3u8')

  if (!isM3u8) {
    video.src = existingVideoUrl.value
    return
  }

  // Setup HLS for preview
  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = existingVideoUrl.value
    return
  }

  try {
    const mod = await import('hls.js')
    const Hls = (mod as any).default || (mod as any)
    if (Hls && Hls.isSupported()) {
      const hls = new Hls()
      hls.loadSource(existingVideoUrl.value)
      hls.attachMedia(video)

      // Cleanup on dialog close
      watch(showPreviewDialog, (newVal) => {
        if (!newVal && hls) {
          hls.destroy()
        }
      })
    }
  } catch (error) {
    console.error('[v0] HLS preview error:', error)
  }
}

const loadExistingVideo = async () => {
  try {
    const res = await teacherApi.getIntroVideo()
    const base = res?.data?.content_url || ''
    const data = res?.data?.data || {}
    introStatus.value = data?.status || ''
    introDuration.value = Number(data?.durationSeconds || 0)
    const manifest = data?.manifestUrl ? `${base}${data.manifestUrl}` : null
    const thumb = data?.thumbnailUrl ? `${base}${data.thumbnailUrl}` : null
    if (manifest) {
      existingVideoUrl.value = manifest
      videoUrl.value = manifest
      videoPoster.value = thumb || null
      setupHlsIfNeeded()
    } else {
      existingVideoUrl.value = null
      videoPoster.value = null
      if (!videoFile.value) videoUrl.value = null
    }
  } catch (_) {
    // ignore if none exists
    existingVideoUrl.value = null
  }
}

const setupHlsIfNeeded = async () => {
  const video = videoRef.value
  if (!video || !videoUrl.value) return
  const isM3u8 = typeof videoUrl.value === 'string' && videoUrl.value.endsWith('.m3u8')
  if (!isM3u8) return

  if (hlsInstance) {
    try { hlsInstance.destroy() } catch (_) { }
    hlsInstance = null
  }

  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = videoUrl.value
    return
  }

  try {
    const mod = await import('hls.js')
    const Hls = (mod as any).default || (mod as any)
    if (Hls && Hls.isSupported()) {
      hlsInstance = new Hls()
      hlsInstance.loadSource(videoUrl.value)
      hlsInstance.attachMedia(video)
    }
  } catch (_) {
    // ignore
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
  loadExistingVideo()
  // Preload FFmpeg in background to make trimming fast when user uploads
  loadFFmpeg()
    .then(() => { ffmpegReady.value = true; console.log('[v0] FFmpeg preloaded') })
    .catch((e) => { console.warn('[v0] FFmpeg preload failed', e) })
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('touchend', stopDrag)

  if (videoUrl.value) {
    URL.revokeObjectURL(videoUrl.value)
  }
  if (hlsInstance) {
    try { hlsInstance.destroy() } catch (_) { }
    hlsInstance = null
  }
})

watch(videoUrl, () => {
  setupHlsIfNeeded()
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
