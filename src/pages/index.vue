<template>
  <v-app :rtl="true">
    <!-- 1️⃣ Header / Navigation -->
    <v-app-bar color="primary" elevation="0" app fixed class="navbar-glass"
      style=" position: fixed; z-index: 1000;background-color: white !important; inset-block-start: 0; inset-inline: 0;">
      <v-container>
        <v-row align="center" no-gutters>
          <v-col cols="auto">
            <div class="d-flex align-center">
              <v-img :src="logo" width="50" height="50" />
              <h1 class="text-h5 font-weight-bold">
                <span class="text-primary-dark">Mulhim</span>
                <span class="text-accent">IQ</span>
              </h1>
            </div>
          </v-col>

          <v-spacer />

          <v-col cols="auto" class="d-none d-md-flex">
            <div class="d-flex align-center gap-2">
              <v-btn variant="text" @click="scrollToSection('hero')">الرئيسية</v-btn>
              <v-btn variant="text" @click="scrollToSection('features')">للمعلمين</v-btn>
              <v-btn variant="text" @click="scrollToSection('how-it-works')">للطلاب</v-btn>
              <v-btn variant="text" @click="scrollToSection('pricing')">باقات الأشتراك</v-btn>
              <v-btn variant="text" @click="scrollToSection('footer')">تواصل معنا</v-btn>
            </div>
          </v-col>

          <v-col cols="auto">
            <div class="d-flex align-center gap-2">
              <v-menu v-if="isLoggedIn" v-model="notificationsMenu" location="bottom" :close-on-content-click="false">
                <template #activator="{ props }">
                  <v-btn icon variant="text" v-bind="props">
                    <v-badge color="error" :content="unreadCount" overlap v-if="unreadCount">
                      <v-icon>mdi-bell</v-icon>
                    </v-badge>
                    <template v-else>
                      <v-icon>mdi-bell</v-icon>
                    </template>
                  </v-btn>
                </template>
                <v-card min-width="360">
                  <v-card-title class="d-flex align-center">
                    <v-icon start class="me-2">mdi-bell</v-icon>
                    <span class="text-subtitle-1">الإشعارات</span>
                    <v-spacer />
                    <v-btn size="small" variant="text" @click="refreshNotifications">تحديث</v-btn>
                  </v-card-title>
                  <v-divider />
                  <v-list v-if="notificationsList.length" density="compact">
                    <v-list-item v-for="n in notificationsList" :key="n.id" @click="openNotification(n)"
                                   :title="n.title" :subtitle="formatDate(n.sentAt)" class="notification-item">
                      <template #prepend>
                        <v-avatar size="36" :color="n.is_read ? 'grey' : 'primary'">
                          <v-img v-if="n.image" :src="n.image" cover />
                          <v-icon v-else color="white" size="18">mdi-bell</v-icon>
                        </v-avatar>
                      </template>
                    </v-list-item>
                  </v-list>
                  <div v-else class="text-center pa-6 text-medium-emphasis">لا توجد إشعارات</div>
                  <v-divider v-if="notificationsHasMore" />
                  <div v-if="notificationsHasMore" class="d-flex justify-center pa-2">
                    <v-btn size="small" :loading="notificationsLoading" variant="text" @click="loadMoreNotifications">عرض المزيد</v-btn>
                  </div>
                  <v-card-actions class="justify-end">
                    <v-btn variant="text" @click="notificationsMenu = false">إغلاق</v-btn>
                  </v-card-actions>
                </v-card>
              </v-menu>

              <!-- 🔹 زر ديناميكي حسب حالة تسجيل الدخول -->
              <v-btn v-if="!isLoggedIn" color="support" style="background-color: #1c324c !important;" variant="elevated"
                @click="openStartDialog">
                <v-icon start>mdi-rocket-launch</v-icon>
                ابدأ الآن
              </v-btn>

              <v-btn v-else color="success" variant="elevated" to="/teacher/dashboard">
                <v-icon start>mdi-view-dashboard</v-icon>
                لوحة التحكم
              </v-btn>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </v-app-bar>

    <v-main>
      <!-- 2️⃣ Hero Section -->
      <!-- 2️⃣ Hero Section with Carousel -->
      <section id="hero" class="hero-section">
        <v-container>
          <v-row align="center" class="min-height-screen responsive-row">
            <!-- Left side: Text content and CTA buttons for teachers -->
            <v-col cols="12" md="6" order="2" order-md="1">
              <v-slide-y-transition appear>
                <div class="hero-content">
                  <h1 class="text-h2 font-weight-bold mb-4 text-white text-balance">
                    علّم، ألهم، وتواصل مع طلابك بسهولة
                  </h1>
                  <p class="text-h6 text-white mb-6 text-pretty" style="opacity: 0.95;">
                    منصة ملهم تمكّنك من إدارة الكورسات، الحضور، الدروس، والطلاب في مكان واحد بواجهة بسيطة وسهلة.
                  </p>

                  <div class="d-flex gap-3 flex-wrap mb-6">
                    <v-btn size="x-large" color="white" variant="elevated" @click="openStartDialog">
                      <v-icon start>mdi-account-plus</v-icon>
                      انضم كمعلم
                    </v-btn>

                    <v-btn size="x-large" variant="outlined" color="white" @click="openStartDialog">
                      <v-icon start>mdi-login</v-icon>
                      تسجيل الدخول
                    </v-btn>
                  </div>

                  <!-- Download app section for students -->
                  <div class="download-section mt-8 pa-4"
                    style=" border-radius: 16px; backdrop-filter: blur(10px);background: rgba(255, 255, 255, 10%);">
                    <h3 class="text-h6 font-weight-bold text-white mb-3">
                      <v-icon start color="white">mdi-cellphone-download</v-icon>
                      حمّل التطبيق للطلاب
                    </h3>
                    <p class="text-body-2 text-white mb-3" style="opacity: 0.9;">
                      تابع دروسك وواجباتك من هاتفك المحمول
                    </p>
                    <div class="d-flex gap-2 flex-wrap">
                      <v-btn color="white" variant="elevated" size="large" href="#">
                        <v-icon start>mdi-apple</v-icon>
                        App Store
                      </v-btn>
                      <v-btn color="white" variant="elevated" size="large" href="#">
                        <v-icon start>mdi-google-play</v-icon>
                        Google Play
                      </v-btn>
                    </div>
                  </div>
                </div>
              </v-slide-y-transition>
            </v-col>

            <!-- Right side: Carousel showing mobile app screenshots -->
            <v-col cols="12" md="6" order="1" order-md="2">
              <v-fade-transition appear>
                <div class="hero-carousel-container">
                  <v-carousel v-model="carouselModel" cycle :interval="4000" hide-delimiter-background
                    show-arrows="hover" height="auto" class="hero-carousel">
                    <v-carousel-item v-for="(screen, index) in appScreenshots" :key="index">
                      <div class="d-flex justify-center align-center pa-4">
                        <div style="max-inline-size: 800px; inline-size: 100%; cursor: pointer;" @click="openNews(screen)">
                          <v-img :src="screen.image" :alt="screen.title" cover aspect-ratio="16/9" class="elevation-4 rounded-lg" />
                          <div class="text-center mt-4">
                            <h3 class="text-h5 font-weight-bold text-white mb-2">
                              {{ screen.title }}
                            </h3>
                            <p class="text-body-1 text-white" style="opacity: 0.9;">
                              {{ screen.description }}
                            </p>
                          </div>
                        </div>
                      </div>
                    </v-carousel-item>
                  </v-carousel>
                </div>
              </v-fade-transition>
            </v-col>
          </v-row>
        </v-container>
      </section>

      <!-- 3️⃣ Feature Section -->
      <section id="features" class="features-section py-16">
        <v-container>
          <div class="text-center mb-12">
            <h2 class="text-h3 font-weight-bold mb-4">المميزات الرئيسية</h2>
            <p class="text-h6 text-medium-emphasis">كل ما تحتاجه لإدارة تعليمية ناجحة</p>
          </div>

          <v-row>
            <v-col cols="12" sm="6" md="4" v-for="(feature, index) in features" :key="feature.id">
              <v-slide-y-transition :delay="index * 100" appear>
                <v-card elevation="2" class="h-100 text-center pa-6 feature-card"
                  :class="`feature-card-${feature.colorClass}`">
                  <v-icon :size="64" :color="feature.color" class="mb-4">
                    {{ feature.icon }}
                  </v-icon>
                  <h3 class="text-h5 font-weight-bold mb-3">
                    {{ feature.title }}
                  </h3>
                  <p class="text-body-1 text-medium-emphasis">
                    {{ feature.description }}
                  </p>
                </v-card>
              </v-slide-y-transition>
            </v-col>
          </v-row>
        </v-container>
      </section>

      <!-- 4️⃣ Dashboard Preview Section -->
      <section class="dashboard-preview-section py-16">
        <v-container>
          <div class="text-center mb-12">
            <h2 class="text-h3 font-weight-bold mb-4">شاهد كيف يدير المعلم دروسه بسهولة</h2>
            <p class="text-h6 text-medium-emphasis">جرب واجهة المعلم التفاعلية مباشرة</p>
          </div>

          <v-row justify="center">
            <v-col cols="12" lg="11">
              <v-card elevation="8" class="dashboard-demo-card">
                <v-row no-gutters>
                  <!-- Sidebar -->
                  <v-col cols="auto" class="dashboard-sidebar">
                    <v-list density="compact" class="py-4">
                      <v-list-item v-for="item in sidebarItems" :key="item.id" :prepend-icon="item.icon"
                        :title="item.title" :active="item.active" class="mb-2" />
                    </v-list>
                  </v-col>

                  <!-- Main Content -->
                  <v-col>
                    <!-- Toolbar -->
                    <v-toolbar color="surface" elevation="0" class="dashboard-toolbar">
                      <v-toolbar-title class="text-h6 font-weight-bold">
                        لوحة التحكم
                      </v-toolbar-title>
                      <v-spacer />
                      <v-btn icon variant="text" @click="notificationsMenu = true">
                        <v-badge v-if="unreadCount" color="error" :content="unreadCount" overlap>
                          <v-icon>mdi-bell</v-icon>
                        </v-badge>
                        <template v-else>
                          <v-icon>mdi-bell</v-icon>
                        </template>
                      </v-btn>
                      <v-btn icon variant="text" @click="toggleDashboardTheme">
                        <v-icon>{{ dashboardDark ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
                      </v-btn>
                      <v-avatar size="40" color="accent" class="ms-2">
                        <v-icon color="white">mdi-account</v-icon>
                      </v-avatar>
                    </v-toolbar>

                    <!-- Dashboard Content -->
                    <div class="dashboard-content pa-6">
                      <v-row>
                        <!-- Stats Cards -->
                        <v-col cols="12" sm="6" md="3" v-for="stat in stats" :key="stat.id">
                          <v-card elevation="1" class="pa-4 stat-card">
                            <div class="d-flex align-center justify-space-between mb-2">
                              <v-icon :color="stat.color" size="32">{{ stat.icon }}</v-icon>
                              <v-chip :color="stat.color" size="small" variant="tonal">
                                {{ stat.change }}
                              </v-chip>
                            </div>
                            <h4 class="text-h4 font-weight-bold mb-1">{{ stat.value }}</h4>
                            <p class="text-body-2 text-medium-emphasis">{{ stat.label }}</p>
                          </v-card>
                        </v-col>

                        <!-- Upcoming Classes Table -->
                        <v-col cols="12" md="8">
                          <v-card elevation="1">
                            <v-card-title class="d-flex align-center">
                              <v-icon start color="primary">mdi-calendar-clock</v-icon>
                              الدروس القادمة
                            </v-card-title>
                            <v-data-table :headers="tableHeaders" :items="upcomingClasses" density="comfortable"
                              :items-per-page="5" hide-default-footer>
                              <template #item.status="{ item }">
                                <v-chip :color="item.statusColor" size="small" variant="tonal">
                                  {{ item.status }}
                                </v-chip>
                              </template>
                              <template #item.actions>
                                <v-btn icon size="small" variant="text">
                                  <v-icon>mdi-pencil</v-icon>
                                </v-btn>
                              </template>
                            </v-data-table>
                          </v-card>
                        </v-col>

                        <!-- Notifications -->
                        <v-col cols="12" md="4">
                          <v-card elevation="1">
                            <v-card-title class="d-flex align-center">
                              <v-icon start color="warning">mdi-bell</v-icon>
                              الإشعارات
                            </v-card-title>
                            <v-list density="compact">
                              <v-list-item v-for="notification in notifications" :key="notification.id"
                                :prepend-icon="notification.icon" :title="notification.title"
                                :subtitle="notification.time" class="notification-item">
                                <template #prepend>
                                  <v-avatar :color="notification.color" size="32">
                                    <v-icon size="16" color="white">{{ notification.icon }}</v-icon>
                                  </v-avatar>
                                </template>
                              </v-list-item>
                            </v-list>
                          </v-card>
                        </v-col>
                      </v-row>
                    </div>
                  </v-col>
                </v-row>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </section>

      <!-- 5️⃣ How It Works Section -->
      <section id="how-it-works" class="how-it-works-section py-16">
        <v-container>
          <div class="text-center mb-12">
            <h2 class="text-h3 font-weight-bold mb-4">كيف تعمل ملهم</h2>
            <p class="text-h6 text-medium-emphasis">أربع خطوات بسيطة للبدء</p>
          </div>

          <v-row justify="center">
            <v-col cols="12" md="10">
              <div class="timeline-container">
                <v-timeline side="end" align="start">
                  <v-timeline-item v-for="(step, index) in steps" :key="step.id" :dot-color="step.color" size="large">
                    <template #icon>
                      <v-icon color="white">{{ step.icon }}</v-icon>
                    </template>
                    <v-card elevation="2" class="pa-6">
                      <div class="d-flex align-center mb-3">
                        <v-chip :color="step.color" class="me-3">خطوة {{ index + 1 }}</v-chip>
                        <h3 class="text-h5 font-weight-bold">{{ step.title }}</h3>
                      </div>
                      <p class="text-body-1 text-medium-emphasis">{{ step.description }}</p>
                    </v-card>
                  </v-timeline-item>
                </v-timeline>
              </div>
            </v-col>
          </v-row>
        </v-container>
      </section>

      <!-- 6️⃣ Testimonials Section -->
      <section class="testimonials-section py-16">
        <v-container>
          <div class="text-center mb-12">
            <h2 class="text-h3 font-weight-bold mb-4 text-white">آراء المستخدمين</h2>
            <p class="text-h6 text-white" style="opacity: 0.95;">ماذا يقول معلمونا وطلابنا</p>
          </div>

          <v-row>
            <v-col cols="12" md="4" v-for="testimonial in testimonials" :key="testimonial.id">
              <v-card elevation="4" class="pa-6 h-100 testimonial-card">
                <div class="d-flex align-center mb-4">
                  <v-avatar size="56" :color="testimonial.color">
                    <v-icon color="white" size="32">{{ testimonial.avatar }}</v-icon>
                  </v-avatar>
                  <div class="mr-3">
                    <h4 class="text-h6 font-weight-bold">{{ testimonial.name }}</h4>
                    <p class="text-body-2 text-medium-emphasis">{{ testimonial.role }}</p>
                  </div>
                </div>

                <p class="text-body-1 mb-4">"{{ testimonial.comment }}"</p>

                <v-rating :model-value="5" color="amber" density="compact" readonly size="small" />
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </section>

      <!-- 7️⃣ Pricing Section -->
      <section id="pricing" class="pricing-section py-16">
        <v-container>
          <div class="text-center mb-12">
            <h2 class="text-h3 font-weight-bold mb-4">باقات الأشتراك</h2>
            <p class="text-h6 text-medium-emphasis">اختر الخطة المناسبة لك</p>
          </div>

          <v-row justify="center">
            <v-col cols="12" md="3" v-for="plan in pricingPlans" :key="plan.id">
              <v-hover v-slot="{ isHovering, props }">
                <v-card v-bind="props" elevation="2" class="pa-6 text-center pricing-card h-100"
                  :class="{ 'pricing-card-hover': isHovering, 'pricing-featured': plan.featured }"
                  :color="plan.featured ? 'accent' : undefined">
                  <v-chip v-if="plan.featured" color="highlight" class="mb-4" variant="elevated">
                    الأكثر شعبية
                  </v-chip>

                  <v-icon :size="64" :color="plan.iconColor" class="mb-4">
                    {{ plan.icon }}
                  </v-icon>

                  <h3 class="text-h4 font-weight-bold mb-2">
                    {{ plan.name }}
                  </h3>

                  <div class="mb-4">
                    <span class="text-h3 font-weight-bold">
                      {{ plan.price }}
                    </span>
                    <span class="text-body-1">
                      {{ plan.period }}
                    </span>
                  </div>

                  <v-divider class="my-4" />

                  <v-list density="compact" class="mb-6 bg-transparent">
                    <v-list-item v-for="feature in plan.features" :key="feature" class="px-0">
                      <template #prepend>
                        <v-icon size="20">
                          mdi-check-circle
                        </v-icon>
                      </template>
                      <v-list-item-title>
                        {{ feature }}
                      </v-list-item-title>
                    </v-list-item>
                  </v-list>

                  <v-btn :variant="plan.featured ? 'elevated' : 'outlined'" size="large" block
                    @click="selectPlan(plan)">
                    {{ plan.buttonText }}
                  </v-btn>
                </v-card>
              </v-hover>
            </v-col>
          </v-row>
        </v-container>
      </section>

      <!-- 8️⃣ Call To Action Section -->
      <section class="cta-section py-16">
        <v-container>
          <v-row justify="center">
            <v-col cols="12" md="8">
              <div class="text-center">
                <h2 class="text-h2 font-weight-bold mb-4 text-white text-balance">
                  ابدأ رحلتك التعليمية مع ملهم اليوم
                </h2>
                <p class="text-h6 text-white mb-6" style="opacity: 0.95;">
                  انضم إلى آلاف المعلمين والطلاب الذين يستخدمون ملهم
                </p>
                <v-btn size="x-large" color="white" variant="elevated" @click="openStartDialog">
                  <v-icon start>mdi-account-plus</v-icon>
                  أنشئ حسابك مجانًا
                </v-btn>
              </div>
            </v-col>
          </v-row>
        </v-container>
      </section>

      <!-- 9️⃣ Footer -->
      <v-footer id="footer" color="primary" class="footer-section">
        <v-container>
          <v-row>
            <v-col cols="12" md="4">
              <div class="d-flex align-center mb-4">
                <v-icon size="32" class="me-3" color="support">mdi-lightbulb-on</v-icon>
                <h3 class="text-h5 font-weight-bold text-white">
                  <span>Mulhim</span><span class="text-accent">IQ</span>
                </h3>
              </div>
              <p class="text-body-2 text-white mb-4" style="opacity: 0.9;">
                منصة تعليمية متكاملة تربط بين المعلمين والطلاب والإدارة في منظومة واحدة للتعليم الذكي
              </p>
            </v-col>

            <v-col cols="12" md="4">
              <h4 class="text-h6 font-weight-bold text-white mb-4">روابط سريعة</h4>
              <div class="d-flex flex-column gap-2">
                <v-btn variant="text" color="white" size="small" class="justify-start">
                  عن المنصة
                </v-btn>
                <v-btn variant="text" color="white" size="small" class="justify-start">
                  سياسة الخصوصية
                </v-btn>
                <v-btn variant="text" color="white" size="small" class="justify-start">
                  شروط الاستخدام
                </v-btn>
                <v-btn variant="text" color="white" size="small" class="justify-start">
                  الدعم الفني
                </v-btn>
              </div>
            </v-col>

            <v-col cols="12" md="4">
              <h4 class="text-h6 font-weight-bold text-white mb-4">تواصل معنا</h4>
              <div class="d-flex gap-2 mb-4">
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
            <p class="text-body-2 text-white" style="opacity: 0.9;">
              © 2025 MulhimIQ — جميع الحقوق محفوظة.
            </p>
          </div>
        </v-container>
      </v-footer>
    </v-main>

    <!-- Dialogs -->
    <v-dialog v-model="startDialog" max-width="500">
      <v-card class="pa-6">
        <v-card-title class="text-center">
          <h2 class="text-h4 font-weight-bold">ابدأ مع ملهم</h2>
        </v-card-title>
        <v-card-text class="text-center">
          <v-icon size="64" color="accent" class="mb-4">mdi-rocket-launch</v-icon>
          <p class="text-body-1 mb-4">اختر نوع حسابك للبدء</p>
          <div class="d-flex flex-column gap-3">
            <v-btn color="primary" size="large" block to="/login">
              <v-icon start>mdi-account-tie</v-icon>
              حساب معلم
            </v-btn>

            <v-btn color="accent" size="large" block>
              <v-icon start>mdi-school</v-icon>
              حساب طالب
            </v-btn>
          </div>
        </v-card-text>
        <v-card-actions class="justify-center">
          <v-btn variant="text" @click="startDialog = false">إلغاء</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="newsDialog" max-width="900">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start color="primary" class="me-2">mdi-newspaper</v-icon>
          <span class="text-h6 font-weight-bold">{{ selectedNews?.title }}</span>
          <v-spacer />
          <v-btn icon variant="text" @click="newsDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-divider />
        <v-img v-if="selectedNews?.image" :src="selectedNews.image" :alt="selectedNews.title" height="320" cover />
        <v-card-text>
          <div class="text-body-2 text-medium-emphasis mb-2" v-if="selectedNews?.raw?.publishedAt">
            <v-icon size="16" class="me-1">mdi-calendar</v-icon>
            {{ new Date(selectedNews.raw.publishedAt).toLocaleString('en-IQ') }}
          </div>
          <div style="white-space: pre-line;">
            {{ selectedNews?.description }}
          </div>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="newsDialog = false">إغلاق</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="notificationDialog" max-width="700">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start color="primary" class="me-2">mdi-bell</v-icon>
          <span class="text-h6 font-weight-bold">{{ selectedNotification?.title }}</span>
          <v-spacer />
          <v-btn icon variant="text" @click="notificationDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-divider />
        <v-img v-if="selectedNotification?.image" :src="selectedNotification.image" height="260" cover />
        <v-card-text>
          <div class="text-body-2 text-medium-emphasis mb-2" v-if="selectedNotification?.sentAt">
            <v-icon size="16" class="me-1">mdi-calendar</v-icon>
            {{ formatDate(selectedNotification.sentAt) }}
          </div>
          <div style="white-space: pre-line;" class="mb-3">
            {{ selectedNotification?.message }}
          </div>
          <div class="text-caption text-medium-emphasis" v-if="selectedNotification?.type">
            <v-icon size="14" class="me-1">mdi-tag</v-icon>
            {{ selectedNotification.type }}
          </div>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn v-if="selectedNotification?.url" :href="selectedNotification.url" target="_blank" variant="tonal">
            فتح الرابط
          </v-btn>
          <v-btn variant="text" @click="notificationDialog = false">إغلاق</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" location="top">
      {{ snackbar.message }}
      <template #actions>
        <v-btn icon @click="snackbar.show = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script>
import teacher_api from '@/api/teacher/teacher_api';
import logo from '@/assets/images/logo.png';

export default {
  name: 'IndexPage',
  layout: 'blank',

  data() {
    return {
      carouselModel: 0,
      appScreenshots: [],
      // حالة الدخول
      isLoggedIn: false,

      // Dialogs
      startDialog: false,
      studentDialog: false,
      notificationsMenu: false,
      notificationDialog: false,
      notificationsList: [],
      notificationsPage: 1,
      notificationsLimit: 10,
      notificationsHasMore: false,
      notificationsLoading: false,
      unreadCount: 0,
      selectedNotification: null,
      newsDialog: false,
      selectedNews: null,

      // Dashboard theme
      dashboardDark: false,

      // Snackbar
      snackbar: {
        show: false,
        message: '',
        color: 'success'
      },

      // Features data
      features: [
        {
          id: 1,
          icon: 'mdi-calendar-check',
          title: 'إدارة الحصص بسهولة',
          description: 'نظّم جدولك الدراسي وحدد المواعيد بكل سهولة ومرونة',
          color: 'primary',
          colorClass: 'primary'
        },
        {
          id: 2,
          icon: 'mdi-message-text',
          title: 'تواصل مباشر مع الطلاب',
          description: 'تواصل فوري مع طلابك عبر الرسائل والإشعارات',
          color: 'accent',
          colorClass: 'accent'
        },
        {
          id: 3,
          icon: 'mdi-chart-bar',
          title: 'إحصاءات وتقارير تفاعلية',
          description: 'تابع أداء طلابك من خلال تقارير مفصلة ورسوم بيانية',
          color: 'support',
          colorClass: 'support'
        },
        {
          id: 4,
          icon: 'mdi-cash-multiple',
          title: 'نظام مالي واشتراكات ذكي',
          description: 'إدارة المدفوعات والاشتراكات بشكل آلي وآمن',
          color: 'highlight',
          colorClass: 'highlight'
        },
        {
          id: 5,
          icon: 'mdi-bell-ring',
          title: 'إشعارات فورية وتنبيهات تلقائية',
          description: 'ابقَ على اطلاع دائم بكل جديد من خلال الإشعارات الذكية',
          color: 'warning',
          colorClass: 'warning'
        },
        {
          id: 6,
          icon: 'mdi-earth',
          title: 'موقعك، طلابك، كل شيء متصل',
          description: 'منصة متكاملة تربط جميع عناصر العملية التعليمية',
          color: 'info',
          colorClass: 'info'
        }
      ],

      // Dashboard sidebar items
      sidebarItems: [
        { id: 1, icon: 'mdi-view-dashboard', title: 'الرئيسية', active: true },
        { id: 2, icon: 'mdi-book-open-variant', title: 'الكورسات', active: false },
        { id: 3, icon: 'mdi-account-group', title: 'الطلاب', active: false },
        { id: 4, icon: 'mdi-clipboard-check', title: 'الحضور', active: false },
        { id: 5, icon: 'mdi-bell', title: 'الإشعارات', active: false }
      ],

      // Dashboard stats
      stats: [
        { id: 1, icon: 'mdi-account-group', value: '248', label: 'إجمالي الطلاب', color: 'primary', change: '+12%' },
        { id: 2, icon: 'mdi-book-open', value: '12', label: 'الكورسات النشطة', color: 'accent', change: '+3' },
        { id: 3, icon: 'mdi-calendar-today', value: '8', label: 'حصص اليوم', color: 'support', change: '2 قادمة' },
        { id: 4, icon: 'mdi-cash', value: '15,240', label: 'الإيرادات (ريال)', color: 'highlight', change: '+8%' }
      ],

      // Table headers
      tableHeaders: [
        { title: 'الكورس', key: 'course' },
        { title: 'الوقت', key: 'time' },
        { title: 'الطلاب', key: 'students' },
        { title: 'الحالة', key: 'status' },
        { title: 'إجراءات', key: 'actions', sortable: false }
      ],

      // Upcoming classes
      upcomingClasses: [
        { course: 'الرياضيات المتقدمة', time: '10:00 ص', students: 25, status: 'قريباً', statusColor: 'warning' },
        { course: 'الفيزياء الحديثة', time: '12:00 م', students: 18, status: 'مجدول', statusColor: 'info' },
        { course: 'الكيمياء العضوية', time: '02:00 م', students: 22, status: 'مجدول', statusColor: 'info' },
        { course: 'البرمجة بلغة Python', time: '04:00 م', students: 30, status: 'مجدول', statusColor: 'info' },
        { course: 'تصميم الجرافيك', time: '06:00 م', students: 15, status: 'مجدول', statusColor: 'info' }
      ],

      // Notifications
      notifications: [
        { id: 1, icon: 'mdi-account-plus', title: 'طالب جديد انضم للكورس', time: 'منذ 5 دقائق', color: 'success' },
        { id: 2, icon: 'mdi-message', title: 'رسالة جديدة من أحمد', time: 'منذ 15 دقيقة', color: 'primary' },
        { id: 3, icon: 'mdi-calendar', title: 'تذكير: حصة الرياضيات', time: 'منذ 30 دقيقة', color: 'warning' },
        { id: 4, icon: 'mdi-cash', title: 'دفعة جديدة مستلمة', time: 'منذ ساعة', color: 'highlight' }
      ],

      // Steps
      steps: [
        {
          id: 1,
          icon: 'mdi-account-plus',
          title: 'سجّل حسابك كمعلم',
          description: 'أنشئ حسابك المجاني في دقائق معدودة وابدأ رحلتك التعليمية',
          color: 'primary'
        },
        {
          id: 2,
          icon: 'mdi-book-plus',
          title: 'أضف كورساتك وحدد المواعيد وباقات الأشتراك',
          description: 'أنشئ كورساتك الخاصة وحدد الجدول الزمني وباقات الأشتراك المناسبة',
          color: 'accent'
        },
        {
          id: 3,
          icon: 'mdi-account-group',
          title: 'الطلاب يسجلون ويتابعون دروسهم',
          description: 'يمكن للطلاب التسجيل في كورساتك ومتابعة الدروس بسهولة',
          color: 'support'
        },
        {
          id: 4,
          icon: 'mdi-chart-line',
          title: 'تابع الحضور والتقييمات من لوحة التحكم',
          description: 'راقب تقدم طلابك وأدائهم من خلال لوحة تحكم شاملة',
          color: 'highlight'
        }
      ],

      // Testimonials
      testimonials: [
        {
          id: 1,
          name: 'د. محمد العتيبي',
          role: 'معلم رياضيات',
          comment: 'منصة ملهم غيرت طريقة تدريسي بالكامل. أصبح التواصل مع الطلاب أسهل والإدارة أكثر فعالية',
          avatar: 'mdi-account-tie',
          color: 'primary'
        },
        {
          id: 2,
          name: 'أ. سارة الأحمد',
          role: 'معلمة لغة إنجليزية',
          comment: 'أدوات رائعة لتتبع تقدم الطلاب. النظام المالي المدمج وفر علي الكثير من الوقت والجهد',
          avatar: 'mdi-account-circle',
          color: 'accent'
        },
        {
          id: 3,
          name: 'خالد السالم',
          role: 'طالب ثانوي',
          comment: 'واجهة سهلة الاستخدام وتجربة تعليمية ممتازة. أستطيع متابعة دروسي من أي مكان',
          avatar: 'mdi-school',
          color: 'support'
        }
      ],

      // Pricing plans
      pricingPlans: [
        {
          id: 1,
          name: 'مجانية',
          price: '0 ريال',
          period: '/ شهرياً',
          icon: 'mdi-gift',
          iconColor: 'support',
          buttonColor: 'support',
          buttonText: 'ابدأ مجاناً',
          featured: false,
          features: [
            'حتى 20 طالب',
            'كورس واحد نشط',
            'تقارير أساسية',
            'دعم فني محدود',
            'تخزين 1 جيجا'
          ]
        },
        {
          id: 2,
          name: 'أساسية',
          price: '99 ريال',
          period: '/ شهرياً',
          icon: 'mdi-star',
          iconColor: 'white',
          buttonColor: 'accent',
          buttonText: 'اشترك الآن',
          featured: true,
          features: [
            'حتى 100 طالب',
            '5 كورسات نشطة',
            'تقارير متقدمة',
            'دعم فني على مدار الساعة',
            'تخزين 10 جيجا',
            'إشعارات SMS'
          ]
        },
        {
          id: 3,
          name: 'احترافية',
          price: '249 ريال',
          period: '/ شهرياً',
          icon: 'mdi-crown',
          iconColor: 'highlight',
          buttonColor: 'highlight',
          buttonText: 'اشترك الآن',
          featured: false,
          features: [
            'طلاب غير محدودين',
            'كورسات غير محدودة',
            'تقارير وتحليلات شاملة',
            'دعم فني مخصص',
            'تخزين غير محدود',
            'إشعارات SMS',
            'تطبيق موبايل مخصص'
          ]
        }
      ],

      // الأصول
      logo
    }
  },

  mounted() {
    const token = localStorage.getItem('accessToken')
    const user = localStorage.getItem('user')
    this.isLoggedIn = !!(token && user)
    // Load pricing plans from backend
    this.fetchPricingPlans()
    this.getPublicNews()
    if (this.isLoggedIn) this.refreshNotifications()
  },

  methods: {
    scrollToSection(sectionId) {
      const element = document.getElementById(sectionId)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    },

    openStartDialog() {
      this.startDialog = true
    },

    openStudentDialog() {
      this.snackbar = {
        show: true,
        message: 'صفحة الطلاب قيد التطوير',
        color: 'info'
      }
    },

    toggleDashboardTheme() {
      this.dashboardDark = !this.dashboardDark
      this.snackbar = {
        show: true,
        message: this.dashboardDark ? 'تم التبديل للوضع الليلي' : 'تم التبديل للوضع النهاري',
        color: 'info'
      }
    },

    async fetchPricingPlans() {
      try {
        // ✅ جلب البيانات من API
        const res = await teacher_api.getActivePackages();

        // ✅ دعم Axios أو Fetch
        const payload = res.data?.data.data ? res.data.data : res;

        const items = Array.isArray(payload?.data) ? payload.data : [];

        // 🧩 تحويل البيانات إلى شكل واجهة المستخدم
        const mapped = items.map((p) => {
          const isFree = p.isFree || p.price === 0;
          const formattedPrice = isFree
            ? "0"
            : new Intl.NumberFormat("en-IQ").format(p.price);

          return {
            id: p.id,
            name: p.name,
            price: `${formattedPrice} دينار`,
            period: p.durationDays === 30 ? "/ شهرياً" : `/ ${p.durationDays} يوماً`,
            icon: isFree ? "mdi-gift" : "mdi-star",
            iconColor: isFree ? "support" : "white",
            buttonColor: isFree ? "support" : "accent",
            buttonText: isFree ? "ابدأ مجاناً" : "اشترك الآن",
            featured: false,
            features: [
              `حتى ${p.maxStudents} طالب`,
              p.description || (isFree ? "مجاناً للمعلمين الجدد" : "ميزات متقدمة"),
              p.durationDays === 30 ? "اشتراك شهري" : `اشتراك ${p.durationDays} يوم`,
              "دعم فني مخصص",
            ],
          };
        });

        // 🌟 تحديد أول باقة مدفوعة كباقة مميزة
        const paidIndex = mapped.findIndex((pl) => pl.price !== "0 دينار");
        if (paidIndex !== -1) mapped[paidIndex].featured = true;

        // ✅ حفظ النتائج في الحالة
        if (mapped.length) {
          this.pricingPlans = mapped;
        } else {
          throw new Error("لم يتم العثور على باقات.");
        }
      } catch (err) {
        // ⚠️ عرض رسالة خطأ جميلة للمستخدم
        this.snackbar = {
          show: true,
          message: "تعذر تحميل الباقات. يرجى المحاولة لاحقًا",
          color: "error",
        };
        console.warn("⚠️ Failed to fetch pricing plans:", err);
      }
    },

    async getPublicNews() {
      try {
        // ✅ جلب البيانات من API
        const res = await teacher_api.getPublicNews();
        const payload = res.data?.data ? res.data : res;
        const items = Array.isArray(payload.data) ? payload.data : [];
        const baseUrl = payload.content_url || '';

        this.appScreenshots = items.map((n) => ({
          id: n.id,
          title: n.title,
          description: n.details,
          image: baseUrl ? `${baseUrl}${n.imageUrl}` : n.imageUrl,
          raw: n,
        }));
      } catch (err) {
        // ⚠️ عرض رسالة خطأ جميلة للمستخدم
        this.snackbar = {
          show: true,
          message: "تعذر تحميل الباقات. يرجى المحاولة لاحقًا",
          color: "error",
        };
        console.warn("⚠️ Failed to fetch pricing plans:", err);
      }
    },

    openNews(item) {
      this.selectedNews = item;
      this.newsDialog = true;
    },

    async fetchNotifications(page = 1, append = false) {
      try {
        this.notificationsLoading = true
        const res = await teacher_api.getNotifications({ page, limit: this.notificationsLimit })
        const payload = res.data?.data ? res.data : res
        const items = Array.isArray(payload.data) ? payload.data : []
        const baseUrl = payload.content_url || ''
        const mapped = items.map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type,
          is_read: !!n.is_read,
          sentAt: n.sent_at || n.created_at,
          image: n.data?.imageUrl ? (baseUrl ? `${baseUrl}${n.data.imageUrl}` : n.data.imageUrl) : null,
          url: n.data?.url || null,
          raw: n,
        }))
        this.notificationsList = append ? [...this.notificationsList, ...mapped] : mapped
        this.unreadCount = this.notificationsList.filter(n => !n.is_read).length
        const pagination = payload.pagination || {}
        const totalPages = pagination.totalPages || (mapped.length < this.notificationsLimit ? page : page + 1)
        this.notificationsHasMore = page < totalPages && mapped.length > 0
        this.notificationsPage = page
      } catch (err) {
        this.snackbar = { show: true, message: 'تعذر تحميل الإشعارات', color: 'error' }
        console.warn('Failed to fetch notifications:', err)
      } finally {
        this.notificationsLoading = false
      }
    },

    refreshNotifications() {
      this.notificationsPage = 1
      this.fetchNotifications(1, false)
    },

    loadMoreNotifications() {
      const next = this.notificationsPage + 1
      this.fetchNotifications(next, true)
    },

    async openNotification(n) {
      this.selectedNotification = n
      this.notificationDialog = true
      this.notificationsMenu = false
    },

    formatDate(d) {
      try {
        return new Date(d).toLocaleString('en-IQ')
      } catch {
        return d
      }
    },

    selectPlan(plan) {
      this.snackbar = {
        show: true,
        message: `تم اختيار خطة ${plan.name}`,
        color: 'success'
      }
    }
  }
}
</script>

