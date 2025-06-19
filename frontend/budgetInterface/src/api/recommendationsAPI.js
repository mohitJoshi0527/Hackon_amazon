// src/api/recommendationsAPI.js
import API from './index';

export const getRecommendations = async (product, city) => {
  try {
    const response = await API.get(`/api/recommendations/?product=${product}&city=${city}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    throw error;
  }
};

export const getDistanceRecommendations = async (product, city) => {
  try {
    const response = await fetch(`http://192.168.29.40:5000/api/recommendations/?product=${encodeURIComponent(product)}&city=${encodeURIComponent(city)}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching distance recommendations:', error);
    throw error;
  }
};