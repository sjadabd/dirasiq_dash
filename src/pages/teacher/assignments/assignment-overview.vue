<template>
  <div>
    <!-- Header -->
    <AppBreadcrumbs :items="breadcrumbItems" />

    <VCard class="my-4" elevation="3" rounded="lg">
      <VCardTitle class="d-flex align-center py-4 px-6">
        <VIcon icon="ri-file-list-3-line" color="primary" class="me-2" size="24" />
        <h3 class="text-h5 font-weight-bold">تفاصيل الواجب</h3>
        <VSpacer />
        <VBtn variant="tonal" prepend-icon="ri-arrow-go-back-line" @click="$router.back()">رجوع</VBtn>
      </VCardTitle>
      <VDivider />
      <VCardText>
        <VRow>
          <!-- Left: Assignment core info -->
          <VCol cols="12" md="8">
            <VCard variant="tonal" class="mb-4">
              <VCardTitle class="d-flex align-center">
                <VIcon class="me-2">ri-task-line</VIcon>
                <span class="text-h6">{{ assignment?.title || '-' }}</span>
                <VSpacer />
                <VChip :color="assignment?.is_active ? 'success' : 'error'" size="small" variant="flat">
                  {{ assignment?.is_active ? 'مفعل' : 'معطل' }}
                </VChip>
              </VCardTitle>
              <VDivider />
              <VCardText>
                <VRow>
                  <VCol cols="12">
                    <div class="text-subtitle-2 mb-1">الوصف</div>
                    <div class="text-body-2" style="white-space: pre-wrap;">{{ assignment?.description || '—' }}</div>
                  </VCol>
                  <VCol cols="12" md="6">
                    <div class="text-subtitle-2 mb-1">تاريخ الإسناد</div>
                    <div class="text-body-2">{{ formatDateTime(assignment?.assigned_date) || '—' }}</div>
                  </VCol>
                  <VCol cols="12" md="6">
                    <div class="text-subtitle-2 mb-1">تاريخ التسليم</div>
                    <div class="text-body-2">{{ formatDateTime(assignment?.due_date) || '—' }}</div>
                  </VCol>
                  <VCol cols="12" md="6">
                    <div class="text-subtitle-2 mb-1">طريقة التسليم</div>
                    <div class="text-body-2">{{ submissionTypeLabel(assignment?.submission_type) }}</div>
                  </VCol>
                  <VCol cols="12" md="6">
                    <div class="text-subtitle-2 mb-1">الدرجة القصوى</div>
                    <div class="text-body-2">{{ assignment?.max_score ?? '—' }}</div>
                  </VCol>
                  <VCol cols="12">
                    <div class="text-subtitle-2 mb-2">المرفقات</div>
                    <VRow v-if="Array.isArray(assignment?.attachments?.files) && assignment.attachments.files.length"
                      class="ga-2">
                      <VCol v-for="(f, i) in assignment.attachments.files" :key="i" cols="12" sm="6" md="4">
                        <div v-if="(f.type || '').toLowerCase() === 'image'">
                          <VImg :src="resolveUrl(f.url)" :alt="f.name" height="160" cover class="rounded"
                            style="cursor: pointer;" @click="openImage({ url: f.url, name: f.name })" />
                        </div>
                        <div v-else>
                          <VBtn :href="resolveUrl(f.url)" target="_blank" rel="noopener" variant="tonal" size="small"
                            prepend-icon="ri-attachment-2">
                            {{ f.name || 'ملف' }}
                          </VBtn>
                        </div>
                      </VCol>
                    </VRow>
                    <div v-else class="text-caption text-medium-emphasis">لا توجد مرفقات</div>
                  </VCol>

                  <VCol cols="12" v-if="Array.isArray(assignment?.resources) && assignment.resources.length">
                    <div class="text-subtitle-2 mb-2">الموارد</div>
                    <div class="d-flex flex-wrap ga-2">
                      <VBtn v-for="(r, idx) in assignment.resources" :key="idx" :href="r.url" target="_blank"
                        rel="noopener" size="small" variant="outlined" prepend-icon="ri-link-m">
                        {{ r.title || r.url }}
                      </VBtn>
                    </div>
                  </VCol>
                </VRow>
              </VCardText>
            </VCard>

            <!-- Submissions -->
            <VCard variant="tonal">
              <VCardTitle class="d-flex align-center">
                <VIcon class="me-2">ri-file-upload-line</VIcon>
                <span class="text-h6">تسليمات الطلاب</span>
                <VSpacer />
                <VChip size="small" variant="flat" style="color: white;">{{ submissions.length }} تسليم</VChip>
              </VCardTitle>
              <VDivider />
              <VCardText>
                <VRow class="ga-3">
                  <VCol v-for="sub in submissions" :key="sub.id" cols="12">
                    <VCard>
                      <VCardText>
                        <div class="d-flex align-center justify-space-between flex-wrap mb-2">
                          <div class="d-flex align-center ga-2">
                            <VIcon size="18">ri-user-line</VIcon>
                            <span class="text-subtitle-2">{{ sub.student?.name || 'طالب' }}</span>
                          </div>
                          <div class="d-flex align-center ga-2">
                            <VChip size="x-small"
                              :color="sub.status === 'graded' ? 'success' : (sub.status === 'submitted' ? 'primary' : 'default')"
                              variant="flat">
                              {{ sub.status }}
                            </VChip>
                            <span class="text-caption">{{ formatDateTime(sub.submitted_at) }}</span>
                          </div>
                        </div>
                        <div v-if="sub.content_text" class="mb-2">
                          <strong>النص:</strong>
                          <div class="text-body-2 mt-1" style="white-space: pre-wrap;">{{ sub.content_text }}</div>
                        </div>
                        <div v-if="sub.link_url" class="mb-2">
                          <strong>رابط:</strong>
                          <a :href="sub.link_url" target="_blank" rel="noopener" class="ms-1">فتح الرابط</a>
                        </div>
                        <div v-if="Array.isArray(sub.attachments) && sub.attachments.length" class="mb-2">
                          <strong class="d-block mb-1">المرفقات:</strong>
                          <VRow class="ga-2">
                            <VCol v-for="(att, i) in sub.attachments" :key="i" cols="12" sm="6" md="4">
                              <div v-if="(att.type || '').toLowerCase() === 'image'">
                                <VImg :src="resolveUrl(att.url)" :alt="att.name" height="140" cover class="rounded"
                                  style="cursor: pointer;" @click="openImage(att)" />
                              </div>
                              <div v-else>
                                <VBtn :href="resolveUrl(att.url)" target="_blank" rel="noopener" variant="tonal"
                                  size="small" prepend-icon="ri-attachment-2">
                                  {{ att.name || 'ملف' }}
                                </VBtn>
                              </div>
                            </VCol>
                          </VRow>
                        </div>
                        <div class="d-flex align-center ga-3">
                          <div><strong>الدرجة:</strong> {{ sub.score ?? '—' }} / {{ assignment?.max_score ?? '—' }}
                          </div>
                          <div v-if="sub.feedback"><strong>ملاحظات:</strong> {{ sub.feedback }}</div>
                        </div>
                      </VCardText>
                    </VCard>
                  </VCol>
                </VRow>
              </VCardText>
            </VCard>
          </VCol>

          <!-- Right: Meta -->
          <VCol cols="12" md="4">
            <VCard variant="tonal" class="mb-4">
              <VCardTitle class="d-flex align-center">
                <VIcon class="me-2">ri-team-line</VIcon>
                <span class="text-h6">المستلمون</span>
              </VCardTitle>
              <VDivider />
              <VCardText>
                <div class="d-flex flex-wrap ga-2">
                  <VChip v-for="r in recipients" :key="r.id" size="small" color="primary" variant="outlined">
                    {{ r.name }}
                  </VChip>
                </div>
              </VCardText>
            </VCard>
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <!-- Image Preview Dialog -->
    <VDialog v-model="imagePreview.open" max-width="900">
      <VCard>
        <VCardTitle class="d-flex align-center">
          <VIcon class="me-2">ri-image-line</VIcon>
          <span class="text-h6">{{ imagePreview.title || 'معاينة الصورة' }}</span>
          <VSpacer />
          <VBtn icon variant="text" @click="closeImage">
            <VIcon>ri-close-line</VIcon>
          </VBtn>
        </VCardTitle>
        <VDivider />
        <VCardText>
          <VImg :src="imagePreview.src" :alt="imagePreview.title" height="70vh" contain class="rounded" />
        </VCardText>
        <VDivider />
        <VCardActions>
          <VSpacer />
          <VBtn :href="imagePreview.src" target="_blank" rel="noopener" variant="tonal"
            prepend-icon="ri-download-2-line">فتح/تحميل</VBtn>
          <VBtn color="primary" @click="closeImage">إغلاق</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<script>
