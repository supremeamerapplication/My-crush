// Notification Manager
class NotificationManager {
    constructor() {
        this.supabase = window.app?.supabase;
        this.currentUser = window.app?.currentUser;
        this.socket = window.app?.socket;
        this.notifications = [];
        this.unreadCount = 0;
        
        this.init();
    }

    init() {
        if (this.socket) {
            this.socket.on('new-notification', (notification) => {
                this.handleNewNotification(notification);
            });
        }
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Notification button click
        document.getElementById('notificationBtn').addEventListener('click', () => {
            this.loadNotifications();
        });
    }

    async loadNotifications() {
        try {
            const container = document.getElementById('notificationsList');
            container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading notifications...</div>';

            const { data: notifications, error } = await this.supabase
                .from('notifications')
                .select(`
                    *,
                    source_user:profiles!notifications_source_user_id_fkey(id, name, username, avatar_url),
                    post:posts(id, content),
                    comment:comments(id, content)
                `)
                .eq('user_id', this.currentUser.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            this.notifications = notifications || [];
            this.updateUnreadCount();
            this.renderNotifications();

        } catch (error) {
            console.error('Error loading notifications:', error);
            document.getElementById('notificationsList').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bell-slash"></i>
                    <h3>Error loading notifications</h3>
                    <p>Please try again later</p>
                </div>
            `;
        }
    }

    renderNotifications() {
        const container = document.getElementById('notificationsList');
        
        if (this.notifications.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bell-slash"></i>
                    <h3>No notifications</h3>
                    <p>Your notifications will appear here</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.notifications.map(notification => {
            const notificationText = this.getNotificationText(notification);
            
            return `
                <div class="notification-item ${notification.is_read ? '' : 'unread'}" 
                     onclick="notifications.handleNotificationClick('${notification.id}', '${notification.type}', '${notification.post?.id || ''}', '${notification.comment?.id || ''}')">
                    <img src="${notification.source_user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(notification.source_user?.name)}&background=ff9800&color=fff&size=256`}" 
                         alt="${notification.source_user?.name}" class="notification-avatar">
                    <div class="notification-content">
                        <div class="notification-text">${notificationText}</div>
                        <div class="notification-time">${this.formatTime(notification.created_at)}</div>
                    </div>
                    ${!notification.is_read ? `
                        <div class="notification-unread-dot"></div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    getNotificationText(notification) {
        const userName = notification.source_user?.name || 'Someone';
        
        switch(notification.type) {
            case 'like':
                return `<strong>${userName}</strong> liked your post`;
            case 'comment':
                return `<strong>${userName}</strong> commented on your post`;
            case 'follow':
                return `<strong>${userName}</strong> started following you`;
            case 'mention':
                return `<strong>${userName}</strong> mentioned you in a post`;
            case 'share':
                return `<strong>${userName}</strong> shared your post`;
            case 'message':
                return `<strong>${userName}</strong> sent you a message`;
            default:
                return notification.message;
        }
    }

    async handleNotificationClick(notificationId, type, postId, commentId) {
        try {
            // Mark as read
            await this.markAsRead(notificationId);

            // Navigate based on notification type
            switch(type) {
                case 'like':
                case 'comment':
                case 'mention':
                case 'share':
                    if (postId) {
                        window.posts?.viewPost(postId);
                        window.app.showPage('homePage');
                    }
                    break;
                case 'follow':
                    // Navigate to user's profile
                    const notification = this.notifications.find(n => n.id === notificationId);
                    if (notification?.source_user?.id) {
                        window.app.viewUser(notification.source_user.id);
                    }
                    break;
                case 'message':
                    // Navigate to messages
                    window.app.showPage('messagesPage');
                    break;
            }

        } catch (error) {
            console.error('Error handling notification click:', error);
        }
    }

    async markAsRead(notificationId) {
        try {
            await this.supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notificationId);

            // Update local state
            const notification = this.notifications.find(n => n.id === notificationId);
            if (notification) {
                notification.is_read = true;
            }

            // Update UI
            const notificationElement = document.querySelector(`.notification-item[onclick*="${notificationId}"]`);
            if (notificationElement) {
                notificationElement.classList.remove('unread');
                const unreadDot = notificationElement.querySelector('.notification-unread-dot');
                if (unreadDot) {
                    unreadDot.remove();
                }
            }

            // Update unread count
            this.updateUnreadCount();

        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    async markAllAsRead() {
        try {
            await this.supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', this.currentUser.id)
                .eq('is_read', false);

            // Update local state
            this.notifications.forEach(notification => {
                notification.is_read = true;
            });

            // Update UI
            document.querySelectorAll('.notification-item.unread').forEach(item => {
                item.classList.remove('unread');
                const unreadDot = item.querySelector('.notification-unread-dot');
                if (unreadDot) {
                    unreadDot.remove();
                }
            });

            // Update unread count
            this.updateUnreadCount();

            window.app.showToast('All notifications marked as read', 'success');

        } catch (error) {
            console.error('Error marking all as read:', error);
            window.app.showToast('Error marking notifications as read', 'error');
        }
    }

    handleNewNotification(notification) {
        // Add to beginning of notifications array
        this.notifications.unshift(notification);
        
        // Update UI if on notifications page
        if (window.app.currentPage === 'notificationsPage') {
            this.renderNotifications();
        }
        
        // Update unread count
        this.updateUnreadCount();
        
        // Show toast for new notification
        if (notification.source_user) {
            const userName = notification.source_user.name;
            let message = '';
            
            switch(notification.type) {
                case 'like':
                    message = `${userName} liked your post`;
                    break;
                case 'comment':
                    message = `${userName} commented on your post`;
                    break;
                case 'follow':
                    message = `${userName} started following you`;
                    break;
                case 'message':
                    message = `${userName} sent you a message`;
                    break;
                default:
                    message = notification.message;
            }
            
            window.app.showToast(message, 'info');
        }
    }

    async updateUnreadCount() {
        try {
            const { count, error } = await this.supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', this.currentUser.id)
                .eq('is_read', false);

            if (error) throw error;

            this.unreadCount = count || 0;
            this.updateNotificationBadge();

        } catch (error) {
            console.error('Error updating unread count:', error);
        }
    }

    updateNotificationBadge() {
        const badge = document.getElementById('notificationCount');
        if (badge) {
            if (this.unreadCount > 0) {
                badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    formatTime(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diff = now - time;
        
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (seconds < 60) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        
        return time.toLocaleDateString();
    }

    // Create notification for various actions
    async createNotification(targetUserId, type, data = {}) {
        try {
            const notificationData = {
                user_id: targetUserId,
                type: type,
                source_user_id: this.currentUser.id,
                message: this.getDefaultMessage(type),
                created_at: new Date().toISOString()
            };

            // Add post/comment IDs if provided
            if (data.postId) {
                notificationData.post_id = data.postId;
            }
            if (data.commentId) {
                notificationData.comment_id = data.commentId;
            }

            // Custom message if provided
            if (data.message) {
                notificationData.message = data.message;
            }

            const { error } = await this.supabase
                .from('notifications')
                .insert([notificationData]);

            if (error) throw error;

            // Send via socket if user is online
            this.socket.emit('new-notification', {
                ...notificationData,
                source_user: {
                    id: this.currentUser.id,
                    name: window.app?.userProfile?.name,
                    username: window.app?.userProfile?.username,
                    avatar_url: window.app?.userProfile?.avatar_url
                }
            });

        } catch (error) {
            console.error('Error creating notification:', error);
        }
    }

    getDefaultMessage(type) {
        switch(type) {
            case 'like':
                return 'liked your post';
            case 'comment':
                return 'commented on your post';
            case 'follow':
                return 'started following you';
            case 'mention':
                return 'mentioned you';
            case 'share':
                return 'shared your post';
            case 'message':
                return 'sent you a message';
            default:
                return 'sent you a notification';
        }
    }
}

window.NotificationManager = NotificationManager;