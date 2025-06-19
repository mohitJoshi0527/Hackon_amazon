// src/App.js
import React from 'react';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import AppNavigator from './navigation/AppNavigator';
import IconProvider from './components/IconProvider'; // Import your custom provider

// Configure Paper theme with custom icon provider
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#2196F3',
    accent: '#4CAF50',
  },
};

const App = () => {
  return (
    <PaperProvider 
      theme={theme}
      settings={{
        icon: props => <IconProvider {...props} />
      }}
    >
      <AppNavigator />
    </PaperProvider>
  );
};

export default App;