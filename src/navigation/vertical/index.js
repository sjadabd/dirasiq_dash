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
  {
    title: 'الصفحة الرئيسية',
    to: { name: 'teacher-dashboard' },
    type: 'teacher',
    icon: { icon: 'ri-home-smile-line' },
  },
  {
    title: 'المواد الدراسية',
    to: { name: 'teacher-subjects-show-subjects' },
    type: 'teacher',
    icon: { icon: 'ri-home-smile-line' },
  },
  {
    title: 'الكورسات',
    to: { name: 'teacher-course-show-course' },
    type: 'teacher',
    icon: { icon: 'ri-home-smile-line' },
  },
  {
    title: 'الحجوزات',
    to: { name: 'teacher-bookings-show-bookings' },
    type: 'teacher',
    icon: { icon: 'ri-home-smile-line' },
  },
  {
    title: 'الجدول الاسبوعي',
    to: { name: 'teacher-sessions-manage-sessions' },
    type: 'teacher',
    icon: { icon: 'ri-home-smile-line' },
  },
  // teacher
]
