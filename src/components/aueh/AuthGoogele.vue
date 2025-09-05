<template>
  <div id="google-login"></div>
</template>

<script setup>
import { onMounted } from "vue";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

onMounted(() => {
  window.google.accounts.id.initialize({
    client_id: CLIENT_ID,
    callback: handleCredentialResponse,
    auto_select: false,
    cancel_on_tap_outside: false,
    prompt_parent_id: "google-login",
    context: "signin",
  });

  window.google.accounts.id.prompt((notification) => {
    if (
      notification.isNotDisplayed() ||
      notification.isSkippedMoment() ||
      notification.isDismissedMoment()
    ) {
      console.warn(
        "OneTap not shown:",
        notification.getNotDisplayedReason?.() ||
          notification.getSkippedReason?.()
      );
    }
  });
});

async function handleCredentialResponse(response) {
  const token = response.credential;

  // إرسال التوكن إلى السيرفر
  // const res = await fetch('/api/auth/google-login', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ token }),
  // })

  // const result = await res.json()

  // if (result.success) {
  //   // وجه المستخدم حسب حالته
  // } else {
  //   // عرض خطأ
  // }
}
</script>
