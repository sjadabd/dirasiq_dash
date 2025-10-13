export default [
  // super_admin
  {
    heading: 'لوحة التحكم',
  },
  {
    title: 'الصفحة الرئيسية',
    to: { name: 'admin-dashboard' },
    type: 'super_admin',
    icon: { icon: 'ri-home-smile-line' },
  },
  {
    title: 'السنه الدراسية',
    to: { name: 'admin-study-years-show-study-years' },
    type: 'super_admin',
    icon: { icon: 'ri-file-text-line' },
  },
  {
    title: 'المراحل الدراسية',
    to: { name: 'admin-grades-show-grades' },
    type: 'super_admin',
    icon: { icon: 'ri-file-text-line' },
  },
  {
    title: 'باقات الاشتراك',
    to: { name: 'admin-subscription-packages-show-subscription-packages' },
    type: 'super_admin',
    icon: { icon: 'ri-file-text-line' },
  },
  // super_admin

  // teacher
  // ── الرئيسية ─────────────────────────────────────────────
  { heading: 'الرئيسية' },
  {
    title: 'الصفحة الرئيسية',
    to: { name: 'teacher-dashboard' },
    type: 'teacher',
    icon: { icon: 'ri-home-smile-line' },
  },

  // ── الحسابات والفوترة ────────────────────────────────────
  { heading: 'الحسابات والفوترة' },
  {
    title: 'فواتير العربون',
    to: { name: 'teacher-payments-reservations-show-reservation-payments' },
    type: 'teacher',
    icon: { icon: 'ri-wallet-3-line' }, // محفظة/عربون
  },
  {
    title: 'فواتير الطلاب',
    to: { name: 'teacher-invoices-manage-invoices' },
    type: 'teacher',
    icon: { icon: 'ri-bill-line' }, // فواتير
  },

  // ── المحتوى الدراسي والحجوزات ────────────────────────────
  { heading: 'المحتوى الدراسي والحجوزات' },
  {
    title: 'المواد الدراسية',
    to: { name: 'teacher-subjects-show-subjects' },
    type: 'teacher',
    icon: { icon: 'ri-book-2-line' },
  },
  {
    title: 'الكورسات',
    to: { name: 'teacher-course-show-course' },
    type: 'teacher',
    icon: { icon: 'ri-graduation-cap-line' },
  },
  {
    title: 'الحجوزات',
    to: { name: 'teacher-bookings-show-bookings' },
    type: 'teacher',
    icon: { icon: 'ri-calendar-check-line' },
  },

  // ── الجدول والمتابعة ─────────────────────────────────────
  { heading: 'الجدول والمتابعة' },
  {
    title: 'الجدول الأسبوعي',
    to: { name: 'teacher-sessions-manage-sessions' },
    type: 'teacher',
    icon: { icon: 'ri-calendar-event-line' },
  },
  {
    title: 'تقييمات الطلاب',
    to: { name: 'teacher-evaluations-manage-evaluations' },
    type: 'teacher',
    icon: { icon: 'ri-award-line' },
  },

  // ── التواصل والمهام ──────────────────────────────────────
  { heading: 'التواصل والمهام' },
  {
    title: 'الإشعارات',
    to: { name: 'teacher-notifications-show-notifications' },
    type: 'teacher',
    icon: { icon: 'ri-notification-3-line' },
  },
  {
    title: 'الواجبات',
    to: { name: 'teacher-assignments-manage-assignments' },
    type: 'teacher',
    icon: { icon: 'ri-task-line' },
  },

  // ── الاختبارات والنتائج ──────────────────────────────────
  { heading: 'الاختبارات والنتائج' },
  {
    title: 'الامتحانات والدرجات',
    to: { name: 'teacher-exams-manage-exams' },
    type: 'teacher',
    icon: { icon: 'ri-file-list-3-line' },
  },
  // teacher
]
