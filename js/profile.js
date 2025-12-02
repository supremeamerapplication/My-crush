// Profile Manager
class ProfileManager {
    constructor() {
        this.supabase = window.app?.supabase;
        this.currentUser = window.app?.currentUser;
        this.currentProfile = null;
        this.isFollowing = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Profile tab switching
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('profile-tab')) {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            }
        });
    }

    async loadProfile(userId) {
        try {
            // Clear previous content
            document.getElementById('profileContent').innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading profile...</div>';

            // Load profile data
            const { data: profile, error } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;

            this.currentProfile = profile;
            this.updateProfileUI();

            // Check if following
            if (userId !== this.currentUser.id) {
                await this.checkFollowingStatus(userId);
            }

            // Load profile content
            await this.loadProfileContent('posts');

        } catch (error) {
            console.error('Error loading profile:', error);
            document.getElementById('profileContent').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-slash"></i>
                    <h3>Error loading profile</h3>
                    <p>Please try again later</p>
                </div>
            `;
        }
    }

    updateProfileUI() {
        if (!this.currentProfile) return;

        // Update profile info
        document.getElementById('profileName').textContent = this.currentProfile.name;
        document.getElementById('profileHandle').textContent = `@${this.currentProfile.username}`;
        document.getElementById('profileBio').textContent = this.currentProfile.bio || 'No bio yet';
        
        // Update avatar
        const avatarImg = document.getElementById('profileAvatarImg');
        avatarImg.src = this.currentProfile.avatar_url || 
                       `https://ui-avatars.com/api/?name=${encodeURIComponent(this.currentProfile.name)}&background=ff9800&color=fff&size=256`;
        
        // Update stats
        document.getElementById('postsCount').textContent = this.currentProfile.posts_count || 0;
        document.getElementById('followersCount').textContent = this.currentProfile.followers_count || 0;
        document.getElementById('followingCount').textContent = this.currentProfile.following_count || 0;

        // Update action buttons
        this.updateActionButtons();
    }

    updateActionButtons() {
        const container = document.getElementById('profileActionButtons');
        
        if (this.currentProfile.id === this.currentUser.id) {
            // Own profile - show edit buttons
            container.innerHTML = `
                <button class="edit-profile-btn" onclick="profile.editProfileModal()">
                    <i class="fas fa-edit"></i> Edit Profile
                </button>
                <button class="share-profile-btn" onclick="profile.shareProfile()">
                    <i class="fas fa-share-alt"></i>
                </button>
            `;
        } else {
            // Other user's profile - show follow/message buttons
            const followText = this.isFollowing ? 'Following' : 'Follow';
            const followClass = this.isFollowing ? 'following' : '';
            
            container.innerHTML = `
                <button class="follow-btn ${followClass}" onclick="profile.toggleFollow('${this.currentProfile.id}')">
                    ${followText}
                </button>
                <button class="message-btn" onclick="profile.startChat('${this.currentProfile.id}')">
                    <i class="fas fa-envelope"></i> Message
                </button>
                <button class="call-btn" onclick="profile.startCall('${this.currentProfile.id}')">
                    <i class="fas fa-phone"></i> Call
                </button>
            `;
        }
    }

    async checkFollowingStatus(userId) {
        try {
            const { data, error } = await this.supabase
                .from('follows')
                .select('*')
                .eq('follower_id', this.currentUser.id)
                .eq('following_id', userId)
                .single();

            this.isFollowing = !!data;
            this.updateActionButtons();

        } catch (error) {
            if (error.code === 'PGRST116') {
                this.isFollowing = false;
            } else {
                console.error('Error checking follow status:', error);
            }
            this.updateActionButtons();
        }
    }

    async toggleFollow(userId) {
        try {
            if (this.isFollowing) {
                // Unfollow
                await this.supabase
                    .from('follows')
                    .delete()
                    .eq('follower_id', this.currentUser.id)
                    .eq('following_id', userId);

                window.app.showToast('Unfollowed', 'info');
                this.isFollowing = false;
            } else {
                // Follow
                await this.supabase
                    .from('follows')
                    .insert([{
                        follower_id: this.currentUser.id,
                        following_id: userId
                    }]);

                window.app.showToast('Followed!', 'success');
                this.isFollowing = true;

                // Send notification
                if (window.notifications) {
                    window.notifications.createNotification(userId, 'follow');
                }
            }

            this.updateActionButtons();

            // Update follower count
            await this.updateProfileStats();

        } catch (error) {
            console.error('Error toggling follow:', error);
            window.app.showToast('Error updating follow status', 'error');
        }
    }

    async updateProfileStats() {
        try {
            const { data: profile, error } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('id', this.currentProfile.id)
                .single();

            if (error) throw error;

            this.currentProfile = profile;
            this.updateProfileUI();

        } catch (error) {
            console.error('Error updating profile stats:', error);
        }
    }

    switchTab(tab) {
        // Update active tab
        document.querySelectorAll('.profile-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });

        // Load content for tab
        this.loadProfileContent(tab);
    }

    async loadProfileContent(type) {
        if (!this.currentProfile) return;

        const container = document.getElementById('profileContent');
        container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

        try {
            switch(type) {
                case 'posts':
                    await this.loadUserPosts();
                    break;
                case 'media':
                    await this.loadUserMedia();
                    break;
                case 'likes':
                    await this.loadUserLikes();
                    break;
            }
        } catch (error) {
            console.error(`Error loading ${type}:`, error);
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Error loading content</h3>
                    <p>Please try again later</p>
                </div>
            `;
        }
    }

    async loadUserPosts() {
        const container = document.getElementById('profileContent');
        
        const { data: posts, error } = await this.supabase
            .from('posts')
            .select(`
                *,
                profiles:author_id (name, username, avatar_url),
                likes (user_id),
                comments (id),
                shares (user_id)
            `)
            .eq('author_id', this.currentProfile.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (posts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-feather"></i>
                    <h3>No posts yet</h3>
                    <p>${this.currentProfile.id === this.currentUser.id ? 'Share your first post!' : 'This user hasn\'t posted anything yet'}</p>
                </div>
            `;
            return;
        }

        // Reuse post rendering from posts.js
        container.innerHTML = posts.map(post => window.posts?.renderPost(post) || '').join('');
    }

    async loadUserMedia() {
        const container = document.getElementById('profileContent');
        
        const { data: posts, error } = await this.supabase
            .from('posts')
            .select('*')
            .eq('author_id', this.currentProfile.id)
            .not('image_url', 'is', null)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (posts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-images"></i>
                    <h3>No media yet</h3>
                    <p>${this.currentProfile.id === this.currentUser.id ? 'Share your first photo!' : 'This user hasn\'t shared any media yet'}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="media-grid">
                ${posts.map(post => `
                    <div class="media-item" onclick="profile.viewPostMedia('${post.id}')">
                        <img src="${post.image_url}" alt="Post media">
                    </div>
                `).join('')}
            </div>
        `;
    }

    async loadUserLikes() {
        const container = document.getElementById('profileContent');
        
        const { data: likes, error } = await this.supabase
            .from('likes')
            .select(`
                posts (
                    *,
                    profiles:author_id (name, username, avatar_url),
                    likes (user_id),
                    comments (id),
                    shares (user_id)
                )
            `)
            .eq('user_id', this.currentProfile.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const likedPosts = likes.map(like => like.posts).filter(Boolean);

        if (likedPosts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-heart"></i>
                    <h3>No likes yet</h3>
                    <p>${this.currentProfile.id === this.currentUser.id ? 'Like some posts to see them here!' : 'This user hasn\'t liked any posts yet'}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = likedPosts.map(post => window.posts?.renderPost(post) || '').join('');
    }

    viewPostMedia(postId) {
        window.posts?.viewPost(postId);
        window.app.showPage('homePage');
    }

    editProfileModal() {
        const modal = document.createElement('div');
        modal.className = 'modal edit-profile-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Edit Profile</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="editProfileForm">
                        <div class="form-group">
                            <label>Profile Picture</label>
                            <div class="avatar-upload">
                                <img id="editAvatarPreview" src="${this.currentProfile.avatar_url || ''}" alt="Profile">
                                <button type="button" class="upload-avatar-btn" onclick="profile.uploadAvatar()">
                                    <i class="fas fa-camera"></i> Change
                                </button>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Name</label>
                            <input type="text" id="editName" value="${this.currentProfile.name}" required>
                        </div>
                        <div class="form-group">
                            <label>Username</label>
                            <input type="text" id="editUsername" value="${this.currentProfile.username}" required>
                        </div>
                        <div class="form-group">
                            <label>Bio</label>
                            <textarea id="editBio" rows="4">${this.currentProfile.bio || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Location</label>
                            <input type="text" id="editLocation" value="${this.currentProfile.location || ''}">
                        </div>
                        <div class="form-group">
                            <label>Website</label>
                            <input type="url" id="editWebsite" value="${this.currentProfile.website || ''}">
                        </div>
                        <button type="submit" class="btn">Save Changes</button>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle form submission
        document.getElementById('editProfileForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProfile();
        });
    }

    uploadAvatar() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => this.handleAvatarUpload(e);
        input.click();
    }

    async handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const preview = document.getElementById('editAvatarPreview');
            preview.src = URL.createObjectURL(file);

            // Upload to Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${this.currentUser.id}/avatar.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            const { data: uploadData, error: uploadError } = await this.supabase
                .storage
                .from('media')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = this.supabase
                .storage
                .from('media')
                .getPublicUrl(filePath);

            // Save avatar URL temporarily for form submission
            this.newAvatarUrl = publicUrl;

        } catch (error) {
            console.error('Error uploading avatar:', error);
            window.app.showToast('Error uploading avatar', 'error');
        }
    }

    async saveProfile() {
        try {
            const updates = {
                name: document.getElementById('editName').value.trim(),
                username: document.getElementById('editUsername').value.trim(),
                bio: document.getElementById('editBio').value.trim(),
                location: document.getElementById('editLocation').value.trim(),
                website: document.getElementById('editWebsite').value.trim(),
                updated_at: new Date().toISOString()
            };

            // Add avatar URL if changed
            if (this.newAvatarUrl) {
                updates.avatar_url = this.newAvatarUrl;
            }

            const { error } = await this.supabase
                .from('profiles')
                .update(updates)
                .eq('id', this.currentUser.id);

            if (error) throw error;

            // Update local profile
            Object.assign(this.currentProfile, updates);
            
            // Update UI
            this.updateProfileUI();
            
            // Update app's user profile
            if (window.app?.userProfile) {
                Object.assign(window.app.userProfile, updates);
                window.app.updateProfileUI();
            }

            // Close modal
            document.querySelector('.edit-profile-modal').remove();

            window.app.showToast('Profile updated successfully!', 'success');

        } catch (error) {
            console.error('Error saving profile:', error);
            window.app.showToast('Error updating profile', 'error');
        }
    }

    shareProfile() {
        const profileUrl = `${window.location.origin}/profile/${this.currentProfile.id}`;
        
        if (navigator.share) {
            navigator.share({
                title: `${this.currentProfile.name}'s Profile`,
                text: `Check out ${this.currentProfile.name}'s profile on PrimeMar`,
                url: profileUrl
            });
        } else {
            navigator.clipboard.writeText(profileUrl);
            window.app.showToast('Profile link copied to clipboard!', 'success');
        }
    }

    startChat(userId) {
        window.app.showPage('messagesPage');
        // TODO: Open conversation with this user
    }

    startCall(userId) {
        window.calls?.startCall(userId, 'audio');
    }

    async showFollowers() {
        await this.showUserList('followers');
    }

    async showFollowing() {
        await this.showUserList('following');
    }

    async showUserList(type) {
        const modal = document.createElement('div');
        modal.className = 'modal user-list-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${type === 'followers' ? 'Followers' : 'Following'}</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="user-list" id="userListContent">
                        <div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        await this.loadUserList(type);
    }

    async loadUserList(type) {
        try {
            let query;
            
            if (type === 'followers') {
                query = this.supabase
                    .from('follows')
                    .select(`
                        follower:profiles!follows_follower_id_fkey(*)
                    `)
                    .eq('following_id', this.currentProfile.id);
            } else {
                query = this.supabase
                    .from('follows')
                    .select(`
                        following:profiles!follows_following_id_fkey(*)
                    `)
                    .eq('follower_id', this.currentProfile.id);
            }

            const { data: relationships, error } = await query;
            if (error) throw error;

            const users = relationships.map(rel => 
                type === 'followers' ? rel.follower : rel.following
            );

            const container = document.getElementById('userListContent');
            
            if (users.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-users"></i>
                        <h3>No ${type} yet</h3>
                        <p>${this.currentProfile.id === this.currentUser.id ? 
                            `You don't have any ${type} yet` : 
                            `This user doesn't have any ${type} yet`}</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = users.map(user => `
                <div class="user-list-item">
                    <img src="${user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=ff9800&color=fff&size=256`}" 
                         alt="${user.name}" class="user-list-avatar">
                    <div class="user-list-info">
                        <div class="user-list-name">${user.name}</div>
                        <div class="user-list-username">@${user.username}</div>
                    </div>
                    <button class="user-list-action" onclick="profile.viewUserProfile('${user.id}')">
                        View
                    </button>
                </div>
            `).join('');

        } catch (error) {
            console.error(`Error loading ${type}:`, error);
            document.getElementById('userListContent').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Error loading ${type}</h3>
                    <p>Please try again later</p>
                </div>
            `;
        }
    }

    viewUserProfile(userId) {
        document.querySelector('.user-list-modal')?.remove();
        window.app.showPage('profilePage');
        this.loadProfile(userId);
    }
}

window.ProfileManager = ProfileManager;