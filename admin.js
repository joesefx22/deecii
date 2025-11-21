// public/js/admin-dashboard.js
import { apiRequest } from './api.js';

let adminState = {
    users: [],
    stadiums: [],
    pendingManagers: [],
    stats: {},
    logs: []
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

function roleToArabic(role) {
    const roles = {
        'admin': 'أدمن',
        'owner': 'مالك ملعب',
        'employee': 'موظف',
        'player': 'لاعب'
    };
    return roles[role] || role;
}

// =============================================
// الدوال الرئيسية لجلب البيانات
// =============================================

async function verifyAdminAccess() {
    try {
        const user = await apiRequest("/api/me", 'GET');
        if (user.role !== "admin") {
            window.location.href = "/owner.html";
            return false;
        }
        document.getElementById('adminName').textContent = user.name || 'المشرف العام';
        return true;
    } catch (e) {
        window.location.href = "/login.html";
        return false;
    }
}

async function loadDashboardStats() {
    try {
        const stats = await apiRequest("/api/admin/dashboard", 'GET');
        adminState.stats = stats;
        document.getElementById('pendingCount').textContent = stats.pending_managers || 0;
    } catch (e) {
        window.showAlert("فشل في تحميل الإحصائيات العامة.", 'error');
        adminState.stats = {};
    }
}

async function loadAllStadiums() {
    try {
        const stadiums = await apiRequest("/api/admin/stadiums", 'GET');
        adminState.stadiums = stadiums;
    } catch (e) {
        window.showAlert("فشل في تحميل جميع الملاعب.", 'error');
        adminState.stadiums = [];
    }
}

async function loadUsers() {
    try {
        const users = await apiRequest("/api/admin/users", 'GET');
        adminState.users = users;
    } catch (e) {
        window.showAlert("فشل في تحميل المستخدمين.", 'error');
        adminState.users = [];
    }
}

async function loadPendingManagers() {
    try {
        const managers = await apiRequest("/api/admin/pending-managers", 'GET');
        adminState.pendingManagers = managers;
        document.getElementById('pendingCount').textContent = managers.length || 0;
    } catch (e) {
        window.showAlert("فشل في تحميل طلبات الموافقة.", 'error');
        adminState.pendingManagers = [];
    }
}

async function loadSystemLogs() {
    try {
        const logs = await apiRequest("/api/admin/activity-logs?limit=30", 'GET');
        adminState.logs = logs;
    } catch (e) {
        window.showAlert("فشل في تحميل سجل النشاط.", 'error');
        adminState.logs = [];
    }
}

// =============================================
// دوال إدارة الموافقات
// =============================================

window.openApprovalModal = function(userId, name, role) {
    document.getElementById('modalUserId').value = userId;
    document.getElementById('modalUserName').textContent = name;
    
    // إذا كان الدور ليس player، نعرض دوره الحالي
    const targetRoleSelect = document.getElementById('targetRoleSelect');
    if (role !== 'player') {
        document.getElementById('modalUserRole').textContent = roleToArabic(role);
        document.getElementById('roleSelectDiv').style.display = 'none';
        targetRoleSelect.value = role;
    } else {
        // إذا كان player ويريد الانضمام كـ owner/employee، نعطيه خيار التغيير
        document.getElementById('modalUserRole').textContent = 'غير محدد (يجب اختيار دور)';
        document.getElementById('roleSelectDiv').style.display = 'block';
        targetRoleSelect.value = 'owner'; // قيمة افتراضية
    }

    const modal = new bootstrap.Modal(document.getElementById('approvalModal'));
    modal.show();
}

async function handleApprovalConfirmation() {
    const userId = document.getElementById('modalUserId').value;
    const targetRole = document.getElementById('targetRoleSelect').value;
    
    try {
        await apiRequest(`/api/admin/users/${userId}/approve`, 'POST', { targetRole });
        window.showAlert(`✅ تمت الموافقة بنجاح، وتم تعيين دور: ${roleToArabic(targetRole)}.`, 'success');
        
        // إغلاق المودال وإعادة تحميل عرض الموافقات
        const modal = bootstrap.Modal.getInstance(document.getElementById('approvalModal'));
        modal.hide();
        loadView('pending-managers');
        loadDashboardStats(); // تحديث عداد الموافقات
    } catch (e) {
        window.showAlert(`فشل في عملية الموافقة: ${e.message}`, 'error');
    }
}

window.rejectUser = async function(userId, name) {
    if (!confirm(`هل أنت متأكد من رفض طلب المستخدم ${name}؟ سيتم إرجاع دوره إلى لاعب (Player).`)) return;
    
    try {
        await apiRequest(`/api/admin/users/${userId}/reject`, 'POST');
        window.showAlert(`❌ تم رفض طلب ${name} بنجاح.`, 'success');
        loadView('pending-managers');
        loadDashboardStats(); // تحديث عداد الموافقات
    } catch (e) {
        window.showAlert(`فشل في عملية الرفض: ${e.message}`, 'error');
    }
}


// =============================================
// دوال عرض الواجهات الفرعية (Views)
// =============================================

const views = {
    'dashboard': async () => {
        await loadDashboardStats();
        const stats = adminState.stats;
        
        document.getElementById('mainContent').innerHTML = `
            <h2 class="mb-4">📊 الإحصائيات العامة</h2>
            
            <div class="row">
                <div class="col-md-3 mb-4">
                    <div class="card stat-card primary p-3">
                        <i class="bi bi-people-fill fs-4 mb-2"></i>
                        <h5>إجمالي المستخدمين</h5>
                        <p class="fs-3 fw-bold" id="totalUsers">${stats.total_users || 0}</p>
                    </div>
                </div>
                <div class="col-md-3 mb-4">
                    <div class="card stat-card success p-3">
                        <i class="bi bi-building-fill-gear fs-4 mb-2"></i>
                        <h5>إجمالي الملاعب النشطة</h5>
                        <p class="fs-3 fw-bold" id="totalStadiums">${stats.total_stadiums || 0}</p>
                    </div>
                </div>
                <div class="col-md-3 mb-4">
                    <div class="card stat-card warning p-3">
                        <i class="bi bi-calendar-check fs-4 mb-2"></i>
                        <h5>إجمالي الحجوزات</h5>
                        <p class="fs-3 fw-bold" id="totalBookings">${stats.total_bookings || 0}</p>
                    </div>
                </div>
                <div class="col-md-3 mb-4">
                    <div class="card stat-card danger p-3">
                        <i class="bi bi-person-check fs-4 mb-2"></i>
                        <h5>طلبات الموافقة المعلقة</h5>
                        <p class="fs-3 fw-bold" id="pendingManagers">${stats.pending_managers || 0}</p>
                    </div>
                </div>
                <div class="col-md-6 mb-4">
                    <div class="card stat-card info p-3">
                        <i class="bi bi-cash-coin fs-4 mb-2"></i>
                        <h5>إجمالي الإيرادات (المحتسبة)</h5>
                        <p class="fs-3 fw-bold" id="totalRevenue">${(stats.total_revenue_gross || 0).toLocaleString()} ج.م</p>
                    </div>
                </div>
            </div>
            
            <h4 class="mt-4">التحليل البياني والتقارير (قيد التنفيذ...)</h4>
        `;
    },
    
    'stadiums': async () => {
        await loadAllStadiums();
        document.getElementById('mainContent').innerHTML = `
            <h2 class="mb-4">🏟️ إدارة الملاعب</h2>
            <div class="table-responsive">
                <table class="table table-hover table-striped">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>الاسم</th>
                            <th>الموقع</th>
                            <th>المسؤول</th>
                            <th>سعر/ساعة</th>
                            <th>الحالة</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${adminState.stadiums.map(s => `
                            <tr>
                                <td>${s.field_id.substring(0, 8)}</td>
                                <td>${escapeHtml(s.name)}</td>
                                <td>${escapeHtml(s.location)}</td>
                                <td>${escapeHtml(s.owner_name)}</td>
                                <td>${s.price_per_hour} ج.م</td>
                                <td><span class="badge bg-${s.is_active ? 'success' : 'danger'}">${s.is_active ? 'نشط' : 'معطل'}</span></td>
                                <td>
                                    <button class="btn btn-sm btn-info me-2"><i class="bi bi-pencil"></i> تعديل</button>
                                    <button class="btn btn-sm btn-danger"><i class="bi bi-power"></i> ${s.is_active ? 'تعطيل' : 'تفعيل'}</button>
                                </td>
                            </tr>
                        `).join('')}
                        ${adminState.stadiums.length === 0 ? '<tr><td colspan="7" class="text-center">لا توجد ملاعب مسجلة.</td></tr>' : ''}
                    </tbody>
                </table>
            </div>
            <p class="mt-3 text-info">ملاحظة: تحتاج هذه الواجهة APIs لإنشاء/تعديل الملاعب.</p>
        `;
    },

    'users': async () => {
        await loadUsers();
        document.getElementById('mainContent').innerHTML = `
            <h2 class="mb-4">👥 إدارة المستخدمين</h2>
            <div class="table-responsive">
                <table class="table table-hover table-striped">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>الاسم</th>
                            <th>البريد</th>
                            <th>الدور</th>
                            <th>الهاتف</th>
                            <th>الموافقة</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${adminState.users.map(u => `
                            <tr>
                                <td>${u.user_id.substring(0, 8)}</td>
                                <td>${escapeHtml(u.name)}</td>
                                <td>${escapeHtml(u.email)}</td>
                                <td><span class="badge bg-primary">${roleToArabic(u.role)}</span></td>
                                <td>${escapeHtml(u.phone || 'N/A')}</td>
                                <td><span class="badge bg-${u.is_approved ? 'success' : 'warning'}">${u.is_approved ? 'موافق عليه' : 'معلق'}</span></td>
                                <td>
                                    <button class="btn btn-sm btn-info me-2"><i class="bi bi-pencil"></i> تعديل دور</button>
                                    <button class="btn btn-sm btn-danger"><i class="bi bi-power"></i> تعطيل</button>
                                </td>
                            </tr>
                        `).join('')}
                        ${adminState.users.length === 0 ? '<tr><td colspan="7" class="text-center">لا يوجد مستخدمون مسجلون.</td></tr>' : ''}
                    </tbody>
                </table>
            </div>
            <p class="mt-3 text-info">ملاحظة: تحتاج هذه الواجهة APIs لتعطيل الحسابات وتغيير الأدوار.</p>
        `;
    },
    
    'pending-managers': async () => {
        await loadPendingManagers();
        document.getElementById('mainContent').innerHTML = `
            <h2 class="mb-4">📝 طلبات الموافقة المعلقة</h2>
            <div class="table-responsive">
                <table class="table table-hover table-striped">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>الاسم</th>
                            <th>البريد</th>
                            <th>الدور المطلوب</th>
                            <th>تاريخ الطلب</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${adminState.pendingManagers.map(m => `
                            <tr>
                                <td>${m.user_id.substring(0, 8)}</td>
                                <td>${escapeHtml(m.name)}</td>
                                <td>${escapeHtml(m.email)}</td>
                                <td><span class="badge bg-warning">${roleToArabic(m.role)}</span></td>
                                <td>${new Date(m.created_at).toLocaleDateString('ar-EG')}</td>
                                <td>
                                    <button class="btn btn-sm btn-success me-2" onclick="window.openApprovalModal('${m.user_id}', '${escapeHtml(m.name)}', '${m.role}')">موافقة</button>
                                    <button class="btn btn-sm btn-danger" onclick="window.rejectUser('${m.user_id}', '${escapeHtml(m.name)}')">رفض</button>
                                </td>
                            </tr>
                        `).join('')}
                        ${adminState.pendingManagers.length === 0 ? '<tr><td colspan="6" class="text-center">لا توجد طلبات موافقة معلقة.</td></tr>' : ''}
                    </tbody>
                </table>
            </div>
        `;
    },

    'logs': async () => {
        await loadSystemLogs();
        document.getElementById('mainContent').innerHTML = `
            <h2 class="mb-4">🧾 سجل الأنشطة</h2>
            <div class="table-responsive">
                <table class="table table-hover table-striped small">
                    <thead>
                        <tr>
                            <th>التاريخ</th>
                            <th>اسم المستخدم</th>
                            <th>الدور</th>
                            <th>الحدث</th>
                            <th>الوصف</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${adminState.logs.map(l => `
                            <tr>
                                <td>${new Date(l.created_at).toLocaleString('ar-EG')}</td>
                                <td>${escapeHtml(l.user_name || 'System')}</td>
                                <td>${escapeHtml(roleToArabic(l.user_role) || 'N/A')}</td>
                                <td><span class="badge bg-secondary">${escapeHtml(l.action)}</span></td>
                                <td>${escapeHtml(l.description)}</td>
                            </tr>
                        `).join('')}
                        ${adminState.logs.length === 0 ? '<tr><td colspan="5" class="text-center">لا توجد سجلات أنشطة.</td></tr>' : ''}
                    </tbody>
                </table>
            </div>
        `;
    }
};

// =============================================
// التهيئة النهائية
// =============================================

async function initAdminPanel() {
    const hasAccess = await verifyAdminAccess();
    if (!hasAccess) return;

    await Promise.all([
        loadDashboardStats(),
        loadAllStadiums(),
        loadUsers(),
        loadPendingManagers(),
        loadSystemLogs()
    ]);
    
    // ربط الأحداث
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

    // ربط زر تأكيد الموافقة بالمودال
    document.getElementById('confirmApproveBtn').addEventListener('click', handleApprovalConfirmation);

    // تحميل الواجهة الافتراضية
    loadView('dashboard');
}

document.addEventListener("DOMContentLoaded", initAdminPanel);
