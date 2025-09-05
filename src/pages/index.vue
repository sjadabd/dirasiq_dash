<template>
  <v-app :rtl="true">
    <!-- شريط علوي متطور -->
    <v-app-bar
      :color="isDark ? 'surface' : 'primary'"
      :theme="isDark ? 'dark' : 'light'"
      elevation="0"
      fixed
      class="navbar-glass"
    >
      <v-container>
        <v-row align="center" no-gutters>
          <v-col cols="auto">
            <div class="d-flex align-center">
              <v-icon size="32" class="me-3" color="primary">mdi-school</v-icon>
              <h1 class="text-h5 font-weight-bold">منصة دراسيق</h1>
            </div>
          </v-col>

          <v-spacer />

          <v-col cols="auto" class="d-none d-md-flex">
            <div class="d-flex align-center gap-2">
              <v-btn variant="text" @click="scrollToSection('features')"
                >المميزات</v-btn
              >
              <v-btn variant="text" @click="scrollToSection('how-it-works')"
                >كيف يعمل</v-btn
              >
              <v-btn variant="text" @click="scrollToSection('faq')"
                >الأسئلة الشائعة</v-btn
              >
            </div>
          </v-col>

          <v-col cols="auto">
            <div class="d-flex align-center gap-2">
              <!-- تبديل الثيم -->
              <v-btn
                :icon="isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
                variant="text"
                @click="toggleTheme"
              />

              <v-divider vertical class="mx-2" />

              <!-- أزرار تسجيل الدخول (عندما لا يكون المستخدم مسجل دخول) -->
              <template v-if="!isAuthenticated">
                <v-btn variant="outlined" @click="openLoginDialog">
                  <v-icon start>mdi-login</v-icon>
                  تسجيل الدخول
                </v-btn>

                <v-btn color="primary" @click="openRegisterDialog">
                  <v-icon start>mdi-account-plus</v-icon>
                  إنشاء حساب
                </v-btn>
              </template>

              <!-- أزرار المستخدم المسجل دخول -->
              <template v-else>
                <v-btn variant="outlined" @click="goToDashboard">
                  <v-icon start>mdi-account</v-icon>
                  لوحة التحكم
                </v-btn>

                <v-btn color="error" variant="outlined" @click="logout">
                  <v-icon start>ri-logout-box-line</v-icon>
                  تسجيل الخروج
                </v-btn>
              </template>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </v-app-bar>

    <v-main>
      <!-- قسم ترحيبي محسّن -->
      <section class="hero-section">
        <v-container>
          <v-row align="center" class="min-height-screen">
            <v-col cols="12" md="6">
              <div class="hero-content">
                <v-slide-y-transition appear>
                  <div>
                    <h1 class="text-h2 font-weight-bold mb-4 text-gradient">
                      تعلّم بذكاء مع منصة دراسيق
                    </h1>
                    <p class="text-h6 text-medium-emphasis mb-6 text-pretty">
                      منصة تعليمية متطورة تربط المعلمين بالطلاب وتوفر تجربة
                      تعليمية تفاعلية مع أحدث التقنيات
                    </p>

                    <div class="d-flex gap-3 flex-wrap mb-6">
                      <v-btn
                        size="x-large"
                        color="primary"
                        @click="openLoginDialog"
                        :loading="isLoading"
                      >
                        <v-icon start>mdi-rocket-launch</v-icon>
                        ابدأ الآن مجاناً
                      </v-btn>

                      <v-btn
                        size="x-large"
                        variant="outlined"
                        color="primary"
                        @click="startTour"
                      >
                        <v-icon start>mdi-play-circle</v-icon>
                        جولة سريعة
                      </v-btn>
                    </div>

                    <!-- شارات المميزات -->
                    <div class="d-flex gap-2 flex-wrap">
                      <v-chip color="success" variant="elevated">
                        <v-icon start>mdi-check</v-icon>
                        مجاني تماماً
                      </v-chip>
                      <v-chip color="info" variant="elevated">
                        <v-icon start>mdi-certificate</v-icon>
                        شهادات معتمدة
                      </v-chip>
                      <v-chip color="warning" variant="elevated">
                        <v-icon start>mdi-clock</v-icon>
                        متاح 24/7
                      </v-chip>
                    </div>
                  </div>
                </v-slide-y-transition>
              </div>
            </v-col>

            <v-col cols="12" md="6">
              <v-fade-transition appear>
                <div class="hero-image text-center">
                  <div class="floating-card">
                    <v-card elevation="8" class="pa-8 hero-card">
                      <v-icon size="120" color="primary" class="mb-4"
                        >mdi-school</v-icon
                      >
                      <h3 class="text-h5 text-primary mb-2">التعليم الذكي</h3>
                      <p class="text-body-2">تجربة تعليمية مخصصة لكل طالب</p>
                    </v-card>
                  </div>
                </div>
              </v-fade-transition>
            </v-col>
          </v-row>
        </v-container>
      </section>

      <!-- لماذا نظامنا؟ -->
      <section id="features" class="features-section py-16">
        <v-container>
          <div class="text-center mb-12">
            <h2 class="text-h3 font-weight-bold mb-4">
              لماذا تختار منصة دراسيق؟
            </h2>
            <p class="text-h6 text-medium-emphasis">
              مميزات فريدة تجعل تجربتك التعليمية استثنائية
            </p>
          </div>

          <v-row>
            <v-col
              cols="12"
              sm="6"
              md="4"
              v-for="(feature, index) in features"
              :key="feature.id"
            >
              <v-slide-y-transition :delay="index * 100" appear>
                <v-card
                  elevation="2"
                  class="h-100 text-center pa-6 feature-card"
                  :loading="isLoading"
                >
                  <v-icon :size="64" :color="feature.color" class="mb-4">
                    {{ feature.icon }}
                  </v-icon>
                  <h3 class="text-h5 font-weight-bold mb-3">
                    {{ feature.title }}
                  </h3>
                  <p class="text-body-1 text-medium-emphasis mb-4">
                    {{ feature.description }}
                  </p>

                  <div class="d-flex justify-center gap-1">
                    <v-chip
                      v-for="tag in feature.tags"
                      :key="tag"
                      size="small"
                      :color="feature.color"
                      variant="outlined"
                    >
                      {{ tag }}
                    </v-chip>
                  </div>
                </v-card>
              </v-slide-y-transition>
            </v-col>
          </v-row>
        </v-container>
      </section>

      <!-- كيف يعمل النظام؟ -->
      <section id="how-it-works" class="how-it-works-section py-16">
        <v-container>
          <div class="text-center mb-12">
            <h2 class="text-h3 font-weight-bold mb-4">كيف يعمل النظام؟</h2>
            <p class="text-h6 text-medium-emphasis">
              خطوات بسيطة للبدء في رحلتك التعليمية
            </p>
          </div>

          <v-row justify="center">
            <v-col cols="12" md="10">
              <div class="steps-container">
                <div
                  v-for="(step, index) in steps"
                  :key="step.id"
                  class="step-item d-flex align-center mb-8"
                  :class="{ 'flex-row-reverse': index % 2 === 1 }"
                >
                  <div class="step-number">
                    <v-avatar size="80" :color="step.color">
                      <span class="text-h4 font-weight-bold text-white">{{
                        index + 1
                      }}</span>
                    </v-avatar>
                  </div>

                  <div class="step-content flex-grow-1 mx-6">
                    <v-card elevation="2" class="pa-6">
                      <div class="d-flex align-center mb-3">
                        <v-icon :color="step.color" size="32" class="me-3">{{
                          step.icon
                        }}</v-icon>
                        <h3 class="text-h5 font-weight-bold">
                          {{ step.title }}
                        </h3>
                      </div>
                      <p class="text-body-1 text-medium-emphasis">
                        {{ step.description }}
                      </p>
                    </v-card>
                  </div>
                </div>
              </div>
            </v-col>
          </v-row>
        </v-container>
      </section>

      <!-- تجربة الدخول -->
      <section class="cta-section py-16">
        <v-container>
          <v-row justify="center">
            <v-col cols="12" md="8">
              <v-card elevation="8" class="pa-8 text-center cta-card">
                <h2 class="text-h3 font-weight-bold mb-4">جرب المنصة الآن</h2>
                <p class="text-h6 text-medium-emphasis mb-6">
                  ابدأ رحلتك التعليمية مع آلاف الطلاب والمعلمين
                </p>

                <v-btn
                  size="x-large"
                  color="primary"
                  @click="openGoogleSignInDemo"
                  :loading="isGoogleLoading"
                  class="mb-4"
                >
                  <v-icon start>mdi-google</v-icon>
                  تسجيل الدخول بـ Google
                </v-btn>

                <div class="text-caption text-medium-emphasis">
                  آمن وسريع • لا حاجة لكلمة مرور
                </div>

                <!-- حالات التحميل والخطأ -->
                <v-alert
                  v-if="hasError"
                  type="error"
                  class="mt-4"
                  closable
                  @click:close="hasError = false"
                >
                  حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.
                </v-alert>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </section>

      <!-- الأسئلة الشائعة -->
      <section id="faq" class="faq-section py-16">
        <v-container>
          <div class="text-center mb-12">
            <h2 class="text-h3 font-weight-bold mb-4">الأسئلة الشائعة</h2>
            <p class="text-h6 text-medium-emphasis">
              إجابات على أكثر الأسئلة شيوعاً
            </p>
          </div>

          <v-row justify="center">
            <v-col cols="12" md="10">
              <v-expansion-panels variant="accordion" class="faq-panels">
                <v-expansion-panel
                  v-for="faq in faqs"
                  :key="faq.id"
                  :title="faq.question"
                  :text="faq.answer"
                />
              </v-expansion-panels>
            </v-col>
          </v-row>
        </v-container>
      </section>

      <!-- شهادات المستخدمين -->
      <section class="testimonials-section py-16">
        <v-container>
          <div class="text-center mb-12">
            <h2 class="text-h3 font-weight-bold mb-4">ماذا يقول مستخدمونا؟</h2>
            <p class="text-h6 text-medium-emphasis">
              تجارب حقيقية من طلاب ومعلمين
            </p>
          </div>

          <v-row>
            <v-col
              cols="12"
              md="4"
              v-for="testimonial in testimonials"
              :key="testimonial.id"
            >
              <v-card elevation="2" class="pa-6 h-100 testimonial-card">
                <div class="d-flex align-center mb-4">
                  <v-avatar size="48" :color="testimonial.color">
                    <v-icon color="white">{{ testimonial.avatar }}</v-icon>
                  </v-avatar>
                  <div class="mr-3">
                    <h4 class="text-h6 font-weight-bold">
                      {{ testimonial.name }}
                    </h4>
                    <p class="text-body-2 text-medium-emphasis">
                      {{ testimonial.role }}
                    </p>
                  </div>
                </div>

                <p class="text-body-1 mb-4">"{{ testimonial.comment }}"</p>

                <div class="d-flex">
                  <v-icon v-for="i in 5" :key="i" color="amber" size="16">
                    mdi-star
                  </v-icon>
                </div>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </section>

      <!-- تذييل محسّن -->
      <v-footer color="primary" class="footer-section">
        <v-container>
          <v-row>
            <v-col cols="12" md="4">
              <div class="d-flex align-center mb-4">
                <v-icon size="32" class="me-3" color="white">mdi-school</v-icon>
                <h3 class="text-h5 font-weight-bold text-white">منصة دراسيق</h3>
              </div>
              <p class="text-body-2 text-white mb-4">
                منصة تعليمية متطورة تهدف إلى تطوير التعليم وجعله متاحاً للجميع
              </p>
            </v-col>

            <v-col cols="12" md="4">
              <h4 class="text-h6 font-weight-bold text-white mb-4">
                روابط سريعة
              </h4>
              <div class="d-flex flex-column gap-2">
                <v-btn
                  variant="text"
                  color="white"
                  size="small"
                  class="justify-start"
                  >حول المنصة</v-btn
                >
                <v-btn
                  variant="text"
                  color="white"
                  size="small"
                  class="justify-start"
                  >سياسة الخصوصية</v-btn
                >
                <v-btn
                  variant="text"
                  color="white"
                  size="small"
                  class="justify-start"
                  >شروط الاستخدام</v-btn
                >
                <v-btn
                  variant="text"
                  color="white"
                  size="small"
                  class="justify-start"
                  >تواصل معنا</v-btn
                >
              </div>
            </v-col>

            <v-col cols="12" md="4">
              <h4 class="text-h6 font-weight-bold text-white mb-4">تابعنا</h4>
              <div class="d-flex gap-2">
                <v-btn icon variant="outlined" color="white" size="small">
                  <v-icon>mdi-facebook</v-icon>
                </v-btn>
                <v-btn icon variant="outlined" color="white" size="small">
                  <v-icon>mdi-twitter</v-icon>
                </v-btn>
                <v-btn icon variant="outlined" color="white" size="small">
                  <v-icon>mdi-instagram</v-icon>
                </v-btn>
                <v-btn icon variant="outlined" color="white" size="small">
                  <v-icon>mdi-linkedin</v-icon>
                </v-btn>
              </div>
            </v-col>
          </v-row>

          <v-divider class="my-6" color="white" opacity="0.3" />

          <div class="text-center">
            <p class="text-body-2 text-white">
              © 2024 منصة دراسيق التعليمية. جميع الحقوق محفوظة.
            </p>
          </div>
        </v-container>
      </v-footer>
    </v-main>

    <!-- نافذة تسجيل الدخول التجريبية -->
    <v-dialog v-model="loginDialog" max-width="500">
      <v-card class="pa-6">
        <v-card-title class="text-center">
          <h2 class="text-h4 font-weight-bold">تسجيل الدخول</h2>
        </v-card-title>

        <v-card-text class="text-center">
          <v-icon size="64" color="primary" class="mb-4">mdi-google</v-icon>
          <p class="text-body-1 mb-4">
            سيتم توجيهك إلى Google لتسجيل الدخول بشكل آمن
          </p>
          <p class="text-body-2 text-medium-emphasis">
            بعد التحقق، ستتمكن من الوصول إلى جميع ميزات المنصة
          </p>
        </v-card-text>

        <v-card-actions class="justify-center">
          <v-btn
            color="primary"
            @click="simulateGoogleLogin"
            :loading="isGoogleLoading"
          >
            متابعة مع Google
          </v-btn>
          <v-btn variant="text" @click="loginDialog = false">إلغاء</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- نافذة إنشاء حساب -->
    <v-dialog v-model="registerDialog" max-width="500">
      <v-card class="pa-6">
        <v-card-title class="text-center">
          <h2 class="text-h4 font-weight-bold">إنشاء حساب جديد</h2>
        </v-card-title>

        <v-card-text class="text-center">
          <p class="text-body-1 mb-4">انضم إلى آلاف الطلاب والمعلمين</p>
          <v-btn
            color="primary"
            block
            size="large"
            @click="simulateGoogleLogin"
          >
            <v-icon start>mdi-google</v-icon>
            إنشاء حساب بـ Google
          </v-btn>
        </v-card-text>

        <v-card-actions class="justify-center">
          <v-btn variant="text" @click="registerDialog = false">إلغاء</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- رسائل النجاح/الفشل -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3000"
      location="top"
    >
      {{ snackbar.message }}
      <template #actions>
        <v-btn icon @click="snackbar.show = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useTheme } from "vuetify";

