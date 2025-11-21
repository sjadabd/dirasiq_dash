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
              <v-btn variant="text" :to="{ path: '/contact' }">تواصل معنا</v-btn>
              <v-divider vertical class="mx-2" inset />
              <v-btn variant="text" :to="{ path: '/privacy-policy' }">سياسة الخصوصية</v-btn>
              <v-btn variant="text" :to="{ path: '/terms-and-conditions' }">شروط الاستخدام</v-btn>
              <!-- 🔹 زر ديناميكي حسب حالة تسجيل الدخول -->
              <v-btn v-if="!isLoggedIn" color="support"
                style="color: white !important;background-color: #1c324c !important;" variant="elevated" to="/login">
                <v-icon start>mdi-rocket-launch</v-icon>
                ابدأ الآن
              </v-btn>

              <v-btn v-else color="success" variant="elevated" to="/teacher/dashboard">
                <v-icon start>mdi-view-dashboard</v-icon>
                لوحة التحكم
              </v-btn>

            </div>
          </v-col>

          <!-- Mobile navigation -->
          <v-col cols="auto" class="d-flex d-md-none">
            <v-menu location="bottom end">
              <template #activator="{ props }">
                <v-btn icon variant="text" v-bind="props" aria-label="فتح القائمة">
                  <v-icon>mdi-menu</v-icon>
                </v-btn>
              </template>
              <v-list density="compact">
                <v-list-item @click="scrollToSection('hero')" title="الرئيسية" prepend-icon="mdi-home" />
                <v-list-item @click="scrollToSection('features')" title="للمعلمين" prepend-icon="mdi-account-tie" />
                <v-list-item @click="scrollToSection('how-it-works')" title="للطلاب" prepend-icon="mdi-school" />
                <v-list-item @click="scrollToSection('pricing')" title="باقات الأشتراك" prepend-icon="mdi-cash" />
                <v-list-item :to="{ path: '/contact' }" title="تواصل معنا" prepend-icon="mdi-email" />
                <v-divider class="my-1" />
                <v-list-item :to="{ path: '/privacy-policy' }" title="سياسة الخصوصية"
                  prepend-icon="mdi-shield-account" />
                <v-list-item :to="{ path: '/terms-and-conditions' }" title="شروط الاستخدام"
                  prepend-icon="mdi-file-document" />
                <!-- 🔹 زر ديناميكي حسب حالة تسجيل الدخول -->
                <v-btn v-if="!isLoggedIn" color="white" class="ss" variant="elevated" to="/login">
                  <v-icon start>mdi-rocket-launch</v-icon>
                  ابدأ الآن
                </v-btn>

                <v-btn v-else color="success" variant="elevated" to="/teacher/dashboard">
                  <v-icon start>mdi-view-dashboard</v-icon>
                  لوحة التحكم
                </v-btn>

              </v-list>
            </v-menu>
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
                    <v-btn size="small" :loading="notificationsLoading" variant="text"
                      @click="loadMoreNotifications">عرض
                      المزيد</v-btn>
                  </div>
                  <v-card-actions class="justify-end">
                    <v-btn variant="text" @click="notificationsMenu = false">إغلاق</v-btn>
                  </v-card-actions>
                </v-card>
              </v-menu>

            </div>
          </v-col>
        </v-row>
      </v-container>
    </v-app-bar>

    <v-main>
      <!-- 2️⃣ Hero Section -->
      <section id="hero" class="hero-section position-relative overflow-hidden">
        <!-- Background Elements -->
        <div class="hero-bg-glow"></div>
        <div class="hero-shape-1"></div>
        <div class="hero-shape-2"></div>

        <v-container class="position-relative" style="z-index: 2;">
          <v-row align="center" class="min-height-screen py-16">
            <!-- Left side: Text content -->
            <v-col cols="12" md="6" lg="6" class="text-center text-md-right">
              <v-slide-y-transition appear>
                <div>
                  <v-chip color="accent" variant="flat" class="mb-6 px-4 py-2" size="large"
                    style="    color: white;font-weight: 700;">
                    🚀 منصة التعليم الذكي الأولى
                  </v-chip>

                  <h1 class="text-h2 text-lg-h1 font-weight-black mb-6 text-white lh-tight">
                    علّم، ألهم، <br />
                    <span class="text-gradient">وتواصل بذكاء</span>
                  </h1>

                  <p class="text-h6 text-lg-h5 text-grey-lighten-3 mb-8 text-balance lh-relaxed"
                    style="max-width: 600px; margin-inline: auto;">
                    منصة ملهم تمكّنك من إدارة الكورسات، الحضور، والطلاب في مكان واحد.
                    تجربة تعليمية متكاملة تبدأ من هنا.
                  </p>

                  <div class="d-flex gap-4 flex-wrap justify-center justify-md-start mb-10">
                    <v-btn size="x-large" color="white" class="text-primary px-8" height="56" rounded="xl" elevation="6"
                      to="/login">
                      <v-icon start size="24">mdi-rocket-launch</v-icon>
                      ابدأ رحلتك مجاناً
                    </v-btn>

                    <v-btn size="x-large" variant="outlined" color="white" class="px-8" height="56" rounded="xl"
                      to="/login">
                      <v-icon start size="24">mdi-login</v-icon>
                      تسجيل الدخول
                    </v-btn>
                  </div>

                  <!-- App Download Badges -->
                  <div class="d-flex align-center gap-4 justify-center justify-md-start opacity-80">
                    <span class="text-white text-body-2">متوفر الآن للطلاب على:</span>
                    <v-btn icon variant="text" color="white" href="https://apps.apple.com/us/app/mulhimiq/id6754453929"
                      target="_blank">
                      <v-icon size="28">mdi-apple</v-icon>
                    </v-btn>
                    <v-btn icon variant="text" color="white" href="#">
                      <v-icon size="28">mdi-google-play</v-icon>
                    </v-btn>
                  </div>
                </div>
              </v-slide-y-transition>
            </v-col>

            <!-- Right side: Phone Mockup -->
            <v-col cols="12" md="6" lg="6" class="position-relative">
              <v-fade-transition appear>
                <div class="phone-mockup-wrapper d-flex flex-column align-center">
                  <div class="phone-frame">
                    <div class="phone-notch"></div>
                    <div class="phone-screen">
                      <v-carousel v-model="carouselModel" cycle :interval="4000" hide-delimiters :show-arrows="false"
                        height="100%" class="phone-carousel">
                        <v-carousel-item v-for="(screen, index) in appScreenshots" :key="index" :src="screen.image"
                          cover @click="openNews(screen)" class="cursor-pointer">
                          <div class="d-flex flex-column justify-end h-100 pb-8 px-4 position-relative"
                            style="background: linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0) 100%);">
                            <h3 class="text-subtitle-1 font-weight-bold mb-1 text-truncate text-white"
                              style="text-shadow: 0 2px 4px rgba(0,0,0,0.5);">{{ screen.title }}</h3>
                            <p class="text-caption text-grey-lighten-3 text-truncate-2 lh-tight text-white"
                              style="display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
                              {{ screen.description }}
                            </p>
                          </div>
                        </v-carousel-item>
                      </v-carousel>
                    </div>
                  </div>
                  <!-- Carousel Controls -->
                  <div class="d-flex justify-center gap-4 mt-6 position-relative" style="z-index: 5;">
                    <v-btn icon variant="tonal" color="white" @click="carouselModel = Math.max(carouselModel - 1, 0)"
                      :disabled="carouselModel === 0">
                      <v-icon>mdi-chevron-right</v-icon>
                    </v-btn>
                    <v-btn icon variant="tonal" color="white"
                      @click="carouselModel = Math.min(carouselModel + 1, appScreenshots.length - 1)"
                      :disabled="carouselModel === appScreenshots.length - 1">
                      <v-icon>mdi-chevron-left</v-icon>
                    </v-btn>
                  </div>
                  <!-- Floating Elements -->
                  <v-card class="floating-card card-1 d-none d-sm-block" elevation="10">
                    <div class="d-flex align-center gap-3">
                      <v-avatar color="success" size="40">
                        <v-icon color="white">mdi-check</v-icon>
                      </v-avatar>
                      <div>
                        <div class="text-caption text-grey">تم الحضور</div>
                        <div class="font-weight-bold">98% اليوم</div>
                      </div>
                    </div>
                  </v-card>
                  <v-card class="floating-card card-2 d-none d-sm-block" elevation="10">
                    <div class="d-flex align-center gap-3">
                      <v-avatar color="primary" size="40">
                        <v-icon color="white">mdi-school</v-icon>
                      </v-avatar>
                      <div>
                        <div class="text-caption text-grey">الطلاب النشطين</div>
                        <div class="font-weight-bold">+1,250 طالب</div>
                      </div>
                    </div>
                  </v-card>
                </div>
              </v-fade-transition>
            </v-col>
          </v-row>
        </v-container>
      </section>

      <!-- 3️⃣ Feature Section -->
      <section id="features" class="features-section py-16 bg-grey-lighten-5 position-relative">
        <v-container>
          <div class="text-center mb-16">
            <v-chip color="primary" variant="tonal" class="mb-4 font-weight-bold">مميزاتنا</v-chip>
            <h2 class="text-h3 font-weight-bold mb-4 text-primary-dark">كل ما تحتاجه لإدارة تعليمية ناجحة</h2>
            <p class="text-h6 text-medium-emphasis" style="max-width: 700px; margin: 0 auto;">
              أدوات متكاملة صممت خصيصاً لتلبية احتياجات المعلمين والطلاب في بيئة تعليمية عصرية
            </p>
          </div>

          <v-row>
            <v-col cols="12" sm="6" md="4" v-for="feature in features" :key="feature.id">
              <v-hover v-slot="{ isHovering, props }">
                <v-card v-bind="props" :elevation="isHovering ? 12 : 2"
                  class="h-100 text-center pa-8 feature-card transition-swing"
                  :class="[`feature-card-${feature.colorClass}`, { 'on-hover': isHovering }]">
                  <div class="feature-icon-wrapper mb-6" :class="`bg-${feature.color}-lighten-5`">
                    <v-icon :size="40" :color="feature.color">
                      {{ feature.icon }}
                    </v-icon>
                  </div>
                  <h3 class="text-h5 font-weight-bold mb-3 text-primary-dark">
                    {{ feature.title }}
                  </h3>
                  <p class="text-body-1 text-medium-emphasis lh-relaxed">
                    {{ feature.description }}
                  </p>
                </v-card>
              </v-hover>
            </v-col>
          </v-row>
        </v-container>
      </section>

      <!-- 4️⃣ Dashboard Preview Section -->
      <section class="dashboard-preview-section py-16 position-relative overflow-hidden">
        <div class="dashboard-bg-shape"></div>
        <v-container class="position-relative" style="z-index: 2;">
          <div class="text-center mb-16">
            <v-chip color="secondary" variant="tonal" class="mb-4 font-weight-bold">لوحة التحكم</v-chip>
            <h2 class="text-h3 font-weight-bold mb-4 text-primary-dark">تحكم كامل في العملية التعليمية</h2>
            <p class="text-h6 text-medium-emphasis" style="max-width: 700px; margin: 0 auto;">
              واجهة مستخدم بديهية وقوية تمنحك السيطرة الكاملة على كل تفاصيل صفوفك الدراسية
            </p>
          </div>

          <v-row justify="center">
            <v-col cols="12" lg="11">
              <div class="dashboard-window elevation-24">
                <div class="window-header d-flex align-center px-4 py-3 bg-grey-lighten-4 border-b">
                  <div class="window-controls d-flex gap-2 me-4">
                    <div class="control red"></div>
                    <div class="control yellow"></div>
                    <div class="control green"></div>
                  </div>
                  <div
                    class="window-address-bar flex-grow-1 bg-white rounded px-3 py-1 text-caption text-grey text-center">
                    mulhimiq.com/teacher/dashboard
                  </div>
                </div>
                <v-card elevation="0" class="dashboard-demo-card rounded-0">
                  <v-row no-gutters>
                    <!-- Sidebar -->
                    <v-col cols="auto" class="dashboard-sidebar bg-grey-lighten-5 border-e">
                      <v-list density="compact" class="py-4 bg-transparent">
                        <v-list-item v-for="item in sidebarItems" :key="item.id" :prepend-icon="item.icon"
                          :title="item.title" :active="item.active" class="mb-2 rounded-e-xl" color="primary" />
                      </v-list>
                    </v-col>

                    <!-- Main Content -->
                    <v-col>
                      <!-- Toolbar -->
                      <v-toolbar color="white" density="compact" class="border-b px-2">
                        <v-toolbar-title class="text-subtitle-1 font-weight-bold">
                          لوحة التحكم
                        </v-toolbar-title>
                        <v-spacer />
                        <v-btn icon size="small" variant="text">
                          <v-icon>mdi-magnify</v-icon>
                        </v-btn>
                        <v-btn icon size="small" variant="text" @click="notificationsMenu = true">
                          <v-badge v-if="unreadCount" color="error" :content="unreadCount" dot>
                            <v-icon>mdi-bell-outline</v-icon>
                          </v-badge>
                          <template v-else>
                            <v-icon>mdi-bell-outline</v-icon>
                          </template>
                        </v-btn>
                        <v-avatar size="32" color="accent" class="ms-2">
                          <v-img
                            src="https://avataaars.io/?avatarStyle=Circle&topType=ShortHairShortFlat&accessoriesType=Blank&hairColor=Black&facialHairType=Blank&clotheType=BlazerShirt&eyeType=Default&eyebrowType=Default&mouthType=Default&skinColor=Light" />
                        </v-avatar>
                      </v-toolbar>

                      <!-- Dashboard Content -->
                      <div class="dashboard-content pa-6 bg-grey-lighten-5 h-100">
                        <v-row>
                          <!-- Stats Cards -->
                          <v-col cols="12" sm="6" md="3" v-for="stat in stats" :key="stat.id">
                            <v-card elevation="0" class="pa-4 stat-card border">
                              <div class="d-flex align-center justify-space-between mb-2">
                                <v-avatar :color="stat.color" variant="tonal" rounded="lg">
                                  <v-icon>{{ stat.icon }}</v-icon>
                                </v-avatar>
                                <v-chip :color="stat.color" size="x-small" variant="flat" class="font-weight-bold">
                                  {{ stat.change }}
                                </v-chip>
                              </div>
                              <h4 class="text-h5 font-weight-bold mb-1">{{ stat.value }}</h4>
                              <p class="text-caption text-medium-emphasis">{{ stat.label }}</p>
                            </v-card>
                          </v-col>

                          <!-- Upcoming Classes Table -->
                          <v-col cols="12" md="8">
                            <v-card elevation="0" class="border h-100">
                              <v-card-title class="d-flex align-center text-subtitle-1 font-weight-bold px-4 pt-4">
                                الدروس القادمة
                                <v-spacer />
                                <v-btn variant="text" size="small" color="primary">عرض الكل</v-btn>
                              </v-card-title>
                              <v-data-table :headers="tableHeaders" :items="upcomingClasses" density="compact"
                                :items-per-page="5" hide-default-footer class="bg-transparent">
                                <template #item.status="{ item }">
                                  <v-chip :color="item.statusColor" size="x-small" variant="flat">
                                    {{ item.status }}
                                  </v-chip>
                                </template>
                                <template #item.actions>
                                  <v-btn icon size="x-small" variant="text" color="grey">
                                    <v-icon>mdi-dots-vertical</v-icon>
                                  </v-btn>
                                </template>
                              </v-data-table>
                            </v-card>
                          </v-col>

                          <!-- Notifications -->
                          <v-col cols="12" md="4">
                            <v-card elevation="0" class="border h-100">
                              <v-card-title class="d-flex align-center text-subtitle-1 font-weight-bold px-4 pt-4">
                                آخر النشاطات
                              </v-card-title>
                              <v-list density="compact" class="bg-transparent">
                                <v-list-item v-for="notification in notifications" :key="notification.id"
                                  :title="notification.title" :subtitle="notification.time"
                                  class="notification-item px-2">
                                  <template #prepend>
                                    <div class="me-3 position-relative">
                                      <v-avatar :color="notification.color" size="8" variant="flat"
                                        class="mb-4"></v-avatar>
                                      <div class="vertical-line"
                                        style="position: absolute; top: 12px; left: 3px; width: 2px; height: 100%; background: #eee;">
                                      </div>
                                    </div>
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
              </div>
            </v-col>
          </v-row>
        </v-container>
      </section>

      <!-- 5️⃣ How It Works Section -->
      <section id="how-it-works" class="how-it-works-section py-16 bg-white">
        <v-container>
          <div class="text-center mb-16">
            <v-chip color="accent" variant="tonal" class="mb-4 font-weight-bold">خطوات العمل</v-chip>
            <h2 class="text-h3 font-weight-bold mb-4 text-primary-dark">ابدأ رحلتك في دقائق</h2>
            <p class="text-h6 text-medium-emphasis">نظام بسيط وفعال يضمن لك انطلاقة سريعة</p>
          </div>

          <v-row justify="center">
            <v-col cols="12" lg="10">
              <v-timeline :side="$vuetify.display.mdAndDown ? 'end' : undefined"
                :density="$vuetify.display.smAndDown ? 'compact' : 'default'" align="start" line-color="grey-lighten-2"
                truncate-line="start">
                <v-timeline-item v-for="(step, index) in steps" :key="step.id" :dot-color="step.color" size="large"
                  fill-dot>
                  <template #icon>
                    <v-icon color="white" size="24">{{ step.icon }}</v-icon>
                  </template>
                  <v-card elevation="0" class="border pt-6 pb-6 px-6 rounded-xl" :class="`border-${step.color}`"
                    style="border-width: 2px !important;">
                    <div class="d-flex align-center mb-4">
                      <v-chip :color="step.color" size="small" class="font-weight-bold me-3">خطوة {{ index + 1
                        }}</v-chip>
                      <h3 class="text-h5 font-weight-bold text-primary-dark">{{ step.title }}</h3>
                    </div>
                    <p class="text-body-1 text-medium-emphasis lh-relaxed">{{ step.description }}</p>
                  </v-card>
                </v-timeline-item>
              </v-timeline>
            </v-col>
          </v-row>
        </v-container>
      </section>

      <!-- 6️⃣ Testimonials Section -->
      <!-- <section class="testimonials-section py-16">
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
      </section> -->

      <!-- 7️⃣ Pricing Section -->
      <section id="pricing" class="pricing-section py-16 bg-grey-lighten-5 position-relative">
        <v-container>
          <div class="text-center mb-16">
            <v-chip color="success" variant="tonal" class="mb-4 font-weight-bold">الباقات والأسعار</v-chip>
            <h2 class="text-h3 font-weight-bold mb-4 text-primary-dark">استثمر في مستقبل تعليمي أفضل</h2>
            <p class="text-h6 text-medium-emphasis">اختر الباقة التي تناسب احتياجاتك وابدأ فوراً</p>
          </div>

          <!-- Capacity Report -->
          <v-row v-if="isLoggedIn" class="mb-12" justify="center">
            <v-col cols="12" md="8">
              <v-card elevation="2">
                <v-card-title class="d-flex align-center justify-space-between">
                  <div class="d-flex align-center gap-2">
                    <v-icon color="primary">mdi-account-group</v-icon>
                    <span>سعة اشتراك الطلاب</span>
                  </div>
                  <v-btn variant="text" size="small" :loading="subscriptionCapacityLoading"
                    @click="fetchSubscriptionCapacity">
                    تحديث
                  </v-btn>
                </v-card-title>
                <v-card-text>
                  <v-alert v-if="subscriptionCapacityError" type="error" variant="tonal" class="mb-4"
                    density="comfortable">
                    {{ subscriptionCapacityError }}
                  </v-alert>

                  <div class="d-flex flex-wrap gap-4">
                    <div>
                      <div class="text-caption text-medium-emphasis">الطلاب الحاليون</div>
                      <div class="text-h6 font-weight-bold">
                        {{ subscriptionCapacity.currentStudents }}
                      </div>
                    </div>
                    <div>
                      <div class="text-caption text-medium-emphasis">الحد الأقصى في الباقة</div>
                      <div class="text-h6 font-weight-bold">
                        {{ subscriptionCapacity.maxStudents }}
                      </div>
                    </div>
                    <div>
                      <div class="text-caption text-medium-emphasis">المتبقّي</div>
                      <div class="text-h6 font-weight-bold">
                        {{ subscriptionCapacity.remaining }}
                      </div>
                    </div>
                    <div>
                      <div class="text-caption text-medium-emphasis">إمكانية إضافة طلاب جدد</div>
                      <div class="text-subtitle-2 font-weight-bold"
                        :class="subscriptionCapacity.canAdd ? 'text-success' : 'text-error'">
                        {{ subscriptionCapacity.canAdd ? 'يمكن إضافة طلاب جدد' : 'لا يمكن إضافة طلاب جدد' }}
                      </div>
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <v-row justify="center" align="stretch">
            <v-col cols="12" md="4" lg="3" v-for="plan in pricingPlans" :key="plan.id">
              <v-hover v-slot="{ isHovering, props }">
                <v-card v-bind="props" :elevation="plan.featured ? 12 : (isHovering ? 6 : 2)"
                  class="h-100 text-center pa-6 pricing-card d-flex flex-column position-relative transition-swing"
                  :class="{ 'pricing-featured border-primary': plan.featured, 'mt-n4': plan.featured }"
                  :variant="plan.featured ? 'elevated' : 'flat'" :color="plan.featured ? 'white' : 'white'">

                  <div v-if="plan.featured" class="position-absolute top-0 left-0 right-0 text-center"
                    style="transform: translateY(-50%);">
                    <v-chip color="accent" variant="flat" class="font-weight-bold px-6" elevation="4">الأكثر
                      طلباً</v-chip>
                  </div>

                  <div class="mb-6">
                    <v-avatar :color="plan.featured ? 'primary' : 'grey-lighten-4'" size="80" class="mb-4">
                      <v-icon size="40" :color="plan.featured ? 'white' : 'primary'">{{ plan.icon }}</v-icon>
                    </v-avatar>
                    <h3 class="text-h5 font-weight-bold mb-2">{{ plan.name }}</h3>
                    <div class="d-flex align-center justify-center">
                      <span class="text-h4 font-weight-black text-primary-dark">{{ plan.price }}</span>
                    </div>
                    <span class="text-caption text-medium-emphasis">{{ plan.period }}</span>
                  </div>

                  <v-divider class="mb-6"></v-divider>

                  <v-list density="compact" class="mb-auto bg-transparent text-start">
                    <v-list-item v-for="feature in plan.features" :key="feature" class="px-0 mb-2">
                      <template #prepend>
                        <v-icon color="success" size="20" class="me-2">mdi-check-circle</v-icon>
                      </template>
                      <v-list-item-title class="text-body-2 font-weight-medium">{{ feature }}</v-list-item-title>
                    </v-list-item>
                  </v-list>

                  <v-btn :color="plan.featured ? 'primary' : 'primary'"
                    :variant="plan.featured ? 'elevated' : 'outlined'" size="large" block rounded="xl"
                    class="mt-6 font-weight-bold" height="48" @click="selectPlan(plan)">
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
                <v-btn size="x-large" color="white" variant="elevated" to="/login">
                  <v-icon start>mdi-account-plus</v-icon>
                  أنشئ حسابك مجانًا
                </v-btn>
              </div>
            </v-col>
          </v-row>
        </v-container>
      </section>

      <!-- 8️⃣ Contact Us -->
      <section id="contact" class="py-16 bg-white">
        <v-container>
          <v-row>
            <v-col cols="12" md="5" class="mb-8 mb-md-0">
              <h2 class="text-h3 font-weight-bold mb-6 text-primary-dark">تواصل معنا</h2>
              <p class="text-h6 text-medium-emphasis mb-8 lh-relaxed">
                فريقنا جاهز للإجابة على استفساراتك ومساعدتك في البدء. لا تتردد في التواصل معنا في أي وقت.
              </p>

              <div class="d-flex align-center mb-6">
                <v-avatar color="primary-lighten-5" size="56" class="me-4">
                  <v-icon color="primary" size="28">mdi-email</v-icon>
                </v-avatar>
                <div>
                  <div class="text-caption text-medium-emphasis">البريد الإلكتروني</div>
                  <div class="text-subtitle-1 font-weight-bold">support@mulhimiq.com</div>
                </div>
              </div>

              <div class="d-flex align-center mb-6">
                <v-avatar color="primary-lighten-5" size="56" class="me-4">
                  <v-icon color="primary" size="28">mdi-phone</v-icon>
                </v-avatar>
                <div>
                  <div class="text-caption text-medium-emphasis">الهاتف</div>
                  <div class="text-subtitle-1 font-weight-bold">+964 770 000 0000</div>
                </div>
              </div>

              <div class="d-flex align-center">
                <v-avatar color="primary-lighten-5" size="56" class="me-4">
                  <v-icon color="primary" size="28">mdi-map-marker</v-icon>
                </v-avatar>
                <div>
                  <div class="text-caption text-medium-emphasis">العنوان</div>
                  <div class="text-subtitle-1 font-weight-bold">بغداد، العراق</div>
                </div>
              </div>
            </v-col>

            <v-col cols="12" md="6" offset-md="1">
              <v-card elevation="0" class="border pa-8 rounded-xl">
                <h3 class="text-h5 font-weight-bold mb-6">أرسل لنا رسالة</h3>
                <v-alert v-if="contactError" type="error" variant="tonal" class="mb-4" closable
                  @click:close="contactError = ''">
                  {{ contactError }}
                </v-alert>
                <v-alert v-if="contactSuccess" type="success" variant="tonal" class="mb-4" closable
                  @click:close="contactSuccess = ''">
                  {{ contactSuccess }}
                </v-alert>

                <v-form @submit.prevent="submitContact">
                  <v-row>
                    <v-col cols="12" md="6">
                      <v-text-field v-model="contactForm.name" label="الاسم الكامل" variant="outlined"
                        density="comfortable" color="primary" />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field v-model="contactForm.email" type="email" label="البريد الإلكتروني"
                        variant="outlined" density="comfortable" color="primary" />
                    </v-col>
                    <v-col cols="12">
                      <v-text-field v-model="contactForm.subject" label="الموضوع" variant="outlined"
                        density="comfortable" color="primary" />
                    </v-col>
                    <v-col cols="12">
                      <v-textarea v-model="contactForm.message" label="نص الرسالة" rows="4" auto-grow variant="outlined"
                        density="comfortable" color="primary" />
                    </v-col>
                    <v-col cols="12">
                      <v-btn type="submit" color="primary" size="large" block height="48" :loading="contactLoading"
                        class="font-weight-bold rounded-lg">
                        إرسال الرسالة
                      </v-btn>
                    </v-col>
                  </v-row>
                </v-form>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </section>

      <!-- 9️⃣ Footer -->
      <v-footer id="footer" class="footer-section text-white pt-16 pb-8">
        <v-container>
          <v-row class="mb-12">
            <v-col cols="12" md="4" class="mb-8 mb-md-0">
              <div class="d-flex align-center mb-6">
                <v-img :src="logo" width="40" height="40" class="me-3 bg-white rounded-circle pa-1" />
                <h3 class="text-h4 font-weight-bold">
                  <span>Mulhim</span><span class="text-accent">IQ</span>
                </h3>
              </div>
              <p class="text-body-1 text-grey-lighten-3 mb-6 lh-relaxed" style="max-width: 300px;">
                منصة تعليمية متكاملة تربط بين المعلمين والطلاب والإدارة في منظومة واحدة للتعليم الذكي.
              </p>
              <div class="d-flex gap-2">
                <v-btn icon variant="tonal" color="white" size="small" class="rounded-circle">
                  <v-icon>mdi-facebook</v-icon>
                </v-btn>
                <v-btn icon variant="tonal" color="white" size="small" class="rounded-circle">
                  <v-icon>mdi-twitter</v-icon>
                </v-btn>
                <v-btn icon variant="tonal" color="white" size="small" class="rounded-circle">
                  <v-icon>mdi-instagram</v-icon>
                </v-btn>
                <v-btn icon variant="tonal" color="white" size="small" class="rounded-circle">
                  <v-icon>mdi-linkedin</v-icon>
                </v-btn>
              </div>
            </v-col>

            <v-col cols="6" md="2" offset-md="2">
              <h4 class="text-h6 font-weight-bold mb-6">الروابط</h4>
              <div class="d-flex flex-column gap-3">
                <a href="#" class="text-grey-lighten-3 text-decoration-none hover-white">الرئيسية</a>
                <a href="#features" class="text-grey-lighten-3 text-decoration-none hover-white">المميزات</a>
                <a href="#pricing" class="text-grey-lighten-3 text-decoration-none hover-white">الأسعار</a>
                <a href="#contact" class="text-grey-lighten-3 text-decoration-none hover-white">تواصل معنا</a>
              </div>
            </v-col>

            <v-col cols="6" md="2">
              <h4 class="text-h6 font-weight-bold mb-6">قانوني</h4>
              <div class="d-flex flex-column gap-3">
                <router-link to="/privacy-policy" class="text-grey-lighten-3 text-decoration-none hover-white">سياسة
                  الخصوصية</router-link>
                <router-link to="/terms-and-conditions"
                  class="text-grey-lighten-3 text-decoration-none hover-white">شروط
                  الاستخدام</router-link>
              </div>
            </v-col>

            <v-col cols="12" md="2">
              <h4 class="text-h6 font-weight-bold mb-6">حمل التطبيق</h4>
              <v-btn color="white" variant="outlined" block class="mb-3"
                href="https://apps.apple.com/us/app/mulhimiq/id6754453929" target="_blank">
                <v-icon start>mdi-apple</v-icon> App Store
              </v-btn>
              <v-btn color="white" variant="outlined" block href="#">
                <v-icon start>mdi-google-play</v-icon> Google Play
              </v-btn>
            </v-col>
          </v-row>

          <v-divider class="mb-8 border-opacity-25"></v-divider>

          <div class="text-center text-body-2 text-grey-lighten-4">
            © 2025 MulhimIQ — جميع الحقوق محفوظة.
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
import emailjs from 'emailjs-com';

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

      // Contact form state
      contactForm: { name: '', email: '', subject: '', message: '' },
      contactLoading: false,
      contactError: '',
      contactSuccess: '',

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

      // تقرير سعة اشتراك المعلم (للمعلمين المسجلين الدخول)
      subscriptionCapacity: {
        currentStudents: 0,
        maxStudents: 0,
        remaining: 0,
        canAdd: false,
      },
      subscriptionCapacityLoading: false,
      subscriptionCapacityError: '',

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
    if (this.isLoggedIn) {
      this.refreshNotifications()
      try {
        const parsedUser = JSON.parse(user)
        if (parsedUser?.userType === 'teacher') {
          this.fetchSubscriptionCapacity()
        }
      } catch { }
    }
    try {
      const params = new URLSearchParams(window.location.search)
      const qid = params.get('notificationId')
      if (qid) this.markNotificationAsRead(String(qid))
    } catch { }
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

    async submitContact() {
      try {
        this.contactError = ''
        this.contactSuccess = ''
        const { name, email, subject, message } = this.contactForm

        if (!name || !email || !message) {
          this.contactError = 'يرجى تعبئة الاسم والبريد والرسالة'
          return
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          this.contactError = 'يرجى إدخال بريد إلكتروني صالح'
          return
        }

        this.contactLoading = true

        const templateParams = {
          from_name: name,
          from_email: email,
          subject: subject || 'رسالة من نموذج التواصل',
          message,
        }


        // ⚙️ ضع قيمك هنا من لوحة EmailJS
        const SERVICE_ID = 'service_e6wa64v'
        const TEMPLATE_ID = 'template_rn0tt0u'
        const PUBLIC_KEY = 'km9zF8cdDOxdFruui'  // تجده في صفحة Account > API Keys في EmailJS

        const response = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY)

        if (response.status === 200) {
          this.contactSuccess = '✅ تم إرسال رسالتك بنجاح وسنعاود التواصل قريبًا'
          this.contactForm = { name: '', email: '', subject: '', message: '' }
        } else {
          this.contactError = 'حدث خطأ أثناء الإرسال، حاول لاحقًا'
        }
      } catch (err) {
        console.error('EmailJS Error:', err)
        this.contactError = 'تعذر إرسال الرسالة، يرجى المحاولة لاحقًا'
      } finally {
        this.contactLoading = false
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

    async fetchSubscriptionCapacity() {
      this.subscriptionCapacityLoading = true
      this.subscriptionCapacityError = ''
      try {
        const res = await teacher_api.getRemainingStudents()
        const ok = res?.data?.success || res?.success
        const data = res?.data?.data || res?.data || res

        if (!ok || !data) {
          throw new Error(res?.data?.message || 'تعذر جلب تقرير السعة')
        }

        this.subscriptionCapacity = {
          currentStudents: Number(data.currentStudents) || 0,
          maxStudents: Number(data.maxStudents) || 0,
          remaining: Number(data.remaining) || 0,
          canAdd: Boolean(data.canAdd),
        }
      } catch (err) {
        console.warn('Failed to fetch remaining students:', err)
        this.subscriptionCapacityError =
          err?.response?.data?.message ||
          err?.message ||
          'تعذر جلب تقرير السعة، يرجى المحاولة لاحقًا'
      } finally {
        this.subscriptionCapacityLoading = false
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
      if (n && !n.is_read && n.id) {
        await this.markNotificationAsRead(n.id)
      }
    },

    async markNotificationAsRead(id) {
      try {
        if (!id) return
        await teacher_api.markNotificationRead(id)
        const idx = this.notificationsList.findIndex(x => x.id === id)
        if (idx > -1 && !this.notificationsList[idx].is_read) {
          this.notificationsList[idx].is_read = true
          this.unreadCount = Math.max(0, this.unreadCount - 1)
        }
      } catch (err) {
        console.warn('Failed to mark notification as read:', err)
      }
    },

    async onDemoNotificationClick(notification) {
      // يحاول تعليم الإشعار إن كان له معرف صالح (للقائمة التجريبية قد لا يكون ذلك متاحًا)
      try {
        if (notification?.id) await teacher_api.markNotificationRead(notification.id)
      } catch { }
    },

    formatDate(d) {
      try {
        return new Date(d).toLocaleString('en-IQ')
      } catch {
        return d
      }
    },

    async selectPlan(plan) {
      try {
        const res = await teacher_api.activateSubscriptionPackage(plan.id)
        const ok = res?.data?.success || res?.success
        const msg = res?.data?.message || res?.message || `تم تفعيل باقة ${plan.name} بنجاح`

        this.snackbar = {
          show: true,
          message: msg,
          color: ok ? 'success' : 'error',
        }
      } catch (err) {
        console.warn('Failed to activate subscription package:', err)
        const msg = err?.response?.data?.message || err?.response?.data?.errors?.[0] || 'تعذر تفعيل الباقة، يرجى المحاولة لاحقًا'
        this.snackbar = {
          show: true,
          message: msg,
          color: 'error',
        }
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

.ss {
  color: white !important;
}

.ss .v-icon {
  color: white !important;
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

/* New Styles */
.hero-bg-glow {
  position: absolute;
  top: -20%;
  right: -10%;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(var(--v-theme-accent), 0.3) 0%, rgba(0, 0, 0, 0) 70%);
  filter: blur(80px);
  z-index: 1;
}

.hero-shape-1 {
  position: absolute;
  bottom: 10%;
  left: -5%;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(var(--v-theme-primary), 0.4) 0%, rgba(0, 0, 0, 0) 70%);
  filter: blur(60px);
  z-index: 1;
}

.text-gradient {
  background: linear-gradient(90deg, #fff 0%, rgb(var(--v-theme-accent)) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.phone-mockup-wrapper {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
}

.phone-frame {
  width: 300px;
  max-width: 100%;
  height: 600px;
  max-height: 80vh;
  background: #1a1a1a;
  border-radius: 48px;
  border: 8px solid #2d2d2d;
  position: relative;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.phone-notch {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 120px;
  height: 24px;
  background: #2d2d2d;
  border-bottom-left-radius: 16px;
  border-bottom-right-radius: 16px;
  z-index: 10;
}

.phone-screen {
  width: 100%;
  height: 100%;
  background: #000;
  overflow: hidden;
  border-radius: 38px;
}

.floating-card {
  position: absolute;
  padding: 12px 16px;
  border-radius: 16px !important;
  background: rgba(255, 255, 255, 0.9) !important;
  backdrop-filter: blur(10px);
  z-index: 5;
}

.card-1 {
  top: 20%;
  left: 0;
  animation: float 6s ease-in-out infinite;
}

.card-2 {
  bottom: 20%;
  right: 0;
  animation: float 6s ease-in-out infinite 2s;
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

.feature-card {
  border-radius: 24px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  background: white;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.feature-card.on-hover {
  transform: translateY(-10px);
}

.feature-icon-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  transition: transform 0.3s ease;
}

.feature-card:hover .feature-icon-wrapper {
  transform: scale(1.1) rotate(5deg);
}

.dashboard-window {
  border-radius: 12px;
  overflow: hidden;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.window-controls .control {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.window-controls .red {
  background: #ff5f56;
}

.window-controls .yellow {
  background: #ffbd2e;
}

.window-controls .green {
  background: #27c93f;
}

.dashboard-bg-shape {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 120%;
  height: 100%;
  background: radial-gradient(circle, rgba(var(--v-theme-primary), 0.05) 0%, rgba(0, 0, 0, 0) 70%);
  z-index: 1;
}

.pricing-card {
  border-radius: 24px !important;
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.pricing-card:hover {
  transform: translateY(-5px);
}

.hover-white {
  transition: color 0.2s ease;
}

.hover-white:hover {
  color: white !important;
}

.cursor-pointer {
  cursor: pointer;
}
</style>
