// ================= 1. إعدادات وتوصيل Firebase السحابي المباشر =================
const firebaseConfig = {
    apiKey: "YOUR_API_KEY", // ضع الـ API Key الخاص بك هنا إذا أردت
    authDomain: "customs-workshop-default-rtdb.firebaseapp.com",
    databaseURL: "https://customs-workshop-default-rtdb.firebaseio.com", // رابط قاعدتك الصحيح من الصورة
    projectId: "customs-workshop-default-rtdb",
    storageBucket: "customs-workshop-default-rtdb.appspot.com",
};

// بدء تشغيل الخدمة السحابية في الموقع
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// مصفوفات الاحتفاظ بالبيانات سحابياً
let products = [];
let staff = [];
let ratings = [];
let applications = [];
let tuningOrders = [];

// مجموعة الاحتفاظ بالقطع المحددة داخل الحاسبة التفاعلية
let selectedItemsForCalc = new Set();
const ADMIN_PASSWORD = "123"; 
let isAdminLoggedIn = false;

// متغيرات للتحكم في أسطر الجداول المفتوحة للتعديل المباشر Inline
let editingProductKey = null;
let editingStaffKey = null;

// [1] مزامنة المنتجات والقطع سحابياً
database.ref('products').on('value', (snapshot) => {
    const data = snapshot.val();
    products = [];
    if (data) {
        Object.keys(data).forEach(key => {
            products.push({ fbKey: key, ...data[key] });
        });
    }
    renderPricesCards(); // رندرة كروت الأسعار للزبائن
    renderAdminProductsTable(); // رندرة جدول الإدارة المباشر
});

// [2] مزامنة الموظفين سحابياً
database.ref('staff').on('value', (snapshot) => {
    const data = snapshot.val();
    console.log("البيانات القادمة من Firebase:", data); // أضف هذا السطر للتشخيص
    staff = data ? Object.keys(data).map(key => ({ fbKey: key, ...data[key] })) : [];
    renderVisitorStaffTable(); 
    renderAdminStaffTable(); 
    updateStaffDropdown(); 
});

// [3] مزامنة التقييمات سحابياً
database.ref('ratings').on('value', (snapshot) => {
    const data = snapshot.val();
    ratings = [];
    if (data) {
        Object.keys(data).forEach(key => {
            ratings.push({ fbKey: key, ...data[key] });
        });
    }
    renderAdminRatingsTable();
});

// [4] مزامنة طلبات التوظيف سحابياً
database.ref('applications').on('value', (snapshot) => {
    const data = snapshot.val();
    applications = [];
    if (data) {
        Object.keys(data).forEach(key => {
            applications.push({ fbKey: key, ...data[key] });
        });
    }
    renderAdminApplicationsTable();
});

// [5] مزامنة طلبات التعديل المرسلة من الزبائن للورشة
database.ref('tuningOrders').on('value', (snapshot) => {
    const data = snapshot.val();
    tuningOrders = [];
    if (data) {
        Object.keys(data).forEach(key => {
            tuningOrders.push({ fbKey: key, ...data[key] });
        });
    }
    renderAdminOrdersTable();
});

// ================= 2. نظام شاشة الترحيب المؤقتة والصفحات =================
window.addEventListener('DOMContentLoaded', () => {
    // 1. التبديل للصفحة الرئيسية بعد 2.2 ثانية
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.classList.add('fade-out');
            // إخفاء الـ Splash تماماً بعد تلاشيه
            setTimeout(() => { splash.style.display = 'none'; }, 500);
        }
        switchPage('welcome-page');
    }, 2200);
});

function switchPage(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.classList.remove('active');
        page.style.display = 'none';
    });

    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        if (pageId === 'welcome-page') {
            targetPage.style.display = 'flex';
        } else {
            targetPage.style.display = 'block';
        }
    }
}
// دالة التحويل بين الأقسام الفرعية داخل لوحة التحكم Admin
function switchAdminTab(targetTab) {
    // 1. إخفاء كافة الأقسام أولاً
    document.getElementById('sub-section-products').style.display = 'none';
    document.getElementById('sub-section-staff').style.display = 'none';
    document.getElementById('sub-section-orders').style.display = 'none';

    // 2. تصفير كلاسات الأزرار النشطة تماماً
    const pBtn = document.getElementById('tab-btn-products');
    const sBtn = document.getElementById('tab-btn-staff');
    const oBtn = document.getElementById('tab-btn-orders');
    
    pBtn.classList.remove('active-products');
    sBtn.classList.remove('active-staff');
    oBtn.classList.remove('active-orders');

    // 3. إظهار القسم المطلوب وتفعيل زره باللون المخصص الفخم الخاص به
    if (targetTab === 'products') {
        document.getElementById('sub-section-products').style.display = 'block';
        pBtn.classList.add('active-products');
    } else if (targetTab === 'staff') {
        document.getElementById('sub-section-staff').style.display = 'block';
        sBtn.classList.add('active-staff');
    } else if (targetTab === 'orders') {
        document.getElementById('sub-section-orders').style.display = 'block';
        oBtn.classList.add('active-orders');
    }
}