definePage({
  meta: {
    layout: "blank",
  },
});
const router = useRouter();

// إعداد الثيم
const theme = useTheme();
const isDark = ref(false);

// حالات التفاعل
const isLoading = ref(false);
const isGoogleLoading = ref(false);
const hasError = ref(false);
const loginDialog = ref(false);
const registerDialog = ref(false);
// حالة المستخدم
const user = ref(null);
const isAuthenticated = ref(false);

// فحص حالة المستخدم عند تحميل الصفحة
onMounted(() => {
  const userData = localStorage.getItem("user");
  const token = localStorage.getItem("accessToken");

  if (userData && token) {
    user.value = JSON.parse(userData);
    isAuthenticated.value = true;
  }
});

// رسائل التنبيه
const snackbar = ref({
  show: false,
  message: "",
  color: "success",
});

// بيانات المميزات المحسّنة
const features = ref([
  {
    id: 1,
    icon: "mdi-account-group",
    title: "مجتمع تعليمي نشط",
    description: "انضم إلى مجتمع من المعلمين والطلاب المتحمسين للتعلم والتطوير",
    color: "primary",
    tags: ["تفاعل", "مشاركة", "تعاون"],
  },
  {
    id: 2,
    icon: "mdi-brain",
    title: "تعلم ذكي مخصص",
    description: "نظام ذكي يتكيف مع أسلوب تعلمك ويقدم محتوى مخصص لك",
    color: "success",
    tags: ["ذكي", "مخصص", "تكيفي"],
  },
  {
    id: 3,
    icon: "mdi-certificate",
    title: "شهادات معتمدة",
    description: "احصل على شهادات معتمدة دولياً عند إكمال الدورات بنجاح",
    color: "warning",
    tags: ["معتمد", "دولي", "مهني"],
  },
  {
    id: 4,
    icon: "mdi-chart-line",
    title: "تتبع التقدم",
    description: "تابع تقدمك في التعلم واحصل على تقارير مفصلة وإحصائيات",
    color: "info",
    tags: ["تقارير", "إحصائيات", "تحليل"],
  },
  {
    id: 5,
    icon: "mdi-message-video",
    title: "فصول افتراضية",
    description: "احضر فصول مباشرة مع المعلمين والطلاب من جميع أنحاء العالم",
    color: "purple",
    tags: ["مباشر", "تفاعلي", "عالمي"],
  },
  {
    id: 6,
    icon: "mdi-devices",
    title: "متاح على جميع الأجهزة",
    description: "تعلم في أي وقت ومن أي مكان باستخدام هاتفك أو حاسوبك",
    color: "teal",
    tags: ["متنقل", "مرن", "متاح"],
  },
]);

