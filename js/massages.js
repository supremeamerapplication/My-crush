// Message Manager
class MessageManager {
    constructor() {
        this.supabase = window.app?.supabase;
        this.currentUser = window.app?.currentUser;
        this.socket = window.app?.socket;
        this.conversations = [];
        this.activeConversation = null;
        this.messages = [];
        this.typingTimeouts = new Map();
        
        this.init();
    }

    init() {
        if (this.socket) {
            this.setupSocketListeners();
        }
    }

    setupSocketListeners() {
        this.socket.on('new-message', (message) => {
            this.handleNewMessage(message);
        });

        this.socket.on('typing', (data) => {
            this.showTypingIndicator(data.senderId, data.isTyping);
        });

        this.socket.on('message-seen', (data) => {
            this.updateMessageSeen(data.messageId);
        });

        this.socket.on('incoming-call', (data) => {
            window.calls?.handleIncomingCall(data);
        });
    }

    async loadConversations() {
        try {
            const container = document.getElementById('messagesList');
            container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading conversations...</div>';

            const { data: conversations, error } = await this.supabase
                .from('conversations')
                .select(`
                    *,
                    user1:profiles!conversations_user1_id_fkey(id, name, username, avatar_url),
                    user2:profiles!conversations_user2_id_fkey(id, name, username, avatar_url)
                `)
                .or(`user1_id.eq.${this.currentUser.id},user2_id.eq.${this.currentUser.id}`)
                .order('updated_at', { ascending: false });

            if (error) throw error;

            this.conversations = conversations || [];
            this.renderConversations();
        } catch (error) {
            console.error('Error loading conversations:', error);
            document.getElementById('messagesList').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comments"></i>
                    <h3>Error loading conversations</h3>
                    <p>Please try again later</p>
                </div>
            `;
        }
    }

    renderConversations() {
        const container = document.getElementById('messagesList');
        
        if (this.conversations.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comments"></i>
                    <h3>No conversations</h3>
                    <p>Start a conversation with someone!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.conversations.map(conv => {
            const otherUser = conv.user1_id === this.currentUser.id ? conv.user2 : conv.user1;
            const unreadCount = conv.user1_id === this.currentUser.id ? 
                              conv.unread_count_user1 : conv.unread_count_user2;

            return `
                <div class="message-item" onclick="messages.openConversation('${conv.id}', '${otherUser.id}')">
                    <img src="${otherUser.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.name)}&background=ff9800&color=fff&size=256`}" 
                         alt="${otherUser.name}" class="message-item-avatar">
                    <div class="message-item-info">
                        <div class="message-item-name">${otherUser.name}</div>
                        <div class="message-item-preview">${conv.last_message || 'Start a conversation'}</div>
                    </div>
                    <div class="message-item-time">${this.formatTime(conv.updated_at)}</div>
                    ${unreadCount > 0 ? `
                        <div class="message-item-unread">${unreadCount}</div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    async openConversation(conversationId, userId) {
        try {
            // Get user info
            const { data: user, error: userError } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (userError) throw userError;

            this.activeConversation = {
                id: conversationId,
                user: user
            };

            // Show chat view
            document.getElementById('messagesList').style.display = 'none';
            document.getElementById('chatView').classList.add('active');

            // Update chat header
            document.getElementById('chatHeader').innerHTML = `
                <div class="chat-user-info">
                    <img src="${user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=ff9800&color=fff&size=256`}" 
                         alt="${user.name}" class="chat-user-avatar">
                    <div>
                        <div class="chat-user-name">${user.name}</div>
                        <div class="chat-user-status" id="userStatus-${userId}">Online</div>
                    </div>
                </div>
                <div class="chat-header-actions">
                    <button class="chat-header-btn" onclick="messages.startAudioCall('${userId}')">
                        <i class="fas fa-phone"></i>
                    </button>
                    <button class="chat-header-btn" onclick="messages.startVideoCall('${userId}')">
                        <i class="fas fa-video"></i>
                    </button>
                </div>
            `;

            // Load messages
            await this.loadMessages(conversationId);

            // Mark as read
            await this.markAsRead(conversationId);

        } catch (error) {
            console.error('Error opening conversation:', error);
            window.app.showToast('Error opening conversation', 'error');
        }
    }

    async loadMessages(conversationId) {
        try {
            const { data: messages, error } = await this.supabase
                .from('messages')
                .select('*')
                .or(`sender_id.eq.${this.currentUser.id},receiver_id.eq.${this.currentUser.id}`)
                .order('created_at', { ascending: true });

            if (error) throw error;

            this.messages = messages || [];
            this.renderMessages();
        } catch (error) {
            console.error('Error loading messages:', error);
            this.messages = [];
            this.renderMessages();
        }
    }

    renderMessages() {
        const container = document.getElementById('chatMessages');
        container.innerHTML = this.messages.map(msg => {
            const isOwn = msg.sender_id === this.currentUser.id;
            
            return `
                <div class="message ${isOwn ? 'own' : ''}" data-id="${msg.id}">
                    ${!isOwn ? `
                        <img src="${this.activeConversation?.user?.avatar_url || ''}" 
                             alt="Avatar" class="message-avatar">
                    ` : ''}
                    <div class="message-content">
                        ${msg.content ? `
                            <div class="message-text">${msg.content}</div>
                        ` : ''}
                        ${msg.image_url ? `
                            <div class="message-media">
                                <img src="${msg.image_url}" alt="Image" onclick="messages.viewImage('${msg.image_url}')">
                            </div>
                        ` : ''}
                        ${msg.video_url ? `
                            <div class="message-media">
                                <video controls>
                                    <source src="${msg.video_url}" type="video/mp4">
                                </video>
                            </div>
                        ` : ''}
                        ${msg.file_url ? `
                            <div class="message-file">
                                <i class="fas fa-file"></i>
                                <a href="${msg.file_url}" target="_blank">${msg.file_name || 'Download file'}</a>
                            </div>
                        ` : ''}
                        <div class="message-time">
                            ${this.formatTime(msg.created_at)}
                            ${isOwn && msg.is_read ? ' ✓✓' : isOwn ? ' ✓' : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.scrollTop = container.scrollHeight;
    }

    async sendMessage() {
        const input = document.getElementById('chatInput');
        const content = input.value.trim();
        
        if (!content) return;

        try {
            const messageData = {
                sender_id: this.currentUser.id,
                receiver_id: this.activeConversation.user.id,
                content: content,
                created_at: new Date().toISOString()
            };

            const { data: message, error } = await this.supabase
                .from('messages')
                .insert([messageData])
                .select()
                .single();

            if (error) throw error;

            // Send via socket
            this.socket.emit('send-message', {
                receiverId: this.activeConversation.user.id,
                message: messageData
            });

            // Add to messages array
            this.messages.push(message);
            this.renderMessages();

            // Clear input
            input.value = '';

            // Update conversation
            await this.updateConversation(message);

            window.app.showToast('Message sent', 'success');

        } catch (error) {
            console.error('Error sending message:', error);
            window.app.showToast('Error sending message', 'error');
        }
    }

    async updateConversation(message) {
        try {
            const { data: conversation, error } = await this.supabase
                .from('conversations')
                .select('*')
                .or(`user1_id.eq.${this.currentUser.id}.and.user2_id.eq.${this.activeConversation.user.id},
                     user1_id.eq.${this.activeConversation.user.id}.and.user2_id.eq.${this.currentUser.id}`)
                .single();

            if (error && error.code === 'PGRST116') {
                // Create new conversation
                await this.supabase
                    .from('conversations')
                    .insert([{
                        user1_id: this.currentUser.id,
                        user2_id: this.activeConversation.user.id,
                        last_message: message.content,
                        last_message_at: new Date().toISOString()
                    }]);
            } else if (!error) {
                // Update existing conversation
                await this.supabase
                    .from('conversations')
                    .update({
                        last_message: message.content,
                        last_message_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        unread_count_user1: conversation.user1_id === this.activeConversation.user.id ? 
                                          conversation.unread_count_user1 + 1 : conversation.unread_count_user1,
                        unread_count_user2: conversation.user2_id === this.activeConversation.user.id ? 
                                          conversation.unread_count_user2 + 1 : conversation.unread_count_user2
                    })
                    .eq('id', conversation.id);
            }

            // Reload conversations list
            await this.loadConversations();

        } catch (error) {
            console.error('Error updating conversation:', error);
        }
    }

    handleNewMessage(message) {
        if (message.sender_id === this.activeConversation?.user?.id) {
            this.messages.push(message);
            this.renderMessages();
            
            // Mark as read
            this.markMessageAsRead(message.id);
        }
    }

    async markMessageAsRead(messageId) {
        try {
            await this.supabase
                .from('messages')
                .update({ is_read: true })
                .eq('id', messageId);

            // Notify sender
            this.socket.emit('message-seen', {
                messageId: messageId,
                senderId: this.currentUser.id
            });

        } catch (error) {
            console.error('Error marking message as read:', error);
        }
    }

    async markAsRead(conversationId) {
        try {
            const conversation = this.conversations.find(c => c.id === conversationId);
            if (!conversation) return;

            if (conversation.user1_id === this.currentUser.id) {
                await this.supabase
                    .from('conversations')
                    .update({ unread_count_user1: 0 })
                    .eq('id', conversationId);
            } else {
                await this.supabase
                    .from('conversations')
                    .update({ unread_count_user2: 0 })
                    .eq('id', conversationId);
            }

            await this.loadConversations();

        } catch (error) {
            console.error('Error marking as read:', error);
        }
    }

    updateMessageSeen(messageId) {
        const messageElement = document.querySelector(`.message[data-id="${messageId}"]`);
        if (messageElement) {
            const timeElement = messageElement.querySelector('.message-time');
            if (timeElement) {
                timeElement.textContent = timeElement.textContent.replace('✓', '✓✓');
            }
        }
    }

    showTypingIndicator(userId, isTyping) {
        if (userId === this.activeConversation?.user?.id) {
            const statusElement = document.getElementById(`userStatus-${userId}`);
            if (statusElement) {
                statusElement.textContent = isTyping ? 'Typing...' : 'Online';
            }
        }
    }

    startTyping() {
        if (!this.activeConversation) return;

        this.socket.emit('typing', {
            receiverId: this.activeConversation.user.id,
            isTyping: true
        });

        // Clear previous timeout
        if (this.typingTimeouts.has(this.activeConversation.user.id)) {
            clearTimeout(this.typingTimeouts.get(this.activeConversation.user.id));
        }

        // Set timeout to stop typing indicator
        const timeout = setTimeout(() => {
            this.socket.emit('typing', {
                receiverId: this.activeConversation.user.id,
                isTyping: false
            });
            this.typingTimeouts.delete(this.activeConversation.user.id);
        }, 2000);

        this.typingTimeouts.set(this.activeConversation.user.id, timeout);
    }

    startNewChat() {
        // Show user search modal for new chat
        window.app.showToast('Search for a user to start chatting', 'info');
    }

    attachImage() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => this.sendMedia(e, 'image');
        input.click();
    }

    attachFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.onchange = (e) => this.sendMedia(e, 'file');
        input.click();
    }

    async sendMedia(event, type) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${this.currentUser.id}/${Date.now()}.${fileExt}`;
            const filePath = `messages/${fileName}`;

            const { data: uploadData, error: uploadError } = await this.supabase
                .storage
                .from('media')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = this.supabase
                .storage
                .from('media')
                .getPublicUrl(filePath);

            const messageData = {
                sender_id: this.currentUser.id,
                receiver_id: this.activeConversation.user.id,
                created_at: new Date().toISOString()
            };

            if (type === 'image') {
                messageData.image_url = publicUrl;
            } else if (type === 'file') {
                messageData.file_url = publicUrl;
                messageData.file_name = file.name;
            }

            const { data: message, error } = await this.supabase
                .from('messages')
                .insert([messageData])
                .select()
                .single();

            if (error) throw error;

            // Send via socket
            this.socket.emit('send-message', {
                receiverId: this.activeConversation.user.id,
                message: messageData
            });

            // Add to messages
            this.messages.push(message);
            this.renderMessages();

            // Update conversation
            await this.updateConversation(message);

            window.app.showToast('Media sent', 'success');

        } catch (error) {
            console.error('Error sending media:', error);
            window.app.showToast('Error sending media', 'error');
        }
    }

    startAudioCall(userId) {
        window.calls?.startCall(userId, 'audio');
    }

    startVideoCall(userId) {
        window.calls?.startCall(userId, 'video');
    }

    viewImage(imageUrl) {
        const viewer = document.getElementById('imageViewer');
        const image = document.getElementById('viewerImage');
        image.src = imageUrl;
        window.app.showModal('imageViewer');
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
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        
        return time.toLocaleDateString();
    }
}

window.MessageManager = MessageManager;