import json
import os
from config import Config
import math
from geopy.geocoders import Nominatim
# import requests # If you were to use a real API
from typing import List, Dict

# Mock data (can be moved to a separate file or database later)
mock_recommendations_data = {
    "laptop": ["laptop bag", "mouse", "cooling pad"],
    "phone": ["phone case", "charger", "earphones"],
    "book": ["bookmark", "reading light", "book stand"]
}

mock_products_data = {
    "laptop bag": [
        {"id": 1, "name": "Dell Laptop Bag", "seller_city": "Mumbai", "price": 1500},
        {"id": 2, "name": "HP Laptop Bag", "seller_city": "Delhi", "price": 1200},
        {"id": 3, "name": "Lenovo Bag", "seller_city": "Bangalore", "price": 1800}
    ],
    "mouse": [
        {"id": 4, "name": "Logitech Mouse", "seller_city": "Pune", "price": 800},
        {"id": 5, "name": "Dell Mouse", "seller_city": "Chennai", "price": 600},
        {"id": 6, "name": "HP Mouse", "seller_city": "Hyderabad", "price": 700}
    ],
    "cooling pad": [
        {"id": 7, "name": "Cooler Master Pad", "seller_city": "Kolkata", "price": 2000},
        {"id": 8, "name": "Zebronics Pad", "seller_city": "Ahmedabad", "price": 1500}
    ],
    "phone case": [
        {"id": 9, "name": "Samsung Galaxy Case", "seller_city": "Mumbai", "price": 500},
        {"id": 10, "name": "iPhone Protective Case", "seller_city": "Delhi", "price": 800},
    ],
    "charger": [
        {"id": 12, "name": "Fast Charger 25W", "seller_city": "Pune", "price": 1000},
    ],
    "earphones": [
        {"id": 15, "name": "Sony WH-1000XM4", "seller_city": "Kolkata", "price": 25000},
    ],
    "bookmark": [
        {"id": 18, "name": "Wooden Bookmark Set", "seller_city": "Mumbai", "price": 200},
    ],
    "reading light": [
        {"id": 21, "name": "LED Reading Light", "seller_city": "Pune", "price": 800},
    ],
    "book stand": [
        {"id": 24, "name": "Wooden Book Stand", "seller_city": "Kolkata", "price": 1500},
    ]
}


class RecommendationService:
    def __init__(self):
        self.geolocator = Nominatim(user_agent="amazon_budget_app_recommender", timeout=10)
        self.mock_recommendations = mock_recommendations_data
        self.mock_products = mock_products_data

    def _geocode_city(self, city_name: str):
        try:
            location = self.geolocator.geocode(city_name)
            if location:
                return location.latitude, location.longitude
            return None, None
        except Exception as e:
            print(f"Error geocoding {city_name}: {e}")
            return None, None

    def _calculate_distance(self, lat1, lon1, lat2, lon2):
        R = 6371.0
        lat1_rad, lon1_rad = math.radians(lat1), math.radians(lon1)
        lat2_rad, lon2_rad = math.radians(lat2), math.radians(lon2)
        dlat, dlon = lat2_rad - lat1_rad, lon2_rad - lon1_rad
        a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    def _get_best_product_by_distance_and_price(self, products: List[Dict], user_lat, user_lon):
        products_with_distance = []
        for product in products:
            seller_lat, seller_lon = self._geocode_city(product['seller_city'])
            if seller_lat and seller_lon:
                distance = self._calculate_distance(user_lat, user_lon, seller_lat, seller_lon)
                products_with_distance.append({**product, 'distance': round(distance, 2)})
        
        if not products_with_distance:
            return None
        
        products_with_distance.sort(key=lambda x: (x['distance'], x['price']))
        
        # Simplified: just return the top one after sorting
        return products_with_distance[0]


    def get_distance_based_recommendations(self, main_product: str, user_city: str):
        user_lat, user_lon = self._geocode_city(user_city)
        if not user_lat or not user_lon:
            return {"error": f"Could not geocode user city: {user_city}", "recommendations": []}

        recommended_item_names = self.mock_recommendations.get(main_product.lower(), [])
        recommendations_output = []

        for item_name in recommended_item_names:
            products_of_type = self.mock_products.get(item_name.lower(), [])
            if products_of_type:
                best_product = self._get_best_product_by_distance_and_price(
                    products_of_type, user_lat, user_lon
                )
                if best_product:
                    recommendations_output.append({
                        "product_type": main_product,
                        "category": item_name,
                        "product": best_product
                    })
        
        return self._format_recommendations(recommendations_output)

    def _format_recommendations(self, recommendations: List[Dict]):
        if not recommendations:
            return {
                "status": "no_recommendations",
                "message": "No recommendations found",
                "total_recommendations": 0,
                "recommendations": []
            }
        
        formatted_recs = []
        for rec in recommendations:
            formatted_recs.append({
                "category": rec["category"],
                "product_type": rec["product_type"],
                "product_name": rec["product"]["name"],
                "price": rec["product"]["price"],
                "seller_city": rec["product"]["seller_city"],
                "distance_km": rec["product"]["distance"]
            })
        
        return {
            "status": "success",
            "total_recommendations": len(formatted_recs),
            "recommendations": formatted_recs
        }