// خطوات النظام
const steps = ref([
  {
    id: 1,
    icon: "mdi-google",
    title: "تسجيل الدخول بـ Google",
    description: "سجل دخولك بسهولة وأمان باستخدام حساب Google الخاص بك",
    color: "primary",
  },
  {
    id: 2,
    icon: "mdi-account-edit",
    title: "إكمال الملف الشخصي",
    description: "أضف معلوماتك الأساسية واختر اهتماماتك التعليمية",
    color: "success",
  },
  {
    id: 3,
    icon: "mdi-book-open",
    title: "اختيار الدورات",
    description: "تصفح مكتبة الدورات الواسعة واختر ما يناسب أهدافك",
    color: "warning",
  },
  {
    id: 4,
    icon: "mdi-rocket-launch",
    title: "بدء التعلم",
    description: "ابدأ رحلتك التعليمية واستمتع بتجربة تعلم فريدة",
    color: "info",
  },
]);

// الأسئلة الشائعة
const faqs = ref([
  {
    id: 1,
    question: "هل المنصة مجانية؟",
    answer:
      "نعم، المنصة مجانية بالكامل للطلاب. نوفر محتوى تعليمي عالي الجودة دون أي رسوم.",
  },
  {
    id: 2,
    question: "كيف يمكنني الحصول على شهادة؟",
    answer:
      "بعد إكمال الدورة بنجاح واجتياز الاختبارات، ستحصل على شهادة معتمدة يمكنك تحميلها ومشاركتها.",
  },
  {
    id: 3,
    question: "هل يمكنني التعلم من الهاتف؟",
    answer:
      "بالطبع! المنصة متوافقة مع جميع الأجهزة ويمكنك التعلم من هاتفك أو جهازك اللوحي بسهولة.",
  },
  {
    id: 4,
    question: "كم من الوقت أحتاج لإكمال دورة؟",
    answer:
      "يختلف الوقت حسب الدورة، لكن معظم الدورات تستغرق من 2-8 أسابيع بمعدل ساعة يومياً.",
  },
  {
    id: 5,
    question: "هل يمكنني التفاعل مع المعلمين؟",
    answer:
      "نعم، يمكنك التفاعل مع المعلمين من خلال الفصول المباشرة والمنتديات والرسائل الخاصة.",
  },
  {
    id: 6,
    question: "ماذا لو لم أفهم درساً معيناً؟",
    answer:
      "يمكنك إعادة مشاهدة الدروس أي عدد من المرات، وطرح الأسئلة في المنتدى أو طلب المساعدة من المعلم.",
  },
]);

