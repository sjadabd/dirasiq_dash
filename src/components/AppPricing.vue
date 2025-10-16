<script setup>
import teacher_api from '@/api/teacher/teacher_api';
import { onMounted, ref } from 'vue';

// Props
const props = defineProps({
  title: { type: String, default: 'خطط التسعير' },
  cols: { type: [Number, String], default: 12 },
  sm: { type: [Number, String], default: 6 },
  md: { type: [Number, String], default: 4 },
  lg: { type: [Number, String], default: 4 },
  xl: { type: [Number, String], default: 4 },
});

// State
const pricingPlans = ref([]);
const loading = ref(false);
const snackbar = ref({
  show: false,
  message: '',
  color: 'error',
});

// 🔹 جلب بيانات الباقات من API
async function fetchPricingPlans() {
  loading.value = true;
  try {
    // جلب البيانات من API
    const res = await teacher_api.getActivePackages();

    // دعم Axios أو Fetch
    const payload = res.data?.data?.data || res.data?.data || res;
    const items = Array.isArray(payload?.data) ? payload.data : payload;

    // التأكد أن لدينا مصفوفة صحيحة
    if (!Array.isArray(items)) throw new Error('Invalid response data');

    // 🔸 تحويل البيانات إلى الشكل المستخدم في واجهة المستخدم
    const mapped = items.map((p) => {
      const isFree = p.isFree || p.price === 0;
      const formattedPrice = isFree ? 0 : p.price;

      return {
        id: p.id,
        name: p.name,
        tagLine: p.description || (isFree ? 'مجاناً للمعلمين الجدد' : 'ميزات متقدمة'),
        logo: isFree ? '/images/gift-icon.png' : '/images/star-icon.png',
        monthlyPrice: formattedPrice,
        yearlyPrice: formattedPrice * 12,
        isPopular: false,
        current: Boolean(p.current), // ✅ الباقة الحالية الحقيقية من السيرفر
        features: [
          `حتى ${p.maxStudents} طالب`,
          p.description || (isFree ? 'مجاناً للمعلمين الجدد' : 'ميزات متقدمة'),
          p.durationDays === 30 ? 'اشتراك شهري' : `اشتراك ${p.durationDays} يوم`,
          'دعم فني مخصص',
        ],
      };
    });

    // ✅ تحديد الباقة "الاحترافية" كباقة مميزة (الأكثر شعبية)
    const professionalIndex = mapped.findIndex(
      (pl) =>
        pl.name?.trim() === 'الباقة الاحترافية' ||
        pl.name?.toLowerCase().includes('professional')
    );

    if (professionalIndex !== -1) {
      mapped.forEach((pl) => (pl.isPopular = false));
      mapped[professionalIndex].isPopular = true;
    } else {
      // fallback: أول باقة مدفوعة
      const paidIndex = mapped.findIndex((pl) => pl.monthlyPrice !== 0);
      if (paidIndex !== -1) mapped[paidIndex].isPopular = true;
    }

    // ✅ حفظ النتائج في الحالة
    pricingPlans.value = mapped;
  } catch (err) {
    snackbar.value = {
      show: true,
      message: 'تعذر تحميل الباقات. يرجى المحاولة لاحقًا',
      color: 'error',
    };
    console.warn('⚠️ Failed to fetch pricing plans:', err);
  } finally {
    loading.value = false;
  }
}

// Fetch data on component mount
onMounted(() => {
  fetchPricingPlans();
});
</script>