// ================= 3. رندرة قائمة كروت الأسعار للزبائن (الأقسام الثلاثة بدون إيموجي) =================
function renderPricesCards() {
    const specialContainer = document.getElementById('special-cards-container');
    const perfContainer = document.getElementById('perf-cards-container');
    const cosmContainer = document.getElementById('cosm-cards-container');
    
    if (!specialContainer || !perfContainer || !cosmContainer) return;
    
    specialContainer.innerHTML = '';
    perfContainer.innerHTML = '';
    cosmContainer.innerHTML = '';

    let hasSpecial = false, hasPerf = false, hasCosm = false;

    products.forEach(p => {
        const isChecked = selectedItemsForCalc.has(p.fbKey) ? 'checked' : '';
        const activeClass = selectedItemsForCalc.has(p.fbKey) ? 'selected-card' : '';
        const pDescHTML = p.description ? `<div class="card-desc-text">${p.description}</div>` : '';

        let priceSectionHTML = '';
        if (p.category === 'special') {
            priceSectionHTML = `
                <div class="card-prices-wrapper">
                    <div class="card-price-box" style="border: 1px solid #ff9f43;">
                        <span class="p-title" style="color:#ff9f43">سعر موحد للجميع</span>
                        <span class="p-amount" style="color:#fff">${Number(p.civilian).toLocaleString()}</span>
                    </div>
                </div>
            `;
        } else {
            priceSectionHTML = `
                <div class="card-prices-wrapper">
                    <div class="card-price-box military-box">
                        <span class="p-title">العسكري</span>
                        <span class="p-amount">${Number(p.military).toLocaleString()}</span>
                    </div>
                    <div class="card-price-box civilian-box">
                        <span class="p-title">المواطن</span>
                        <span class="p-amount">${Number(p.civilian).toLocaleString()}</span>
                    </div>
                </div>
            `;
        }

        const cardHTML = `
            <div class="tuning-card ${activeClass}" id="card-${p.fbKey}">
                <div class="card-main-info">
                    <label class="calc-checkbox-container">
                        <input type="checkbox" ${isChecked} onchange="toggleItemInCalculator('${p.fbKey}')">
                        <span class="checkmark"></span>
                    </label>
                    <span class="card-name">${p.name}</span>
                </div>
                ${pDescHTML}
                ${priceSectionHTML}
            </div>
        `;

        if (p.category === 'special') {
            specialContainer.innerHTML += cardHTML;
            hasSpecial = true;
        } else if (p.category === 'performance') {
            perfContainer.innerHTML += cardHTML;
            hasPerf = true;
        } else if (p.category === 'cosmetic') {
            cosmContainer.innerHTML += cardHTML;
            hasCosm = true;
        }
    });

    if (!hasSpecial) specialContainer.innerHTML = `<div class="empty-msg">لا توجد باقات خاصة متوفرة حالياً</div>`;
    if (!hasPerf) perfContainer.innerHTML = `<div class="empty-msg">لا توجد قطع أداء متوفرة سحابياً</div>`;
    if (!hasCosm) cosmContainer.innerHTML = `<div class="empty-msg">لا توجد قطع تجميلية متوفرة سحابياً</div>`;
    
    calculateLiveTotals();
}

function toggleItemInCalculator(fbKey) {
    const card = document.getElementById(`card-${fbKey}`);
    if (selectedItemsForCalc.has(fbKey)) {
        selectedItemsForCalc.delete(fbKey);
        if (card) card.classList.remove('selected-card');
    } else {
        selectedItemsForCalc.add(fbKey);
        if (card) card.classList.add('selected-card');
    }
    calculateLiveTotals();
}

