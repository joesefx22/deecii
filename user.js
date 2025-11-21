// public/js/user.js
import { apiRequest } from './api.js';

// =============================================
// 1. منطق الأمان والتوجيه
// =============================================

function checkAuthenticationAndRole() {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (!token || !role || role !== 'player') {
        window.location.href = '/auth.html';
        return false;
    }
    return true;
}

function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    sessionStorage.clear();
    window.location.href = '/auth.html';
}

window.showAlert = function(message, type = 'info') {
    // استخدم هذه الدالة لعرض تنبيهات Bootstrap في الواجهة
    console.log(`ALERT (${type}): ${message}`);
    alert(`[${type.toUpperCase()}] ${message}`);
}

// =============================================
// 2. دوال تحميل البيانات والتحديث
// =============================================

async function loadProfileAndGreet() {
    try {
        const profileData = await apiRequest('/user/profile', 'GET');
        
        document.getElementById('userName').textContent = profileData.name;
        document.getElementById('userRole').textContent = profileData.role;
        
        sessionStorage.setItem('playerProfile', JSON.stringify(profileData));
        return profileData;

    } catch (error) {
        window.showAlert("فشل في تحميل بيانات الملف الشخصي.", 'error');
        return null; 
    }
}

// =============================================
// 3. دوال عرض الواجهات الفرعية (Views)
// =============================================

const views = {
    // 1. حجز جديد (من concepts of index(4).html)
    'booking': async () => {
        // هذه الواجهة تتطلب كود عرض الملاعب الكامل (سيتم تطويره لاحقاً)
        return `
            <h2 class="mb-4">🏟️ حجز ملعب كرة قدم</h2>
            <div class="alert alert-info">هذه الواجهة هي واجهة الحجز الأساسية. يجب هنا عرض الملاعب المتاحة مع فلاتر.</div>
            <button class="btn btn-primary" onclick="window.showAlert('سيتم استدعاء API حجز جديد وإذا كانت النتيجة تتطلب دفع عربون سيتم التوجيه لـ payment.html?booking_id=XXX')">ابدأ البحث عن ملعب</button>
        `;
    },

    // 2. حجوزاتي
    'my-bookings': async () => {
        try {
            const bookings = await apiRequest('/player/bookings', 'GET');
            
            if (bookings.length === 0) {
                return `<div class="alert alert-warning">لا توجد لديك حجوزات سابقة أو قادمة.</div>`;
            }

            const htmlContent = bookings.map(b => {
                const statusClass = b.status === 'booked_confirmed' ? 'status-confirmed' : b.status === 'booked_unconfirmed' ? 'status-unconfirmed' : 'status-cancelled';
                const statusText = b.status === 'booked_confirmed' ? 'مؤكد' : b.status === 'booked_unconfirmed' ? 'غير مؤكد (بانتظار الدفع)' : 'ملغاة';
                
                return `
                    <div class="card card-field mb-3">
                        <div class="card-body d-flex justify-content-between align-items-center">
                            <div>
                                <h5>${b.field_name} - ${b.location || 'غير محدد'}</h5>
                                <p class="text-muted mb-1">التاريخ: ${new Date(b.booking_date).toLocaleDateString()} من ${b.start_time} إلى ${b.end_time}</p>
                                <p class="mb-0">المبلغ الإجمالي: ${b.total_amount} جنيه، العربون: ${b.deposit_amount} جنيه.</p>
                            </div>
                            <span class="booking-status-badge ${statusClass}">${statusText}</span>
                        </div>
                    </div>
                `;
            }).join('');

            return `<h2 class="mb-4">📄 حجوزاتي السابقة والقادمة (${bookings.length})</h2>${htmlContent}`;

        } catch (error) {
            return `<div class="alert alert-danger">فشل في تحميل الحجوزات: ${error.message}</div>`;
        }
    },

    // 3. لاعبوني معاكم (من players.html)
    'team-requests': async () => {
        try {
            const requests = await apiRequest('/player/requests', 'GET');
            
            if (requests.length === 0) {
                return `<div class="alert alert-success">لا توجد طلبات لاعبين مفتوحة حالياً يمكنك الانضمام إليها.</div>`;
            }

            const htmlContent = requests.map(r => `
                <div class="card card-field mb-3">
                    <div class="card-body">
                        <h5>${r.field_name} - بتاريخ ${new Date(r.booking_date).toLocaleDateString()}</h5>
                        <p class="mb-1 text-muted">من: ${r.start_time} حتى: ${r.end_time}</p>
                        <p class="text-primary fw-bold">مطلوب: ${r.players_needed} لاعبين إضافيين.</p>
                        <p class="small">الحاجز: ${r.booker_name}</p>
                        <button class="btn btn-sm btn-outline-primary" data-request-id="${r.request_id}">انضمام</button>
                    </div>
                </div>
            `).join('');

            return `<h2 class="mb-4">👥 طلبات الانضمام المفتوحة (${requests.length})</h2>${htmlContent}`;

        } catch (error) {
            return `<div class="alert alert-danger">فشل في تحميل طلبات اللاعبين: ${error.message}</div>`;
        }
    },

    // 4. ملفي الشخصي (من profile.html)
    'profile': async () => {
        const profile = JSON.parse(sessionStorage.getItem('playerProfile'));
        if (!profile) return `<div class="alert alert-danger">لا يمكن تحميل البيانات. يرجى تسجيل الخروج والدخول مجدداً.</div>`;
        
        return `
            <h2 class="mb-4">👤 تعديل الملف الشخصي</h2>
            <form id="profileForm" class="form-section">
                <div class="mb-3">
                    <label for="profileName" class="form-label">الاسم الكامل</label>
                    <input type="text" class="form-control" id="profileName" name="name" value="${profile.name}" required>
                </div>
                <div class="mb-3">
                    <label for="profileEmail" class="form-label">البريد الإلكتروني</label>
                    <input type="email" class="form-control" id="profileEmail" value="${profile.email}" disabled>
                </div>
                <div class="mb-3">
                    <label for="profilePhone" class="form-label">رقم الهاتف</label>
                    <input type="tel" class="form-control" id="profilePhone" name="phone" value="${profile.phone || ''}">
                </div>
                
                <hr>
                
                <h5 class="mt-4 mb-3">تغيير كلمة المرور (اختياري)</h5>
                <div class="mb-3">
                    <label for="currentPassword" class="form-label">كلمة المرور الحالية</label>
                    <input type="password" class="form-control" id="currentPassword" name="current_password">
                </div>
                <div class="mb-3">
                    <label for="newPassword" class="form-label">كلمة المرور الجديدة</label>
                    <input type="password" class="form-control" id="newPassword" name="password">
                </div>

                <button type="submit" class="btn btn-primary w-100 mt-4">حفظ التغييرات</button>
            </form>
        `;
    }
};

