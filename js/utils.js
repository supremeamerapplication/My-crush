// Utility functions
class Utils {
    static formatTime(timestamp) {
        const now = new Date();
        const postTime = new Date(timestamp);
        const diffMs = now - postTime;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffMins < 1) return 'now';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        return postTime.toLocaleDateString();
    }

    static formatPostContent(content) {
        return content
            .replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" style="color: var(--primary-color);">$1</a>')
            .replace(/#(\w+)/g, '<span style="color: var(--primary-color);">#$1</span>')
            .replace(/@(\w+)/g, '<span style="color: var(--primary-color);">@$1</span>');
    }

    static formatMessageContent(content) {
        return content
            .replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" style="color: inherit; text-decoration: underline;">$1</a>');
    }

    static generateDefaultAvatar(name) {
        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
        const colors = ['#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b'];
        const color = colors[initials.charCodeAt(0) % colors.length];
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${color.replace('#', '')}&color=fff&size=128`;
    }

    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
        }
    }

    static showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
            background: ${type === 'error' ? '#ef4444' : '#3b82f6'}; color: white;
            padding: 12px 24px; border-radius: 20px; z-index: 10000;
            animation: slideUp 0.3s ease; font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    static showError(message) {
        this.showToast(message, 'error');
    }

    static toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        return newTheme;
    }

    static updateUI() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }
}