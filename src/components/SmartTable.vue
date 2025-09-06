<template>
  <div class="smart-table-container">
    <!-- Search Bar -->
    <div class="search-container mb-4">
      <VTextField
        v-model="localSearch"
        label="بحث"
        density="comfortable"
        variant="outlined"
        hide-details
        clearable
        class="search-field"
        @click:clear="clearSearch"
        @keyup.enter="performSearch"
      >
        <template #append-inner>
          <VBtn
            icon
            size="small"
            variant="text"
            @click="performSearch"
            :disabled="localSearch === currentSearch"
          >
            <VIcon>ri-search-line</VIcon>
          </VBtn>
        </template>
      </VTextField>
    </div>

    <!-- Data Table -->
    <VCard class="table-card" elevation="3" rounded="lg">
      <VDataTableServer
        :loading-text="'جاري التحميل...'"
        :headers="headers"
        :items="items"
        :loading="loading"
        v-model:page="tableOptions.page"
        v-model:items-per-page="tableOptions.limit"
        :items-length="totalItems"
        @update:options="updateTableOptions"
        show-current-page
        :no-data-text="'لا توجد بيانات'"
        :items-per-page-text="'عدد العناصر في الصفحة'"
        :mobile="isMobile"
        class="elevation-0"
      >
        <!-- Custom Header Styling -->
        <template v-slot:header="{ columns }">
          <tr>
            <th
              v-for="column in columns"
              :key="column.key"
              class="text-primary font-weight-bold text-uppercase"
            >
              {{ column.title }}
            </th>
          </tr>
        </template>

        <!-- Custom Row Styling -->
        <template v-slot:item="{ item, index }">
          <tr :class="getRowClass(item)">
            <td v-for="header in headers" :key="header.key" class="text-center">
              <template v-if="header.key === 'num'">
                <div class="text-center">
                  <VChip
                    size="small"
                    color="primary"
                    variant="flat"
                    class="font-weight-medium"
                  >
                    {{ getRowNumber(index) }}
                  </VChip>
                </div>
              </template>
              <template v-else-if="header.type === 'link'">
                <a @click="showItem(item)" style="cursor: pointer">
                  {{ getNestedValue(item, header.key) }}
                </a>
              </template>
              <template v-else-if="header.type === 'number'">
                <div class="font-weight-medium">
                  {{ numberWithComma(getNestedValue(item, header.key)) }}
                </div>
              </template>
              <template v-else-if="header.type === 'date'">
                <div class="font-weight-medium">
                  {{ formatDate(getNestedValue(item, header.key)) }}
                </div>
              </template>
              <template
                v-else-if="
                  header.key === 'is_active' || header.key === 'isActive'
                "
              >
                <div class="font-weight-medium">
                  <VChip
                    :color="
                      getNestedValue(item, header.key) ? 'success' : 'error'
                    "
                    size="small"
                    variant="flat"
                  >
                    {{ getNestedValue(item, header.key) ? "مفعل" : "معطل" }}
                  </VChip>
                </div>
              </template>
              <template v-else-if="header.key === 'isCurrent'">
                <div class="font-weight-medium">
                  {{ getNestedValue(item, header.key) ? "مفعل" : "معطل" }}
                </div>
              </template>
              <!-- description -->
              <template v-else-if="header.key === 'description'">
                <div class="font-weight-medium">
                  <span v-if="getNestedValue(item, header.key)">
                    {{ getNestedValue(item, header.key) }}
                  </span>
                  <span v-else class="text-grey"> لا يوجد وصف </span>
                </div>
              </template>
              <!-- subjects -->
              <template v-else-if="header.key === 'subjects'">
                <div class="d-flex flex-wrap gap-1">
                  <VChip
                    v-for="subject in getNestedValue(item, header.key)"
                    :key="subject"
                    size="small"
                    color="primary"
                    variant="outlined"
                  >
                    {{ subject }}
                  </VChip>
                  <span
                    v-if="!getNestedValue(item, header.key)?.length"
                    class="text-grey"
                  >
                    لا توجد مواد
                  </span>
                </div>
              </template>
              <!-- images -->
              <template v-else-if="header.type === 'images'">
                <img
                  v-if="Array.isArray(item[header.key]) && item[header.key][0]"
                  :src="(results?.content_url || '') + item[header.key][0]"
                  style="
                    border: solid 1px rebeccapurple;
                    cursor: pointer;
                    inline-size: 60px;
                  "
                  @click="emitShowImgs(item)"
                />
              </template>

              <!-- image -->
              <template v-else-if="header.type === 'image'">
                <img
                  v-if="item[header.key]"
                  :src="'http://localhost:3000' + item[header.key]"
                  style="
                    border: solid 1px rebeccapurple;
                    cursor: pointer;
                    inline-size: 60px;
                  "
                  @click="emitShowImgs(item)"
                />
                <div v-else style="color: red">❌ لا يوجد مسار صورة</div>
              </template>

              <template v-else-if="header.key === 'actions'">
                <div class="d-flex flex-wrap justify-center ga-1">
                  <!-- تعديل -->
                  <VTooltip
                    v-if="
                      actions.includes('تعديل') &&
                      (item.is_active || item.isActive)
                    "
                    location="top"
                  >
                    <template #activator="{ props }">
                      <VBtn
                        icon
                        style="padding-inline: 0"
                        variant="plain"
                        v-bind="props"
                        @click="editItem(item)"
                        size="small"
                      >
                        <VIcon size="18">ri-pencil-line</VIcon>
                      </VBtn>
                    </template>
                    <span>تعديل</span>
                  </VTooltip>
                  <!-- ارسال اشعار -->
                  <VTooltip
                    v-if="
                      actions.includes('ارسال اشعار') &&
                      (item.is_active || item.isActive)
                    "
                    location="top"
                  >
                    <template #activator="{ props }">
                      <VBtn
                        icon
                        style="padding-inline: 0"
                        variant="plain"
                        v-bind="props"
                        @click="sendNotificationsItem(item)"
                        size="small"
                      >
                        <VIcon size="18">ri-notification-3-line</VIcon>
                      </VBtn>
                    </template>
                    <span>ارسال اشعار</span>
                  </VTooltip>
                  <!-- ايقاف -->
                  <VTooltip
                    v-if="
                      actions.includes('ايقاف') &&
                      (item.is_active || item.isActive)
                    "
                    location="top"
                  >
                    <template #activator="{ props }">
                      <VBtn
                        icon
                        v-bind="props"
                        variant="plain"
                        color="error"
                        size="small"
                        @click="deactivateItem(item)"
                      >
                        <VIcon size="18">ri-user-forbid-line</VIcon>
                      </VBtn>
                    </template>
                    <span>ايقاف</span>
                  </VTooltip>
                  <!-- اعادة تفعيل المجمع -->
                  <VTooltip
                    v-if="
                      actions.includes('اعادة تفعيل') &&
                      !(item.is_active || item.isActive)
                    "
                    location="top"
                  >
                    <template #activator="{ props }">
                      <VBtn
                        icon
                        v-bind="props"
                        variant="plain"
                        color="success"
                        size="small"
                        @click="enableItem(item)"
                      >
                        <VIcon size="18">ri-refresh-line</VIcon>
                      </VBtn>
                    </template>
                    <span>اعادة تفعيل</span>
                  </VTooltip>
                  <!-- حذف -->
                  <VTooltip
                    v-if="
                      actions.includes('حذف') &&
                      (item.is_active || item.isActive)
                    "
                    location="top"
                  >
                    <template #activator="{ props }">
                      <VBtn
                        icon
                        v-bind="props"
                        variant="plain"
                        @click="deleteItem(item)"
                        color="error"
                        size="small"
                      >
                        <VIcon size="18">ri-delete-bin-line</VIcon>
                      </VBtn>
                    </template>
                    <span>حذف</span>
                  </VTooltip>
                  <!-- طباعة -->
                  <VTooltip v-if="actions.includes('طباعة')" location="top">
                    <template #activator="{ props }">
                      <VBtn
                        icon
                        v-bind="props"
                        variant="plain"
                        @click="printItem(item)"
                        color="secondary"
                        size="small"
                      >
                        <VIcon size="18">ri-printer-line</VIcon>
                      </VBtn>
                    </template>
                    <span>طباعة</span>
                  </VTooltip>
                </div>
              </template>

              <template v-else>
                <div class="cell-content">
                  {{ getNestedValue(item, header.key) }}
                </div>
              </template>
            </td>
          </tr>
        </template>

        <!-- Pagination Controls -->
        <template #bottom>
          <div
            class="d-flex flex-wrap justify-space-between align-center pa-4 pagination-container"
          >
            <div class="d-flex align-center">
              <span class="text-caption text-medium-emphasis me-2"
                >عدد الصفوف في الصفحة:</span
              >
              <VSelect
                v-model="tableOptions.limit"
                :items="[5, 10, 25, 50, totalItems]"
                variant="outlined"
                density="compact"
                hide-details
                class="items-per-page-select"
              ></VSelect>
              <div class="mx-4 text-caption text-medium-emphasis">
                {{ (tableOptions.page - 1) * tableOptions.limit + 1 }} -
                {{
                  Math.min(tableOptions.page * tableOptions.limit, totalItems)
                }}
                من {{ totalItems }}
              </div>
            </div>
            <VPagination
              v-model="tableOptions.page"
              :total-visible="$vuetify.display.smAndDown ? 3 : 7"
              :length="Math.ceil(totalItems / tableOptions.limit)"
              rounded="circle"
              class="pagination-controls"
            />
          </div>
        </template>
      </VDataTableServer>
    </VCard>
  </div>
