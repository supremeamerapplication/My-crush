// Authentication Component
class AuthComponent {
    constructor(app) {
        this.app = app;
        this.currentForm = 'login';
    }

    render() {
        return `
            <div class="modal active" id="authModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <div class="modal-title">Join PrimeMar</div>
                        <button class="modal-close" id="closeAuthModal">&times;</button>
                    </div>
                    <div class="auth-page">
                        <div class="auth-form">
                            <div id="loginForm">
                                <h2>Sign in to PrimeMar</h2>
                                <div class="form-group">
                                    <label class="form-label">Email</label>
                                    <input type="email" class="form-input" id="loginEmail" placeholder="Enter your email">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Password</label>
                                    <input type="password" class="form-input" id="loginPassword" placeholder="Enter your password">
                                </div>
                                <button class="btn btn-primary" id="loginBtn">Sign In</button>
                                <div class="auth-toggle">
                                    Don't have an account? <a class="auth-link" id="showSignup">Sign up</a>
                                </div>
                            </div>

                            <div id="signupForm" class="hidden">
                                <h2>Create your account</h2>
                                <div class="form-group">
                                    <label class="form-label">Full Name</label>
                                    <input type="text" class="form-input" id="signupName" placeholder="Enter your full name">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Username</label>
                                    <input type="text" class="form-input" id="signupUsername" placeholder="Choose a username">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Email</label>
                                    <input type="email" class="form-input" id="signupEmail" placeholder="Enter your email">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Password</label>
                                    <input type="password" class="form-input" id="signupPassword" placeholder="Create a password">
                                </div>
                                <button class="btn btn-primary" id="signupBtn">Create Account</button>
                                <div class="auth-toggle">
                                    Already have an account? <a class="auth-link" id="showLogin">Sign in</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        document.getElementById('loginBtn').addEventListener('click', () => this.handleLogin());
        document.getElementById('signupBtn').addEventListener('click', () => this.handleSignup());
        document.getElementById('showSignup').addEventListener('click', () => this.showSignupForm());
        document.getElementById('showLogin').addEventListener('click', () => this.showLoginForm());
        document.getElementById('closeAuthModal').addEventListener('click', () => this.app.showAuthModal());
    }

    showLoginForm() {
        document.getElementById('loginForm').classList.remove('hidden');
        document.getElementById('signupForm').classList.add('hidden');
        this.currentForm = 'login';
    }

    showSignupForm() {
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('signupForm').classList.remove('hidden');
        this.currentForm = 'signup';
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        if (!email || !password) {
            Utils.showError('Please fill in all fields');
            return;
        }

        try {
            const { data, error } = await this.app.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) throw error;
            
            this.app.currentUser = data.user;
            this.app.showApp();
            await this.app.loadUserProfile();
            await this.app.components.home.load();
            Utils.showToast('Welcome back!');
            
        } catch (error) {
            Utils.showError('Login failed: ' + error.message);
        }
    }

    async handleSignup() {
        const name = document.getElementById('signupName').value;
        const username = document.getElementById('signupUsername').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        
        if (!name || !username || !email || !password) {
            Utils.showError('Please fill in all fields');
            return;
        }

        if (username.length < 3) {
            Utils.showError('Username must be at least 3 characters');
            return;
        }

        if (password.length < 6) {
            Utils.showError('Password must be at least 6 characters');
            return;
        }

        try {
            const { data, error } = await this.app.supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        name: name,
                        username: username.toLowerCase()
                    }
                }
            });
            
            if (error) throw error;
            
            // Wait for profile creation
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Check if profile was created
            const { data: profile } = await this.app.supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

            if (!profile) {
                // Create profile manually
                await this.app.supabase
                    .from('profiles')
                    .insert({
                        id: data.user.id,
                        name: name,
                        username: username.toLowerCase(),
                        email: email,
                        avatar: Utils.generateDefaultAvatar(name)
                    });
            }

            this.app.currentUser = data.user;
            this.app.showApp();
            await this.app.loadUserProfile();
            Utils.showToast('Account created successfully! Welcome to PrimeMar!');
            
        } catch (error) {
            Utils.showError('Signup failed: ' + error.message);
        }
    }
}