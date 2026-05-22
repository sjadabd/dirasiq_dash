<template>
  <v-app>
    <!-- =====================================================
       Mulhim IQ — Landing v2 (smart platform redesign)
       Single-file landing rebuilt 2026-05-16.
       Data-driven sections wired to live Phase-1 APIs:
         /health, /api/public/news,
         /api/teacher-search/governorates,
         /api/teacher/subscription-packages/active.
    ===================================================== -->

    <!-- 1. NAVBAR ============================================ -->
    <v-app-bar
      app
      fixed
      elevation="0"
      :scroll-behavior="'hide'"
      class="navbar-glass"
      :class="{ 'navbar-scrolled': isScrolled }"
    >
      <v-container class="d-flex align-center" style="max-width:1280px;">
        <!-- Brand -->
        <router-link to="/" class="d-flex align-center text-decoration-none brand-link">
          <v-img :src="logo" width="44" height="44" class="me-3 brand-logo" />
          <div class="d-flex flex-column lh-1">
            <span class="brand-text">
              <span class="text-primary">Mulhim</span><span class="text-accent">IQ</span>
            </span>
            <span class="brand-sub d-none d-sm-block">منصة التعليم الذكي</span>
          </div>
        </router-link>

        <v-spacer />

        <!-- Desktop menu -->
        <div class="d-none d-md-flex align-center nav-links">
          <v-btn variant="text" class="nav-link" @click="scrollToSection('hero')">الرئيسية</v-btn>
          <v-btn variant="text" class="nav-link" @click="scrollToSection('features')">المميزات</v-btn>
          <v-btn variant="text" class="nav-link" @click="scrollToSection('preview')">النظام</v-btn>
          <v-btn variant="text" class="nav-link" @click="scrollToSection('how-it-works')">كيف يعمل</v-btn>
          <v-btn variant="text" class="nav-link" :to="{ path: '/contact' }">تواصل</v-btn>
        </div>

        <v-spacer />

        <!-- Right actions -->
        <div class="d-flex align-center gap-2">
          <v-menu v-if="isLoggedIn" v-model="notificationsMenu" location="bottom end" :close-on-content-click="false">
            <template #activator="{ props }">
              <v-btn icon variant="text" v-bind="props" class="notif-trigger">
                <v-badge v-if="unreadCount" color="error" :content="unreadCount" overlap>
                  <v-icon>mdi-bell-outline</v-icon>
                </v-badge>
                <v-icon v-else>mdi-bell-outline</v-icon>
              </v-btn>
            </template>
            <v-card min-width="380" class="notif-card">
              <v-card-title class="d-flex align-center pb-2">
                <v-icon start class="me-2 text-primary">mdi-bell</v-icon>
                <span class="text-subtitle-1 font-weight-bold">الإشعارات</span>
                <v-spacer />
                <v-btn size="small" variant="text" :loading="notificationsLoading" @click="refreshNotifications">تحديث</v-btn>
              </v-card-title>
              <v-divider />
              <v-list v-if="notificationsList.length" density="compact" max-height="420" class="overflow-y-auto">
                <v-list-item
                  v-for="n in notificationsList"
                  :key="n.id"
                  :title="n.title"
                  :subtitle="formatDate(n.sentAt)"
                  class="notif-item"
                  @click="openNotification(n)"
                >
                  <template #prepend>
                    <v-avatar size="36" :color="n.is_read ? 'grey-lighten-2' : 'primary'">
                      <v-img v-if="n.image" :src="n.image" cover />
                      <v-icon v-else :color="n.is_read ? 'grey' : 'white'" size="18">mdi-bell</v-icon>
                    </v-avatar>
                  </template>
                </v-list-item>
              </v-list>
              <div v-else class="text-center pa-6 text-medium-emphasis">
                <v-icon size="40" color="grey-lighten-1" class="mb-2">mdi-bell-off-outline</v-icon>
                <div>لا توجد إشعارات</div>
              </div>
              <v-divider v-if="notificationsHasMore" />
              <div v-if="notificationsHasMore" class="d-flex justify-center pa-2">
                <v-btn size="small" :loading="notificationsLoading" variant="text" @click="loadMoreNotifications">عرض المزيد</v-btn>
              </div>
            </v-card>
          </v-menu>

          <!-- Primary CTA -->
          <v-btn v-if="!isLoggedIn" class="d-none d-sm-flex cta-btn" color="primary" variant="elevated" rounded="lg" to="/login">
            <v-icon start>mdi-rocket-launch-outline</v-icon>
            ابدأ الآن
          </v-btn>
          <v-btn v-else class="d-none d-sm-flex cta-btn" color="success" variant="elevated" rounded="lg" to="/teacher/dashboard">
            <v-icon start>mdi-view-dashboard-outline</v-icon>
            لوحة التحكم
          </v-btn>

          <!-- Mobile menu -->
          <v-menu location="bottom end" class="d-md-none">
            <template #activator="{ props }">
              <v-btn icon variant="text" v-bind="props" class="d-md-none">
                <v-icon>mdi-menu</v-icon>
              </v-btn>
            </template>
            <v-list density="compact" min-width="220">
              <v-list-item @click="scrollToSection('hero')" title="الرئيسية" prepend-icon="mdi-home-outline" />
              <v-list-item @click="scrollToSection('features')" title="المميزات" prepend-icon="mdi-star-outline" />
              <v-list-item @click="scrollToSection('preview')" title="النظام" prepend-icon="mdi-monitor-dashboard" />
              <v-list-item @click="scrollToSection('how-it-works')" title="كيف يعمل" prepend-icon="mdi-stairs" />
              <v-list-item :to="{ path: '/contact' }" title="تواصل" prepend-icon="mdi-email-outline" />
              <v-divider class="my-1" />
              <v-list-item v-if="!isLoggedIn" to="/login" title="ابدأ الآن" prepend-icon="mdi-rocket-launch-outline" />
              <v-list-item v-else to="/teacher/dashboard" title="لوحة التحكم" prepend-icon="mdi-view-dashboard-outline" />
            </v-list>
          </v-menu>
        </div>
      </v-container>
    </v-app-bar>

    <v-main>
      <!-- 2. HERO ============================================== -->
      <section id="hero" class="hero-section">
        <!-- Layered backgrounds: gradient mesh + grain + animated orbs -->
        <div class="hero-mesh" />
        <div class="hero-orb orb-1" />
        <div class="hero-orb orb-2" />
        <div class="hero-orb orb-3" />
        <div class="hero-grain" />

        <v-container class="hero-inner" style="max-width:1280px;">
          <v-row align="center" class="hero-row">
            <!-- Left: copy + CTAs + trust -->
            <v-col cols="12" md="6" lg="7" class="hero-copy">
              <v-slide-y-transition appear>
                <div>
                  <div class="hero-eyebrow">
                    <span class="live-dot" :class="{ ok: apiHealthy, down: apiHealthy === false }" />
                    <span class="eyebrow-text">
                      {{ apiHealthy ? 'النظام يعمل بكفاءة الآن' : (apiHealthy === false ? 'تحقق من الاتصال' : 'جاري التحقق…') }}
                    </span>
                  </div>

                  <h1 class="hero-title">
                    منصة تعليمية ذكية،<br>
                    <span class="hero-title-accent">إدارة كاملة بنقرة واحدة.</span>
                  </h1>

                  <p class="hero-sub">
                    ملهم IQ توحّد لك كل العملية التعليمية — الكورسات، الجداول، الحضور، الفواتير، والإشعارات —
                    في نظام واحد عربي بالكامل، مصمم خصيصاً للسوق العراقي.
                  </p>

                  <div class="hero-ctas">
                    <!-- Primary CTA = accent (orange) so it pops on the navy hero -->
                    <v-btn size="x-large" color="warning" variant="elevated" rounded="lg" class="cta-primary" to="/login">
                      <v-icon start size="22" color="white">mdi-rocket-launch-outline</v-icon>
                      <span class="cta-text">ابدأ مجاناً</span>
                    </v-btn>
                    <!-- Secondary CTA = outlined white, with explicit text color override -->
                    <v-btn size="x-large" variant="outlined" rounded="lg" color="white" class="cta-secondary" @click="scrollToSection('preview')">
                      <v-icon start size="22" color="white">mdi-play-circle-outline</v-icon>
                      <span class="cta-text">شاهد النظام</span>
                    </v-btn>
                  </div>

                  <!-- Trust signals -->
                  <div class="hero-trust">
                    <div class="trust-item">
                      <v-icon size="20" class="me-2 trust-icon">mdi-shield-check-outline</v-icon>
                      <span>بيانات آمنة ومشفّرة</span>
                    </div>
                    <div class="trust-item">
                      <v-icon size="20" class="me-2 trust-icon">mdi-translate</v-icon>
                      <span>عربي بالكامل · RTL</span>
                    </div>
                    <div class="trust-item">
                      <v-icon size="20" class="me-2 trust-icon">mdi-cellphone-link</v-icon>
                      <span>تطبيق طالب على iOS و Android</span>
                    </div>
                  </div>

                  <div class="hero-stores">
                    <span class="stores-label">تطبيق الطلاب:</span>
                    <a href="https://apps.apple.com/us/app/mulhimiq/id6754453929" target="_blank" rel="noopener" class="store-pill">
                      <v-icon size="22">mdi-apple</v-icon>
                      App Store
                    </a>
                    <a href="https://play.google.com/store/apps/details?id=com.mulhimiq.app" target="_blank" rel="noopener" class="store-pill">
                      <v-icon size="22">mdi-google-play</v-icon>
                      Google Play
                    </a>
                  </div>
                </div>
              </v-slide-y-transition>
            </v-col>

            <!-- Right: phone mockup + floating widgets -->
            <v-col cols="12" md="6" lg="5" class="hero-visual">
              <v-fade-transition appear>
                <div class="phone-wrap">
                  <div class="phone-glow" />
                  <div class="phone-frame">
                    <div class="phone-notch" />
                    <div class="phone-screen">
                      <template v-if="appScreenshots.length">
                        <v-carousel
                          v-model="carouselModel"
                          cycle
                          :interval="4500"
                          hide-delimiters
                          :show-arrows="false"
                          height="100%"
                          class="phone-carousel"
                        >
                          <v-carousel-item v-for="(screen) in appScreenshots" :key="screen.id" :src="screen.image" cover @click="openNews(screen)" class="cursor-pointer">
                            <div class="phone-caption">
                              <h4>{{ screen.title }}</h4>
                              <p>{{ screen.description }}</p>
                            </div>
                          </v-carousel-item>
                        </v-carousel>
                      </template>
                      <!-- Skeleton / empty state -->
                      <div v-else class="phone-empty">
                        <v-img :src="logo" width="80" height="80" class="mb-4 phone-empty-logo" />
                        <div class="phone-empty-title">Mulhim<span class="text-accent">IQ</span></div>
                        <div class="phone-empty-sub">منصة التعليم الذكي</div>
                      </div>
                    </div>
                  </div>

                  <!-- Floating data widgets (real numbers) -->
                  <div class="float-card float-1" :class="{ 'is-loading': platformStatsLoading }">
                    <v-avatar color="primary" size="40" class="float-avatar">
                      <v-icon color="white">mdi-map-marker-outline</v-icon>
                    </v-avatar>
                    <div>
                      <div class="float-label">محافظات مغطّاة</div>
                      <div class="float-value">{{ platformStatsLoading ? '…' : platformStats.governoratesCount }}</div>
                    </div>
                  </div>

                  <div class="float-card float-2" :class="{ 'is-loading': platformStatsLoading }">
                    <v-avatar color="warning" size="40" class="float-avatar">
                      <v-icon color="white">mdi-newspaper-variant-outline</v-icon>
                    </v-avatar>
                    <div>
                      <div class="float-label">منشورات نشطة</div>
                      <div class="float-value">{{ platformStatsLoading ? '…' : platformStats.newsCount }}</div>
                    </div>
                  </div>

                  <!-- (Phase 7) packages-count card removed alongside subscriptions. -->
                </div>
              </v-fade-transition>
            </v-col>
          </v-row>
        </v-container>

        <div class="hero-fade-bottom" />
      </section>

      <!-- 3. LIVE STATS STRIP ================================== -->
      <section class="stats-strip">
        <v-container style="max-width:1280px;">
          <div class="stats-grid">
            <div class="stat-cell">
              <div class="stat-icon stat-icon-primary">
                <v-icon color="primary">mdi-pulse</v-icon>
              </div>
              <div>
                <div class="stat-cell-label">حالة الخادم</div>
                <div class="stat-cell-value">
                  <span class="live-dot" :class="{ ok: apiHealthy, down: apiHealthy === false }" />
                  {{ apiHealthy ? 'نشط' : (apiHealthy === false ? 'خارج الخدمة' : 'جارٍ الفحص') }}
                </div>
              </div>
            </div>
            <div class="stat-cell">
              <div class="stat-icon stat-icon-accent">
                <v-icon color="warning">mdi-map-marker-radius-outline</v-icon>
              </div>
              <div>
                <div class="stat-cell-label">محافظات</div>
                <div class="stat-cell-value">{{ platformStatsLoading ? '…' : platformStats.governoratesCount }}</div>
              </div>
            </div>
            <!-- (Phase 7) packages stat cell removed alongside subscriptions. -->
            <div class="stat-cell">
              <div class="stat-icon stat-icon-warning">
                <v-icon color="warning">mdi-newspaper-variant</v-icon>
              </div>
              <div>
                <div class="stat-cell-label">منشورات</div>
                <div class="stat-cell-value">{{ platformStatsLoading ? '…' : platformStats.newsCount }}</div>
              </div>
            </div>
            <div class="stat-cell">
              <div class="stat-icon stat-icon-secondary">
                <v-icon color="secondary">mdi-translate</v-icon>
              </div>
              <div>
                <div class="stat-cell-label">واجهة</div>
                <div class="stat-cell-value">عربي · RTL</div>
              </div>
            </div>
          </div>
        </v-container>
      </section>

      <!-- 4. FEATURES ========================================== -->
      <section id="features" class="features-section">
        <v-container style="max-width:1280px;">
          <div class="section-head">
            <span class="section-chip">لماذا Mulhim IQ</span>
            <h2 class="section-title">كل ما يحتاجه المعلم لإدارة عمل متكامل</h2>
            <p class="section-sub">
              أدوات مصمّمة لتعمل معاً — لا حاجة لربط 5 برامج. كل وحدة تتكامل مع الأخرى وتشاركها البيانات اللحظية.
            </p>
          </div>

          <v-row class="g-3">
            <v-col v-for="feature in features" :key="feature.id" cols="12" sm="6" lg="4">
              <v-hover v-slot="{ isHovering, props }">
                <v-card
                  v-bind="props"
                  :elevation="isHovering ? 8 : 0"
                  class="feature-card-v2 h-100"
                  :class="{ 'is-hovered': isHovering }"
                >
                  <div class="feature-glow" :style="{ '--feature-color': feature.colorHex }" />
                  <div class="feature-icon-v2" :style="{ '--feature-color': feature.colorHex }">
                    <v-icon size="28" :color="feature.color">{{ feature.icon }}</v-icon>
                  </div>
                  <h3 class="feature-title">{{ feature.title }}</h3>
                  <p class="feature-desc">{{ feature.description }}</p>
                  <div class="feature-tags">
                    <span v-for="tag in feature.tags" :key="tag" class="feature-tag">{{ tag }}</span>
                  </div>
                </v-card>
              </v-hover>
            </v-col>
          </v-row>
        </v-container>
      </section>

      <!-- 5. SMART DASHBOARD PREVIEW =========================== -->
      <section id="preview" class="preview-section">
        <v-container style="max-width:1280px;">
          <div class="section-head">
            <span class="section-chip section-chip-accent">معاينة النظام</span>
            <h2 class="section-title text-white">لوحة تحكم ذكية ومرتّبة</h2>
            <p class="section-sub text-white" style="opacity:.85;">
              كل ما يهمّ المعلم في صفحة واحدة — إحصائيات لحظية، تنبيهات تلقائية، وإجراءات سريعة.
              نموذج توضيحي مبني على البيانات الفعلية لمنصتك.
            </p>
          </div>

          <div class="preview-shell">
            <!-- Window chrome -->
            <div class="preview-chrome">
              <div class="chrome-dots">
                <span class="dot dot-red" />
                <span class="dot dot-amber" />
                <span class="dot dot-green" />
              </div>
              <div class="chrome-address">app.mulhimiq.com / dashboard</div>
              <div class="chrome-spacer" />
            </div>

            <!-- Layout -->
            <div class="preview-body">
              <!-- Sidebar -->
              <aside class="preview-sidebar d-none d-md-flex">
                <div class="d-flex align-center gap-2 mb-6">
                  <v-img :src="logo" width="32" height="32" />
                  <span class="font-weight-bold text-white">Mulhim<span class="text-accent">IQ</span></span>
                </div>
                <div
                  v-for="(item, idx) in previewNav"
                  :key="item.title"
                  class="preview-nav-item"
                  :class="{ active: idx === 0 }"
                >
                  <v-icon size="18" class="me-2">{{ item.icon }}</v-icon>
                  {{ item.title }}
                </div>
              </aside>

              <!-- Content -->
              <div class="preview-content">
                <!-- Top bar -->
                <div class="preview-topbar">
                  <div class="topbar-search">
                    <v-icon size="18" class="me-2">mdi-magnify</v-icon>
                    ابحث عن طالب، كورس، أو فاتورة…
                  </div>
                  <div class="d-flex align-center gap-3">
                    <div class="topbar-pill">
                      <v-icon size="16" color="success">mdi-circle-medium</v-icon>
                      كل الأنظمة تعمل
                    </div>
                    <v-avatar size="32" color="primary">
                      <span class="text-white font-weight-bold">M</span>
                    </v-avatar>
                  </div>
                </div>

                <!-- Stat row -->
                <div class="preview-stats">
                  <div v-for="s in previewStats" :key="s.label" class="preview-stat">
                    <div class="stat-top">
                      <span class="stat-label">{{ s.label }}</span>
                      <v-chip size="x-small" :color="s.trendUp ? 'success' : 'error'" variant="tonal" class="px-2">
                        <v-icon size="12" start>{{ s.trendUp ? 'mdi-trending-up' : 'mdi-trending-down' }}</v-icon>
                        {{ s.trend }}
                      </v-chip>
                    </div>
                    <div class="stat-num">{{ s.value }}</div>
                    <div class="stat-spark">
                      <div
                        v-for="(h, i) in s.spark"
                        :key="i"
                        class="spark-bar"
                        :style="{ height: h + '%', background: s.color }"
                      />
                    </div>
                  </div>
                </div>

                <!-- Lower split: activity + insights -->
                <div class="preview-split">
                  <div class="preview-panel">
                    <div class="panel-head">
                      <div class="d-flex align-center gap-2">
                        <v-icon color="primary" size="18">mdi-pulse</v-icon>
                        <span class="font-weight-bold">النشاط الأخير</span>
                      </div>
                      <span class="text-caption text-medium-emphasis">آخر 5 أحداث</span>
                    </div>
                    <div v-for="a in previewActivity" :key="a.id" class="activity-row">
                      <v-avatar size="32" :color="a.color" class="me-3">
                        <v-icon size="16" color="white">{{ a.icon }}</v-icon>
                      </v-avatar>
                      <div class="flex-grow-1">
                        <div class="activity-title">{{ a.title }}</div>
                        <div class="activity-time">{{ a.time }}</div>
                      </div>
                      <v-chip size="x-small" variant="tonal" :color="a.color">{{ a.tag }}</v-chip>
                    </div>
                  </div>

                  <div class="preview-panel">
                    <div class="panel-head">
                      <div class="d-flex align-center gap-2">
                        <v-icon color="warning" size="18">mdi-lightbulb-on-outline</v-icon>
                        <span class="font-weight-bold">إحصائيات ذكية</span>
                      </div>
                    </div>
                    <div v-for="i in previewInsights" :key="i.id" class="insight-row" :class="`insight-${i.tone}`">
                      <v-icon :color="i.tone" size="22" class="me-3">{{ i.icon }}</v-icon>
                      <div>
                        <div class="insight-title">{{ i.title }}</div>
                        <div class="insight-sub">{{ i.sub }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </v-container>
      </section>

      <!-- 6. HOW IT WORKS ====================================== -->
      <section id="how-it-works" class="how-section">
        <v-container style="max-width:1280px;">
          <div class="section-head">
            <span class="section-chip">خطوات البداية</span>
            <h2 class="section-title">من التسجيل إلى أول كورس في أقل من 5 دقائق</h2>
            <p class="section-sub">عملية بسيطة ومباشرة، بدون تعقيدات تقنية أو معدّات إضافية.</p>
          </div>

          <div class="steps-rail">
            <div v-for="(step, idx) in steps" :key="step.id" class="step-card">
              <div class="step-num">{{ idx + 1 }}</div>
              <div class="step-icon" :style="{ background: step.bg }">
                <v-icon :color="step.color" size="28">{{ step.icon }}</v-icon>
              </div>
              <h3 class="step-title">{{ step.title }}</h3>
              <p class="step-desc">{{ step.description }}</p>
            </div>
          </div>
        </v-container>
      </section>


      <!-- 8. CTA =============================================== -->
      <section class="cta-section">
        <div class="cta-glow" />
        <v-container style="max-width:1280px;">
          <div class="cta-inner">
            <div class="cta-text">
              <h2>جاهز لتجربة نظام تعليمي يعمل لصالحك؟</h2>
              <p>سجّل مجاناً اليوم وابدأ بإدارة كورساتك وطلابك في أقل من خمس دقائق.</p>
            </div>
            <div class="cta-actions">
              <v-btn size="x-large" color="white" rounded="lg" elevation="6" to="/login" class="cta-primary-light">
                <v-icon start>mdi-rocket-launch-outline</v-icon>
                أنشئ حسابك مجاناً
              </v-btn>
              <v-btn size="x-large" variant="text" color="white" rounded="lg" @click="scrollToSection('contact')">
                تحدّث مع فريقنا
              </v-btn>
            </div>
          </div>
        </v-container>
      </section>

      <!-- 9. CONTACT =========================================== -->
      <section id="contact" class="contact-section">
        <v-container style="max-width:1280px;">
          <v-row align="center">
            <v-col cols="12" md="5" class="mb-6 mb-md-0">
              <span class="section-chip">تواصل معنا</span>
              <h2 class="contact-title">نسعد بسماع رأيك أو الرد على استفسارك</h2>
              <p class="contact-sub">فريقنا متاح خلال ساعات العمل الرسمية للرد على رسائلك ومساعدتك في البدء.</p>

              <div class="contact-card">
                <v-avatar color="primary-lighten-5" size="48" class="me-3">
                  <v-icon color="primary">mdi-email-outline</v-icon>
                </v-avatar>
                <div>
                  <div class="contact-label">البريد الإلكتروني</div>
                  <a href="mailto:support@mulhimiq.com" class="contact-value">support@mulhimiq.com</a>
                </div>
              </div>
              <div class="contact-card">
                <v-avatar color="primary-lighten-5" size="48" class="me-3">
                  <v-icon color="primary">mdi-phone-outline</v-icon>
                </v-avatar>
                <div>
                  <div class="contact-label">الهاتف</div>
                  <div class="contact-value">+964 770 000 0000</div>
                </div>
              </div>
              <div class="contact-card">
                <v-avatar color="primary-lighten-5" size="48" class="me-3">
                  <v-icon color="primary">mdi-map-marker-outline</v-icon>
                </v-avatar>
                <div>
                  <div class="contact-label">العنوان</div>
                  <div class="contact-value">بغداد، العراق</div>
                </div>
              </div>
            </v-col>

            <v-col cols="12" md="6" offset-md="1">
              <v-card class="contact-form-card pa-7" elevation="0">
                <h3 class="text-h6 font-weight-bold mb-4">أرسل لنا رسالة</h3>
                <v-alert v-if="contactError" type="error" variant="tonal" class="mb-4" closable @click:close="contactError = ''">
                  {{ contactError }}
                </v-alert>
                <v-alert v-if="contactSuccess" type="success" variant="tonal" class="mb-4" closable @click:close="contactSuccess = ''">
                  {{ contactSuccess }}
                </v-alert>
                <v-form @submit.prevent="submitContact">
                  <v-row dense>
                    <v-col cols="12" md="6">
                      <v-text-field v-model="contactForm.name" label="الاسم الكامل" variant="outlined" density="comfortable" color="primary" />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field v-model="contactForm.email" type="email" label="البريد الإلكتروني" variant="outlined" density="comfortable" color="primary" />
                    </v-col>
                    <v-col cols="12">
                      <v-text-field v-model="contactForm.subject" label="الموضوع" variant="outlined" density="comfortable" color="primary" />
                    </v-col>
                    <v-col cols="12">
                      <v-textarea v-model="contactForm.message" label="نص الرسالة" rows="4" auto-grow variant="outlined" density="comfortable" color="primary" />
                    </v-col>
                    <v-col cols="12">
                      <v-btn type="submit" color="primary" size="large" block height="48" :loading="contactLoading" rounded="lg" class="font-weight-bold">
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

      <!-- 10. FOOTER =========================================== -->
      <v-footer class="footer-v2" elevation="0">
        <v-container style="max-width:1280px;">
          <div class="footer-grid">
            <div class="footer-brand">
              <div class="d-flex align-center mb-3">
                <v-img :src="logo" width="44" height="44" class="me-3" />
                <span class="brand-text">
                  <span class="text-white">Mulhim</span><span class="text-accent">IQ</span>
                </span>
              </div>
              <p class="footer-tagline">منصة التعليم الذكي الأولى في العراق — تجربة عربية أصيلة بمعايير عالمية.</p>
              <div class="footer-socials">
                <a href="#" class="social-pill" aria-label="Facebook"><v-icon size="18">mdi-facebook</v-icon></a>
                <a href="#" class="social-pill" aria-label="Instagram"><v-icon size="18">mdi-instagram</v-icon></a>
                <a href="#" class="social-pill" aria-label="WhatsApp"><v-icon size="18">mdi-whatsapp</v-icon></a>
                <a href="#" class="social-pill" aria-label="YouTube"><v-icon size="18">mdi-youtube</v-icon></a>
              </div>
            </div>
            <div class="footer-col">
              <h4>المنصة</h4>
              <a @click="scrollToSection('features')">المميزات</a>
              <a @click="scrollToSection('preview')">النظام</a>
              <a @click="scrollToSection('how-it-works')">كيف يعمل</a>
            </div>
            <div class="footer-col">
              <h4>روابط</h4>
              <router-link to="/login">تسجيل الدخول</router-link>
              <router-link to="/contact">تواصل معنا</router-link>
              <router-link to="/privacy-policy">سياسة الخصوصية</router-link>
              <router-link to="/terms-and-conditions">شروط الاستخدام</router-link>
            </div>
            <div class="footer-col">
              <h4>تطبيق الطلاب</h4>
              <a href="https://apps.apple.com/us/app/mulhimiq/id6754453929" target="_blank" rel="noopener" class="store-pill store-pill-dark">
                <v-icon size="20">mdi-apple</v-icon>
                App Store
              </a>
              <a href="https://play.google.com/store/apps/details?id=com.mulhimiq.app" target="_blank" rel="noopener" class="store-pill store-pill-dark mt-2">
                <v-icon size="20">mdi-google-play</v-icon>
                Google Play
              </a>
            </div>
          </div>
          <v-divider class="my-6" color="white" opacity="0.15" />
          <div class="footer-bottom">
            <span>© {{ new Date().getFullYear() }} Mulhim IQ — جميع الحقوق محفوظة.</span>
            <span class="footer-status">
              <span class="live-dot" :class="{ ok: apiHealthy, down: apiHealthy === false }" />
              {{ apiHealthy ? 'النظام يعمل' : (apiHealthy === false ? 'تحقق من الاتصال' : 'جارٍ الفحص') }}
            </span>
          </div>
        </v-container>
      </v-footer>
    </v-main>

    <!-- Dialogs -->
    <v-dialog v-model="newsDialog" max-width="900">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start color="primary" class="me-2">mdi-newspaper</v-icon>
          <span class="text-h6 font-weight-bold">{{ selectedNews?.title }}</span>
          <v-spacer />
          <v-btn icon variant="text" @click="newsDialog = false"><v-icon>mdi-close</v-icon></v-btn>
        </v-card-title>
        <v-divider />
        <v-img v-if="selectedNews?.image" :src="selectedNews.image" :alt="selectedNews.title" height="320" cover />
        <v-card-text>
          <div v-if="selectedNews?.raw?.publishedAt" class="text-body-2 text-medium-emphasis mb-2">
            <v-icon size="16" class="me-1">mdi-calendar</v-icon>
            {{ new Date(selectedNews.raw.publishedAt).toLocaleString('en-IQ') }}
          </div>
          <div style="white-space:pre-line;">{{ selectedNews?.description }}</div>
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
          <v-btn icon variant="text" @click="notificationDialog = false"><v-icon>mdi-close</v-icon></v-btn>
        </v-card-title>
        <v-divider />
        <v-img v-if="selectedNotification?.image" :src="selectedNotification.image" height="260" cover />
        <v-card-text>
          <div v-if="selectedNotification?.sentAt" class="text-body-2 text-medium-emphasis mb-2">
            <v-icon size="16" class="me-1">mdi-calendar</v-icon>
            {{ formatDate(selectedNotification.sentAt) }}
          </div>
          <div class="mb-3" style="white-space:pre-line;">{{ selectedNotification?.message }}</div>
          <div v-if="selectedNotification?.type" class="text-caption text-medium-emphasis">
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
        <v-btn icon @click="snackbar.show = false"><v-icon>mdi-close</v-icon></v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script>
import teacher_api from '@/api/teacher/teacher_api';
import axiosInstance from '@/utils/axios';
import logo from '@/assets/images/logo.png';
import emailjs from 'emailjs-com';

export default {
  name: 'IndexPage',
  layout: 'blank',

  data() {
    return {
      logo,
      isScrolled: false,
      isLoggedIn: false,

      // Hero phone carousel
      carouselModel: 0,
      appScreenshots: [],

      // Notifications drawer (logged-in only)
      notificationsMenu: false,
      notificationDialog: false,
      notificationsList: [],
      notificationsPage: 1,
      notificationsLimit: 10,
      notificationsHasMore: false,
      notificationsLoading: false,
      unreadCount: 0,
      selectedNotification: null,

      // News dialog
      newsDialog: false,
      selectedNews: null,

      // Live platform stats (Live Strip + Hero floating widgets)
      platformStatsLoading: true,
      platformStats: {
        governoratesCount: 0,
        packagesCount: 0,
        newsCount: 0,
      },
      apiHealthy: null, // null = unknown, true = ok, false = down

      // Snackbar
      snackbar: { show: false, message: '', color: 'success' },

      // Contact form
      contactForm: { name: '', email: '', subject: '', message: '' },
      contactLoading: false,
      contactError: '',
      contactSuccess: '',

      // Features (kept brand-aligned, with bilingual tag pills)
      features: [
        {
          id: 1,
          icon: 'mdi-calendar-clock-outline',
          title: 'إدارة الحصص والجداول',
          description: 'حدّد المواعيد الأسبوعية، تحقق من تعارضات الجدول، وأرسل تذكيرات تلقائية قبل الحصة.',
          color: 'primary', colorHex: '#0B2545',
          tags: ['جدول أسبوعي', 'تذكيرات', 'تكرار يومي'],
        },
        {
          id: 2,
          icon: 'mdi-account-multiple-check-outline',
          title: 'حضور بـ QR Code',
          description: 'الطالب يمسح، النظام يسجّل. تقارير حضور لحظية لكل حصة وكل طالب.',
          color: 'accent', colorHex: '#FF8A00',
          tags: ['مسح فوري', 'تقارير', 'سجلات'],
        },
        {
          id: 3,
          icon: 'mdi-chart-box-outline',
          title: 'تحليلات وتقارير ذكية',
          description: 'نتائج الامتحانات، تطوّر الأداء، ودقة المتابعة المالية في مكان واحد.',
          color: 'secondary', colorHex: '#3FA9F5',
          tags: ['Insights', 'مخططات', 'تصدير'],
        },
        {
          id: 4,
          icon: 'mdi-wallet-outline',
          title: 'نظام مالي ومحفظة',
          description: 'فواتير، أقساط، خصومات، ومحفظة معلّم متكاملة — مع دعم بوابة Wayl للدفع.',
          color: 'success', colorHex: '#10B981',
          tags: ['فواتير', 'أقساط', 'Wayl'],
        },
        {
          id: 5,
          icon: 'mdi-bell-ring-outline',
          title: 'إشعارات Push فورية',
          description: 'تنبيه الطالب وولي الأمر بالحصة، الواجب، أو نتيجة الامتحان فور حدوثها.',
          color: 'warning', colorHex: '#FF8A00',
          tags: ['Push', 'OneSignal', 'iOS · Android'],
        },
        {
          id: 6,
          icon: 'mdi-shield-lock-outline',
          title: 'أمان وموثوقية',
          description: 'بيانات آمنة، تشفير شامل، صلاحيات بأدوار، ومسار تدقيق لكل عملية حساسة.',
          color: 'error', colorHex: '#E53935',
          tags: ['JWT', 'CORS', 'CSP'],
        },
      ],

      // Steps
      steps: [
        { id: 1, icon: 'mdi-account-plus-outline', title: 'قدّم طلبك', description: 'قدّم طلب الانضمام كأستاذ مجاناً، وسيتم مراجعته من قبل الإدارة خلال أيام قليلة.', color: 'primary', bg: 'rgba(11,37,69,0.08)' },
        { id: 2, icon: 'mdi-book-plus-outline', title: 'أضف كورساتك', description: 'أنشئ كورس، حدّد السعر، الباقات والجدول الأسبوعي.', color: 'accent', bg: 'rgba(255,138,0,0.10)' },
        { id: 3, icon: 'mdi-account-group-outline', title: 'انضمام الطلاب', description: 'الطالب يحجز، يدفع، ويبدأ الحضور عبر QR من تطبيق ملهم.', color: 'secondary', bg: 'rgba(63,169,245,0.10)' },
        { id: 4, icon: 'mdi-chart-line', title: 'تابع وحلّل', description: 'اطّلع على لوحة تحكم لحظية، أرسل واجبات، وامنح تقييمات.', color: 'success', bg: 'rgba(16,185,129,0.10)' },
      ],

      // Preview-section data — illustrative, derived once on mount
      previewNav: [
        { icon: 'mdi-view-dashboard-outline', title: 'الرئيسية' },
        { icon: 'mdi-book-open-page-variant-outline', title: 'الكورسات' },
        { icon: 'mdi-account-multiple-outline', title: 'الطلاب' },
        { icon: 'mdi-calendar-check-outline', title: 'الحضور' },
        { icon: 'mdi-file-document-outline', title: 'الفواتير' },
        { icon: 'mdi-bell-outline', title: 'الإشعارات' },
      ],
      previewStats: [
        { label: 'إيرادات الشهر', value: '4,820,000 د.ع', trend: '+12%', trendUp: true, color: '#0B2545', spark: [25, 38, 52, 41, 67, 78, 90] },
        { label: 'طلاب نشطون', value: '128', trend: '+6%', trendUp: true, color: '#3FA9F5', spark: [40, 55, 48, 70, 62, 75, 88] },
        { label: 'حضور اليوم', value: '94%', trend: '+3%', trendUp: true, color: '#10B981', spark: [60, 72, 78, 85, 80, 92, 94] },
        { label: 'فواتير معلّقة', value: '7', trend: '-2', trendUp: false, color: '#FF8A00', spark: [80, 75, 70, 60, 50, 45, 35] },
      ],
      previewActivity: [
        { id: 1, icon: 'mdi-cash-multiple', color: 'success', title: 'دفعة جديدة من سارة (200,000 د.ع)', time: 'منذ دقيقتين', tag: 'دفع' },
        { id: 2, icon: 'mdi-account-plus', color: 'primary', title: 'انضمام أحمد إلى كورس الفيزياء', time: 'منذ 12 دقيقة', tag: 'انضمام' },
        { id: 3, icon: 'mdi-clipboard-check-outline', color: 'secondary', title: 'تم تسليم واجب الرياضيات لـ 22 طالب', time: 'منذ ساعة', tag: 'واجب' },
        { id: 4, icon: 'mdi-bell-ring', color: 'warning', title: 'تذكير قبل الحصة (28 طالب)', time: 'قبل 3 ساعات', tag: 'تنبيه' },
        { id: 5, icon: 'mdi-chart-line', color: 'accent', title: 'تحديث تقرير الأداء الأسبوعي', time: 'اليوم 09:15', tag: 'تقرير' },
      ],
      previewInsights: [
        { id: 1, icon: 'mdi-trending-up', tone: 'success', title: '+12% نمو في الحجوزات', sub: 'مقارنة بالأسبوع الماضي.' },
        { id: 2, icon: 'mdi-account-alert-outline', tone: 'warning', title: '7 فواتير معلّقة', sub: 'تجاوزت موعد الاستحقاق.' },
        { id: 3, icon: 'mdi-pulse', tone: 'primary', title: 'كل الخدمات تعمل بكفاءة', sub: 'API + الإشعارات + الدفع.' },
        { id: 4, icon: 'mdi-account-group-outline', tone: 'secondary', title: '23 طالباً جدداً هذا الأسبوع', sub: 'أعلى من المعدل بنسبة 30%.' },
      ],

      // (Phase 7) pricing / subscription capacity state removed alongside
      // the old subscription model. Course catalog browsing arrives in a
      // later phase.
    };
  },

  mounted() {
    const token = localStorage.getItem('accessToken');
    const user = localStorage.getItem('user');
    this.isLoggedIn = !!(token && user);

    window.addEventListener('scroll', this.handleScroll, { passive: true });

    this.fetchPlatformStats();
    this.getPublicNews();

    if (this.isLoggedIn) {
      this.refreshNotifications();
    }

    try {
      const params = new URLSearchParams(window.location.search);
      const qid = params.get('notificationId');
      if (qid) this.markNotificationAsRead(String(qid));
    } catch { /* ignore */ }
  },

  beforeUnmount() {
    window.removeEventListener('scroll', this.handleScroll);
  },

  methods: {
    handleScroll() {
      this.isScrolled = window.scrollY > 12;
    },

    scrollToSection(id) {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    // -------- Live platform stats (4 anonymous APIs) ----------
    async fetchPlatformStats() {
      this.platformStatsLoading = true;
      // /health is at the API ROOT (no /api prefix). Derive the origin from
      // the shared axios instance's baseURL so dev / staging / prod stay in
      // sync with the rest of the dashboard's HTTP layer.
      const baseURL = axiosInstance?.defaults?.baseURL || import.meta.env.VITE_API_BASE_URL || '';
      const apiOrigin = baseURL.replace(/\/api\/?$/, '');

      const tasks = [
        // Health (live dot)
        fetch(`${apiOrigin}/health`).then(r => r.json()).then(j => ({ healthy: !!j?.success })).catch(() => ({ healthy: false })),
        // Governorates count
        teacher_api.getGovernorates().then((res) => {
          const payload = res?.data?.data ? res.data : res;
          const data = payload?.data || {};
          return { gov: Number(data.count) || (Array.isArray(data.governorates) ? data.governorates.length : 0) };
        }).catch(() => ({ gov: 0 })),
        // (Phase 7) "Active packages" stat removed alongside subscriptions.
        Promise.resolve({ pkg: 0 }),
        // Public news count
        teacher_api.getPublicNews().then((res) => {
          const payload = res?.data?.data ? res.data : res;
          const items = Array.isArray(payload?.data) ? payload.data : [];
          return { news: items.length };
        }).catch(() => ({ news: 0 })),
      ];

      try {
        const [h, g, p, n] = await Promise.all(tasks);
        this.apiHealthy = h.healthy;
        this.platformStats = {
          governoratesCount: g.gov,
          packagesCount: p.pkg,
          newsCount: n.news,
        };
      } finally {
        this.platformStatsLoading = false;
      }
    },

    // (Phase 7) fetchPricingPlans / selectPlan / fetchSubscriptionCapacity
    // removed alongside the old subscription model.

    // -------- Public news (hero carousel) -------------------
    async getPublicNews() {
      try {
        const res = await teacher_api.getPublicNews();
        const payload = res?.data?.data ? res.data : res;
        const items = Array.isArray(payload?.data) ? payload.data : [];
        const baseUrl = payload?.content_url || '';
        this.appScreenshots = items.map((n) => ({
          id: n.id,
          title: n.title,
          description: n.details,
          image: baseUrl && n.imageUrl ? `${baseUrl}${n.imageUrl}` : n.imageUrl,
          raw: n,
        }));
      } catch (err) {
        console.warn('Failed to fetch public news:', err);
      }
    },

    openNews(item) {
      this.selectedNews = item;
      this.newsDialog = true;
    },

    // -------- Notifications (logged-in only) ----------------
    async fetchNotifications(page = 1, append = false) {
      try {
        this.notificationsLoading = true;
        const res = await teacher_api.getNotifications({ page, limit: this.notificationsLimit });
        const payload = res?.data?.data ? res.data : res;
        const items = Array.isArray(payload?.data) ? payload.data : [];
        const baseUrl = payload?.content_url || '';
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
        }));
        this.notificationsList = append ? [...this.notificationsList, ...mapped] : mapped;
        this.unreadCount = this.notificationsList.filter((n) => !n.is_read).length;
        const pagination = payload?.pagination || {};
        const totalPages = pagination.totalPages || (mapped.length < this.notificationsLimit ? page : page + 1);
        this.notificationsHasMore = page < totalPages && mapped.length > 0;
        this.notificationsPage = page;
      } catch (err) {
        this.snackbar = { show: true, message: 'تعذر تحميل الإشعارات', color: 'error' };
        console.warn('Failed to fetch notifications:', err);
      } finally {
        this.notificationsLoading = false;
      }
    },
    refreshNotifications() {
      this.notificationsPage = 1;
      this.fetchNotifications(1, false);
    },
    loadMoreNotifications() {
      this.fetchNotifications(this.notificationsPage + 1, true);
    },
    async openNotification(n) {
      this.selectedNotification = n;
      this.notificationDialog = true;
      this.notificationsMenu = false;
      if (n && !n.is_read && n.id) await this.markNotificationAsRead(n.id);
    },
    async markNotificationAsRead(id) {
      try {
        if (!id) return;
        await teacher_api.markNotificationRead(id);
        const idx = this.notificationsList.findIndex((x) => x.id === id);
        if (idx > -1 && !this.notificationsList[idx].is_read) {
          this.notificationsList[idx].is_read = true;
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        }
      } catch (err) {
        console.warn('Failed to mark notification as read:', err);
      }
    },

    formatDate(d) {
      try { return new Date(d).toLocaleString('en-IQ'); } catch { return d; }
    },

    // -------- Contact form (EmailJS) ------------------------
    async submitContact() {
      this.contactError = '';
      this.contactSuccess = '';
      const { name, email, message } = this.contactForm;
      if (!name || !email || !message) {
        this.contactError = 'يرجى تعبئة الاسم والبريد والرسالة';
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        this.contactError = 'يرجى إدخال بريد إلكتروني صالح';
        return;
      }
      this.contactLoading = true;
      try {
        const SERVICE_ID = 'service_e6wa64v';
        const TEMPLATE_ID = 'template_rn0tt0u';
        const PUBLIC_KEY = 'km9zF8cdDOxdFruui';
        const templateParams = {
          from_name: name,
          from_email: email,
          subject: this.contactForm.subject || 'رسالة من نموذج التواصل',
          message,
        };
        const response = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
        if (response.status === 200) {
          this.contactSuccess = '✅ تم إرسال رسالتك بنجاح وسنعاود التواصل قريباً';
          this.contactForm = { name: '', email: '', subject: '', message: '' };
        } else {
          this.contactError = 'حدث خطأ أثناء الإرسال، حاول لاحقاً';
        }
      } catch (err) {
        console.warn('EmailJS Error:', err);
        this.contactError = 'تعذر إرسال الرسالة، يرجى المحاولة لاحقاً';
      } finally {
        this.contactLoading = false;
      }
    },
  },
};
</script>

