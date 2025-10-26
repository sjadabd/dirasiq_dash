<template>
  <v-card elevation="2">
    <v-card-title class="d-flex align-center">
      <v-icon color="primary" class="me-2">mdi-video-outline</v-icon>
      فيديو التعريف (اختياري)
    </v-card-title>
    <v-card-text>
      <!-- Display existing video if available -->
      <div v-if="!videoFile && existingVideo" class="mb-4">
        <v-alert type="success" variant="tonal" class="mb-4">
          <div class="d-flex align-center">
            <v-icon class="me-2">mdi-check-circle</v-icon>
            <span>لديك فيديو تعريفي محفوظ</span>
          </div>
        </v-alert>

        <div class="existing-video-container mb-4">
          <video :poster="'https://api.mulhimiq.com' + existingVideo.thumbnailUrl" class="video-preview" controls
            preload="metadata">
            <source :src="'https://api.mulhimiq.com' + existingVideo.manifestUrl" type="application/x-mpegURL" />
            المتصفح لا يدعم تشغيل الفيديو
          </video>
        </div>

        <v-row class="mb-4">
          <v-col cols="12" md="6">
            <v-card variant="tonal">
              <v-card-text class="text-center">
                <div class="text-caption text-medium-emphasis">المدة</div>
                <div class="text-h6">{{ formatTime(existingVideo.durationSeconds) }}</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="6">
            <v-card variant="tonal" color="success">
              <v-card-text class="text-center">
                <div class="text-caption">الحالة</div>
                <div class="text-h6">{{ getStatusText(existingVideo.status) }}</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <v-btn color="primary" variant="outlined" block @click="showUploadSection = true" prepend-icon="mdi-upload">
          رفع فيديو جديد
        </v-btn>
      </div>

      <!-- Upload Section -->
      <div v-if="(!existingVideo || showUploadSection) && !videoFile" class="text-center pa-8">
        <v-icon size="64" color="primary" class="mb-4">mdi-video-plus</v-icon>
        <div class="text-h6 mb-2">ارفع فيديو تعريفي عنك</div>
        <div class="text-body-2 text-medium-emphasis mb-4">
          يساعد الفيديو الطلاب على التعرف عليك بشكل أفضل
        </div>
        <v-file-input ref="fileInput" accept="video/*" variant="outlined" density="comfortable" prepend-icon="mdi-video"
          label="اختر فيديو" @change="onVideoSelected" :disabled="isUploading" />
        <div class="text-caption text-medium-emphasis mt-2">
          يدعم: MP4, MOV, AVI. يمكنك قص الفيديو بعد اختياره لتقليل الحجم
        </div>

        <!-- Add cancel button if existing video is present -->
        <v-btn v-if="existingVideo && showUploadSection" variant="text" class="mt-2" @click="showUploadSection = false">
          إلغاء
        </v-btn>
      </div>

      <!-- Video Editor Section -->
      <div v-else-if="videoFile">
        <!-- Updated alert message -->
        <v-alert type="info" variant="tonal" class="mb-4">
          <div class="d-flex align-center">
            <v-icon class="me-2">mdi-information</v-icon>
            <span>قم بقص الفيديو لتقليل حجمه قبل الرفع. اسحب المقابض لتحديد الجزء الذي تريد رفعه</span>
          </div>
        </v-alert>

        <!-- Display original file size warning if large -->
        <v-alert v-if="videoFile.size > 50 * 1024 * 1024" type="warning" variant="tonal" class="mb-4">
          <div class="d-flex align-center">
            <v-icon class="me-2">mdi-alert</v-icon>
            <span>حجم الفيديو الأصلي: {{ formatBytes(videoFile.size) }}. يرجى قص الفيديو لتقليل الحجم</span>
          </div>
        </v-alert>

        <!-- Video Preview -->
        <div class="video-container mb-4">
          <video ref="videoPlayer" :src="videoUrl" class="video-preview" @loadedmetadata="onVideoLoaded"
            @timeupdate="onTimeUpdate" controls></video>
        </div>
        
        <!-- Video Info -->
        <v-row class="mb-4">
          <v-col cols="12" md="4">
            <v-card variant="tonal">
              <v-card-text class="text-center">
                <div class="text-caption text-medium-emphasis">المدة الأصلية</div>
                <div class="text-h6">{{ formatTime(originalDuration) }}</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="4">
            <v-card variant="tonal" color="primary">
              <v-card-text class="text-center">
                <div class="text-caption">المدة بعد القص</div>
                <div class="text-h6">{{ formatTime(trimmedDuration) }}</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="4">
            <v-card variant="tonal">
              <v-card-text class="text-center">
                <div class="text-caption text-medium-emphasis">الحجم التقريبي</div>
                <div class="text-h6">{{ estimatedSize }}</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Timeline Trim Controls -->
        <v-card variant="outlined" class="mb-4">
          <v-card-text>
            <div class="text-subtitle-2 mb-3">
              <v-icon size="small" class="me-1">mdi-content-cut</v-icon>
              قص الفيديو
            </div>

            <!-- Timeline with Thumbnails -->
            <div class="timeline-container" ref="timelineContainer">
              <!-- Thumbnails Strip -->
              <div class="thumbnails-strip" ref="thumbnailsStrip">
                <canvas v-for="(thumb, index) in thumbnails" :key="index" :ref="el => { if (el) thumbnailRefs[index] = el }"
                  class="thumbnail-frame"
                  :style="{ width: thumbnailWidth + 'px' }"
                  ></canvas>
              </div>

              <!-- Trim Overlay -->
              <div class="trim-overlay">
                <!-- Left Dimmed Area -->
                <div class="dimmed-area left-dim" :style="{ width: leftDimWidth + 'px' }"></div>

                <!-- Selection Area -->
                <div class="selection-area" :style="{
                  left: leftDimWidth + 'px',
                  width: selectionWidth + 'px'
                }">
                  <!-- Left Handle -->
                  <div class="trim-handle left-handle" @mousedown="startDrag('start', $event)"
                    @touchstart="startDrag('start', $event)">
                    <div class="handle-line"></div>
                    <div class="handle-grip">
                      <v-icon size="small" color="white">mdi-chevron-right</v-icon>
                    </div>
                  </div>

                  <!-- Time Labels -->
                  <div class="time-labels">
                    <span class="start-time">{{ formatTime(startTime) }}</span>
                    <span class="end-time">{{ formatTime(endTime) }}</span>
                  </div>

                  <!-- Right Handle -->
                  <div class="trim-handle right-handle" @mousedown="startDrag('end', $event)"
                    @touchstart="startDrag('end', $event)">
                    <div class="handle-line"></div>
                    <div class="handle-grip">
                      <v-icon size="small" color="white">mdi-chevron-left</v-icon>
                    </div>
                  </div>
                </div>

                <!-- Right Dimmed Area -->
                <div class="dimmed-area right-dim" :style="{
                  left: (leftDimWidth + selectionWidth) + 'px',
                  width: rightDimWidth + 'px'
                }"></div>
              </div>
            </div>

            <!-- Quick Actions -->
            <div class="d-flex gap-2 mt-4">
              <v-btn size="small" variant="outlined" @click="resetTrim" prepend-icon="mdi-restore">
                إعادة تعيين
              </v-btn>
              <v-btn size="small" variant="outlined" @click="previewTrimmed" prepend-icon="mdi-play">
                معاينة القص
              </v-btn>
            </div>
          </v-card-text>
        </v-card>

        <!-- Action Buttons -->
        <div class="d-flex gap-2">
          <v-btn color="primary" size="large" :loading="isUploading" :disabled="isUploading" @click="uploadVideo"
            prepend-icon="mdi-upload">
            رفع الفيديو
          </v-btn>
          <v-btn variant="outlined" size="large" :disabled="isUploading" @click="cancelVideo" prepend-icon="mdi-close">
            إلغاء
          </v-btn>
        </div>

        <!-- Upload Progress -->
        <v-progress-linear v-if="isUploading" :model-value="uploadProgress" color="primary" height="6"
          class="mt-4"></v-progress-linear>
        <div v-if="isUploading" class="text-center text-caption mt-2">
          {{ uploadStatusText }}
        </div>
      </div>

      <!-- Success Message -->
      <v-alert v-if="uploadSuccess" type="success" variant="tonal" class="mt-4" closable
        @click:close="uploadSuccess = false">
        تم رفع الفيديو بنجاح! جاري معالجته...
      </v-alert>

      <!-- Error Message -->
      <v-alert v-if="uploadError" type="error" variant="tonal" class="mt-4" closable @click:close="uploadError = ''">
        {{ uploadError }}
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script>
import TeacherApi from "@/api/teacher/teacher_api";

