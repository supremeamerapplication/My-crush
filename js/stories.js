// Story Manager
class StoryManager {
    constructor() {
        this.supabase = window.app?.supabase;
        this.currentUser = window.app?.currentUser;
        this.stories = [];
        this.viewedStories = new Set();
        
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Story creation
        document.addEventListener('click', (e) => {
            if (e.target.closest('.create-story-btn')) {
                this.createStory();
            }
        });
    }

    async loadStories() {
        try {
            const container = document.getElementById('storiesContainer');
            container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading stories...</div>';

            // Get stories from users you follow
            const { data: following } = await this.supabase
                .from('follows')
                .select('following_id')
                .eq('follower_id', this.currentUser.id);

            const followingIds = following?.map(f => f.following_id) || [];
            followingIds.push(this.currentUser.id); // Include own stories

            const { data: stories, error } = await this.supabase
                .from('stories')
                .select(`
                    *,
                    profiles:user_id (id, name, username, avatar_url)
                `)
                .in('user_id', followingIds)
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Group stories by user
            this.groupStoriesByUser(stories || []);
            this.renderStories();

        } catch (error) {
            console.error('Error loading stories:', error);
            document.getElementById('storiesContainer').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>Error loading stories</h3>
                    <p>Please try again later</p>
                </div>
            `;
        }
    }

    groupStoriesByUser(stories) {
        const grouped = {};
        
        stories.forEach(story => {
            if (!grouped[story.user_id]) {
                grouped[story.user_id] = {
                    user: story.profiles,
                    stories: []
                };
            }
            grouped[story.user_id].stories.push(story);
        });

        this.stories = Object.values(grouped);
    }

    renderStories() {
        const container = document.getElementById('storiesContainer');
        
        if (this.stories.length === 0) {
            container.innerHTML = `
                <div class="create-story-container">
                    <div class="create-story-btn" onclick="stories.showStoryCreator()">
                        <div class="create-story-icon">
                            <i class="fas fa-plus"></i>
                        </div>
                        <div class="create-story-text">Create Story</div>
                    </div>
                    <div class="empty-state">
                        <i class="fas fa-users"></i>
                        <h3>No stories yet</h3>
                        <p>Create your first story!</p>
                    </div>
                </div>
            `;
            return;
        }

        let html = `
            <div class="create-story-container">
                <div class="create-story-btn" onclick="stories.showStoryCreator()">
                    <div class="create-story-icon">
                        <i class="fas fa-plus"></i>
                    </div>
                    <div class="create-story-text">Your Story</div>
                </div>
            </div>
        `;

        html += this.stories.map(userStories => {
            const user = userStories.user;
            const hasUnviewed = userStories.stories.some(story => 
                !this.viewedStories.has(story.id)
            );

            return `
                <div class="story" onclick="stories.viewUserStories('${user.id}')">
                    <div class="story-avatar ${hasUnviewed ? 'has-unviewed' : ''}">
                        <div class="story-avatar-inner">
                            <img src="${user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=ff9800&color=fff&size=256`}" 
                                 alt="${user.name}">
                        </div>
                    </div>
                    <div class="story-name">${user.username}</div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    showStoryCreator() {
        const modal = document.createElement('div');
        modal.className = 'modal story-creator';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Create Story</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="story-options">
                        <div class="story-option" onclick="stories.createTextStory()">
                            <i class="fas fa-font"></i>
                            <span>Text</span>
                        </div>
                        <div class="story-option" onclick="stories.uploadImageStory()">
                            <i class="fas fa-image"></i>
                            <span>Photo</span>
                        </div>
                        <div class="story-option" onclick="stories.uploadVideoStory()">
                            <i class="fas fa-video"></i>
                            <span>Video</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    createTextStory() {
        const modal = document.createElement('div');
        modal.className = 'modal text-story-creator';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Create Text Story</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="text-story-editor">
                        <textarea id="storyText" placeholder="Type your story..." maxlength="200"></textarea>
                        <div class="text-story-controls">
                            <div class="color-picker">
                                ${['#ff9800', '#f44336', '#2196F3', '#4CAF50', '#9C27B0', '#FFC107'].map(color => `
                                    <div class="color-option" style="background: ${color}" 
                                         onclick="stories.setTextColor('${color}')"></div>
                                `).join('')}
                            </div>
                            <div class="bg-color-picker">
                                ${['#000000', '#ffffff', '#ff9800', '#2196F3', '#4CAF50', '#9C27B0'].map(color => `
                                    <div class="color-option" style="background: ${color}" 
                                         onclick="stories.setBgColor('${color}')"></div>
                                `).join('')}
                            </div>
                        </div>
                        <button class="btn" onclick="stories.publishTextStory()">Publish Story</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    setTextColor(color) {
        document.getElementById('storyText').style.color = color;
    }

    setBgColor(color) {
        document.getElementById('storyText').style.backgroundColor = color;
    }

    async publishTextStory() {
        const text = document.getElementById('storyText').value.trim();
        const textColor = document.getElementById('storyText').style.color || '#ffffff';
        const bgColor = document.getElementById('storyText').style.backgroundColor || '#000000';

        if (!text) {
            window.app.showToast('Please enter story text', 'error');
            return;
        }

        try {
            const { error } = await this.supabase
                .from('stories')
                .insert([{
                    user_id: this.currentUser.id,
                    text_content: text,
                    text_color: textColor,
                    bg_color: bgColor,
                    media_type: 'text',
                    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                }]);

            if (error) throw error;

            window.app.showToast('Story published!', 'success');
            
            // Close modal
            document.querySelector('.text-story-creator').remove();
            
            // Reload stories
            await this.loadStories();

        } catch (error) {
            console.error('Error publishing story:', error);
            window.app.showToast('Error publishing story', 'error');
        }
    }

    uploadImageStory() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => this.publishImageStory(e);
        input.click();
    }

    uploadVideoStory() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*';
        input.onchange = (e) => this.publishVideoStory(e);
        input.click();
    }

    async publishImageStory(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${this.currentUser.id}/stories/${Date.now()}.${fileExt}`;
            const filePath = `stories/${fileName}`;

            const { data: uploadData, error: uploadError } = await this.supabase
                .storage
                .from('media')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = this.supabase
                .storage
                .from('media')
                .getPublicUrl(filePath);

            const { error } = await this.supabase
                .from('stories')
                .insert([{
                    user_id: this.currentUser.id,
                    media_url: publicUrl,
                    media_type: 'image',
                    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                }]);

            if (error) throw error;

            window.app.showToast('Story published!', 'success');
            await this.loadStories();

        } catch (error) {
            console.error('Error publishing image story:', error);
            window.app.showToast('Error publishing story', 'error');
        }
    }

    async publishVideoStory(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Check file size (50MB max for videos)
        if (file.size > 50 * 1024 * 1024) {
            window.app.showToast('Video must be less than 50MB', 'error');
            return;
        }

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${this.currentUser.id}/stories/${Date.now()}.${fileExt}`;
            const filePath = `stories/${fileName}`;

            const { data: uploadData, error: uploadError } = await this.supabase
                .storage
                .from('media')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = this.supabase
                .storage
                .from('media')
                .getPublicUrl(filePath);

            const { error } = await this.supabase
                .from('stories')
                .insert([{
                    user_id: this.currentUser.id,
                    media_url: publicUrl,
                    media_type: 'video',
                    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                }]);

            if (error) throw error;

            window.app.showToast('Story published!', 'success');
            await this.loadStories();

        } catch (error) {
            console.error('Error publishing video story:', error);
            window.app.showToast('Error publishing story', 'error');
        }
    }

    async viewUserStories(userId) {
        const userStories = this.stories.find(s => s.user.id === userId);
        if (!userStories) return;

        // Create story viewer
        const viewer = document.createElement('div');
        viewer.className = 'modal story-viewer';
        viewer.innerHTML = `
            <div class="story-viewer-container">
                <div class="story-viewer-header">
                    <div class="story-viewer-user">
                        <img src="${userStories.user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(userStories.user.name)}&background=ff9800&color=fff&size=256`}" 
                             alt="${userStories.user.name}">
                        <div>
                            <div class="story-viewer-username">${userStories.user.name}</div>
                            <div class="story-viewer-time">${this.formatTime(userStories.stories[0].created_at)}</div>
                        </div>
                    </div>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="story-viewer-content" id="storyViewerContent"></div>
                <div class="story-viewer-controls">
                    <button class="story-viewer-btn" onclick="stories.previousStory()">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <div class="story-progress">
                        ${userStories.stories.map((_, i) => `
                            <div class="story-progress-bar">
                                <div class="story-progress-fill" data-story="${i}"></div>
                            </div>
                        `).join('')}
                    </div>
                    <button class="story-viewer-btn" onclick="stories.nextStory()">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(viewer);
        
        // Start viewing first story
        this.currentStoryIndex = 0;
        this.currentUserStories = userStories;
        this.showStory(0);

        // Mark as viewed
        await this.markStoryAsViewed(userStories.stories[0].id);
    }

