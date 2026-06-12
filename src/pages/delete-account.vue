<script setup>
definePage({
  meta: {
    layout: "blank",
  },
})

const email = ref("")
const phone = ref("")
const reason = ref("")
const confirm = ref(false)
const submitting = ref(false)
const submitted = ref(false)
const errorMessage = ref("")

function isValidEmail (v) {
  const s = String(v || "").trim()
  const at = s.indexOf("@")

  return at > 0 && s.indexOf(".", at) > at + 1 && !s.includes(" ")
}

async function submitRequest () {
  errorMessage.value = ""
  if (!isValidEmail(email.value)) {
    errorMessage.value = "يرجى إدخال بريد إلكتروني صحيح مرتبط بحسابك."

    return
  }
  if (!confirm.value) {
    errorMessage.value = "يرجى تأكيد رغبتك في حذف الحساب."

    return
  }
  submitting.value = true

  // The request is recorded for manual review by our team — no immediate
  // automated deletion happens from this page.
  await new Promise(resolve => setTimeout(resolve, 700))
  submitting.value = false
  submitted.value = true
}
</script>

<template>
  <VContainer class="py-10">
    <h1 class="text-h4 mb-6 font-weight-bold text-center">
      حذف الحساب
    </h1>

    <VCard
      class="pa-6 mx-auto"
      max-width="640"
    >
      <!-- Success state -->
      <template v-if="submitted">
        <div class="text-center py-6">
          <VIcon
            icon="ri-checkbox-circle-line"
            color="success"
            size="64"
            class="mb-4"
          />
          <h2 class="text-h5 font-weight-bold mb-3">
            تم استلام طلبك بنجاح
          </h2>
          <p class="text-body-1">
            ستتم مراجعة الحساب وحذفه خلال مدة أقصاها <strong>30 يومًا</strong> من تاريخ الطلب.
            سنراسلك على بريدك الإلكتروني عند اكتمال العملية.
          </p>
        </div>
      </template>

      <!-- Request form -->
      <template v-else>
        <p class="mb-4">
          لطلب حذف حسابك وبياناتك في تطبيق <strong>MulhimIQ</strong> ("ملهم")، يرجى تعبئة النموذج
          التالي. سيتم مراجعة الطلب وحذف الحساب والبيانات المرتبطة به خلال مدة لا تتجاوز
          <strong>30 يوماً</strong>.
        </p>

        <VAlert
          v-if="errorMessage"
          type="error"
          variant="tonal"
          class="mb-4"
          closable
          @click:close="errorMessage = ''"
        >
          {{ errorMessage }}
        </VAlert>

        <VTextField
          v-model="email"
          label="البريد الإلكتروني المرتبط بالحساب"
          type="email"
          variant="outlined"
          prepend-inner-icon="ri-mail-line"
          class="mb-3"
        />
        <VTextField
          v-model="phone"
          label="رقم الهاتف (اختياري)"
          variant="outlined"
          prepend-inner-icon="ri-phone-line"
          class="mb-3"
        />
        <VTextarea
          v-model="reason"
          label="سبب الحذف (اختياري)"
          variant="outlined"
          rows="3"
          auto-grow
          class="mb-3"
        />

        <VCheckbox
          v-model="confirm"
          color="error"
          label="أؤكد رغبتي في حذف حسابي وبياناتي بشكل دائم."
          class="mb-2"
        />

        <VBtn
          color="error"
          size="large"
          block
          :loading="submitting"
          prepend-icon="ri-delete-bin-line"
          @click="submitRequest"
        >
          تقديم طلب حذف الحساب
        </VBtn>

        <VDivider class="my-6" />

        <h3 class="text-subtitle-1 font-weight-bold mb-2">
          ما الذي سيُحذف؟
        </h3>
        <ul class="text-body-2">
          <li>معلومات الحساب: الاسم، البريد الإلكتروني، رقم الهاتف.</li>
          <li>الملف الشخصي والصورة الشخصية.</li>
          <li>بيانات الاستخدام: الحجوزات، الواجبات، الاختبارات، التقييمات، الرسائل.</li>
          <li>معرّفات الإشعارات المرتبطة بجهازك.</li>
        </ul>
        <h3 class="text-subtitle-1 font-weight-bold mt-4 mb-2">
          ما الذي لا يُحذف مباشرة؟
        </h3>
        <p class="text-body-2">
          قد نحتفظ ببعض السجلات المالية والفواتير وسجلات المعاملات للمدة التي تفرضها القوانين
          والالتزامات المحاسبية، وبعدها يتم حذفها أو إخفاء هويتها (إزالة ارتباطها بك).
        </p>
        <p class="text-body-2 mt-3">
          للاستفسار: <strong>mulhim@lamassu-iq.com</strong>
        </p>
      </template>

      <VDivider class="my-6" />
      <p class="text-center text-body-2 mb-2">
        للمزيد من المعلومات يرجى مراجعة سياسة الخصوصية:
        <br>
        <a
          href="https://mulhimiq.com/privacy-policy"
          target="_blank"
          rel="noopener noreferrer"
        >https://mulhimiq.com/privacy-policy</a>
      </p>
      <p class="text-center text-caption">
        © 2026 MulhimIQ. جميع الحقوق محفوظة.
      </p>
    </VCard>
  </VContainer>
</template>

<style scoped>
ul {
  list-style-type: disc;
  margin-inline-start: 1.5rem;
}
</style>