import TeacherApi from '@/api/teacher/teacher_api';

export default {
  name: 'teacher-assignments-assignment-overview',
  data() {
    return {
      breadcrumbItems: [
        { title: 'الرئيسية', disabled: false, to: '/teacher/index' },
        { title: 'الواجبات', disabled: false, to: '/teacher/assignments/manage-assignments' },
        { title: 'تفاصيل الواجب', disabled: true },
      ],
      loading: false,
      assignment: null,
      recipients: [],
      submissions: [],
      imagePreview: { open: false, src: '', title: '' },
    };
  },
  created() {
    const id = this.$route.query.id;
    if (id) this.fetchOverview(id);
  },
  methods: {
    async fetchOverview(id) {
      try {
        this.loading = true;
        const res = await TeacherApi.getAssignmentOverview(id);
        const data = res?.data?.data || {};
        this.assignment = data.assignment || null;
        this.recipients = Array.isArray(data.recipients) ? data.recipients : [];
        this.submissions = Array.isArray(data.submissions) ? data.submissions : [];
      } catch (e) {
        // optional: show alert if available in layout
        console.error('Failed to fetch assignment overview', e?.response?.data || e);
      } finally {
        this.loading = false;
      }
    },
    formatDateTime(val) {
      if (!val) return '';
      const d = new Date(val);
      if (Number.isNaN(d.getTime())) return '';
      return d.toLocaleString('ar-IQ');
    },
    resolveUrl(url) {
      if (!url) return '';
      if (/^https?:\/\//i.test(url)) return url;
      try {
        const cfg = JSON.parse(localStorage.getItem('results') || '{}');
        const base = cfg?.content_url || 'http://localhost:3000';
        const full = new URL(url, base);
        return full.href;
      } catch {
        const base = 'http://localhost:3000';
        return (base.replace(/\/$/, '')) + (String(url).startsWith('/') ? '' : '/') + String(url);
      }
    },
    submissionTypeLabel(code) {
      const map = {
        paper: 'ورقي',
        online: 'إلكتروني',
        mixed: 'مختلط',
      };
      return map[String(code || '').toLowerCase()] || '—';
    },
    openImage(att) {
      const src = this.resolveUrl(att?.url);
      this.imagePreview = { open: true, src, title: att?.name || '' };
    },
    closeImage() { this.imagePreview.open = false; },
  },
};
</script>

<style scoped>
.text-subtitle-2 {
  font-weight: 600;
}
</style>
