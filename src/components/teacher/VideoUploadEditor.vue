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
          <video
            :poster="'https://api.mulhimiq.com' + existingVideo.thumbnailUrl"
            class="video-preview"
            controls
            preload="metadata"
          >
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

        <v-btn
          color="primary"
          variant="outlined"
          block
          @click="showUploadSection = true"
          prepend-icon="mdi-upload"
        >
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
        <v-file-input
          ref="fileInput"
          accept="video/*"
          variant="outlined"
          density="comfortable"
          prepend-icon="mdi-video"
          label="اختر فيديو"
          @change="onVideoSelected"
          :disabled="isUploading"
        />
        <div class="text-caption text-medium-emphasis mt-2">
          يدعم: MP4, MOV, AVI. يمكنك قص الفيديو بعد اختياره لتقليل الحجم
        </div>
        
        <!-- Add cancel button if existing video is present -->
        <v-btn
          v-if="existingVideo && showUploadSection"
          variant="text"
          class="mt-2"
          @click="showUploadSection = false"
        >
          إلغاء
        </v-btn>
      </div>

      <!-- Video Editor Section -->
      <div v-else-if="videoFile">
        <!-- Updated alert message -->
        <v-alert type="info" variant="tonal" class="mb-4">
          <div class="d-flex align-center">
            <v-icon class="me-2">mdi-information</v-icon>
            <span>قم بقص الفيديو لتقليل حجمه قبل الرفع. يمكنك اختيار الجزء الذي تريد رفعه فقط</span>
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
          <video
            ref="videoPlayer"
            :src="videoUrl"
            class="video-preview"
            @loadedmetadata="onVideoLoaded"
            @timeupdate="onTimeUpdate"
            controls
          ></video>
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

        <!-- Trim Controls -->
        <v-card variant="outlined" class="mb-4">
          <v-card-text>
            <div class="text-subtitle-2 mb-3">
              <v-icon size="small" class="me-1">mdi-content-cut</v-icon>
              قص الفيديو
            </div>
            
            <!-- Start Time -->
            <div class="mb-4">
              <div class="d-flex align-center justify-space-between mb-2">
                <span class="text-body-2">نقطة البداية</span>
                <v-chip size="small" color="primary">{{ formatTime(startTime) }}</v-chip>
              </div>
              <v-slider
                v-model="startTime"
                :max="endTime - 1"
                :min="0"
                :step="0.1"
                color="primary"
                track-color="grey-lighten-2"
                thumb-label
                @update:model-value="onStartTimeChange"
              >
                <template v-slot:thumb-label="{ modelValue }">
                  {{ formatTime(modelValue) }}
                </template>
              </v-slider>
            </div>

            <!-- End Time -->
            <div>
              <div class="d-flex align-center justify-space-between mb-2">
                <span class="text-body-2">نقطة النهاية</span>
                <v-chip size="small" color="primary">{{ formatTime(endTime) }}</v-chip>
              </div>
              <v-slider
                v-model="endTime"
                :max="originalDuration"
                :min="startTime + 1"
                :step="0.1"
                color="primary"
                track-color="grey-lighten-2"
                thumb-label
                @update:model-value="onEndTimeChange"
              >
                <template v-slot:thumb-label="{ modelValue }">
                  {{ formatTime(modelValue) }}
                </template>
              </v-slider>
            </div>

            <!-- Quick Actions -->
            <div class="d-flex gap-2 mt-4">
              <v-btn
                size="small"
                variant="outlined"
                @click="resetTrim"
                prepend-icon="mdi-restore"
              >
                إعادة تعيين
              </v-btn>
              <v-btn
                size="small"
                variant="outlined"
                @click="previewTrimmed"
                prepend-icon="mdi-play"
              >
                معاينة القص
              </v-btn>
            </div>
          </v-card-text>
        </v-card>

        <!-- Action Buttons -->
        <div class="d-flex gap-2">
          <v-btn
            color="primary"
            size="large"
            :loading="isUploading"
            :disabled="isUploading"
            @click="uploadVideo"
            prepend-icon="mdi-upload"
          >
            رفع الفيديو
          </v-btn>
          <v-btn
            variant="outlined"
            size="large"
            :disabled="isUploading"
            @click="cancelVideo"
            prepend-icon="mdi-close"
          >
            إلغاء
          </v-btn>
        </div>

        <!-- Upload Progress -->
        <v-progress-linear
          v-if="isUploading"
          :model-value="uploadProgress"
          color="primary"
          height="6"
          class="mt-4"
        ></v-progress-linear>
        <div v-if="isUploading" class="text-center text-caption mt-2">
          {{ uploadStatusText }}
        </div>
      </div>

      <!-- Success Message -->
      <v-alert
        v-if="uploadSuccess"
        type="success"
        variant="tonal"
        class="mt-4"
        closable
        @click:close="uploadSuccess = false"
      >
        تم رفع الفيديو بنجاح! جاري معالجته...
      </v-alert>

      <!-- Error Message -->
      <v-alert
        v-if="uploadError"
        type="error"
        variant="tonal"
        class="mt-4"
        closable
        @click:close="uploadError = ''"
      >
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
  },

  mounted() {
    this.loadExistingVideo();
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

    onVideoLoaded() {
      const video = this.$refs.videoPlayer;
      this.originalDuration = video.duration;
      this.endTime = video.duration;
      this.startTime = 0;
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

    onStartTimeChange(value) {
      const video = this.$refs.videoPlayer;
      if (video) {
        video.currentTime = value;
      }
    },

    onEndTimeChange(value) {
      // Optional: jump to end time for preview
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

      try {
        // Step 1: Trim video
        this.uploadStatusText = "جاري قص الفيديو...";
        this.uploadProgress = 20;
        
        const trimmedBlob = await this.trimVideo();
        
        // Step 2: Convert to Base64
        this.uploadStatusText = "جاري تحويل الفيديو...";
        this.uploadProgress = 50;
        
        const base64Video = await this.blobToBase64(trimmedBlob);
        
        // Step 3: Upload to server
        this.uploadStatusText = "جاري رفع الفيديو...";
        this.uploadProgress = 70;
        
        const payload = {
          videoBase64: base64Video,
          fileName: this.videoFile.name,
        };

        const response = await TeacherApi.uploadIntroVideo(payload);
        
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
              videoBitsPerSecond: 2500000, // 2.5 Mbps
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

  beforeUnmount() {
    if (this.videoUrl) {
      URL.revokeObjectURL(this.videoUrl);
    }
  },
};
</script>

<style scoped>
.video-container {
  position: relative;
  inline-size: 100%;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.video-preview {
  inline-size: 100%;
  block-size: auto;
  max-block-size: 400px;
  display: block;
}

/* Added styles for existing video container */
.existing-video-container {
  position: relative;
  inline-size: 100%;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}
</style>