// شهادات المستخدمين
const testimonials = ref([
  {
    id: 1,
    name: "أحمد محمد",
    role: "طالب جامعي",
    comment:
      "منصة رائعة ساعدتني في تطوير مهاراتي البرمجية. المحتوى عالي الجودة والمعلمون محترفون.",
    avatar: "mdi-account",
    color: "primary",
  },
  {
    id: 2,
    name: "فاطمة أحمد",
    role: "معلمة رياضيات",
    comment:
      "كمعلمة، أجد المنصة مفيدة جداً لتطوير طرق التدريس والتواصل مع الطلاب بشكل أفضل.",
    avatar: "mdi-account-circle",
    color: "success",
  },
  {
    id: 3,
    name: "خالد العلي",
    role: "مطور برمجيات",
    comment:
      "حصلت على شهادة في تطوير الويب من المنصة وساعدتني في الحصول على وظيفة أحلامي.",
    avatar: "mdi-account-star",
    color: "warning",
  },
]);

// الوظائف
const toggleTheme = () => {
  isDark.value = !isDark.value;
  theme.global.name.value = isDark.value ? "dark" : "light";
};

const scrollToSection = (sectionId) => {
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({ behavior: "smooth" });
  }
};

const openLoginDialog = () => {
  // التوجه إلى صفحة تسجيل الدخول
  router.push("/login");
};

