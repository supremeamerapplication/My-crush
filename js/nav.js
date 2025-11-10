// Navigation Component
class NavComponent {
    constructor(app) {
        this.app = app;
    }

    render() {
        return `
            <nav class="bottom-nav">
                <a class="nav-item active" data-page="homePage">
                    <div class="nav-icon"><i class="fas fa-home"></i></div>
                    <span>Home</span>
                </a>
                <a class="nav-item" data-page="searchPage">
                    <div class="nav-icon"><i class="fas fa-search"></i></div>
                    <span>Search</span>
                </a>
                <a class="nav-item" data-page="notificationsPage">
                    <div class="nav-icon"><i class="fas fa-bell"></i></div>
                    <span>Alerts</span>
                </a>
                <a class="nav-item" data-page="messagesPage">
                    <div class="nav-icon"><i class="fas fa-envelope"></i></div>
                    <span>Messages</span>
                </a>
                <a class="nav-item" data-page="profilePage">
                    <div class="nav-icon"><i class="fas fa-user"></i></div>
                    <span>Profile</span>
                </a>
            </nav>
        `;
    }
}