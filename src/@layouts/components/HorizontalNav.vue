<script setup>
import { HorizontalNavGroup, HorizontalNavLink } from "@layouts/components";
import { computed, onMounted, ref } from "vue";

const props = defineProps({
  navItems: {
    type: null,
    required: true,
  },
});

// متغيرات المستخدم
const user = ref(null);
const userType = ref(null);

// فلترة العناصر حسب نوع المستخدم
const filteredNavItems = computed(() => {
  if (!userType.value) {
    return [];
  }

  const isAllowed = (itemType) => {
    // إذا لم يكن للعنصر نوع، نعرضه للجميع
    if (!itemType) return true;

    // إذا كان نوع المستخدم يطابق نوع العنصر
    if (itemType === userType.value) return true;

    return false;
  };

  // فلترة العناصر مع الأخذ بالحسبان المجموعات والعناوين
  return props.navItems
    .map((item) => {
      // إذا كان عنوان قسم (heading)، أظهره دائمًا
      if ("heading" in item) {
        return item;
      }

      // إذا كان مجموعة تحتوي على عناصر فرعية
      if ("children" in item) {
        const filteredChildren = item.children.filter((child) =>
          isAllowed(child.type)
        );
        if (filteredChildren.length > 0) {
          return { ...item, children: filteredChildren };
        }
        return null; // إخفاء المجموعة إن لم يكن فيها عناصر مسموح بها
      }

      // عنصر رابط مفرد
      return isAllowed(item.type) ? item : null;
    })
    .filter(Boolean); // إزالة العناصر null
});

// جلب بيانات المستخدم
const loadUserData = () => {
  const userData = localStorage.getItem("user");

  if (userData) {
    try {
      user.value = JSON.parse(userData);
      userType.value = user.value?.userType;
    } catch (error) {
      console.error("Error parsing user data:", error);
      user.value = null;
      userType.value = null;
    }
  } else {
    user.value = null;
    userType.value = null;
  }
};

onMounted(() => {
  loadUserData();

  // الاستماع لتغييرات localStorage
  window.addEventListener("storage", (e) => {
    if (e.key === "user") {
      loadUserData();
    }
  });

  // مراقبة تغييرات localStorage من نفس التبويب
  const originalSetItem = localStorage.setItem;
  const originalRemoveItem = localStorage.removeItem;

  localStorage.setItem = function (key, value) {
    originalSetItem.apply(this, arguments);
    if (key === "user") {
      loadUserData();
    }
  };

  localStorage.removeItem = function (key) {
    originalRemoveItem.apply(this, arguments);
    if (key === "user") {
      loadUserData();
    }
  };
});

const resolveNavItemComponent = (item) => {
  if ("children" in item) return HorizontalNavGroup;

  return HorizontalNavLink;
};
</script>

<template>
  <ul class="nav-items">
    <Component
      :is="resolveNavItemComponent(item)"
      v-for="(item, index) in filteredNavItems"
      :key="index"
      data-allow-mismatch
      :item="item"
    />
  </ul>
</template>

<style lang="scss">
.layout-wrapper.layout-nav-type-horizontal {
  .nav-items {
    display: flex;
    flex-wrap: wrap;
  }
}
</style>