const openRegisterDialog = () => {
  // التوجه إلى صفحة تسجيل الدخول (حيث يمكن إنشاء حساب جديد)
  router.push("/login");
};

const openGoogleSignInDemo = () => {
  // التوجه إلى صفحة تسجيل الدخول
  router.push("/login");
};

// وظيفة تسجيل الخروج
const logout = async () => {
  try {
    // استدعاء API لتسجيل الخروج
    await Auth.logout();

    // مسح البيانات من localStorage
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");

    // إعادة تعيين حالة المستخدم
    user.value = null;
    isAuthenticated.value = false;

    // إظهار رسالة نجاح
    snackbar.value = {
      show: true,
      message: "تم تسجيل الخروج بنجاح",
      color: "success",
    };

    // إعادة تحميل الصفحة للتأكد من تحديث الواجهة
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  } catch (error) {
    console.error("خطأ في تسجيل الخروج:", error);

    // حتى لو فشل API، نمسح البيانات المحلية
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    user.value = null;
    isAuthenticated.value = false;

    // إظهار رسالة نجاح
    snackbar.value = {
      show: true,
      message: "تم تسجيل الخروج بنجاح",
      color: "success",
    };

    // إعادة تحميل الصفحة
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }
};

// وظيفة الذهاب إلى لوحة التحكم
const goToDashboard = () => {
  if (!user.value) return;

  const userType = user.value.userType;

  switch (userType) {
    case "student":
      router.push("/student/dashboard");
      break;
    case "teacher":
      router.push("/teacher/dashboard");
      break;
    case "admin":
    case "super_admin":
      router.push("/admin/dashboard");
      break;
    default:
      router.push("/dashboard");
  }
};

