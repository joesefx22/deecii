// public/js/api.js
const API_BASE_URL = "/api"; 

/**
 * دالة مركزية لإرسال طلبات API
 */
async function apiRequest(endpoint, method = 'GET', body = null) {
    const token = localStorage.getItem('token');
    const headers = { "Content-Type": "application/json" };
    
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : null
        });
        
        // التحقق من حالة عدم التصريح (Unauthenticated)
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            // التوجيه لصفحة الدخول
            window.location.href = '/login.html?session_expired=true'; 
            throw new Error("Session Expired or Unauthorized.");
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'API request failed.');
        }

        return data;
    } catch (error) {
        throw error;
    }
}

export { apiRequest };

// api.js (أو ملف الـ JS الذي يحتوي على دالة الطلبات)

let csrfToken = null; // سيتم تعيينه بعد الجلب

// دالة جلب الـ CSRF Token
async function fetchCSRFToken() {
    try {
        const response = await fetch('/api/csrf-token', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch CSRF token');
        const data = await response.json();
        csrfToken = data.csrfToken;
        return csrfToken;
    } catch (error) {
        console.error('CSRF Error:', error);
        throw new Error('فشل جلب توكن الأمان. يرجى إعادة المحاولة.');
    }
}

// تعديل دالة الطلب الرئيسية (لتضمين الـ CSRF)
async function apiRequest(endpoint, method = "GET", body = null) {
  const headers = { 
      "Content-Type": "application/json" 
  };

  // 💡 إضافة CSRF Token لجميع الطلبات الحساسة
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
      if (!csrfToken) {
          await fetchCSRFToken(); // محاولة جلب التوكن إذا لم يكن موجوداً
      }
      headers["X-CSRF-Token"] = csrfToken; 
  }

  // ... (باقي كود apiRequest بما في ذلك إضافة Authorization Token)

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });
  // ... (باقي معالجة الردود)
}

// 🎯 يجب استدعاء fetchCSRFToken() مرة واحدة على الأقل عند بدء تحميل الصفحات الحساسة.
