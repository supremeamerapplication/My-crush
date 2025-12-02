// Authentication Manager
class AuthManager {
    constructor() {
        this.supabase = window.app?.supabase;
        this.setupAuthForms();
    }

    setupAuthForms() {
        // Tab switching
        document.getElementById('loginTab').addEventListener('click', () => this.showLoginForm());
        document.getElementById('signupTab').addEventListener('click', () => this.showSignupForm());
        document.getElementById('showSignup').addEventListener('click', (e) => {
            e.preventDefault();
            this.showSignupForm();
        });
        document.getElementById('showLogin').addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginForm();
        });

        // Form submissions
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('signupForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSignup();
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.handleLogout();
        });
    }

    showLoginForm() {
        document.getElementById('loginTab').classList.add('active');
        document.getElementById('signupTab').classList.remove('active');
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('signupForm').style.display = 'none';
        this.clearErrors();
    }

    showSignupForm() {
        document.getElementById('signupTab').classList.add('active');
        document.getElementById('loginTab').classList.remove('active');
        document.getElementById('signupForm').style.display = 'block';
        document.getElementById('loginForm').style.display = 'none';
        this.clearErrors();
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const errorDiv = document.getElementById('loginError');
        const btn = document.getElementById('loginBtn');

        try {
            this.clearError(errorDiv);

            if (!email || !password) {
                throw new Error('Please fill in all fields');
            }

            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            window.app.showToast('Welcome back!', 'success');

        } catch (error) {
            this.showError(error.message, errorDiv);
            window.app.showToast('Login failed', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Login';
        }
    }

    async handleSignup() {
        const name = document.getElementById('signupName').value;
        const username = document.getElementById('signupUsername').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const bio = document.getElementById('signupBio').value;
        const errorDiv = document.getElementById('signupError');
        const btn = document.getElementById('signupBtn');

        try {
            this.clearError(errorDiv);

            if (!name || !username || !email || !password) {
                throw new Error('Please fill in all required fields');
            }

            if (password.length < 6) {
                throw new Error('Password must be at least 6 characters');
            }

            // Validate username format
            if (!/^[a-zA-Z0-9_]+$/.test(username)) {
                throw new Error('Username can only contain letters, numbers, and underscores');
            }

            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';

            // Check if username exists
            const { data: existingUser } = await this.supabase
                .from('profiles')
                .select('username')
                .eq('username', username.toLowerCase())
                .single();

            if (existingUser) {
                throw new Error('Username already exists');
            }

            const { data, error } = await this.supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: name,
                        username: username.toLowerCase(),
                        bio: bio
                    }
                }
            });

            if (error) throw error;

            window.app.showToast('Account created successfully!', 'success');
            
            // Auto-switch to login
            setTimeout(() => {
                this.showLoginForm();
                this.clearError(errorDiv);
                this.showError('Account created! Please check your email for verification.', errorDiv);
            }, 1500);

        } catch (error) {
            this.showError(error.message, errorDiv);
            window.app.showToast('Signup failed', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Sign Up';
        }
    }

    async handleLogout() {
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
            
            window.app.showToast('Logged out successfully', 'info');
        } catch (error) {
            console.error('Logout error:', error);
            window.app.showToast('Logout failed', 'error');
        }
    }

    clearErrors() {
        this.clearError(document.getElementById('loginError'));
        this.clearError(document.getElementById('signupError'));
    }

    clearError(errorDiv) {
        errorDiv.classList.remove('show');
        errorDiv.textContent = '';
    }

    showError(message, errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.add('show');
    }
}

window.AuthManager = AuthManager;