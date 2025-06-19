// src/screens/ChatbotScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import budgetService from '../services/budgetService';

const { width, height } = Dimensions.get('window');

// Icons using Unicode emojis
const Icons = {
  'home': '🏠',
  'clear': '🗑️',
  'send': '📤',
  'copy': '📋',
  'speak': '🔊',
  'replay': '↩️',
  'user': '👤',
  'ai': '🤖',
  'loading': '⟳',
  'stop': '⏹️',
  'menu': '☰',
  'sun': '☀️',
  'moon': '🌙'
};

const Icon = ({ name, size = 20, color = '#000', style }) => (
  <Text style={[{ fontSize: size, color, textAlign: 'center' }, style]}>
    {Icons[name] || '•'}
  </Text>
);

const ChatbotScreen = ({ navigation, route }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  
  const scrollViewRef = useRef(null);
  const inputRef = useRef(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  // Get current theme
  const currentTheme = isDarkMode ? darkTheme : lightTheme;

  // Initialize with welcome message
  useEffect(() => {
    const welcomeMessage = {
      id: 1,
      text: "Hello! I'm your budget assistant. I can help you update your budget, analyze spending, and provide Amazon shopping tips. Try saying something like 'increase electronics by 5000' or 'set food budget to 8000'!",
      isUser: false,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages([welcomeMessage]);
  }, []);

  // Simplified and more reliable auto-scroll
  const scrollToBottom = () => {
    if (scrollViewRef.current) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }, 50);
      
      // Backup scroll with longer delay
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  };

  // Auto-scroll whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-scroll when loading changes (response received)
  useEffect(() => {
    if (!isLoading) {
      scrollToBottom();
    }
  }, [isLoading]);

  // Handle keyboard events
  useEffect(() => {
    if (Platform.OS !== 'web') {
      const { Keyboard } = require('react-native');
      
      const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setTimeout(scrollToBottom, 100);
      });
      
      const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
        setKeyboardHeight(0);
        setTimeout(scrollToBottom, 100);
      });

      return () => {
        keyboardDidShowListener?.remove();
        keyboardDidHideListener?.remove();
      };
    }
  }, []);

  // Enhanced chatbot API with fallback to budget processing
  const sendChatMessage = async (message) => {
    try {
      console.log('Sending message to chatbot API:', message);
      
      // Try the API endpoints with shorter timeout
      const endpoints = [
        'http://localhost:5000/api/chatbot/chat',
        'http://192.168.29.40:5000/api/chatbot/chat'
      ];
      
      for (const endpoint of endpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
          
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: message,
              user_id: '12345',
            }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const data = await response.json();
            console.log('Chatbot API response:', data);
            
            // Extract bot reply
            if (data && data.reply) {
              return data.reply;
            } else if (data && data.response) {
              return data.response;
            } else if (data && typeof data === 'string') {
              return data;
            }
          }
        } catch (error) {
          console.warn(`Failed to connect to ${endpoint}:`, error.message);
          continue;
        }
      }
      
      // If all endpoints fail, provide helpful fallback response
      throw new Error('All chatbot endpoints failed');
      
    } catch (error) {
      console.error('Error communicating with chatbot API:', error);
      
      // Return helpful fallback responses based on message content
      const lowerMessage = message.toLowerCase();
      
      if (lowerMessage.includes('budget') && (lowerMessage.includes('update') || lowerMessage.includes('change'))) {
        return "I can help you update your budget! Try specific commands like:\n• 'Increase Electronics by 5000'\n• 'Set Food budget to 8000'\n• 'Allocate 3000 for Books'\n• 'Reduce Travel by 2000'";
      } else if (lowerMessage.includes('help')) {
        return "I can help you with:\n🔹 Budget updates and modifications\n🔹 Spending analysis and tips\n🔹 Amazon shopping recommendations\n🔹 Financial planning advice\n\nWhat would you like assistance with?";
      } else if (lowerMessage.includes('total') || lowerMessage.includes('budget')) {
        return "I can help you manage your budget! You can ask me to update specific categories or get spending advice. What would you like to do with your budget?";
      } else {
        return "I'm here to help with your budget and Amazon shopping! While my server connection is limited, I can still assist with budget updates and provide financial tips. What can I help you with?";
      }
    }
  };

  // Enhanced send message function that can handle budget updates
  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date().toLocaleTimeString(),
    };

    const currentInput = inputText.trim();
    
    // Add user message and scroll immediately
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    
    // Immediate scroll for user message
    setTimeout(scrollToBottom, 10);
    
    setIsLoading(true);

    try {
      // Check if this is a budget update request
      const budgetKeywords = ['update budget', 'change budget', 'increase', 'decrease', 'set budget', 'allocate', 'modify budget', 'set', 'make'];
      const isBudgetUpdate = budgetKeywords.some(keyword => 
        currentInput.toLowerCase().includes(keyword)
      );

      let botReply;
      
      if (isBudgetUpdate) {
        console.log('🤖 Detected budget update request, processing...');
        
        // Process budget update through budget service
        const updateResult = await budgetService.processChatbotBudgetUpdate(currentInput);
        
        if (updateResult.success) {
          botReply = `✅ ${updateResult.message}\n\nYour budget has been updated and saved. You can see the changes in the Home screen.`;
          
          // Add success message with delay
          setTimeout(() => {
            const successMessage = {
              id: Date.now() + 100,
              text: "💡 Tip: Go to the Home screen to see your updated budget visualization and pie chart!",
              isUser: false,
              timestamp: new Date().toLocaleTimeString(),
            };
            setMessages(prev => [...prev, successMessage]);
          }, 2000);
          
        } else {
          botReply = `❌ ${updateResult.message}`;
          
          if (updateResult.suggestions) {
            botReply += '\n\nHere are some examples:\n' + updateResult.suggestions.join('\n');
          }
        }
      } else {
        // Regular chatbot conversation
        botReply = await sendChatMessage(currentInput);
      }
      
      const aiMessage = {
        id: Date.now() + 1,
        text: botReply,
        isUser: false,
        timestamp: new Date().toLocaleTimeString(),
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: "I'm having trouble connecting to my server, but I can still help with budget updates! Try commands like 'increase electronics by 5000' or ask me for financial tips.",
        isUser: false,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    console.log('Clearing chat immediately');
    
    const welcomeMessage = {
      id: Date.now(),
      text: "Chat cleared. How can I help you with your budget today?",
      isUser: false,
      timestamp: new Date().toLocaleTimeString(),
    };
    
    setMessages([welcomeMessage]);
  };

  const copyMessage = (messageText, messageId) => {
    if (Platform.OS === 'web') {
      navigator.clipboard.writeText(messageText).then(() => {
        setCopiedMessageId(messageId);
        setTimeout(() => setCopiedMessageId(null), 2000);
      });
    }
  };

  const speakMessage = (messageText, messageId) => {
    if (speechSynthesis) {
      if (speakingMessageId === messageId) {
        speechSynthesis.cancel();
        setSpeakingMessageId(null);
      } else {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(messageText);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 0.8;
        
        utterance.onstart = () => setSpeakingMessageId(messageId);
        utterance.onend = () => setSpeakingMessageId(null);
        utterance.onerror = () => setSpeakingMessageId(null);
        
        speechSynthesis.speak(utterance);
      }
    }
  };

  const replayMessage = (messageText) => {
    setInputText(messageText);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const navigateToHome = () => {
    console.log('🏠 Navigating to HomeScreen from ChatbotScreen...');
    
    // Clear any budget cache to force fresh data
    if (window.budgetService) {
      window.budgetService.cache = null;
      window.budgetService.lastFetch = null;
    }
    
    // Navigate with a parameter to indicate coming from chatbot
    navigation.navigate('HomeScreen', { 
      fromChatbot: true,
      timestamp: Date.now()
    });
  };

  // Quick budget update suggestions
  const quickBudgetUpdates = [
    "Increase Electronics & Accessories by 5000",
    "MY budget is", 
    "Allocate 3000 for Books",
    "Reduce  Groceries & Household Items by 2000",
    "Update total budget to 50000"
  ];

  const sendQuickUpdate = (updateText) => {
    setInputText(updateText);
    setTimeout(() => {
      sendMessage();
    }, 100);
  };

  const renderMessage = (message) => {
    const isUser = message.isUser;
    const isSpeaking = speakingMessageId === message.id;
    const isCopied = copiedMessageId === message.id;

    return (
      <View key={message.id} style={styles.messageContainer}>
        <View style={[
          styles.messageWrapper,
          isUser ? styles.userMessageWrapper : styles.aiMessageWrapper
        ]}>
          {/* Avatar */}
          <View style={[
            styles.avatar,
            { backgroundColor: isUser ? currentTheme.primary : currentTheme.aiBackground }
          ]}>
            <Icon 
              name={isUser ? 'user' : 'ai'} 
              size={16} 
              color={isUser ? '#fff' : currentTheme.aiText} 
            />
          </View>

          {/* Message Content */}
          <View style={[
            styles.messageBubble,
            isUser ? [styles.userBubble, { backgroundColor: currentTheme.primary }] : 
                    [styles.aiBubble, { backgroundColor: currentTheme.messageBackground }]
          ]}>
            <Text style={[
              styles.messageText,
              { color: isUser ? '#fff' : currentTheme.text }
            ]}>
              {message.text}
            </Text>
            
            <Text style={[
              styles.timestamp,
              { color: isUser ? 'rgba(255,255,255,0.7)' : currentTheme.textSecondary }
            ]}>
              {message.timestamp}
            </Text>

            {/* Action Buttons for AI messages */}
            {!isUser && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: currentTheme.actionButtonBg }]}
                  onPress={() => speakMessage(message.text, message.id)}
                >
                  <Icon 
                    name={isSpeaking ? 'stop' : 'speak'} 
                    size={14} 
                    color={isSpeaking ? currentTheme.error : currentTheme.textSecondary} 
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: currentTheme.actionButtonBg }]}
                  onPress={() => copyMessage(message.text, message.id)}
                >
                  <Icon 
                    name="copy" 
                    size={14} 
                    color={isCopied ? currentTheme.success : currentTheme.textSecondary} 
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: currentTheme.actionButtonBg }]}
                  onPress={() => replayMessage(message.text)}
                >
                  <Icon name="replay" size={14} color={currentTheme.textSecondary} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
      {/* Fixed Header */}
      <View style={[styles.header, { backgroundColor: currentTheme.headerBackground }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: currentTheme.headerButtonBg }]}
            onPress={navigateToHome}
          >
            <Icon name="home" size={20} color={currentTheme.headerButtonText} />
          </TouchableOpacity>

          <View style={styles.headerTitle}>
            <Text style={[styles.headerTitleText, { color: currentTheme.headerText }]}>
              Budget Assistant
            </Text>
            <Text style={[styles.headerSubtitle, { color: currentTheme.headerTextSecondary }]}>
              Amazon Shopping Helper
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: currentTheme.headerButtonBg }]}
              onPress={toggleTheme}
            >
              <Icon 
                name={isDarkMode ? 'sun' : 'moon'} 
                size={18} 
                color={currentTheme.headerButtonText} 
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: currentTheme.headerButtonBg }]}
              onPress={clearChat}
            >
              <Icon name="clear" size={18} color={currentTheme.headerButtonText} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Chat Messages Container */}
      <View style={styles.chatContainer}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesScrollView}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map(renderMessage)}
          
          {/* Quick Budget Update Suggestions */}
          {messages.length <= 2 && (
            <View style={styles.quickActionsContainer}>
              <Text style={[styles.quickActionsTitle, { color: currentTheme.text }]}>
                💡 Quick Budget Updates:
              </Text>
              {quickBudgetUpdates.map((update, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.quickActionButton, { backgroundColor: currentTheme.primary + '20', borderColor: currentTheme.primary }]}
                  onPress={() => sendQuickUpdate(update)}
                >
                  <Text style={[styles.quickActionText, { color: currentTheme.primary }]}>
                    {update}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          {/* Loading Indicator */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <View style={[styles.loadingBubble, { backgroundColor: currentTheme.messageBackground }]}>
                <View style={styles.loadingDots}>
                  <View style={[styles.loadingDot, { backgroundColor: currentTheme.textSecondary }]} />
                  <View style={[styles.loadingDot, { backgroundColor: currentTheme.textSecondary }]} />
                  <View style={[styles.loadingDot, { backgroundColor: currentTheme.textSecondary }]} />
                </View>
                <Text style={[styles.loadingText, { color: currentTheme.textSecondary }]}>
                  Thinking...
                </Text>
              </View>
            </View>
          )}
          
          {/* Bottom spacer to ensure last message is visible */}
          <View style={{ height: 30 }} />
        </ScrollView>
      </View>

      {/* Fixed Input Area */}
      <View style={[styles.inputContainer, { backgroundColor: currentTheme.inputBackground }]}>
        <View style={styles.inputWrapper}>
          <TextInput
            ref={inputRef}
            style={[styles.textInput, { 
              backgroundColor: currentTheme.inputFieldBg,
              color: currentTheme.text,
              borderColor: currentTheme.inputBorder
            }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask about your budget or try 'increase electronics by 5000'..."
            placeholderTextColor={currentTheme.textSecondary}
            multiline
            maxLength={500}
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
            editable={!isLoading}
            returnKeyType="send"
          />
          
          <TouchableOpacity
            style={[
              styles.sendButton,
              { 
                backgroundColor: inputText.trim() && !isLoading ? currentTheme.primary : currentTheme.sendButtonDisabled,
                opacity: isLoading ? 0.6 : 1
              }
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            <Icon name={isLoading ? 'loading' : 'send'} size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// Theme definitions
const lightTheme = {
  background: '#f5f5f5',
  headerBackground: '#fff',
  headerText: '#333',
  headerTextSecondary: '#666',
  headerButtonBg: '#f0f0f0',
  headerButtonText: '#333',
  messageBackground: '#fff',
  text: '#333',
  textSecondary: '#666',
  primary: '#007AFF',
  success: '#28a745',
  error: '#dc3545',
  border: '#ddd',
  inputBackground: '#fff',
  disabled: '#ccc',
  actionButtonBg: '#f8f9fa',
  aiBackground: '#e3f2fd',
  aiText: '#1976d2'
};

const darkTheme = {
  background: '#121212',
  headerBackground: '#1e1e1e',
  headerText: '#fff',
  headerTextSecondary: '#ccc',
  headerButtonBg: '#333',
  headerButtonText: '#fff',
  messageBackground: '#2d2d2d',
  text: '#fff',
  textSecondary: '#ccc',
  primary: '#0084FF',
  success: '#28a745',
  error: '#dc3545',
  border: '#444',
  inputBackground: '#1e1e1e',
  disabled: '#555',
  actionButtonBg: '#444',
  aiBackground: '#1e3a8a',
  aiText: '#60a5fa'
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
      },
      default: {
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      }
    }),
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitleText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
  },
  chatContainer: {
    flex: 1,
    paddingTop: 10, // Small padding after header
    paddingBottom: 0, // No bottom padding - input will handle spacing
  },
  messagesScrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesContent: {
    paddingTop: 10,
    paddingBottom: 120, // Ensure content doesn't get hidden behind input (input height + safety margin)
    flexGrow: 1,
  },
  messageContainer: {
    marginBottom: 16,
  },
  messageWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  userMessageWrapper: {
    justifyContent: 'flex-end',
  },
  aiMessageWrapper: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  messageBubble: {
    maxWidth: width * 0.75,
    padding: 12,
    borderRadius: 16,
    position: 'relative',
  },
  userBubble: {
    borderBottomRightRadius: 4,
    marginLeft: 50,
  },
  aiBubble: {
    borderBottomLeftRadius: 4,
    marginRight: 50,
    ...Platform.select({
      web: {
        boxShadow: '0px 1px 2px rgba(0,0,0,0.1)',
      },
      default: {
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      }
    }),
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 6,
    opacity: 0.7,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 6,
  },
  actionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  quickActionsContainer: {
    marginVertical: 20,
    paddingHorizontal: 16,
  },
  quickActionsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  quickActionButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 8,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  loadingBubble: {
    marginLeft: 44,
    padding: 16,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.6,
  },
  loadingText: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    ...Platform.select({
      web: {
        boxShadow: '0px -2px 4px rgba(0,0,0,0.1)',
      },
      default: {
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      }
    }),
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    ...Platform.select({
      web: {
        outline: 'none',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      },
    }),
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
});

export default ChatbotScreen;