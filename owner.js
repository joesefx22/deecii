// public/js/owner-dashboard.js
import { apiRequest } from './api.js';

let ownerState = {
    stadiums: [],
    stats: {},
    bookings: []
};

// =============================================
// دوال مساعدة
// =============================================

window.showAlert = function(message, type = 'info') {
    const alertBox = document.getElementById('alertMessage');
    alertBox.textContent = message;
    alertBox.className = `alert alert-${type}`;
    alertBox.style.display = 'block';
    setTimeout(() => { alertBox.style.display = 'none'; }, 5000);
}

function loadView(viewName) {
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    const activeLink = document.querySelector(`.sidebar .nav-link[data-view="${viewName}"]`);
    if (activeLink) activeLink.classList.add('active');

    if (views[viewName]) {
        views[viewName]();
    } else {
        document.getElementById('mainContent').innerHTML = `<h2 class="text-danger">الصفحة قيد الإنشاء: ${viewName}</h2>`;
    }
}

function escapeHtml(str) {
    if (str === undefined || str === null) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function formatTimeDisplay(time) {
    if (!time) return 'N/A';
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const suffix = hour >= 12 && hour !== 24 ? 'م' : 'ص';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour}:${m} ${suffix}`;
}

// =============================================
// الدوال الرئيسية لجلب البيانات
// =============================================

async function verifyOwnerAccess() {
    try {
        const user = await apiRequest("/api/me", 'GET');
        if (user.role !== "owner") {
            window.location.href = "/employee.html"; // توجيه للموظف إذا كان دوره كذلك
            return false;
        }
        document.getElementById('ownerName').textContent = user.name || 'مالك الملعب';
        localStorage.setItem('userProfile', JSON.stringify(user));
        return true;
    } catch (e) {
        window.location.href = "/login.html";
        return false;
    }
}

async function loadOwnerStadiums() {
    try {
        const stadiums = await apiRequest("/api/owner/stadiums", 'GET');
        ownerState.stadiums = stadiums;
    } catch (e) {
        window.showAlert("فشل في تحميل الملاعب الخاصة بك.", 'error');
        ownerState.stadiums = [];
    }
}

async function loadOwnerDashboardStats() {
    try {
        const stats = await apiRequest("/api/owner/dashboard", 'GET');
        ownerState.stats = stats;
    } catch (e) {
        window.showAlert("فشل في تحميل إحصائيات لوحة التحكم.", 'error');
        ownerState.stats = {};
    }
}

async function loadOwnerBookings(filters = {}) {
    const params = new URLSearchParams();
    if (filters.fieldId) params.append('fieldId', filters.fieldId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.status) params.append('status', filters.status);

    try {
        const bookings = await apiRequest(`/api/owner/bookings?${params.toString()}`, 'GET');
        ownerState.bookings = bookings;
        return bookings;
    } catch (e) {
        window.showAlert("فشل في تحميل الحجوزات.", 'error');
        ownerState.bookings = [];
        return [];
    }
}

// =============================================
// دوال إدارة الحجوزات (Actions)
// =============================================

async function handleConfirmBooking(id) {
    if (!confirm('هل أنت متأكد من تأكيد هذا الحجز واستلام المبلغ النقدي؟')) return;
    try {
        await apiRequest(`/api/owner/bookings/${id}/confirm`, 'POST');
        window.showAlert('✅ تم تأكيد الحجز بنجاح.', 'success');
        views['bookings'](); // إعادة تحميل العرض
    } catch (e) {
        window.showAlert(`فشل في تأكيد الحجز: ${e.message}`, 'error');
    }
}

async function handleCancelBooking(id) {
    if (!confirm('هل أنت متأكد من إلغاء هذا الحجز؟ (يجب مراجعة اللاعبين في حالة الدفع المسبق)')) return;
    try {
        await apiRequest(`/api/owner/bookings/${id}/cancel`, 'POST');
        window.showAlert('❌ تم إلغاء الحجز بنجاح.', 'success');
        views['bookings'](); // إعادة تحميل العرض
    } catch (e) {
        window.showAlert(`فشل في إلغاء الحجز: ${e.message}`, 'error');
    }
}

// =============================================
// دوال عرض الواجهات الفرعية (Views)
// =============================================

const views = {
    'dashboard': async () => {
        await loadOwnerDashboardStats(); // تحديث الإحصائيات
        const stats = ownerState.stats;
        
        document.getElementById('mainContent').innerHTML = `
            <h2 class="mb-4">📊 الإحصائيات الرئيسية</h2>
            
            <div class="row">
                <div class="col-md-3 mb-4">
                    <div class="card stat-card primary p-3">
                        <i class="bi bi-geo-alt-fill fs-4 mb-2"></i>
                        <h5>إجمالي الملاعب</h5>
                        <p class="fs-3 fw-bold">${stats.total_fields || 0}</p>
                    </div>
                </div>
                <div class="col-md-3 mb-4">
                    <div class="card stat-card success p-3">
                        <i class="bi bi-cash-coin fs-4 mb-2"></i>
                        <h5>إجمالي الإيرادات (تم اللعب)</h5>
                        <p class="fs-3 fw-bold">${(stats.total_revenue_gross || 0).toLocaleString()} ج.م</p>
                    </div>
                </div>
                <div class="col-md-3 mb-4">
                    <div class="card stat-card warning p-3">
                        <i class="bi bi-clock-history fs-4 mb-2"></i>
                        <h5>حجوزات نقدية معلقة</h5>
                        <p class="fs-3 fw-bold">${stats.pending_cash_bookings || 0}</p>
                    </div>
                </div>
                <div class="col-md-3 mb-4">
                    <div class="card stat-card info p-3">
                        <i class="bi bi-calendar-check fs-4 mb-2"></i>
                        <h5>قيمة الحجوزات القادمة</h5>
                        <p class="fs-3 fw-bold">${(stats.upcoming_bookings_value || 0).toLocaleString()} ج.م</p>
                    </div>
                </div>
            </div>
            
            <h4 class="mt-4">التحليل البياني (قيد التنفيذ...)</h4>
            <div class="card p-4">
                <p>هنا سيتم عرض الرسوم البيانية لإحصائيات الحجز والإيرادات.</p>
            </div>
        `;
    },
    
    'bookings': async () => {
        const mainContent = document.getElementById('mainContent');
        
        mainContent.innerHTML = `
            <h2 class="mb-4">🗓️ إدارة الحجوزات</h2>
            <div class="card p-3 mb-4">
                <div class="row g-3">
                    <div class="col-md-4">
                        <label class="form-label">الملعب</label>
                        <select id="bookingFilterField" class="form-select">
                            <option value="">كل الملاعب</option>
                            ${ownerState.stadiums.map(s => `<option value="${s.field_id}">${escapeHtml(s.name)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">حالة الحجز</label>
                        <select id="bookingFilterStatus" class="form-select">
                            <option value="">كل الحالات</option>
                            <option value="booked_unconfirmed">معلق نقدي (عربون = 0)</option>
                            <option value="booked_confirmed">مؤكد</option>
                            <option value="played">تم اللعب</option>
                            <option value="missed">لم يحضر/ملغي</option>
                        </select>
                    </div>
                    <div class="col-md-4 d-flex align-items-end">
                        <button id="applyFiltersBtn" class="btn btn-primary w-100"><i class="bi bi-search me-2"></i> بحث</button>
                    </div>
                </div>
            </div>
            
            <div class="table-responsive">
                <table class="table table-hover table-striped">
                    <thead>
                        <tr>
                            <th>الحجز #</th>
                            <th>الملعب</th>
                            <th>التاريخ</th>
                            <th>الوقت</th>
                            <th>اللاعب</th>
                            <th>المبلغ</th>
                            <th>العربون مدفوع</th>
                            <th>الحالة</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody id="bookingsTableBody">
                        </tbody>
                </table>
            </div>
        `;
        
        // ربط الأحداث
        document.getElementById('applyFiltersBtn').addEventListener('click', () => {
            const filters = {
                fieldId: document.getElementById('bookingFilterField').value,
                status: document.getElementById('bookingFilterStatus').value,
            };
            renderBookingsTable(filters);
        });

        // التحميل الأولي
        renderBookingsTable({});
    },
    
    'stadiums': async () => {
        document.getElementById('mainContent').innerHTML = `
            <h2 class="mb-4">🏟️ إدارة الملاعب</h2>
            <div class="row">
                <div class="col-12 text-end mb-3">
                    <button class="btn btn-success" data-bs-toggle="modal" data-bs-target="#addStadiumModal">
                        <i class="bi bi-plus-circle me-2"></i> إضافة ملعب جديد
                    </button>
                </div>
            </div>
            <div class="row" id="stadiumsContainer">
                ${ownerState.stadiums.map(s => `
                    <div class="col-md-4 mb-3">
                        <div class="card p-3 h-100">
                            <h5>${escapeHtml(s.name)}</h5>
                            <p class="small text-muted">${escapeHtml(s.location)}</p>
                            <hr>
                            <p><strong>سعر الساعة:</strong> ${s.price_per_hour} ج.م</p>
                            <p><strong>العربون:</strong> ${s.deposit_amount} ج.م</p>
                            <div class="mt-2">
                                <button class="btn btn-sm btn-info me-2"><i class="bi bi-pencil"></i> تعديل</button>
                                <button class="btn btn-sm btn-warning"><i class="bi bi-clock"></i> إدارة الساعات</button>
                            </div>
                        </div>
                    </div>
                `).join('')}
                ${ownerState.stadiums.length === 0 ? '<div class="alert alert-warning">لم يتم إضافة ملاعب بعد.</div>' : ''}
            </div>
            
            <div class="modal fade" id="addStadiumModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">إضافة/تعديل ملعب</h5>
                        </div>
                        <div class="modal-body">
                            <p>هذه الواجهة تحتاج إلى ربط APIs لـ CRUD الملاعب (قيد التنفيذ).</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    'employees': () => {
        document.getElementById('mainContent').innerHTML = `
            <h2 class="mb-4">👥 الموظفين والمسؤولين</h2>
             <div class="alert alert-info">هذه الواجهة مخصصة لإدارة الموظفين المعينين لملاعبك (إضافة/حذف، تغيير الصلاحيات). (قيد التنفيذ...)</div>
        `;
    }
};

async function renderBookingsTable(filters) {
    const tbody = document.getElementById("bookingsTableBody");
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="9" class="text-center"><i class="bi bi-arrow-clockwise spinner-border"></i> جاري التحميل...</td></tr>';
    
    const bookings = await loadOwnerBookings(filters);
    
    if (bookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">لا توجد حجوزات مطابقة للمعايير.</td></tr>';
        return;
    }

    tbody.innerHTML = bookings.map(b => {
        let actions = '';
        if (b.status === 'booked_unconfirmed' && b.deposit_amount === 0) {
             // حجز نقدي ينتظر التأكيد (أقل من 24 ساعة)
            actions = `
                <button class="btn btn-sm btn-success me-2" onclick="window.handleConfirmBooking('${b.id}')">تأكيد نقدي</button>
                <button class="btn btn-sm btn-danger" onclick="window.handleCancelBooking('${b.id}')">إلغاء</button>
            `;
        } else if (b.status === 'booked_confirmed') {
            // حجز مؤكد (تم دفع العربون أو تم تأكيده يدوياً)
            actions = `
                <button class="btn btn-sm btn-info me-2" onclick="window.showAlert('وظيفة تسجيل الحضور متاحة للموظف', 'info')">Check-in</button>
                <button class="btn btn-sm btn-danger" onclick="window.handleCancelBooking('${b.id}')">إلغاء/لم يحضر</button>
            `;
        } else if (b.status === 'missed' || b.status === 'played') {
            actions = `<span class="badge bg-secondary">${b.status === 'played' ? 'تم اللعب' : 'ملغي'}</span>`;
        }
        
        const statusBadge = `<span class="badge ${
            b.status === 'booked_confirmed' ? 'bg-success' : 
            b.status === 'booked_unconfirmed' ? 'bg-warning' : 
            b.status === 'played' ? 'bg-info' : 'bg-danger'
        }">${b.status}</span>`;
        
        return `
            <tr>
                <td>${b.id.substring(0, 8)}</td>
                <td>${escapeHtml(b.pitch_name)}</td>
                <td>${escapeHtml(b.booking_date)}</td>
                <td>${formatTimeDisplay(b.start_time)} - ${formatTimeDisplay(b.end_time)}</td>
                <td>${escapeHtml(b.player_name)}</td>
                <td>${b.total_amount} ج.م</td>
                <td>${b.deposit_paid ? '<span class="badge bg-success">نعم</span>' : '<span class="badge bg-danger">لا</span>'}</td>
                <td>${statusBadge}</td>
                <td>${actions}</td>
            </tr>
        `;
    }).join('');

    // إتاحة الدوال في النطاق العام للـ onclick
    window.handleConfirmBooking = handleConfirmBooking;
    window.handleCancelBooking = handleCancelBooking;
}


