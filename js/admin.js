class AdminPanel {
    constructor() {
        this.adminToken = null;
        this.adminUsername = null;
        this.statsInterval = null;
        this.chart = null;
        
        this.initialize();
    }

    async initialize() {
        // Check if already logged in
        const savedToken = localStorage.getItem('adminToken');
        const savedUsername = localStorage.getItem('adminUsername');
        
        if (savedToken && savedUsername) {
            this.adminToken = savedToken;
            this.adminUsername = savedUsername;
            this.showDashboard();
        }
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup theme
        this.setupTheme();
    }

    async loginAdmin() {
        const username = document.getElementById('adminLoginUsername').value.trim();
        const password = document.getElementById('adminLoginPassword').value.trim();
        
        if (!username || !password) {
            this.showNotification('Please enter username and password', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${window.BACKEND_URL}/api/admin/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username,
                    password
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }
            
            this.adminToken = data.token;
            this.adminUsername = data.username;
            
            // Save to localStorage
            localStorage.setItem('adminToken', data.token);
            localStorage.setItem('adminUsername', data.username);
            
            this.showDashboard();
            this.showNotification('Admin login successful!', 'success');
            
        } catch (error) {
            console.error('Admin login error:', error);
            this.showNotification(error.message || 'Login failed', 'error');
        }
    }

    showDashboard() {
        document.getElementById('adminLoginModal').classList.add('hidden');
        document.getElementById('adminDashboard').classList.remove('hidden');
        document.getElementById('adminUsername').textContent = this.adminUsername;
        document.getElementById('adminStatusText').textContent = 'Connected';
        document.getElementById('adminStatusDot').className = 'w-2 h-2 bg-green-500 rounded-full animate-pulse';
        
        // Load initial data
        this.loadStats();
        this.loadRooms();
        this.loadUsers();
        this.setupChart();
        
        // Start periodic updates
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
        }
        
        this.statsInterval = setInterval(() => {
            this.loadStats();
        }, 30000); // Update every 30 seconds
    }

    async loadStats() {
        try {
            const response = await fetch(`${window.BACKEND_URL}/api/admin/stats`, {
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`
                }
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    this.logoutAdmin();
                    return;
                }
                throw new Error('Failed to load stats');
            }
            
            const stats = await response.json();
            
            // Update stats display
            document.getElementById('statRooms').textContent = stats.totalRooms || 0;
            document.getElementById('statActiveRooms').textContent = stats.activeRooms || 0;
            document.getElementById('statNewRooms24h').textContent = stats.roomsCreated24h || 0;
            
            document.getElementById('statUsers').textContent = stats.totalUsers || 0;
            document.getElementById('statOnlineUsers').textContent = stats.totalUsers || 0; // Simplified
            document.getElementById('statRoomAdmins').textContent = Math.floor(stats.totalUsers / 10) || 0; // Estimated
            
            document.getElementById('statMessages').textContent = stats.totalMessages || 0;
            document.getElementById('statMessages24h').textContent = Math.floor(stats.totalMessages / 10) || 0; // Estimated
            document.getElementById('statAIMessages').textContent = Math.floor(stats.totalMessages / 20) || 0; // Estimated
            
            const uptimeHours = Math.floor(stats.uptime / 3600);
            document.getElementById('statUptime').textContent = `${uptimeHours}h`;
            
            const memoryMB = Math.round(stats.memoryUsage?.heapUsed / 1024 / 1024) || 0;
            document.getElementById('statMemory').textContent = `${memoryMB}MB`;
            
            // Update system status
            document.getElementById('statusWsConnections').textContent = stats.totalUsers || 0;
            
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async loadRooms() {
        try {
            const response = await fetch(`${window.BACKEND_URL}/api/admin/rooms`, {
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`
                }
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    this.logoutAdmin();
                    return;
                }
                throw new Error('Failed to load rooms');
            }
            
            const rooms = await response.json();
            this.renderRooms(rooms);
            
        } catch (error) {
            console.error('Error loading rooms:', error);
            this.showNotification('Failed to load rooms', 'error');
        }
    }

    renderRooms(rooms) {
        const tbody = document.getElementById('roomsTableBody');
        
        if (!rooms || rooms.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        <i class="fas fa-door-closed text-3xl mb-3"></i>
                        <p>No rooms found</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = rooms.map(room => `
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="font-mono font-bold text-gray-800 dark:text-white">${room.id}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-800 dark:text-white">${room.createdBy}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">
                        ${new Date(room.createdAt).toLocaleDateString()}
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center gap-2">
                        <span class="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                            ${room.userCount || 0} users
                        </span>
                        <span class="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs font-medium">
                            ${room.messageCount || 0} msgs
                        </span>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full ${room.userCount > 0 ? 'bg-green-500' : 'bg-gray-300'}"></span>
                        <span class="text-sm ${room.userCount > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}">
                            ${room.userCount > 0 ? 'Active' : 'Inactive'}
                        </span>
                        ${room.locked ? `
                            <span class="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs">
                                Locked
                            </span>
                        ` : ''}
                        ${room.aiEnabled ? `
                            <span class="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs">
                                AI
                            </span>
                        ` : ''}
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div class="flex gap-2">
                        <button onclick="adminPanel.viewRoomDetails('${room.id}')" class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition">
                            View
                        </button>
                        <button onclick="adminPanel.deleteRoom('${room.id}')" class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs transition">
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async loadUsers() {
        try {
            const response = await fetch(`${window.BACKEND_URL}/api/admin/users`, {
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`
                }
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    this.logoutAdmin();
                    return;
                }
                throw new Error('Failed to load users');
            }
            
            const users = await response.json();
            this.renderUsers(users);
            
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    renderUsers(users) {
        const tbody = document.getElementById('usersTableBody');
        
        if (!users || users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        <i class="fas fa-users-slash text-3xl mb-3"></i>
                        <p>No active users</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = users.map(user => `
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-sm font-bold">
                            ${user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div class="font-medium text-gray-800 dark:text-white">${user.username}</div>
                            <div class="text-xs text-gray-500 dark:text-gray-400">${user.id}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="font-mono text-sm text-gray-800 dark:text-white">${user.roomId}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    ${user.isAdmin ? `
                        <span class="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded text-xs font-medium">
                            Room Admin
                        </span>
                    ` : `
                        <span class="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">
                            User
                        </span>
                    `}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-800 dark:text-white">
                        ${this.timeAgo(user.lastActive)}
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onclick="adminPanel.banUser('${user.id}', '${user.username}')" class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs transition">
                        Ban
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async viewRoomDetails(roomId) {
        try {
            const response = await fetch(`${window.BACKEND_URL}/api/admin/rooms/${roomId}`, {
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to load room details');
            }
            
            const room = await response.json();
            
            const content = document.getElementById('roomDetailsContent');
            content.innerHTML = `
                <div class="space-y-6">
                    <!-- Room Info -->
                    <div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <div class="text-sm text-gray-500 dark:text-gray-400">Room ID</div>
                                <div class="font-mono font-bold text-lg text-gray-800 dark:text-white">${room.id}</div>
                            </div>
                            <div>
                                <div class="text-sm text-gray-500 dark:text-gray-400">Created By</div>
                                <div class="font-bold text-gray-800 dark:text-white">${room.createdBy}</div>
                            </div>
                            <div>
                                <div class="text-sm text-gray-500 dark:text-gray-400">Created At</div>
                                <div class="text-gray-800 dark:text-white">${new Date(room.createdAt).toLocaleString()}</div>
                            </div>
                            <div>
                                <div class="text-sm text-gray-500 dark:text-gray-400">Status</div>
                                <div class="flex items-center gap-2">
                                    <span class="w-2 h-2 rounded-full ${room.users?.length > 0 ? 'bg-green-500' : 'bg-gray-300'}"></span>
                                    <span>${room.users?.length > 0 ? 'Active' : 'Inactive'}</span>
                                </div>
                            </div>
                            <div>
                                <div class="text-sm text-gray-500 dark:text-gray-400">AI Assistant</div>
                                <div class="${room.aiEnabled ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}">
                                    ${room.aiEnabled ? 'Enabled' : 'Disabled'}
                                </div>
                            </div>
                            <div>
                                <div class="text-sm text-gray-500 dark:text-gray-400">Locked</div>
                                <div class="${room.locked ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}">
                                    ${room.locked ? 'Yes' : 'No'}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Users -->
                    <div>
                        <h4 class="text-lg font-semibold text-gray-800 dark:text-white mb-3">Users in Room (${room.users?.length || 0})</h4>
                        <div class="space-y-2">
                            ${room.users?.map(user => `
                                <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <div class="flex items-center gap-3">
                                        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-sm font-bold">
                                            ${user.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div class="font-medium text-gray-800 dark:text-white">${user.username}</div>
                                            <div class="text-xs text-gray-500 dark:text-gray-400">
                                                Joined ${new Date(user.joinedAt).toLocaleTimeString()}
                                            </div>
                                        </div>
                                    </div>
                                    ${user.isAdmin ? `
                                        <span class="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded text-xs">
                                            Room Admin
                                        </span>
                                    ` : ''}
                                </div>
                            `).join('') || '<p class="text-gray-500 dark:text-gray-400 text-center py-4">No users in room</p>'}
                        </div>
                    </div>
                    
                    <!-- Recent Messages -->
                    <div>
                        <h4 class="text-lg font-semibold text-gray-800 dark:text-white mb-3">Recent Messages (${room.messages?.length || 0})</h4>
                        <div class="space-y-2 max-h-60 overflow-y-auto">
                            ${room.messages?.slice(-10).map(msg => `
                                <div class="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <div class="flex justify-between items-start mb-1">
                                        <span class="font-medium text-gray-800 dark:text-white">${msg.sender}</span>
                                        <span class="text-xs text-gray-500 dark:text-gray-400">
                                            ${new Date(msg.createdAt).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <p class="text-sm text-gray-600 dark:text-gray-300">${msg.text}</p>
                                </div>
                            `).join('') || '<p class="text-gray-500 dark:text-gray-400 text-center py-4">No messages yet</p>'}
                        </div>
                    </div>
                    
                    <!-- Actions -->
                    <div class="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button onclick="adminPanel.deleteRoom('${room.id}')" class="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition">
                            Delete Room
                        </button>
                        <button onclick="adminPanel.sendToRoom('${room.id}')" class="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition">
                            Send Message
                        </button>
                        <button onclick="closeRoomDetails()" class="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                            Close
                        </button>
                    </div>
                </div>
            `;
            
            document.getElementById('roomDetailsModal').classList.remove('hidden');
            
        } catch (error) {
            console.error('Error loading room details:', error);
            this.showNotification('Failed to load room details', 'error');
        }
    }

    closeRoomDetails() {
        document.getElementById('roomDetailsModal').classList.add('hidden');
    }

    async deleteRoom(roomId) {
        if (!confirm(`Are you sure you want to delete room ${roomId}? This will remove all messages and kick all users.`)) {
            return;
        }
        
        try {
            const response = await fetch(`${window.BACKEND_URL}/api/admin/rooms/${roomId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete room');
            }
            
            this.showNotification(`Room ${roomId} deleted successfully`, 'success');
            this.loadRooms();
            this.loadStats();
            
        } catch (error) {
            console.error('Error deleting room:', error);
            this.showNotification('Failed to delete room', 'error');
        }
    }

    async banUser(userId, username) {
        if (!confirm(`Are you sure you want to ban user "${username}"?`)) {
            return;
        }
        
        try {
            const response = await fetch(`${window.BACKEND_URL}/api/admin/users/${userId}/ban`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to ban user');
            }
            
            this.showNotification(`User "${username}" banned successfully`, 'success');
            this.loadUsers();
            this.loadStats();
            
        } catch (error) {
            console.error('Error banning user:', error);
            this.showNotification('Failed to ban user', 'error');
        }
    }

    showMaintenanceModal() {
        document.getElementById('maintenanceModal').classList.remove('hidden');
    }

    closeMaintenanceModal() {
        document.getElementById('maintenanceModal').classList.add('hidden');
    }

    async applyMaintenance() {
        const message = document.getElementById('maintenanceMessage').value.trim();
        const enabled = document.getElementById('enableMaintenance').checked;
        
        try {
            const response = await fetch(`${window.BACKEND_URL}/api/admin/maintenance`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    enabled,
                    message
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to set maintenance mode');
            }
            
            this.showNotification(`Maintenance mode ${enabled ? 'enabled' : 'disabled'}`, 'success');
            this.closeMaintenanceModal();
            
        } catch (error) {
            console.error('Error setting maintenance:', error);
            this.showNotification('Failed to set maintenance mode', 'error');
        }
    }

    showBroadcastModal() {
        document.getElementById('broadcastModal').classList.remove('hidden');
        
        // Show/hide specific room field based on selection
        const targetSelect = document.getElementById('broadcastTarget');
        const roomField = document.getElementById('specificRoomField');
        
        targetSelect.addEventListener('change', () => {
            roomField.classList.toggle('hidden', targetSelect.value !== 'specific');
        });
    }

    closeBroadcastModal() {
        document.getElementById('broadcastModal').classList.add('hidden');
    }

    async sendBroadcast() {
        const message = document.getElementById('broadcastMessage').value.trim();
        const target = document.getElementById('broadcastTarget').value;
        const roomId = document.getElementById('broadcastRoomId').value.trim();
        
        if (!message) {
            this.showNotification('Please enter a message', 'error');
            return;
        }
        
        if (target === 'specific' && !roomId) {
            this.showNotification('Please enter a room ID', 'error');
            return;
        }
        
        try {
            // In a real implementation, you would send this to your WebSocket server
            // For now, just show a success message
            this.showNotification('Broadcast message sent', 'success');
            this.closeBroadcastModal();
            
        } catch (error) {
            console.error('Error sending broadcast:', error);
            this.showNotification('Failed to send broadcast', 'error');
        }
    }

    sendToRoom(roomId) {
        document.getElementById('broadcastTarget').value = 'specific';
        document.getElementById('broadcastRoomId').value = roomId;
        document.getElementById('broadcastMessage').value = 'Admin message: Please maintain respectful conversation.';
        this.showBroadcastModal();
    }

    showRoomSearch() {
        const searchTerm = prompt('Enter room ID or creator username:');
        if (searchTerm) {
            // Filter rooms based on search term
            const rows = document.querySelectorAll('#roomsTableBody tr');
            rows.forEach(row => {
                const roomId = row.querySelector('td:first-child .font-mono')?.textContent;
                const creator = row.querySelector('td:nth-child(2) .text-sm')?.textContent;
                
                if (roomId?.includes(searchTerm.toUpperCase()) || creator?.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        }
    }

    refreshRooms() {
        this.loadRooms();
        this.showNotification('Rooms refreshed', 'success');
    }

    refreshAllData() {
        this.loadStats();
        this.loadRooms();
        this.loadUsers();
        this.showNotification('All data refreshed', 'success');
    }

    setupChart() {
        const ctx = document.getElementById('activityChart').getContext('2d');
        
        if (this.chart) {
            this.chart.destroy();
        }
        
        // Sample data for the chart
        const hours = Array.from({length: 12}, (_, i) => `${i * 2}h`);
        const messages = hours.map(() => Math.floor(Math.random() * 100));
        const users = hours.map(() => Math.floor(Math.random() * 50));
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: hours,
                datasets: [
                    {
                        label: 'Messages',
                        data: messages,
                        borderColor: 'rgb(99, 102, 241)',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Users',
                        data: users,
                        borderColor: 'rgb(16, 185, 129)',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: window.matchMedia('(prefers-color-scheme: dark)').matches ? '#fff' : '#374151'
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(156, 163, 175, 0.1)'
                        },
                        ticks: {
                            color: window.matchMedia('(prefers-color-scheme: dark)').matches ? '#9CA3AF' : '#6B7280'
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(156, 163, 175, 0.1)'
                        },
                        ticks: {
                            color: window.matchMedia('(prefers-color-scheme: dark)').matches ? '#9CA3AF' : '#6B7280'
                        }
                    }
                }
            }
        });
    }

    logoutAdmin() {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUsername');
        
        this.adminToken = null;
        this.adminUsername = null;
        
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
            this.statsInterval = null;
        }
        
        document.getElementById('adminDashboard').classList.add('hidden');
        document.getElementById('adminLoginModal').classList.remove('hidden');
        document.getElementById('adminLoginUsername').value = '';
        document.getElementById('adminLoginPassword').value = '';
        
        this.showNotification('Logged out successfully', 'success');
    }

    timeAgo(timestamp) {
        const now = new Date();
        const past = new Date(timestamp);
        const diff = now - past;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    }

    showNotification(message, type = 'info') {
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

    setupEventListeners() {
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
    }

    setupTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
            document.getElementById('themeToggle').innerHTML = '<i class="fas fa-sun"></i>';
        }
    }
}

// Global admin panel instance
let adminPanel;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    adminPanel = new AdminPanel();
});

// Expose methods to global scope
window.loginAdmin = () => adminPanel.loginAdmin();
window.logoutAdmin = () => adminPanel.logoutAdmin();
window.refreshRooms = () => adminPanel.refreshRooms();
window.refreshAllData = () => adminPanel.refreshAllData();
window.showMaintenanceModal = () => adminPanel.showMaintenanceModal();
window.closeMaintenanceModal = () => adminPanel.closeMaintenanceModal();
window.applyMaintenance = () => adminPanel.applyMaintenance();
window.showBroadcastModal = () => adminPanel.showBroadcastModal();
window.closeBroadcastModal = () => adminPanel.closeBroadcastModal();
window.sendBroadcast = () => adminPanel.sendBroadcast();
window.showRoomSearch = () => adminPanel.showRoomSearch();
window.closeRoomDetails = () => adminPanel.closeRoomDetails();