function calculateLiveTotals() {
    let totalMilitary = 0;
    let totalCivilian = 0;
    let totalPackage = 0;

    products.forEach(p => {
        if (selectedItemsForCalc.has(p.fbKey)) {
            if (p.category === 'special') {
                totalPackage += Number(p.civilian) || 0;
            } else {
                totalMilitary += Number(p.military) || 0;
                totalCivilian += Number(p.civilian) || 0;
            }
        }
    });

    document.getElementById('calc-total-military').innerText = totalMilitary.toLocaleString();
    document.getElementById('calc-total-civilian').innerText = totalCivilian.toLocaleString();
    document.getElementById('calc-total-package').innerText = totalPackage.toLocaleString();
}

function resetCalculator() {
    selectedItemsForCalc.clear();
    renderPricesCards();
}

// ================= 4. نظام إرسال طلبات التعديل والقطع للورشة سحابياً =================
function submitTuningOrder() {
    const name = document.getElementById('order-cust-name').value;
    const type = document.getElementById('order-cust-type').value;

    if (!name) {
        alert("الرجاء كتابة اسمك الكريم أو الـ ID لتأكيد إرسال الفاتورة!");
        return;
    }
    if (selectedItemsForCalc.size === 0) {
        alert("الرجاء اختيار باقة أو قطعة واحدة على الأقل لحسابها!");
        return;
    }

    let selectedNames = [];
    let finalCalculatedPrice = 0;

    products.forEach(p => {
        if (selectedItemsForCalc.has(p.fbKey)) {
            selectedNames.push(p.name);
            if (p.category === 'special') {
                finalCalculatedPrice += Number(p.civilian) || 0;
            } else {
                finalCalculatedPrice += (type === 'military') ? (Number(p.military) || 0) : (Number(p.civilian) || 0);
            }
        }
    });

    database.ref('tuningOrders').push({
        customerName: name,
        identityType: type === 'military' ? 'عسكري' : 'مواطن',
        itemsOrdered: selectedNames.join(' | '),
        totalCost: finalCalculatedPrice,
        date: new Date().toLocaleTimeString('ar-EG')
    }).then(() => {
        alert("تم إرسال فاتورة طلب التعديل بنجاح لطاقم فنيين الورشة!");
        document.getElementById('order-cust-name').value = '';
        resetCalculator();
        switchPage('welcome-page');
    });
}

// ================= 5. رندرة جدول الموظفين الموحد للزوار (الاسم، الايدي، الجوال، الرتبة) =================
function renderVisitorStaffTable() {
    const tbody = document.getElementById('visitor-staff-table-body');
    if (!tbody) return; // للتأكد من عدم حدوث خطأ إذا لم تكن في صفحة الجدول
    tbody.innerHTML = '';

    if (staff.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="txt-center">لا يوجد موظفون مسجلون حالياً في النظام السحابي.</td></tr>';
        return;
    }

    const rankOrder = ["Owner", "Co Owner", "General Manager", "Supervisor", "Mechanic", "Trainee"];
    const sortedStaff = [...staff].sort((a, b) => rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank));

    sortedStaff.forEach(s => {
        const classRank = s.rank.toLowerCase().replace(/\s+/g, '');
        tbody.innerHTML += `
            <tr>
                <td><span class="badge-${classRank}">${s.name}</span></td>
                <td><strong>${s.gameId}</strong></td>
                <td>${s.phone}</td>
                <td>${getRankLabel(s.rank)}</td>
            </tr>
        `;
    });
}

function getRankLabel(rank) {
    const labels = {
        'Owner': 'Owner - الملاك',
        'Co Owner': 'Co Owner - نواب المالك',
        'General Manager': 'General Manager - الإدارة العامة',
        'Supervisor': 'Supervisor - المشرفين',
        'Mechanic': 'Mechanic - الفنيين والميكانيكيين',
        'Trainee': 'Trainee - المتدربين'
    };
    return labels[rank] || rank;
}

function updateStaffDropdown() {
    const select = document.getElementById('rate-staff-select');
    if (!select) return;
    select.innerHTML = '<option value="">اختر الموظف الذي تعاملت معه...</option>';
    staff.forEach(s => {
        select.innerHTML += `<option value="${s.name}">${s.name} (${getRankLabel(s.rank)})</option>`;
    });
}

