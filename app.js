class TwitterClone {
    constructor() {
        this.tweets = [];
        this.users = [];
        this.currentUser = null;
        this.maxChars = 280;
        this.usingAppwrite = false;
        
        // Appwrite Configuration
        this.appwrite = {
            endpoint: 'https://nyc.cloud.appwrite.io/v1',
            projectId: '68d703340006625f81ab',
            databaseId: '68d703b100171300608e',
            collections: {
                users: 'users',
                tweets: 'tweets',
                likes: 'likes',
                follows: 'follows'
            }
        };
        
        this.init();
    }

    async init() {
        try {
            console.log('🚀 Starting Twitter Clone initialization...');
            
            // Check if Appwrite SDK is available
            if (typeof Appwrite === 'undefined') {
                throw new Error('Appwrite SDK not loaded. Please check the script tag.');
            }
            
            console.log('📦 Appwrite SDK loaded successfully');
            
            await this.initializeAppwrite();
            await this.checkAuthStatus();
            this.setupEventListeners();
            this.updateUI();
            
            console.log('✅ App initialized successfully');
        } catch (error) {
            console.error('❌ Initialization error:', error);
            this.showError('Failed to initialize app: ' + error.message);
            // Show auth modal even if initialization fails
            this.showAuthModal();
        }
    }

    async initializeAppwrite() {
        try {
            console.log('🔧 Initializing Appwrite...');
            
            // Check if Appwrite classes are available
            if (!Appwrite.Client || !Appwrite.Account || !Appwrite.Databases) {
                throw new Error('Appwrite SDK classes not available');
            }

            // Initialize Appwrite client
            this.client = new Appwrite.Client();
            this.client
                .setEndpoint(this.appwrite.endpoint)
                .setProject(this.appwrite.projectId);

            // Initialize Appwrite services
            this.account = new Appwrite.Account(this.client);
            this.databases = new Appwrite.Databases(this.client);
            this.realtime = new Appwrite.Realtime(this.client);

            console.log('🔌 Testing Appwrite connection...');
            
            // Test connection by making a simple API call
            try {
                await this.account.get();
                this.usingAppwrite = true;
                console.log('✅ Appwrite connected successfully');
            } catch (authError) {
                // If we get here, the connection works but no user is logged in
                this.usingAppwrite = true;
                console.log('✅ Appwrite connected (no active session)');
            }

        } catch (error) {
            console.error('❌ Appwrite initialization failed:', error);
            console.log('🔄 Switching to local storage mode...');
            this.usingAppwrite = false;
            this.setupLocalStorage();
            this.showToast('Running in offline mode');
        }
    }

    setupLocalStorage() {
        console.log('💾 Setting up local storage fallback...');
        
        // Initialize local storage data structure
        if (!localStorage.getItem('twitterUsers')) {
            localStorage.setItem('twitterUsers', JSON.stringify([]));
        }
        if (!localStorage.getItem('twitterTweets')) {
            localStorage.setItem('twitterTweets', JSON.stringify([]));
        }
        if (!localStorage.getItem('twitterLikes')) {
            localStorage.setItem('twitterLikes', JSON.stringify([]));
        }
        
        this.users = JSON.parse(localStorage.getItem('twitterUsers') || '[]');
        this.tweets = JSON.parse(localStorage.getItem('twitterTweets') || '[]');
        
        console.log('✅ Local storage initialized with', this.users.length, 'users and', this.tweets.length, 'tweets');
    }

    async checkAuthStatus() {
        try {
            if (this.usingAppwrite) {
                console.log('🔐 Checking Appwrite auth status...');
                const user = await this.account.get();
                this.currentUser = user;
                console.log('✅ User authenticated:', user.name);
                
                this.showApp();
                await this.loadUserProfile();
                await this.loadFeed();
            } else {
                // Check local storage for user session
                const currentUserId = localStorage.getItem('currentUserId');
                if (currentUserId) {
                    const users = JSON.parse(localStorage.getItem('twitterUsers') || '[]');
                    this.currentUser = users.find(u => u.userId === currentUserId);
                    if (this.currentUser) {
                        console.log('✅ Local user found:', this.currentUser.name);
                        this.showApp();
                        this.loadUserProfile();
                        this.loadFeed();
                    } else {
                        this.showAuthModal();
                    }
                } else {
                    this.showAuthModal();
                }
            }
        } catch (error) {
            console.log('🔐 No active session, showing auth modal');
            this.showAuthModal();
        }
    }

    async login(email, password) {
        try {
            if (this.usingAppwrite) {
                const session = await this.account.createEmailPasswordSession(email, password);
                const user = await this.account.get();
                this.currentUser = user;
                this.showApp();
                await this.loadUserProfile();
                await this.loadFeed();
                this.showToast('Successfully signed in!');
                return true;
            } else {
                // Local storage login
                const users = JSON.parse(localStorage.getItem('twitterUsers') || '[]');
                const user = users.find(u => u.email === email && u.password === password);
                
                if (user) {
                    this.currentUser = user;
                    localStorage.setItem('currentUserId', user.userId);
                    this.showApp();
                    this.loadUserProfile();
                    this.loadFeed();
                    this.showToast('Successfully signed in!');
                    return true;
                } else {
                    this.showError('Invalid email or password');
                    return false;
                }
            }
        } catch (error) {
            this.showError('Login failed: ' + error.message);
            return false;
        }
    }

    async signup(name, username, email, password) {
        try {
            if (this.usingAppwrite) {
                // Create user account
                const user = await this.account.create('unique()', email, password, name);
                
                // Create user profile in database
                await this.databases.createDocument(
                    this.appwrite.databaseId,
                    this.appwrite.collections.users,
                    'unique()',
                    {
                        userId: user.$id,
                        name: name,
                        username: username.toLowerCase(),
                        email: email,
                        avatar: this.generateDefaultAvatar(name),
                        bio: '',
                        location: '',
                        website: '',
                        joinDate: new Date().toISOString(),
                        followersCount: 0,
                        followingCount: 0,
                        tweetsCount: 0
                    }
                );

                // Create session
                await this.account.createEmailPasswordSession(email, password);
                this.currentUser = user;
                this.showApp();
                await this.loadUserProfile();
                this.showToast('Account created successfully!');
                return true;
            } else {
                // Local storage signup
                const users = JSON.parse(localStorage.getItem('twitterUsers') || '[]');
                
                // Check if username or email already exists
                if (users.find(u => u.username === username.toLowerCase())) {
                    this.showError('Username already taken');
                    return false;
                }
                if (users.find(u => u.email === email)) {
                    this.showError('Email already registered');
                    return false;
                }
                
                const newUser = {
                    userId: 'user_' + Date.now(),
                    name: name,
                    username: username.toLowerCase(),
                    email: email,
                    password: password, // Note: In real app, hash passwords!
                    avatar: this.generateDefaultAvatar(name),
                    bio: '',
                    location: '',
                    website: '',
                    joinDate: new Date().toISOString(),
                    followersCount: 0,
                    followingCount: 0,
                    tweetsCount: 0
                };
                
                users.push(newUser);
                localStorage.setItem('twitterUsers', JSON.stringify(users));
                localStorage.setItem('currentUserId', newUser.userId);
                
                this.currentUser = newUser;
                this.showApp();
                this.loadUserProfile();
                this.showToast('Account created successfully!');
                return true;
            }
        } catch (error) {
            this.showError('Signup failed: ' + error.message);
            return false;
        }
    }

    async logout() {
        try {
            if (this.usingAppwrite) {
                await this.account.deleteSession('current');
            }
            
            this.currentUser = null;
            localStorage.removeItem('currentUserId');
            this.tweets = [];
            this.showAuthModal();
            this.showToast('Successfully signed out');
        } catch (error) {
            console.error('Logout error:', error);
            // Force logout anyway
            this.currentUser = null;
            localStorage.removeItem('currentUserId');
            this.showAuthModal();
        }
    }

    async loadUserProfile() {
        if (!this.currentUser) return;

        try {
            if (this.usingAppwrite) {
                const response = await this.databases.listDocuments(
                    this.appwrite.databaseId,
                    this.appwrite.collections.users,
                    [`userId=${this.currentUser.$id}`]
                );

                if (response.documents.length > 0) {
                    this.userProfile = response.documents[0];
                    this.updateProfileUI();
                }
            } else {
                // Load from local storage
                const users = JSON.parse(localStorage.getItem('twitterUsers') || '[]');
                this.userProfile = users.find(u => u.userId === this.currentUser.userId);
                this.updateProfileUI();
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    }

    async loadFeed() {
        if (!this.currentUser) return;

        try {
            const feedContainer = document.getElementById('feedContainer');
            feedContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading tweets...</div>';

            if (this.usingAppwrite) {
                const response = await this.databases.listDocuments(
                    this.appwrite.databaseId,
                    this.appwrite.collections.tweets,
                    [
                        'orderDesc("createdAt")',
                        'limit(50)'
                    ]
                );

                this.tweets = response.documents;
                this.renderTweets(this.tweets);
                this.setupRealtimeUpdates();
            } else {
                // Load from local storage
                this.tweets = JSON.parse(localStorage.getItem('twitterTweets') || '[]');
                // Sort by date (newest first)
                this.tweets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                this.renderTweets(this.tweets);
            }

        } catch (error) {
            console.error('Error loading feed:', error);
            this.showError('Failed to load feed');
            
            // Fallback to empty feed
            const feedContainer = document.getElementById('feedContainer');
            feedContainer.innerHTML = '<div class="p-3 text-center">No tweets yet. Be the first to tweet!</div>';
        }
    }

    async postTweet(content) {
        if (!this.currentUser || !content.trim()) return;

        try {
            const tweetData = {
                content: content,
                authorId: this.usingAppwrite ? this.currentUser.$id : this.currentUser.userId,
                authorName: this.userProfile?.name || this.currentUser.name,
                authorUsername: this.userProfile?.username || 'user',
                authorAvatar: this.userProfile?.avatar || this.generateDefaultAvatar(this.currentUser.name),
                likes: 0,
                retweets: 0,
                replies: 0,
                isLiked: false,
                isRetweeted: false,
                media: null,
                createdAt: new Date().toISOString()
            };

            if (this.usingAppwrite) {
                const response = await this.databases.createDocument(
                    this.appwrite.databaseId,
                    this.appwrite.collections.tweets,
                    'unique()',
                    tweetData
                );

                this.tweets.unshift(response);
                this.renderTweets([response], true);
                await this.updateUserTweetCount();
            } else {
                // Local storage
                const tweet = {
                    ...tweetData,
                    $id: 'tweet_' + Date.now()
                };
                
                const tweets = JSON.parse(localStorage.getItem('twitterTweets') || '[]');
                tweets.unshift(tweet);
                localStorage.setItem('twitterTweets', JSON.stringify(tweets));
                
                this.tweets.unshift(tweet);
                this.renderTweets([tweet], true);
                this.updateUserTweetCount();
            }

            this.clearComposer();
            this.showToast('Tweet posted successfully!');

        } catch (error) {
            console.error('Error posting tweet:', error);
            this.showError('Failed to post tweet');
        }
    }

    async likeTweet(tweetId) {
        if (!this.currentUser) return;

        try {
            const tweet = this.tweets.find(t => t.$id === tweetId);
            if (!tweet) return;

            if (this.usingAppwrite) {
                const existingLike = await this.databases.listDocuments(
                    this.appwrite.databaseId,
                    this.appwrite.collections.likes,
                    [`userId=${this.currentUser.$id}`, `tweetId=${tweetId}`]
                );

                if (existingLike.documents.length > 0) {
                    // Unlike
                    await this.databases.deleteDocument(
                        this.appwrite.databaseId,
                        this.appwrite.collections.likes,
                        existingLike.documents[0].$id
                    );
                    tweet.likes = parseInt(tweet.likes) - 1;
                    tweet.isLiked = false;
                } else {
                    // Like
                    await this.databases.createDocument(
                        this.appwrite.databaseId,
                        this.appwrite.collections.likes,
                        'unique()',
                        {
                            userId: this.currentUser.$id,
                            tweetId: tweetId,
                            createdAt: new Date().toISOString()
                        }
                    );
                    tweet.likes = parseInt(tweet.likes) + 1;
                    tweet.isLiked = true;
                }

                await this.databases.updateDocument(
                    this.appwrite.databaseId,
                    this.appwrite.collections.tweets,
                    tweetId,
                    { likes: tweet.likes }
                );
            } else {
                // Local storage like
                const likes = JSON.parse(localStorage.getItem('twitterLikes') || '[]');
                const existingLikeIndex = likes.findIndex(like => 
                    like.userId === this.currentUser.userId && like.tweetId === tweetId
                );

                if (existingLikeIndex > -1) {
                    // Unlike
                    likes.splice(existingLikeIndex, 1);
                    tweet.likes = parseInt(tweet.likes) - 1;
                    tweet.isLiked = false;
                } else {
                    // Like
                    likes.push({
                        userId: this.currentUser.userId,
                        tweetId: tweetId,
                        createdAt: new Date().toISOString()
                    });
                    tweet.likes = parseInt(tweet.likes) + 1;
                    tweet.isLiked = true;
                }

                localStorage.setItem('twitterLikes', JSON.stringify(likes));
                
                // Update tweet in local storage
                const tweets = JSON.parse(localStorage.getItem('twitterTweets') || '[]');
                const tweetIndex = tweets.findIndex(t => t.$id === tweetId);
                if (tweetIndex > -1) {
                    tweets[tweetIndex] = tweet;
                    localStorage.setItem('twitterTweets', JSON.stringify(tweets));
                }
            }

            this.updateTweetUI(tweetId);

        } catch (error) {
            console.error('Error liking tweet:', error);
        }
    }

    setupRealtimeUpdates() {
        if (!this.usingAppwrite) return;

        try {
            // Subscribe to new tweets
            this.realtime.subscribe(`databases.${this.appwrite.databaseId}.collections.${this.appwrite.collections.tweets}.documents`, (response) => {
                if (response.event === 'database.documents.create') {
                    const newTweet = response.payload;
                    if (newTweet.authorId !== this.currentUser.$id) {
                        this.tweets.unshift(newTweet);
                        this.renderTweets([newTweet], true);
                    }
                }
            });

            // Subscribe to tweet updates (likes)
            this.realtime.subscribe(`databases.${this.appwrite.databaseId}.collections.${this.appwrite.collections.tweets}.documents`, (response) => {
                if (response.event === 'database.documents.update') {
                    const updatedTweet = response.payload;
                    const existingIndex = this.tweets.findIndex(t => t.$id === updatedTweet.$id);
                    if (existingIndex !== -1) {
                        this.tweets[existingIndex] = updatedTweet;
                        this.updateTweetUI(updatedTweet.$id);
                    }
                }
            });
        } catch (error) {
            console.error('Error setting up realtime updates:', error);
        }
    }

    setupEventListeners() {
        // Auth events
        document.getElementById('loginBtn').addEventListener('click', () => this.handleLogin());
        document.getElementById('signupBtn').addEventListener('click', () => this.handleSignup());
        document.getElementById('showSignup').addEventListener('click', () => this.showSignupForm());
        document.getElementById('showLogin').addEventListener('click', () => this.showLoginForm());
        document.getElementById('closeAuthModal').addEventListener('click', () => this.showAuthModal());
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        // Tweet composer
        const tweetTextarea = document.getElementById('tweetTextarea');
        const tweetBtn = document.getElementById('tweetBtn');

        if (tweetTextarea) {
            tweetTextarea.addEventListener('input', (e) => {
                this.updateCharCount(e.target.value.length);
            });
        }

        if (tweetBtn) {
            tweetBtn.addEventListener('click', () => {
                this.postTweet(tweetTextarea.value);
            });
        }

        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.showPage(item.dataset.page);
                
                document.querySelectorAll('.nav-item').forEach(nav => {
                    nav.classList.remove('active');
                });
                item.classList.add('active');
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter' && tweetTextarea && tweetTextarea.value.trim()) {
                this.postTweet(tweetTextarea.value);
            }
        });

        console.log('✅ Event listeners setup complete');
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        if (!email || !password) {
            this.showError('Please fill in all fields');
            return;
        }

        await this.login(email, password);
    }

    async handleSignup() {
        const name = document.getElementById('signupName').value;
        const username = document.getElementById('signupUsername').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        
        if (!name || !username || !email || !password) {
            this.showError('Please fill in all fields');
            return;
        }

        if (username.length < 3) {
            this.showError('Username must be at least 3 characters');
            return;
        }

        if (password.length < 6) {
            this.showError('Password must be at least 6 characters');
            return;
        }

        await this.signup(name, username, email, password);
    }

    showAuthModal() {
        const authModal = document.getElementById('authModal');
        const appContainer = document.getElementById('appContainer');
        
        if (authModal) authModal.classList.add('active');
        if (appContainer) appContainer.classList.add('hidden');
        
        this.showLoginForm();
    }

    showApp() {
        const authModal = document.getElementById('authModal');
        const appContainer = document.getElementById('appContainer');
        
        if (authModal) authModal.classList.remove('active');
        if (appContainer) appContainer.classList.remove('hidden');
    }

    showLoginForm() {
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        
        if (loginForm) loginForm.classList.remove('hidden');
        if (signupForm) signupForm.classList.add('hidden');
    }

    showSignupForm() {
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        
        if (loginForm) loginForm.classList.add('hidden');
        if (signupForm) signupForm.classList.remove('hidden');
    }

    showPage(pageId) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
        }
        
        switch(pageId) {
            case 'homePage':
                this.loadFeed();
                break;
            case 'profilePage':
                this.loadProfile();
                break;
        }
    }

    updateCharCount(length) {
        const charCount = document.getElementById('charCount');
        const tweetBtn = document.getElementById('tweetBtn');
        
        if (!charCount || !tweetBtn) return;
        
        charCount.textContent = this.maxChars - length;
        
        charCount.classList.remove('warning', 'error');
        if (length > 260) charCount.classList.add('warning');
        if (length > this.maxChars) charCount.classList.add('error');
        
        tweetBtn.disabled = length === 0 || length > this.maxChars;
    }

    clearComposer() {
        const textarea = document.getElementById('tweetTextarea');
        if (textarea) {
            textarea.value = '';
            this.updateCharCount(0);
        }
    }

    renderTweets(tweets, prepend = false) {
        const feedContainer = document.getElementById('feedContainer');
        if (!feedContainer) return;
        
        if (tweets.length === 0) {
            feedContainer.innerHTML = '<div class="p-3 text-center">No tweets yet. Be the first to tweet!</div>';
            return;
        }

        const tweetsHTML = this.generateTweetHTML(tweets);
        
        if (prepend) {
            feedContainer.innerHTML = tweetsHTML + feedContainer.innerHTML;
        } else {
            feedContainer.innerHTML = tweetsHTML;
        }
        
        this.attachTweetEventListeners();
    }

    generateTweetHTML(tweets) {
        return tweets.map(tweet => `
            <div class="tweet" data-tweet-id="${tweet.$id}">
                <div style="display: flex; gap: 12px;">
                    <img src="${tweet.authorAvatar}" alt="${tweet.authorName}" class="avatar" onerror="this.src='https://ui-avatars.com/api/?name=User&background=1da1f2&color=fff&size=128'">
                    <div style="flex: 1;">
                        <div class="tweet-header">
                            <span class="user-name">${tweet.authorName}</span>
                            <span class="user-handle">@${tweet.authorUsername}</span>
                            <span>·</span>
                            <span class="tweet-time">${this.formatTime(tweet.createdAt)}</span>
                        </div>
                        <div class="tweet-content">${this.formatTweetContent(tweet.content)}</div>
                        <div class="tweet-actions">
                            <button class="tweet-action comment-action" data-action="comment">
                                <i class="far fa-comment"></i>
                                <span>${tweet.replies || 0}</span>
                            </button>
                            <button class="tweet-action retweet-action ${tweet.isRetweeted ? 'retweeted' : ''}" data-action="retweet">
                                <i class="fas fa-retweet"></i>
                                <span>${tweet.retweets || 0}</span>
                            </button>
                            <button class="tweet-action like-action ${tweet.isLiked ? 'liked' : ''}" data-action="like">
                                <i class="${tweet.isLiked ? 'fas' : 'far'} fa-heart"></i>
                                <span>${tweet.likes || 0}</span>
                            </button>
                            <button class="tweet-action" data-action="share">
                                <i class="far fa-share-square"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    attachTweetEventListeners() {
        document.querySelectorAll('.like-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const tweetId = btn.closest('.tweet').dataset.tweetId;
                this.likeTweet(tweetId);
            });
        });
    }

    updateTweetUI(tweetId) {
        const tweetElement = document.querySelector(`[data-tweet-id="${tweetId}"]`);
        if (!tweetElement) return;

        const tweet = this.tweets.find(t => t.$id === tweetId);
        if (!tweet) return;

        const likeBtn = tweetElement.querySelector('.like-action');
        const likeCount = likeBtn.querySelector('span');
        const likeIcon = likeBtn.querySelector('i');

        likeBtn.classList.toggle('liked', tweet.isLiked);
        likeIcon.className = tweet.isLiked ? 'fas fa-heart' : 'far fa-heart';
        likeCount.textContent = tweet.likes || 0;
    }

    updateProfileUI() {
        if (!this.userProfile) return;

        const elements = {
            'userName': this.userProfile.name,
            'userAvatar': this.userProfile.avatar,
            'profileName': this.userProfile.name,
            'profileHandle': '@' + this.userProfile.username,
            'profileAvatar': this.userProfile.avatar,
            'tweetsCount': this.userProfile.tweetsCount || 0,
            'followingCount': this.userProfile.followingCount || 0,
            'followersCount': this.userProfile.followersCount || 0
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                if (id.includes('Avatar')) {
                    element.src = value;
                } else {
                    element.textContent = value;
                }
            }
        });
    }

    async updateUserTweetCount() {
        if (!this.userProfile) return;

        try {
            const newCount = (this.userProfile.tweetsCount || 0) + 1;
            
            if (this.usingAppwrite) {
                await this.databases.updateDocument(
                    this.appwrite.databaseId,
                    this.appwrite.collections.users,
                    this.userProfile.$id,
                    { tweetsCount: newCount }
                );
            } else {
                // Update local storage
                const users = JSON.parse(localStorage.getItem('twitterUsers') || '[]');
                const userIndex = users.findIndex(u => u.userId === this.userProfile.userId);
                if (userIndex > -1) {
                    users[userIndex].tweetsCount = newCount;
                    localStorage.setItem('twitterUsers', JSON.stringify(users));
                }
            }
            
            this.userProfile.tweetsCount = newCount;
            this.updateProfileUI();
        } catch (error) {
            console.error('Error updating tweet count:', error);
        }
    }

    generateDefaultAvatar(name) {
        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
        const colors = ['#1da1f2', '#17bf63', '#f91880', '#794bc4', '#ffad1f'];
        const color = colors[initials.charCodeAt(0) % colors.length];
        
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${color.replace('#', '')}&color=fff&size=128`;
    }

    formatTweetContent(content) {
        return content
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color: var(--twitter-blue);">$1</a>')
            .replace(/#(\w+)/g, '<span style="color: var(--twitter-blue);">#$1</span>')
            .replace(/@(\w+)/g, '<span style="color: var(--twitter-blue);">@$1</span>');
    }

    formatTime(timestamp) {
        const now = new Date();
        const tweetTime = new Date(timestamp);
        const diffMs = now - tweetTime;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffMins < 1) return 'now';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;
        
        return tweetTime.toLocaleDateString();
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        const themeIcon = document.querySelector('#themeToggle i');
        if (themeIcon) {
            themeIcon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    showToast(message, type = 'success') {
        // Remove existing toasts
        document.querySelectorAll('.custom-toast').forEach(toast => toast.remove());
        
        const toast = document.createElement('div');
        toast.className = 'custom-toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'error' ? '#f91880' : 'var(--twitter-blue)'};
            color: white;
            padding: 12px 24px;
            border-radius: 20px;
            z-index: 10000;
            animation: slideUp 0.3s ease;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        `;
        
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideDown 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    updateUI() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        const themeIcon = document.querySelector('#themeToggle i');
        if (themeIcon) {
            themeIcon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    // Method to debug connection issues
    async debugConnection() {
        console.group('🔍 Debug Information');
        console.log('Using Appwrite:', this.usingAppwrite);
        console.log('Current User:', this.currentUser);
        console.log('Appwrite Endpoint:', this.appwrite.endpoint);
        console.log('Appwrite Project ID:', this.appwrite.projectId);
        console.log('Local Storage Users:', JSON.parse(localStorage.getItem('twitterUsers') || '[]').length);
        console.log('Local Storage Tweets:', JSON.parse(localStorage.getItem('twitterTweets') || '[]').length);
        console.groupEnd();
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }
    
    @keyframes slideDown {
        from {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
        to {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
        }
    }
    
    .custom-toast {
        /* Styles are applied inline */
    }
`;
document.head.appendChild(style);

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM Content Loaded - Initializing Twitter Clone');
    window.twitterApp = new TwitterClone();
    
    // Add debug method to global scope for testing
    window.debugTwitter = () => {
        if (window.twitterApp) {
            window.twitterApp.debugConnection();
        }
    };
});

// Export for module use if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TwitterClone;
}