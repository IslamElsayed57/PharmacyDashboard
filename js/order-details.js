// ==========================================================================
// صيدليات العوضي (Elawadi Pharmacies) - Order Details & Workflow Controller
// ==========================================================================

let currentOrder = null;

document.addEventListener("DOMContentLoaded", async () => {
    utils.setupMobileSidebar();

    const isAuthed = await auth.init();
    if (!isAuthed) return;

    notifications.init();

    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get("id");

    if (!orderId) {
        window.location.href = "orders.html";
        return;
    }

    await loadOrderDetails(orderId);

    window.onRealtimeOrderUpdate = (updatedOrder) => {
        if (currentOrder && updatedOrder.id == currentOrder.id) {
            loadOrderDetails(currentOrder.id);
        }
    };

    window.onLanguageChange = () => {
        if (currentOrder) renderOrderUI(currentOrder);
    };
});

async function loadOrderDetails(orderId) {
    try {
        const client = db.getClient();
        const { data, error } = await client
            .from("orders")
            .select("*, branches(name_ar, name_en), order_items(*)")
            .eq("id", orderId)
            .single();

        if (error || !data) {
            throw error || new Error("Order not found");
        }

        currentOrder = data;
        renderOrderUI(data);
        await loadPrescriptionSignedLink(data.prescription_url || data.prescription_path);
        loadStatusHistory(data.id);

    } catch (err) {
        console.error("Load order details error:", err);
        utils.showToast(i18n.t("errorGeneric"), "error");
    }
}

function renderOrderUI(order) {

    /**
     * Escapes plain text then turns any http(s) URL found inside it into a
     * clickable "فتح في خرائط جوجل" link, so the raw Google Maps link the
     * customer's device sent gets rendered as a real button instead of
     * plain text. Preserves line breaks via white-space handling in CSS.
     */
    function linkifyAddress(text) {
        if (!text) return "-";
        const escaped = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        return escaped.replace(/(https?:\/\/[^\s<]+)/g, (url) => `
            <a href="${url}" target="_blank" rel="noopener noreferrer"
               style="color: var(--primary); font-weight: 700; display: inline-flex; align-items: center; gap: 0.3rem;">
                <i class="fa-solid fa-location-dot"></i> فتح الموقع في خرائط جوجل
            </a>
        `);
    }

    /**
     * Extracts any prescription-attachment reference lines that script.js
     * appends to customer notes (e.g. "روشتة مرفقة: <url>"), removes them
     * from the displayed notes text, and returns how many were found so
     * a count is shown instead of a raw storage link.
     */
    function extractPrescriptionAttachments(text) {
        if (!text) return { cleanText: "", count: 0 };

        const lines = text.split("\n");
        let count = 0;

        const remainingLines = lines.filter((line) => {
            const isAttachmentLine =
                /روشتة مرفقة/.test(line) ||
                /https?:\/\/[^\s<]*\/prescriptions\//.test(line);

            if (isAttachmentLine) {
                count++;
                return false;
            }
            return true;
        });

        return { cleanText: remainingLines.join("\n").trim(), count };
    }

    const tracking = order.tracking_code || `#${order.id}`;
    
    // Header
    const titleEl = document.getElementById("orderDetailTitle");
    const statusBadgeEl = document.getElementById("orderDetailStatusBadge");
    const typeBadgeEl = document.getElementById("orderDetailTypeBadge");
    
    if (titleEl) titleEl.textContent = `${i18n.t("orderId")}: ${tracking}`;
    if (statusBadgeEl) statusBadgeEl.innerHTML = utils.getStatusBadge(order.status);
    if (typeBadgeEl) typeBadgeEl.innerHTML = utils.getOrderTypeBadge(order.order_type || order.delivery_method);

    // Customer Info
    const custNameEl = document.getElementById("orderCustomerName");
    const custPhoneEl = document.getElementById("orderCustomerPhone");
    const custAddressEl = document.getElementById("orderCustomerAddress");
    const orderDateEl = document.getElementById("orderCreatedAt");
    const orderNotesEl = document.getElementById("orderCustomerNotes");
    const orderBranchEl = document.getElementById("orderAssignedBranch");

    if (custNameEl) custNameEl.textContent = order.customer_name || "-";
    if (custPhoneEl) custPhoneEl.innerHTML = `<a href="tel:${order.phone}" style="color: var(--primary); font-weight: 600;"><i class="fa-solid fa-phone"></i> ${order.phone}</a>`;
    if (custAddressEl) custAddressEl.innerHTML = linkifyAddress(order.address);
    if (orderDateEl) orderDateEl.textContent = utils.formatDate(order.created_at, true);
    if (orderNotesEl) {
        const { cleanText, count } = extractPrescriptionAttachments(order.notes);
        let notesHtml = linkifyAddress(cleanText);
        if (count > 0) {
            const attachLabel = i18n.currentLang === "ar"
                ? `📎 عدد الروشتات/الصور المرفقة: ${count}`
                : `📎 Attached prescriptions/photos: ${count}`;
            notesHtml = (notesHtml === "-")
                ? attachLabel
                : `${notesHtml}<br><br>${attachLabel}`;
        }
        orderNotesEl.innerHTML = notesHtml;
    }
    if (orderBranchEl) {
        const branchName = order.branches 
            ? (i18n.currentLang === "en" ? (order.branches.name_en || order.branches.name_ar) : order.branches.name_ar)
            : i18n.t("branchAll");
        orderBranchEl.textContent = branchName;
    }

    // Financials
    const subtotalEl = document.getElementById("orderSubtotal");
    const deliveryFeeEl = document.getElementById("orderDeliveryFee");
    const totalEl = document.getElementById("orderGrandTotal");

    if (subtotalEl) subtotalEl.textContent = utils.formatCurrency(order.subtotal || order.total || 0);
    if (deliveryFeeEl) deliveryFeeEl.textContent = utils.formatCurrency(order.delivery_fee || 0);
    if (totalEl) totalEl.textContent = utils.formatCurrency(order.total || 0);

    // Products table
    renderProductsTable(order);

    // Status Workflow Buttons
    renderWorkflowActions(order.status, order.order_type || order.delivery_method);
}