// ================= 6. إرسال استمارات التوظيف والتقييم للزبائن للـ Firebase =================
function submitApplication() {
    const name = document.getElementById('app-name').value;
    const gameId = document.getElementById('app-game-id').value;
    const discord = document.getElementById('app-discord').value;
    const age = document.getElementById('app-age').value;
    const phone = document.getElementById('app-phone').value;
    const specialty = document.getElementById('app-specialty') ? document.getElementById('app-specialty').value : 'غير محدد'; 
    const shift = document.getElementById('app-shift') ? document.getElementById('app-shift').value : 'غير محدد';
    const exp = document.getElementById('app-exp').value;

    // التحقق من إدخال البيانات الأساسية
    if (!name || !gameId || !discord || !phone) {
        alert("يرجى تعبئة جميع الحقول الأساسية (الاسم، ID، الديسكورد، رقم الجوال) لضمان قبول طلبك!");
        return;
    }

    // توليد رقم تذكرة عشوائي مميز للورشة
    const ticketId = 'CUST-' + Math.floor(10000 + Math.random() * 90000); // مثال: CUST-45892

    // تجهيز حزمة البيانات للإرسال
    const appData = {
        ticketId: ticketId,
        name: name,
        gameId: gameId,
        discord: discord,
        age: age,
        phone: phone,
        specialty: specialty,
        shift: shift,
        exp: exp || "لا توجد خبرة سابقة",
        status: "قيد المراجعة", // الحالة الافتراضية
        timestamp: new Date().toLocaleString()
    };

    // إرسال البيانات إلى Firebase
    database.ref('applications').push(appData)
        .then(() => {
            // إظهار رسالة نجاح احترافية تتضمن رقم التذكرة
            alert(`✅ تم استلام طلبك بنجاح!\n\nيرجى الاحتفاظ برقم التذكرة الخاص بك للاستعلام عن حالة الطلب لاحقاً:\n\n🎫 رقم التذكرة: ${ticketId}`);
            
            // تفريغ الحقول بعد الإرسال الناجح
            document.getElementById('app-name').value = '';
            document.getElementById('app-game-id').value = '';
            document.getElementById('app-discord').value = '';
            document.getElementById('app-age').value = '';
            document.getElementById('app-phone').value = '';
            document.getElementById('app-exp').value = '';
            if(document.getElementById('app-specialty')) document.getElementById('app-specialty').value = '';
            if(document.getElementById('app-shift')) document.getElementById('app-shift').value = '';
        })
        .catch((error) => {
            console.error("خطأ في إرسال الطلب:", error);
            alert("❌ حدث خطأ أثناء إرسال الطلب، يرجى التحقق من اتصالك والمحاولة مرة أخرى.");
        });
}

function checkApplicationStatus() {
    const searchId = document.getElementById('search-app-id').value.trim();
    const resultDiv = document.getElementById('search-app-result');

    if (!searchId) {
        resultDiv.innerHTML = "<span style='color: #ff4d4d;'>⚠️ يرجى إدخال الـ ID الخاص بك أو رقم التذكرة للبحث!</span>";
        return;
    }

    resultDiv.innerHTML = "<span style='color: #aaa;'>⏳ جاري البحث في السجلات السحابية...</span>";

    database.ref('applications').once('value')
        .then((snapshot) => {
            const data = snapshot.val();
            let found = false;

            if (data) {
                // البحث في جميع الطلبات
                Object.keys(data).forEach(key => {
                    const app = data[key];
                    
                    // يمكن للمستخدم البحث إما بالـ ID أو برقم التذكرة
                    if (app.gameId === searchId || app.ticketId === searchId) {
                        found = true;
                        
                        // تحديد لون ورسالة الحالة بناءً على التقييم الإداري
                        let statusColor = "#ff9f43"; // برتقالي لـ (قيد المراجعة)
                        let statusMessage = "طلبك حالياً قيد المراجعة من قبل الإدارة، يرجى التحلي بالصبر.";
                        
                        if (app.status === 'مقبول') {
                            statusColor = "#28a745"; // أخضر
                            statusMessage = "🎉 تم قبول طلبك! يرجى التوجه لمقر الورشة أو فتح تذكرة بالديسكورد لاستكمال التوظيف.";
                        } else if (app.status === 'مرفوض') {
                            statusColor = "#dc3545"; // أحمر
                            statusMessage = "نعتذر منك، تم رفض طلبك هذه المرة لعدم استيفاء الشروط. حظاً أوفر!";
                        }

                        // عرض النتيجة بتصميم احترافي (مربع ملون)
                        resultDiv.innerHTML = `
                            <div style="background: #1a1a1a; padding: 15px; border-radius: 6px; border-right: 5px solid ${statusColor}; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
                                <div style="margin-bottom: 8px;">مرحباً <strong>${app.name}</strong> <span style="color:#aaa; font-size:12px;">(تذكرة: ${app.ticketId || 'قديم'})</span></div>
                                <div style="color: ${statusColor}; font-size: 18px;">
                                    حالة الطلب: <strong>${app.status || 'قيد المراجعة'}</strong>
                                </div>
                                <div style="color: #ccc; font-size: 13px; margin-top: 8px; border-top: 1px solid #333; padding-top: 8px;">
                                    ${statusMessage}
                                </div>
                            </div>
                        `;
                    }
                });
            }

            if (!found) {
                resultDiv.innerHTML = "<span style='color: #dc3545;'>❌ لم نتمكن من العثور على طلب بهذا الـ ID أو رقم التذكرة.</span>";
            }
        })
        .catch((error) => {
            console.error("Error fetching status:", error);
            resultDiv.innerHTML = "<span style='color: #dc3545;'>❌ حدث خطأ في الاتصال بقاعدة البيانات.</span>";
        });
}

