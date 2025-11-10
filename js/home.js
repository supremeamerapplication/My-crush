// Home Component
class HomeComponent {
    constructor(app) {
        this.app = app;
        this.posts = [];
        this.stories = [];
        this.likedPosts = new Set();
        this.retweetedPosts = new Set();
    }

    async load() {
        const container = document.getElementById('homePage');
        container.innerHTML = this.render();
        await this.loadFeed();
        await this.loadStories();
        await this.loadUserLikesAndRetweets();
        this.setupEventListeners();
    }

    render() {
        return `
            <div class="post-composer">
                <div class="composer-header">
                    <img src="${this.app.userProfile?.avatar || ''}" alt="Profile" class="avatar" id="userAvatar">
                    <textarea class="composer-textarea" placeholder="What's happening?" 
                             id="postTextarea" maxlength="280"></textarea>
                </div>
                <div class="composer-actions">
                    <div class="action-buttons">
                        <button class="action-btn" id="mediaBtn">
                            <i class="fas fa-image"></i>
                        </button>
                        <button class="action-btn" id="gifBtn">
                            <i class="fas fa-film"></i>
                        </button>
                        <button class="action-btn" id="emojiBtn">
                            <i class="fas fa-smile"></i>
                        </button>
                    </div>
                    <div style="display: flex; align-items: center;">
                        <span class="char-count" id="charCount">280</span>
                        <button class="post-btn" id="postBtn" disabled>Post</button>
                    </div>
                </div>
            </div>

            <div class="stories-container" id="storiesContainer">
                <!-- Stories will be loaded here -->
            </div>

            <div id="feedContainer">
                <div class="loading">
                    <i class="fas fa-spinner fa-spin"></i> Loading posts...
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        const postTextarea = document.getElementById('postTextarea');
        const postBtn = document.getElementById('postBtn');

        postTextarea.addEventListener('input', (e) => {
            this.updateCharCount(e.target.value.length);
        });

        postBtn.addEventListener('click', () => {
            this.post(postTextarea.value);
        });

        // Update user avatar
        const userAvatar = document.getElementById('userAvatar');
        if (userAvatar && this.app.userProfile) {
            userAvatar.src = this.app.userProfile.avatar;
        }
    }

    updateCharCount(length) {
        const charCount = document.getElementById('charCount');
        const postBtn = document.getElementById('postBtn');
        charCount.textContent = 280 - length;
        charCount.classList.toggle('error', length > 280);
        postBtn.disabled = length === 0 || length > 280;
    }

    async loadFeed() {
        const feedContainer = document.getElementById('feedContainer');
        feedContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading posts...</div>';

        try {
            const { data, error } = await this.app.supabase
                .from('posts')
                .select(`
                    *,
                    profiles:author_id (name, username, avatar),
                    likes_count:likes(count),
                    retweets_count:retweets(count),
                    comments_count:comments(count)
                `)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            if (data) {
                this.posts = data.map(post => ({
                    ...post,
                    likes_count: post.likes_count[0]?.count || 0,
                    retweets_count: post.retweets_count[0]?.count || 0,
                    comments_count: post.comments_count[0]?.count || 0
                }));
                this.renderPosts();
            } else {
                feedContainer.innerHTML = '<div class="p-3 text-center">No posts yet. Be the first to post!</div>';
            }
            
        } catch (error) {
            console.error('Error loading feed:', error);
            feedContainer.innerHTML = '<div class="p-3 text-center">Error loading posts</div>';
        }
    }

    async loadStories() {
        const { data, error } = await this.app.supabase
            .from('profiles')
            .select('id, name, username, avatar')
            .limit(8);

        if (!error && data) {
            this.stories = data;
            this.renderStories();
        }
    }

    async loadUserLikesAndRetweets() {
        if (!this.app.currentUser) return;

        // Load user's liked posts
        const { data: likes } = await this.app.supabase
            .from('likes')
            .select('post_id')
            .eq('user_id', this.app.currentUser.id);

        if (likes) {
            likes.forEach(like => this.likedPosts.add(like.post_id));
        }

        // Load user's retweeted posts
        const { data: retweets } = await this.app.supabase
            .from('retweets')
            .select('post_id')
            .eq('user_id', this.app.currentUser.id);

        if (retweets) {
            retweets.forEach(retweet => this.retweetedPosts.add(retweet.post_id));
        }
    }

    renderPosts() {
        const feedContainer = document.getElementById('feedContainer');
        const postsHTML = this.posts.map(post => {
            const isLiked = this.likedPosts.has(post.id);
            const isRetweeted = this.retweetedPosts.has(post.id);
            const isOwnPost = post.author_id === this.app.currentUser.id;

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
                                    <span>${post.comments_count}</span>
                                </button>
                                <button class="post-action retweet-action ${isRetweeted ? 'active' : ''}" data-post-id="${post.id}">
                                    <i class="fas fa-retweet"></i>
                                    <span>${post.retweets_count}</span>
                                </button>
                                <button class="post-action like-action ${isLiked ? 'active' : ''}" data-post-id="${post.id}">
                                    <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
                                    <span>${post.likes_count}</span>
                                </button>
                                <button class="post-action share-action" data-post-id="${post.id}">
                                    <i class="far fa-share-square"></i>
                                </button>
                                ${!isOwnPost ? `
                                <button class="post-action follow-action" data-user-id="${post.author_id}">
                                    <i class="fas fa-user-plus"></i>
                                </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        feedContainer.innerHTML = postsHTML;
        this.setupPostEventListeners();
    }

