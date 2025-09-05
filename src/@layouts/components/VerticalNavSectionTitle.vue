<script setup>
import { layoutConfig } from '@layouts'
import { can } from '@layouts/plugins/casl'
import { useLayoutConfigStore } from '@layouts/stores/config'

const props = defineProps({
  item: {
    type: null,
    required: true,
  },
})

const configStore = useLayoutConfigStore()
const shallRenderIcon = configStore.isVerticalNavMini()
</script>

<template>
  <li
    v-if="can(item.action, item.subject)"
    class="nav-section-title"
  >
    <div class="title-wrapper">
      <Transition
        name="vertical-nav-section-title"
        mode="out-in"
      >
        <Component
          :is="shallRenderIcon ? layoutConfig.app.iconRenderer : 'span'"
          :key="shallRenderIcon"
          :class="shallRenderIcon ? 'placeholder-icon' : 'title-text'"
          v-bind="shallRenderIcon ? layoutConfig.icons.sectionTitlePlaceholder : {}"
        >
          {{ !shallRenderIcon ? item.heading : null }}
        </Component>
      </Transition>
    </div>
  </li>
</template>
