// src/components/ChatMessage.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ChatMessage = ({ message, isUser, timestamp }) => {
  // Format time as HH:MM
  const formattedTime = timestamp ? 
    `${timestamp.getHours().toString().padStart(2, '0')}:${timestamp.getMinutes().toString().padStart(2, '0')}` : 
    '';

  return (
    <View style={[
      styles.container, 
      isUser ? styles.userContainer : styles.botContainer
    ]}>
      <View style={[
        styles.bubble, 
        isUser ? styles.userBubble : styles.botBubble
      ]}>
        <Text style={styles.message}>{message}</Text>
      </View>
      <Text style={styles.timestamp}>{formattedTime}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 5,
    maxWidth: '80%',
  },
  userContainer: {
    alignSelf: 'flex-end',
  },
  botContainer: {
    alignSelf: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
  },
  userBubble: {
    backgroundColor: '#2196F3',
    borderBottomRightRadius: 0,
  },
  botBubble: {
    backgroundColor: '#e5e5e5',
    borderBottomLeftRadius: 0,
  },
  message: {
    fontSize: 16,
    color: '#000',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
    marginHorizontal: 4,
  },
});

export default ChatMessage;