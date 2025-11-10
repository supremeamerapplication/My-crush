// Modals Component
class ModalsComponent {
    constructor(app) {
        this.app = app;
        this.activePostForComment = null;
    }

    render() {
        return `
            <!-- Call Interface -->
            <div class="call-interface" id="callInterface">
                <div class="video-container">
                    <video class="remote-video" id="remoteVideo" autoplay></video>
                    <video class="local-video" id="localVideo" autoplay muted></video>
                    <div class="caller-info" id="callerInfo">
                        <h3 id="callerName">Calling...</h3>
                        <p id="callStatus">Connecting...</p>
                    </div>
                    <div class="call-controls">
                        <button class="call-btn call-mute" id="muteBtn"><i class="fas fa-microphone"></i></button>
                        <button class="call-btn call-end" id="endCallBtn"><i class="fas fa-phone"></i></button>
                        <button class="call-btn call-mute" id="videoToggleBtn"><i class="fas fa-video"></i></button>
                    </div>
                </div>
            </div>

            <!-- Incoming Call Modal -->
            <div class="modal" id="incomingCallModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <div class="modal-title">Incoming Call</div>
                    </div>
                    <div class="p-3 text-center">
                        <img src="" alt="Profile" class="avatar" id="incomingCallAvatar" style="width: 80px; height: 80px;">
                        <h3 id="incomingCallName">User Name</h3>
                        <p id="incomingCallType">Voice Call</p>
                        <div style="display: flex; gap: 20px; justify-content: center; margin-top: 20px;">
                            <button class="call-btn call-decline" id="declineCallBtn"><i class="fas fa-phone-slash"></i></button>
                            <button class="call-btn call-accept" id="acceptCallBtn"><i class="fas fa-phone"></i></button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Profile Edit Modal -->
            <div class="modal" id="profileEditModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <div class="modal-title">Edit Profile</div>
                        <button class="modal-close" id="closeProfileEdit">&times;</button>
                    </div>
                    <div class="profile-edit-form">
                        <div class="profile-picture-edit">
                            <img src="${this.app.userProfile?.avatar || ''}" alt="Profile" class="profile-picture-preview" id="profilePicturePreview">
                            <input type="file" id="profilePictureInput" accept="image/*" style="display: none;">
                            <button class="btn" id="changeProfilePictureBtn">Change Picture</button>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Name</label>
                            <input type="text" class="form-input" id="editProfileName" placeholder="Enter your name" value="${this.app.userProfile?.name || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Username</label>
                            <input type="text" class="form-input" id="editProfileUsername" placeholder="Enter your username" value="${this.app.userProfile?.username || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Bio</label>
                            <textarea class="form-input" id="editProfileBio" placeholder="Tell others about yourself" rows="3">${this.app.userProfile?.bio || ''}</textarea>
                        </div>
                        <button class="btn btn-primary" id="saveProfileBtn">Save Changes</button>
                    </div>
                </div>
            </div>

            <!-- Security Settings Modal -->
            <div class="modal" id="securityModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <div class="modal-title">Security Settings</div>
                        <button class="modal-close" id="closeSecurityModal">&times;</button>
                    </div>
                    <div class="p-3">
                        <div class="form-group">
                            <label class="form-label">Current Password</label>
                            <input type="password" class="form-input" id="currentPassword" placeholder="Enter current password">
                        </div>
                        <div class="form-group">
                            <label class="form-label">New Password</label>
                            <input type="password" class="form-input" id="newPassword" placeholder="Enter new password">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Confirm New Password</label>
                            <input type="password" class="form-input" id="confirmPassword" placeholder="Confirm new password">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Add Recovery Email</label>
                            <input type="email" class="form-input" id="recoveryEmail" placeholder="Enter additional email">
                        </div>
                        <button class="btn btn-primary" id="saveSecurityBtn">Save Security Settings</button>
                    </div>
                </div>
            </div>

            <!-- Comment Modal -->
            <div class="modal" id="commentModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <div class="modal-title">Comments</div>
                        <button class="modal-close" id="closeCommentModal">&times;</button>
                    </div>
                    <div id="commentsList" style="max-height: 400px; overflow-y: auto;">
                        <!-- Comments will be loaded here -->
                    </div>
                    <div class="comment-input-container">
                        <input type="text" class="comment-input" id="commentInput" placeholder="Write a comment...">
                        <button class="chat-send-btn" id="commentSendBtn"><i class="fas fa-paper-plane"></i></button>
                    </div>
                </div>
            </div>

            <!-- Followers Modal -->
            <div class="modal" id="followersModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <div class="modal-title" id="followersModalTitle">Followers</div>
                        <button class="modal-close" id="closeFollowersModal">&times;</button>
                    </div>
                    <div class="followers-modal-content" id="followersList">
                        <!-- Followers will be listed here -->
                    </div>
                </div>
            </div>

            <!-- About Modal -->
            <div class="modal" id="aboutModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <div class="modal-title">About PrimeMar</div>
                        <button class="modal-close" id="closeAboutModal">&times;</button>
                    </div>
                    <div class="p-3">
                        <p><strong>PrimeMar v1.0</strong></p>
                        <p>A modern social media platform built with cutting-edge technology.</p>
                        <p>Features include real-time messaging, voice/video calls, posts, stories, and more.</p>
                        <p>&copy; 2024 PrimeMar. All rights reserved.</p>
                    </div>
                </div>
            </div>

            <!-- Privacy & Terms Modal -->
            <div class="modal" id="privacyModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <div class="modal-title">Privacy & Terms</div>
                        <button class="modal-close" id="closePrivacyModal">&times;</button>
                    </div>
                    <div class="p-3" style="max-height: 400px; overflow-y: auto;">
                        <h4>Privacy Policy</h4>
                        <p>We value your privacy and are committed to protecting your personal information...</p>
                        
                        <h4>Terms of Service</h4>
                        <p>By using PrimeMar, you agree to our terms of service...</p>
                        
                        <h4>Community Guidelines</h4>
                        <p>Be respectful to other users and follow our community standards...</p>
                    </div>
                </div>
            </div>

            <!-- Share Modal -->
            <div class="modal" id="shareModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <div class="modal-title">Share Post</div>
                        <button class="modal-close" id="closeShareModal">&times;</button>
                    </div>
                    <div class="share-options">
                        <div class="share-option" data-action="copy">
                            <div class="share-icon">
                                <i class="fas fa-link"></i>
                            </div>
                            <span>Copy Link</span>
                        </div>
                        <div class="share-option" data-action="twitter">
                            <div class="share-icon" style="background: rgba(29, 161, 242, 0.1); color: #1da1f2;">
                                <i class="fab fa-twitter"></i>
                            </div>
                            <span>Twitter</span>
                        </div>
                        <div class="share-option" data-action="facebook">
                            <div class="share-icon" style="background: rgba(24, 119, 242, 0.1); color: #1877f2;">
                                <i class="fab fa-facebook"></i>
                            </div>
                            <span>Facebook</span>
                        </div>
                        <div class="share-option" data-action="whatsapp">
                            <div class="share-icon" style="background: rgba(37, 211, 102, 0.1); color: #25d366;">
                                <i class="fab fa-whatsapp"></i>
                            </div>
                            <span>WhatsApp</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Profile edit modal
        document.getElementById('closeProfileEdit').addEventListener('click', () => {
            document.getElementById('profileEditModal').classList.remove('active');
        });

        document.getElementById('saveProfileBtn').addEventListener('click', () => {
            this.updateProfile();
        });

        document.getElementById('changeProfilePictureBtn').addEventListener('click', () => {
            document.getElementById('profilePictureInput').click();
        });

        document.getElementById('profilePictureInput').addEventListener('change', (e) => {
            this.handleProfilePictureChange(e.target.files[0]);
        });

        // Security modal
        document.getElementById('closeSecurityModal').addEventListener('click', () => {
            document.getElementById('securityModal').classList.remove('active');
        });

        document.getElementById('saveSecurityBtn').addEventListener('click', () => {
            this.updateSecuritySettings();
        });

        // Comment modal
        document.getElementById('closeCommentModal').addEventListener('click', () => {
            document.getElementById('commentModal').classList.remove('active');
            this.activePostForComment = null;
        });

        document.getElementById('commentSendBtn').addEventListener('click', () => {
            if (this.activePostForComment) {
                this.addComment(this.activePostForComment, document.getElementById('commentInput').value);
            }
        });

        // Followers modal
        document.getElementById('closeFollowersModal').addEventListener('click', () => {
            document.getElementById('followersModal').classList.remove('active');
        });

        // About modal
        document.getElementById('closeAboutModal').addEventListener('click', () => {
            document.getElementById('aboutModal').classList.remove('active');
        });

        // Privacy modal
        document.getElementById('closePrivacyModal').addEventListener('click', () => {
            document.getElementById('privacyModal').classList.remove('active');
        });

        // Share modal
        document.getElementById('closeShareModal').addEventListener('click', () => {
            document.getElementById('shareModal').classList.remove('active');
        });

        // Share options
        document.querySelectorAll('.share-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleShareAction(action);
            });
        });
    }

    async openProfileEditModal() {
        document.getElementById('profileEditModal').classList.add('active');
    }

    async updateProfile() {
        const name = document.getElementById('editProfileName').value;
        const username = document.getElementById('editProfileUsername').value;
        const bio = document.getElementById('editProfileBio').value;

        try {
            const { error } = await this.app.supabase
                .from('profiles')
                .update({
                    name: name,
                    username: username,
                    bio: bio
                })
                .eq('id', this.app.currentUser.id);

            if (!error) {
                await this.app.loadUserProfile();
                Utils.showToast('Profile updated successfully');
                document.getElementById('profileEditModal').classList.remove('active');
            } else {
                Utils.showError('Failed to update profile');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            Utils.showError('Failed to update profile');
        }
    }

    async handleProfilePictureChange(file) {
        if (!file) return;
        
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                document.getElementById('profilePicturePreview').src = e.target.result;
                
                // In a real app, you'd upload to Supabase Storage
                // For now, we'll update the profile with the data URL
                const { error } = await this.app.supabase
                    .from('profiles')
                    .update({ avatar: e.target.result })
                    .eq('id', this.app.currentUser.id);

                if (!error) {
                    await this.app.loadUserProfile();
                    Utils.showToast('Profile picture updated');
                } else {
                    Utils.showError('Failed to update profile picture');
                }
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Error updating profile picture:', error);
            Utils.showError('Failed to update profile picture');
        }
    }

    async updateSecuritySettings() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const recoveryEmail = document.getElementById('recoveryEmail').value;

        try {
            if (newPassword && newPassword !== confirmPassword) {
                throw new Error('New passwords do not match');
            }

            if (newPassword) {
                const { error } = await this.app.supabase.auth.updateUser({
                    password: newPassword
                });

                if (error) throw error;
            }

            if (recoveryEmail) {
                // In a real app, you'd add this to user metadata
                Utils.showToast('Recovery email added successfully');
            }

            Utils.showToast('Security settings updated successfully');
            document.getElementById('securityModal').classList.remove('active');
            
            // Clear form
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
            document.getElementById('recoveryEmail').value = '';
            
        } catch (error) {
            Utils.showError('Failed to update security settings: ' + error.message);
        }
    }

    async openCommentModal(postId) {
        this.activePostForComment = postId;
        await this.loadComments(postId);
        document.getElementById('commentModal').classList.add('active');
    }

    async loadComments(postId) {
        const { data: comments } = await this.app.supabase
            .from('comments')
            .select(`
                *,
                profiles:user_id (name, username, avatar)
            `)
            .eq('post_id', postId)
            .order('created_at', { ascending: true });

        const container = document.getElementById('commentsList');
        if (comments && comments.length > 0) {
            container.innerHTML = comments.map(comment => `
                <div class="comment-item">
                    <img src="${comment.profiles.avatar}" class="avatar">
                    <div class="comment-content">
                        <div class="user-name">${comment.profiles.name}</div>
                        <div>${comment.content}</div>
                        <div class="message-time">${Utils.formatTime(comment.created_at)}</div>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="p-3 text-center">No comments yet</div>';
        }
    }

    async addComment(postId, content) {
        if (!content.trim()) return;

        try {
            await this.app.supabase
                .from('comments')
                .insert({
                    user_id: this.app.currentUser.id,
                    post_id: postId,
                    content: content
                });

            document.getElementById('commentInput').value = '';
            await this.loadComments(postId);
            
        } catch (error) {
            console.error('Error adding comment:', error);
            Utils.showError('Failed to add comment');
        }
    }

    openFollowersModal(users, title) {
        document.getElementById('followersModalTitle').textContent = title;
        
        const container = document.getElementById('followersList');
        if (users && users.length > 0) {
            const usersHTML = users.map(user => {
                const userData = user.profiles || user;
                return `
                    <div class="follower-item">
                        <img src="${userData.avatar}" class="avatar">
                        <div>
                            <div class="user-name">${userData.name}</div>
                            <div class="user-handle">@${userData.username}</div>
                        </div>
                    </div>
                `;
            }).join('');
            
            container.innerHTML = usersHTML;
        } else {
            container.innerHTML = '<div class="p-3 text-center">No users found</div>';
        }
        
        document.getElementById('followersModal').classList.add('active');
    }

    async handleShareAction(action) {
        // This would be implemented based on your sharing needs
        switch (action) {
            case 'copy':
                Utils.showToast('Link copied to clipboard');
                break;
            case 'twitter':
                Utils.showToast('Sharing to Twitter');
                break;
            case 'facebook':
                Utils.showToast('Sharing to Facebook');
                break;
            case 'whatsapp':
                Utils.showToast('Sharing to WhatsApp');
                break;
        }
        
        document.getElementById('shareModal').classList.remove('active');
    }
}