// =============================================
// التهيئة النهائية
// =============================================

async function initOwnerPanel() {
    const hasAccess = await verifyOwnerAccess();
    if (!hasAccess) return;

    await Promise.all([
        loadOwnerStadiums(),
        loadOwnerDashboardStats()
    ]);
    
    // ربط مستمعي الأحداث
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            loadView(e.currentTarget.getAttribute('data-view'));
        });
    });
    
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
         e.preventDefault();
         localStorage.clear();
         window.location.href = '/login.html';
    });

    // تحميل الواجهة الافتراضية
    loadView('dashboard');
}

document.addEventListener("DOMContentLoaded", initOwnerPanel);

// public/js/owner-dashboard.js (الإضافات)

// ... (تأكد من وجود استيراد apiRequest و showAlert و loadView) ...
// ... (تأكد من وجود verifyOwnerAccess و loadOwnerBookings و loadOwnerStadiums) ...
// ... (أضف دالة escapeHtml مساعدة إذا لم تكن موجودة) ...

// ===================================
// ⚽ إنشاء / تعديل ملعب جديد
// ===================================

async function handleFieldFormSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const fieldId = form.dataset.fieldId;
    const isNew = !fieldId;

    const data = {
        name: form.querySelector('#fieldName').value,
        location: form.querySelector('#fieldLocation').value,
        price_per_hour: form.querySelector('#fieldPrice').value,
        deposit_amount: form.querySelector('#fieldDeposit').value,
        features: Array.from(form.querySelectorAll('#fieldFeatures input:checked')).map(cb => cb.value)
        // عند الإنشاء، owner_id هو userId تلقائياً من الـ backend
    };

    try {
        let response;
        if (isNew) {
            // POST لإنشاء ملعب جديد
            response = await apiRequest("/api/fields", 'POST', data);
        } else {
            // PUT لتعديل ملعب موجود
            response = await apiRequest(`/api/fields/${fieldId}`, 'PUT', data);
        }
        
        window.showAlert(response.message, 'success');
        
        // إغلاق المودال
        const modal = bootstrap.Modal.getInstance(document.getElementById('fieldModal'));
        if (modal) modal.hide();
        
        // إعادة تحميل قائمة الملاعب
        loadView('stadiums');
    } catch (error) {
        window.showAlert(`فشل في ${isNew ? 'إنشاء' : 'تعديل'} الملعب: ${error.message}`, 'error');
    }
}

