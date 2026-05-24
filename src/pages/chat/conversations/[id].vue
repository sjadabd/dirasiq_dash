<script setup>
// Legacy deep-link target — the dedicated detail page was replaced by the
// two-pane layout at `/chat/conversations`. Old links (e.g. from the
// moderation-logs table) still arrive here; we forward the id via query so
// the index page can pre-select the conversation on mount.
import { useChatRealtime } from "@/composables/useChatRealtime"

const route = useRoute()
const router = useRouter()
const chat = useChatRealtime()

onMounted(async () => {
  const id = String(route.params.id ?? "")

  await chat.initialize()
  if (id) await chat.openConversation(id)
  router.replace({ name: "chat-conversations" })
})
</script>

<template>
  <div
    class="d-flex justify-center align-center"
    style="height: 50vh;"
  >
    <VProgressCircular
      indeterminate
      color="primary"
      size="36"
    />
  </div>
</template>
