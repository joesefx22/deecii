// public/js/auth.js
import { apiRequest } from './api.js';

// ... (الدوال الأخرى: redirectToDashboard و showAlert) ...

// ============= 1. معالج نموذج تسجيل الدخول (تعديل الـ IDs) =============
async function handleLogin(e) {
    e.preventDefault();
    const form = document.getElementById('loginForm');
    
    // 🚨 التعديل هنا: جلب القيم باستخدام الـ IDs الجديدة
    const email = document.getElementById('emailLogin').value; 
    const password = document.getElementById('passwordLogin').value; 
    const rememberMe = document.getElementById('rememberMe').checked;
    
    // ... (باقي المنطق كما هو)
    
    try {
        const data = await apiRequest('/auth/login', 'POST', { email, password });
        
        // ... (حفظ الـ Token والـ Role) ...
        // ... (منطق حفظ/مسح rememberedEmail) ...
        
        redirectToDashboard(data.role);

    } catch (error) {
        showAlert(error.message, 'error');
    }
}

// ============= 2. معالج نموذج إنشاء الحساب (تعديل الـ IDs) =============
async function handleSignup(e) {
    e.preventDefault();
    const form = document.getElementById('signupForm');
    
    // 🚨 التعديل هنا: جلب القيم باستخدام الـ IDs الجديدة
    const name = document.getElementById('nameSignup').value; 
    const email = document.getElementById('emailSignup').value; 
    const password = document.getElementById('passwordSignup').value; 
    const confirmPassword = document.getElementById('confirmPasswordSignup').value;
    
    // التحقق من التوافق يتم الآن في الـ HTML (CustomValidity)، لكن نتركه احتياطياً هنا
    if (password !== confirmPassword) {
        // إذا لم يعمل الـ Validation في HTML
        showAlert('كلمتا المرور غير متطابقتين.', 'error');
        return;
    }

    try {
        await apiRequest('/auth/signup', 'POST', { name, email, password });
        
        // التوجيه لصفحة الدخول (توجيه بسيط)
        // 🚨 ملاحظة: يجب التوجيه الآن لملف auth.html وإضافة معامل 'from=signup'
        window.location.href = '/auth.html?from=signup'; 

    } catch (error) {
        showAlert(error.message, 'error');
    }
}

// ============= 3. وظيفة التهيئة وربط الـ Listeners =============
document.addEventListener('DOMContentLoaded', () => {
    // ربط نموذج الدخول
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // ربط نموذج التسجيل
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
    
    // التحقق من حالة المستخدم عند تحميل أي صفحة Authentication
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (token && role) {
        redirectToDashboard(role);
    }
});
// public/js/auth.js
import { apiRequest } from './api.js';

// دالة عرض التنبيهات (يجب أن تنشئ هذه الدالة لتتوافق مع تصميمك)
function showAlert(message, type = 'info') {
    console.log(`ALERT (${type}): ${message}`);
    // يمكنك هنا استخدام Bootstrap Alerts أو أي نظام تنبيهات آخر
}

// دالة التوجيه الرئيسية حسب الـ Role
function redirectToDashboard(role) {
    // التوجيه بناءً على الـ Role كما هو مطلوب في خطتك
    switch (role) {
        case 'player':
            window.location.href = '/user.html'; 
            break;
        case 'employee':
        case 'owner':
        case 'admin':
            window.location.href = `/dashboard.html?view=${role}`;
            break;
        default:
            window.location.href = '/user.html'; 
            break;
    }
}

// ============= 1. معالج نموذج تسجيل الدخول =============
async function handleLogin(e) {
    e.preventDefault();
    const form = document.getElementById('loginForm');
    const email = form.email.value;
    const password = form.password.value;
    const rememberMe = form.rememberMe.checked;
    
    try {
        const data = await apiRequest('/auth/login', 'POST', { email, password });
        
        // حفظ التوكن والـ Role في التخزين المحلي
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);
        
        // حفظ البريد الإلكتروني إذا تم تحديد 'تذكرني'
        if (rememberMe) {
            localStorage.setItem('rememberedEmail', email);
        } else {
            localStorage.removeItem('rememberedEmail');
        }
        
        // التوجيه
        redirectToDashboard(data.role);

    } catch (error) {
        showAlert(error.message, 'error');
    }
}

// ============= 2. معالج نموذج إنشاء الحساب =============
async function handleSignup(e) {
    e.preventDefault();
    const form = document.getElementById('signupForm');
    const name = form.name.value;
    const email = form.email.value;
    const password = form.password.value;
    const confirmPassword = form.confirmPassword.value;
    
    if (password !== confirmPassword) {
        showAlert('كلمتا المرور غير متطابقتين.', 'error');
        return;
    }

    try {
        await apiRequest('/auth/signup', 'POST', { name, email, password });
        
        // التوجيه لصفحة تسجيل الدخول مع رسالة نجاح في الـ URL
        window.location.href = '/login.html?from=signup';

    } catch (error) {
        showAlert(error.message, 'error');
    }
}

// ============= 3. وظيفة التهيئة وربط الـ Listeners =============
document.addEventListener('DOMContentLoaded', () => {
    // ربط نموذج الدخول
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        // إزالة الـ Listener القديم في login.html وتطبيق الجديد
        loginForm.removeEventListener('submit', window.handleLoginFormSubmit);
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // ربط نموذج التسجيل
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        // إزالة الـ Listener القديم في signup.html وتطبيق الجديد
        signupForm.removeEventListener('submit', window.handleFormSubmit);
        signupForm.addEventListener('submit', handleSignup);
    }
    
    // التحقق من حالة المستخدم عند تحميل أي صفحة Authentication
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (token && role) {
        // إذا كان مسجلاً دخول بالفعل، قم بتوجيهه للوحة التحكم
        redirectToDashboard(role);
    }
});

