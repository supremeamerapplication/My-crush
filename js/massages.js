// Messages Component
class MessagesComponent {
    constructor(app) {
        this.app = app;
        this.conversations = [];
        this.activeChat = null;
        this.messages = [];
    }

    async load() {
        const container = document.getElementById('messagesPage');
        container.innerHTML = this.render();
        await this.loadConversations();
        this.setupEventListeners();
    }

    render() {
        return `
            <div class="chat-container">
                <div class="chat-header hidden" id="activeChatHeader">
                    <button class="action-btn" id="backToMessages"><i class="fas fa-arrow-left"></i></button>
                    <img src="" alt="Profile" class="avatar" id="chatUserAvatar">
                    <div>
                        <div id="chatUserName">User Name</div>
                        <div class="typing-indicator hidden" id="typingIndicator">is typing...</div>
                    </div>
                    <div style="flex: 1;"></div>
                    <button class="action-btn" id="voiceCallBtn"><i class="fas fa-phone"></i></button>
                    <button class="action-btn" id="videoCallBtn"><i class="fas fa-video"></i></button>
                </div>
                
                <div class="messages-list" id="messagesList">
                    <div class="loading">
                        <i class="fas fa-spinner fa-spin"></i> Loading conversations...
                    </div>
                </div>
                
                <div class="chat-messages hidden" id="chatMessages">
                    <!-- Messages will be loaded here -->
                </div>
                <div class="chat-input-container hidden" id="chatInputContainer">
                    <input type="text" class="chat-input" id="chatInput" placeholder="Type a message...">
                    <button class="chat-send-btn" id="chatSendBtn"><i class="fas fa-paper-plane"></i></button>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Back to conversations list
        document.getElementById('backToMessages').addEventListener('click', () => {
            this.showConversationsList();
        });

        // Send message
        document.getElementById('chatSendBtn').addEventListener('click', () => {
            this.sendMessage(document.getElementById('chatInput').value);
        });

        // Send message on Enter key
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage(e.target.value);
            }
        });

        // Call buttons
        document.getElementById('voiceCallBtn').addEventListener('click', () => {
            if (this.activeChat) {
                this.app.components.calls.startCall(this.activeChat.id, 'voice');
            }
        });

        document.getElementById('videoCallBtn').addEventListener('click', () => {
            if (this.activeChat) {
                this.app.components.calls.startCall(this.activeChat.id, 'video');
            }
        });
    }

    async loadConversations() {
        const { data: messages } = await this.app.supabase
            .from('messages')
            .select(`
                *,
                sender:profiles!sender_id(name, username, avatar),
                receiver:profiles!receiver_id(name, username, avatar)
            `)
            .or(`sender_id.eq.${this.app.currentUser.id},receiver_id.eq.${this.app.currentUser.id}`)
            .order('created_at', { ascending: false });

        if (messages) {
            // Group messages by conversation
            const conversationsMap = new Map();
            
            messages.forEach(message => {
                const otherUserId = message.sender_id === this.app.currentUser.id ? 
                    message.receiver_id : message.sender_id;
                const otherUser = message.sender_id === this.app.currentUser.id ? 
                    message.receiver : message.sender;
                    
                if (!conversationsMap.has(otherUserId)) {
                    conversationsMap.set(otherUserId, {
                        user: otherUser,
                        lastMessage: message,
                        unread: 0
                    });
                }
            });
            
            this.conversations = Array.from(conversationsMap.values());
            this.renderConversations();
        }
    }

    renderConversations() {
        const container = document.getElementById('messagesList');
        
        if (this.conversations.length === 0) {
            container.innerHTML = '<div class="p-3 text-center">No messages yet. Start a conversation!</div>';
            return;
        }

        const conversationsHTML = this.conversations.map(conv => `
            <div class="message-item" data-user-id="${conv.user.id}">
                <img src="${conv.user.avatar}" alt="${conv.user.name}" class="avatar">
                <div class="message-item-info">
                    <div class="user-name">${conv.user.name}</div>
                    <div class="message-preview">${conv.lastMessage.content}</div>
                </div>
                <div class="message-time">${Utils.formatTime(conv.lastMessage.created_at)}</div>
            </div>
        `).join('');

        container.innerHTML = conversationsHTML;

        // Add click listeners
        document.querySelectorAll('.message-item').forEach(item => {
            item.addEventListener('click', () => {
                const userId = item.dataset.userId;
                const conversation = this.conversations.find(c => c.user.id === userId);
                if (conversation) {
                    this.loadChat(conversation.user);
                }
            });
        });
    }

    async loadChat(user) {
        this.activeChat = user;
        
        // Show chat interface
        this.showChatInterface();
        
        document.getElementById('chatUserName').textContent = user.name;
        document.getElementById('chatUserAvatar').src = user.avatar;
        
        // Load messages
        const { data: messages } = await this.app.supabase
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${this.app.currentUser.id},receiver_id.eq.${user.id}),and(sender_id.eq.${user.id},receiver_id.eq.${this.app.currentUser.id})`)
            .order('created_at', { ascending: true });
        
