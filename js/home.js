// Generate random username
function generateUsername(inputId) {
    const adjectives = ["swift", "calm", "brave", "clever", "quiet", "bold", "eager", "neat", "bright", "fierce"];
    const animals = ["fox", "panda", "tiger", "bear", "wolf", "eagle", "shark", "lion", "owl", "deer"];
    const num = Math.floor(Math.random() * 1000);
    const username = `${adjectives[Math.floor(Math.random() * adjectives.length)]}_${animals[Math.floor(Math.random() * animals.length)]}_${num}`;
    document.getElementById(inputId).value = username;
}

// Extract room ID from invite link
function extractRoomId() {
    const link = document.getElementById('inviteLink').value.trim();
    const match = link.match(/room\/([A-Z0-9]{6})/i);
    if (match) {
        document.getElementById('roomId').value = match[1].toUpperCase();
        document.getElementById('inviteLink').value = '';
        showNotification('Room ID extracted successfully!', 'success');
    } else {
        showNotification('Invalid invite link format', 'error');
    }
}

// Create a new room
async function createRoom() {
    const username = document.getElementById('createUsername').value.trim();
    const enableAI = document.getElementById('enableAI').checked;
    const roomLock = document.getElementById('roomLock').checked;

    if (!username) {
        showNotification('Please enter a display name', 'error');
        return;
    }

    if (username.length < 3) {
        showNotification('Display name must be at least 3 characters', 'error');
        return;
    }

    // Show loading modal
    document.getElementById('loadingModal').classList.remove('hidden');
    document.getElementById('createRoomBtn').disabled = true;

    try {
        const response = await fetch(`${window.BACKEND_URL}/api/rooms/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username,
                settings: {
                    enableAI: enableAI,
                    locked: roomLock
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to create room');
        }

        // Store room info in localStorage
        localStorage.setItem('currentRoom', JSON.stringify({
            roomId: data.roomId,
            username: username,
            isAdmin: true,
            adminToken: data.adminToken,
            roomSettings: data.settings
        }));

        // Show success modal
        document.getElementById('loadingModal').classList.add('hidden');
        document.getElementById('createdRoomId').value = data.roomId;
        document.getElementById('inviteLinkDisplay').value = `${window.location.origin}/room.html?room=${data.roomId}`;
        document.getElementById('adminTokenDisplay').textContent = data.adminToken;
        document.getElementById('roomCreatedModal').classList.remove('hidden');

    } catch (error) {
        console.error('Error creating room:', error);
        document.getElementById('loadingModal').classList.add('hidden');
        document.getElementById('createRoomBtn').disabled = false;
        showNotification(error.message || 'Failed to create room. Please try again.', 'error');
    }
}

// Join existing room
async function joinRoom() {
    const username = document.getElementById('joinUsername').value.trim();
    let roomId = document.getElementById('roomId').value.trim().toUpperCase();

    if (!username) {
        showNotification('Please enter a display name', 'error');
        return;
    }

    if (!roomId) {
        showNotification('Please enter a Room ID', 'error');
        return;
    }

    if (roomId.length !== 6) {
        showNotification('Room ID must be 6 characters', 'error');
        return;
    }

    document.getElementById('joinRoomBtn').disabled = true;

    try {
        const response = await fetch(`${window.BACKEND_URL}/api/rooms/${roomId}/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to join room');
        }

        // Store room info in localStorage
        localStorage.setItem('currentRoom', JSON.stringify({
            roomId: roomId,
            username: username,
            isAdmin: false,
            roomSettings: data.settings
        }));

        // Redirect to room
        window.location.href = `room.html?room=${roomId}`;

    } catch (error) {
        console.error('Error joining room:', error);
        document.getElementById('joinRoomBtn').disabled = false;
        showNotification(error.message || 'Failed to join room. Room might not exist or is locked.', 'error');
    }
}

// Copy room ID to clipboard
function copyRoomId() {
    const roomId = document.getElementById('createdRoomId').value;
    navigator.clipboard.writeText(roomId).then(() => {
        showNotification('Room ID copied to clipboard!', 'success');
    });
}

// Copy invite link to clipboard
function copyInviteLink() {
    const inviteLink = document.getElementById('inviteLinkDisplay').value;
    navigator.clipboard.writeText(inviteLink).then(() => {
        showNotification('Invite link copied to clipboard!', 'success');
    });
}

// Enter created room
function enterCreatedRoom() {
    const roomId = document.getElementById('createdRoomId').value;
    window.location.href = `room.html?room=${roomId}`;
}

// Close room modal
function closeRoomModal() {
    document.getElementById('roomCreatedModal').classList.add('hidden');
    document.getElementById('createRoomBtn').disabled = false;
}

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelector('.notification-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `notification-toast fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 ${type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'} text-white`;
    toast.textContent = message;
    toast.style.transform = 'translateX(100%)';

    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 10);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
    }, 3000);
}

// Theme toggle
document.getElementById('themeToggle').addEventListener('click', () => {
    const html = document.documentElement;
    const isDark = html.classList.contains('dark');
    
    if (isDark) {
        html.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        document.getElementById('themeToggle').innerHTML = '<i class="fas fa-moon"></i>';
    } else {
        html.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        document.getElementById('themeToggle').innerHTML = '<i class="fas fa-sun"></i>';
    }
});

// Load saved theme
window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.getElementById('themeToggle').innerHTML = '<i class="fas fa-sun"></i>';
    }
    
    // Generate random usernames on load
    generateUsername('createUsername');
    generateUsername('joinUsername');
});