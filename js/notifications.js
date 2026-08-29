// ==========================================================================
// صيدليات العوضي (Elawadi Pharmacies) - Realtime Notifications
// ==========================================================================

class NotificationManager {
    constructor() {
        this.unreadCount = 0;
        this.notifications = [];
        this.channel = null;
    }

    init() {
        this.setupRealtimeSubscription();
        this.setupAudioPermissionCheck();
    }

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
            
            // Audio chime & Toast
            utils.playNotificationSound();
            const customerName = order.customer_name || i18n.t("customer");
            const tracking = order.tracking_code || `#${order.id}`;
            utils.showToast(`🔔 ${i18n.t("newOrderAlert")} (${tracking} - ${customerName})`, "info");

            // Trigger active page refresh if applicable
            if (typeof window.onNewRealtimeOrder === "function") {
                window.onNewRealtimeOrder(order);
            }
        } else if (payload.eventType === "UPDATE") {
            const order = payload.new;
            if (typeof window.onRealtimeOrderUpdate === "function") {
                window.onRealtimeOrderUpdate(order);
            }
        }
    }

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
