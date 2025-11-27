// Auth token storage
let authToken = localStorage.getItem('adminToken');
let authCredentials = localStorage.getItem('adminCredentials');

// Check authentication
function checkAuth() {
    if (!authToken && !authCredentials) {
        showLogin();
        return false;
    }
    hideLogin();
    return true;
}

function showLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('dashboard')?.style.display = 'none';
    document.querySelector('.sidebar')?.classList.add('hidden');
}

function hideLogin() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('dashboard')?.style.display = '';
    document.querySelector('.sidebar')?.classList.remove('hidden');
}

// Login function
async function login(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const resp = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        if (!resp.ok) {
            const data = await resp.json();
            document.getElementById('loginError').textContent = data.error || 'Login failed';
            return;
        }
        
        const data = await resp.json();
        authToken = data.token;
        authCredentials = btoa(`${username}:${password}`);
        localStorage.setItem('adminToken', authToken);
        localStorage.setItem('adminCredentials', authCredentials);
        
        hideLogin();
        location.reload();
    } catch (err) {
        document.getElementById('loginError').textContent = 'Connection error';
    }
}

// Logout
function logout() {
    authToken = null;
    authCredentials = null;
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminCredentials');
    location.href = '/admin/';
}

// Fetch with auth
async function fetchWithAuth(url, options = {}) {
    const headers = options.headers || {};
    
    if (authToken) {
        headers['X-Session-Token'] = authToken;
    } else if (authCredentials) {
        headers['Authorization'] = `Basic ${authCredentials}`;
    }
    
    return fetch(url, { ...options, headers });
}

// Show modal
function showModal(id) {
    document.getElementById(id).classList.add('active');
}

// Hide modal
function hideModal(id) {
    document.getElementById(id).classList.remove('active');
}

// Confirm dialog
function confirmAction(message) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content confirm-dialog">
                <p>${message}</p>
                <div class="btn-group">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove(); window._confirmResolve(false)">Cancel</button>
                    <button class="btn btn-danger" onclick="this.closest('.modal').remove(); window._confirmResolve(true)">Confirm</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        window._confirmResolve = resolve;
    });
}

// Format number
function formatNumber(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toLocaleString();
}

// Format date
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Mask key
function maskKey(key) {
    if (!key || key.length < 10) return '***';
    return key.substring(0, 7) + '***' + key.substring(key.length - 3);
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 24px;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        border-radius: 8px;
        z-index: 2000;
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Copy to clipboard
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard!');
    } catch (err) {
        showToast('Failed to copy', 'error');
    }
}