    showStory(index) {
        if (!this.currentUserStories || index < 0 || index >= this.currentUserStories.stories.length) {
            document.querySelector('.story-viewer').remove();
            return;
        }

        this.currentStoryIndex = index;
        const story = this.currentUserStories.stories[index];
        
        const content = document.getElementById('storyViewerContent');
        
        if (story.media_type === 'text') {
            content.innerHTML = `
                <div class="text-story-view" style="color: ${story.text_color || '#ffffff'}; background: ${story.bg_color || '#000000'}">
                    ${story.text_content}
                </div>
            `;
        } else if (story.media_type === 'image') {
            content.innerHTML = `
                <img src="${story.media_url}" alt="Story" class="story-image">
            `;
        } else if (story.media_type === 'video') {
            content.innerHTML = `
                <video autoplay controls class="story-video">
                    <source src="${story.media_url}" type="video/mp4">
                </video>
            `;
        }

        // Start progress
        this.startStoryProgress(index);
    }

    startStoryProgress(storyIndex) {
        // Reset all progress bars
        document.querySelectorAll('.story-progress-fill').forEach(bar => {
            bar.style.width = '0%';
            bar.style.transition = 'none';
        });

        // Animate current story progress
        const currentBar = document.querySelector(`.story-progress-fill[data-story="${storyIndex}"]`);
        if (currentBar) {
            currentBar.style.transition = 'width 5s linear';
            currentBar.style.width = '100%';
        }

        // Auto-advance after 5 seconds
        clearTimeout(this.storyTimeout);
        this.storyTimeout = setTimeout(() => {
            this.nextStory();
        }, 5000);
    }

    nextStory() {
        this.showStory(this.currentStoryIndex + 1);
    }

    previousStory() {
        this.showStory(this.currentStoryIndex - 1);
    }

    async markStoryAsViewed(storyId) {
        if (this.viewedStories.has(storyId)) return;

        try {
            await this.supabase
                .from('story_views')
                .insert([{
                    story_id: storyId,
                    viewer_id: this.currentUser.id
                }]);

            this.viewedStories.add(storyId);
            
            // Update UI
            const storyElement = document.querySelector(`[data-story-id="${storyId}"]`);
            if (storyElement) {
                storyElement.classList.remove('has-unviewed');
            }

        } catch (error) {
            console.error('Error marking story as viewed:', error);
        }
    }

    formatTime(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diff = now - time;
        
        const hours = Math.floor(diff / 3600000);
        
        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours}h ago`;
        
        return time.toLocaleDateString();
    }
}

window.StoryManager = StoryManager;