export default {
  name: "VideoUploadEditor",

  data() {
    return {
      videoFile: null,
      videoUrl: null,
      originalDuration: 0,
      startTime: 0,
      endTime: 0,
      currentTime: 0,
      isUploading: false,
      uploadProgress: 0,
      uploadStatusText: "",
      uploadSuccess: false,
      uploadError: "",
      existingVideo: null,
      showUploadSection: false,
      thumbnails: [],
      thumbnailRefs: [],
      thumbnailWidth: 80,
      thumbnailCount: 10,
      isDragging: false,
      dragType: null, // 'start' or 'end'
      timelineWidth: 0,
    };
  },

  computed: {
    trimmedDuration() {
      return Math.max(0, this.endTime - this.startTime);
    },
    estimatedSize() {
      if (!this.videoFile) return "0 MB";
      const ratio = this.trimmedDuration / this.originalDuration;
      const estimatedBytes = this.videoFile.size * ratio;
      return this.formatBytes(estimatedBytes);
    },
    leftDimWidth() {
      if (!this.timelineWidth || !this.originalDuration) return 0;
      return (this.startTime / this.originalDuration) * this.timelineWidth;
    },
    selectionWidth() {
      if (!this.timelineWidth || !this.originalDuration) return this.timelineWidth;
      return (this.trimmedDuration / this.originalDuration) * this.timelineWidth;
    },
    rightDimWidth() {
      if (!this.timelineWidth) return 0;
      return this.timelineWidth - this.leftDimWidth - this.selectionWidth;
    },
  },

  mounted() {
    this.loadExistingVideo();
    document.addEventListener('mousemove', this.onDrag);
    document.addEventListener('mouseup', this.stopDrag);
    document.addEventListener('touchmove', this.onDrag);
    document.addEventListener('touchend', this.stopDrag);
    window.addEventListener('resize', this.updateTimelineWidth);
  },

  beforeUnmount() {
    if (this.videoUrl) {
      URL.revokeObjectURL(this.videoUrl);
    }
    document.removeEventListener('mousemove', this.onDrag);
    document.removeEventListener('mouseup', this.stopDrag);
    document.removeEventListener('touchmove', this.onDrag);
    document.removeEventListener('touchend', this.stopDrag);
    window.removeEventListener('resize', this.updateTimelineWidth);
  },

  methods: {
    loadExistingVideo() {
      try {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user.introVideo && user.introVideo.status === "ready") {
            // Construct full URLs if needed
            const baseUrl = process.env.VUE_APP_API_BASE_URL || "";
            this.existingVideo = {
              status: user.introVideo.status,
              manifestUrl: baseUrl + user.introVideo.manifestUrl,
              thumbnailUrl: baseUrl + user.introVideo.thumbnailUrl,
              durationSeconds: user.introVideo.durationSeconds,
            };
          }
        }
      } catch (error) {
        console.error("[v0] Error loading existing video:", error);
      }
    },

    getStatusText(status) {
      const statusMap = {
        ready: "جاهز",
        processing: "قيد المعالجة",
        failed: "فشل",
      };
      return statusMap[status] || status;
    },

    onVideoSelected(event) {
      const file = event.target?.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith("video/")) {
        this.uploadError = "يرجى اختيار ملف فيديو صالح";
        return;
      }

      this.videoFile = file;
      this.videoUrl = URL.createObjectURL(file);
      this.uploadError = "";
      this.uploadSuccess = false;
    },

    async onVideoLoaded() {
      const video = this.$refs.videoPlayer;
      this.originalDuration = video.duration;
      this.endTime = video.duration;
      this.startTime = 0;

      // انتظر حتى يتم عرض التايم لاين
      await this.$nextTick();
      this.updateTimelineWidth();

      // إنشاء الصور المصغرة
      await this.generateThumbnails();
    },

    onTimeUpdate() {
      const video = this.$refs.videoPlayer;
      this.currentTime = video.currentTime;

      // Auto-pause at end time during preview
      if (this.currentTime >= this.endTime) {
        video.pause();
        video.currentTime = this.startTime;
      }
    },

    startDrag(type, event) {
      event.preventDefault();
      this.isDragging = true;
      this.dragType = type;
    },

    onDrag(event) {
      if (!this.isDragging || !this.dragType) return;

      event.preventDefault();
      const timeline = this.$refs.timelineContainer;
      if (!timeline) return;

      const rect = timeline.getBoundingClientRect();
      const clientX = event.touches ? event.touches[0].clientX : event.clientX;
      const x = Math.max(0, Math.min(clientX - rect.left, this.timelineWidth));
      const time = (x / this.timelineWidth) * this.originalDuration;

      if (this.dragType === 'start') {
        // لا تسمح بتجاوز نقطة النهاية
        this.startTime = Math.max(0, Math.min(time, this.endTime - 1));
        // تحديث موضع الفيديو
        const video = this.$refs.videoPlayer;
        if (video) {
          video.currentTime = this.startTime;
        }
      } else if (this.dragType === 'end') {
        // لا تسمح بتجاوز نقطة البداية
        this.endTime = Math.max(this.startTime + 1, Math.min(time, this.originalDuration));
      }
    },

    stopDrag() {
      this.isDragging = false;
      this.dragType = null;
    },

    updateTimelineWidth() {
      const timeline = this.$refs.timelineContainer;
      if (timeline) {
        this.timelineWidth = timeline.offsetWidth;
      }
    },

    async generateThumbnails() {
      const video = this.$refs.videoPlayer;
      if (!video || !this.originalDuration) return;

      // حساب عدد الصور المصغرة بناءً على عرض التايم لاين
      this.updateTimelineWidth();
      this.thumbnailCount = Math.floor(this.timelineWidth / this.thumbnailWidth);

      // إنشاء مصفوفة الصور المصغرة
      this.thumbnails = Array(this.thumbnailCount).fill(null);
      this.thumbnailRefs = [];

      await this.$nextTick();

      // إنشاء صورة مصغرة لكل نقطة زمنية
      for (let i = 0; i < this.thumbnailCount; i++) {
        const time = (i / (this.thumbnailCount - 1)) * this.originalDuration;
        await this.captureThumbnail(i, time);
      }
    },

    captureThumbnail(index, time) {
      return new Promise((resolve) => {
        const video = this.$refs.videoPlayer;
        const canvas = this.thumbnailRefs[index];

        if (!video || !canvas) {
          resolve();
          return;
        }

        video.currentTime = time;

        const onSeeked = () => {
          const ctx = canvas.getContext('2d');
          const aspectRatio = video.videoHeight / video.videoWidth;

          canvas.width = this.thumbnailWidth;
          canvas.height = this.thumbnailWidth * aspectRatio;

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          video.removeEventListener('seeked', onSeeked);
          resolve();
        };

        video.addEventListener('seeked', onSeeked);
      });
    },

    resetTrim() {
      this.startTime = 0;
      this.endTime = this.originalDuration;
      const video = this.$refs.videoPlayer;
      if (video) {
        video.currentTime = 0;
      }
    },

    previewTrimmed() {
      const video = this.$refs.videoPlayer;
      if (video) {
        video.currentTime = this.startTime;
        video.play();
      }
    },

    async uploadVideo() {
      if (!this.videoFile) return;

      this.isUploading = true;
      this.uploadProgress = 0;
      this.uploadStatusText = "جاري تحضير الفيديو...";
      this.uploadError = "";

      // Pause any playing preview to avoid background playback during upload
      const preview = this.$refs.videoPlayer;
      if (preview && !preview.paused) {
        preview.pause();
      }

      try {
        // Step 1: Trim video
        this.uploadStatusText = "جاري قص الفيديو...";
        this.uploadProgress = 20;

        const trimmedBlob = await this.trimVideo();

        this.uploadStatusText = "جاري رفع الفيديو...";
        this.uploadProgress = 50;

        const formData = new FormData();
        const ext = (this.videoFile.name.split('.').pop() || 'webm').toLowerCase();
        const safeName = this.videoFile.name ? this.videoFile.name.replace(/[^\w\-.]+/g, '_') : `intro_video.${ext}`;
        const file = new File([trimmedBlob], safeName, { type: trimmedBlob.type || 'video/webm' });
        formData.append('video', file);

        const response = await TeacherApi.uploadIntroVideo(formData, {
          timeout: 300000,
          onUploadProgress: (e) => {
            if (e && e.total) {
              const ratio = e.loaded / e.total;
              const percent = Math.min(99, Math.floor(50 + ratio * 50));
              this.uploadProgress = percent;
              this.uploadStatusText = `جاري رفع الفيديو... ${percent}%`;
            }
          },
        });

        this.uploadProgress = 100;
        this.uploadStatusText = "تم الرفع بنجاح!";
        this.uploadSuccess = true;

        this.updateLocalStorageVideo(response.data);

        // Emit success event to parent
        this.$emit("upload-success", response.data);

        // Reset after 2 seconds
        setTimeout(() => {
          this.resetUpload();
          this.loadExistingVideo(); // Reload to show new video
          this.showUploadSection = false;
        }, 2000);

      } catch (error) {
        console.error("[v0] Upload error:", error);
        this.uploadError = error.response?.data?.message || "حدث خطأ أثناء رفع الفيديو";
      } finally {
        this.isUploading = false;
      }
    },

    async trimVideo() {
      return new Promise((resolve, reject) => {
        const video = document.createElement("video");
        video.src = this.videoUrl;
        // Ensure background playback is silent
        video.muted = true;
        video.volume = 0;
        video.playsInline = true;
        video.setAttribute("muted", "");

        video.onloadedmetadata = async () => {
          try {
            // Create canvas for video processing
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            // Set canvas dimensions to video dimensions
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Use MediaRecorder to capture trimmed video
            const stream = canvas.captureStream(30); // 30 FPS
            const audioContext = new AudioContext();

            // Add audio track if available
            if (video.captureStream) {
              const videoStream = video.captureStream();
              const audioTracks = videoStream.getAudioTracks();
              if (audioTracks.length > 0) {
                stream.addTrack(audioTracks[0]);
              }
            }

            const mediaRecorder = new MediaRecorder(stream, {
              mimeType: "video/webm;codecs=vp8,opus",
              videoBitsPerSecond: 1000000,
            });

            const chunks = [];
            mediaRecorder.ondataavailable = (e) => {
              if (e.data.size > 0) {
                chunks.push(e.data);
              }
            };

            mediaRecorder.onstop = () => {
              const blob = new Blob(chunks, { type: "video/webm" });
              resolve(blob);
            };

            // Start recording
            mediaRecorder.start();
            video.currentTime = this.startTime;

            video.onseeked = () => {
              video.play();

              // Draw video frames to canvas
              const drawFrame = () => {
                if (video.currentTime >= this.endTime) {
                  video.pause();
                  mediaRecorder.stop();
                  return;
                }

                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                requestAnimationFrame(drawFrame);
              };

              drawFrame();
            };

          } catch (error) {
            reject(error);
          }
        };

        video.onerror = reject;
      });
    },

    blobToBase64(blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    },

    cancelVideo() {
      if (this.videoUrl) {
        URL.revokeObjectURL(this.videoUrl);
      }
      this.resetUpload();
      if (this.existingVideo) {
        this.showUploadSection = false;
      }
    },

    resetUpload() {
      this.videoFile = null;
      this.videoUrl = null;
      this.originalDuration = 0;
      this.startTime = 0;
      this.endTime = 0;
      this.uploadProgress = 0;
      this.uploadStatusText = "";
      this.thumbnails = [];
      this.thumbnailRefs = [];
      if (this.$refs.fileInput) {
        this.$refs.fileInput.reset();
      }
    },

    formatTime(seconds) {
      if (!seconds || isNaN(seconds)) return "00:00";
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    },

    formatBytes(bytes) {
      if (bytes === 0) return "0 Bytes";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
    },

    updateLocalStorageVideo(videoData) {
      try {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const user = JSON.parse(userStr);
          user.introVideo = videoData.introVideo || videoData;
          user.introVideoStatus = videoData.introVideo?.status || videoData.status;
          localStorage.setItem("user", JSON.stringify(user));
        }
      } catch (error) {
        console.error("[v0] Error updating localStorage:", error);
      }
    },
  },
};
</script>