function submitRating() {
    const customerName = document.getElementById('rate-customer-name').value || "عميل مجهول";
    const staffName = document.getElementById('rate-staff-select').value;
    const stars = document.getElementById('rate-stars').value;
    const feedback = document.getElementById('rate-feedback').value;

    if (!staffName || !feedback) {
        alert("الرجاء اختيار الموظف وكتابة ملاحظات التقييم!");
        return;
    }

    database.ref('ratings').push({
        customerName: customerName,
        staffName: staffName,
        stars: Number(stars),
        feedback: feedback,
        date: new Date().toLocaleDateString('ar-EG')
    }).then(() => {
        alert("تم إرسال تقييمك بنجاح!");
        switchPage('welcome-page');
    });
}

// ================= 7. لوحة الإدارة والتحكم السحابية المتقدمة =================
function checkPassword() {
    const passwordInput = document.getElementById('admin-password');
    if (passwordInput && passwordInput.value === ADMIN_PASSWORD) {
        isAdminLoggedIn = true;
        document.getElementById('login-box').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'block';
        checkAdminDashboardStatus();
    } else {
        document.getElementById('login-error').style.display = 'block';
    }
}

function checkAdminDashboardStatus() {
    if (!isAdminLoggedIn) return;
    renderAdminProductsTable();
    renderAdminStaffTable();
    renderAdminRatingsTable();
    renderAdminApplicationsTable();
    renderAdminOrdersTable();
}

function logoutAdmin() {
    isAdminLoggedIn = false;
    document.getElementById('admin-dashboard').style.display = 'none';
    document.getElementById('login-box').style.display = 'block';
    switchPage('welcome-page');
}

