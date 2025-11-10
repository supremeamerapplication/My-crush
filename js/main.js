// Main Application Class
class PrimeMar {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.userProfile = null;
        this.activePage = 'homePage';
        this.components = {};
        
        this.SUPABASE_URL = 'https://qsiwjjqxpegfmgkmtjje.supabase.co';
        this.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzaXdqanF4cGVnZm1na210amplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1NDU2MTYsImV4cCI6MjA3ODEyMTYxNn0.iZ5YLVdeZP0VOm_Qu8XBOfBa9hmyEqHl520q5hZd1z8';
        
        this.init();
    }

    async init() {
        try {
            console.log('🚀 Starting PrimeMar...');
            
            // Initialize Supabase
            this.supabase = supabase.createClient(this.SUPABASE_URL, this.SUPABASE_ANON_KEY);
            
            // Load components
            await this.loadComponents();
            
            // Check auth status
            const { data: { session } } = await this.supabase.auth.getSession();
            
            if (session) {
                this.currentUser = session.user;
                await this.loadUserProfile();
                this.showApp();
                await this.loadActivePage();
                this.setupRealtimeSubscriptions();
            } else {
                this.showAuthModal();
            }
            
            this.setupGlobalEventListeners();
            Utils.updateUI();
            
        } catch (error) {
            console.error('Initialization error:', error);
            this.showAuthModal();
        }
    }

    async loadComponents() {
        // Load components
        this.components = {
            auth: new AuthComponent(this),
            header: new HeaderComponent(this),
            nav: new NavComponent(this),
            home: new HomeComponent(this),
            messages: new MessagesComponent(this),
            profile: new ProfileComponent(this),
            calls: new CallsComponent(this),
            modals: new ModalsComponent(this)
        };

        // Render static components
        await this.renderComponents();
    }

    async renderComponents() {
        // Render auth component
        document.getElementById('auth-container').innerHTML = this.components.auth.render();
        
        // Render header
        document.getElementById('header-container').innerHTML = this.components.header.render();
        
        // Render navigation
        document.getElementById('nav-container').innerHTML = this.components.nav.render();
        
        // Render modals
        document.getElementById('modals-container').innerHTML = this.components.modals.render();
    }

    setupGlobalEventListeners() {
        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            const dropdown = document.getElementById('navDropdown');
            if (dropdown) dropdown.classList.remove('show');
        });

        // Navigation event delegation
        document.addEventListener('click', (e) => {
            if (e.target.closest('.nav-item')) {
                const navItem = e.target.closest('.nav-item');
                const pageId = navItem.dataset.page;
                if (pageId) {
                    this.showPage(pageId);
                    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                    navItem.classList.add('active');
                }
            }

            if (e.target.closest('.nav-dropdown-item')) {
                const dropdownItem = e.target.closest('.nav-dropdown-item');
                const pageId = dropdownItem.dataset.page;
                if (pageId) {
                    this.showPage(pageId);
                }
            }
        });
    }

    async loadUserProfile() {
        if (!this.currentUser) return;

        const { data, error } = await this.supabase
            .from('profiles')
            .select('*')
            .eq('id', this.currentUser.id)
            .single();

        if (!error && data) {
            this.userProfile = data;
            this.components.header.updateUserInfo(data);
        }
    }

    showAuthModal() {
        document.getElementById('authModal').classList.add('active');
        document.getElementById('appContainer').classList.add('hidden');
    }

    showApp() {
        document.getElementById('authModal').classList.remove('active');
        document.getElementById('appContainer').classList.remove('hidden');
    }

    async showPage(pageId) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        
        // Show target page
        document.getElementById(pageId).classList.add('active');
        this.activePage = pageId;

        // Load page-specific content
        await this.loadActivePage();
    }

    async loadActivePage() {
        switch (this.activePage) {
            case 'homePage':
                await this.components.home.load();
                break;
            case 'messagesPage':
                await this.components.messages.load();
                break;
            case 'profilePage':
                await this.components.profile.load();
                break;
            case 'searchPage':
                await this.loadSearchPage();
                break;
            case 'notificationsPage':
                await this.loadNotificationsPage();
                break;
            case 'settingsPage':
                await this.loadSettingsPage();
                break;
        }
    }

    async loadSearchPage() {
        const container = document.getElementById('searchPage');
        container.innerHTML = `
            <div class="search-input-container">
                <i class="fas fa-search search-icon"></i>
                <input type="text" class="search-input" placeholder="Search PrimeMar" id="searchInput">
            </div>
            <div class="p-3">
                <h3>People</h3>
                <div id="peopleContainer"></div>
            </div>
        `;

        // Add search event listener
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.components.profile.searchUsers(e.target.value);
        });
    }

    async loadNotificationsPage() {
        const container = document.getElementById('notificationsPage');
        container.innerHTML = `
            <div class="p-3">
                <h3>Notifications</h3>
                <div id="notificationsContainer">
                    <div class="loading">
                        <i class="fas fa-spinner fa-spin"></i> Loading notifications...
                    </div>
                </div>
            </div>
        `;

        await this.loadNotifications();
    }

    async loadSettingsPage() {
        const container = document.getElementById('settingsPage');
        container.innerHTML = `
            <div class="p-3">
                <h3>Settings</h3>
                <div class="settings-section">
                    <h4>Account Settings</h4>
                    <div class="settings-item">
                        <div class="settings-item-content">
                            <div class="settings-item-title">Update Password</div>
                            <div class="settings-item-description">Change your account password</div>
                        </div>
                        <button class="action-btn" id="updatePasswordBtn">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                    <div class="settings-item">
                        <div class="settings-item-content">
                            <div class="settings-item-title">Add Recovery Email</div>
                            <div class="settings-item-description">Add additional email for security</div>
                        </div>
                        <button class="action-btn" id="addEmailBtn">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>

                <div class="settings-section">
                    <h4>Privacy</h4>
                    <div class="settings-item">
                        <div class="settings-item-content">
                            <div class="settings-item-title">Private Account</div>
                            <div class="settings-item-description">Only approved followers can see your posts</div>
                        </div>
                        <label class="toggle-switch">
                            <input type="checkbox" id="privateAccountToggle">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                </div>
            </div>
        `;

        this.setupSettingsEventListeners();
    }

    setupSettingsEventListeners() {
        document.getElementById('updatePasswordBtn').addEventListener('click', () => {
            document.getElementById('securityModal').classList.add('active');
        });

        document.getElementById('addEmailBtn').addEventListener('click', () => {
            document.getElementById('securityModal').classList.add('active');
        });
    }

    async loadNotifications() {
        const { data: notifications } = await this.supabase
            .from('notifications')
            .select(`
                *,
                profiles:source_user_id (name, avatar)
            `)
            .eq('user_id', this.currentUser.id)
            .order('created_at', { ascending: false })
            .limit(50);

        const container = document.getElementById('notificationsContainer');
        
        if (notifications && notifications.length > 0) {
            container.innerHTML = notifications.map(notification => `
                <div class="notification">
                    <img src="${notification.profiles.avatar}" class="notification-avatar">
                    <div class="notification-content">
                        <div>${notification.message}</div>
                        <div class="notification-time">${Utils.formatTime(notification.created_at)}</div>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="p-3 text-center">No notifications yet</div>';
        }
    }

    setupRealtimeSubscriptions() {
        // Subscribe to notifications
        this.supabase
            .channel('notifications')
            .on('postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'notifications' },
                (payload) => {
                    if (payload.new.user_id === this.currentUser.id) {
                        this.loadNotifications();
                    }
                }
            )
            .subscribe();
    }

    async logout() {
        await this.supabase.auth.signOut();
        this.currentUser = null;
        this.userProfile = null;
        this.showAuthModal();
        Utils.showToast('Signed out successfully');
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.primeMarApp = new PrimeMar();
});