<style scoped>
.video-container {
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  background: #000;
  inline-size: 100%;
}

.video-preview {
  display: block;
  block-size: auto;
  inline-size: 100%;
  max-block-size: 400px;
  object-fit: contain;
}

.existing-video-container {
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  background: #000;
  inline-size: 100%;
}

.timeline-container {
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  background: #1a1a1a;
  block-size: 80px;
  inline-size: 100%;
  user-select: none;
}

.thumbnails-strip {
  display: flex;
  block-size: 100%;
  inline-size: 100%;
}

.thumbnail-frame {
  flex-shrink: 0;
  block-size: 100%;
  border-inline-end: 1px solid rgba(255, 255, 255, 10%);
  object-fit: cover;
}

.trim-overlay {
  position: absolute;
  block-size: 100%;
  inline-size: 100%;
  inset-block-start: 0;
  inset-inline-start: 0;
  pointer-events: none;
}

.dimmed-area {
  position: absolute;
  background: rgba(0, 0, 0, 70%);
  block-size: 100%;
  inset-block-start: 0;
  pointer-events: none;
}

.left-dim {
  inset-inline-start: 0;
}

.right-dim {
  inset-inline-start: auto;
}

.selection-area {
  position: absolute;
  block-size: 100%;
  border-block: 3px solid #2196f3;
  inset-block-start: 0;
  pointer-events: none;
}

