// ==========================================================================
// صيدليات العوضي (Elawadi Pharmacies) - Authentication & Profile Guard
// ==========================================================================

class AuthService {
    constructor() {
        this.user = null;
        this.profile = null;
        this.branch = null;
    }

    /**
     * Initializes auth state, checks session, fetches user profile
     * @param {boolean} isLoginPage - Whether the current page is login.html
     */
    async init(isLoginPage = false) {
        try {
            const { data: { session }, error } = await db.getClient().auth.getSession();

            if (error || !session) {
                if (!isLoginPage) {
                    window.location.href = "login.html";
                }
                return false;
            }

            this.user = session.user;
            await this.loadUserProfile();

            // If profile is inactive, force sign out
            if (this.profile && !this.profile.is_active) {
                await this.signOut();
                alert(i18n.t("inactiveAccountError"));
                window.location.href = "login.html";
                return false;
            }

            if (isLoginPage) {
                window.location.href = "dashboard.html";
                return true;
            }

            this.renderUserUI();
            this.enforceRolePermissions();
            return true;
        } catch (err) {
            console.error("Auth initialization error:", err);
            if (!isLoginPage) window.location.href = "login.html";
            return false;
        }
    }

    async loadUserProfile() {
        if (!this.user) return;

        try {
            const { data, error } = await db.getClient()
                .from("profiles")
                .select("*, branches(name_ar, name_en)")
                .eq("id", this.user.id)
                .maybeSingle();

            if (error) {
                console.warn("Could not load profile:", error);
                // Fallback default admin profile if profiles table not populated yet
                this.profile = {
                    id: this.user.id,
                    full_name: this.user.email.split("@")[0],
                    role: "admin",
                    is_active: true
                };
            } else if (data) {
                this.profile = data;
                this.branch = data.branches || null;
            } else {
                // If user exists in Auth but profile not seeded, default to admin for initial setup
                this.profile = {
                    id: this.user.id,
                    full_name: this.user.email.split("@")[0],
                    role: "admin",
                    is_active: true
                };
            }
        } catch (err) {
            console.error("Error loading user profile:", err);
        }
    }

    async signIn(email, password) {
        try {
            const { data, error } = await db.getClient().auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            this.user = data.user;
            await this.loadUserProfile();

            if (this.profile && !this.profile.is_active) {
                await this.signOut();
                throw new Error(i18n.t("inactiveAccountError"));
            }

            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    async signOut() {
        try {
            await db.getClient().auth.signOut();
        } catch (e) {
            console.error("Sign out error:", e);
        } finally {
            this.user = null;
            this.profile = null;
            window.location.href = "login.html";
        }
    }

    isAdmin() {
        return this.profile?.role === "admin";
    }

    isPharmacist() {
        return this.profile?.role === "pharmacist";
    }

    getUserBranchId() {
        return this.profile?.branch_id || null;
    }

    renderUserUI() {
        if (!this.profile) return;

        // Sidebar user info
        const userNameEl = document.getElementById("sidebarUserName");
        const userRoleEl = document.getElementById("sidebarUserRole");
        const userAvatarEl = document.getElementById("sidebarUserAvatar");

        if (userNameEl) userNameEl.textContent = this.profile.full_name || this.user.email;
        if (userRoleEl) userRoleEl.textContent = this.isAdmin() ? i18n.t("roleAdmin") : i18n.t("rolePharmacist");
        if (userAvatarEl) {
            const initial = (this.profile.full_name || this.user.email || "U").charAt(0).toUpperCase();
            userAvatarEl.textContent = initial;
        }

        // Topbar Branch Badge
        const branchBadge = document.getElementById("topbarBranchIndicator");
        if (branchBadge) {
            if (this.isAdmin()) {
                branchBadge.innerHTML = `<i class="fa-solid fa-hospital"></i> <span>${i18n.t("branchAll")}</span>`;
            } else if (this.branch) {
                const bName = i18n.currentLang === "en" ? (this.branch.name_en || this.branch.name_ar) : this.branch.name_ar;
                branchBadge.innerHTML = `<i class="fa-solid fa-store"></i> <span>${bName}</span>`;
            } else {
                branchBadge.innerHTML = `<i class="fa-solid fa-store"></i> <span>${i18n.t("branchAssigned")}</span>`;
            }
        }
    }

    enforceRolePermissions() {
        if (this.isPharmacist()) {
            // Hide Admin-only navigation links AND any other admin-only
            // controls on the page (e.g. top-level "add new" buttons)
            document.querySelectorAll(".admin-only-nav, .admin-only").forEach(el => el.style.display = "none");

            // Block direct URL access to any admin-only page, not just
            // the ones that happen to have a hidden nav link — a pharmacist
            // typing the URL manually must be bounced too.
            const adminOnlyPages = [
                "staff.html",
                "reports.html",
                "settings.html"
            ];

            const currentPage = window.location.pathname.split("/").pop();
            if (adminOnlyPages.includes(currentPage)) {
                window.location.href = "orders.html";
            }
        }
    }
}

// Global Singleton
const auth = new AuthService();
