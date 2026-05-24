<template>
  <VContainer class="py-10">
    <VRow>
      <VCol
        cols="12"
        class="text-center mb-6"
      >
        <h1 class="text-h4 font-weight-bold">
          تواصل معنا
        </h1>
        <p class="text-medium-emphasis">
          نرحب باستفساراتك وملاحظاتك دائمًا
        </p>
      </VCol>

      <VCol
        cols="12"
        md="8"
        class="mx-auto"
      >
        <VAlert
          v-if="contactError"
          type="error"
          variant="tonal"
          class="mb-4"
          closable
          @click:close="contactError = ''"
        >
          {{ contactError }}
        </VAlert>
        <VAlert
          v-if="contactSuccess"
          type="success"
          variant="tonal"
          class="mb-4"
          closable
          @click:close="contactSuccess = ''"
        >
          {{ contactSuccess }}
        </VAlert>

        <VCard class="pa-6">
          <VForm @submit.prevent="submitContact">
            <VRow>
              <VCol
                cols="12"
                md="6"
              >
                <VTextField
                  v-model="contactForm.name"
                  label="الاسم الكامل"
                  prepend-inner-icon="mdi-account"
                />
              </VCol>
              <VCol
                cols="12"
                md="6"
              >
                <VTextField
                  v-model="contactForm.email"
                  type="email"
                  label="البريد الإلكتروني"
                  prepend-inner-icon="mdi-email"
                />
              </VCol>
              <VCol cols="12">
                <VTextField
                  v-model="contactForm.subject"
                  label="الموضوع"
                  prepend-inner-icon="mdi-text-short"
                />
              </VCol>
              <VCol cols="12">
                <VTextarea
                  v-model="contactForm.message"
                  label="نص الرسالة"
                  rows="6"
auto-grow
                  prepend-inner-icon="mdi-message-text"
                />
              </VCol>
              <VCol
                cols="12"
                class="d-flex justify-end"
              >
                <VBtn
type="submit"
                      color="primary"
:loading="contactLoading"
>
                  <VIcon start>
mdi-send
</VIcon>
                  إرسال الرسالة
                </VBtn>
              </VCol>
            </VRow>
          </VForm>
        </VCard>
      </VCol>
    </VRow>
  </VContainer>
</template>

<script>
import emailjs from 'emailjs-com'

export default {
  name: 'ContactPage',
  layout: 'blank',
  data() {
    return {
      contactForm: { name: '', email: '', subject: '', message: '' },
      contactLoading: false,
      contactError: '',
      contactSuccess: '',
    }
  },
  methods: {
    async submitContact() {
      try {
        this.contactError = ''
        this.contactSuccess = ''

        const { name, email, subject, message } = this.contactForm
        if (!name || !email || !message) {
          this.contactError = 'يرجى تعبئة الاسم والبريد والرسالة'
          
          return
        }
        if (!/^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(email)) {
          this.contactError = 'يرجى إدخال بريد إلكتروني صالح'
          
          return
        }
        this.contactLoading = true

        const SERVICE_ID = 'service_e6wa64v'
        const TEMPLATE_ID = 'template_rn0tt0u'
        const PUBLIC_KEY = 'km9zF8cdDOxdFruui'

        const templateParams = {
          from_name: name,
          from_email: email,
          subject: subject || 'رسالة من نموذج التواصل',
          message,
        }

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
  },
}
</script>

<script setup>
definePage({
  meta: { layout: 'blank' },
})
</script>


