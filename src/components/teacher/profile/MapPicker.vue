<template>
  <v-card class="pa-4">
    <div class="d-flex align-center mb-4">
      <v-icon color="primary" class="me-2">mdi-map-marker</v-icon>
      <span class="text-h6">تحديد الموقع</span>
    </div>

    <!-- شرح للمعلم -->
    <div class="text-body-2 text-medium-emphasis mb-4">
      يرجى تحديد موقعك بدقة والموافقة على صلاحيات الموقع في متصفحك. سيتم استخدام
      موقعك لإرسال إشعارات للطلاب القريبين منك، ولاقتراح الدروس والخدمات لجميع
      الطلاب بناءً على موقعك الجغرافي.
    </div>

    <div class="d-flex gap-2 mb-4">
      <v-text-field
        v-model="searchQuery"
        placeholder="ابحث عن موقع..."
        variant="outlined"
        density="compact"
        @keyup.enter="handleSearch"
        class="flex-grow-1"
      />
      <v-btn
        @click="handleSearch"
        icon="mdi-magnify"
        variant="outlined"
        size="small"
      />
      <!-- زر تحديد الموقع الحالي -->
      <v-btn
        @click="locateUser"
        icon="mdi-crosshairs-gps"
        variant="outlined"
        size="small"
        color="primary"
        title="تحديد موقعي الحالي"
      />
    </div>

    <div class="position-relative">
      <div ref="mapContainer" class="map-container" />
      <v-overlay
        v-if="isLoading"
        contained
        class="d-flex align-center justify-center"
      >
        <div class="text-center">
          <v-progress-circular indeterminate color="primary" class="mb-2" />
          <div class="text-body-2">جاري تحميل الخريطة...</div>
        </div>
      </v-overlay>
    </div>

    <div class="mt-4 text-body-2 text-medium-emphasis">
      <div>خط العرض: {{ coordinates.latitude }}</div>
      <div>خط الطول: {{ coordinates.longitude }}</div>
      <div class="text-caption mt-1">
        يمكنك سحب العلامة أو النقر على الخريطة لتحديد الموقع
      </div>
    </div>
  </v-card>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from "vue";

const props = defineProps({
  initialLat: { type: Number, default: 31.2001 },
  initialLng: { type: Number, default: 29.9187 },
});

const emit = defineEmits(["locationUpdate"]);

const mapContainer = ref(null);
const map = ref(null);
const marker = ref(null);
const searchQuery = ref("");
const isLoading = ref(true);
const coordinates = ref({
  latitude: props.initialLat,
  longitude: props.initialLng,
});

const updateLocation = (lat, lng) => {
  coordinates.value = {
    latitude: parseFloat(lat.toFixed(6)),
    longitude: parseFloat(lng.toFixed(6)),
  };
  emit("locationUpdate", coordinates.value);
};

const handleSearch = async () => {
  if (!searchQuery.value.trim()) return;

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchQuery.value
      )}&limit=1`
    );
    const data = await response.json();
    if (data.length > 0 && map.value && marker.value) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      map.value.setView([lat, lng], 15);
      marker.value.setLatLng([lat, lng]);
      updateLocation(lat, lng);
    }
  } catch (err) {
    console.error("Search error:", err);
  }
};

// ================== زر تحديد الموقع الحالي ==================
const locateUser = () => {
  if (!navigator.geolocation) {
    alert("المتصفح لا يدعم تحديد الموقع.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      if (map.value && marker.value) {
        map.value.setView([latitude, longitude], 15);
        marker.value.setLatLng([latitude, longitude]);
        updateLocation(latitude, longitude);
      }
    },
    (err) => {
      console.error("Geolocation error:", err);
      alert("تعذّر الحصول على موقعك الحالي.");
    },
    { enableHighAccuracy: true }
  );
};

// ================== تحميل الخريطة ==================
const loadMap = async () => {
  if (typeof window === "undefined") return;

  try {
    const L = (await import("leaflet")).default;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    if (mapContainer.value && !map.value) {
      const newMap = L.map(mapContainer.value, {
        attributionControl: false, // 🚫 إخفاء النص
      }).setView([props.initialLat, props.initialLng], 13);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(newMap);

      const customIcon = L.divIcon({
        html: `<div class="bg-primary text-white rounded-circle pa-2 elevation-4" style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                   <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                 </svg>
               </div>`,
        className: "custom-marker",
        iconSize: [40, 40],
        iconAnchor: [20, 40],
      });

      const newMarker = L.marker([props.initialLat, props.initialLng], {
        draggable: true,
        icon: customIcon,
      }).addTo(newMap);

      newMarker.on("moveend", (e) => {
        const { lat, lng } = e.target.getLatLng();
        updateLocation(lat, lng);
      });

      newMap.on("click", (e) => {
        const { lat, lng } = e.latlng;
        newMarker.setLatLng([lat, lng]);
        updateLocation(lat, lng);
      });

      map.value = newMap;
      marker.value = newMarker;
      isLoading.value = false;
    }
  } catch (err) {
    console.error("Error loading map:", err);
    isLoading.value = false;
  }
};

onMounted(loadMap);
onUnmounted(() => {
  if (map.value) map.value.remove();
});
</script>


<style scoped>
.map-container {
  overflow: hidden;
  border-radius: 8px;
  block-size: 320px;
  inline-size: 100%;
}

.gap-2 {
  gap: 8px;
}

.leaflet-control-attribution {
  display: none !important;
}
</style>