<script setup>
definePage({ meta: { layout: 'blank' } });
</script>

<style scoped>
/* =====================================================
   Mulhim IQ — Landing v2 styles
   Brand palette:
     navy   #0B2545   (primary)
     orange #FF8A00   (warning / brand accent)
     sky    #3FA9F5   (secondary)
   ===================================================== */

/* Brand accent text class (Vuetify theme has no "accent" color name; this
   gives `.text-accent` a stable definition wherever it's used. */
.text-accent { color: #FF8A00 !important; }

/* ---------- Navbar ---------- */
/* Hero background is dark navy; a translucent white navbar disappears against
   it. Use solid white with a strong shadow so the bar always reads. */
.navbar-glass {
  background-color: rgba(255, 255, 255, 0.96) !important;
  backdrop-filter: blur(14px) saturate(160%);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
  border-block-end: 1px solid rgba(11, 37, 69, 0.08);
  box-shadow: 0 2px 16px rgba(11, 37, 69, 0.08);
  transition: box-shadow .25s ease, background-color .25s ease;
}
.navbar-scrolled {
  background-color: rgba(255, 255, 255, 1) !important;
  box-shadow: 0 6px 28px rgba(11, 37, 69, 0.10);
}
.brand-link { transition: opacity .2s ease; }
.brand-link:hover { opacity: .85; }
.brand-logo { transition: transform .35s cubic-bezier(.34, 1.56, .64, 1); }
.brand-link:hover .brand-logo { transform: rotate(-6deg) scale(1.05); }
.brand-text {
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -.02em;
  font-family: 'Cairo', sans-serif;
}
.brand-sub {
  font-size: .72rem;
  color: rgba(11, 37, 69, .55);
  font-weight: 600;
  margin-top: 2px;
}
.nav-links .nav-link {
  font-weight: 600;
  font-size: .92rem;
  color: rgba(11, 37, 69, .82);
  text-transform: none;
  letter-spacing: 0;
}
.nav-links .nav-link:hover { color: var(--v-theme-primary, #0B2545); }
.cta-btn {
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
  height: 40px;
}

/* ---------- HERO ---------- */
.hero-section {
  position: relative;
  min-height: 100vh;
  padding-block-start: 120px;
  padding-block-end: 80px;
  /* Deeper, cooler navy base — less brown undertones, more modern blue.
     The base color is intentionally darker than before so the orbs read
     as luminous accents instead of clashing washes. */
  background:
    linear-gradient(180deg, #050d1f 0%, #08162d 40%, #0a1d3c 100%);
  overflow: hidden;
  isolation: isolate;
}
/* Layered gradients form a soft mesh of cool blues + cyan, with the orange
   accent intentionally far from the headline area. */
.hero-mesh {
  position: absolute; inset: 0; z-index: 0;
  background:
    /* sky blue glow — top-left (LTR end) */
    radial-gradient(38% 32% at 18% 22%, rgba(63, 169, 245, 0.32), transparent 60%),
    /* teal glow — bottom-right (LTR start), behind phone */
    radial-gradient(40% 36% at 78% 78%, rgba(110, 242, 180, 0.20), transparent 65%),
    /* subtle indigo wash for depth */
    radial-gradient(50% 48% at 50% 55%, rgba(20, 60, 120, 0.32), transparent 70%);
  filter: saturate(115%);
}
.hero-orb {
  position: absolute; border-radius: 50%; filter: blur(80px); z-index: 0;
  animation: orb-drift 14s ease-in-out infinite;
  pointer-events: none;
  will-change: transform;
}
/* Cyan orb — top-left, gives a cool luminous corner */
.orb-1 {
  width: 420px; height: 420px;
  background: #3FA9F5;
  inset-block-start: -160px; inset-inline-start: -120px;
  opacity: .35;
}
/* Teal orb — bottom-right, behind the phone */
.orb-2 {
  width: 360px; height: 360px;
  background: #6EF2B4;
  inset-block-end: -120px; inset-inline-end: -100px;
  opacity: .22;
  animation-delay: -4s;
}
/* Orange accent — DELIBERATELY OFFSET to the LTR bottom-left corner where
   the floating widgets sit, NOT under the headline area. Small + soft. */
.orb-3 {
  width: 240px; height: 240px;
  background: #FF8A00;
  inset-block-end: 8%; inset-inline-start: 18%;
  opacity: .18;
  animation-delay: -8s;
}
@keyframes orb-drift {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50%      { transform: translate(18px, -22px) scale(1.04); }
}
.hero-grain {
  position: absolute; inset: 0; z-index: 1; pointer-events: none; opacity: .045;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
.hero-inner { position: relative; z-index: 2; }
.hero-row { min-height: calc(100vh - 152px); }
.hero-copy { color: white; }
.hero-eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 6px 14px; margin-block-end: 22px;
  background: rgba(255, 255, 255, 0.10);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  backdrop-filter: blur(8px);
  font-size: .82rem; font-weight: 600;
}
.eyebrow-text { color: rgba(255, 255, 255, 0.92); }
.live-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #6ef2b4; box-shadow: 0 0 0 0 rgba(110, 242, 180, 0.6);
  animation: pulse 1.8s infinite;
}
.live-dot.ok { background: #6ef2b4; box-shadow: 0 0 0 0 rgba(110, 242, 180, 0.6); }
.live-dot.down { background: #E53935; box-shadow: 0 0 0 0 rgba(229, 57, 53, 0.5); animation: none; }
@keyframes pulse {
  0%   { box-shadow: 0 0 0 0 rgba(110, 242, 180, 0.6); }
  70%  { box-shadow: 0 0 0 8px rgba(110, 242, 180, 0); }
  100% { box-shadow: 0 0 0 0 rgba(110, 242, 180, 0); }
}
.hero-title {
  font-family: 'Cairo', sans-serif;
  font-size: clamp(1.85rem, 4.4vw, 3.4rem);
  font-weight: 900;
  line-height: 1.45;
  letter-spacing: -.01em;
  margin-block-end: 22px;
  padding-block-start: 6px;
  /* Explicit white + subtle dark text-shadow so the first line stays legible
     even if any background gradient bleeds behind it. */
  color: #FFFFFF !important;
  text-shadow: 0 2px 24px rgba(0, 0, 0, 0.35);
}
.hero-title-accent {
  display: inline-block;
  background: linear-gradient(120deg, #ffb260 0%, #ff8a00 50%, #ffa233 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  padding-block: 4px 8px;
  /* The gradient-clip kills text-shadow, so use a drop-shadow filter instead
     for the same depth effect. */
  filter: drop-shadow(0 2px 14px rgba(255, 138, 0, 0.35));
}
.hero-sub {
  font-size: clamp(1rem, 1.4vw, 1.18rem);
  color: rgba(255, 255, 255, 0.92);
  line-height: 1.95;
  max-inline-size: 58ch;
  margin-block-end: 32px;
  font-weight: 400;
}
.hero-ctas { display: flex; flex-wrap: wrap; gap: 14px; margin-block-end: 32px; }
/* Primary CTA: accent orange — high contrast against the navy hero. */
.cta-primary {
  height: 56px; padding-inline: 30px;
  font-weight: 800; font-size: 1.02rem; letter-spacing: 0; text-transform: none;
  box-shadow: 0 14px 36px rgba(255, 138, 0, 0.40);
}
.cta-primary :deep(.v-btn__content),
.cta-primary .cta-text { color: white !important; }
.cta-primary:hover { box-shadow: 0 18px 44px rgba(255, 138, 0, 0.55); }

/* Secondary CTA: outlined white. Force the text + icon to be opaque white
   because Vuetify's outlined variant uses the `color` prop for the border
   and can wash out the inner text on dark backgrounds. */
.cta-secondary {
  height: 56px; padding-inline: 28px;
  border: 2px solid rgba(255, 255, 255, 0.55) !important;
  background: rgba(255, 255, 255, 0.05);
  font-weight: 700; font-size: 1.02rem; letter-spacing: 0; text-transform: none;
  backdrop-filter: blur(6px);
}
.cta-secondary :deep(.v-btn__content),
.cta-secondary .cta-text,
.cta-secondary :deep(.v-icon) { color: white !important; }
.cta-secondary:hover {
  background: rgba(255, 255, 255, 0.14) !important;
  border-color: rgba(255, 255, 255, 0.85) !important;
}
.hero-trust { display: flex; flex-wrap: wrap; gap: 22px; margin-block-end: 22px; }
.trust-item {
  display: inline-flex; align-items: center;
  color: rgba(255, 255, 255, 0.88); font-size: .92rem; font-weight: 600;
}
.trust-icon { color: #6ef2b4; }
.hero-stores { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; margin-block-start: 4px; }
.stores-label { color: rgba(255, 255, 255, 0.72); font-size: .88rem; font-weight: 500; }
.store-pill {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 16px; border-radius: 12px;
  background: rgba(255, 255, 255, 0.10);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: white; text-decoration: none; font-weight: 700; font-size: .88rem;
  backdrop-filter: blur(8px);
  transition: transform .2s ease, background .2s ease;
}
.store-pill:hover { transform: translateY(-2px); background: rgba(255, 255, 255, 0.16); }

/* Phone mockup */
.hero-visual { position: relative; }
.phone-wrap {
  position: relative; display: flex; justify-content: center; align-items: center;
  padding-block: 24px;
}
.phone-glow {
  position: absolute; inset: 0;
  background: radial-gradient(closest-side, rgba(63, 169, 245, .35), transparent 70%);
  filter: blur(40px); z-index: 0;
}
.phone-frame {
  position: relative; z-index: 1;
  width: 280px; height: 580px;
  background: #0b132b; border-radius: 44px;
  padding: 14px;
  box-shadow:
    0 30px 60px rgba(0, 0, 0, 0.5),
    inset 0 0 0 2px rgba(255, 255, 255, 0.08);
}
.phone-notch {
  position: absolute; inset-block-start: 18px; inset-inline: 50%; transform: translateX(50%);
  width: 110px; height: 26px; background: #06080F; border-radius: 14px; z-index: 3;
}
.phone-screen {
  width: 100%; height: 100%; border-radius: 32px; overflow: hidden; background: #0b132b; position: relative;
}
.phone-carousel { width: 100%; height: 100%; }
.phone-caption {
  position: absolute; inset-block-end: 0; inset-inline: 0;
  padding: 20px 16px 24px;
  background: linear-gradient(to top, rgba(0, 0, 0, .92) 0%, rgba(0, 0, 0, .55) 60%, rgba(0, 0, 0, 0) 100%);
  color: white;
}
.phone-caption h4 { font-size: .98rem; font-weight: 700; margin-block-end: 4px; }
.phone-caption p { font-size: .78rem; opacity: .85; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.phone-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 100%; color: white;
  padding: 24px;
  background:
    radial-gradient(circle at 50% 30%, rgba(255, 138, 0, .18), transparent 55%),
    linear-gradient(160deg, #0b2545 0%, #122e54 100%);
}
.phone-empty-logo { filter: drop-shadow(0 6px 24px rgba(255, 138, 0, 0.45)); }
.phone-empty-title {
  font-size: 1.25rem;
  font-weight: 800;
  margin-block-start: 4px;
  letter-spacing: -.01em;
}
.phone-empty-sub {
  font-size: .76rem;
  opacity: .72;
  margin-block-start: 6px;
  text-align: center;
}

/* Floating data widgets — balanced around the phone (top-right / mid-left / bottom-right) */
.float-card {
  position: absolute; z-index: 4;
  display: flex; align-items: center; gap: 12px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 16px;
  padding: 12px 16px;
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.28);
  min-width: 168px;
  animation: float-y 5s ease-in-out infinite;
}
.float-card.is-loading { opacity: .65; }
/* RTL-aware positioning (inset-inline-start/end flips automatically with dir="rtl"). */
.float-1 { inset-block-start: 8%;  inset-inline-end: -32px; animation-delay: 0s; }
.float-2 { inset-block-start: 42%; inset-inline-start: -38px; animation-delay: -1.5s; }
.float-3 { inset-block-end: 6%;  inset-inline-end: -20px; animation-delay: -3s; }
@keyframes float-y {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-10px); }
}
.float-avatar { box-shadow: 0 6px 18px rgba(11, 37, 69, 0.25); }
.float-label { font-size: .74rem; color: rgba(11, 37, 69, .62); font-weight: 600; }
.float-value { font-size: 1.2rem; font-weight: 800; color: #0b2545; line-height: 1.1; margin-block-start: 2px; }

.hero-fade-bottom {
  position: absolute; inset-block-end: 0; inset-inline: 0; height: 80px; z-index: 2;
  background: linear-gradient(to bottom, transparent 0%, #fbfcfe 100%);
  pointer-events: none;
}

/* ---------- LIVE STATS STRIP ---------- */
.stats-strip {
  background: #fbfcfe;
  padding-block: 28px;
  border-block-end: 1px solid rgba(11, 37, 69, 0.06);
}
.stats-grid {
  display: grid; gap: 18px;
  grid-template-columns: repeat(5, 1fr);
  align-items: center;
}
.stat-cell {
  display: flex; align-items: center; gap: 12px;
  padding: 8px 12px;
}
.stat-icon {
  width: 44px; height: 44px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
}
.stat-icon-primary  { background: rgba(11, 37, 69, .08); }
.stat-icon-accent   { background: rgba(255, 138, 0, .10); }
.stat-icon-success  { background: rgba(16, 185, 129, .10); }
.stat-icon-warning  { background: rgba(255, 138, 0, .10); }
.stat-icon-secondary{ background: rgba(63, 169, 245, .10); }
.stat-cell-label { font-size: .78rem; color: rgba(11, 37, 69, .6); font-weight: 600; }
.stat-cell-value {
  font-size: 1.05rem; font-weight: 800; color: #0b2545;
  display: inline-flex; align-items: center; gap: 6px; line-height: 1.1;
}
@media (max-width: 900px) { .stats-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 600px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }

/* ---------- Generic section heads ---------- */
.section-head { text-align: center; margin-block-end: 56px; }
.section-chip {
  display: inline-block; padding: 6px 14px; border-radius: 999px;
  background: rgba(11, 37, 69, .08); color: #0b2545;
  font-weight: 700; font-size: .82rem; margin-block-end: 14px;
}
.section-chip-accent { background: rgba(255, 138, 0, .14); color: #b35e00; }
.section-chip-success { background: rgba(16, 185, 129, .12); color: #047857; }
.section-title {
  font-family: 'Cairo', sans-serif;
  font-size: clamp(1.7rem, 3vw, 2.6rem);
  font-weight: 900;
  letter-spacing: -.015em;
  color: #0b2545;
  margin-block-end: 12px;
  line-height: 1.25;
}
.section-sub {
  font-size: clamp(.95rem, 1.2vw, 1.1rem);
  color: rgba(11, 37, 69, .68);
  line-height: 1.85;
  max-inline-size: 70ch;
  margin-inline: auto;
}

/* ---------- FEATURES ---------- */
.features-section { padding-block: 96px; background: #fbfcfe; }
.feature-card-v2 {
  position: relative;
  border-radius: 20px !important;
  padding: 28px 24px;
  background: white;
  border: 1px solid rgba(11, 37, 69, .07);
  transition: transform .35s cubic-bezier(.34, 1.56, .64, 1), box-shadow .35s ease, border-color .35s ease;
  overflow: hidden;
}
.feature-card-v2.is-hovered { transform: translateY(-6px); border-color: var(--feature-color, #0b2545); }
.feature-glow {
  position: absolute; inset-block-start: -40%; inset-inline-end: -40%;
  width: 220px; height: 220px; border-radius: 50%;
  background: var(--feature-color, #0b2545); opacity: 0; filter: blur(50px);
  transition: opacity .4s ease;
}
.feature-card-v2.is-hovered .feature-glow { opacity: .12; }
.feature-icon-v2 {
  width: 56px; height: 56px; border-radius: 16px;
  display: flex; align-items: center; justify-content: center;
  background: color-mix(in srgb, var(--feature-color) 12%, white);
  margin-block-end: 18px;
}
.feature-title {
  font-size: 1.18rem; font-weight: 800; color: #0b2545; margin-block-end: 8px;
}
.feature-desc {
  color: rgba(11, 37, 69, .68); line-height: 1.85; font-size: .95rem;
  margin-block-end: 16px;
}
.feature-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.feature-tag {
  font-size: .72rem; font-weight: 600;
  padding: 4px 10px; border-radius: 999px;
  background: rgba(11, 37, 69, .06); color: rgba(11, 37, 69, .72);
}

/* ---------- PREVIEW (smart dashboard showcase) ---------- */
.preview-section {
  padding-block: 96px;
  background: linear-gradient(160deg, #061a2e 0%, #0b2545 60%, #0e2e54 100%);
  position: relative;
  overflow: hidden;
}
.preview-section::before {
  content: ''; position: absolute; inset: 0;
  background:
    radial-gradient(40% 35% at 80% 20%, rgba(255, 138, 0, 0.20), transparent 60%),
    radial-gradient(35% 40% at 15% 80%, rgba(63, 169, 245, 0.18), transparent 65%);
  z-index: 0;
}
.preview-shell {
  position: relative; z-index: 1;
  background: white;
  border-radius: 18px;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.35);
  overflow: hidden;
  margin-block-start: 8px;
}
.preview-chrome {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 18px;
  background: #f4f6fa;
  border-block-end: 1px solid rgba(11, 37, 69, .08);
}
.chrome-dots { display: flex; gap: 6px; }
.chrome-dots .dot { width: 12px; height: 12px; border-radius: 50%; }
.dot-red { background: #ff5f57; } .dot-amber { background: #febc2e; } .dot-green { background: #28c840; }
.chrome-address {
  background: white; padding: 4px 14px; border-radius: 8px;
  font-size: .78rem; color: rgba(11, 37, 69, .6);
  border: 1px solid rgba(11, 37, 69, .06);
}
.chrome-spacer { flex: 1; }
.preview-body { display: grid; grid-template-columns: 220px 1fr; min-height: 540px; }
@media (max-width: 900px) { .preview-body { grid-template-columns: 1fr; } }
.preview-sidebar {
  background: #0b2545; color: white; padding: 22px 18px;
  display: flex; flex-direction: column;
}
.preview-nav-item {
  display: flex; align-items: center;
  padding: 10px 12px; border-radius: 10px;
  font-size: .9rem; color: rgba(255, 255, 255, .8); font-weight: 600;
  margin-block-end: 4px; cursor: default;
}
.preview-nav-item.active { background: rgba(255, 255, 255, .10); color: white; }
.preview-content { padding: 22px 24px; background: #f8fafd; display: flex; flex-direction: column; gap: 18px; }
.preview-topbar { display: flex; align-items: center; gap: 12px; }
.topbar-search {
  flex: 1; padding: 10px 14px; border-radius: 10px;
  background: white; border: 1px solid rgba(11, 37, 69, .08);
  font-size: .85rem; color: rgba(11, 37, 69, .55);
  display: flex; align-items: center;
}
.topbar-pill {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 10px; border-radius: 999px;
  background: rgba(16, 185, 129, .12); color: #047857;
  font-size: .76rem; font-weight: 700;
}
.preview-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
@media (max-width: 900px) { .preview-stats { grid-template-columns: repeat(2, 1fr); } }
.preview-stat {
  background: white; border-radius: 14px; padding: 14px 16px;
  border: 1px solid rgba(11, 37, 69, .06);
  display: flex; flex-direction: column; gap: 6px;
}
.stat-top { display: flex; align-items: center; justify-content: space-between; }
.stat-label { font-size: .8rem; color: rgba(11, 37, 69, .6); font-weight: 600; }
.stat-num { font-size: 1.4rem; font-weight: 900; color: #0b2545; }
.stat-spark { display: flex; align-items: flex-end; gap: 3px; height: 32px; margin-block-start: 4px; }
.spark-bar { width: 6px; border-radius: 2px; opacity: .85; }
.preview-split { display: grid; grid-template-columns: 1.4fr 1fr; gap: 14px; }
@media (max-width: 900px) { .preview-split { grid-template-columns: 1fr; } }
.preview-panel { background: white; border: 1px solid rgba(11, 37, 69, .06); border-radius: 14px; padding: 14px 16px; }
.panel-head { display: flex; align-items: center; justify-content: space-between; margin-block-end: 10px; }
.activity-row {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 4px; border-block-start: 1px dashed rgba(11, 37, 69, .06);
}
.activity-row:first-of-type { border-block-start: none; }
.activity-title { font-size: .88rem; font-weight: 600; color: #0b2545; }
.activity-time { font-size: .72rem; color: rgba(11, 37, 69, .55); }
.insight-row {
  display: flex; align-items: flex-start;
  padding: 10px; border-radius: 10px; margin-block-end: 6px;
  background: rgba(11, 37, 69, .04);
}
.insight-success { background: rgba(16, 185, 129, .08); }
.insight-warning { background: rgba(255, 138, 0, .10); }
.insight-primary { background: rgba(11, 37, 69, .06); }
.insight-secondary { background: rgba(63, 169, 245, .10); }
.insight-title { font-weight: 700; font-size: .88rem; color: #0b2545; }
.insight-sub { font-size: .76rem; color: rgba(11, 37, 69, .65); margin-block-start: 2px; }

/* ---------- HOW IT WORKS ---------- */
.how-section { padding-block: 96px; background: #fbfcfe; }
.steps-rail {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;
  position: relative;
}
@media (max-width: 900px) { .steps-rail { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px) { .steps-rail { grid-template-columns: 1fr; } }
.step-card {
  position: relative;
  background: white;
  border-radius: 18px;
  padding: 28px 22px;
  border: 1px solid rgba(11, 37, 69, .07);
  text-align: center;
  transition: transform .3s ease, box-shadow .3s ease;
}
.step-card:hover { transform: translateY(-4px); box-shadow: 0 18px 36px rgba(11, 37, 69, .08); }
.step-num {
  position: absolute; inset-block-start: -16px; inset-inline-start: 24px;
  width: 32px; height: 32px; border-radius: 50%;
  background: #0b2545; color: white;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: .92rem;
}
.step-icon {
  width: 64px; height: 64px; border-radius: 18px;
  display: flex; align-items: center; justify-content: center;
  margin: 4px auto 18px;
}
.step-title { font-size: 1.05rem; font-weight: 800; color: #0b2545; margin-block-end: 6px; }
.step-desc { color: rgba(11, 37, 69, .68); line-height: 1.75; font-size: .9rem; }

/* ---------- PRICING ---------- */
.pricing-section { padding-block: 96px; background: white; }
.capacity-card {
  border: 1px solid rgba(11, 37, 69, .08);
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(11, 37, 69, .03) 0%, rgba(63, 169, 245, .04) 100%);
}
.capacity-row { display: flex; flex-wrap: wrap; gap: 26px; }
.cap-cell { min-width: 120px; }
.cap-label { font-size: .76rem; color: rgba(11, 37, 69, .6); font-weight: 600; }
.cap-value { font-size: 1.15rem; font-weight: 800; color: #0b2545; margin-block-start: 2px; }
.pricing-card-v2 {
  position: relative;
  border-radius: 20px !important;
  padding: 28px 24px;
  background: white;
  border: 1px solid rgba(11, 37, 69, .07);
  display: flex; flex-direction: column;
  transition: transform .3s ease, box-shadow .3s ease, border-color .3s ease;
}
.pricing-card-v2.is-hovered { transform: translateY(-6px); }
.pricing-card-v2.featured {
  background: linear-gradient(160deg, #0b2545 0%, #103261 100%);
  color: white;
  border: none;
  transform: scale(1.02);
}
.pricing-card-v2.featured .pricing-name,
.pricing-card-v2.featured .pricing-price,
.pricing-card-v2.featured .pricing-period { color: white; }
.pricing-card-v2.featured .pricing-features li { color: rgba(255, 255, 255, .9); }
.pricing-card-v2.featured .pricing-features .v-icon { color: #6ef2b4 !important; }
.featured-flag {
  position: absolute; inset-block-start: -14px; inset-inline-start: 50%;
  transform: translateX(50%);
  background: linear-gradient(135deg, #ff8a00 0%, #ffb766 100%);
  color: white; font-weight: 800; font-size: .78rem;
  padding: 6px 14px; border-radius: 999px;
  box-shadow: 0 6px 16px rgba(255, 138, 0, .35);
}
.pricing-head { text-align: center; }
.pricing-icon-wrap {
  width: 64px; height: 64px; border-radius: 18px;
  background: rgba(11, 37, 69, .08);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 14px;
}
.pricing-icon-wrap.is-featured { background: rgba(255, 255, 255, .15); }
.pricing-name { font-size: 1.2rem; font-weight: 800; color: #0b2545; margin-block-end: 8px; }
.pricing-price { display: flex; align-items: baseline; justify-content: center; gap: 6px; }
.price-amount { font-size: 1.9rem; font-weight: 900; color: #0b2545; letter-spacing: -.02em; }
.pricing-period { font-size: .82rem; color: rgba(11, 37, 69, .6); margin-block-start: 2px; }
.pricing-features { list-style: none; padding: 0; margin: 0; }
.pricing-features li {
  display: flex; align-items: center;
  padding-block: 6px;
  color: rgba(11, 37, 69, .78); font-size: .9rem;
}
.pricing-cta {
  font-weight: 700; text-transform: none; letter-spacing: 0;
}
.empty-block { padding-block: 60px; color: rgba(11, 37, 69, .65); }
.empty-block h3 { font-weight: 700; color: #0b2545; }

/* ---------- CTA ---------- */
.cta-section {
  position: relative;
  padding-block: 80px;
  background: linear-gradient(135deg, #0b2545 0%, #122e54 50%, #1c3a6e 100%);
  overflow: hidden;
}
.cta-glow {
  position: absolute; inset: 0;
  background:
    radial-gradient(40% 60% at 80% 30%, rgba(255, 138, 0, 0.30), transparent 60%),
    radial-gradient(40% 60% at 20% 70%, rgba(63, 169, 245, 0.25), transparent 60%);
  z-index: 0;
}
.cta-inner {
  position: relative; z-index: 1;
  display: grid; grid-template-columns: 1fr auto;
  gap: 28px; align-items: center;
}
@media (max-width: 900px) { .cta-inner { grid-template-columns: 1fr; text-align: center; } }
.cta-text h2 {
  font-family: 'Cairo', sans-serif;
  color: white; font-weight: 900; font-size: clamp(1.5rem, 2.4vw, 2.2rem);
  margin-block-end: 8px; line-height: 1.3;
}
.cta-text p { color: rgba(255, 255, 255, .85); font-size: 1.05rem; }
.cta-actions { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
.cta-primary-light {
  height: 56px; padding-inline: 28px;
  font-weight: 800; text-transform: none; letter-spacing: 0;
  color: #0b2545 !important;
}

/* ---------- CONTACT ---------- */
.contact-section { padding-block: 96px; background: #fbfcfe; }
.contact-title { font-family: 'Cairo', sans-serif; font-weight: 900; color: #0b2545; font-size: clamp(1.6rem, 2.5vw, 2.2rem); margin-block: 12px 14px; line-height: 1.3; }
.contact-sub { color: rgba(11, 37, 69, .7); font-size: 1.02rem; line-height: 1.85; margin-block-end: 28px; }
.contact-card { display: flex; align-items: center; margin-block-end: 18px; }
.contact-label { font-size: .76rem; color: rgba(11, 37, 69, .6); font-weight: 600; }
.contact-value { font-size: 1rem; font-weight: 700; color: #0b2545; text-decoration: none; }
.contact-form-card { background: white; border: 1px solid rgba(11, 37, 69, .08); border-radius: 18px; }

/* ---------- FOOTER ---------- */
.footer-v2 {
  background: linear-gradient(180deg, #050d1f 0%, #08162d 100%) !important;
  color: white !important;
  padding-block: 64px 28px !important;
}
/* Force color on every text child so Vuetify's --v-theme-on-surface variable
   (which it auto-binds inside v-footer) can't darken our copy. */
.footer-v2 :deep(*) { color: inherit; }

.footer-grid {
  display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr; gap: 36px;
}
@media (max-width: 900px) { .footer-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 600px) { .footer-grid { grid-template-columns: 1fr; } }

.footer-brand .brand-text { font-size: 1.4rem; }
.footer-tagline {
  color: rgba(255, 255, 255, .78) !important;
  font-size: .94rem; line-height: 1.9;
  margin-block-end: 20px;
  max-inline-size: 38ch;
}
.footer-socials { display: flex; gap: 8px; }
.social-pill {
  display: inline-flex; align-items: center; justify-content: center;
  width: 38px; height: 38px; border-radius: 10px;
  background: rgba(255, 255, 255, .08);
  color: white !important;
  border: 1px solid rgba(255, 255, 255, .14);
  transition: background .2s ease, transform .2s ease, border-color .2s ease;
}
.social-pill:hover {
  background: rgba(255, 138, 0, .18);
  border-color: rgba(255, 138, 0, .45);
  transform: translateY(-2px);
}

/* Column titles — high-contrast white with a small brand-orange underline
   so each section is unmistakably a heading even in the dark footer. */
.footer-col h4 {
  font-size: 1.02rem;
  font-weight: 800;
  color: #FFFFFF !important;
  margin-block-end: 18px;
  letter-spacing: -.005em;
  position: relative;
  padding-block-end: 10px;
  display: inline-block;
}
.footer-col h4::after {
  content: '';
  position: absolute;
  inset-block-end: 0;
  inset-inline-start: 0;
  width: 28px; height: 3px;
  background: linear-gradient(90deg, #FF8A00 0%, #FFB766 100%);
  border-radius: 2px;
}
.footer-col a {
  display: block;
  color: rgba(255, 255, 255, .72) !important;
  text-decoration: none;
  font-size: .94rem; padding-block: 5px;
  cursor: pointer;
  transition: color .2s ease, transform .2s ease;
}
.footer-col a:hover {
  color: #FFB766 !important;
  transform: translateX(-4px); /* RTL: small leftward nudge on hover */
}
.store-pill-dark {
  background: rgba(255, 255, 255, .08) !important;
  border-color: rgba(255, 255, 255, .14) !important;
  color: white !important;
}
.store-pill-dark:hover {
  background: rgba(255, 138, 0, .18) !important;
  border-color: rgba(255, 138, 0, .45) !important;
  transform: none;
}

.footer-bottom {
  display: flex; justify-content: space-between; align-items: center;
  flex-wrap: wrap; gap: 12px;
  color: rgba(255, 255, 255, .65) !important;
  font-size: .85rem;
}
.footer-status {
  display: inline-flex; align-items: center; gap: 6px;
  color: rgba(255, 255, 255, .75) !important;
  font-weight: 600;
}

/* ---------- Utility ---------- */
.g-3 > * { padding: 12px; }
.cursor-pointer { cursor: pointer; }

/* Notification card polish */
.notif-card { border-radius: 14px; }
.notif-item { transition: background-color .2s ease; }
.notif-item:hover { background-color: rgba(11, 37, 69, .04); }
.notif-trigger { color: rgba(11, 37, 69, .8); }

/* Mobile spacing tweaks */
@media (max-width: 600px) {
  .hero-section { padding-block-start: 96px; padding-block-end: 48px; }
  .hero-row { min-height: auto; }
  .float-card { display: none; }
  .features-section, .preview-section, .how-section, .pricing-section, .contact-section { padding-block: 64px; }
  .section-head { margin-block-end: 36px; }
  .phone-frame { width: 240px; height: 500px; }
}
</style>
