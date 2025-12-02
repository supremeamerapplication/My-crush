// Post Manager
class PostManager {
    constructor() {
        this.supabase = window.app?.supabase;
        this.currentUser = window.app?.currentUser;
        this.posts = [];
        this.currentMedia = null;
        
        this.init();
    }

    init() {
        this.setupPostComposer();
    }

    setupPostComposer() {
        const composer = document.getElementById('postComposer');
        if (!composer) return;

        composer.innerHTML = `
            <div class="composer-header">
                <img id="composerAvatar" src="${window.app?.userProfile?.avatar_url || ''}" alt="Profile" class="avatar-img">
                <textarea class="composer-textarea" id="postTextarea" placeholder="What's happening?" maxlength="1000"></textarea>
            </div>
            <div class="media-preview" id="mediaPreview"></div>
            <div class="composer-actions">
                <div class="action-buttons">
                    <button class="action-btn" onclick="posts.attachImage()">
                        <i class="fas fa-image"></i>
                    </button>
                    <button class="action-btn" onclick="posts.attachVideo()">
                        <i class="fas fa-video"></i>
                    </button>
                    <button class="action-btn" onclick="posts.addEmoji()">
                        <i class="fas fa-smile"></i>
                    </button>
                    <button class="action-btn" onclick="posts.addLocation()">
                        <i class="fas fa-map-marker-alt"></i>
                    </button>
                </div>
                <div class="composer-info">
                    <span id="charCount">0/1000</span>
                    <button class="post-btn" id="postBtn" disabled onclick="posts.createPost()">
                        Post
                    </button>
                </div>
            </div>
            <input type="file" id="imageUpload" class="file-upload" accept="image/*" onchange="posts.handleMediaUpload(event, 'image')">
            <input type="file" id="videoUpload" class="file-upload" accept="video/*" onchange="posts.handleMediaUpload(event, 'video')">
        `;

        // Character counter
        const textarea = document.getElementById('postTextarea');
        const charCount = document.getElementById('charCount');
        const postBtn = document.getElementById('postBtn');

        textarea.addEventListener('input', () => {
            const length = textarea.value.length;
            charCount.textContent = `${length}/1000`;
            postBtn.disabled = length === 0 && !this.currentMedia;
            
            if (length > 1000) {
                charCount.style.color = '#ff3333';
            } else {
                charCount.style.color = '';
            }
        });

        // Update avatar
        const avatar = document.getElementById('composerAvatar');
        if (window.app?.userProfile?.avatar_url) {
            avatar.src = window.app.userProfile.avatar_url;
        }
    }