.trim-handle {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #2196f3;
  block-size: 100%;
  cursor: ew-resize;
  inline-size: 12px;
  inset-block-start: 0;
  pointer-events: auto;
  transition: background 0.2s;
}

.trim-handle:hover {
  background: #1976d2;
}

.trim-handle:active {
  background: #1565c0;
}

.left-handle {
  border-end-start-radius: 4px;
  border-start-start-radius: 4px;
  inset-inline-start: -6px;
}

.right-handle {
  border-end-end-radius: 4px;
  border-start-end-radius: 4px;
  inset-inline-end: -6px;
}

.handle-line {
  position: absolute;
  background: white;
  block-size: 100%;
  inline-size: 2px;
  inset-block-start: 0;
  inset-inline-start: 50%;
  transform: translateX(-50%);
}

.handle-grip {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: rgba(255, 255, 255, 20%);
  block-size: 30px;
  inline-size: 100%;
}

.time-labels {
  position: absolute;
  display: flex;
  justify-content: space-between;
  inline-size: 100%;
  inset-block-start: -24px;
  inset-inline-start: 0;
  padding-inline: 8px;
  pointer-events: none;
}

.start-time,
.end-time {
  border-radius: 4px;
  background: #2196f3;
  color: white;
  font-size: 12px;
  font-weight: 500;
  padding-block: 2px;
  padding-inline: 8px;
  white-space: nowrap;
}
</style>
