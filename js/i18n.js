// ==========================================================================
// صيدليات العوضي (Elawadi Pharmacies) - Internationalization (i18n) & Theme
// Dual Language Support: Arabic (Default / RTL) and English (LTR)
// ==========================================================================

// Apply saved theme immediately on script load to prevent flashing
(function initTheme() {
    const savedTheme = localStorage.getItem("elawadi_theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
})();

function toggleDashboardTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("elawadi_theme", nextTheme);
    updateThemeIcon();
}

function updateThemeIcon() {
    const btn = document.getElementById("themeToggleBtn");
    if (btn) {
        const isDark = document.documentElement.getAttribute("data-theme") === "dark";
        btn.innerHTML = isDark 
            ? '<i class="fa-solid fa-sun" style="color: #FBBF24;"></i>' 
            : '<i class="fa-solid fa-moon"></i>';
        btn.setAttribute("title", isDark ? (i18n.currentLang === "ar" ? "تفعيل الوضع النهاري" : "Switch to Light Mode") : (i18n.currentLang === "ar" ? "تفعيل الوضع الليلي" : "Switch to Dark Mode"));
    }
}

const TRANSLATIONS = {
    ar: {
        // App branding
        brandName: "صيدليات العوضي",
        brandSubtitle: "لوحة التحكم الصيدلانية",
        
        // Navigation items
        navDashboard: "الرئيسية والإحصائيات",
        navOrders: "إدارة الطلبات",
        navCustomers: "دليل العملاء",
        navProducts: "دليل الأدوية والمنتجات",
        navCategories: "الأقسام والتصنيفات",
        navBranches: "الفروع ومنافذ البيع",
        navStaff: "طاقم الصيادلة والمستخدمين",
        navReports: "التقارير والمبيعات",
        navSettings: "إعدادات النظام",
        navLogout: "تسجيل الخروج",
        
        // Roles & General
        roleAdmin: "مدير النظام",
        rolePharmacist: "صيدلي مسؤول",
        branchAll: "جميع الفروع",
        branchAssigned: "الفرع المخصص",
        
        // Dashboard Stats
        statNewOrders: "الطلبات الجديدة",
        statConfirmedOrders: "الطلبات المؤكدة",
        statReadyOrders: "الطلبات الجاهزة",
        statCompletedOrders: "الطلبات المكتملة",
        statCancelledOrders: "الطلبات الملغاة",
        recentOrders: "أحدث الطلبات الواردة",
        viewAllOrders: "عرض كافة الطلبات",
        
        // Orders Table Headers & Info
        orderId: "رقم الطلب",
        trackingCode: "كود التتبع",
        customer: "العميل",
        customerPhone: "رقم الهاتف",
        orderType: "نوع الطلب",
        orderTotal: "الإجمالي",
        orderStatus: "حالة الطلب",
        orderDate: "التاريخ",
        orderActions: "إجراءات",
        orderNotes: "ملاحظات إضافية",
        deliveryAddress: "عنوان التوصيل",
        orderBranch: "الفرع المعين",
        
        // Order Types
        typeDelivery: "توصيل للمنزل",
        typePickup: "استلام من الصيدلية",
        typeAll: "جميع الأنواع",
        
        // Order Statuses
        statusNew: "جديد",
        statusConfirmed: "مؤكد",
        statusReady: "جاهز",
        statusOutForDelivery: "خرج للتوصيل",
        statusCompleted: "مكتمل",
        statusCancelled: "ملغي",
        statusAll: "جميع الحالات",
        
        // Order Actions / Workflow Buttons
        actionConfirm: "تأكيد الطلب",
        actionMarkReady: "تجهيز الطلب كـ جاهز",
        actionOutForDelivery: "إرسال مع مندوب التوصيل",
        actionCompleteOrder: "إتمام وتسليم الطلب",
        actionCancelOrder: "إلغاء الطلب",
        actionViewDetails: "تفاصيل الطلب",
        
        // Prescriptions
        prescriptionTitle: "الروشتة والوصفة الطبية",
        viewPrescription: "عرض الروشتة الطبية",
        noPrescriptionUploaded: "لم يتم إرفاق روشتة مع هذا الطلب",
        prescriptionLoading: "جاري استخراج رابط الروشتة الآمن...",
        
        // Filters & Search
        searchPlaceholderOrders: "بحث باسم العميل، الهاتف، أو رقم الطلب...",
        searchPlaceholderProducts: "بحث باسم الدواء أو الكود...",
        searchPlaceholderCustomers: "بحث باسم العميل أو رقم الهاتف...",
        searchPlaceholderBranches: "بحث باسم الفرع أو العنوان...",
        filterPeriod: "الفترة الزمنية",
        periodToday: "اليوم",
        periodYesterday: "أمس",
        periodThisWeek: "هذا الأسبوع",
        periodThisMonth: "هذا الشهر",
        periodCustom: "فترة مخصصة",
        filterStatus: "الحالة",
        filterType: "النوع",
        filterBranch: "الفرع",
        filterApply: "تطبيق التصفية",
        filterReset: "إعادة ضبط",
        
        // Common Buttons & Modals
        save: "حفظ التغييرات",
        cancel: "إلغاء",
        delete: "حذف",
        deactivate: "إلغاء التنشيط",
        activate: "تنشيط",
        edit: "تعديل",
        add: "إضافة جديد",
        close: "إغلاق",
        confirmDeleteTitle: "تأكيد العملية",
        confirmDeleteMsg: "هل أنت متأكد من تنفيذ هذا الإجراء؟",
        
        // Customers Page
        customerName: "اسم العميل",
        customerOrdersCount: "عدد الطلبات",
        customerLastOrder: "تاريخ آخر طلب",
        customerTotalSpent: "إجمالي المشتريات",
        
        // Products Page
        productNameAr: "اسم المنتج (بالعربية)",
        productNameEn: "اسم المنتج (بالإنجليزية)",
        productCategory: "القسم / التصنيف",
        productPrice: "السعر (ج.م)",
        productOldPrice: "السعر قبل الخصم",
        productBadge: "الشارة (مثل الأكثر طلباً)",
        productImage: "صورة المنتج",
        productInStock: "متوفر بالمخزون",
        productActiveStatus: "الحالة",
        addProduct: "إضافة دواء / منتج جديد",
        editProduct: "تعديل بيانات المنتج",
        
        // Categories Page
        categoryNameAr: "اسم القسم (بالعربية)",
        categoryNameEn: "اسم القسم (بالإنجليزية)",
        categorySlug: "المعرف اللاتيني (Slug)",
        addCategory: "إضافة قسم جديد",
        editCategory: "تعديل القسم",
        
        // Branches Page
        branchNameAr: "اسم الفرع",
        branchAddress: "العنوان التفصيلي",
        branchPhone: "رقم تليفون الفرع",
        branchHours: "مواعيد العمل",
        branchManager: "مدير الفرع / الصيدلي المسؤول",
        addBranch: "إضافة فرع جديد",
        editBranch: "تعديل بيانات الفرع",
        
        // Staff Page
        staffName: "اسم الصيدلي / المستخدم",
        staffEmail: "البريد الإلكتروني",
        staffMobile: "رقم الموبايل",
        staffRole: "الصلاحية / الدور",
        staffBranch: "الفرع التابع له",
        staffStatus: "حالة الحساب",
        addStaff: "إضافة صيدلي جديد",
        editStaff: "تعديل بيانات الصيدلي",
        
        // Reports Page
        reportsTitle: "تقارير المبيعات والأداء",
        totalSales: "إجمالي المبيعات",
        totalOrdersCount: "إجمالي عدد الطلبات",
        completedSales: "مبيعات الطلبات المكتملة",
        topSellingProducts: "الأدوية والمنتجات الأكثر طلباً",
        orderStatusDistribution: "توزيع حالات الطلبات",
        
        // Notifications & Audio
        notificationsTitle: "التنبيهات والإشعارات",
        newOrderAlert: "طلب جديد وارد الآن!",
        soundEnabled: "التنبيه الصوتي مفعّل",
        soundDisabled: "التنبيه الصوتي معطّل",
        enableAudioBtn: "تفعيل الصوت التلقائي للتنبيهات",
        
        // Messages & Toasts
        loadingData: "جاري تحميل البيانات...",
        savingData: "جاري حفظ التغييرات...",
        saveSuccess: "تم حفظ البيانات بنجاح",
        statusUpdateSuccess: "تم تحديث حالة الطلب بنجاح",
        errorGeneric: "حدث خطأ غير متوقع، يرجى المحاولة لاحقاً",
        noDataFound: "لا توجد نتائج مطابقة لعرضها حالياً",
        
        // Auth / Login
        loginTitle: "تسجيل الدخول - لوحة التحكم",
        loginSubtitle: "أدخل بيانات حسابك للمتابعة",
        emailPlaceholder: "البريد الإلكتروني",
        passwordPlaceholder: "كلمة المرور",
        loginBtn: "دخول لوحة التحكم",
        loginSuccess: "تم تسجيل الدخول بنجاح",
        loginError: "بيانات الدخول غير صحيحة أو الحساب غير مفعّل",
        inactiveAccountError: "عذراً، هذا الحساب معطل حالياً. يرجى مراجعة إدارة الصيدلية."
    },
    
    en: {
        // App branding
        brandName: "Elawadi Pharmacies",
        brandSubtitle: "Pharmacy Management Dashboard",
        
        // Navigation items
        navDashboard: "Dashboard & KPIs",
        navOrders: "Orders Management",
        navCustomers: "Customers Directory",
        navProducts: "Medicines & Catalog",
        navCategories: "Categories",
        navBranches: "Branches Locator",
        navStaff: "Staff & Pharmacists",
        navReports: "Sales & Reports",
        navSettings: "System Settings",
        navLogout: "Sign Out",
        
        // Roles & General
        roleAdmin: "Administrator",
        rolePharmacist: "Staff Pharmacist",
        branchAll: "All Branches",
        branchAssigned: "Assigned Branch",
        
        // Dashboard Stats
        statNewOrders: "New Orders",
        statConfirmedOrders: "Confirmed Orders",
        statReadyOrders: "Ready Orders",
        statCompletedOrders: "Completed Orders",
        statCancelledOrders: "Cancelled Orders",
        recentOrders: "Recent Incoming Orders",
        viewAllOrders: "View All Orders",
        
        // Orders Table Headers & Info
        orderId: "Order ID",
        trackingCode: "Tracking Code",
        customer: "Customer",
        customerPhone: "Phone",
        orderType: "Order Type",
        orderTotal: "Total",
        orderStatus: "Status",
        orderDate: "Date",
        orderActions: "Actions",
        orderNotes: "Additional Notes",
        deliveryAddress: "Delivery Address",
        orderBranch: "Assigned Branch",
        
        // Order Types
        typeDelivery: "Home Delivery",
        typePickup: "Store Pickup",
        typeAll: "All Types",
        
        // Order Statuses
        statusNew: "New",
        statusConfirmed: "Confirmed",
        statusReady: "Ready",
        statusOutForDelivery: "Out for Delivery",
        statusCompleted: "Completed",
        statusCancelled: "Cancelled",
        statusAll: "All Statuses",
        
        // Order Actions / Workflow Buttons
        actionConfirm: "Confirm Order",
        actionMarkReady: "Mark Ready",
        actionOutForDelivery: "Send Out for Delivery",
        actionCompleteOrder: "Complete Order",
        actionCancelOrder: "Cancel Order",
        actionViewDetails: "Order Details",
        
        // Prescriptions
        prescriptionTitle: "Medical Prescription",
        viewPrescription: "View Prescription Image",
        noPrescriptionUploaded: "No prescription uploaded for this order",
        prescriptionLoading: "Generating secure signed link...",
        
        // Filters & Search
        searchPlaceholderOrders: "Search customer name, phone, or order ID...",
        searchPlaceholderProducts: "Search medicine name or code...",
        searchPlaceholderCustomers: "Search customer name or phone...",
        searchPlaceholderBranches: "Search branch name or address...",
        filterPeriod: "Time Period",
        periodToday: "Today",
        periodYesterday: "Yesterday",
        periodThisWeek: "This Week",
        periodThisMonth: "This Month",
        periodCustom: "Custom Range",
        filterStatus: "Status",
        filterType: "Type",
        filterBranch: "Branch",
        filterApply: "Apply Filters",
        filterReset: "Reset",
        
        // Common Buttons & Modals
        save: "Save Changes",
        cancel: "Cancel",
        delete: "Delete",
        deactivate: "Deactivate",
        activate: "Activate",
        edit: "Edit",
        add: "Add New",
        close: "Close",
        confirmDeleteTitle: "Confirm Action",
        confirmDeleteMsg: "Are you sure you want to proceed with this action?",
        
        // Customers Page
        customerName: "Customer Name",
        customerOrdersCount: "Orders Count",
        customerLastOrder: "Last Order Date",
        customerTotalSpent: "Total Spent",
        
        // Products Page
        productNameAr: "Product Name (Arabic)",
        productNameEn: "Product Name (English)",
        productCategory: "Category",
        productPrice: "Price (EGP)",
        productOldPrice: "Original Price",
        productBadge: "Badge (e.g. Best Seller)",
        productImage: "Product Image",
        productInStock: "In Stock",
        productActiveStatus: "Status",
        addProduct: "Add New Medicine / Product",
        editProduct: "Edit Product Details",
        
        // Categories Page
        categoryNameAr: "Category Name (Arabic)",
        categoryNameEn: "Category Name (English)",
        categorySlug: "Slug Identifier",
        addCategory: "Add New Category",
        editCategory: "Edit Category",
        
        // Branches Page
        branchNameAr: "Branch Name",
        branchAddress: "Detailed Address",
        branchPhone: "Branch Phone",
        branchHours: "Working Hours",
        branchManager: "Branch Manager / Lead Pharmacist",
        addBranch: "Add New Branch",
        editBranch: "Edit Branch Details",
        
        // Staff Page
        staffName: "Staff Name",
        staffEmail: "Email Address",
        staffMobile: "Mobile Number",
        staffRole: "Role / Permission",
        staffBranch: "Assigned Branch",
        staffStatus: "Account Status",
        addStaff: "Add New Staff Pharmacist",
        editStaff: "Edit Staff Details",
        
        // Reports Page
        reportsTitle: "Sales & Performance Reports",
        totalSales: "Total Sales",
        totalOrdersCount: "Total Orders Placed",
        completedSales: "Completed Orders Sales",
        topSellingProducts: "Top Selling Medicines & Products",
        orderStatusDistribution: "Order Status Distribution",
        
        // Notifications & Audio
        notificationsTitle: "Notifications",
        newOrderAlert: "New incoming order received!",
        soundEnabled: "Audio Chimes Enabled",
        soundDisabled: "Audio Chimes Disabled",
        enableAudioBtn: "Enable Sound Alerts",
        
        // Messages & Toasts
        loadingData: "Loading data...",
        savingData: "Saving changes...",
        saveSuccess: "Saved successfully",
        statusUpdateSuccess: "Order status updated successfully",
        errorGeneric: "An unexpected error occurred. Please try again.",
        noDataFound: "No matching records found to display",
        
        // Auth / Login
        loginTitle: "Sign In - Pharmacy Dashboard",
        loginSubtitle: "Enter your account credentials to continue",
        emailPlaceholder: "Email address",
        passwordPlaceholder: "Password",
        loginBtn: "Sign In to Dashboard",
        loginSuccess: "Signed in successfully",
        loginError: "Invalid login credentials or inactive account",
        inactiveAccountError: "Your account is currently inactive. Please contact administration."
    }
};