const simulateGoogleLogin = async () => {
  isGoogleLoading.value = true;
  hasError.value = false;

  try {
    // محاكاة تأخير الشبكة
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // محاكاة نجاح تسجيل الدخول
    loginDialog.value = false;
    registerDialog.value = false;

    snackbar.value = {
      show: true,
      message: "تم تسجيل الدخول بنجاح! مرحباً بك في منصة دراسيق",
      color: "success",
    };
  } catch (error) {
    hasError.value = true;
    snackbar.value = {
      show: true,
      message: "حدث خطأ أثناء تسجيل الدخول",
      color: "error",
    };
  } finally {
    isGoogleLoading.value = false;
  }
};

const startTour = () => {
  snackbar.value = {
    show: true,
    message: "جولة سريعة قادمة قريباً!",
    color: "info",
  };
};

// تهيئة المكون
onMounted(() => {
  // تعيين الثيم الافتراضي
  theme.global.name.value = "light";
});
</script>

<style scoped>
/* الأنيميشن والتأثيرات */
.navbar-glass {
  backdrop-filter: blur(10px);
  background: rgba(var(--v-theme-surface), 0.95) !important;
}

.hero-section {
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-block-size: 100vh;
  padding-block-start: 80px;
}

.text-gradient {
  background: linear-gradient(45deg, #667eea, #764ba2);
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.floating-card {
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-20px);
  }
}