</template>

<script>
import numberWithComma from "@/constant/number";

export default {
  name: "SmartTable",
  props: {
    headers: { type: Array, default: () => [] },
    items: { type: Array, default: () => [] },
    actions: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    totalItems: { type: Number, default: 0 },
    tableOptions: {
      type: Object,
      default: () => ({ page: 1, limit: 10, search: null }),
    },
  },
  data() {
    return {
      isMobile: false,
      results: JSON.parse(localStorage.getItem("results") || "{}"), // آمن
      localSearch: "",
      currentSearch: "",
      searchTimeout: null,
      expandedRows: [],
    };
  },
  watch: {
    "tableOptions.search": {
      handler(newVal) {
        if (newVal !== this.localSearch) {
          this.localSearch = newVal || "";
          this.currentSearch = newVal || "";
        }
      },
      immediate: true,
    },
    localSearch(newVal) {
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }
      this.searchTimeout = setTimeout(() => {
        if (newVal !== this.currentSearch) {
          this.performSearch();
        }
      }, 800);
    },
  },
  mounted() {
    window.addEventListener("resize", this.onResize);
    this.onResize();
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.onResize);
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  },
  methods: {
    getNestedValue(obj, keyPath) {
      return keyPath.split(".").reduce((acc, key) => {
        return acc && acc[key] !== undefined ? acc[key] : null;
      }, obj);
    },
    getRowNumber(index) {
      return (this.tableOptions.page - 1) * this.tableOptions.limit + index + 1;
    },
    numberWithComma,
    formatDate(timestamp) {
      if (!timestamp) return "";
      const date = new Date(timestamp);
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    },
    getRowClass(item) {
      const is_active = this.getNestedValue(item, "is_active");
      const isActive = this.getNestedValue(item, "isActive");
      const isItemActive = is_active || isActive;
      return {
        "active-row": isItemActive,
        "inactive-row": !isItemActive,
      };
    },
    onResize() {
      this.isMobile = window.innerWidth < 769;
    },
    updateTableOptions(newOptions) {
      const { search, ...otherOptions } = newOptions;

      const options = {
        ...this.tableOptions,
        ...otherOptions,
      };
      this.$emit("updateTableOptions", options);
    },
    performSearch() {
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }
      this.currentSearch = this.localSearch;
      const options = {
        ...this.tableOptions,
        search: this.localSearch || null,
        page: 1,
      };
      this.$emit("updateTableOptions", options);
    },
    clearSearch() {
      this.localSearch = "";
      this.performSearch();
    },
    // باقي الوظائف
    editItem(item) {
      this.$emit("editItem", item);
    },
    editPageItem(item) {
      this.$emit("editPageItem", item);
    },
    completeItem(item) {
      this.$emit("completeItem", item);
    },
    deleteItem(item) {
      this.$emit("deleteItem", item);
    },
    showItem(item) {
      this.$emit("showItem", item);
    },
    printItem(item) {
      this.$emit("printItem", item);
    },
    sendNotificationsItem(item) {
      this.$emit("sendNotificationsItem", item);
    },
    emitShowImgs(item) {
      this.$emit("emitShowImgs", item);
    },
    showItemFile(item) {
      this.$emit("showItemFile", item);
    },
    copyItem(item) {
      this.$emit("copyItem", item);
    },
    emitCopyOnLinkItems(item) {
      this.$emit("copyOnLinkItems", item);
    },
    emitCopyLinkWebItems(item) {
      this.$emit("copyLinkWebItems", item);
    },
    empFinishIteme(item) {
      this.$emit("empFinishIteme", item);
    },
    deactivateItem(item) {
      this.$emit("deactivateItem", item);
    },
    enableItem(item) {
      this.$emit("enableItem", item);
    },
    emitConfirmReceivedHouse(item) {
      this.$emit("emitConfirmReceivedHouse", item);
    },
    addNoteItem(item) {
      this.$emit("addNoteItem", item);
    },
    redirectItem(item) {
      this.$emit("redirectItem", item);
    },
    empConfirmIteme(item) {
      this.$emit("empConfirmIteme", item);
    },
    empCancelIteme(item) {
      this.$emit("empCancelIteme", item);
    },
    recreateItem(item) {
      this.$emit("recreateItem", item);
    },
  },
};
</script>

