// Header Component
class HeaderComponent {
    constructor(app) {
        this.app = app;
    }

    render() {
        return `
            <header class="header">
                <div class="logo">
                    <img src="logo.jpg" alt="PrimeMar" class="logo-img" onerror="this.style.display='none'">
                    <span>PrimeMar</span>
                </div>
                <div class="header-nav">
                    <div class="nav-dropdown">
                        <button class="nav-dropdown-btn">
                            <i class="fas fa-user"></i>
                            <span id="userNameNav">User</span>
                            <i class="fas fa-chevron-down"></i>
                        </button>
                        <div class="nav-dropdown-content" id="navDropdown">
                            <button class="nav-dropdown-item" data-page="settingsPage">
                                <i class="fas fa-cog"></i>
                                <span>Settings</span>
                            </button>
                            <button class="nav-dropdown-item" data-page="profilePage">
                                <i class="fas fa-user-edit"></i>
                                <span>Update Profile</span>
                            </button>
                            <button class="nav-dropdown-item" id="securitySettingsBtn">
                                <i class="fas fa-shield-alt"></i>
                                <span>Security</span>
                            </button>
                            <div class="nav-dropdown-divider"></div>
                            <button class="nav-dropdown-item" data-page="groupsPage">
                                <i class="fas fa-users"></i>
                                <span>Groups</span>
                            </button>
                            <button class="nav-dropdown-item" data-page="pagesPage">
                                <i class="fas fa-flag"></i>
                                <span>Pages</span>
                            </button>
                            <div class="nav-dropdown-divider"></div>
                            <button class="nav-dropdown-item" id="themeToggleNav">
                                <i class="fas fa-moon"></i>
                                <span>Dark Mode</span>
                            </button>
                            <button class="nav-dropdown-item" id="aboutBtn">
                                <i class="fas fa-info-circle"></i>
                                <span>About</span>
                            </button>
                            <button class="nav-dropdown-item" id="privacyBtn">
                                <i class="fas fa-lock"></i>
                                <span>Privacy & Terms</span>
                            </button>
                            <div class="nav-dropdown-divider"></div>
                            <button class="nav-dropdown-item" id="logoutBtnNav">
                                <i class="fas fa-sign-out-alt"></i>
                                <span>Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>
        `;
    }

    updateUserInfo(userProfile) {
        const userNameNav = document.getElementById('userNameNav');
        if (userNameNav && userProfile) {
            userNameNav.textContent = userProfile.name;
        }
    }

    setupEventListeners() {
        // Header dropdown
        document.querySelector('.nav-dropdown-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('navDropdown').classList.toggle('show');
        });

        // Theme toggle
        document.getElementById('themeToggleNav').addEventListener('click', () => {
            const newTheme = Utils.toggleTheme();
            const themeIcon = document.querySelector('#themeToggleNav i');
            themeIcon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            document.getElementById('navDropdown').classList.remove('show');
        });

        // Logout
        document.getElementById('logoutBtnNav').addEventListener('click', () => {
            this.app.logout();
            document.getElementById('navDropdown').classList.remove('show');
        });

        // Security settings
        document.getElementById('securitySettingsBtn').addEventListener('click', () => {
            document.getElementById('securityModal').classList.add('active');
            document.getElementById('navDropdown').classList.remove('show');
        });

        // About
        document.getElementById('aboutBtn').addEventListener('click', () => {
            document.getElementById('aboutModal').classList.add('active');
            document.getElementById('navDropdown').classList.remove('show');
        });

        // Privacy
        document.getElementById('privacyBtn').addEventListener('click', () => {
            document.getElementById('privacyModal').classList.add('active');
            document.getElementById('navDropdown').classList.remove('show');
        });
    }
}