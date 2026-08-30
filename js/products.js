// ==========================================================================
// صيدليات العوضي (Elawadi Pharmacies) - Products Catalog Controller
// ==========================================================================

let productsList = [];
let categoriesList = [];

document.addEventListener("DOMContentLoaded", async () => {
    utils.setupMobileSidebar();

    const isAuthed = await auth.init();
    if (!isAuthed) return;

    notifications.init();
    await loadCategoriesDropdown();
    await loadProducts();
    setupProductSearch();

    window.onLanguageChange = () => {
        renderProductsTable();
        loadCategoriesDropdown();
    };
});

function setupProductSearch() {
    const input = document.getElementById("productSearchInput");
    if (!input) return;

    input.addEventListener("input", (e) => {
        const q = e.target.value.trim().toLowerCase();
        const filtered = productsList.filter(p => 
            (p.name_ar && p.name_ar.toLowerCase().includes(q)) ||
            (p.name_en && p.name_en.toLowerCase().includes(q))
        );
        renderProductsTable(filtered);
    });
}

async function loadCategoriesDropdown() {
    try {
        const { data } = await db.getClient()
            .from("categories")
            .select("id, name_ar, name_en")
            .eq("is_active", true);

        categoriesList = data || [];

        const select = document.getElementById("productCategorySelect");
        if (select) {
            select.innerHTML = `<option value="">${i18n.currentLang === "ar" ? "-- اختر القسم --" : "-- Select Category --"}</option>` +
                categoriesList.map(c => `
                    <option value="${c.id}">${i18n.currentLang === "en" ? (c.name_en || c.name_ar) : c.name_ar}</option>
                `).join("");
        }
    } catch (e) {
        console.error("Categories dropdown error:", e);
    }
}

async function onProductCategoryChange() {
    const categoryId = document.getElementById("productCategorySelect").value;
    await loadSubcategoriesDropdown(categoryId);
}

async function loadSubcategoriesDropdown(categoryId, selectedSubcategoryId = "") {
    const select = document.getElementById("productSubcategorySelect");
    if (!select) return;

    if (!categoryId) {
        select.innerHTML = `<option value="">-- بدون فئة فرعية --</option>`;
        return;
    }

    try {
        const { data, error } = await db.getClient()
            .from("subcategories")
            .select("id, name_ar, name_en")
            .eq("category_id", categoryId)
            .eq("is_active", true);

        if (error) throw error;

        const list = data || [];
        select.innerHTML = `<option value="">-- بدون فئة فرعية --</option>` +
            list.map(s => `
                <option value="${s.id}">${i18n.currentLang === "en" ? (s.name_en || s.name_ar) : s.name_ar}</option>
            `).join("");

        if (selectedSubcategoryId) {
            select.value = selectedSubcategoryId;
        }
    } catch (e) {
        console.error("Subcategories dropdown error:", e);
    }
}

async function loadProducts() {
    const tbody = document.getElementById("productsTableBody");
    const emptyState = document.getElementById("emptyProductsState");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 3rem;">${i18n.t("loadingData")}</td></tr>`;

    try {
        const client = db.getClient();
        const { data, error } = await client
            .from("products")
            .select("*, categories(name_ar, name_en)")
            .order("created_at", { ascending: false });

        if (error) throw error;

        productsList = data || [];
        renderProductsTable(productsList);

    } catch (err) {
        console.error("Load products error:", err);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #EF4444; padding: 2rem;">${i18n.t("errorGeneric")}</td></tr>`;
    }
}

function renderProductsTable(items = productsList) {
    const tbody = document.getElementById("productsTableBody");
    const emptyState = document.getElementById("emptyProductsState");
    const countBadge = document.getElementById("productsCountBadge");
    if (!tbody) return;

    if (countBadge) countBadge.textContent = `${items.length} ${i18n.t("navProducts")}`;

    if (items.length === 0) {
        tbody.innerHTML = "";
        if (emptyState) emptyState.style.display = "block";
        return;
    }

    if (emptyState) emptyState.style.display = "none";

    const canEdit = auth.isAdmin();

    tbody.innerHTML = items.map(p => {
        const name = i18n.currentLang === "en" ? (p.name_en || p.name_ar) : p.name_ar;
        const subName = i18n.currentLang === "en" ? p.name_ar : (p.name_en || "");
        const catName = p.categories ? (i18n.currentLang === "en" ? (p.categories.name_en || p.categories.name_ar) : p.categories.name_ar) : "-";
        const price = utils.formatCurrency(p.price);
        const oldPrice = p.old_price ? `<del style="color: var(--text-subtle); font-size: 0.8rem; margin-inline-start: 0.25rem;">${utils.formatCurrency(p.old_price)}</del>` : "";
        const statusBadge = p.is_active 
            ? `<span class="badge badge-active">${i18n.t("activate")}</span>`
            : `<span class="badge badge-inactive">${i18n.t("deactivate")}</span>`;

        const imgHtml = p.image_url 
            ? `<img src="${p.image_url}" alt="${name}" style="width: 44px; height: 44px; object-fit: contain; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">`
            : `<div style="width: 44px; height: 44px; border-radius: var(--radius-sm); background: var(--bg-surface-subtle); display: flex; align-items: center; justify-content: center; color: var(--primary);"><i class="fa-solid ${p.icon || 'fa-pills'}"></i></div>`;

        let actionBtns = "-";
        if (canEdit) {
            actionBtns = `
                <div style="display: flex; gap: 0.35rem;">
                    <button class="btn btn-secondary btn-sm" onclick="openEditProductModal('${p.id}')" title="${i18n.t("edit")}">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="btn ${p.is_active ? 'btn-danger' : 'btn-primary'} btn-sm" onclick="toggleProductActive('${p.id}', ${!p.is_active})" title="${p.is_active ? i18n.t("deactivate") : i18n.t("activate")}">
                        <i class="fa-solid ${p.is_active ? 'fa-eye-slash' : 'fa-eye'}"></i>
                    </button>
                </div>
            `;
        }

        return `
            <tr>
                <td>${imgHtml}</td>
                <td>
                    <div style="font-weight: 600;">${name}</div>
                    <small style="color: var(--text-muted);">${subName}</small>
                </td>
                <td><span class="badge badge-delivery">${catName}</span></td>
                <td><strong>${price}</strong> ${oldPrice}</td>
                <td>${statusBadge}</td>
                <td>${actionBtns}</td>
            </tr>
        `;
    }).join("");
}