async function handleProfileUpdate(e) {
    e.preventDefault();
    const form = e.target;
    const data = {
        name: form.name.value,
        phone: form.phone.value,
        current_password: form.current_password.value,
        password: form.password.value,
    };
    
    if (!data.current_password || !data.password) {
        delete data.current_password;
        delete data.password;
    }
    
    try {
        const result = await apiRequest('/user/profile', 'PUT', data);
        window.showAlert(result.message, 'success');
        await loadProfileAndGreet(); 

    } catch (error) {
        window.showAlert(error.message, 'error');
    }
}


async function loadView(viewName) {
    // ... (منطق تحميل الواجهة و شاشة التحميل) ...
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `<div class="container-fluid pt-5 text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div><p class="mt-2">جاري تحميل واجهة ${viewName}...</p></div>`;
    
    document.querySelectorAll('.sidebar a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-view') === viewName) {
            link.classList.add('active');
        }
    });

    try {
        if (views[viewName]) {
            const html = await views[viewName]();
            mainContent.innerHTML = `<div class="container-fluid pt-4">${html}</div>`;
            
            if (viewName === 'profile') {
                document.getElementById('profileForm').addEventListener('submit', handleProfileUpdate);
            }
        } else {
            mainContent.innerHTML = `<div class="alert alert-warning">الواجهة المطلوبة غير موجودة.</div>`;
        }
    } catch (error) {
        mainContent.innerHTML = `<div class="alert alert-danger">حدث خطأ أثناء تحميل الواجهة: ${error.message}</div>`;
    }
}


document.addEventListener('DOMContentLoaded', () => {
    // 1. التحقق من الأمان
    if (!checkAuthenticationAndRole()) {
        return; 
    }
    
    // 2. تحميل بيانات المستخدم
    loadProfileAndGreet();
    
    // 3. ربط زر تسجيل الخروج
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // 4. ربط قائمة الملاحة الجانبية
    document.querySelectorAll('.sidebar a[data-view]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const view = e.currentTarget.getAttribute('data-view');
            loadView(view);
        });
    });

    // 5. تحميل الواجهة الافتراضية
    loadView('booking');
});

// public/js/user.js (تعديل دالة views['booking'])

// ... (تأكد من وجود استيراد apiRequest و دالة loadView) ...
import { apiRequest } from './api.js';

// حالة متغيرة لإدارة تدفق الحجز (جديدة)
const bookingState = {
    selectedField: null,
    selectedDate: new Date().toISOString().split('T')[0],
    selectedSlot: null
};

