// Profile Component
class ProfileComponent {
    constructor(app) {
        this.app = app;
        this.viewingProfile = null;
        this.userPosts = [];
        this.userAlerts = new Set();
    }

    async load() {
        // If no specific profile is being viewed, show current user's profile
        if (!this.viewingProfile) {
            this.viewingProfile = this.app.userProfile;
        }

        const container = document.getElementById('profilePage');
        container.innerHTML = this.render();
        await this.loadProfileData();
        await this.loadUserPosts();
        await this.loadUserAlerts();
        this.setupEventListeners();
    }

    render() {
        const isOwnProfile = this.viewingProfile?.id === this.app.currentUser?.id;
        
        return `
            <div class="profile-header">
                <img src="${this.viewingProfile?.avatar || ''}" alt="Profile" class="profile-avatar" id="profileAvatar">
                ${isOwnProfile ? `
                    <button class="action-btn" id="editProfileBtn" style="position: absolute; bottom: 10px; right: 20px; background: rgba(255,255,255,0.8);">
                        <i class="fas fa-edit"></i>
                    </button>
                ` : ''}
            </div>
            <div class="profile-info">
                <h3 id="profileName">${this.viewingProfile?.name || 'User Name'}</h3>
                <p class="user-handle" id="profileHandle">@${this.viewingProfile?.username || 'username'}</p>
                <p class="profile-bio" id="profileBio">${this.viewingProfile?.bio || 'This is a sample bio. Update your profile to add your own bio!'}</p>
                
                <div class="profile-stats">
                    <div style="cursor: pointer;" id="postsCountContainer">
                        <strong id="postsCount">0</strong>
                        <div>Posts</div>
                    </div>
                    <div style="cursor: pointer;" id="followingCountContainer">
                        <strong id="followingCount">0</strong>
                        <div>Following</div>
                    </div>
                    <div style="cursor: pointer;" id="followersCountContainer">
                        <strong id="followersCount">0</strong>
                        <div>Followers</div>
                    </div>
                </div>
                
                <div class="profile-actions">
                    ${!isOwnProfile ? `
                        <button class="follow-btn" id="followBtn">Follow</button>
                        <button class="message-btn" id="messageUserBtn">
                            <i class="fas fa-envelope"></i> Message
                        </button>
                        <button class="alert-btn" id="alertBtn">
                            <i class="fas fa-bell"></i> Alert
                        </button>
                    ` : ''}
                    <button class="profile-share-btn" id="shareProfileBtn">
                        <i class="fas fa-share-alt"></i> Share
                    </button>
                </div>
            </div>
            
            <div id="profilePostsContainer">
                <div class="loading">
                    <i class="fas fa-spinner fa-spin"></i> Loading posts...
                </div>
            </div>
        `;
    }

    async loadProfileData() {
        if (!this.viewingProfile) return;

        // Get counts
        const { count: postsCount } = await this.app.supabase
            .from('posts')
            .select('id', { count: 'exact', head: true })
            .eq('author_id', this.viewingProfile.id);

        const { count: followingCount } = await this.app.supabase
            .from('follows')
            .select('id', { count: 'exact', head: true })
            .eq('follower_id', this.viewingProfile.id);

        const { count: followersCount } = await this.app.supabase
            .from('follows')
            .select('id', { count: 'exact', head: true })
            .eq('following_id', this.viewingProfile.id);

        // Update UI
        document.getElementById('postsCount').textContent = postsCount || 0;
        document.getElementById('followingCount').textContent = followingCount || 0;
        document.getElementById('followersCount').textContent = followersCount || 0;

        // Check follow status for non-own profiles
        if (this.viewingProfile.id !== this.app.currentUser.id) {
            await this.checkFollowStatus();
        }
    }

    async loadUserPosts() {
        if (!this.viewingProfile) return;

        const { data: posts } = await this.app.supabase
            .from('posts')
            .select(`
                *,
                profiles:author_id (name, username, avatar),
                likes_count:likes(count),
                retweets_count:retweets(count),
                comments_count:comments(count)
            `)
            .eq('author_id', this.viewingProfile.id)
            .order('created_at', { ascending: false });

        this.userPosts = posts || [];
        this.renderUserPosts();
    }

