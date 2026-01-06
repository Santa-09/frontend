class ChatRoom {
    constructor() {
        this.roomId = null;
        this.username = null;
        this.isAdmin = false;
        this.adminToken = null;
        this.socket = null;
        this.onlineUsers = new Map();
        this.messageQueue = [];
        this.selectedUserId = null;
        this.aiEnabled = false;
        
        this.initialize();
    }

    async initialize() {
        // Get room ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        this.roomId = urlParams.get('room');
        
        if (!this.roomId) {
            this.showError('No room specified. Please join a room first.');
            setTimeout(() => window.location.href = 'index.html', 3000);
            return;
        }

        // Get room data from localStorage
        const roomData = localStorage.getItem('currentRoom');
        if (!roomData) {
            this.showError('No room session found. Please join the room again.');
            setTimeout(() => window.location.href = 'index.html', 3000);
            return;
        }

        const { roomId, username, isAdmin, adminToken } = JSON.parse(roomData);
        
        if (roomId !== this.roomId) {
            this.showError('Room ID mismatch. Please join the correct room.');
            setTimeout(() => window.location.href = 'index.html', 3000);
            return;
        }

        this.username = username;
        this.isAdmin = isAdmin;
        this.adminToken = adminToken;

        // Update UI
        document.getElementById('roomTitle').textContent = `Room: ${this.roomId}`;
        document.getElementById('roomIdDisplay').textContent = `ID: ${this.roomId}`;
        document.getElementById('currentUsername').textContent = this.username;
        
        if (this.isAdmin) {
            document.getElementById('adminBadge').classList.remove('hidden');
            document.getElementById('adminPanel').classList.remove('hidden');
        }

        // Connect to WebSocket
        this.connectWebSocket();

        // Load chat history
        await this.loadChatHistory();

        // Setup event listeners
        this.setupEventListeners();

        // Setup theme
        this.setupTheme();
    }

    connectWebSocket() {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        const wsUrl = `${wsProtocol}${window.BACKEND_URL.replace(/^https?:\/\//, '')}/ws/room/${this.roomId}`;
        
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
            console.log('WebSocket connected');
            this.updateStatus(true);
            
            // Send join message
            this.socket.send(JSON.stringify({
                type: 'join',
                username: this.username,
                isAdmin: this.isAdmin,
                adminToken: this.adminToken
            }));
        };

        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
        };

        this.socket.onclose = () => {
            console.log('WebSocket disconnected');
            this.updateStatus(false);
            
            // Try to reconnect after 3 seconds
            setTimeout(() => {
                if (this.socket.readyState === WebSocket.CLOSED) {
                    this.connectWebSocket();
                }
            }, 3000);
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    async loadChatHistory() {
        try {
            const response = await fetch(`${window.BACKEND_URL}/api/rooms/${this.roomId}/messages`);
            if (!response.ok) throw new Error('Failed to load messages');
            
            const messages = await response.json();
            this.renderMessages(messages);
        } catch (error) {
            console.error('Error loading chat history:', error);
        }
    }

    handleMessage(data) {
        switch (data.type) {
            case 'user_joined':
                this.addOnlineUser(data.user);
                this.addSystemMessage(`${data.user.username} joined the room`);
                break;
                
            case 'user_left':
                this.removeOnlineUser(data.userId);
                this.addSystemMessage(`${data.username} left the room`);
                break;
                
            case 'online_users':
                this.updateOnlineUsers(data.users);
                break;
                
            case 'message':
                this.addMessage(data.message);
                break;
                
            case 'message_deleted':
                this.deleteMessage(data.messageId);
                break;
                
            case 'chat_cleared':
                this.clearChat();
                break;
                
            case 'user_kicked':
                if (data.userId === this.getUserId()) {
                    this.showError('You have been kicked from the room');
                    setTimeout(() => window.location.href = 'index.html', 3000);
                } else {
                    this.removeOnlineUser(data.userId);
                    this.addSystemMessage(`${data.username} was kicked from the room`);
                }
                break;
                
            case 'room_locked':
                this.addSystemMessage('Room has been locked. No new users can join.');
                break;
                
            case 'ai_toggled':
                this.aiEnabled = data.enabled;
                this.updateAIStatus();
                this.addSystemMessage(`AI Assistant has been ${data.enabled ? 'enabled' : 'disabled'}`);
                break;
                
            case 'room_info':
                this.updateRoomInfo(data.room);
                break;
                
            case 'error':
                this.showError(data.message);
                break;
        }
    }

    addOnlineUser(user) {
        this.onlineUsers.set(user.id, user);
        this.renderOnlineUsers();
    }

    removeOnlineUser(userId) {
        this.onlineUsers.delete(userId);
        this.renderOnlineUsers();
    }

    updateOnlineUsers(users) {
        this.onlineUsers.clear();
        users.forEach(user => this.onlineUsers.set(user.id, user));
        this.renderOnlineUsers();
    }

    renderOnlineUsers() {
        const container = document.getElementById('onlineUsersList');
        const userCount = document.getElementById('userCount');
        const onlineCount = document.getElementById('onlineCount');
        
        if (this.onlineUsers.size === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                    <i class="fas fa-users-slash text-3xl mb-3"></i>
                    <p>No other users online</p>
                </div>
            `;
        } else {
            const usersArray = Array.from(this.onlineUsers.values());
            container.innerHTML = usersArray.map(user => `
                <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-sm font-bold">
                            ${user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div class="font-medium text-gray-800 dark:text-white">${user.username}</div>
                            <div class="flex items-center gap-1 text-xs">
                                <span class="w-2 h-2 bg-green-500 rounded-full"></span>
                                <span class="text-gray-500 dark:text-gray-400">online</span>
                            </div>
                        </div>
                    </div>
                    ${this.isAdmin && !user.isAdmin ? `
                        <button onclick="chatRoom.kickUser('${user.id}', '${user.username}')" class="text-red-500 hover:text-red-700 transition">
                            <i class="fas fa-user-slash"></i>
                        </button>
                    ` : ''}
                </div>
            `).join('');
        }
        
        userCount.textContent = this.onlineUsers.size;
        onlineCount.textContent = this.onlineUsers.size;
    }

    addMessage(message) {
        const container = document.getElementById('chatMessages');
        const isEmpty = container.querySelector('.text-center');
        
        if (isEmpty) {
            container.innerHTML = '';
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `flex ${message.sender === this.username ? 'justify-end' : 'justify-start'} mb-4`;
        messageDiv.dataset.messageId = message.id;
        
        const isAI = message.sender === 'AI Assistant';
        const isSystem = message.sender === 'System';
        
        if (isSystem) {
            messageDiv.className = 'flex justify-center mb-4';
            messageDiv.innerHTML = `
                <div class="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300">
                    ${message.text}
                </div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="max-w-[70%] ${message.sender === this.username ? 'flex flex-col items-end' : ''}">
                    <div class="flex items-end gap-2 mb-1">
                        ${message.sender !== this.username ? `
                            <div class="w-8 h-8 rounded-full ${isAI ? 'bg-gradient-to-br from-green-400 to-emerald-400' : 'bg-gradient-to-br from-indigo-400 to-purple-400'} flex items-center justify-center text-white text-sm font-bold">
                                ${isAI ? '🤖' : message.sender.charAt(0).toUpperCase()}
                            </div>
                        ` : ''}
                        
                        <div class="${message.sender === this.username ? 'bg-indigo-500 text-white' : isAI ? 'bg-green-100 dark:bg-green-900/30 text-gray-800 dark:text-green-100' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white'} rounded-2xl ${message.sender === this.username ? 'rounded-br-none' : 'rounded-bl-none'} px-4 py-3">
                            ${message.text}
                        </div>
                        
                        ${message.sender === this.username ? `
                            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-sm font-bold">
                                ${message.sender.charAt(0).toUpperCase()}
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 px-1 ${message.sender === this.username ? 'justify-end' : 'justify-start'}">
                        <span>${message.sender}</span>
                        <span>•</span>
                        <span>${this.formatTime(message.createdAt)}</span>
                        ${(this.isAdmin || message.sender === this.username) && !isAI ? `
                            <span>•</span>
                            <button onclick="chatRoom.deleteMessage('${message.id}')" class="text-red-500 hover:text-red-700 transition">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
    }

    renderMessages(messages) {
        const container = document.getElementById('chatMessages');
        container.innerHTML = '';
        
        if (messages.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12 text-gray-500 dark:text-gray-400">
                    <i class="fas fa-comments text-4xl mb-4"></i>
                    <h3 class="text-lg font-medium mb-2">Welcome to the chat!</h3>
                    <p>Start the conversation by sending a message below.</p>
                </div>
            `;
            return;
        }

        messages.forEach(message => {
            this.addMessage(message);
        });
        
        container.scrollTop = container.scrollHeight;
    }

    async sendMessage() {
        const input = document.getElementById('messageInput');
        const message = input.value.trim();
        
        if (!message) return;
        
        // Clear input
        input.value = '';
        document.getElementById('charCount').textContent = '0';
        
        // Send via WebSocket
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'message',
                text: message,
                requestAI: document.getElementById('aiAssistText').textContent === 'AI Assist ON'
            }));
        }
    }

    async deleteMessage(messageId) {
        if (!this.isAdmin) {
            // Check if user owns the message
            const messageDiv = document.querySelector(`[data-message-id="${messageId}"]`);
            if (!messageDiv) return;
            
            const sender = messageDiv.querySelector('.text-xs span:first-child')?.textContent;
            if (sender !== this.username) {
                this.showError('You can only delete your own messages');
                return;
            }
        }

        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'delete_message',
                messageId: messageId
            }));
        }
    }

    deleteMessageFromUI(messageId) {
        const messageDiv = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageDiv) {
            messageDiv.remove();
        }
    }

    clearChat() {
        const container = document.getElementById('chatMessages');
        container.innerHTML = `
            <div class="text-center py-12 text-gray-500 dark:text-gray-400">
                <i class="fas fa-comments text-4xl mb-4"></i>
                <h3 class="text-lg font-medium mb-2">Chat cleared</h3>
                <p>Start a new conversation!</p>
            </div>
        `;
    }

    async clearChatConfirm() {
        if (!this.isAdmin) {
            this.showError('Only room admin can clear chat');
            return;
        }

        if (confirm('Are you sure you want to clear all messages in this room?')) {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({
                    type: 'clear_chat'
                }));
            }
        }
    }

    kickUser(userId, username) {
        this.selectedUserId = userId;
        document.getElementById('kickUserModal').classList.remove('hidden');
        
        // Update kick users list
        const list = document.getElementById('kickUsersList');
        list.innerHTML = `
            <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-sm font-bold">
                        ${username.charAt(0).toUpperCase()}
                    </div>
                    <div class="font-medium text-gray-800 dark:text-white">${username}</div>
                </div>
                <button onclick="chatRoom.selectUser('${userId}')" class="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
                    Select
                </button>
            </div>
        `;
    }

    selectUser(userId) {
        this.selectedUserId = userId;
        document.getElementById('confirmKickBtn').disabled = false;
        
        // Highlight selected user
        document.querySelectorAll('#kickUsersList > div').forEach(div => {
            div.classList.remove('border-2', 'border-red-500');
        });
        
        const selectedDiv = document.querySelector(`button[onclick*="${userId}"]`).parentElement.parentElement;
        selectedDiv.classList.add('border-2', 'border-red-500');
    }

    async confirmKick() {
        if (!this.selectedUserId || !this.isAdmin) return;
        
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'kick_user',
                userId: this.selectedUserId
            }));
        }
        
        this.closeKickModal();
    }

    closeKickModal() {
        document.getElementById('kickUserModal').classList.add('hidden');
        this.selectedUserId = null;
        document.getElementById('confirmKickBtn').disabled = true;
    }

    async toggleAI() {
        if (!this.isAdmin) {
            this.showError('Only room admin can toggle AI');
            return;
        }

        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'toggle_ai'
            }));
        }
    }

    toggleAIAssist() {
        const textElement = document.getElementById('aiAssistText');
        if (textElement.textContent === 'Ask AI') {
            textElement.textContent = 'AI Assist ON';
            textElement.parentElement.classList.add('text-indigo-600', 'dark:text-indigo-400');
        } else {
            textElement.textContent = 'Ask AI';
            textElement.parentElement.classList.remove('text-indigo-600', 'dark:text-indigo-400');
        }
    }

    async lockRoom() {
        if (!this.isAdmin) {
            this.showError('Only room admin can lock room');
            return;
        }

        if (confirm('Lock this room? New users will not be able to join.')) {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({
                    type: 'lock_room'
                }));
            }
        }
    }

    copyRoomLink() {
        const link = `${window.location.origin}/index.html?room=${this.roomId}`;
        navigator.clipboard.writeText(link).then(() => {
            this.showNotification('Room link copied to clipboard!', 'success');
        });
    }

    leaveRoom() {
        if (confirm('Are you sure you want to leave this room?')) {
            localStorage.removeItem('currentRoom');
            window.location.href = 'index.html';
        }
    }

    updateStatus(connected) {
        const dot = document.getElementById('statusDot');
        const text = document.getElementById('statusText');
        
        if (connected) {
            dot.className = 'w-2 h-2 bg-green-500 rounded-full animate-pulse';
            text.textContent = 'Connected';
        } else {
            dot.className = 'w-2 h-2 bg-red-500 rounded-full';
            text.textContent = 'Disconnected - Reconnecting...';
        }
    }

    updateRoomInfo(room) {
        if (room.createdAt) {
            document.getElementById('roomCreatedAt').textContent = new Date(room.createdAt).toLocaleDateString();
        }
        
        this.aiEnabled = room.aiEnabled || false;
        this.updateAIStatus();
    }

    updateAIStatus() {
        const aiStatus = document.getElementById('roomAIStatus');
        const aiToggleText = document.getElementById('aiToggleText');
        
        if (this.aiEnabled) {
            aiStatus.textContent = 'On';
            aiStatus.className = 'text-green-600 dark:text-green-400';
            aiToggleText.textContent = 'Disable AI';
        } else {
            aiStatus.textContent = 'Off';
            aiStatus.className = 'text-gray-800 dark:text-gray-200';
            aiToggleText.textContent = 'Enable AI';
        }
    }

    addSystemMessage(text) {
        const container = document.getElementById('chatMessages');
        const isEmpty = container.querySelector('.text-center');
        
        if (isEmpty) {
            container.innerHTML = '';
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = 'flex justify-center mb-4';
        messageDiv.innerHTML = `
            <div class="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300">
                ${text}
            </div>
        `;

        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    getUserId() {
        // Generate a simple user ID based on username and room
        return `${this.roomId}_${this.username}`.replace(/[^a-zA-Z0-9]/g, '_');
    }

    showError(message) {
        this.showNotification(message, 'error');
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
        // Message input events
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        
        messageInput.addEventListener('input', () => {
            document.getElementById('charCount').textContent = messageInput.value.length;
        });
        
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        sendButton.addEventListener('click', () => this.sendMessage());

        // Room menu toggle
        const menuBtn = document.getElementById('roomMenuBtn');
        const menu = document.getElementById('roomMenu');
        
        menuBtn.addEventListener('click', () => {
            menu.classList.toggle('hidden');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!menuBtn.contains(e.target) && !menu.contains(e.target)) {
                menu.classList.add('hidden');
            }
        });

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

// Global chat room instance
let chatRoom;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    chatRoom = new ChatRoom();
});

// Expose methods to global scope for onclick handlers
window.copyRoomLink = () => chatRoom.copyRoomLink();
window.toggleAI = () => chatRoom.toggleAI();
window.clearChat = () => chatRoom.clearChatConfirm();
window.leaveRoom = () => chatRoom.leaveRoom();
window.toggleAIAssist = () => chatRoom.toggleAIAssist();
window.sendMessage = () => chatRoom.sendMessage();
window.kickUserModal = () => chatRoom.kickUserModal?.();
window.closeKickModal = () => chatRoom.closeKickModal();
window.confirmKick = () => chatRoom.confirmKick();
window.lockRoom = () => chatRoom.lockRoom();

// Add these methods to chatRoom class
ChatRoom.prototype.kickUser = function(userId, username) {
    this.selectedUserId = userId;
    document.getElementById('kickUserModal').classList.remove('hidden');
    
    // Update kick users list
    const list = document.getElementById('kickUsersList');
    list.innerHTML = `
        <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-sm font-bold">
                    ${username.charAt(0).toUpperCase()}
                </div>
                <div class="font-medium text-gray-800 dark:text-white">${username}</div>
            </div>
            <button onclick="chatRoom.selectUser('${userId}')" class="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
                Select
            </button>
        </div>
    `;
};

ChatRoom.prototype.selectUser = function(userId) {
    this.selectedUserId = userId;
    document.getElementById('confirmKickBtn').disabled = false;
    
    // Highlight selected user
    document.querySelectorAll('#kickUsersList > div').forEach(div => {
        div.classList.remove('border-2', 'border-red-500');
    });
    
    const selectedDiv = document.querySelector(`button[onclick*="${userId}"]`).parentElement.parentElement;
    selectedDiv.classList.add('border-2', 'border-red-500');
};