// دالة مساعدة: تحويل الوقت من (HH:MM) إلى عرض (H:MM ص/م)
function formatTimeDisplay(time) {
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const suffix = hour >= 12 && hour !== 24 ? 'م' : 'ص';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour}:${m} ${suffix}`;
}

// =============================================
// 4. دوال عرض الواجهات الفرعية (Views)
// =============================================

const views = {
    
    // 1. حجز جديد (Booking) - الواجهة التفاعلية الجديدة
    'booking': async () => {
        
        // ---------------------------------
        // منطق التفاعل والحجز
        // ---------------------------------
        async function loadFields() {
            try {
                // جلب الملاعب المتاحة
                const fields = await apiRequest('/api/fields/available', 'GET');
                
                const fieldCards = fields.map(f => `
                    <div class="col-md-4 mb-4">
                        <div class="card h-100 card-field ${f.field_id === bookingState.selectedField?.field_id ? 'border-primary border-3 shadow-lg' : ''}" 
                             data-field-id="${f.field_id}" data-field-name="${f.name}" data-price="${f.price_per_hour}" data-deposit="${f.deposit_amount}">
                            <div class="card-body">
                                <h5 class="card-title">${f.name}</h5>
                                <p class="card-text text-muted">${f.location || f.area}</p>
                                <p class="mb-1 fw-bold text-success">السعر: ${f.price_per_hour} ج/س</p>
                                <p class="small text-warning">عربون: ${f.deposit_amount} ج</p>
                            </div>
                        </div>
                    </div>
                `).join('');
                
                document.getElementById('fieldsContainer').innerHTML = fieldCards;
                
                // ربط مستمعين الأحداث لاختيار الملعب
                document.querySelectorAll('#fieldsContainer .card-field').forEach(card => {
                    card.addEventListener('click', (e) => {
                        const fieldId = e.currentTarget.getAttribute('data-field-id');
                        const fieldName = e.currentTarget.getAttribute('data-field-name');
                        const price = parseFloat(e.currentTarget.getAttribute('data-price'));
                        const deposit = parseFloat(e.currentTarget.getAttribute('data-deposit'));
                        
                        // تحديث حالة الحجز
                        bookingState.selectedField = { field_id: fieldId, name: fieldName, price, deposit };
                        bookingState.selectedSlot = null;
                        renderBookingView(); 
                    });
                });

            } catch (error) {
                document.getElementById('fieldsContainer').innerHTML = `<div class="alert alert-danger">فشل في تحميل الملاعب: ${error.message}</div>`;
            }
        }
        
        async function loadSlots() {
            const fieldId = bookingState.selectedField?.field_id;
            const date = bookingState.selectedDate;

            if (!fieldId || !date) return;

            document.getElementById('slotsContainer').innerHTML = `<div class="text-center w-100 p-3"><i class="bi bi-arrow-clockwise spinner-border text-success"></i> <p class="mt-2">جاري تحميل المواعيد...</p></div>`;

            try {
                // جلب الساعات المتاحة للملعب والتاريخ
                const slots = await apiRequest(`/api/fields/slots?fieldId=${fieldId}&date=${date}`, 'GET');
                
                let html = slots.map(slot => {
                    const isSelected = bookingState.selectedSlot?.start_time === slot.start_time;
                    const slotClass = isSelected ? 'btn-primary' : 'btn-outline-primary';
                    
                    return `
                        <button type="button" class="btn ${slotClass} btn-slot m-1" 
                                data-start="${slot.start_time}" data-end="${slot.end_time}" data-duration="1">
                            ${formatTimeDisplay(slot.start_time)} - ${formatTimeDisplay(slot.end_time)}
                        </button>
                    `;
                }).join('');
                
                if (slots.length === 0) {
                     html = `<div class="alert alert-warning">لا توجد ساعات متاحة لهذا اليوم.</div>`;
                }

                document.getElementById('slotsContainer').innerHTML = html;
                
                // ربط مستمعين الأحداث لاختيار الساعة
                document.querySelectorAll('#slotsContainer .btn-slot').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const start_time = e.currentTarget.getAttribute('data-start');
                        const end_time = e.currentTarget.getAttribute('data-end');
                        const duration_hours = parseFloat(e.currentTarget.getAttribute('data-duration'));
                        
                        bookingState.selectedSlot = { start_time, end_time, duration_hours };
                        renderBookingView(); 
                    });
                });

            } catch (error) {
                document.getElementById('slotsContainer').innerHTML = `<div class="alert alert-danger">فشل في تحميل المواعيد: ${error.message}</div>`;
            }
        }

        async function handleBookingSubmit() {
            if (!bookingState.selectedField || !bookingState.selectedSlot) {
                window.showAlert('يجب اختيار الملعب والموعد أولاً.', 'warning');
                return;
            }

            const btn = document.getElementById('submitBookingBtn');
            btn.disabled = true;
            btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> جاري الحجز...`;

            const data = {
                field_id: bookingState.selectedField.field_id,
                booking_date: bookingState.selectedDate,
                start_time: bookingState.selectedSlot.start_time,
                end_time: bookingState.selectedSlot.end_time,
                duration_hours: bookingState.selectedSlot.duration_hours 
            };
            
            try {
                const result = await apiRequest('/api/booking/create', 'POST', data);

                if (result.deposit_required) {
                    window.showAlert('✅ تم تسجيل طلبك! سيتم توجيهك لصفحة الدفع لدفع العربون.', 'success');
                    // التوجيه لصفحة الدفع (payment.html)
                    window.location.href = result.payment_url; 
                } else {
                    window.showAlert(result.message, 'success');
                    // مسح الحالة والتحويل لصفحة حجوزاتي
                    bookingState.selectedField = null;
                    bookingState.selectedSlot = null;
                    loadView('my-bookings'); 
                }

            } catch (error) {
                window.showAlert(error.message || 'فشل الحجز. قد يكون الموعد غير متاح الآن.', 'error');
                btn.disabled = false;
                btn.innerHTML = bookingState.selectedField.deposit > 0 ? 'انتقل للدفع ودفع العربون' : 'أكد الحجز';
            }
        }
        
        function renderBookingView() {
            const mainContent = document.getElementById('mainContent');
            const field = bookingState.selectedField;
            const slot = bookingState.selectedSlot;
            
            // تهيئة الحاوية الداخلية
            mainContent.querySelector('.container-fluid').innerHTML = `
                <h2 class="mb-4">🏟️ حجز ملعب كرة قدم</h2>
                
                <div class="row mb-4">
                    <div class="col-md-4">
                        <label for="bookingDate" class="form-label">اختر تاريخ الحجز</label>
                        <input type="date" class="form-control" id="bookingDate" value="${bookingState.selectedDate}" min="${new Date().toISOString().split('T')[0]}">
                    </div>
                </div>
                
                <h4 class="mt-4">اختر الملعب:</h4>
                <div class="row" id="fieldsContainer">
                    <div class="text-center p-5"><i class="bi bi-arrow-clockwise spinner-border text-primary"></i> <p class="mt-2">جاري تحميل الملاعب...</p></div>
                </div>
                
                ${field ? `
                <h4 class="mt-4">📅 اختر الساعة ليوم ${new Date(bookingState.selectedDate).toLocaleDateString()} في ملعب ${field.name}:</h4>
                <div class="d-flex flex-wrap p-3 border rounded mb-4 bg-white" id="slotsContainer" style="min-height: 120px;">
                    <div class="text-center w-100 p-3"><i class="bi bi-arrow-clockwise spinner-border text-success"></i> <p class="mt-2">جاري تحميل المواعيد...</p></div>
                </div>
                
                <div class="card p-3 bg-light ${slot ? 'border-success' : 'border-warning'}">
                    ${slot ? `
                        <h5 class="card-title">ملخص الحجز</h5>
                        <p><strong>الملعب:</strong> ${field.name}</p>
                        <p><strong>الموعد:</strong> ${new Date(bookingState.selectedDate).toLocaleDateString()} من ${formatTimeDisplay(slot.start_time)} إلى ${formatTimeDisplay(slot.end_time)}</p>
                        <p><strong>التكلفة الإجمالية:</strong> ${field.price * slot.duration_hours} جنيه</p>
                        <p class="fw-bold ${field.deposit > 0 ? 'text-danger' : 'text-success'}">
                            العربون المطلوب: ${field.deposit > 0 ? field.deposit + ' جنيه' : 'صفر جنيه'}
                        </p>
                        <button class="btn btn-primary w-100 mt-3" id="submitBookingBtn">
                            ${field.deposit > 0 ? 'انتقل للدفع ودفع العربون' : 'أكد الحجز'}
                        </button>
                    ` : `
                        <h5 class="card-title text-warning">يرجى اختيار موعد</h5>
                        <p>اختر إحدى الساعات المتاحة أعلاه لتظهر تفاصيل الحجز هنا.</p>
                    `}
                </div>
                ` : ''}
            `;
            
            // ربط مستمعي الأحداث
            document.getElementById('bookingDate').addEventListener('change', (e) => {
                bookingState.selectedDate = e.target.value;
                bookingState.selectedSlot = null; // إعادة تعيين الساعة عند تغيير التاريخ
                renderBookingView(); 
            });

            // تحميل الساعات بعد تحميل الواجهة
            if(field) {
                loadSlots(); 
                if(slot) {
                    document.getElementById('submitBookingBtn').addEventListener('click', handleBookingSubmit);
                }
            }
            
            loadFields(); // تحميل الملاعب دائماً
        }
        
        // البدء في عرض واجهة الحجز
        renderBookingView(); 
        return ``; 
    },
    // ... (بقية دوال الواجهات الأخرى: my-bookings, team-requests, profile)
};

// ... (بقية ملف user.js)
