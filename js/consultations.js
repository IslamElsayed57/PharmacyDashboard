// ==========================================================================
// صيدليات العوضي (Elawadi Pharmacies) - Consultations Queue Controller
// ==========================================================================

let consultsState = {
    searchQuery: "",
    statusFilter: "all",
    contactFilter: "all",
    page: 1,
    pageSize: 15,
    totalCount: 0
};

document.addEventListener("DOMContentLoaded", async () => {
    utils.setupMobileSidebar();

    const isAuthed = await auth.init();
    if (!isAuthed) return;

    notifications.init();
    setupConsultationListeners();
    await loadConsultations();

    window.onNewRealtimeConsultation = () => loadConsultations();
    window.onRealtimeConsultationUpdate = () => loadConsultations();
    window.onLanguageChange = () => loadConsultations();

    // Called by notifications.js when a pending consultation alert is cleared
    // from another tab/page so the mute button disappears.
    window._refreshConsultMuteButtons = () => {
        document.querySelectorAll(".mute-consult-btn").forEach(btn => {
            const consultId = btn.dataset.consultId;
            if (!notifications.isConsultPending(consultId)) {
                btn.style.display = "none";
            }
        });
    };
});

function setupConsultationListeners() {
    const searchInput = document.getElementById("consultationSearchInput");
    const statusSelect = document.getElementById("consultStatusFilter");
    const contactSelect = document.getElementById("consultContactFilter");

    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener("input", (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                consultsState.searchQuery = e.target.value.trim();
                consultsState.page = 1;
                loadConsultations();
            }, 300);
        });
    }

    if (statusSelect) {
        statusSelect.addEventListener("change", (e) => {
            consultsState.statusFilter = e.target.value;
            consultsState.page = 1;
            loadConsultations();
        });
    }

    if (contactSelect) {
        contactSelect.addEventListener("change", (e) => {
            consultsState.contactFilter = e.target.value;
            consultsState.page = 1;
            loadConsultations();
        });
    }
}

function getConsultStatusBadge(status) {
    const s = (status || "new").toLowerCase();
    const map = {
        new: { icon: "fa-sparkles", key: "statusNew", cls: "badge-new" },
        contacted: { icon: "fa-phone", key: "statusContacted", cls: "badge-warning" },
        completed: { icon: "fa-badge-check", key: "statusCompleted", cls: "badge-completed" },
        no_response: { icon: "fa-hourglass-end", key: "statusNoResponse", cls: "badge-cancelled" }
    };
    const cfg = map[s] || map.new;
    return `<span class="badge ${cfg.cls}"><i class="fa-solid ${cfg.icon}"></i> ${i18n.t(cfg.key)}</span>`;
}

function getContactMethodBadge(method) {
    const isPhone = (method || "").toLowerCase() !== "whatsapp";
    if (isPhone) {
        return `<span class="badge badge-confirmed"><i class="fa-solid fa-phone"></i> ${i18n.t("contactPhone")}</span>`;
    }
    return `<span class="badge badge-success"><i class="fa-brands fa-whatsapp"></i> ${i18n.t("contactWhatsapp")}</span>`;
}