<template>
  <div>
    <div class="text-center mb-6">
      <slot name="heading">
        <h3 class="text-h3 pricing-title pb-2">
          {{ props.title }}
        </h3>
      </slot>
      <slot name="subtitle">
        <p class="mb-0">
          تتضمن جميع الباقات أكثر من عدد طلاب. <br> اختر الباقة الأنسب لاحتياجاتك.
        </p>
      </slot>
    </div>

    <div v-if="loading" class="text-center py-10">
      <VProgressCircular indeterminate color="primary" size="64" />
      <p class="mt-4 text-body-1">جاري تحميل الباقات...</p>
    </div>

    <VRow v-else-if="pricingPlans.length > 0">
      <VCol v-for="plan in pricingPlans" :key="plan.id" :cols="props.cols" :sm="props.sm" :md="props.md" :lg="props.lg"
        :xl="props.xl">
        <VCard flat border :class="plan.isPopular ? 'border-primary border-opacity-100' : ''" class="h-100">
          <VCardText class="text-end pt-4" style="block-size: 3.75rem;">
            <VChip v-show="plan.isPopular" color="primary" size="small">
              الأكثر شعبية
            </VChip>
          </VCardText>

          <VCardText class="text-center">
            <VIcon :icon="plan.monthlyPrice === 0 ? 'mdi-gift' : 'mdi-star'"
              :color="plan.monthlyPrice === 0 ? 'success' : 'primary'" size="80" class="mb-5" />

            <h4 class="text-h4 mb-1">
              {{ plan.name }}
            </h4>
            <p class="mb-0 text-body-1">
              {{ plan.tagLine }}
            </p>
          </VCardText>

          <VCardText class="position-relative text-center">
            <div>
              <div class="d-flex justify-center align-center">
                <h1 class="text-h1 font-weight-medium text-primary">
                  {{ plan.monthlyPrice === 0 ? 'مجاناً' : new Intl.NumberFormat('ar-IQ').format(plan.monthlyPrice) }}
                </h1>
                <span v-if="plan.monthlyPrice !== 0" class="text-body-1 font-weight-medium align-self-end ms-2">
                  دينار/شهر
                </span>
              </div>

              <div v-if="plan.monthlyPrice !== 0" class="text-caption mt-2">
                {{ new Intl.NumberFormat('ar-IQ').format(plan.yearlyPrice) }} دينار/سنة
              </div>
            </div>
          </VCardText>

          <VCardText class="pt-2">
            <VList class="card-list pb-5">
              <VListItem v-for="(feature, index) in plan.features" :key="index">
                <template #prepend>
                  <VIcon :size="14" icon="mdi-check-circle" color="success" class="me-2" />
                </template>

                <VListItemTitle class="text-body-1">
                  {{ feature }}
                </VListItemTitle>
              </VListItem>
            </VList>

            <VBtn block :color="plan.current ? 'success' : 'primary'"
              :variant="plan.isPopular ? 'elevated' : 'outlined'" size="large">
              {{ plan.current ? 'باقتك الحالية' : (plan.monthlyPrice === 0 ? 'ابدأ مجاناً' : 'اشترك الآن') }}
            </VBtn>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <VCard v-else flat border class="text-center py-10">
      <VCardText>
        <VIcon icon="mdi-package-variant" size="64" color="grey" class="mb-4" />
        <h4 class="text-h5 mb-2">لا توجد باقات متاحة</h4>
        <p class="text-body-2 text-medium-emphasis">
          لم يتم العثور على أي باقات في الوقت الحالي
        </p>
        <VBtn color="primary" variant="outlined" class="mt-4" @click="fetchPricingPlans">
          إعادة المحاولة
        </VBtn>
      </VCardText>
    </VCard>

    <VSnackbar v-model="snackbar.show" :color="snackbar.color" location="top" :timeout="5000">
      {{ snackbar.message }}
      <template #actions>
        <VBtn variant="text" @click="snackbar.show = false">
          إغلاق
        </VBtn>
      </template>
    </VSnackbar>
  </div>
</template>

<style lang="scss" scoped>
.card-list {
  --v-card-list-gap: 1rem;
}

.pricing-title {
  font-weight: 700;
}

.h-100 {
  block-size: 100%;
}

.v-list-item-title {
  white-space: pre-line !important;
}
</style>