<style>
.v-data-table__td-title {
  text-align: start !important;
}

.v-table .v-table__wrapper > table > tbody > tr:not(:last-child) > td,
.v-table .v-table__wrapper > table > tbody > tr:not(:last-child) > th {
  padding-inline: 0 !important;
}

.v-table > .v-table__wrapper > table > tbody > tr > td,
.v-table > .v-table__wrapper > table > thead > tr > td,
.v-table > .v-table__wrapper > table > tfoot > tr > td {
  text-align: center !important;
}

.smart-table-container {
  inline-size: 100%;
}

.search-container {
  margin-inline: auto 0;
}

.search-field {
  border-radius: 8px;
  margin-block-start: 15px;
  transition: all 0.3s ease;
}

.search-field:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 10%);
}

.table-card {
  overflow: hidden;
  border-radius: 12px;
  transition: box-shadow 0.3s ease;
}

.table-card:hover {
  box-shadow: 0 8px 16px rgba(0, 0, 0, 10%) !important;
}

.cell-content {
  font-size: 14px;
  padding-block: 8px;
  padding-inline: 0;
}

/* تصميم المستقبلين */
.receiver-type-container {
  padding: 8px;
  min-inline-size: 200px;
}

.receiver-type-main {
  margin-block-end: 8px;
  text-align: center;
}