    async loadFeed() {
        try {
            const container = document.getElementById('feedContainer');
            container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading posts...</div>';

            const { data: posts, error } = await this.supabase
                .from('posts')
                .select(`
                    *,
                    profiles:author_id (id, name, username, avatar_url, bio),
                    likes (user_id),
                    comments (id, content, user_id, created_at, profiles:user_id (name, username, avatar_url)),
                    shares (user_id)
                `)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            this.posts = posts || [];
            this.renderFeed();
        } catch (error) {
            console.error('Error loading feed:', error);
            document.getElementById('feedContainer').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-feather"></i>
                    <h3>Error loading posts</h3>
                    <p>Please try again later</p>
                </div>
            `;
        }
    }

    renderFeed() {
        const container = document.getElementById('feedContainer');
        
        if (this.posts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-feather"></i>
                    <h3>No posts yet</h3>
                    <p>Be the first to share something!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.posts.map(post => this.renderPost(post)).join('');
    }

    renderPost(post) {
        const isLiked = post.likes?.some(like => like.user_id === this.currentUser?.id);
        const likeCount = post.likes?.length || 0;
        const commentCount = post.comments?.length || 0;
        const shareCount = post.shares?.length || 0;
        const isOwnPost = post.author_id === this.currentUser?.id;

        return `
            <div class="post" id="post-${post.id}">
                <div class="post-header">
                    <img src="${post.profiles.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.profiles.name)}&background=ff9800&color=fff&size=256`}" 
                         alt="${post.profiles.name}" class="post-avatar">
                    <div class="post-user-info">
                        <div class="post-username">${post.profiles.name}</div>
                        <div class="post-handle">@${post.profiles.username}</div>
                    </div>
                    <div class="post-time">${this.formatTime(post.created_at)}</div>
                    ${isOwnPost ? `
                        <div class="post-menu">
                            <button class="post-menu-btn" onclick="posts.showPostMenu('${post.id}')">
                                <i class="fas fa-ellipsis-h"></i>
                            </button>
                            <div class="post-menu-dropdown" id="post-menu-${post.id}">
                                <button onclick="posts.editPost('${post.id}')">Edit</button>
                                <button onclick="posts.deletePost('${post.id}')">Delete</button>
                            </div>
                        </div>
                    ` : ''}
                </div>
                <div class="post-content">${this.formatContent(post.content)}</div>
                ${post.image_url ? `
                    <div class="post-media">
                        <img src="${post.image_url}" alt="Post image" onclick="posts.viewImage('${post.image_url}')">
                    </div>
                ` : ''}
                ${post.video_url ? `
                    <div class="post-media">
                        <video controls>
                            <source src="${post.video_url}" type="video/mp4">
                            Your browser does not support the video tag.
                        </video>
                    </div>
                ` : ''}
                <div class="post-stats">
                    <span>${likeCount} likes</span>
                    <span>${commentCount} comments</span>
                    <span>${shareCount} shares</span>
                </div>
                <div class="post-actions">
                    <button class="post-action ${isLiked ? 'liked' : ''}" onclick="posts.toggleLike('${post.id}')">
                        <i class="fas fa-heart"></i>
                        <span>${likeCount}</span>
                    </button>
                    <button class="post-action" onclick="posts.toggleComments('${post.id}')">
                        <i class="fas fa-comment"></i>
                        <span>${commentCount}</span>
                    </button>
                    <button class="post-action" onclick="posts.sharePost('${post.id}')">
                        <i class="fas fa-share"></i>
                        <span>Share</span>
                    </button>
                </div>
                <div class="comments-section" id="comments-${post.id}">
                    ${this.renderComments(post.comments || [])}
                    <div class="add-comment">
                        <input type="text" class="comment-input" id="comment-input-${post.id}" 
                               placeholder="Add a comment..." onkeypress="if(event.key === 'Enter') posts.addComment('${post.id}')">
                        <button class="comment-btn" onclick="posts.addComment('${post.id}')">Post</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderComments(comments) {
        if (comments.length === 0) {
            return '<div class="no-comments">No comments yet</div>';
        }

        return comments.map(comment => `
            <div class="comment" id="comment-${comment.id}">
                <img src="${comment.profiles.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.profiles.name)}&background=ff9800&color=fff&size=256`}" 
                     alt="${comment.profiles.name}" class="comment-avatar">
                <div class="comment-content">
                    <div class="comment-header">
                        <span class="comment-username">${comment.profiles.name}</span>
                        <span class="comment-time">${this.formatTime(comment.created_at)}</span>
                    </div>
                    <div class="comment-text">${comment.content}</div>
                    <div class="comment-actions">
                        <button class="comment-action" onclick="posts.likeComment('${comment.id}')">Like</button>
                        <button class="comment-action" onclick="posts.replyToComment('${comment.id}')">Reply</button>
                        ${comment.user_id === this.currentUser.id ? `
                            <button class="comment-action" onclick="posts.deleteComment('${comment.id}')">Delete</button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }

    async createPost() {
        const content = document.getElementById('postTextarea').value.trim();
        
        if (!content && !this.currentMedia) {
            window.app.showToast('Please add content or media', 'error');
            return;
        }

        try {
            const postData = {
                content: content,
                author_id: this.currentUser.id
            };

            // Upload media if exists
            if (this.currentMedia) {
                const fileExt = this.currentMedia.name.split('.').pop();
                const fileName = `${this.currentUser.id}/${Date.now()}.${fileExt}`;
                const filePath = `posts/${fileName}`;

                const { data: uploadData, error: uploadError } = await this.supabase
                    .storage
                    .from('media')
                    .upload(filePath, this.currentMedia);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = this.supabase
                    .storage
                    .from('media')
                    .getPublicUrl(filePath);

                if (this.currentMedia.type.startsWith('image')) {
                    postData.image_url = publicUrl;
                } else if (this.currentMedia.type.startsWith('video')) {
                    postData.video_url = publicUrl;
                }
            }

            const { data: post, error } = await this.supabase
                .from('posts')
                .insert([postData])
                .select(`
                    *,
                    profiles:author_id (name, username, avatar_url),
                    likes (user_id),
                    comments (id),
                    shares (user_id)
                `)
                .single();

            if (error) throw error;

            // Add to beginning of posts array
            this.posts.unshift(post);
            
            // Update feed
            this.renderFeed();
            
            // Reset composer
            this.resetComposer();
            
            window.app.showToast('Post published!', 'success');

            // Update user's post count
            await this.supabase.rpc('increment_post_count', {
                user_id: this.currentUser.id
            });

        } catch (error) {
            console.error('Error creating post:', error);
            window.app.showToast('Error creating post', 'error');
        }
    }

    async toggleLike(postId) {
        try {
            // Check if already liked
            const { data: existingLike } = await this.supabase
                .from('likes')
                .select('*')
                .eq('post_id', postId)
                .eq('user_id', this.currentUser.id)
                .single();

            if (existingLike) {
                // Unlike
                await this.supabase
                    .from('likes')
                    .delete()
                    .eq('post_id', postId)
                    .eq('user_id', this.currentUser.id);
                
                window.app.showToast('Post unliked', 'info');
            } else {
                // Like
                await this.supabase
                    .from('likes')
                    .insert([{
                        post_id: postId,
                        user_id: this.currentUser.id
                    }]);
                
                window.app.showToast('Post liked!', 'success');

                // Send notification to post author
                const post = this.posts.find(p => p.id === postId);
                if (post && post.author_id !== this.currentUser.id) {
                    await this.supabase
                        .from('notifications')
                        .insert([{
                            user_id: post.author_id,
                            type: 'like',
                            source_user_id: this.currentUser.id,
                            post_id: postId,
                            message: 'liked your post'
                        }]);
                }
            }

            // Reload the specific post
            await this.refreshPost(postId);

        } catch (error) {
            console.error('Error toggling like:', error);
            window.app.showToast('Error updating like', 'error');
        }
    }

    async addComment(postId) {
        const input = document.getElementById(`comment-input-${postId}`);
        const content = input.value.trim();
        
        if (!content) return;

        try {
            const { error } = await this.supabase
                .from('comments')
                .insert([{
                    post_id: postId,
                    user_id: this.currentUser.id,
                    content: content
                }]);

            if (error) throw error;

            // Send notification to post author
            const post = this.posts.find(p => p.id === postId);
            if (post && post.author_id !== this.currentUser.id) {
                await this.supabase
                    .from('notifications')
                    .insert([{
                        user_id: post.author_id,
                        type: 'comment',
                        source_user_id: this.currentUser.id,
                        post_id: postId,
                        message: 'commented on your post'
                    }]);
            }

            await this.refreshPost(postId);
            input.value = '';
            
            window.app.showToast('Comment added!', 'success');

        } catch (error) {
            console.error('Error adding comment:', error);
            window.app.showToast('Error adding comment', 'error');
        }
    }

    async refreshPost(postId) {
        try {
            const { data: post, error } = await this.supabase
                .from('posts')
                .select(`
                    *,
                    profiles:author_id (name, username, avatar_url),
                    likes (user_id),
                    comments (id, content, user_id, created_at, profiles:user_id (name, username, avatar_url)),
                    shares (user_id)
                `)
                .eq('id', postId)
                .single();

            if (error) throw error;

            // Update post in array
            const index = this.posts.findIndex(p => p.id === postId);
            if (index !== -1) {
                this.posts[index] = post;
            }

            // Update in DOM
            const postElement = document.getElementById(`post-${postId}`);
            if (postElement) {
                postElement.outerHTML = this.renderPost(post);
            }

        } catch (error) {
            console.error('Error refreshing post:', error);
        }
    }

    attachImage() {
        document.getElementById('imageUpload').click();
    }

    attachVideo() {
        document.getElementById('videoUpload').click();
    }

    handleMediaUpload(event, type) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file size (10MB max)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            window.app.showToast('File size must be less than 10MB', 'error');
            return;
        }

        this.currentMedia = file;
        const preview = document.getElementById('mediaPreview');
        
        if (type === 'image') {
            preview.innerHTML = `
                <div class="media-preview-item">
                    <img src="${URL.createObjectURL(file)}" alt="Preview">
                    <button class="remove-media" onclick="posts.removeMedia()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        } else if (type === 'video') {
            preview.innerHTML = `
                <div class="media-preview-item">
                    <video controls>
                        <source src="${URL.createObjectURL(file)}" type="${file.type}">
                    </video>
                    <button class="remove-media" onclick="posts.removeMedia()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }

        // Enable post button
        document.getElementById('postBtn').disabled = false;
    }

    removeMedia() {
        this.currentMedia = null;
        document.getElementById('mediaPreview').innerHTML = '';
        document.getElementById('postBtn').disabled = 
            document.getElementById('postTextarea').value.trim().length === 0;
    }

    resetComposer() {
        document.getElementById('postTextarea').value = '';
        document.getElementById('charCount').textContent = '0/1000';
        document.getElementById('postBtn').disabled = true;
        this.removeMedia();
    }

    formatTime(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diff = now - time;
        
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (seconds < 60) return 'now';
        if (minutes < 60) return `${minutes}m`;
        if (hours < 24) return `${hours}h`;
        if (days < 7) return `${days}d`;
        
        return time.toLocaleDateString();
    }

    formatContent(content) {
        // Convert URLs to links
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return content.replace(urlRegex, url => 
            `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
        );
    }

    addEmoji() {
        // Implement emoji picker
        window.app.showToast('Emoji picker coming soon!', 'info');
    }

    addLocation() {
        // Implement location sharing
        window.app.showToast('Location sharing coming soon!', 'info');
    }

    toggleComments(postId) {
        const commentsSection = document.getElementById(`comments-${postId}`);
        if (commentsSection.style.display === 'none') {
            commentsSection.style.display = 'block';
        } else {
            commentsSection.style.display = 'none';
        }
    }

    sharePost(postId) {
        const post = this.posts.find(p => p.id === postId);
        if (post) {
            if (navigator.share) {
                navigator.share({
                    title: `Post by ${post.profiles.name}`,
                    text: post.content,
                    url: `${window.location.origin}/post/${postId}`
                });
            } else {
                navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`);
                window.app.showToast('Link copied to clipboard!', 'success');
            }
        }
    }

    viewImage(imageUrl) {
        const viewer = document.getElementById('imageViewer');
        const image = document.getElementById('viewerImage');
        image.src = imageUrl;
        window.app.showModal('imageViewer');
    }

    async deletePost(postId) {
        if (!confirm('Are you sure you want to delete this post?')) return;

        try {
            const { error } = await this.supabase
                .from('posts')
                .delete()
                .eq('id', postId)
                .eq('author_id', this.currentUser.id);

            if (error) throw error;

            // Remove from array
            this.posts = this.posts.filter(p => p.id !== postId);
            
            // Remove from DOM
            const postElement = document.getElementById(`post-${postId}`);
            if (postElement) {
                postElement.remove();
            }

            window.app.showToast('Post deleted', 'success');

            // Decrement post count
            await this.supabase.rpc('decrement_post_count', {
                user_id: this.currentUser.id
            });

        } catch (error) {
            console.error('Error deleting post:', error);
            window.app.showToast('Error deleting post', 'error');
        }
    }

    showPostMenu(postId) {
        const menu = document.getElementById(`post-menu-${postId}`);
        menu.classList.toggle('show');
    }

    async editPost(postId) {
        const post = this.posts.find(p => p.id === postId);
        if (!post) return;

        const newContent = prompt('Edit post content:', post.content);
        if (newContent === null || newContent === post.content) return;

        try {
            const { error } = await this.supabase
                .from('posts')
                .update({ content: newContent })
                .eq('id', postId)
                .eq('author_id', this.currentUser.id);

            if (error) throw error;

            post.content = newContent;
            await this.refreshPost(postId);
            
            window.app.showToast('Post updated', 'success');

        } catch (error) {
            console.error('Error editing post:', error);
            window.app.showToast('Error editing post', 'error');
        }
    }

    async deleteComment(commentId) {
        if (!confirm('Are you sure you want to delete this comment?')) return;

        try {
            const { error } = await this.supabase
                .from('comments')
                .delete()
                .eq('id', commentId)
                .eq('user_id', this.currentUser.id);

            if (error) throw error;

            // Remove from DOM
            const commentElement = document.getElementById(`comment-${commentId}`);
            if (commentElement) {
                commentElement.remove();
            }

            window.app.showToast('Comment deleted', 'success');

        } catch (error) {
            console.error('Error deleting comment:', error);
            window.app.showToast('Error deleting comment', 'error');
        }
    }

    async likeComment(commentId) {
        window.app.showToast('Comment liked', 'info');
    }

    replyToComment(commentId) {
        const commentElement = document.getElementById(`comment-${commentId}`);
        const replyInput = commentElement.querySelector('.reply-input') || 
            document.createElement('input');
        
        replyInput.className = 'reply-input';
        replyInput.placeholder = 'Write a reply...';
        replyInput.onkeypress = (e) => {
            if (e.key === 'Enter' && replyInput.value.trim()) {
                this.postReply(commentId, replyInput.value);
                replyInput.remove();
            }
        };
        
        commentElement.appendChild(replyInput);
        replyInput.focus();
    }

    async postReply(commentId, content) {
        try {
            const { error } = await this.supabase
                .from('comment_replies')
                .insert([{
                    comment_id: commentId,
                    user_id: this.currentUser.id,
                    content: content
                }]);

            if (error) throw error;

            window.app.showToast('Reply posted', 'success');

        } catch (error) {
            console.error('Error posting reply:', error);
            window.app.showToast('Error posting reply', 'error');
        }
    }
}

window.PostManager = PostManager;