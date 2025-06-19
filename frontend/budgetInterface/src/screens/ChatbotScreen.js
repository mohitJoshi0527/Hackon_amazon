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
import axios from 'axios'; // Keep using axios like the working version

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

// Configure API base URL (same as working version)
const API_BASE_URL = 'http://192.168.29.40:5000';

const ChatbotScreen = ({ navigation, route }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  
  const scrollViewRef = useRef(null);
  const inputRef = useRef(null);
  const speechSynthesis = Platform.OS === 'web' ? window.speechSynthesis : null;

  // Get current theme
  const currentTheme = isDarkMode ? darkTheme : lightTheme;

  // Initialize with welcome message (same as working version)
  useEffect(() => {
    const welcomeMessage = {
      id: 1,
      text: "Hello! I'm your budget assistant. How can I help you manage your Amazon shopping budget today?",
      isUser: false,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages([welcomeMessage]);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Use the EXACT same API logic from the working version
  const sendChatMessage = async (message) => {
    try {
      console.log('Sending message to chatbot API:', message);
      
      const response = await axios.post(`${API_BASE_URL}/api/chatbot/chat`, {
        message: message,
        // Add any other required parameters
        user_id: '12345', // Add user ID if needed
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      });
      
      console.log('Chatbot API response:', response.data);
      
      // Extract the bot's reply from the response (EXACT same logic)
      let botReply = "I can help with budget planning, spending analysis, and shopping tips. What specific aspect are you interested in?";
      
      if (response.data && response.data.reply) {
        botReply = response.data.reply;
      } else if (response.data && response.data.response) {
        botReply = response.data.response;
      } else if (response.data && typeof response.data === 'string') {
        botReply = response.data;
      }
      
      return botReply;
    } catch (error) {
      console.error('Error communicating with chatbot API:', error);
      throw new Error('Failed to get response from chatbot');
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date().toLocaleTimeString(),
    };

    const currentInput = inputText.trim();
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Use the working API function
      const botReply = await sendChatMessage(currentInput);
      
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
        text: "Sorry, I couldn't connect to the server. Please check your connection and try again.",
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
        // Stop speaking
        speechSynthesis.cancel();
        setSpeakingMessageId(null);
      } else {
        // Start speaking
        speechSynthesis.cancel(); // Stop any current speech
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

  // Add this function to handle navigation back to home
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
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: currentTheme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Fixed Header */}
      <View style={[styles.header, { backgroundColor: currentTheme.headerBackground }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: currentTheme.headerButtonBg }]}
            onPress={navigateToHome} // Use the new function instead of direct navigation
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

      {/* Messages Area */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map(renderMessage)}
        
        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <View style={[styles.loadingBubble, { backgroundColor: currentTheme.messageBackground }]}>
              <View style={styles.loadingDots}>
                <View style={[styles.loadingDot, { backgroundColor: currentTheme.textSecondary }]} />
                <View style={[styles.loadingDot, { backgroundColor: currentTheme.textSecondary }]} />
                <View style={[styles.loadingDot, { backgroundColor: currentTheme.textSecondary }]} />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input Area */}
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
            placeholder="Ask about your budget..."
            placeholderTextColor={currentTheme.textSecondary}
            multiline
            maxLength={500}
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
            editable={!isLoading}
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
    </KeyboardAvoidingView>
  );
};

// Theme configurations matching HomeScreen
const lightTheme = {
  background: '#f8f9fa',
  headerBackground: '#ffffff',
  headerText: '#212529',
  headerTextSecondary: '#6c757d',
  headerButtonBg: '#f8f9fa',
  headerButtonText: '#495057',
  text: '#212529',
  textSecondary: '#6c757d',
  primary: '#007bff',
  success: '#28a745',
  error: '#dc3545',
  messageBackground: '#ffffff',
  inputBackground: '#ffffff',
  inputFieldBg: '#f8f9fa',
  inputBorder: '#e9ecef',
  actionButtonBg: '#f8f9fa',
  aiBackground: '#e9ecef',
  aiText: '#495057',
  sendButtonDisabled: '#e9ecef',
};

const darkTheme = {
  background: '#121212',
  headerBackground: '#1e1e1e',
  headerText: '#ffffff',
  headerTextSecondary: '#b3b3b3',
  headerButtonBg: '#333333',
  headerButtonText: '#ffffff',
  text: '#ffffff',
  textSecondary: '#b3b3b3',
  primary: '#4fc3f7',
  success: '#4caf50',
  error: '#f44336',
  messageBackground: '#2d2d2d',
  inputBackground: '#1e1e1e',
  inputFieldBg: '#333333',
  inputBorder: '#404040',
  actionButtonBg: '#404040',
  aiBackground: '#404040',
  aiText: '#ffffff',
  sendButtonDisabled: '#404040',
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
        position: 'sticky',
        top: 0,
        zIndex: 1000,
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
      web: {
        cursor: 'pointer',
      },
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
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 20,
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
      web: {
        cursor: 'pointer',
      },
    }),
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
  inputContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
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