.hero-card {
  border-radius: 20px;
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 95%);
}

.feature-card {
  border-radius: 16px;
  transition: all 0.3s ease;
}

.feature-card:hover {
  box-shadow: 0 12px 40px rgba(0, 0, 0, 15%);
  transform: translateY(-8px);
}

.how-it-works-section {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.step-item {
  position: relative;
}

.step-item:not(:last-child)::after {
  position: absolute;
  z-index: 1;
  background: linear-gradient(to bottom, #667eea, #764ba2);
  block-size: 60px;
  content: "";
  inline-size: 2px;
  inset-block-start: 80px;
  inset-inline-end: 40px;
}

.cta-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.cta-card {
  border-radius: 20px;
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 95%);
}

.faq-section {
  background-color: #f8f9fa;
}

.faq-panels {
  overflow: hidden;
  border-radius: 12px;
}

.testimonials-section {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.testimonial-card {
  border-radius: 16px;
  transition: all 0.3s ease;
}

.testimonial-card:hover {
  box-shadow: 0 8px 30px rgba(0, 0, 0, 12%);
  transform: translateY(-5px);
}

.footer-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* تحسينات الاستجابة */
@media (max-width: 768px) {
  .hero-section {
    padding-block-start: 100px;
    text-align: center;
  }

  .step-item {
    flex-direction: column !important;
    text-align: center;
  }

  .step-item:not(:last-child)::after {
    display: none;
  }

  .step-content {
    margin-block: 16px !important;
    margin-inline: 0 !important;
  }
}

/* تحسينات الخطوط العربية */
* {
  font-family: Cairo, "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
}

.v-btn {
  font-weight: 600;
}

.text-h1,
.text-h2,
.text-h3,
.text-h4,
.text-h5,
.text-h6 {
  font-weight: 700;
  line-height: 1.3;
}

.text-body-1,
.text-body-2 {
  line-height: 1.6;
}

/* تأثيرات إضافية */
.v-card {
  border-radius: 12px;
}

.v-btn {
  border-radius: 8px;
  text-transform: none;
}

.v-chip {
  border-radius: 20px;
}
</style>