function openAddProductModal() {
    document.getElementById("productForm").reset();
    document.getElementById("productIdInput").value = "";
    document.getElementById("productSubcategorySelect").innerHTML = `<option value="">-- بدون فئة فرعية --</option>`;
    document.getElementById("productModalTitle").textContent = i18n.t("addProduct");
    document.getElementById("productModal").classList.add("active");
}

function openEditProductModal(productId) {
    const p = productsList.find(item => item.id === productId);
    if (!p) return;

    document.getElementById("productIdInput").value = p.id;
    document.getElementById("productNameArInput").value = p.name_ar || "";
    document.getElementById("productNameEnInput").value = p.name_en || "";
    document.getElementById("productPriceInput").value = p.price || 0;
    document.getElementById("productOldPriceInput").value = p.old_price || "";
    document.getElementById("productCategorySelect").value = p.category_id || "";
    document.getElementById("productBadgeInput").value = p.badge || "";
    document.getElementById("productInStockInput").checked = p.in_stock !== false;

    loadSubcategoriesDropdown(p.category_id || "", p.subcategory_id || "");

    document.getElementById("productModalTitle").textContent = i18n.t("editProduct");
    document.getElementById("productModal").classList.add("active");
}

function closeProductModal() {
    document.getElementById("productModal").classList.remove("active");
}

async function handleProductFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("productIdInput").value;
    const nameAr = document.getElementById("productNameArInput").value.trim();
    const nameEn = document.getElementById("productNameEnInput").value.trim();
    const price = parseFloat(document.getElementById("productPriceInput").value);
    const oldPrice = parseFloat(document.getElementById("productOldPriceInput").value) || null;
    const categoryId = document.getElementById("productCategorySelect").value || null;
    const subcategoryId = document.getElementById("productSubcategorySelect").value || null;
    const badge = document.getElementById("productBadgeInput").value.trim() || null;
    const inStock = document.getElementById("productInStockInput").checked;
    const fileInput = document.getElementById("productImageFile");

    if (!nameAr || isNaN(price)) {
        utils.showToast(i18n.currentLang === "ar" ? "يرجى كتابة اسم المنتج وتحديد السعر" : "Please provide name and price", "error");
        return;
    }

    const saveBtn = document.getElementById("saveProductBtn");
    saveBtn.disabled = true;
    saveBtn.textContent = i18n.t("savingData");

    try {
        let imageUrl = null;
        if (fileInput && fileInput.files && fileInput.files[0]) {
            imageUrl = await db.uploadProductImage(fileInput.files[0]);
        }

        const payload = {
            name_ar: nameAr,
            name_en: nameEn,
            price: price,
            old_price: oldPrice,
            category_id: categoryId,
            subcategory_id: subcategoryId,
            badge: badge,
            in_stock: inStock,
            updated_at: new Date().toISOString()
        };

        if (imageUrl) {
            payload.image_url = imageUrl;
        }

        const client = db.getClient();
        if (id) {
            const { error } = await client.from("products").update(payload).eq("id", id);
            if (error) throw error;
        } else {
            payload.is_active = true;
            const { error } = await client.from("products").insert(payload);
            if (error) throw error;
        }

        utils.showToast(i18n.t("saveSuccess"), "success");
        closeProductModal();
        await loadProducts();

    } catch (err) {
        console.error("Save product error:", err);
        utils.showToast(i18n.t("errorGeneric"), "error");
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = i18n.t("save");
    }
}

async function toggleProductActive(productId, newStatus) {
    const actionText = newStatus ? i18n.t("activate") : i18n.t("deactivate");
    const confirmMsg = i18n.currentLang === "ar"
        ? `هل أنت متأكد من رغبتك في ${actionText} هذا المنتج؟`
        : `Are you sure you want to ${actionText.toLowerCase()} this product?`;

    utils.showConfirm(i18n.t("confirmDeleteTitle"), confirmMsg, async () => {
        try {
            const { error } = await db.getClient()
                .from("products")
                .update({ is_active: newStatus })
                .eq("id", productId);

            if (error) throw error;

            utils.showToast(i18n.t("saveSuccess"), "success");
            await loadProducts();
        } catch (err) {
            console.error("Toggle product error:", err);
            utils.showToast(i18n.t("errorGeneric"), "error");
        }
    });
}