        this.messages = messages || [];
        this.renderMessages();
        this.scrollToBottom();
    }

    showChatInterface() {
        document.getElementById('messagesList').classList.add('hidden');
        document.getElementById('activeChatHeader').classList.remove('hidden');
        document.getElementById('chatMessages').classList.remove('hidden');
        document.getElementById('chatInputContainer').classList.remove('hidden');
    }

    showConversationsList() {
        this.activeChat = null;
        document.getElementById('messagesList').classList.remove('hidden');
        document.getElementById('activeChatHeader').classList.add('hidden');
        document.getElementById('chatMessages').classList.add('hidden');
        document.getElementById('chatInputContainer').classList.add('hidden');
    }

    renderMessages() {
        const container = document.getElementById('chatMessages');
        const messagesHTML = this.messages.map(message => {
            const isOwn = message.sender_id === this.app.currentUser.id;
            return `
                <div class="message ${isOwn ? 'own' : ''}">
                    ${!isOwn ? `<img src="${this.activeChat.avatar}" class="avatar">` : ''}
                    <div class="message-content">
                        <div>${Utils.formatMessageContent(message.content)}</div>
                        <div class="message-time">${Utils.formatTime(message.created_at)}</div>
                    </div>
                    ${isOwn ? `<img src="${this.app.userProfile.avatar}" class="avatar">` : ''}
                </div>
            `;
        }).join('');

        container.innerHTML = messagesHTML;
    }

    async sendMessage(content) {
        if (!content.trim() || !this.activeChat) return;

        try {
            const { data, error } = await this.app.supabase
                .from('messages')
                .insert({
                    sender_id: this.app.currentUser.id,
                    receiver_id: this.activeChat.id,
                    content: content
                });

            if (!error) {
                document.getElementById('chatInput').value = '';
                // The real-time subscription will handle updating the UI
            } else {
                Utils.showError('Failed to send message');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            Utils.showError('Failed to send message');
        }
    }

    renderMessage(message) {
        if (!this.activeChat || (message.sender_id !== this.activeChat.id && message.receiver_id !== this.activeChat.id)) {
            return;
        }

        const isOwn = message.sender_id === this.app.currentUser.id;
        const messageElement = document.createElement('div');
        messageElement.className = `message ${isOwn ? 'own' : ''}`;
        messageElement.innerHTML = `
            ${!isOwn ? `<img src="${this.activeChat.avatar}" class="avatar">` : ''}
            <div class="message-content">
                <div>${Utils.formatMessageContent(message.content)}</div>
                <div class="message-time">${Utils.formatTime(message.created_at)}</div>
            </div>
            ${isOwn ? `<img src="${this.app.userProfile.avatar}" class="avatar">` : ''}
        `;
        
        document.getElementById('chatMessages').appendChild(messageElement);
        this.scrollToBottom();
    }

    scrollToBottom() {
        const container = document.getElementById('chatMessages');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }
}