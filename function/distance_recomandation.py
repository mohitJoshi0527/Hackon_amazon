import requests
import math
from geopy.geocoders import Nominatim
from geopy.distance import geodesic
import time
from typing import List, Dict, Tuple, Optional

# Add the mock data at the top of your file, after imports
mock_recommendations = {
    "laptop": ["laptop bag", "mouse", "cooling pad"],
    "phone": ["phone case", "charger", "earphones"],
    "book": ["bookmark", "reading light", "book stand"]
}

mock_products = {
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
        {"id": 11, "name": "OnePlus Case", "seller_city": "Bangalore", "price": 400}
    ],
    "charger": [
        {"id": 12, "name": "Fast Charger 25W", "seller_city": "Pune", "price": 1000},
        {"id": 13, "name": "Wireless Charger", "seller_city": "Chennai", "price": 1500},
        {"id": 14, "name": "USB-C Charger", "seller_city": "Hyderabad", "price": 700}
    ],
    "earphones": [
        {"id": 15, "name": "Sony WH-1000XM4", "seller_city": "Kolkata", "price": 25000},
        {"id": 16, "name": "JBL Tune 230NC", "seller_city": "Ahmedabad", "price": 4000},
        {"id": 17, "name": "boAt Airdopes", "seller_city": "Jaipur", "price": 2000}
    ],
    "bookmark": [
        {"id": 18, "name": "Wooden Bookmark Set", "seller_city": "Mumbai", "price": 200},
        {"id": 19, "name": "Metal Bookmark", "seller_city": "Delhi", "price": 150},
        {"id": 20, "name": "Leather Bookmark", "seller_city": "Bangalore", "price": 300}
    ],
    "reading light": [
        {"id": 21, "name": "LED Reading Light", "seller_city": "Pune", "price": 800},
        {"id": 22, "name": "Clip-on Book Light", "seller_city": "Chennai", "price": 500},
        {"id": 23, "name": "Adjustable Desk Lamp", "seller_city": "Hyderabad", "price": 1200}
    ],
    "book stand": [
        {"id": 24, "name": "Wooden Book Stand", "seller_city": "Kolkata", "price": 1500},
        {"id": 25, "name": "Adjustable Metal Stand", "seller_city": "Ahmedabad", "price": 1000},
        {"id": 26, "name": "Portable Book Holder", "seller_city": "Jaipur", "price": 600}
    ]
}

