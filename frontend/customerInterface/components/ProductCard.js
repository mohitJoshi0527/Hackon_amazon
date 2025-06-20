// src/components/ProductCard.js
import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Card, Button } from 'react-native-paper';

const ProductCard = ({ product }) => {
  return (
    <Card style={styles.card}>
      <Card.Cover source={{ uri: product.image_url || 'https://via.placeholder.com/150' }} style={styles.image} />
      <Card.Content>
        <Text style={styles.title}>{product.product_name}</Text>
        <Text style={styles.price}>₹{product.price}</Text>
        <Text style={styles.details}>{product.product_type} • {product.category}</Text>
        {product.distance_km !== undefined && (
          <Text style={styles.distance}>{product.distance_km} km away</Text>
        )}
      </Card.Content>
      <Card.Actions>
        <Button mode="contained" style={styles.button}>View Details</Button>
      </Card.Actions>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 10,
    borderRadius: 10,
    elevation: 3,
  },
  image: {
    height: 160,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
    marginVertical: 4,
  },
  details: {
    fontSize: 14,
    color: '#666',
  },
  distance: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 4,
  },
  button: {
    marginTop: 8,
  },
});

export default ProductCard;