/**
 * CS Tracker - Chat Widget
 * LLM-powered assistant for customer success management
 */

(function() {
    'use strict';

    // Chat state
    let chatState = {
        isOpen: false,
        conversationId: null,
        isLoading: false,
        messages: []
    };

    // DOM elements (populated after init)
    let chatPanel, chatMessages, chatInput, chatTrigger, sendButton;

    /**
     * Initialize the chat widget
     */
    function initChat() {
        // Get DOM elements
        chatPanel = document.getElementById('chatPanel');
        chatMessages = document.getElementById('chatMessages');
        chatInput = document.getElementById('chatInput');
        chatTrigger = document.getElementById('chatTrigger');
        sendButton = document.getElementById('chatSendBtn');

        if (!chatPanel || !chatMessages || !chatInput) {
            console.warn('Chat elements not found, skipping initialization');
            return;
        }

        // Load previous conversation from session storage
        loadConversation();

        // Set up event listeners
        chatInput.addEventListener('keydown', handleInputKeydown);
        if (sendButton) {
            sendButton.addEventListener('click', sendMessage);
        }

        // Add welcome message if no messages
        if (chatState.messages.length === 0) {
            addWelcomeMessage();
        }

        console.log('Chat widget initialized');
    }

    /**
     * Add welcome message to chat
     */
    function addWelcomeMessage() {
        const welcomeMessage = {
            role: 'assistant',
            content: "Hello! I'm your CS Assistant. I can help you with:\n\n" +
                "- Finding customer information\n" +
                "- Viewing and creating tasks\n" +
                "- Logging engagements\n" +
                "- Tracking risks\n" +
                "- Portfolio summaries\n\n" +
                "How can I help you today?",
            timestamp: new Date().toISOString()
        };
        chatState.messages.push(welcomeMessage);
        renderMessages();
    }

    /**
     * Toggle chat panel open/closed
     */
    function toggleChatPanel() {
        chatState.isOpen = !chatState.isOpen;

        if (chatPanel) {
            chatPanel.classList.toggle('open', chatState.isOpen);
        }

        if (chatTrigger) {
            chatTrigger.classList.toggle('active', chatState.isOpen);
        }

        if (chatState.isOpen && chatInput) {
            setTimeout(() => chatInput.focus(), 100);
        }
    }

    /**
     * Handle keyboard input in chat
     */
    function handleInputKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }

    /**
     * Send a message to the chat API
     */
    async function sendMessage() {
        if (!chatInput) return;

        const message = chatInput.value.trim();
        if (!message || chatState.isLoading) return;

        // Add user message to chat
        const userMessage = {
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
        };
        chatState.messages.push(userMessage);
        renderMessages();

        // Clear input
        chatInput.value = '';

        // Show loading state
        chatState.isLoading = true;
        showLoadingIndicator();

        try {
            // Get page context
            const context = getPageContext();

            // Call chat API
            const response = await ChatAPI.send(message, context, chatState.conversationId);

            // Update conversation ID
            chatState.conversationId = response.conversation_id;

            // Add assistant response
            const assistantMessage = {
                role: 'assistant',
                content: response.message,
                actions: response.actions_taken || [],
                suggestions: response.suggestions || [],
                timestamp: new Date().toISOString()
            };
            chatState.messages.push(assistantMessage);

            // Save conversation
            saveConversation();

        } catch (error) {
            console.error('Chat error:', error);

            // Add error message
            const errorMessage = {
                role: 'assistant',
                content: 'Sorry, I encountered an error processing your request. Please try again.',
                isError: true,
                timestamp: new Date().toISOString()
            };
            chatState.messages.push(errorMessage);
        } finally {
            chatState.isLoading = false;
            hideLoadingIndicator();
            renderMessages();
        }
    }

    /**
     * Get context about the current page
     */
    function getPageContext() {
        const context = {
            page: null,
            customer_id: null
        };

        const path = window.location.pathname;
        const params = new URLSearchParams(window.location.search);

        // Detect current page
        if (path.includes('customer-detail')) {
            context.page = 'customer-detail';
            context.customer_id = parseInt(params.get('id')) || null;
        } else if (path.includes('customers')) {
            context.page = 'customers';
        } else if (path.includes('tasks')) {
            context.page = 'tasks';
        } else if (path.includes('index') || path.endsWith('/')) {
            context.page = 'dashboard';
        } else if (path.includes('admin')) {
            context.page = 'admin';
        }

        return context;
    }

    /**
     * Render all messages in the chat panel
     */
    function renderMessages() {
        if (!chatMessages) return;

        chatMessages.innerHTML = '';

        chatState.messages.forEach((msg, index) => {
            const messageEl = createMessageElement(msg);
            chatMessages.appendChild(messageEl);
        });

        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    /**
     * Create a message element
     */
    function createMessageElement(message) {
        const div = document.createElement('div');
        div.className = `chat-message chat-message--${message.role}`;

        if (message.isError) {
            div.classList.add('chat-message--error');
        }

        // Message content
        const contentDiv = document.createElement('div');
        contentDiv.className = 'chat-message__content';
        contentDiv.innerHTML = formatMessageContent(message.content);
        div.appendChild(contentDiv);

        // Actions taken (if any)
        if (message.actions && message.actions.length > 0) {
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'chat-actions';
            message.actions.forEach(action => {
                const actionEl = createActionElement(action);
                actionsDiv.appendChild(actionEl);
            });
            div.appendChild(actionsDiv);
        }

        // Suggestions (if any)
        if (message.suggestions && message.suggestions.length > 0) {
            const suggestionsDiv = document.createElement('div');
            suggestionsDiv.className = 'chat-suggestions';
            message.suggestions.forEach(suggestion => {
                const btn = document.createElement('button');
                btn.className = 'chat-suggestion';
                btn.textContent = suggestion;
                btn.onclick = () => {
                    if (chatInput) {
                        chatInput.value = suggestion;
                        sendMessage();
                    }
                };
                suggestionsDiv.appendChild(btn);
            });
            div.appendChild(suggestionsDiv);
        }

        // Timestamp
        const timeDiv = document.createElement('div');
        timeDiv.className = 'chat-message__time';
        timeDiv.textContent = formatTime(message.timestamp);
        div.appendChild(timeDiv);

        return div;
    }

    /**
     * Create an action result element
     */
    function createActionElement(action) {
        const div = document.createElement('div');
        div.className = 'chat-action';

        const icon = getActionIcon(action.action_type);
        const link = getActionLink(action);

        div.innerHTML = `
            <span class="chat-action__icon">${icon}</span>
            <span class="chat-action__text">${action.summary}</span>
            ${link ? `<a href="${link}" class="chat-action__link" target="_blank">View</a>` : ''}
        `;

        return div;
    }

    /**
     * Get icon for action type
     */
    function getActionIcon(actionType) {
        const icons = {
            'task_created': '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/></svg>',
            'task_completed': '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/></svg>',
            'engagement_logged': '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2zm13 2.383-4.758 2.855L15 11.114v-5.73zm-.034 6.878L9.271 8.82 8 9.583 6.728 8.82l-5.694 3.44A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.739zM1 11.114l4.758-2.876L1 5.383v5.73z"/></svg>',
            'risk_created': '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>',
            'meeting_note_created': '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M5 10.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5zm0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5z"/><path d="M3 0h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-1h1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v1H1V2a2 2 0 0 1 2-2z"/></svg>'
        };
        return icons[actionType] || '<svg viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="6"/></svg>';
    }

    /**
     * Get link for action
     */
    function getActionLink(action) {
        const baseUrl = window.location.origin + '/prototype';

        switch (action.entity_type) {
            case 'task':
                return `${baseUrl}/tasks.html?highlight=${action.entity_id}`;
            case 'engagement':
                return null; // Engagements don't have a dedicated page
            case 'risk':
                return null; // Would need to link to customer detail
            case 'meeting_note':
                return null;
            default:
                return null;
        }
    }

    /**
     * Format message content (handle markdown-like formatting)
     */
    function formatMessageContent(content) {
        if (!content) return '';

        // Escape HTML
        let formatted = content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Convert newlines to <br>
        formatted = formatted.replace(/\n/g, '<br>');

        // Bold text (**text**)
        formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

        // Bullet points (- text)
        formatted = formatted.replace(/^- (.+)$/gm, '<span class="bullet">$1</span>');

        return formatted;
    }

    /**
     * Format timestamp
     */
    function formatTime(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    /**
     * Show loading indicator
     */
    function showLoadingIndicator() {
        if (!chatMessages) return;

        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'chat-loading';
        loadingDiv.id = 'chatLoading';
        loadingDiv.innerHTML = `
            <div class="chat-loading__dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
        chatMessages.appendChild(loadingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    /**
     * Hide loading indicator
     */
    function hideLoadingIndicator() {
        const loadingDiv = document.getElementById('chatLoading');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }

    /**
     * Save conversation to session storage
     */
    function saveConversation() {
        try {
            sessionStorage.setItem('cst_chat_state', JSON.stringify({
                conversationId: chatState.conversationId,
                messages: chatState.messages.slice(-50) // Keep last 50 messages
            }));
        } catch (e) {
            console.warn('Could not save chat state:', e);
        }
    }

    /**
     * Load conversation from session storage
     */
    function loadConversation() {
        try {
            const saved = sessionStorage.getItem('cst_chat_state');
            if (saved) {
                const parsed = JSON.parse(saved);
                chatState.conversationId = parsed.conversationId;
                chatState.messages = parsed.messages || [];
                renderMessages();
            }
        } catch (e) {
            console.warn('Could not load chat state:', e);
        }
    }

    /**
     * Clear chat history
     */
    function clearChat() {
        chatState.messages = [];
        chatState.conversationId = null;
        sessionStorage.removeItem('cst_chat_state');
        addWelcomeMessage();
        renderMessages();
    }

    // Expose functions globally
    window.initChat = initChat;
    window.toggleChatPanel = toggleChatPanel;
    window.sendMessage = sendMessage;
    window.clearChat = clearChat;

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChat);
    } else {
        initChat();
    }

})();
