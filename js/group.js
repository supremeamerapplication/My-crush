// Group Manager
class GroupManager {
    constructor() {
        this.supabase = window.app?.supabase;
        this.currentUser = window.app?.currentUser;
        this.currentGroup = null;
        this.userRole = null;
        
        this.init();
    }

    init() {
        this.loadGroupFromURL();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Tab switching
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('group-tab')) {
                this.switchTab(e.target.dataset.tab);
            }
        });
    }

    async loadGroupFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const groupId = urlParams.get('id');
        
        if (groupId) {
            await this.loadGroup(groupId);
        } else {
            // Redirect to groups list
            window.location.href = 'index.html?page=groupsPage';
        }
    }

    async loadGroup(groupId) {
        try {
            // Load group data
            const { data: group, error } = await this.supabase
                .from('groups')
                .select('*')
                .eq('id', groupId)
                .single();

            if (error) throw error;

            this.currentGroup = group;
            this.updateGroupUI();

            // Check user's role
            await this.loadUserRole(groupId);

            // Load group content
            await this.loadGroupContent('posts');

        } catch (error) {
            console.error('Error loading group:', error);
            document.getElementById('groupContent').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>Group not found</h3>
                    <p>This group doesn't exist or you don't have access</p>
                    <button class="btn" onclick="window.location.href='index.html?page=groupsPage'">
                        Back to Groups
                    </button>
                </div>
            `;
        }
    }

    updateGroupUI() {
        if (!this.currentGroup) return;

        // Update group info
        document.getElementById('groupName').textContent = this.currentGroup.name;
        document.getElementById('groupMembersCount').textContent = `${this.currentGroup.members_count || 0} members`;
        document.getElementById('groupDescription').textContent = this.currentGroup.description || 'No description';
        
        // Update avatar
        const avatar = document.getElementById('groupAvatar');
        if (this.currentGroup.avatar_url) {
            avatar.innerHTML = `<img src="${this.currentGroup.avatar_url}" alt="${this.currentGroup.name}">`;
        } else {
            avatar.textContent = this.currentGroup.name.charAt(0);
        }
        
        // Update cover
        const cover = document.getElementById('groupCover');
        if (this.currentGroup.cover_url) {
            cover.innerHTML = `<img src="${this.currentGroup.cover_url}" alt="${this.currentGroup.name} cover">`;
        }
        
        // Update action buttons
        this.updateActionButtons();
    }

    async loadUserRole(groupId) {
        try {
            const { data: membership, error } = await this.supabase
                .from('group_members')
                .select('role')
                .eq('group_id', groupId)
                .eq('user_id', this.currentUser.id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    this.userRole = null; // Not a member
                } else {
                    throw error;
                }
            } else {
                this.userRole = membership.role;
            }

            this.updateActionButtons();

        } catch (error) {
            console.error('Error loading user role:', error);
            this.userRole = null;
        }
    }

    updateActionButtons() {
        const container = document.getElementById('groupActions');
        
        if (!this.userRole) {
            // Not a member - show join button
            container.innerHTML = `
                <button class="btn" onclick="groupManager.joinGroup()">
                    Join Group
                </button>
            `;
        } else if (this.userRole === 'member') {
            // Member - show leave button
            container.innerHTML = `
                <button class="btn" onclick="groupManager.leaveGroup()">
                    Leave Group
                </button>
            `;
        } else if (this.userRole === 'admin' || this.userRole === 'moderator') {
            // Admin/Moderator - show management buttons
            container.innerHTML = `
                <button class="btn" onclick="groupManager.inviteMembers()">
                    <i class="fas fa-user-plus"></i> Invite
                </button>
                <button class="btn" onclick="groupManager.editGroup()">
                    <i class="fas fa-cog"></i> Manage
                </button>
            `;
        }
    }

    switchTab(tab) {
        // Update active tab
        document.querySelectorAll('.group-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });

        // Load content for tab
        this.loadGroupContent(tab);
    }

    async loadGroupContent(type) {
        const container = document.getElementById('groupContent');
        container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

        try {
            switch(type) {
                case 'posts':
                    await this.loadGroupPosts();
                    break;
                case 'members':
                    await this.loadGroupMembers();
                    break;
                case 'settings':
                    await this.loadGroupSettings();
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

    async loadGroupPosts() {
        const container = document.getElementById('groupContent');
        
        if (!this.userRole && this.currentGroup.privacy_type === 'private') {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-lock"></i>
                    <h3>Private Group</h3>
                    <p>Join this group to see posts</p>
                    <button class="btn" onclick="groupManager.joinGroup()">
                        Join Group
                    </button>
                </div>
            `;
            return;
        }

        // Show post composer for members
        if (this.userRole) {
            container.innerHTML = `
                <div class="group-post-composer">
                    <textarea placeholder="Share something with the group..." id="groupPostText" rows="3"></textarea>
                    <div class="composer-actions">
                        <div class="action-buttons">
                            <button class="action-btn" onclick="groupManager.attachImageToPost()">
                                <i class="fas fa-image"></i>
                            </button>
                            <button class="action-btn" onclick="groupManager.attachFileToPost()">
                                <i class="fas fa-paperclip"></i>
                            </button>
                        </div>
                        <button class="post-btn" onclick="groupManager.createGroupPost()">
                            Post
                        </button>
                    </div>
                </div>
                <div id="groupPostsList"></div>
            `;

            await this.loadGroupPostsList();
        } else {
            // Public group - just show posts
            container.innerHTML = '<div id="groupPostsList"></div>';
            await this.loadGroupPostsList();
        }
    }

    async loadGroupPostsList() {
        const container = document.getElementById('groupPostsList') || 
                         document.getElementById('groupContent');
        
        const { data: posts, error } = await this.supabase
            .from('posts')
            .select(`
                *,
                profiles:author_id (name, username, avatar_url),
                likes (user_id),
                comments (id),
                shares (user_id)
            `)
            .eq('group_id', this.currentGroup.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (posts.length === 0) {
            container.innerHTML += `
                <div class="empty-state">
                    <i class="fas fa-feather"></i>
                    <h3>No posts yet</h3>
                    <p>Be the first to share something!</p>
                </div>
            `;
            return;
        }

        // Reuse post rendering from posts.js
        container.innerHTML += posts.map(post => window.posts?.renderPost(post) || '').join('');
    }

    async loadGroupMembers() {
        const container = document.getElementById('groupContent');
        
        const { data: members, error } = await this.supabase
            .from('group_members')
            .select(`
                role,
                profiles:user_id (id, name, username, avatar_url)
            `)
            .eq('group_id', this.currentGroup.id);

        if (error) throw error;

        if (members.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>No members</h3>
                    <p>This group has no members yet</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="members-grid">
                ${members.map(member => `
                    <div class="member-card">
                        <img src="${member.profiles.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.profiles.name)}&background=ff9800&color=fff&size=256`}" 
                             alt="${member.profiles.name}" class="member-avatar">
                        <div class="member-info">
                            <div class="member-name">${member.profiles.name}</div>
                            <div class="member-username">@${member.profiles.username}</div>
                        </div>
                        <div class="member-role">${member.role}</div>
                    </div>
                `).join('')}
            </div>
            
            ${this.userRole === 'admin' ? `
                <div class="invite-members">
                    <h3>Invite Members</h3>
                    <div class="invite-input">
                        <input type="text" id="inviteUsername" placeholder="Enter username">
                        <button class="btn" onclick="groupManager.sendInvite()">Invite</button>
                    </div>
                </div>
            ` : ''}
        `;
    }

    async loadGroupSettings() {
        const container = document.getElementById('groupContent');
        
        if (!this.userRole || (this.userRole !== 'admin' && this.userRole !== 'moderator')) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-lock"></i>
                    <h3>Access Denied</h3>
                    <p>Only group admins and moderators can access settings</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="group-settings">
                <div class="setting-item">
                    <h3>Group Settings</h3>
                    <label>
                        <input type="checkbox" id="approveNewMembers" ${this.currentGroup.settings?.approve_new_members ? 'checked' : ''}>
                        Approve new members
                    </label>
                    <label>
                        <input type="checkbox" id="membersCanPost" ${this.currentGroup.settings?.members_can_post !== false ? 'checked' : ''}>
                        Members can post
                    </label>
                    <label>
                        <input type="checkbox" id="allowMedia" ${this.currentGroup.settings?.allow_media !== false ? 'checked' : ''}>
                        Allow media posts
                    </label>
                </div>
                
                ${this.userRole === 'admin' ? `
                    <div class="danger-zone">
                        <h3>Danger Zone</h3>
                        <button class="danger-btn" onclick="groupManager.deleteGroup()">
                            Delete Group
                        </button>
                    </div>
                ` : ''}
            </div>
            
            <button class="btn" onclick="groupManager.saveGroupSettings()" style="margin-top: 20px;">
                Save Settings
            </button>
        `;
    }

    async joinGroup() {
        try {
            const { error } = await this.supabase
                .from('group_members')
                .insert([{
                    group_id: this.currentGroup.id,
                    user_id: this.currentUser.id,
                    role: 'member'
                }]);

            if (error) throw error;

            // Update group members count
            await this.supabase.rpc('increment_group_members', {
                group_id: this.currentGroup.id
            });

            // Reload group
            await this.loadGroup(this.currentGroup.id);

            window.app.showToast('Joined group successfully!', 'success');

        } catch (error) {
            console.error('Error joining group:', error);
            window.app.showToast('Error joining group', 'error');
        }
    }

    async leaveGroup() {
        if (!confirm('Are you sure you want to leave this group?')) return;

        try {
            const { error } = await this.supabase
                .from('group_members')
                .delete()
                .eq('group_id', this.currentGroup.id)
                .eq('user_id', this.currentUser.id);

            if (error) throw error;

            // Update group members count
            await this.supabase.rpc('decrement_group_members', {
                group_id: this.currentGroup.id
            });

            // Redirect to groups list
            window.location.href = 'index.html?page=groupsPage';

            window.app.showToast('Left group', 'info');

        } catch (error) {
            console.error('Error leaving group:', error);
            window.app.showToast('Error leaving group', 'error');
        }
    }

    async sendInvite() {
        const username = document.getElementById('inviteUsername').value.trim();
        if (!username) return;

        try {
            // Get user ID from username
            const { data: user, error: userError } = await this.supabase
                .from('profiles')
                .select('id')
                .eq('username', username)
                .single();

            if (userError) {
                if (userError.code === 'PGRST116') {
                    window.app.showToast('User not found', 'error');
                } else {
                    throw userError;
                }
                return;
            }

            // Check if already a member
            const { data: existingMember } = await this.supabase
                .from('group_members')
                .select('*')
                .eq('group_id', this.currentGroup.id)
                .eq('user_id', user.id)
                .single();

            if (existingMember) {
                window.app.showToast('User is already a member', 'error');
                return;
            }

            // Create invitation (could be a separate invitations table)
            // For now, we'll directly add them as members
            await this.supabase
                .from('group_members')
                .insert([{
                    group_id: this.currentGroup.id,
                    user_id: user.id,
                    role: 'member'
                }]);

            // Update group members count
            await this.supabase.rpc('increment_group_members', {
                group_id: this.currentGroup.id
            });

            window.app.showToast('Invitation sent!', 'success');
            document.getElementById('inviteUsername').value = '';

            // Reload members list
            await this.loadGroupMembers();

        } catch (error) {
            console.error('Error sending invite:', error);
            window.app.showToast('Error sending invitation', 'error');
        }
    }

    async saveGroupSettings() {
        try {
            const settings = {
                approve_new_members: document.getElementById('approveNewMembers').checked,
                members_can_post: document.getElementById('membersCanPost').checked,
                allow_media: document.getElementById('allowMedia').checked
            };

            const { error } = await this.supabase
                .from('groups')
                .update({
                    settings: settings,
                    updated_at: new Date().toISOString()
                })
                .eq('id', this.currentGroup.id);

            if (error) throw error;

            // Update local group
            this.currentGroup.settings = settings;

            window.app.showToast('Settings saved!', 'success');

        } catch (error) {
            console.error('Error saving settings:', error);
            window.app.showToast('Error saving settings', 'error');
        }
    }

    async deleteGroup() {
        if (!confirm('Are you sure you want to delete this group? This action cannot be undone.')) return;

        try {
            const { error } = await this.supabase
                .from('groups')
                .delete()
                .eq('id', this.currentGroup.id)
                .eq('created_by', this.currentUser.id);

            if (error) throw error;

            window.app.showToast('Group deleted', 'success');
            window.location.href = 'index.html?page=groupsPage';

        } catch (error) {
            console.error('Error deleting group:', error);
            window.app.showToast('Error deleting group', 'error');
        }
    }

    attachImageToPost() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => this.uploadGroupPostMedia(e, 'image');
        input.click();
    }

    attachFileToPost() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '*/*';
        input.onchange = (e) => this.uploadGroupPostMedia(e, 'file');
        input.click();
    }

    async uploadGroupPostMedia(event, type) {
        const file = event.target.files[0];
        if (!file) return;

        // Store file for later use when creating post
        this.groupPostMedia = { file, type };
        
        window.app.showToast('Media attached to post', 'info');
    }

    async createGroupPost() {
        const text = document.getElementById('groupPostText').value.trim();
        if (!text && !this.groupPostMedia) return;

        try {
            const postData = {
                content: text,
                author_id: this.currentUser.id,
                group_id: this.currentGroup.id
            };

            // Upload media if exists
            if (this.groupPostMedia) {
                const fileExt = this.groupPostMedia.file.name.split('.').pop();
                const fileName = `${this.currentUser.id}/${Date.now()}.${fileExt}`;
                const filePath = `group_posts/${fileName}`;

                const { data: uploadData, error: uploadError } = await this.supabase
                    .storage
                    .from('media')
                    .upload(filePath, this.groupPostMedia.file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = this.supabase
                    .storage
                    .from('media')
                    .getPublicUrl(filePath);

                if (this.groupPostMedia.type === 'image') {
                    postData.image_url = publicUrl;
                } else {
                    postData.file_url = publicUrl;
                    postData.file_name = this.groupPostMedia.file.name;
                }
            }

            const { error } = await this.supabase
                .from('posts')
                .insert([postData]);

            if (error) throw error;

            // Clear form
            document.getElementById('groupPostText').value = '';
            this.groupPostMedia = null;

            // Reload posts
            await this.loadGroupPosts();

            window.app.showToast('Post shared with group!', 'success');

        } catch (error) {
            console.error('Error creating group post:', error);
            window.app.showToast('Error creating post', 'error');
        }
    }

    editGroup() {
        // Show group edit modal
        window.app.showToast('Edit group feature coming soon', 'info');
    }
}

window.GroupManager = GroupManager;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.groupManager = new GroupManager();
});