async function loadConsultations() {
    const tableBody = document.getElementById("consultationsTableBody");
    const emptyState = document.getElementById("emptyConsultationsState");
    const paginationEl = document.getElementById("consultationsPagination");
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 3rem;">${i18n.t("loadingData")}</td></tr>`;

    try {
        const client = db.getClient();
        let query = client
            .from("consultations")
            .select("id, patient_name, phone, consultation_type, preferred_time, contact_method, details, status, created_at, outcome, outcome_notes", { count: "exact" });

        if (consultsState.searchQuery) {
            const sq = consultsState.searchQuery;
            query = query.or(`patient_name.ilike.%${sq}%,phone.ilike.%${sq}%`);
        }

        if (consultsState.statusFilter && consultsState.statusFilter !== "all") {
            query = query.eq("status", consultsState.statusFilter);
        }

        if (consultsState.contactFilter && consultsState.contactFilter !== "all") {
            query = query.eq("contact_method", consultsState.contactFilter);
        }

        const from = (consultsState.page - 1) * consultsState.pageSize;
        const to = from + consultsState.pageSize - 1;

        query = query.order("created_at", { ascending: false }).range(from, to);

        const { data, error, count } = await query;
        if (error) throw error;

        consultsState.totalCount = count || 0;

        const countBadge = document.getElementById("consultationsCountBadge");
        if (countBadge) countBadge.textContent = `${consultsState.totalCount} ${i18n.t("consultPatient")}`;

        if (!data || data.length === 0) {
            tableBody.innerHTML = "";
            if (emptyState) emptyState.style.display = "block";
            if (paginationEl) paginationEl.innerHTML = "";
            return;
        }

        if (emptyState) emptyState.style.display = "none";

        tableBody.innerHTML = data.map(c => {
            const patient = c.patient_name || "-";
            const phone = c.phone || "-";
            const statusBadge = getConsultStatusBadge(c.status);
            const contactBadge = getContactMethodBadge(c.contact_method);
            const dateStr = utils.formatDate(c.created_at, true);

            const isNew = (c.status || "").toLowerCase() === "new";
            const isPending = notifications.isConsultPending(c.id);
            const muteBtn = (isNew && isPending)
                ? `<button
                        class="btn btn-warning btn-sm mute-consult-btn"
                        data-consult-id="${c.id}"
                        onclick="muteConsultationAlert('${c.id}', this)"
                        title="${i18n.currentLang === 'ar' ? 'كتم تنبيه هذه الاستشارة' : 'Mute alert for this consultation'}"
                        style="display:flex;align-items:center;gap:0.3rem;">
                        <i class="fa-solid fa-bell-slash"></i>
                        <span>${i18n.currentLang === 'ar' ? 'كتم التنبيه' : 'Mute Alert'}</span>
                   </button>`
                : "";

            return `
                <tr ${isNew && isPending ? 'style="background: rgba(34,211,238,0.06);"' : ''}>
                    <td><strong>${patient}</strong></td>
                    <td><a href="tel:${phone}" style="color: var(--primary); font-weight: 600;"><i class="fa-solid fa-phone"></i> ${phone}</a></td>
                    <td>${utils.translateConsultType(c.consultation_type)}</td>
                    <td>${contactBadge}</td>
                    <td>${statusBadge}</td>
                    <td><small style="color: var(--text-muted);">${dateStr}</small></td>
                    <td style="display:flex;gap:0.4rem;align-items:center;flex-wrap:wrap;">
                        <button class="btn btn-outline btn-sm" onclick="openConsultationDetails('${c.id}')">
                            <i class="fa-solid fa-eye"></i> ${i18n.t("actionViewDetails")}
                        </button>
                        ${muteBtn}
                    </td>
                </tr>
            `;
        }).join("");

        renderConsultationPagination(paginationEl);

    } catch (err) {
        console.error("Load consultations error:", err);
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #EF4444; padding: 2rem;">${i18n.t("errorGeneric")}</td></tr>`;
    }
}