function renderProductsTable(order) {
    const tbody = document.getElementById("orderItemsTableBody");
    if (!tbody) return;

    if (order.order_items && order.order_items.length > 0) {
        tbody.innerHTML = order.order_items.map(item => `
            <tr>
                <td><strong>${item.product_name_snapshot}</strong></td>
                <td>${item.quantity}</td>
                <td>${utils.formatCurrency(item.unit_price)}</td>
                <td><strong style="color: var(--primary);">${utils.formatCurrency(item.total_price)}</strong></td>
            </tr>
        `).join("");
    } else {
        // Parse medications plain text if historical plain text format
        const medText = order.medications || "-";
        tbody.innerHTML = `
            <tr>
                <td colspan="4">
                    <div style="padding: 0.5rem 0; line-height: 1.6; white-space: pre-line;">
                        <strong>${i18n.currentLang === "ar" ? "الأدوية والمطلوبات المسجلة:" : "Requested Items:"}</strong><br>
                        ${medText}
                    </div>
                </td>
            </tr>
        `;
    }
}

function renderWorkflowActions(status, orderType) {
    const container = document.getElementById("orderWorkflowActions");
    if (!container) return;

    const s = (status || "new").toLowerCase();
    const isDelivery = (orderType || "").toLowerCase().includes("delivery") || (orderType || "").includes("توصيل");
    let buttonsHtml = "";

    if (s === "new") {
        buttonsHtml = `
            <button class="btn btn-primary" onclick="updateOrderStatus('confirmed')">
                <i class="fa-solid fa-check"></i> ${i18n.t("actionConfirm")}
            </button>
            <button class="btn btn-danger" onclick="confirmCancelOrder()">
                <i class="fa-solid fa-ban"></i> ${i18n.t("actionCancelOrder")}
            </button>
        `;
    } else if (s === "confirmed") {
        buttonsHtml = `
            <button class="btn btn-primary" onclick="updateOrderStatus('ready')">
                <i class="fa-solid fa-box-check"></i> ${i18n.t("actionMarkReady")}
            </button>
            <button class="btn btn-danger" onclick="confirmCancelOrder()">
                <i class="fa-solid fa-ban"></i> ${i18n.t("actionCancelOrder")}
            </button>
        `;
    } else if (s === "ready") {
        if (isDelivery) {
            buttonsHtml = `
                <button class="btn btn-primary" onclick="updateOrderStatus('out_for_delivery')">
                    <i class="fa-solid fa-truck-fast"></i> ${i18n.t("actionOutForDelivery")}
                </button>
            `;
        } else {
            buttonsHtml = `
                <button class="btn btn-primary" onclick="updateOrderStatus('completed')">
                    <i class="fa-solid fa-circle-check"></i> ${i18n.t("actionCompleteOrder")}
                </button>
            `;
        }
    } else if (s === "out_for_delivery") {
        buttonsHtml = `
            <button class="btn btn-primary" onclick="updateOrderStatus('completed')">
                <i class="fa-solid fa-circle-check"></i> ${i18n.t("actionCompleteOrder")}
            </button>
        `;
    } else {
        // completed or cancelled -> No further action
        buttonsHtml = `
            <span style="color: var(--text-muted); font-size: 0.85rem; font-style: italic;">
                ${i18n.currentLang === "ar" ? "هذا الطلب في حالة نهائية ولا يتطلب إجراءات إضافية." : "This order is in a final state."}
            </span>
        `;
    }

    container.innerHTML = buttonsHtml;
}