// رندرة واستعراض طلبات تعديل القطع المرسلة من الزبائن للورشة
function renderAdminOrdersTable() {
    const tbody = document.getElementById('admin-orders-table');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (tuningOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="txt-center">لا توجد طلبات تعديل مرسلة حالياً.</td></tr>';
        return;
    }
    tuningOrders.forEach(o => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${o.customerName}</strong> <br><small style="color:#666">${o.date || ''}</small></td>
                <td>${o.identityType}</td>
                <td><span style="color:#e5b842; font-size:13px;">${o.itemsOrdered}</span></td>
                <td class="price-civilian txt-left">${Number(o.totalCost).toLocaleString()} $</td>
                <td class="txt-center">
                    <button class="btn-edit" style="background:#00b386; color:#fff" onclick="deleteTuningOrder('${o.fbKey}')">تم التجهيز والتسليم</button>
                </td>
            </tr>
        `;
    });
}

function deleteTuningOrder(fbKey) {
    database.ref('tuningOrders/' + fbKey).remove();
}

// ================= 8. تفعيل رندرة التعديل السطري المباشر (Inline Editing) للقطع والأسعار =================
// ================= 8. تفعيل رندرة التعديل السطري المباشر (Inline Editing) للقطع والأسعار =================
function renderAdminProductsTable() {
    const tbody = document.getElementById('admin-products-table');
    if (!tbody) return;
    tbody.innerHTML = '';

    let html = '';

    products.forEach(p => {
        if (editingProductKey === p.fbKey) {
            // سطر التعديل المباشر المفتوح للمسؤول
            html += `
                <tr class="inline-editing-row">
                    <td><input type="text" id="inline-p-name" value="${p.name}"></td>
                    <td><input type="text" id="inline-p-desc" value="${p.description || p.desc || ''}" placeholder="لا يوجد وصف"></td>
                    <td>
                        <select id="inline-p-cat">
                            <option value="special" ${p.category === 'special' ? 'selected' : ''}>باقة خاصة</option>
                            <option value="performance" ${p.category === 'performance' ? 'selected' : ''}>تعديل أداء</option>
                            <option value="cosmetic" ${p.category === 'cosmetic' ? 'selected' : ''}>تجميلي</option>
                        </select>
                    </td>
                    <td><input type="number" id="inline-p-mil" value="${p.military}" ${p.category === 'special' ? 'disabled' : ''}></td>
                    <td><input type="number" id="inline-p-civ" value="${p.civilian}"></td>
                    <td class="txt-center">
                        <button class="btn-inline-save" onclick="saveInlineProduct('${p.fbKey}')" style="background: #e5b842; color: #000; border: none; padding: 4px 10px; font-size: 12px; border-radius: 3px; cursor: pointer; margin-left: 5px;">حفظ</button>
                        <button class="btn-inline-cancel" onclick="cancelInlineProduct()" style="background: #6c757d; color: #fff; border: none; padding: 4px 10px; font-size: 12px; border-radius: 3px; cursor: pointer;">إلغاء</button>
                    </td>
                </tr>
            `;
        } else {
            // السطر العادي المظهر (تم تعديل الستايل ليتطابق مع شؤون الموظفين)
            html += `
                <tr>
                    <td>${p.name}</td>
                    <td>${p.description || p.desc || 'لا يوجد وصف'}</td> 
                    <td>${p.category === 'special' ? 'باقة خاصة' : (p.category === 'performance' ? 'تعديل أداء' : 'تجميلي')}</td>
                    <td>${p.military}</td>
                    <td>${p.civilian}</td>
                    <td class="txt-center">
                        <button class="btn-action-edit" onclick="editProduct('${p.fbKey}')" style="background: transparent; color: #e5b842; border: 1px solid #e5b842; padding: 3px 8px; font-size: 11px; border-radius: 4px; cursor: pointer; margin-left: 5px; font-family: inherit;">تعديل</button>
                        <button class="btn-action-delete" onclick="deleteProduct('${p.fbKey}')" style="background: transparent; color: #dc3545; border: 1px solid #dc3545; padding: 3px 8px; font-size: 11px; border-radius: 4px; cursor: pointer; font-family: inherit;">حذف</button>
                    </td>
                </tr>
            `;
        }
    });

    tbody.innerHTML = html;
}
document.getElementById('admin-products-table').innerHTML = html;
    ;


function setInlineProductEdit(fbKey) {
    editingProductKey = fbKey;
    renderAdminProductsTable();
}

function cancelInlineProduct() {
    editingProductKey = null;
    renderAdminProductsTable();
}

function saveInlineProduct(fbKey) {
    const name = document.getElementById('inline-p-name').value;
    const description = document.getElementById('inline-p-desc').value;
    const category = document.getElementById('inline-p-cat').value;
    let military = Number(document.getElementById('inline-p-mil').value) || 0;
    const civilian = Number(document.getElementById('inline-p-civ').value) || 0;

    if (!name || !civilian) {
        alert("يرجى ملء الحقول الأساسية!");
        return;
    }
    if (category === 'special') military = 0;

    database.ref('products/' + fbKey).update({
        name, description, category, military, civilian
    }).then(() => {
        editingProductKey = null;
        alert("تم تحديث بيانات الخدمة/القطعة بنجاح!");
    });
}

function deleteProduct(fbKey) {
    if (confirm("هل أنت متأكد من رغبتك في حذف هذه القطعة/الخدمة؟")) {
        database.ref('products/' + fbKey).remove()
        .then(() => {
            console.log("تم الحذف بنجاح");
            // إذا كانت قاعدة البيانات لا تعمل بتحديث تلقائي (on value)، قم باستدعاء دالة جلب البيانات هنا
        })
        .catch(error => console.error("خطأ أثناء الحذف:", error));
    }
}

function editProduct(fbKey) {
    editingProductKey = fbKey; // تعيين المفتاح الحالي للبدء في التعديل المباشر
    renderAdminProductsTable(); // إعادة رندرة الجدول ليتحول السطر المحدد إلى حقول إدخال
}

// ================= 9. تفعيل رندرة التعديل السطري المباشر (Inline Editing) لشؤون الموظفين الإداري =================
function renderAdminStaffTable() {
    const tbody = document.getElementById('admin-staff-table');
    if (!tbody) return;
    tbody.innerHTML = '';

    const rankOrder = ["Owner", "Co Owner", "General Manager", "Supervisor", "Mechanic", "Trainee"];
    const sortedStaff = [...staff].sort((a, b) => rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank));

    sortedStaff.forEach(s => {
        if (editingStaffKey === s.fbKey) {
            tbody.innerHTML += `
                <tr class="inline-editing-row">
                    <td><input type="text" id="inline-s-name" value="${s.name}"></td>
                    <td><input type="text" id="inline-s-gameid" value="${s.gameId}"></td>
                    <td><input type="text" id="inline-s-phone" value="${s.phone}"></td>
                    <td>
                        <select id="inline-s-rank">
                            <option value="Owner" ${s.rank === 'Owner' ? 'selected' : ''}>Owner - مالك الورشة</option>
                            <option value="Co Owner" ${s.rank === 'Co Owner' ? 'selected' : ''}>Co Owner - نائب المالك</option>
                            <option value="General Manager" ${s.rank === 'General Manager' ? 'selected' : ''}>General Manager - المدير العام</option>
                            <option value="Supervisor" ${s.rank === 'Supervisor' ? 'selected' : ''}>Supervisor - مشرف</option>
                            <option value="Mechanic" ${s.rank === 'Mechanic' ? 'selected' : ''}>Mechanic - ميكانيكي</option>
                            <option value="Trainee" ${s.rank === 'Trainee' ? 'selected' : ''}>Trainee - متدرب</option>
                        </select>
                    </td>
                    <td class="txt-center">
                        <button class="btn-inline-save" onclick="saveInlineStaff('${s.fbKey}')">حفظ</button>
                        <button class="btn-inline-cancel" onclick="cancelInlineStaff()">إلغاء</button>
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML += `
                <tr>
                    <td><strong>${s.name}</strong></td>
                    <td>${s.gameId}</td>
                    <td>${s.phone}</td>
                    <td>${getRankLabel(s.rank)}</td>
                    <td class="txt-center">
                        <button class="btn-edit" onclick="setInlineStaffEdit('${s.fbKey}')">تعديل</button>
                        <button class="btn-delete" onclick="deleteStaff('${s.fbKey}')">فصل ميكانيكي</button>
                    </td>
                </tr>
            `;
        }
    });
}