// دالة لفتح مودال الإضافة/التعديل
window.openFieldModal = function(field = null) {
    const modal = new bootstrap.Modal(document.getElementById('fieldModal'));
    const form = document.getElementById('fieldForm');
    
    form.reset();
    form.dataset.fieldId = '';
    document.getElementById('fieldModalLabel').textContent = 'إضافة ملعب جديد';
    
    if (field) {
        document.getElementById('fieldModalLabel').textContent = 'تعديل ملعب: ' + escapeHtml(field.name);
        form.dataset.fieldId = field.field_id;
        
        form.querySelector('#fieldName').value = field.name;
        form.querySelector('#fieldLocation').value = field.location;
        form.querySelector('#fieldPrice').value = field.price_per_hour;
        form.querySelector('#fieldDeposit').value = field.deposit_amount;
        
        // تحديد الميزات (Features)
        (field.features || []).forEach(feature => {
            const checkbox = form.querySelector(`#fieldFeatures input[value="${feature}"]`);
            if (checkbox) checkbox.checked = true;
        });
    }

    form.removeEventListener('submit', handleFieldFormSubmit);
    form.addEventListener('submit', handleFieldFormSubmit);
    modal.show();
}

// ===================================
// ❌ تعطيل / تفعيل ملعب
// ===================================

