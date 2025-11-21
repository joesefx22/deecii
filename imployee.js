// public/js/employee.js
import { apiRequest } from './api.js';

let employeeState = {
    fields: [],
    selectedField: null,
    selectedDate: new Date().toISOString().split('T')[0]
};

// =============================================
// دوال مساعدة
// =============================================

function formatTimeDisplay(time) {
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const suffix = hour >= 12 && hour !== 24 ? 'م' : 'ص';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour}:${m} ${suffix}`;
}

function getStatusClass(status) {
    switch (status) {
        case 'booked_confirmed': return 'status-confirmed bg-success-subtle';
        case 'booked_unconfirmed': return 'status-unconfirmed bg-warning-subtle';
        case 'played': return 'status-played bg-info-subtle';
        case 'missed': return 'status-missed bg-danger-subtle';
        default: return 'bg-light';
    }
}

window.showAlert = function(message, type = 'info') {
    const alertBox = document.getElementById('alertMessage');
    alertBox.textContent = message;
    alertBox.className = `alert alert-${type}`;
    alertBox.style.display = 'block';
    setTimeout(() => { alertBox.style.display = 'none'; }, 5000);
}

function loadView(viewName) {
    // إزالة Active من جميع الروابط
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    // إضافة Active للرابط الحالي
    const activeLink = document.querySelector(`.sidebar .nav-link[data-view="${viewName}"]`);
    if (activeLink) activeLink.classList.add('active');

    if (views[viewName]) {
        views[viewName]();
    } else {
        document.getElementById('mainContent').innerHTML = '<h2 class="text-danger">الصفحة غير موجودة</h2>';
    }
}

// =============================================
// دوال إدارة الحجوزات
// =============================================

async function loadBookings() {
    const fieldId = employeeState.selectedField?.field_id;
    const date = employeeState.selectedDate;

    if (!fieldId) {
        document.getElementById('bookingsList').innerHTML = '<div class="alert alert-info">يرجى اختيار ملعب لبدء العمل.</div>';
        return;
    }

    document.getElementById('bookingsList').innerHTML = `<div class="text-center p-4"><i class="bi bi-arrow-clockwise spinner-border text-primary"></i> <p class="mt-2">جاري تحميل الحجوزات...</p></div>`;

    try {
        const bookings = await apiRequest(`/api/employee/bookings?fieldId=${fieldId}&date=${date}`, 'GET');
        
        let html = bookings.map(b => {
            // تحديد الأزرار بناءً على الحالة
            let actions = '';
            
            if (b.status === 'booked_confirmed' && !b.deposit_paid) {
                // حالة نادرة: حجز مؤكد بدون عربون (خطأ في النظام؟)، يمكن للموظف تأكيده أو تسجيل حضوره مباشرة
                actions = `<button class="btn btn-sm btn-success checkin-btn" data-booking-id="${b.booking_id}">تسجيل حضور (Check-in)</button>`;
            } else if (b.status === 'booked_confirmed' && b.deposit_paid) {
                // حجز مؤكد بعربون (الوضع الطبيعي)
                 actions = `<button class="btn btn-sm btn-success checkin-btn" data-booking-id="${b.booking_id}">تسجيل حضور (Check-in)</button>`;
            } else if (b.status === 'booked_unconfirmed' && b.deposit_amount > 0) {
                 // حجز غير مؤكد مطلوب عربون (فشل في الدفع أونلاين)، يجب على الموظف رفضه أو توجيه العميل للدفع
                 actions = `<button class="btn btn-sm btn-danger missed-btn" data-booking-id="${b.booking_id}">إلغاء/لم يحضر</button>`;
            } else if (b.status === 'booked_unconfirmed' && b.deposit_amount === 0) {
                // حجز أقل من 24 ساعة بدون عربون، ينتظر تأكيد نقدي
                 actions = `
                    <button class="btn btn-sm btn-primary confirm-cash-btn me-2" data-booking-id="${b.booking_id}">تأكيد نقدي</button>
                    <button class="btn btn-sm btn-danger missed-btn" data-booking-id="${b.booking_id}">إلغاء/لم يحضر</button>
                 `;
            } else if (b.status === 'played' || b.status === 'missed') {
                actions = `<span class="badge bg-secondary">${b.status === 'played' ? 'تم اللعب' : 'لم يحضر'}</span>`;
            }
            
            const totalDue = b.total_amount - (b.deposit_paid ? b.deposit_amount : 0);
            
            return `
                <div class="col-md-6 mb-4">
                    <div class="card booking-card ${getStatusClass(b.status)} p-3 h-100">
                        <div class="d-flex justify-content-between align-items-start">
                            <h5 class="card-title">${formatTimeDisplay(b.start_time)} - ${formatTimeDisplay(b.end_time)}</h5>
                            <span class="badge ${b.status === 'booked_confirmed' ? 'bg-success' : 'bg-warning'}">${b.status}</span>
                        </div>
                        <p class="mb-1">اللاعب: <strong>${b.player_name}</strong> - ${b.player_phone}</p>
                        <p class="mb-1 small">الحجز # ${b.booking_id.substring(0, 8)}</p>
                        <hr>
                        <p class="mb-1">الإجمالي: ${b.total_amount} ج</p>
                        <p class="mb-1">تم دفع عربون (أونلاين): <strong>${b.deposit_paid ? 'نعم' : 'لا'}</strong></p>
                        <p class="mb-2 fw-bold text-danger">المتبقي نقداً: ${totalDue} ج</p>
                        <div class="mt-2 text-end">
                           ${actions}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        if (bookings.length === 0) {
            html = '<div class="alert alert-success mt-4">لا توجد حجوزات لهذا الملعب في التاريخ المحدد.</div>';
        }

        document.getElementById('bookingsList').innerHTML = `<div class="row">${html}</div>`;
        
        // ربط مستمعي الأحداث
        document.querySelectorAll('.checkin-btn').forEach(btn => btn.addEventListener('click', handleCheckIn));
        document.querySelectorAll('.confirm-cash-btn').forEach(btn => btn.addEventListener('click', handleConfirmCash));
        document.querySelectorAll('.missed-btn').forEach(btn => btn.addEventListener('click', handleMissed)); // يجب بناء دالة Missed
        
    } catch (error) {
        window.showAlert(`فشل تحميل الحجوزات: ${error.message}`, 'error');
        document.getElementById('bookingsList').innerHTML = `<div class="alert alert-danger">فشل تحميل الحجوزات.</div>`;
    }
}