function setInlineStaffEdit(fbKey) {
    editingStaffKey = fbKey;
    renderAdminStaffTable();
}

function cancelInlineStaff() {
    editingStaffKey = null;
    renderAdminStaffTable();
}

function saveInlineStaff(fbKey) {
    const name = document.getElementById('inline-s-name').value;
    const gameId = document.getElementById('inline-s-gameid').value;
    const phone = document.getElementById('inline-s-phone').value;
    const rank = document.getElementById('inline-s-rank').value;

    if (!name || !gameId || !phone) {
        alert("جميع حقول الموظف إجبارية!");
        return;
    }

    database.ref('staff/' + fbKey).update({
        name, gameId, phone, rank
    }).then(() => {
        editingStaffKey = null;
        alert("تم تحديث بيانات الموظف بنجاح!");
    });
}

function deleteStaff(fbKey) {
    if (confirm("هل أنت متأكد من إزالة هذا الموظف؟")) {
        database.ref('staff/' + fbKey).remove();
    }
}

// ================= 10. نماذج الإضافة العلوية المباشرة (المنتجات والموظفين) =================
function handleProductSubmit() {
    const id = document.getElementById('edit-product-id').value;
    const name = document.getElementById('new-pname').value;
    const desc = document.getElementById('new-pdesc').value; // جلب الوصف من الحقل الجديد
    const military = document.getElementById('new-pmilitary').value;
    const civilian = document.getElementById('new-pcivilian').value;
    const category = document.getElementById('new-pcategory').value;

    if (!name) {
        alert("يرجى إدخال اسم القطعة!");
        return;
    }

    // تجهيز البيانات للحفظ، متضمنة الوصف
    const productData = {
        name: name,
        desc: desc || "لا يوجد وصف", // إذا ترك الإدارة الحقل فارغاً، سيتم كتابة "لا يوجد وصف"
        military: military,
        civilian: civilian,
        category: category
    };

    if (id) {
        // تحديث منتج موجود
        database.ref('products/' + id).update(productData);
    } else {
        // إضافة منتج جديد
        database.ref('products').push(productData);
    }

    // تنظيف الحقول بعد الحفظ
    document.getElementById('edit-product-id').value = '';
    document.getElementById('new-pname').value = '';
    document.getElementById('new-pdesc').value = ''; // تصفير حقل الوصف
    document.getElementById('new-pmilitary').value = '';
    document.getElementById('new-pcivilian').value = '';
    document.getElementById('new-pdesc').value = product.desc || "";
    
    // إرجاع عنوان الزر لشكله الطبيعي
    document.getElementById('product-form-title').innerText = "إضافة خدمة أو قطعة جديدة";
    document.getElementById('btn-submit-product').innerText = "حفظ وتحديث المنتجات";

}

