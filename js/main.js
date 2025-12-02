// Main Application Class
class PrimeMarApp {
    constructor() {
        this.supabaseUrl = 'https://bytqghigktrfzkcpczjt.supabase.co';
        this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5dHFnaGlna3RyZnprY3Bjemp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4Mjk4NDcsImV4cCI6MjA3OTQwNTg0N30.PwLcIduavNinb3PflJ9bwVzNC-FCbvq2zqbKymfGwU';
        this.supabase = null;
        this.socket = null;
        this.currentUser = null;
        this.userProfile = null;
        this.isDarkMode = true;
        this.currentPage = 'homePage';
        
        this.init();
    }

    async init() {
        try {
            // Initialize Supabase
            this.supabase = supabase.createClient(this.supabaseUrl, this.supabaseKey);
            
            // Initialize Socket.io
            this.initSocket();
            
            // Load theme preference
            this.loadThemePreference();
            
            // Check for existing session
            const { data: { session } } = await this.supabase.auth.getSession();
            
            if (session) {
                this.currentUser = session.user;
                await this.loadUserProfile();
                this.showApp();
                await this.loadInitialData();
            } else {
                this.showAuth();
            }
            
            this.setupEventListeners();
            
            // Listen for auth state changes
            this.supabase.auth.onAuthStateChange(async (event, session) => {
                if (event === 'SIGNED_IN' && session) {
                    this.currentUser = session.user;
                    await this.loadUserProfile();
                    this.showApp();
                    await this.loadInitialData();
                    
                    // Connect socket with user ID
                    if (this.socket) {
                        this.socket.emit('user-connected', this.currentUser.id);
                    }
                } else if (event === 'SIGNED_OUT') {
                    this.currentUser = null;
                    this.showAuth();
                    
                    // Disconnect socket
                    if (this.socket) {
                        this.socket.disconnect();
                    }
                }
            });
            
            // Register service worker for PWA
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/service-worker.js');
            }
            
        } catch (error) {
            console.error('Initialization error:', error);
            this.showToast('Failed to initialize app', 'error');
        }
    }

    initSocket() {
        this.socket = io('https://primemar-socket-server.onrender.com', {
            transports: ['websocket', 'polling']
        });

        this.socket.on('connect', () => {
            console.log('Socket connected');
        });

        this.socket.on('new-message', (message) => {
            if (messages) {
                messages.handleNewMessage(message);
            }
        });

        this.socket.on('new-notification', (notification) => {
            if (notifications) {
                notifications.handleNewNotification(notification);
            }
        });

        this.socket.on('call-request', (data) => {
            if (calls) {
                calls.handleIncomingCall(data);
            }
        });

        this.socket.on('call-accepted', (data) => {
            if (calls) {
                calls.handleCallAccepted(data);
            }
        });

        this.socket.on('call-rejected', () => {
            if (calls) {
                calls.handleCallRejected();
            }
        });

        this.socket.on('call-ended', () => {
            if (calls) {
                calls.handleCallEnded();
            }
        });
    }

    async loadUserProfile() {
        if (!this.currentUser) return;

        try {
            const { data: profile, error } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('id', this.currentUser.id)
                .single();

            if (error) {
                // Create profile if doesn't exist
                const newProfile = {
                    id: this.currentUser.id,
                    name: this.currentUser.user_metadata?.full_name || this.currentUser.email?.split('@')[0],
                    username: this.currentUser.user_metadata?.username || 
                             this.currentUser.email?.split('@')[0].toLowerCase(),
                    email: this.currentUser.email,
                    bio: '',
                    avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(this.currentUser.email?.split('@')[0])}&background=ff9800&color=fff&size=256`,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                const { data: createdProfile, error: createError } = await this.supabase
                    .from('profiles')
                    .insert([newProfile])
                    .select()
                    .single();

                if (createError) throw createError;
                this.userProfile = createdProfile;
            } else {
                this.userProfile = profile;
            }

            this.updateProfileUI();
        } catch (error) {
            console.error('Error loading profile:', error);
            this.showToast('Error loading profile', 'error');
        }
    }

    async loadInitialData() {
        try {
            await Promise.all([
                stories.loadStories(),
                posts.loadFeed(),
                messages.loadConversations(),
                notifications.loadNotifications()
            ]);
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    loadThemePreference() {
        const savedTheme = localStorage.getItem('primemar-theme');
        if (savedTheme === 'light') {
            this.toggleTheme(false);
        }
    }

    toggleTheme(showToast = true) {
        this.isDarkMode = !this.isDarkMode;
        
        if (this.isDarkMode) {
            document.body.classList.remove('light-mode');
            localStorage.setItem('primemar-theme', 'dark');
        } else {
            document.body.classList.add('light-mode');
            localStorage.setItem('primemar-theme', 'light');
        }
        
        if (showToast) {
            this.showToast(`${this.isDarkMode ? 'Dark' : 'Light'} mode enabled`, 'info');
        }
    }

    showAuth() {
        document.getElementById('authModal').classList.remove('hidden');
        document.getElementById('appContainer').classList.add('hidden');
    }

    showApp() {
        document.getElementById('authModal').classList.add('hidden');
        document.getElementById('appContainer').classList.remove('hidden');
    }

    showPage(pageId) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        document.getElementById(pageId).classList.add('active');
        this.currentPage = pageId;
        
        document.querySelectorAll('.nav-item').forEach(nav => {
            nav.classList.remove('active');
            if (nav.dataset.page === pageId) {
                nav.classList.add('active');
            }
        });
        
        this.hideProfileDropdown();
        
        // Load page-specific data
        switch(pageId) {
            case 'searchPage':
                this.initSearchPage();
                break;
            case 'messagesPage':
                messages.loadConversations();
                break;
            case 'notificationsPage':
                notifications.loadNotifications();
                break;
            case 'profilePage':
                profile.loadProfile(this.currentUser.id);
                break;
        }
    }

    initSearchPage() {
        const tabs = ['all', 'users', 'posts', 'groups', 'communities'];
        const tabNames = ['All', 'Users', 'Posts', 'Groups', 'Communities'];
        
        const tabsContainer = document.getElementById('searchTabs');
        tabsContainer.innerHTML = tabs.map((tab, index) => `
            <div class="search-tab ${tab === 'all' ? 'active' : ''}" data-type="${tab}">${tabNames[index]}</div>
        `).join('');
        
        document.getElementById('searchPageInput').value = '';
        document.getElementById('searchResultsFull').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>Search for users, posts, groups and communities</h3>
                <p>Start typing to see results</p>
            </div>
        `;
    }

    updateProfileUI() {
        if (!this.userProfile) return;

        const avatar = this.userProfile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(this.userProfile.name)}&background=ff9800&color=fff&size=256`;
        
        // Update header avatar
        const headerAvatar = document.getElementById('headerAvatar');
        headerAvatar.src = avatar;
        headerAvatar.onerror = () => {
            headerAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(this.userProfile.name)}&background=ff9800&color=fff&size=256`;
        };
        
        // Update profile avatar
        const profileAvatar = document.getElementById('profileAvatarImg');
        profileAvatar.src = avatar;
        profileAvatar.onerror = () => {
            profileAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(this.userProfile.name)}&background=ff9800&color=fff&size=256`;
        };
    }

    async search(query) {
        if (!query.trim()) return;

        try {
            const searchType = document.querySelector('.search-tab.active')?.dataset.type || 'all';
            let results = { users: [], posts: [], groups: [], communities: [] };

            if (searchType === 'all' || searchType === 'users') {
                const { data: users } = await this.supabase
                    .from('profiles')
                    .select('id, name, username, avatar_url, bio')
                    .or(`name.ilike.%${query}%,username.ilike.%${query}%`)
                    .limit(10);
                results.users = users || [];
            }

            if (searchType === 'all' || searchType === 'posts') {
                const { data: posts } = await this.supabase
                    .from('posts')
                    .select(`
                        *,
                        profiles:author_id (name, username, avatar_url)
                    `)
                    .ilike('content', `%${query}%`)
                    .limit(10);
                results.posts = posts || [];
            }

            if (searchType === 'all' || searchType === 'groups') {
                const { data: groups } = await this.supabase
                    .from('groups')
                    .select('*')
                    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
                    .limit(10);
                results.groups = groups || [];
            }

            if (searchType === 'all' || searchType === 'communities') {
                const { data: communities } = await this.supabase
                    .from('communities')
                    .select('*')
                    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
                    .limit(10);
                results.communities = communities || [];
            }

            this.renderSearchResults(results, searchType);
        } catch (error) {
            console.error('Search error:', error);
            this.showToast('Search failed', 'error');
        }
    }

    renderSearchResults(results, type) {
        const container = document.getElementById('searchResultsFull');
        
        let html = '';
        
        if (type === 'all' || type === 'users') {
            if (results.users.length > 0) {
                html += `
                    <div class="search-section">
                        <h3 class="search-section-title">Users</h3>
                        ${results.users.map(user => `
                            <div class="search-result-item" onclick="app.viewUser('${user.id}')">
                                <img src="${user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=ff9800&color=fff&size=256`}" 
                                     alt="${user.name}" class="search-result-avatar">
                                <div class="search-result-info">
                                    <div class="search-result-name">${user.name}</div>
                                    <div class="search-result-username">@${user.username}</div>
                                    ${user.bio ? `<div class="search-result-bio">${user.bio.substring(0, 100)}${user.bio.length > 100 ? '...' : ''}</div>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        }
        
        if (type === 'all' || type === 'posts') {
            if (results.posts.length > 0) {
                html += `
                    <div class="search-section">
                        <h3 class="search-section-title">Posts</h3>
                        ${results.posts.map(post => `
                            <div class="search-result-post" onclick="app.viewPost('${post.id}')">
                                <div class="post-header">
                                    <img src="${post.profiles.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.profiles.name)}&background=ff9800&color=fff&size=256`}" 
                                         alt="${post.profiles.name}" class="post-avatar">
                                    <div class="post-user-info">
                                        <div class="post-username">${post.profiles.name}</div>
                                        <div class="post-handle">@${post.profiles.username}</div>
                                    </div>
                                </div>
                                <div class="post-content">${post.content}</div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        }
        
        if (type === 'all' || type === 'groups') {
            if (results.groups.length > 0) {
                html += `
                    <div class="search-section">
                        <h3 class="search-section-title">Groups</h3>
                        <div class="groups-grid">
                            ${results.groups.map(group => `
                                <div class="group-card" onclick="app.viewGroup('${group.id}')">
                                    <div class="group-avatar">${group.name.charAt(0)}</div>
                                    <div class="group-info">
                                        <div class="group-name">${group.name}</div>
                                        <div class="group-members">${group.privacy_type}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
        }
        
        if (type === 'all' || type === 'communities') {
            if (results.communities.length > 0) {
                html += `
                    <div class="search-section">
                        <h3 class="search-section-title">Communities</h3>
                        <div class="communities-grid">
                            ${results.communities.map(community => `
                                <div class="community-card" onclick="app.viewCommunity('${community.id}')">
                                    <div class="community-avatar">${community.name.charAt(0)}</div>
                                    <div class="community-info">
                                        <div class="community-name">${community.name}</div>
                                        <div class="community-type">${community.privacy_type}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
        }
        
        if (!html) {
            html = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>No results found</h3>
                    <p>Try different search terms</p>
                </div>
            `;
        }
        
        container.innerHTML = html;
    }

    viewUser(userId) {
        this.showPage('profilePage');
        profile.loadProfile(userId);
    }

    viewPost(postId) {
        posts.viewPost(postId);
    }

    viewGroup(groupId) {
        window.location.href = `group.html?id=${groupId}`;
    }

    viewCommunity(communityId) {
        window.location.href = `community.html?id=${communityId}`;
    }

    showModal(modalId) {
        document.getElementById(modalId).classList.remove('hidden');
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.add('hidden');
    }

    toggleProfileDropdown() {
        document.getElementById('profileDropdown').classList.toggle('active');
    }

    hideProfileDropdown() {
        document.getElementById('profileDropdown').classList.remove('active');
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        const container = document.getElementById('toastContainer');
        container.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    setupEventListeners() {
        // Profile dropdown
        document.getElementById('profileBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleProfileDropdown();
        });

        // Theme toggle
        document.getElementById('themeToggleBtn').addEventListener('click', () => {
            this.toggleTheme();
            this.hideProfileDropdown();
        });

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                this.showPage(item.dataset.page);
            });
        });

        // Search input
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.search(e.target.value);
        });

        document.getElementById('searchPageInput').addEventListener('input', (e) => {
            this.search(e.target.value);
        });

        // Search tabs
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('search-tab')) {
                document.querySelectorAll('.search-tab').forEach(tab => {
                    tab.classList.remove('active');
                });
                e.target.classList.add('active');
                const query = document.getElementById('searchPageInput').value;
                if (query) {
                    this.search(query);
                }
            }
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', () => {
            this.hideProfileDropdown();
        });

        // Handle back button
        window.addEventListener('popstate', () => {
            this.handleBackButton();
        });
    }

    handleBackButton() {
        if (this.currentPage !== 'homePage') {
            this.showPage('homePage');
        }
    }
}

// Export for global access
window.PrimeMarApp = PrimeMarApp;