async function updateOrderStatus(newStatus) {
    if (!currentOrder) return;
    const oldStatus = currentOrder.status;

    try {
        const client = db.getClient();

        // 1. Update orders table
        const { error: updateError } = await client
            .from("orders")
            .update({
                status: newStatus,
                updated_at: new Date().toISOString()
            })
            .eq("id", currentOrder.id);

        if (updateError) throw updateError;

        // 2. Pharmacist took action → stop the persistent alert for this order
        //    This works whether the action is confirm, cancel, or any later step.
        notifications.removePendingAlert(String(currentOrder.id));

        // 3. Insert audit log if status history table exists
        try {
            await client.from("order_status_history").insert({
                order_id: currentOrder.id,
                old_status: oldStatus,
                new_status: newStatus,
                changed_by: auth.user?.id || null
            });
        } catch (auditErr) {
            console.warn("Audit history optional insert:", auditErr);
        }

        utils.showToast(i18n.t("statusUpdateSuccess"), "success");
        await loadOrderDetails(currentOrder.id);

    } catch (err) {
        console.error("Update order status error:", err);
        utils.showToast(i18n.t("errorGeneric"), "error");
    }
}

function confirmCancelOrder() {
    utils.showConfirm(
        i18n.t("actionCancelOrder"),
        i18n.currentLang === "ar" ? "هل أنت متأكد من رغبتك في إلغاء هذا الطلب؟" : "Are you sure you want to cancel this order?",
        () => updateOrderStatus("cancelled")
    );
}

async function loadPrescriptionSignedLink(rxUrl) {
    const rxBox = document.getElementById("orderPrescriptionContainer");
    if (!rxBox) return;

    if (!rxUrl) {
        rxBox.innerHTML = `
            <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); background: var(--bg-surface-subtle); border-radius: var(--radius-md);">
                <i class="fa-solid fa-file-circle-xmark" style="font-size: 2rem; margin-bottom: 0.5rem; color: var(--text-subtle);"></i>
                <p>${i18n.t("noPrescriptionUploaded")}</p>
            </div>
        `;
        return;
    }

    rxBox.innerHTML = `
        <div style="padding: 1.5rem; text-align: center; color: var(--text-muted);">
            <i class="fa-solid fa-spinner fa-spin"></i> ${i18n.t("prescriptionLoading")}
        </div>
    `;

    const secureUrl = await db.getPrescriptionSignedUrl(rxUrl);

    rxBox.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 1rem; align-items: flex-start;">
            <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden; max-height: 350px; width: 100%; display: flex; justify-content: center; background: #000;">
                <img src="${secureUrl}" alt="Prescription" style="max-width: 100%; max-height: 350px; object-fit: contain;" onerror="this.parentElement.innerHTML='<div style=\'padding: 2rem; color: #fff;\'>ملف الروشتة متاح للتحميل أو العرض بالرابط أدناه</div>'">
            </div>
            <a href="${secureUrl}" target="_blank" class="btn btn-outline btn-sm">
                <i class="fa-solid fa-arrow-up-right-from-square"></i> ${i18n.t("viewPrescription")}
            </a>
        </div>
    `;
}

async function loadStatusHistory(orderId) {
    const timelineEl = document.getElementById("orderStatusHistoryTimeline");
    if (!timelineEl) return;

    try {
        const { data, error } = await db.getClient()
            .from("order_status_history")
            .select("*, profiles(full_name)")
            .eq("order_id", orderId)
            .order("created_at", { ascending: false });

        if (error || !data || data.length === 0) {
            timelineEl.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem;">-</p>`;
            return;
        }

        timelineEl.innerHTML = data.map(h => `
            <div style="padding: 0.5rem 0; border-bottom: 1px dashed var(--border-color); font-size: 0.85rem;">
                <strong>${h.new_status}</strong> 
                <span style="color: var(--text-muted); font-size: 0.75rem;">(${utils.formatDate(h.created_at, true)})</span>
                ${h.profiles?.full_name ? `<br><small style="color: var(--text-subtle);">بواسطة: ${h.profiles.full_name}</small>` : ""}
            </div>
        `).join("");
    } catch (e) {
        timelineEl.innerHTML = "";
    }
}
