// Settings Manager
class SettingsManager {
    constructor() {
        this.supabase = window.app?.supabase;
        this.currentUser = window.app?.currentUser;
        this.userProfile = window.app?.userProfile;
        
        this.init();
    }

    init() {
        this.loadSettings();
    }

    async loadSettings() {
        try {
            // Load current settings
            const { data: profile, error } = await this.supabase
                .from('profiles')
                .select('email, private_account, show_online_status')
                .eq('id', this.currentUser.id)
                .single();

            if (error) throw error;

            // Update form fields
            document.getElementById('settingsEmail').value = profile.email || '';
            document.getElementById('privateAccount').checked = profile.private_account || false;
            document.getElementById('showOnline').checked = profile.show_online_status || true;

        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async saveSettings() {
        try {
            const updates = {
                private_account: document.getElementById('privateAccount').checked,
                show_online_status: document.getElementById('showOnline').checked,
                updated_at: new Date().toISOString()
            };

            // Update password if provided
            const newPassword = document.getElementById('settingsPassword').value;
            if (newPassword) {
                if (newPassword.length < 6) {
                    throw new Error('Password must be at least 6 characters');
                }

                const { error: passwordError } = await this.supabase.auth.updateUser({
                    password: newPassword
                });

                if (passwordError) throw passwordError;

                // Clear password field
                document.getElementById('settingsPassword').value = '';
            }

            // Update profile settings
            const { error } = await this.supabase
                .from('profiles')
                .update(updates)
                .eq('id', this.currentUser.id);

            if (error) throw error;

            // Update local profile
            if (this.userProfile) {
                Object.assign(this.userProfile, updates);
            }

            window.app.showToast('Settings saved successfully!', 'success');

        } catch (error) {
            console.error('Error saving settings:', error);
            window.app.showToast(error.message || 'Error saving settings', 'error');
        }
    }
}

window.SettingsManager = SettingsManager;