function handleStaffSubmit() {
    const name = document.getElementById('staff-name').value;
    const gameId = document.getElementById('staff-game-id').value;
    const phone = document.getElementById('staff-phone').value;
    const rank = document.getElementById('staff-rank').value;

    if (!name || !gameId || !phone) {
        alert("ملء الحقول إلزامي!");
        return;
    }

    database.ref('staff').push({ name, gameId, phone, rank }).then(() => {
        document.getElementById('staff-name').value = '';
        document.getElementById('staff-game-id').value = '';
        document.getElementById('staff-phone').value = '';
    });
}

// ================= 11. جداول التوظيف والتقييمات الأخرى (بدون أي إيموجي) =================
function renderAdminApplicationsTable() {
    const tbody = document.getElementById('admin-apps-table');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (applications.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="txt-center">لا توجد طلبات توظيف حالياً.</td></tr>';
        return;
    }
    applications.forEach(a => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${a.name}</strong></td>
                <td>${a.gameId}</td>
                <td style="color:#7a58bf">${a.discord}</td>
                <td>العمر: ${a.age} <br> جوال: ${a.phone}</td>
                <td><small>${a.experience}</small></td>
                <td><strong>${a.status}</strong></td>
                <td class="txt-center">
                    ${a.status === 'قيد المراجعة' ? `
                        <button class="btn-edit" style="background:#00b386; color:#fff" onclick="acceptApplication('${a.fbKey}', '${a.name}', '${a.gameId}', '${a.phone}')">قبول الطلب</button>
                        <button class="btn-delete" style="background:#cc3333; color:#fff" onclick="rejectApplication('${a.fbKey}')">رفض</button>
                    ` : `
                        <button class="btn-delete" onclick="deleteApplication('${a.fbKey}')">شطب من السجل</button>
                    `}
                </td>
            </tr>
        `;
    });
}

function acceptApplication(fbKey, name, gameId, phone) {
    database.ref('applications/' + fbKey).update({ status: "مقبول مبدئياً" });
    database.ref('staff').push({
        name: name,
        gameId: gameId,
        phone: phone,
        rank: "Trainee"
    }).then(() => {
        alert("تم قبول المتقدم وتعيينه تلقائياً برتبة متدرب Trainee!");
    });
}

function rejectApplication(fbKey) {
    database.ref('applications/' + fbKey).update({ status: "نعتذر منك (مرفوض)" });
}

function deleteApplication(fbKey) {
    database.ref('applications/' + fbKey).remove();
}

function renderAdminRatingsTable() {
    const tbody = document.getElementById('admin-ratings-table');
    if (!tbody) return;
    tbody.innerHTML = '';
    ratings.forEach(r => {
        tbody.innerHTML += `
            <tr>
                <td>${r.customerName} <br><small style="color:#666">${r.date || ''}</small></td>
                <td><strong>${r.staffName}</strong></td>
                <td>${"⭐".repeat(r.stars)}</td>
                <td>${r.feedback}</td>
                <td class="txt-center">
                    <button class="btn-delete" onclick="deleteRating('${r.fbKey}')">مسح</button>
                </td>
            </tr>
        `;
    });
}

function deleteRating(fbKey) {
    database.ref('ratings/' + fbKey).remove();
}