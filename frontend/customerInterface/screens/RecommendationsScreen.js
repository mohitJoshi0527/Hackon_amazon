// src/screens/RecommendationsScreen.js
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity,
  Dimensions,
  Platform,
  Animated
} from 'react-native';
import { TextInput, Button, Title, Chip, Card } from 'react-native-paper';
import { getRecommendations } from '../api/recommendationsAPI';
import ProductCard from '../components/ProductCard';

const { width } = Dimensions.get('window');

// Icons using Unicode emojis
const Icons = {
  'search': '🔍',
  'location': '📍',
  'star': '⭐',
  'fire': '🔥',
  'home': '🏠',
  'sun': '☀️',
  'moon': '🌙',
  'refresh': '🔄',
  'filter': '🔧',
  'trending': '📈',
  'category': '📂',
  'city': '🏙️',
};

const Icon = ({ name, size = 20, color = '#000', style }) => (
  <Text style={[{ fontSize: size, color, textAlign: 'center' }, style]}>
    {Icons[name] || '📂'}
  </Text>
);

const RecommendationsScreen = ({ navigation }) => {
  const [product, setProduct] = useState('');
  const [city, setCity] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Get current theme
  const currentTheme = isDarkMode ? darkTheme : lightTheme;

  const popularCategories = [
    'laptop', 'smartphone', 'headphones', 'groceries', 'furniture',
    'clothing', 'electronics', 'books', 'toys', 'beauty'
  ];

  const popularCities = [
    'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad',
    'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'
  ];

  // EXACT SAME FUNCTIONALITY - NO CHANGES
  const handleSearch = async () => {
    if (!product.trim()) {
      alert('Please enter a product to search for');
      return;
    }

    try {
      setLoading(true);
      const data = await getRecommendations(product, city);
      setRecommendations(data.recommendations || []);
      setSearched(true);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      alert('Failed to get recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectCategory = (category) => {
    setProduct(category);
  };

  const selectCity = (selectedCity) => {
    setCity(selectedCity);
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
      {/* Enhanced Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: currentTheme.primary,
            background: Platform.OS === 'web' ? (isDarkMode 
              ? 'linear-gradient(135deg, #1a237e 0%, #303f9f 100%)'
              : 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)') : undefined
          }
        ]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
              onPress={() => navigation.goBack()}
            >
              <Icon name="home" size={20} color="#fff" />
            </TouchableOpacity>

            <View style={styles.headerTitleContainer}>
              <Text style={[styles.headerTitle, { color: '#fff' }]}>
                Smart Recommendations
              </Text>
              <Text style={[styles.headerSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>
                Find Budget-Friendly Products
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
              onPress={toggleTheme}
            >
              <Icon name={isDarkMode ? 'sun' : 'moon'} size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Enhanced Search Card */}
        <Card 
          style={[
            styles.searchCard, 
            { 
              backgroundColor: currentTheme.cardBackground,
              borderColor: currentTheme.border 
            }
          ]}
          elevation={4}
        >
          <Card.Content style={styles.searchCardContent}>
            <View style={styles.searchHeader}>
              <Icon name="search" size={24} color={currentTheme.primary} />
              <Text style={[styles.searchTitle, { color: currentTheme.text }]}>
                What are you looking for?
              </Text>
            </View>

            <TextInput
              label="Product or Service"
              value={product}
              onChangeText={setProduct}
              style={[styles.input, { backgroundColor: currentTheme.inputBackground }]}
              mode="outlined"
              outlineColor={currentTheme.inputBorder}
              activeOutlineColor={currentTheme.primary}
              textColor={currentTheme.text}
              left={<TextInput.Icon icon={() => <Icon name="search" size={20} color={currentTheme.textSecondary} />} />}
              theme={{ colors: { text: currentTheme.text, placeholder: currentTheme.textSecondary } }}
            />
            
            <TextInput
              label="Your City (optional)"
              value={city}
              onChangeText={setCity}
              style={[styles.input, { backgroundColor: currentTheme.inputBackground }]}
              mode="outlined"
              outlineColor={currentTheme.inputBorder}
              activeOutlineColor={currentTheme.primary}
              textColor={currentTheme.text}
              left={<TextInput.Icon icon={() => <Icon name="location" size={20} color={currentTheme.textSecondary} />} />}
              theme={{ colors: { text: currentTheme.text, placeholder: currentTheme.textSecondary } }}
            />
            
            <Button 
              mode="contained" 
              onPress={handleSearch}
              loading={loading}
              disabled={loading}
              style={[styles.searchButton, { backgroundColor: currentTheme.primary }]}
              labelStyle={styles.searchButtonLabel}
              icon={() => <Icon name="search" size={18} color="#fff" />}
            >
              Find Recommendations
            </Button>
          </Card.Content>
        </Card>

        {/* Enhanced Categories Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="fire" size={20} color={currentTheme.warning} />
            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
              Popular Categories
            </Text>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.chipsContainer}
            contentContainerStyle={styles.chipsContent}
          >
            {popularCategories.map((category, index) => {
              const isSelected = product === category;
              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => selectCategory(category)}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: isSelected ? currentTheme.primary : currentTheme.chipBackground,
                      borderColor: isSelected ? currentTheme.primary : currentTheme.chipBorder,
                    }
                  ]}
                >
                  <Text style={[
                    styles.categoryChipText,
                    { color: isSelected ? '#fff' : currentTheme.text }
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Enhanced Cities Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="city" size={20} color={currentTheme.info} />
            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
              Popular Cities
            </Text>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.chipsContainer}
            contentContainerStyle={styles.chipsContent}
          >
            {popularCities.map((cityName, index) => {
              const isSelected = city === cityName;
              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => selectCity(cityName)}
                  style={[
                    styles.cityChip,
                    {
                      backgroundColor: isSelected ? currentTheme.success : currentTheme.chipBackground,
                      borderColor: isSelected ? currentTheme.success : currentTheme.chipBorder,
                    }
                  ]}
                >
                  <Text style={[
                    styles.cityChipText,
                    { color: isSelected ? '#fff' : currentTheme.text }
                  ]}>
                    {cityName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Enhanced Loading State */}
        {loading ? (
          <Card style={[styles.loadingCard, { backgroundColor: currentTheme.cardBackground }]}>
            <Card.Content style={styles.loadingContainer}>
            <View style={styles.loadingAnimation}>
              <ActivityIndicator size="large" color={currentTheme.primary} />
              <Icon name="search" size={30} color={currentTheme.primary} style={styles.loadingIcon} />
            </View>
            <Text style={[styles.loadingText, { color: currentTheme.text }]}>
              Finding the best recommendations for you...
            </Text>
            <Text style={[styles.loadingSubtext, { color: currentTheme.textSecondary }]}>
              This may take a few moments
            </Text>
            </Card.Content>
          </Card>
        ) : searched ? (
          <View style={styles.resultsContainer}>
            <Card style={[styles.resultsHeader, { backgroundColor: currentTheme.cardBackground }]}>
              <Card.Content style={styles.resultsHeaderContent}>
              <View style={styles.resultsInfo}>
                <Icon name="star" size={24} color={currentTheme.success} />
                <View style={styles.resultsTextContainer}>
                  <Text style={[styles.resultsTitle, { color: currentTheme.text }]}>
                    {recommendations.length > 0 
                      ? `Found ${recommendations.length} Recommendations` 
                      : 'No recommendations found'}
                  </Text>
                  <Text style={[styles.resultsSubtitle, { color: currentTheme.textSecondary }]}>
                    {recommendations.length > 0 
                      ? `Best matches for "${product}"${city ? ` in ${city}` : ''}` 
                      : 'Try adjusting your search criteria'}
                  </Text>
              </View>
            </View>
            </Card.Content>
          </Card>
          
        {recommendations.map((item, index) => (
          <View key={index} style={styles.productCardWrapper}>
            <ProductCard product={item} theme={currentTheme} />
          </View>
        ))}
        </View>
      ) : (
        <Card style={[styles.welcomeCard, { backgroundColor: currentTheme.cardBackground }]}>
          <Card.Content style={styles.welcomeContent}>
          <Icon name="trending" size={40} color={currentTheme.primary} />
          <Text style={[styles.welcomeTitle, { color: currentTheme.text }]}>
            Discover Smart Deals
          </Text>
          <Text style={[styles.welcomeSubtitle, { color: currentTheme.textSecondary }]}>
            Search for products and get personalized budget-friendly recommendations
          </Text>
        </Card.Content>
      </Card>
        )}
      </ScrollView>
    </View>
  );
};

// Theme configurations matching HomeScreen
const lightTheme = {
  background: '#f8f9fa',
  cardBackground: '#ffffff',
  text: '#212529',
  textSecondary: '#6c757d',
  primary: '#007bff',
  success: '#28a745',
  warning: '#ffc107',
  error: '#dc3545',
  info: '#17a2b8',
  border: '#e9ecef',
  inputBackground: '#ffffff',
  inputBorder: '#e9ecef',
  chipBackground: '#f8f9fa',
  chipBorder: '#e9ecef',
};

const darkTheme = {
  background: '#121212',
  cardBackground: '#1e1e1e',
  text: '#ffffff',
  textSecondary: '#b3b3b3',
  primary: '#4fc3f7',
  success: '#4caf50',
  warning: '#ff9800',
  error: '#f44336',
  info: '#29b6f6',
  border: '#333333',
  inputBackground: '#2d2d2d',
  inputBorder: '#404040',
  chipBackground: '#333333',
  chipBorder: '#404040',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flex: 1,
  },
  headerTop: {
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
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  searchCard: {
    marginBottom: 24,
    borderRadius: 16,
    borderWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 8px rgba(0,0,0,0.1)',
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
  searchCardContent: {
    padding: 20,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  searchTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  input: {
    marginBottom: 16,
  },
  searchButton: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 4,
  },
  searchButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  chipsContainer: {
    flexDirection: 'row',
  },
  chipsContent: {
    paddingRight: 20,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  cityChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  cityChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingCard: {
    marginTop: 20,
    borderRadius: 16,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 8px rgba(0,0,0,0.1)',
      },
      default: {
        elevation: 4,
      }
    }),
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 30,
  },
  loadingAnimation: {
    position: 'relative',
    marginBottom: 20,
  },
  loadingIcon: {
    position: 'absolute',
    top: 15,
    left: 15,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  welcomeCard: {
    marginTop: 40,
    borderRadius: 16,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 8px rgba(0,0,0,0.1)',
      },
      default: {
        elevation: 3,
      }
    }),
  },
  welcomeContent: {
    alignItems: 'center',
    padding: 40,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  resultsContainer: {
    marginTop: 16,
  },
  resultsHeader: {
    marginBottom: 20,
    borderRadius: 16,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
      },
      default: {
        elevation: 2,
      }
    }),
  },
  resultsHeaderContent: {
    padding: 16,
  },
  resultsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultsTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  resultsSubtitle: {
    fontSize: 14,
  },
  productCardWrapper: {
    marginBottom: 12,
  },
});

export default RecommendationsScreen;