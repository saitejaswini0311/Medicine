// Global variables
let currentUser = null;

// Check authentication status on page load
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    loadHomeStats();
});

// Check if user is authenticated
function checkAuthStatus() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        currentUser = JSON.parse(user);
        updateAuthUI(true);
    } else {
        updateAuthUI(false);
    }
}

// Update authentication UI
function updateAuthUI(isAuthenticated) {
    const authButtons = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');
    const userName = document.getElementById('user-name');
    
    if (!authButtons || !userMenu) return;
    
    if (isAuthenticated && currentUser) {
        authButtons.style.display = 'none';
        userMenu.style.display = 'flex';
        if (userName) {
            userName.textContent = currentUser.name;
        }
    } else {
        authButtons.style.display = 'flex';
        userMenu.style.display = 'none';
    }
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    updateAuthUI(false);
    window.location.href = 'index.html';
}

// Load home page statistics
async function loadHomeStats() {
    try {
        // Load donor count
        const donorsResponse = await fetch('/api/donors', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!donorsResponse.ok) throw new Error('Failed to fetch donors');
        const donors = await donorsResponse.json();
        const donorCountElement = document.getElementById('donor-count');
        if (donorCountElement) {
            donorCountElement.textContent = donors.length;
        }

        // Load request count
        const requestsResponse = await fetch('/api/requests', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!requestsResponse.ok) throw new Error('Failed to fetch requests');
        const requests = await requestsResponse.json();
        const requestCountElement = document.getElementById('request-count');
        if (requestCountElement) {
            requestCountElement.textContent = requests.length;
        }

    } catch (error) {
        console.error('Error loading stats:', error);
        showMessage("Failed to load data", "error");
    }
}

// Utility function to show messages
function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'error' ? 'error' : 'success';
    messageDiv.textContent = message;
    
    // Insert at the top of the main content
    const main = document.querySelector('main');
    if (main) {
        main.insertBefore(messageDiv, main.firstChild);
        
        // Remove message after 5 seconds
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
}

// Utility function to format date
function formatDate(dateString) {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

// Utility function to format time ago
function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
    return `${Math.ceil(diffDays / 365)} years ago`;
}