    renderUserPosts() {
        const container = document.getElementById('profilePostsContainer');
        
        if (this.userPosts.length === 0) {
            container.innerHTML = '<div class="p-3 text-center">No posts yet.</div>';
            return;
        }

        const postsHTML = this.userPosts.map(post => {
            const likes_count = post.likes_count[0]?.count || 0;
            const retweets_count = post.retweets_count[0]?.count || 0;
            const comments_count = post.comments_count[0]?.count || 0;

            return `
                <div class="post" data-post-id="${post.id}">
                    <div style="display: flex; gap: 12px;">
                        <img src="${post.profiles.avatar}" alt="${post.profiles.name}" class="avatar" onerror="this.src='${Utils.generateDefaultAvatar(post.profiles.name)}'">
                        <div style="flex: 1;">
                            <div class="post-header">
                                <span class="user-name">${post.profiles.name}</span>
                                <span class="user-handle">@${post.profiles.username}</span>
                                <span>·</span>
                                <span class="post-time">${Utils.formatTime(post.created_at)}</span>
                            </div>
                            <div class="post-content">${Utils.formatPostContent(post.content)}</div>
                            <div class="post-actions">
                                <button class="post-action comment-action" data-post-id="${post.id}">
                                    <i class="far fa-comment"></i>
                                    <span>${comments_count}</span>
                                </button>
                                <button class="post-action retweet-action" data-post-id="${post.id}">
                                    <i class="fas fa-retweet"></i>
                                    <span>${retweets_count}</span>
                                </button>
                                <button class="post-action like-action" data-post-id="${post.id}">
                                    <i class="far fa-heart"></i>
                                    <span>${likes_count}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = postsHTML;
        this.setupPostEventListeners();
    }

    setupPostEventListeners() {
        // Like posts
        document.querySelectorAll('.like-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const postId = btn.dataset.postId;
                this.app.components.home.likePost(postId);
            });
        });

        // Comment on posts
        document.querySelectorAll('.comment-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const postId = btn.dataset.postId;
                this.app.components.modals.openCommentModal(postId);
            });
        });
    }

    setupEventListeners() {
        const isOwnProfile = this.viewingProfile?.id === this.app.currentUser?.id;

        // Edit profile button
        if (isOwnProfile) {
            document.getElementById('editProfileBtn').addEventListener('click', () => {
                this.app.components.modals.openProfileEditModal();
            });
        }

        // Follow button
        if (!isOwnProfile) {
            document.getElementById('followBtn').addEventListener('click', () => {
                this.followUser(this.viewingProfile.id);
            });

            document.getElementById('messageUserBtn').addEventListener('click', () => {
                this.startChatWithUser();
            });

            document.getElementById('alertBtn').addEventListener('click', () => {
                this.toggleUserAlert();
            });
        }

        // Share profile button
        document.getElementById('shareProfileBtn').addEventListener('click', () => {
            this.shareProfile();
        });

        // Stats click handlers
        document.getElementById('postsCountContainer').addEventListener('click', () => {
            // Already viewing posts
        });

        document.getElementById('followingCountContainer').addEventListener('click', () => {
            this.showFollowing();
        });

        document.getElementById('followersCountContainer').addEventListener('click', () => {
            this.showFollowers();
        });
    }

    async checkFollowStatus() {
        if (!this.viewingProfile || this.viewingProfile.id === this.app.currentUser.id) return;

        const { data } = await this.app.supabase
            .from('follows')
            .select('id')
            .eq('follower_id', this.app.currentUser.id)
            .eq('following_id', this.viewingProfile.id)
            .single();

        this.updateFollowButton(!!data);
    }

    updateFollowButton(isFollowing) {
        const btn = document.getElementById('followBtn');
        if (btn) {
            btn.textContent = isFollowing ? 'Following' : 'Follow';
            btn.classList.toggle('following', isFollowing);
        }
    }

    async followUser(userId) {
        const isFollowing = await this.isFollowing(userId);
        
        if (isFollowing) {
            await this.unfollowUser(userId);
        } else {
            await this.supabaseFollowUser(userId);
        }
    }

    async isFollowing(userId) {
        const { data } = await this.app.supabase
            .from('follows')
            .select('id')
            .eq('follower_id', this.app.currentUser.id)
            .eq('following_id', userId)
            .single();
        
        return !!data;
    }

    async supabaseFollowUser(userId) {
        try {
            const { error } = await this.app.supabase
                .from('follows')
                .insert({
                    follower_id: this.app.currentUser.id,
                    following_id: userId,
                    follower_name: this.app.userProfile.name
                });

            if (!error) {
                this.updateFollowButton(true);
                Utils.showToast('Followed user');
                
                // Send notification
                await this.app.supabase
                    .from('notifications')
                    .insert({
                        user_id: userId,
                        type: 'follow',
                        source_user_id: this.app.currentUser.id,
                        message: `${this.app.userProfile.name} started following you`
                    });
                    
            } else {
                Utils.showError('Failed to follow user');
            }
        } catch (error) {
            console.error('Error following user:', error);
            Utils.showError('Failed to follow user');
        }
    }

    async unfollowUser(userId) {
        try {
            const { error } = await this.app.supabase
                .from('follows')
                .delete()
                .eq('follower_id', this.app.currentUser.id)
                .eq('following_id', userId);

            if (!error) {
                this.updateFollowButton(false);
                Utils.showToast('Unfollowed user');
            } else {
                Utils.showError('Failed to unfollow user');
            }
        } catch (error) {
            console.error('Error unfollowing user:', error);
            Utils.showError('Failed to unfollow user');
        }
    }

    async loadUserAlerts() {
        if (!this.viewingProfile || this.viewingProfile.id === this.app.currentUser.id) return;

        const { data: alerts } = await this.app.supabase
            .from('alerts')
            .select('user_id')
            .eq('follower_id', this.app.currentUser.id)
            .eq('user_id', this.viewingProfile.id);

        if (alerts && alerts.length > 0) {
            this.userAlerts.add(this.viewingProfile.id);
            this.updateAlertButton(true);
        } else {
            this.updateAlertButton(false);
        }
    }

    updateAlertButton(isAlerting) {
        const btn = document.getElementById('alertBtn');
        if (btn) {
            btn.classList.toggle('active', isAlerting);
            btn.innerHTML = isAlerting ? 
                '<i class="fas fa-bell-slash"></i> Unalert' : 
                '<i class="fas fa-bell"></i> Alert';
        }
    }

    async toggleUserAlert() {
        if (!this.viewingProfile || this.viewingProfile.id === this.app.currentUser.id) return;

        const userId = this.viewingProfile.id;
        const isAlerting = this.userAlerts.has(userId);
        
        try {
            if (isAlerting) {
                await this.app.supabase
                    .from('alerts')
                    .delete()
                    .eq('follower_id', this.app.currentUser.id)
                    .eq('user_id', userId);
                
                this.userAlerts.delete(userId);
                this.updateAlertButton(false);
                Utils.showToast('Alerts turned off for this user');
            } else {
                await this.app.supabase
                    .from('alerts')
                    .insert({
                        follower_id: this.app.currentUser.id,
                        user_id: userId
                    });
                
                this.userAlerts.add(userId);
                this.updateAlertButton(true);
                Utils.showToast('You will receive alerts for this user');
            }
            
        } catch (error) {
            console.error('Error toggling user alert:', error);
            Utils.showError('Failed to update alerts');
        }
    }

    async startChatWithUser() {
        if (!this.viewingProfile) return;

        await this.app.components.messages.loadChat(this.viewingProfile);
        this.app.showPage('messagesPage');
    }

    async shareProfile() {
        if (!this.viewingProfile) return;

        const profileUrl = `${window.location.origin}?profile=${this.viewingProfile.id}`;
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Check out ${this.viewingProfile.name} on PrimeMar`,
                    url: profileUrl
                });
            } catch (error) {
                await Utils.copyToClipboard(profileUrl);
                Utils.showToast('Profile link copied to clipboard');
            }
        } else {
            await Utils.copyToClipboard(profileUrl);
            Utils.showToast('Profile link copied to clipboard');
        }
    }

    async showFollowers() {
        if (!this.viewingProfile) return;

        const { data: followers } = await this.app.supabase
            .from('follows')
            .select(`
                follower_id,
                profiles:followers (name, username, avatar)
            `)
            .eq('following_id', this.viewingProfile.id);

        this.app.components.modals.openFollowersModal(followers || [], 'Followers');
    }

    async showFollowing() {
        if (!this.viewingProfile) return;

        const { data: following } = await this.app.supabase
            .from('follows')
            .select(`
                following_id,
                profiles:following (name, username, avatar)
            `)
            .eq('follower_id', this.viewingProfile.id);

        this.app.components.modals.openFollowersModal(following || [], 'Following');
    }

    async searchUsers(query) {
        if (query.length < 2) {
            document.getElementById('peopleContainer').innerHTML = '';
            return;
        }

        try {
            const { data: users, error } = await this.app.supabase
                .from('profiles')
                .select('*')
                .or(`username.ilike.%${query}%,name.ilike.%${query}%`)
                .limit(10);

            if (error) throw error;

            const container = document.getElementById('peopleContainer');
            
            if (users && users.length > 0) {
                const usersHTML = await Promise.all(users.map(async (user) => {
                    const isFollowing = await this.isFollowing(user.id);
                    const isAlerting = this.userAlerts.has(user.id);
                    
                    return `
                        <div class="search-result-item" data-user-id="${user.id}">
                            <img src="${user.avatar}" alt="${user.name}" class="avatar">
                            <div class="search-result-info">
                                <div class="user-name">${user.name}</div>
                                <div class="user-handle">@${user.username}</div>
                            </div>
                            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                <button class="follow-btn ${isFollowing ? 'following' : ''}" 
                                        data-user-id="${user.id}">
                                    ${isFollowing ? 'Following' : 'Follow'}
                                </button>
                                <button class="message-btn" data-user-id="${user.id}">
                                    <i class="fas fa-envelope"></i>
                                </button>
                                <button class="alert-btn ${isAlerting ? 'active' : ''}" 
                                        data-user-id="${user.id}">
                                    <i class="fas fa-bell${isAlerting ? '-slash' : ''}"></i>
                                </button>
                            </div>
                        </div>
                    `;
                }));

                container.innerHTML = usersHTML.join('');
                this.setupSearchResultEventListeners();
                
            } else {
                container.innerHTML = '<div class="p-3 text-center">No users found</div>';
            }
            
        } catch (error) {
            console.error('Error searching users:', error);
            document.getElementById('peopleContainer').innerHTML = 
                '<div class="p-3 text-center">Error searching users</div>';
        }
    }

    setupSearchResultEventListeners() {
        // Follow buttons in search results
        document.querySelectorAll('#peopleContainer .follow-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const userId = btn.dataset.userId;
                this.followUser(userId);
                // Refresh search results
                const currentQuery = document.getElementById('searchInput')?.value;
                if (currentQuery) {
                    this.searchUsers(currentQuery);
                }
            });
        });

        // Message buttons in search results
        document.querySelectorAll('#peopleContainer .message-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const userId = btn.dataset.userId;
                const { data: user } = await this.app.supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (user) {
                    await this.app.components.messages.loadChat(user);
                    this.app.showPage('messagesPage');
                }
            });
        });

        // View profile from search results
        document.querySelectorAll('#peopleContainer .search-result-item').forEach(item => {
            item.addEventListener('click', async () => {
                const userId = item.dataset.userId;
                const { data: user } = await this.app.supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (user) {
                    this.viewingProfile = user;
                    await this.load();
                    this.app.showPage('profilePage');
                }
            });
        });
    }

    async viewUserProfile(userId) {
        const { data: user } = await this.app.supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (user) {
            this.viewingProfile = user;
            await this.load();
            this.app.showPage('profilePage');
        }
    }
}