<script setup>
definePage({
  meta: {
    layout: "blank",
  },
});
</script>
<style scoped>
.navbar-glass {
  backdrop-filter: blur(12px);
  background: rgba(11, 37, 69, 90%) !important;
}

.hero-section {
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)) 0%, rgb(var(--v-theme-secondary)) 100%);
  min-block-size: 100vh;
  padding-block-start: 80px;
}

.dashboard-preview-section {
  background: linear-gradient(135deg, #e6f7f1 0%, #d9f5ff 100%);
}

.testimonials-section {
  background: linear-gradient(135deg, #0b2545 0%, #3fa9f5 100%);
}

.cta-section {
  background: linear-gradient(135deg, #0b2545 0%, #6ef2b4 100%);
}

.footer-section {
  background: linear-gradient(135deg, #0b2545 0%, #3fa9f5 100%);
}

@media (max-width: 960px) {
  .responsive-row {
    flex-direction: column-reverse !important;
  }
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

@media (max-width: 768px) {
  .dashboard-preview-section {
    display: none;
  }

  .hero-section {
    padding-block-start: 100px;
    text-align: center;
  }

  .dashboard-sidebar {
    inline-size: 60px;
  }

  .dashboard-sidebar .v-list-item-title {
    display: none;
  }

  .pricing-featured {
    transform: scale(1);
  }
}

.v-list-item-title {
  white-space: pre-wrap;
}

@media (max-width: 960px) {
  .hero-section {
    padding-block-start: 100px;
  }

  .phone-mockup {
    max-inline-size: 280px;
  }

  .phone-frame {
    padding: 10px;
    border-radius: 30px;
  }

  .phone-notch {
    block-size: 20px;
    inline-size: 100px;
  }

  .phone-screen {
    border-radius: 24px;
  }

  .hero-content {
    text-align: center;
  }

  .hero-content .d-flex {
    justify-content: center;
  }

  .download-section {
    text-align: center;
  }
}

@media (max-width: 600px) {
  .phone-mockup {
    max-inline-size: 240px;
  }

  .hero-section h1 {
    font-size: 1.75rem !important;
  }

  .hero-section .text-h6 {
    font-size: 1rem !important;
  }

  .download-section h3 {
    font-size: 1rem !important;
  }

  .download-section .v-btn {
    font-size: 0.875rem;
    padding-inline: 12px;
  }
}

/* Typography */
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

/* Utilities */
.v-btn {
  border-radius: 8px;
  font-weight: 600;
  text-transform: none;
}

.v-card {
  border-radius: 12px;
}

.v-chip {
  border-radius: 20px;
  font-weight: 600;
}

.min-height-screen {
  min-block-size: calc(100vh - 80px);
}

/* Carousel and Phone Mockup Styles */
.hero-carousel-container {
  margin-inline: auto;
  max-inline-size: 100%;
}

/* .hero-carousel {
  overflow: visible !important;
  border-radius: 20px;
} */

.phone-mockup {
  margin-inline: auto;
  max-inline-size: 350px;
}

.phone-frame {
  position: relative;
  padding: 12px;
  border-radius: 40px;
  aspect-ratio: 9 / 19;
  background: linear-gradient(145deg, #1a1a1a, #2d2d2d);
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 40%),
    0 0 0 2px rgba(255, 255, 255, 10%),
    inset 0 0 0 1px rgba(255, 255, 255, 5%);
  inline-size: 100%;
}

.phone-screen {
  position: relative;
  overflow: hidden;
  border-radius: 32px;
  background: white;
  block-size: 100%;
  inline-size: 100%;
}

.phone-screen-image {
  block-size: 100%;
  inline-size: 100%;
}

.download-section {
  border: 2px solid rgba(255, 255, 255, 20%);
}
</style>