window.toggleFieldStatus = async function(fieldId, fieldName, isActive) {
    const action = isActive ? 'تعطيل' : 'تفعيل';
    const endpoint = isActive ? `/api/fields/${fieldId}` : `/api/fields/${fieldId}/activate`;
    const method = isActive ? 'DELETE' : 'POST';

    if (!confirm(`هل أنت متأكد من ${action} الملعب "${fieldName}"؟`)) return;

    try {
        const response = await apiRequest(endpoint, method);
        window.showAlert(response.message, 'success');
        loadView('stadiums'); // إعادة تحميل قائمة الملاعب
    } catch (error) {
        window.showAlert(`فشل في ${action} الملعب: ${error.message}`, 'error');
    }
}

// ===================================
// 🏟️ واجهة الملاعب الخاصة بالمالك
// ===================================

const ownerViews = {
    // ... (Views الأخرى مثل dashboard)
    
    'stadiums': async () => {
        const stadiums = await loadOwnerStadiums(); // دالة loadOwnerStadiums يجب أن تكون موجودة
        document.getElementById('mainContent').innerHTML = `
            <h2 class="mb-4">🏟️ إدارة الملاعب الخاصة بي</h2>
            <button class="btn btn-success mb-3" onclick="openFieldModal()">
                <i class="bi bi-plus-circle me-2"></i> إضافة ملعب جديد
            </button>
            <div id="stadiumsList" class="row">
                ${stadiums.map(s => `
                    <div class="col-md-6 mb-4">
                        <div class="card manager-pitch-card h-100">
                            <div class="card-body">
                                <h5 class="card-title">${escapeHtml(s.name)}</h5>
                                <p class="card-text small text-muted">${escapeHtml(s.location)}</p>
                                <hr>
                                <p><strong>سعر الساعة:</strong> ${s.price_per_hour} ج.م</p>
                                <p><strong>مبلغ العربون:</strong> ${s.deposit_amount} ج.م</p>
                                <p><strong>الحالة:</strong> 
                                    <span class="badge bg-${s.is_active ? 'success' : 'danger'}">${s.is_active ? 'نشط' : 'معطل'}</span>
                                </p>
                                <div class="mt-3">
                                    <button class="btn btn-sm btn-info me-2" onclick="openFieldModal(${JSON.stringify(s).replace(/"/g, '&quot;')})">
                                        <i class="bi bi-pencil"></i> تعديل
                                    </button>
                                    <button class="btn btn-sm btn-${s.is_active ? 'danger' : 'success'}" 
                                            onclick="toggleFieldStatus('${s.field_id}', '${escapeHtml(s.name)}', ${s.is_active})">
                                        <i class="bi bi-${s.is_active ? 'power' : 'check-circle'}"></i> ${s.is_active ? 'تعطيل' : 'تفعيل'}
                                    </button>
                                    <button class="btn btn-sm btn-secondary mt-2" onclick="loadView('schedule?fieldId=${s.field_id}')">
                                        <i class="bi bi-calendar"></i> إدارة الحجوزات
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
                ${stadiums.length === 0 ? '<p class="p-4 text-center">لم تقم بإضافة أي ملاعب بعد. ابدأ الآن!</p>' : ''}
            </div>
        `;
    },
    // ... (بقية Views)
};

// ... (تأكد من أن loadView تستخدم ownerViews) ...