class I18nManager {
    constructor() {
        this.currentLang = localStorage.getItem("elawadi_dashboard_lang") || "ar";
        this.applyLanguage(this.currentLang, false);
    }

    t(key) {
        const dict = TRANSLATIONS[this.currentLang] || TRANSLATIONS.ar;
        return dict[key] || key;
    }

    applyLanguage(lang, triggerRerender = true) {
        this.currentLang = (lang === "en") ? "en" : "ar";
        localStorage.setItem("elawadi_dashboard_lang", this.currentLang);

        const html = document.documentElement;
        html.setAttribute("lang", this.currentLang);
        html.setAttribute("dir", this.currentLang === "ar" ? "rtl" : "ltr");

        this.updateDOMTranslations();

        // Update language toggle buttons in DOM if present
        const btnLang = document.getElementById("langSwitcherBtn");
        if (btnLang) {
            btnLang.innerHTML = this.currentLang === "ar" 
                ? `<i class="fa-solid fa-globe"></i> <span>English</span>`
                : `<i class="fa-solid fa-globe"></i> <span>العربية</span>`;
        }

        if (triggerRerender && typeof window.onLanguageChange === "function") {
            window.onLanguageChange(this.currentLang);
        }
    }

    toggleLanguage() {
        const nextLang = this.currentLang === "ar" ? "en" : "ar";
        this.applyLanguage(nextLang, true);
    }

    updateDOMTranslations() {
        document.querySelectorAll("[data-i18n]").forEach(el => {
            const key = el.getAttribute("data-i18n");
            el.textContent = this.t(key);
        });

        document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
            const key = el.getAttribute("data-i18n-placeholder");
            el.setAttribute("placeholder", this.t(key));
        });

        document.querySelectorAll("[data-i18n-title]").forEach(el => {
            const key = el.getAttribute("data-i18n-title");
            el.setAttribute("title", this.t(key));
        });
    }
}

// Global singleton instance
const i18n = new I18nManager();

document.addEventListener("DOMContentLoaded", () => {
    updateThemeIcon();
});

