// public/js/payment.js
import { apiRequest } from './api.js';

// دالة مساعدة: جلب معلمات URL (مثل booking_id)
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        bookingId: params.get('booking_id'),
        token: params.get('token')
    };
}

// دالة مساعدة: عرض تفاصيل الحجز على الواجهة
function displayBookingDetails(details) {
    document.getElementById('field-name').textContent = details.field_name;
    document.getElementById('booking-date').textContent = new Date(details.booking_date).toLocaleDateString();
    document.getElementById('booking-time').textContent = `${details.start_time} - ${details.end_time}`;
    document.getElementById('total-amount').textContent = `${details.total_amount} جنيه`;
    document.getElementById('deposit-amount').textContent = `${details.deposit_amount} جنيه`;
    
    // حساب المبلغ المتبقي
    const remaining = details.total_amount - details.deposit_amount;
    document.getElementById('remaining-amount').textContent = `${remaining} جنيه`;
    
    document.getElementById('payment-info').style.display = 'block';
}

// دالة التعامل مع محاكاة تأكيد الدفع
async function handleConfirmPayment(bookingId) {
    const btn = document.getElementById('confirmPaymentBtn');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> جاري تأكيد الدفع...`;

    try {
        // محاكاة الحصول على مرجع دفع ناجح من بوابة الدفع
        const mockPaymentRef = `PAYREF-MOCK-${Date.now()}`; 

        // إرسال طلب التأكيد للـ Backend
        const result = await apiRequest('/api/booking/confirm-payment', 'POST', {
            bookingId: bookingId,
            paymentRef: mockPaymentRef
        });

        window.showAlert(result.message, 'success');
        
        // التوجيه لصفحة الحجوزات بعد 3 ثوانٍ
        setTimeout(() => {
            window.location.href = '/user.html?view=my-bookings';
        }, 3000);


    } catch (error) {
        window.showAlert(error.message, 'error');
        btn.disabled = false;
        btn.innerHTML = 'تأكيد الدفع (محاكاة نجاح)';
    }
}


async function loadBookingInfo() {
    const { bookingId } = getUrlParams();
    
    if (!bookingId) {
        window.showAlert('❌ خطأ: لم يتم تحديد رقم الحجز.', 'error');
        document.getElementById('loading').style.display = 'none';
        return;
    }
    
    try {
        // 1. جلب تفاصيل الحجز من الـ API المحمي
        const details = await apiRequest(`/api/booking/${bookingId}/details`, 'GET');

        if (details.status === 'booked_confirmed') {
             window.showAlert('✅ هذا الحجز مؤكد بالفعل. سيتم توجيهك الآن.', 'info');
             setTimeout(() => {
                 window.location.href = '/user.html?view=my-bookings';
             }, 2000);
             return;
        }

        displayBookingDetails(details);
        
        // 2. ربط زر الدفع بالمنطق
        document.getElementById('confirmPaymentBtn').addEventListener('click', () => {
            handleConfirmPayment(bookingId);
        });

    } catch (error) {
        window.showAlert(error.message || 'فشل في جلب تفاصيل الحجز.', 'error');
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

// دالة مساعدة: عرض التنبيهات في واجهة الدفع
window.showAlert = function(message, type = 'info') {
    const alertBox = document.getElementById('alertMessage');
    alertBox.textContent = message;
    alertBox.className = `alert alert-${type}`;
    alertBox.style.display = 'block';
    setTimeout(() => { alertBox.style.display = 'none'; }, 5000);
}

// =============================================
// تهيئة الصفحة
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    // التحقق الأساسي من المصادقة
    if (!localStorage.getItem('token') || localStorage.getItem('role') !== 'player') {
         // توجيه لصفحة تسجيل الدخول إذا لم يكن مصرحاً له
         window.location.href = '/auth.html';
         return;
    }
    
    loadBookingInfo();
});
