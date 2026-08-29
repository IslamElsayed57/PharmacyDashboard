// ==========================================================================
// صيدليات العوضي (Elawadi Pharmacies) - System Settings Controller
// ==========================================================================

document.addEventListener("DOMContentLoaded", async () => {
    utils.setupMobileSidebar();

    const isAuthed = await auth.init();
    if (!isAuthed) return;

    notifications.init();
    await loadSettings();
    initThemeAndSoundUI();

    window.onLanguageChange = () => loadSettings();
});

async function loadSettings() {
    try {
        const { data, error } = await db.getClient().from("settings").select("*");
        if (error) throw error;

        const map = {};
        (data || []).forEach(row => {
            map[row.key] = row.value;
        });

        // Pharmacy Info
        if (map.pharmacy_info) {
            const pi = map.pharmacy_info;
            const arName = document.getElementById("settingPharmacyNameAr");
            const enName = document.getElementById("settingPharmacyNameEn");
            const hotline = document.getElementById("settingHotline");
            const wa = document.getElementById("settingWhatsapp");

            if (arName) arName.value = pi.name_ar || "";
            if (enName) enName.value = pi.name_en || "";
            if (hotline) hotline.value = pi.hotline || "";
            if (wa) wa.value = pi.whatsapp || "";
        }

        // Delivery Rules
        if (map.delivery_rules) {
            const dr = map.delivery_rules;
            const fee = document.getElementById("settingDefaultDeliveryFee");
            const threshold = document.getElementById("settingFreeDeliveryThreshold");

            if (fee) fee.value = dr.default_fee || 0;
            if (threshold) threshold.value = dr.free_delivery_threshold || 0;
        }

        // Non-admin can only view
        if (!auth.isAdmin()) {
            document.querySelectorAll(".settings-input").forEach(el => el.disabled = true);
            document.querySelectorAll(".admin-save-btn").forEach(el => el.style.display = "none");
        }

    } catch (err) {
        console.error("Load settings error:", err);
    }
}

function initThemeAndSoundUI() {
    // Sound setting
    const soundToggle = document.getElementById("settingSoundToggle");
    if (soundToggle) {
        soundToggle.checked = localStorage.getItem("elawadi_sound_enabled") !== "false";
        soundToggle.onchange = (e) => {
            localStorage.setItem("elawadi_sound_enabled", String(e.target.checked));
            if (e.target.checked) utils.playNotificationSound();
            utils.showToast(e.target.checked ? i18n.t("soundEnabled") : i18n.t("soundDisabled"), "info");
        };
    }

    // Theme setting
    const themeToggle = document.getElementById("settingThemeToggle");
    if (themeToggle) {
        const isDark = document.documentElement.getAttribute("data-theme") === "dark";
        themeToggle.checked = isDark;
        themeToggle.onchange = (e) => {
            const theme = e.target.checked ? "dark" : "light";
            document.documentElement.setAttribute("data-theme", theme);
            localStorage.setItem("elawadi_theme", theme);
            if (typeof updateThemeIcon === "function") updateThemeIcon();
        };
    }
}

async function savePharmacySettings(e) {
    e.preventDefault();
    if (!auth.isAdmin()) return;

    const nameAr = document.getElementById("settingPharmacyNameAr").value.trim();
    const nameEn = document.getElementById("settingPharmacyNameEn").value.trim();
    const hotline = document.getElementById("settingHotline").value.trim();
    const wa = document.getElementById("settingWhatsapp").value.trim();

    try {
        const { error } = await db.getClient().from("settings").upsert({
            key: "pharmacy_info",
            value: { name_ar: nameAr, name_en: nameEn, hotline: hotline, whatsapp: wa },
            updated_at: new Date().toISOString()
        });

        if (error) throw error;
        utils.showToast(i18n.t("saveSuccess"), "success");
    } catch (err) {
        console.error("Save settings error:", err);
        utils.showToast(i18n.t("errorGeneric"), "error");
    }
}

async function saveDeliverySettings(e) {
    e.preventDefault();
    if (!auth.isAdmin()) return;

    const fee = parseFloat(document.getElementById("settingDefaultDeliveryFee").value) || 0;
    const threshold = parseFloat(document.getElementById("settingFreeDeliveryThreshold").value) || 0;

    try {
        const { error } = await db.getClient().from("settings").upsert({
            key: "delivery_rules",
            value: { default_fee: fee, free_delivery_threshold: threshold },
            updated_at: new Date().toISOString()
        });

        if (error) throw error;
        utils.showToast(i18n.t("saveSuccess"), "success");
    } catch (err) {
        console.error("Save delivery settings error:", err);
        utils.showToast(i18n.t("errorGeneric"), "error");
    }
}
