// ==========================================================================
// صيدليات العوضي (Elawadi Pharmacies) - Categories Management Controller
// ==========================================================================

let categoriesList = [];

document.addEventListener("DOMContentLoaded", async () => {
    utils.setupMobileSidebar();

    const isAuthed = await auth.init();
    if (!isAuthed) return;

    notifications.init();
    await loadCategories();

    window.onLanguageChange = () => renderCategoriesTable();
});

async function loadCategories() {
    const tbody = document.getElementById("categoriesTableBody");
    const emptyState = document.getElementById("emptyCategoriesState");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 3rem;">${i18n.t("loadingData")}</td></tr>`;

    try {
        const client = db.getClient();
        const { data, error } = await client
            .from("categories")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;

        categoriesList = data || [];
        renderCategoriesTable();

    } catch (err) {
        console.error("Load categories error:", err);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #EF4444; padding: 2rem;">${i18n.t("errorGeneric")}</td></tr>`;
    }
}

function renderCategoriesTable() {
    const tbody = document.getElementById("categoriesTableBody");
    const emptyState = document.getElementById("emptyCategoriesState");
    const countBadge = document.getElementById("categoriesCountBadge");
    if (!tbody) return;

    if (countBadge) countBadge.textContent = `${categoriesList.length} ${i18n.t("navCategories")}`;

    if (categoriesList.length === 0) {
        tbody.innerHTML = "";
        if (emptyState) emptyState.style.display = "block";
        return;
    }

    if (emptyState) emptyState.style.display = "none";

    const canEdit = auth.isAdmin();

    tbody.innerHTML = categoriesList.map(cat => {
        const name = i18n.currentLang === "en" ? (cat.name_en || cat.name_ar) : cat.name_ar;
        const subName = i18n.currentLang === "en" ? cat.name_ar : (cat.name_en || "-");
        const statusBadge = cat.is_active 
            ? `<span class="badge badge-active">${i18n.t("activate")}</span>`
            : `<span class="badge badge-inactive">${i18n.t("deactivate")}</span>`;

        let actionBtns = "-";
        if (canEdit) {
            actionBtns = `
                <div style="display: flex; gap: 0.35rem;">
                    <button class="btn btn-secondary btn-sm" onclick="openEditCategoryModal('${cat.id}')" title="${i18n.t("edit")}">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="btn ${cat.is_active ? 'btn-danger' : 'btn-primary'} btn-sm" onclick="toggleCategoryActive('${cat.id}', ${!cat.is_active})" title="${cat.is_active ? i18n.t("deactivate") : i18n.t("activate")}">
                        <i class="fa-solid ${cat.is_active ? 'fa-eye-slash' : 'fa-eye'}"></i>
                    </button>
                </div>
            `;
        }

        return `
            <tr>
                <td><strong>${name}</strong></td>
                <td><small style="color: var(--text-muted);">${subName}</small></td>
                <td><code>${cat.slug}</code></td>
                <td>${statusBadge}</td>
                <td>${actionBtns}</td>
            </tr>
        `;
    }).join("");
}

function openAddCategoryModal() {
    document.getElementById("categoryForm").reset();
    document.getElementById("categoryIdInput").value = "";
    document.getElementById("categoryModalTitle").textContent = i18n.t("addCategory");
    document.getElementById("categoryModal").classList.add("active");
}

function openEditCategoryModal(categoryId) {
    const cat = categoriesList.find(c => c.id === categoryId);
    if (!cat) return;

    document.getElementById("categoryIdInput").value = cat.id;
    document.getElementById("categoryNameArInput").value = cat.name_ar || "";
    document.getElementById("categoryNameEnInput").value = cat.name_en || "";
    document.getElementById("categorySlugInput").value = cat.slug || "";

    document.getElementById("categoryModalTitle").textContent = i18n.t("editCategory");
    document.getElementById("categoryModal").classList.add("active");
}

function closeCategoryModal() {
    document.getElementById("categoryModal").classList.remove("active");
}

async function handleCategoryFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("categoryIdInput").value;
    const nameAr = document.getElementById("categoryNameArInput").value.trim();
    const nameEn = document.getElementById("categoryNameEnInput").value.trim();
    let slug = document.getElementById("categorySlugInput").value.trim();

    if (!nameAr) {
        utils.showToast(i18n.currentLang === "ar" ? "يرجى كتابة اسم القسم" : "Please provide category name", "error");
        return;
    }

    if (!slug) {
        slug = (nameEn || nameAr).toLowerCase().replace(/[^a-z0-9]+/g, "-");
    }

    const payload = {
        name_ar: nameAr,
        name_en: nameEn,
        slug: slug
    };

    try {
        const client = db.getClient();
        if (id) {
            const { error } = await client.from("categories").update(payload).eq("id", id);
            if (error) throw error;
        } else {
            payload.is_active = true;
            const { error } = await client.from("categories").insert(payload);
            if (error) throw error;
        }

        utils.showToast(i18n.t("saveSuccess"), "success");
        closeCategoryModal();
        await loadCategories();

    } catch (err) {
        console.error("Save category error:", err);
        utils.showToast(i18n.t("errorGeneric"), "error");
    }
}

async function toggleCategoryActive(categoryId, newStatus) {
    const actionText = newStatus ? i18n.t("activate") : i18n.t("deactivate");
    const confirmMsg = i18n.currentLang === "ar"
        ? `هل أنت متأكد من رغبتك في ${actionText} هذا القسم؟`
        : `Are you sure you want to ${actionText.toLowerCase()} this category?`;

    utils.showConfirm(i18n.t("confirmDeleteTitle"), confirmMsg, async () => {
        try {
            const { error } = await db.getClient()
                .from("categories")
                .update({ is_active: newStatus })
                .eq("id", categoryId);

            if (error) throw error;

            utils.showToast(i18n.t("saveSuccess"), "success");
            await loadCategories();
        } catch (err) {
            console.error("Toggle category error:", err);
            utils.showToast(i18n.t("errorGeneric"), "error");
        }
    });
}
