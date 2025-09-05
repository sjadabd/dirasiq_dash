# Google Authentication Component

## الوصف
مكون Vue.js لتسجيل الدخول باستخدام Google OAuth 2.0 مع عرض بيانات المستخدم في الكونسول.

## الميزات
- تسجيل الدخول باستخدام Google One Tap
- عرض بيانات المستخدم في الكونسول
- واجهة مستخدم جميلة لعرض معلومات المستخدم
- إمكانية تسجيل الخروج
- إعداد جاهز لإرسال البيانات للسيرفر

## الإعداد

### 1. إنشاء ملف .env
```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
VITE_API_BASE_URL=http://localhost:3000/api
```

### 2. الحصول على Google Client ID
1. اذهب إلى [Google Cloud Console](https://console.cloud.google.com/)
2. أنشئ مشروع جديد أو اختر مشروع موجود
3. فعّل Google+ API
4. اذهب إلى "Credentials" وأنشئ OAuth 2.0 Client ID
5. أضف domain الخاص بك في "Authorized JavaScript origins"
6. انسخ Client ID وضعها في ملف .env

### 3. استخدام المكون
```vue
<template>
  <AuthGoogele />
</template>

<script setup>
import AuthGoogele from '@/components/aueh/AuthGoogele.vue'
</script>
```

## البيانات المعروضة في الكونسول
عند تسجيل الدخول بنجاح، ستظهر البيانات التالية في الكونسول:
- JWT Token كامل
- بيانات المستخدم المفكوكة
- البريد الإلكتروني
- الاسم
- صورة المستخدم
- معرف المستخدم
- حالة تأكيد البريد

## إعداد API السيرفر
المكون جاهز لإرسال البيانات للسيرفر. قم بإلغاء التعليق عن الكود في دالة `sendUserDataToServer`:

```javascript
const response = await fetch('/api/auth/google', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    idToken: userData.fullToken,
    userData: userData
  })
})
```

## الأمان
- يتم فك تشفير JWT في الواجهة الأمامية للعرض فقط
- في الإنتاج، يجب التحقق من صحة الـ token في السيرفر
- استخدم HTTPS دائماً في الإنتاج