function renderConsultationPagination(container) {
    if (!container) return;

    const totalPages = Math.ceil(consultsState.totalCount / consultsState.pageSize) || 1;
    if (totalPages <= 1) {
        container.innerHTML = "";
        return;
    }

    container.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 1rem;">
            <span style="font-size: 0.85rem; color: var(--text-muted);">
                ${i18n.currentLang === "ar"
                    ? `عرض صفحة ${consultsState.page} من ${totalPages} (إجمالي ${consultsState.totalCount} استشارة)`
                    : `Showing page ${consultsState.page} of ${totalPages} (Total ${consultsState.totalCount} consultations)`}
            </span>
            <div style="display: flex; gap: 0.5rem;">
                <button class="btn btn-secondary btn-sm" ${consultsState.page <= 1 ? "disabled" : ""} onclick="changeConsultationsPage(${consultsState.page - 1})">
                    <i class="fa-solid fa-chevron-right"></i>
                </button>
                <button class="btn btn-secondary btn-sm" ${consultsState.page >= totalPages ? "disabled" : ""} onclick="changeConsultationsPage(${consultsState.page + 1})">
                    <i class="fa-solid fa-chevron-left"></i>
                </button>
            </div>
        </div>
    `;
}

function changeConsultationsPage(newPage) {
    consultsState.page = newPage;
    loadConsultations();
}

function muteConsultationAlert(consultId, btn) {
    notifications.removeConsultPendingAlert(String(consultId));

    if (btn) {
        btn.style.opacity = "0";
        btn.style.transform = "scale(0.8)";
        btn.style.transition = "all 0.25s ease";
        setTimeout(() => { btn.style.display = "none"; }, 260);
    }

    const row = btn?.closest("tr");
    if (row) row.style.background = "";

    const label = i18n.currentLang === "ar"
        ? "تم كتم تنبيه الاستشارة"
        : "Alert muted for this consultation";
    utils.showToast(label, "info");
}

// ------------------------------------------------------------------
// Consultation Details Modal (view full info + update status)
// ------------------------------------------------------------------
async function openConsultationDetails(id) {
    try {
        const { data, error } = await db.getClient()
            .from("consultations")
            .select("*")
            .eq("id", id)
            .maybeSingle();

        if (error || !data) {
            utils.showToast(i18n.t("errorGeneric"), "error");
            return;
        }

        let modal = document.getElementById("consultDetailsModal");
        if (!modal) {
            modal = document.createElement("div");
            modal.id = "consultDetailsModal";
            modal.className = "modal-backdrop";
            modal.innerHTML = `
                <div class="modal-card" style="max-width: 600px;">
                    <div class="modal-header">
                        <h4 class="card-title" id="consultModalTitle"></h4>
                        <button class="btn btn-icon btn-sm" onclick="closeConsultModal()"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div class="modal-body" id="consultModalBody"></div>
                    <div class="modal-footer" id="consultModalFooter"></div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        document.getElementById("consultModalTitle").textContent = `${data.patient_name} (${data.phone})`;
        const contactLabel = data.contact_method === "whatsapp" ? i18n.t("contactWhatsapp") : i18n.t("contactPhone");
        document.getElementById("consultModalBody").innerHTML = `
            <div style="display:grid;gap:0.75rem;">
                <p style="margin:0;"><strong>${i18n.t("consultType")}:</strong> ${utils.translateConsultType(data.consultation_type)}</p>
                <p style="margin:0;"><strong>${i18n.t("consultContactMethod")}:</strong> ${contactLabel}</p>
                <p style="margin:0;"><strong>${i18n.t("consultPreferredTime")}:</strong> ${data.preferred_time || "-"}</p>
                <p style="margin:0;"><strong>${i18n.t("consultStatus")}:</strong> ${getConsultStatusBadge(data.status)}</p>
                <p style="margin:0;"><strong>${i18n.t("consultDate")}:</strong> ${utils.formatDate(data.created_at, true)}</p>
                <hr style="border:none;border-top:1px solid var(--border-color);">
                <p style="margin:0;"><strong>${i18n.t("consultDetails")}:</strong></p>
                <p style="margin:0; background: var(--bg-surface-subtle); padding: 0.75rem; border-radius: var(--radius-md); white-space: pre-wrap;">${data.details || "-"}</p>
            </div>
        `;

        const currentStatus = (data.status || "new").toLowerCase();
        const current = (val) => val === currentStatus ? "selected" : "";

        document.getElementById("consultModalFooter").innerHTML = `
            <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;width:100%;">
                <select id="consultStatusSelect" class="form-control" style="flex:1;min-width:150px;">
                    <option value="new" ${current("new")}>${i18n.t("statusNew")}</option>
                    <option value="contacted" ${current("contacted")}>${i18n.t("statusContacted")}</option>
                    <option value="completed" ${current("completed")}>${i18n.t("statusCompleted")}</option>
                    <option value="no_response" ${current("no_response")}>${i18n.t("statusNoResponse")}</option>
                </select>
                <button class="btn btn-primary" onclick="updateConsultationStatus('${data.id}', this)">
                    <i class="fa-solid fa-check"></i> <span>${i18n.t("save")}</span>
                </button>
            </div>
        `;

        modal.classList.add("active");
    } catch (err) {
        console.error("Open consultation details error:", err);
        utils.showToast(i18n.t("errorGeneric"), "error");
    }
}

function closeConsultModal() {
    const modal = document.getElementById("consultDetailsModal");
    if (modal) modal.classList.remove("active");
}

async function updateConsultationStatus(id, btn) {
    const select = document.getElementById("consultStatusSelect");
    if (!select) return;

    const newStatus = select.value;
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';

    try {
        const { error } = await db.getClient()
            .from("consultations")
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq("id", id);

        if (error) throw error;

        // Clearing the alert if it leaves "new"
        if (newStatus !== "new") {
            notifications.removeConsultPendingAlert(String(id));
        } else {
            notifications.addConsultPendingAlert(String(id));
        }

        utils.showToast(i18n.t("consultStatusUpdateSuccess") || "تم تحديث حالة الاستشارة بنجاح", "success");
        closeConsultModal();
        loadConsultations();
    } catch (err) {
        console.error("Update consultation status error:", err);
        utils.showToast(i18n.t("errorGeneric"), "error");
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
}
