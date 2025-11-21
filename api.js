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