class DistanceRecommendation:
    def __init__(self):
        # Initialize the geolocator with longer timeout
        self.geolocator = Nominatim(user_agent="laptop_recommendation_app", timeout=10)
    
    def geocode_city(self, city_name):
        """
        Get latitude and longitude coordinates for a city
        """
        try:
            location = self.geolocator.geocode(city_name)
            if location:
                return location.latitude, location.longitude
            else:
                print(f"Could not find coordinates for: {city_name}")
                return None, None
        except Exception as e:
            print(f"Error geocoding {city_name}: {e}")
            return None, None
    
    def calculate_distance(self, lat1, lon1, lat2, lon2):
        """
        Calculate distance between two points using Haversine formula
        """
        # Radius of Earth in kilometers
        R = 6371.0
        
        # Convert coordinates to radians
        lat1_rad = math.radians(lat1)
        lon1_rad = math.radians(lon1)
        lat2_rad = math.radians(lat2)
        lon2_rad = math.radians(lon2)
        
        # Calculate differences
        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad
        
        # Haversine formula
        a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        distance = R * c
        
        return distance
    
    def get_product_recommendations(self, product_name: str) -> List[str]:
        """
        Get recommended products from API (replace with your actual API call)
        """
        # Example API call - replace with your actual endpoint
        try:
            # Placeholder for your Groq API or recommendation API
            api_url = "YOUR_API_ENDPOINT"
            payload = {"product": product_name}
            
            # response = requests.post(api_url, json=payload)
            # recommendations = response.json().get('recommendations', [])
            
            # Mock data for testing - replace with actual API call
            
            return mock_recommendations.get(product_name.lower(), [])
        except Exception as e:
            print(f"Error getting recommendations: {e}")
            return []
    
    def get_products_by_type(self, product_type: str) -> List[Dict]:
        """
        Get all products of a specific type from database
        Replace with your actual database query
        """
        # Mock database query - replace with actual database call
        
        return mock_products.get(product_type.lower(), [])
    
    def get_best_product_by_distance_and_price(self, products, user_lat, user_lon):
        """
        Get the best product considering distance first, then price for products at same distance
        """
        products_with_distance = []
        
        for product in products:
            seller_lat, seller_lon = self.geocode_city(product['seller_city'])
            if seller_lat and seller_lon:
                distance = self.calculate_distance(user_lat, user_lon, seller_lat, seller_lon)
                products_with_distance.append({
                    **product,
                    'distance': round(distance, 2)
                })
        
        if not products_with_distance:
            return None
        
        # Sort by distance first, then by price
        products_with_distance.sort(key=lambda x: (x['distance'], x['price']))
        
        # Group products by distance
        distance_groups = {}
        for product in products_with_distance:
            dist = product['distance']
            if dist not in distance_groups:
                distance_groups[dist] = []
            distance_groups[dist].append(product)
        
        # Get the closest distance
        min_distance = min(distance_groups.keys())
        closest_products = distance_groups[min_distance]
        
        # If multiple products at same distance, return the cheapest one
        if len(closest_products) > 1:
            best_product = min(closest_products, key=lambda x: x['price'])
            print(f"Multiple products found at {min_distance} km distance. Selected cheapest: {best_product['name']} at ₹{best_product['price']}")
        else:
            best_product = closest_products[0]
            print(f"Closest product: {best_product['name']} at {min_distance} km distance for ₹{best_product['price']}")
        
        return best_product

    def get_distance_based_recommendations(self, main_product, user_city):
        """
        Updated function to use the new price-optimized selection
        """
        print(f"Getting recommendations for {main_product} from {user_city}...")
        
        # Get user coordinates
        user_lat, user_lon = self.geocode_city(user_city)
        if not user_lat or not user_lon:
            print(f"Could not geocode user city: {user_city}")
            return []
        
        # Get recommended products
        recommended_items = mock_recommendations.get(main_product.lower(), [])
        recommendations = []
        
        print(f"\n--- Distance-Based Recommendations ---")
        for item in recommended_items:
            if item in mock_products:
                print(f"\nFor {item}:")
                best_product = self.get_best_product_by_distance_and_price(
                    mock_products[item], user_lat, user_lon
                )
                
                if best_product:
                    print(f"  Recommended: {best_product['name']}")
                    print(f"  Price: ₹{best_product['price']}")
                    print(f"  Seller City: {best_product['seller_city']}")
                    print(f"  Distance: {best_product['distance']} km")
                    
                    # Add to recommendations list with product_type
                    recommendations.append({
                        "product_type": main_product,  # Add this key
                        "category": item,
                        "product": best_product
                    })
            else:
                print(f"\nNo products found for {item}")
        
        return recommendations  # Return the list of recommendations

    def format_recommendations(self, recommendations):
        """
        Format recommendations for output - handle None case
        """
        if recommendations is None or len(recommendations) == 0:
            return {
                "status": "no_recommendations",
                "message": "No recommendations found",
                "total_recommendations": 0,
                "recommendations": []
            }
        
        formatted = {
            "status": "success",
            "total_recommendations": len(recommendations),
            "recommendations": []
        }
        
        for rec in recommendations:
            formatted["recommendations"].append({
                "category": rec["category"],
                "product_type": rec["product_type"],  # Add this line
                "product_name": rec["product"]["name"],
                "price": rec["product"]["price"],
                "seller_city": rec["product"]["seller_city"],
                "distance_km": rec["product"]["distance"]
            })
        
        return formatted

def main():
    recommender = DistanceRecommendation()
    
    # Test the recommendation system
    user_city = "Mumbai"
    main_product = "laptop"
    
    try:
        recommendations = recommender.get_distance_based_recommendations(
            main_product, user_city
        )
        
        if recommendations:
            formatted_result = recommender.format_recommendations(recommendations)
            print(f"\n=== Final Results ===")
            print(f"Total recommendations: {formatted_result['total_recommendations']}")
            
            # Use the formatted results instead of raw recommendations
            for i, rec in enumerate(formatted_result['recommendations'], 1):
                print(f"\n{i}. {rec['product_name']} ({rec['product_type']}) - "
                      f"₹{rec['price']} - {rec['distance_km']} km from {rec['seller_city']}")
        else:
            print("No recommendations found.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()