.expand-button-container {
  text-align: center;
}

.expand-btn {
  block-size: 24px;
  font-size: 11px;
  transition: all 0.3s ease;
}

.expand-btn:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 15%);
  transform: translateY(-1px);
}

.rotate-180 {
  transform: rotate(180deg);
  transition: transform 0.3s ease;
}

.receivers-list-container {
  inline-size: 100%;
  margin-block: 0;
  margin-inline: auto;
  max-inline-size: 350px;
}

.receivers-card {
  overflow: hidden;
  border-radius: 12px;
}

.receivers-header {
  display: flex;
  align-items: center;
  border-block-end: 1px solid rgba(var(--v-theme-primary), 0.2);
  padding-block-end: 8px;
}

.receivers-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-block-size: 300px;
  overflow-y: auto;
}

.receiver-item {
  border-radius: 8px;
  background: rgba(255, 255, 255, 80%);
  transition: all 0.2s ease;
}

.receiver-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 10%);
  transform: translateY(-1px);
}

.receiver-details {
  border-block-start: 1px solid rgba(0, 0, 0, 10%);
  margin-block-start: 8px;
  padding-block-start: 8px;
}

.image-cell {
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-avatar {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.image-avatar:hover {
  transform: scale(1.1);
}

/* تحسينات responsive */
@media (max-width: 768px) {
  .receiver-type-container {
    min-inline-size: 150px;
  }

  .receivers-list-container {
    max-inline-size: 280px;
  }

  .receivers-grid {
    max-block-size: 200px;
  }
}

.pagination-container {
  border-block-start: 1px solid rgba(0, 0, 0, 12%);
}

.items-per-page-select {
  max-inline-size: 120px;
}

.pagination-controls {
  margin-block-start: 8px;
}

/* RTL Support */
:dir(rtl) .search-container {
  margin-right: auto;
  margin-left: 0;
}

body .v-btn--icon.v-btn--density-default {
  opacity: 100;
  padding-inline: 2px;
}

.v-data-table-header__content {
  justify-content: center;
}

.v-table .v-table__wrapper {
  padding-block: 10px;
}

/* Row styling based on isActive status */
.active-row {
  background-color: rgba(76, 175, 80, 10%) !important;
  border-inline-start: 4px solid #4caf50 !important;
}

.active-row:hover {
  background-color: rgba(76, 175, 80, 20%) !important;
}

.inactive-row {
  background-color: rgba(244, 67, 54, 10%) !important;
  border-inline-start: 4px solid #f44336 !important;
}

.inactive-row:hover {
  background-color: rgba(244, 67, 54, 20%) !important;
}
</style>