async function handleCheckIn(e) {
    const bookingId = e.target.getAttribute('data-booking-id');
    if (!confirm('هل أنت متأكد من تسجيل حضور هذا اللاعب؟')) return;

    try {
        await apiRequest('/api/employee/booking/checkin', 'POST', { bookingId });
        window.showAlert('✅ تم تسجيل الحضور بنجاح. تم تحديث الحالة إلى "played".', 'success');
        loadBookings();
    } catch (error) {
        window.showAlert(`فشل تسجيل الحضور: ${error.message}`, 'error');
    }
}

async function handleConfirmCash(e) {
    const bookingId = e.target.getAttribute('data-booking-id');
    if (!confirm('هل استلمت المبلغ النقدي المتبقي/المطلوب لتأكيد هذا الحجز؟')) return;
    
    try {
        await apiRequest('/api/employee/booking/confirm-cash', 'POST', { bookingId });
        window.showAlert('💰 تم تأكيد الدفع النقدي وتأكيد الحجز. تم تحديث الحالة.', 'success');
        loadBookings();
    } catch (error) {
        window.showAlert(`فشل تأكيد الدفع: ${error.message}`, 'error');
    }
}

// دالة لمعالجة الغياب (يجب أن ترسل لـ API مخصص، لكن نستخدم تحديث الحالة مؤقتاً)
async function handleMissed(e) {
    const bookingId = e.target.getAttribute('data-booking-id');
    if (!confirm('هل تريد الإبلاغ عن غياب هذا اللاعب وإلغاء الحجز؟')) return;
    
    // 🚨 ملاحظة: يجب أن تكون دالة تحديث حالة عامة في الـ Backend
    // سنستخدم API وهمي حالياً
     try {
        // نرسل طلب وهمي لتحديث الحالة إلى missed (يجب بناء API خاص أو استخدام API عام لتحديث الحالة)
        // حالياً نعتمد على API checkInController لتجنب إنشاء API جديد الآن
        window.showAlert('⚠️ يجب بناء API خاص لـ "Missed". لن يتم تحديث الحالة حالياً.', 'warning');
        
        // لو كان لدينا API عام
        // await apiRequest('/api/employee/booking/set-status', 'POST', { bookingId, status: 'missed' });
        // window.showAlert('❌ تم الإبلاغ عن الغياب.', 'success');
        
        // loadBookings();
    } catch (error) {
         window.showAlert(`فشل الإبلاغ: ${error.message}`, 'error');
    }
}

// =============================================
// دوال عرض الواجهات الفرعية (Views)
// =============================================