    setupPostEventListeners() {
        // Like posts
        document.querySelectorAll('.like-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const postId = btn.dataset.postId;
                this.likePost(postId);
            });
        });

        // Retweet posts
        document.querySelectorAll('.retweet-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const postId = btn.dataset.postId;
                this.retweetPost(postId);
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

        // Follow users from posts
        document.querySelectorAll('.follow-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const userId = btn.dataset.userId;
                this.app.components.profile.followUser(userId);
            });
        });
    }

    renderStories() {
        const container = document.getElementById('storiesContainer');
        if (!this.stories.length) return;

        let storiesHTML = `
            <div class="story add-story">
                <div class="story-avatar">
                    <img src="${this.app.userProfile?.avatar || Utils.generateDefaultAvatar('User')}" class="avatar">
                    <div class="add-story-icon"><i class="fas fa-plus"></i></div>
                </div>
                <div class="story-username">Your Story</div>
            </div>
        `;

        storiesHTML += this.stories.map(story => `
            <div class="story">
                <div class="story-avatar">
                    <img src="${story.avatar}" alt="${story.name}" class="avatar" onerror="this.src='${Utils.generateDefaultAvatar(story.name)}'">
                </div>
                <div class="story-username">${story.username}</div>
            </div>
        `).join('');

        container.innerHTML = storiesHTML;
    }

    async post(content) {
        if (!content.trim()) return;

        try {
            const { data, error } = await this.app.supabase
                .from('posts')
                .insert({
                    author_id: this.app.currentUser.id,
                    content: content
                })
                .select(`
                    *,
                    profiles:author_id (name, username, avatar)
                `)
                .single();

            if (!error && data) {
                this.posts.unshift(data);
                this.renderPosts();
                this.clearComposer();
                Utils.showToast('Post published!');
            } else {
                Utils.showError('Failed to publish post');
            }
        } catch (error) {
            console.error('Error posting:', error);
            Utils.showError('Failed to publish post');
        }
    }

    clearComposer() {
        document.getElementById('postTextarea').value = '';
        this.updateCharCount(0);
    }

    async likePost(postId) {
        try {
            const isLiked = this.likedPosts.has(postId);
            
            if (isLiked) {
                await this.app.supabase
                    .from('likes')
                    .delete()
                    .eq('user_id', this.app.currentUser.id)
                    .eq('post_id', postId);
                
                this.likedPosts.delete(postId);
            } else {
                await this.app.supabase
                    .from('likes')
                    .insert({
                        user_id: this.app.currentUser.id,
                        post_id: postId
                    });
                
                this.likedPosts.add(postId);

                // Send notification
                const { data: post } = await this.app.supabase
                    .from('posts')
                    .select('author_id')
                    .eq('id', postId)
                    .single();

                if (post && post.author_id !== this.app.currentUser.id) {
                    await this.app.supabase
                        .from('notifications')
                        .insert({
                            user_id: post.author_id,
                            type: 'like',
                            source_user_id: this.app.currentUser.id,
                            message: `${this.app.userProfile.name} liked your post`,
                            post_id: postId
                        });
                }
            }

            await this.loadFeed();
            
        } catch (error) {
            console.error('Error liking post:', error);
            Utils.showError('Failed to like post');
        }
    }

    async retweetPost(postId) {
        try {
            const isRetweeted = this.retweetedPosts.has(postId);
            
            if (isRetweeted) {
                await this.app.supabase
                    .from('retweets')
                    .delete()
                    .eq('user_id', this.app.currentUser.id)
                    .eq('post_id', postId);
                
                this.retweetedPosts.delete(postId);
            } else {
                await this.app.supabase
                    .from('retweets')
                    .insert({
                        user_id: this.app.currentUser.id,
                        post_id: postId
                    });
                
                this.retweetedPosts.add(postId);

                // Send notification
                const { data: post } = await this.app.supabase
                    .from('posts')
                    .select('author_id')
                    .eq('id', postId)
                    .single();

                if (post && post.author_id !== this.app.currentUser.id) {
                    await this.app.supabase
                        .from('notifications')
                        .insert({
                            user_id: post.author_id,
                            type: 'retweet',
                            source_user_id: this.app.currentUser.id,
                            message: `${this.app.userProfile.name} retweeted your post`,
                            post_id: postId
                        });
                }
            }

            await this.loadFeed();
            
        } catch (error) {
            console.error('Error retweeting post:', error);
            Utils.showError('Failed to retweet post');
        }
    }
}