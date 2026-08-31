// ==========================================================================
// صيدليات العوضي (Elawadi Pharmacies) - Realtime Notifications
// ==========================================================================

const PENDING_ALERTS_KEY = "elawadi_pending_alerts";
const ALERT_INTERVAL_MS  = 5000; // ring every 5 seconds while orders are pending

class NotificationManager {
    constructor() {
        this.unreadCount   = 0;
        this.notifications = [];
        this.channel       = null;

        // Set of order IDs (strings) that still need pharmacist action
        this.pendingAlerts = new Set();

        // Reference to the repeating interval
        this._alertInterval = null;
    }

    // ------------------------------------------------------------------
    // Initialisation
    // ------------------------------------------------------------------
    init() {
        this._loadPendingFromStorage();
        this.setupRealtimeSubscription();
        this.setupAudioPermissionCheck();

        // If there were already pending alerts (e.g. page was refreshed),
        // restart the loop immediately so the pharmacist keeps hearing it.
        if (this.pendingAlerts.size > 0) {
            this.startAlertLoop();
        }
    }

    // ------------------------------------------------------------------
    // Realtime channel
    // ------------------------------------------------------------------
    setupRealtimeSubscription() {
        try {
            const client = db.getClient();
            if (!client) return;

            this.channel = client
                .channel("pharmacy-dashboard-orders")
                .on(
                    "postgres_changes",
                    { event: "*", schema: "public", table: "orders" },
                    (payload) => this.handleOrderEvent(payload)
                )
                .subscribe();

            console.log("Supabase Realtime notification channel subscribed.");
        } catch (err) {
            console.error("Realtime subscription error:", err);
        }
    }

    handleOrderEvent(payload) {
        console.log("Realtime order payload:", payload);

        if (payload.eventType === "INSERT") {
            const order = payload.new;
            this.unreadCount++;
            this.updateBadgeUI();

            // Register this order as pending → start persistent ringing
            this.addPendingAlert(String(order.id));

            // Toast notification
            const customerName = order.customer_name || i18n.t("customer");
            const tracking     = order.tracking_code  || `#${order.id}`;
            utils.showToast(
                `🔔 ${i18n.t("newOrderAlert")} (${tracking} - ${customerName})`,
                "info"
            );

            // Trigger active page refresh if applicable
            if (typeof window.onNewRealtimeOrder === "function") {
                window.onNewRealtimeOrder(order);
            }

        } else if (payload.eventType === "UPDATE") {
            const order = payload.new;

            // If an order that was pending just moved away from "new",
            // it means another tab / device confirmed or cancelled it.
            if (order.status && order.status !== "new") {
                this.removePendingAlert(String(order.id));
            }

            if (typeof window.onRealtimeOrderUpdate === "function") {
                window.onRealtimeOrderUpdate(order);
            }
        }
    }

    // ------------------------------------------------------------------
    // Persistent alert loop
    // ------------------------------------------------------------------

    /**
     * Adds an order ID to the pending set, persists to localStorage,
     * and kicks off the repeating alert loop (if not already running).
     */
    addPendingAlert(orderId) {
        this.pendingAlerts.add(String(orderId));
        this._savePendingToStorage();
        this.startAlertLoop();
    }

    /**
     * Removes an order ID from the pending set (pharmacist took action
     * or tapped the per-row mute button). Stops the loop if no more
     * orders are waiting.
     */
    removePendingAlert(orderId) {
        this.pendingAlerts.delete(String(orderId));
        this._savePendingToStorage();
        if (this.pendingAlerts.size === 0) {
            this.stopAlertLoop();
        }
        // Re-render the orders table row mute button if we are on that page
        if (typeof window._refreshOrderMuteButtons === "function") {
            window._refreshOrderMuteButtons();
        }
    }

    /** Returns true if the given order ID is still awaiting action. */
    isPending(orderId) {
        return this.pendingAlerts.has(String(orderId));
    }

    /**
     * Starts the repeating sound interval.
     * Plays one chime immediately, then every ALERT_INTERVAL_MS ms.
     */
    startAlertLoop() {
        // Play once right away so the pharmacist hears it immediately
        utils.playNotificationSound();

        if (this._alertInterval) return; // already running

        this._alertInterval = setInterval(() => {
            if (this.pendingAlerts.size === 0) {
                this.stopAlertLoop();
                return;
            }
            utils.playNotificationSound();
        }, ALERT_INTERVAL_MS);
    }

    /** Clears the repeating interval. */
    stopAlertLoop() {
        if (this._alertInterval) {
            clearInterval(this._alertInterval);
            this._alertInterval = null;
        }
    }

    // ------------------------------------------------------------------
    // localStorage persistence
    // ------------------------------------------------------------------
    _loadPendingFromStorage() {
        try {
            const raw = localStorage.getItem(PENDING_ALERTS_KEY);
            if (raw) {
                const arr = JSON.parse(raw);
                if (Array.isArray(arr)) {
                    arr.forEach(id => this.pendingAlerts.add(String(id)));
                }
            }
        } catch (e) {
            console.warn("Could not load pending alerts from storage:", e);
        }
    }

    _savePendingToStorage() {
        try {
            localStorage.setItem(
                PENDING_ALERTS_KEY,
                JSON.stringify([...this.pendingAlerts])
            );
        } catch (e) {
            console.warn("Could not save pending alerts to storage:", e);
        }
    }

    // ------------------------------------------------------------------
    // Badge UI
    // ------------------------------------------------------------------
    updateBadgeUI() {
        // Topbar red dot
        const dot = document.getElementById("topbarNotificationDot");
        if (dot) {
            if (this.unreadCount > 0) dot.classList.add("show");
            else dot.classList.remove("show");
        }

        // Sidebar orders badge
        const navBadge = document.getElementById("sidebarOrdersBadge");
        if (navBadge) {
            if (this.unreadCount > 0) {
                navBadge.textContent = this.unreadCount;
                navBadge.classList.add("show");
            } else {
                navBadge.classList.remove("show");
            }
        }
    }

    clearUnread() {
        this.unreadCount = 0;
        this.updateBadgeUI();
    }

    // ------------------------------------------------------------------
    // Audio permission banner
    // ------------------------------------------------------------------
    setupAudioPermissionCheck() {
        const audioBanner = document.getElementById("audioPermissionBanner");
        if (!audioBanner) return;

        if (localStorage.getItem("elawadi_sound_enabled") === "true") {
            audioBanner.style.display = "none";
        }
    }

    enableAudio() {
        localStorage.setItem("elawadi_sound_enabled", "true");
        utils.playNotificationSound();
        utils.showToast(i18n.t("soundEnabled"), "success");

        const audioBanner = document.getElementById("audioPermissionBanner");
        if (audioBanner) audioBanner.style.display = "none";
    }
}

// Global Singleton
const notifications = new NotificationManager();