const views = {
    // 1. حجوزات اليوم (Employee Dashboard)
    'bookings-today': async () => {
        const mainContent = document.getElementById('mainContent');
        
        // بناء قائمة الملاعب المعينة للموظف
        const fieldOptions = employeeState.fields.map(f => 
            `<option value="${f.field_id}" ${employeeState.selectedField?.field_id === f.field_id ? 'selected' : ''}>${f.name}</option>`
        ).join('');
        
        mainContent.innerHTML = `
            <h2 class="mb-4">📋 إدارة حجوزات اليوم</h2>
            
            <div class="row mb-4">
                <div class="col-md-6">
                    <label for="fieldSelect" class="form-label">اختر الملعب:</label>
                    <select id="fieldSelect" class="form-select">
                        <option value="">-- اختر ملعب --</option>
                        ${fieldOptions}
                    </select>
                </div>
                <div class="col-md-6">
                    <label for="dateSelect" class="form-label">اختر التاريخ:</label>
                    <input type="date" id="dateSelect" class="form-control" value="${employeeState.selectedDate}">
                </div>
            </div>

            <hr>
            
            <h4 class="mt-4">قائمة الحجوزات: <span id="currentFieldTitle">${employeeState.selectedField?.name || ''}</span></h4>
            <div id="bookingsList">
                <div class="alert alert-info">يرجى اختيار ملعب لبدء العمل.</div>
            </div>
        `;

        // ربط مستمعي الأحداث
        document.getElementById('fieldSelect').addEventListener('change', (e) => {
            const fieldId = e.target.value;
            employeeState.selectedField = employeeState.fields.find(f => f.field_id === fieldId);
            document.getElementById('currentFieldTitle').textContent = employeeState.selectedField?.name || '';
            loadBookings();
        });

        document.getElementById('dateSelect').addEventListener('change', (e) => {
            employeeState.selectedDate = e.target.value;
            loadBookings();
        });

        // إذا تم اختيار ملعب، قم بتحميل الحجوزات مباشرة
        if (employeeState.selectedField) {
            loadBookings();
        }
    },
    
    // 2. ملفي الشخصي (بسيط للموظف)
    'profile': async () => {
        const mainContent = document.getElementById('mainContent');
        const userProfile = JSON.parse(localStorage.getItem('userProfile')) || {};
        
        mainContent.innerHTML = `
            <h2 class="mb-4">👤 ملفي الشخصي</h2>
            <div class="card p-4">
                <p><strong>الاسم:</strong> ${userProfile.name || '---'}</p>
                <p><strong>البريد الإلكتروني:</strong> ${userProfile.email || '---'}</p>
                <p><strong>الدور:</strong> <span class="badge bg-primary">موظف (Employee)</span></p>
                <p><strong>الملاعب المسؤولة عنها:</strong> ${employeeState.fields.map(f => f.name).join(', ') || 'لم يتم تعيين ملاعب'}</p>
                <hr>
                <p class="text-muted small">لأسباب أمنية، يجب تغيير كلمة المرور عبر لوحة الإدارة أو طلب المساعدة.</p>
            </div>
        `;
    }
};

// =============================================
// التهيئة النهائية
// =============================================

async function initializeEmployeeApp() {
    // 1. التحقق الأمني
    if (!localStorage.getItem('token') || localStorage.getItem('role') !== 'employee') {
        window.location.href = '/auth.html'; // التوجيه لصفحة تسجيل الدخول
        return;
    }

    try {
        // 2. جلب الملاعب المعينة للموظف
        const fields = await apiRequest('/api/employee/fields', 'GET');
        employeeState.fields = fields;
        
        if (fields.length > 0) {
            employeeState.selectedField = fields[0]; // اختيار أول ملعب بشكل افتراضي
        }

        // 3. عرض اسم الموظف
        const userProfile = JSON.parse(localStorage.getItem('userProfile')) || {};
        document.getElementById('employeeName').textContent = userProfile.name || 'موظف الملعب';
        
        // 4. ربط مستمعي الأحداث للـ Sidebar
        document.querySelectorAll('.sidebar .nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = e.currentTarget.getAttribute('data-view');
                loadView(view);
            });
        });
        
        document.getElementById('logoutBtn').addEventListener('click', async (e) => {
             e.preventDefault();
             localStorage.clear();
             // يمكن استدعاء /api/logout هنا إن وجدت
             window.location.href = '/auth.html';
        });

        // 5. تحميل الواجهة الافتراضية
        loadView('bookings-today');

    } catch (error) {
        window.showAlert(`فشل في تهيئة النظام: ${error.message}. يرجى محاولة تسجيل الدخول مرة أخرى.`, 'error');
        console.error('Initialization Error:', error);
        // التوجيه للخروج
        setTimeout(() => { window.location.href = '/auth.html'; }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', initializeEmployeeApp);
