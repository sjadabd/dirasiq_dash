<script>
// =====================================================
// Deprecated 2026-05-17.
// The monolithic "edit invoice" page was retired with the backend simplification.
// All edits now happen inline from /teacher/invoices/manage-invoices:
//   • dates + notes → "تعديل" dialog
//   • discount       → "ضبط الخصم" dialog
//   • payments       → "إضافة دفعة" dialog
//   • per-installment payments → /teacher/invoices/:invoiceId
// For deeper changes (mode / total / installment plan) → soft-delete + recreate.
// This page is kept only to gracefully redirect anyone with a bookmark.
// =====================================================

export default {
  mounted() {
    const id = this.$route?.params?.invoiceId
    if (id) {
      this.$router.replace({ path: `/teacher/invoices/${id}` })
    } else {
      this.$router.replace({ name: "teacher-invoices-manage-invoices" })
    }
  },
}
</script>

<template>
  <div class="d-flex flex-column align-center justify-center pa-10 text-center">
    <VProgressCircular
      indeterminate
      color="primary"
      size="48"
      class="mb-4"
    />
    <div class="text-subtitle-1 text-medium-emphasis">
      جاري التحويل…
    </div>
    <div class="text-caption text-medium-emphasis mt-1">
      تم نقل تعديل الفاتورة إلى صفحة الفواتير الرئيسية.
    </div>
  </div>
</template>
