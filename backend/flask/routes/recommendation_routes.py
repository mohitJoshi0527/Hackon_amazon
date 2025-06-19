from flask import Blueprint, request, jsonify
from services.recommendation_service import RecommendationService  # Changed from relative to absolute import

recommendation_bp = Blueprint('recommendation_bp', __name__, url_prefix='/api/recommendations')
recommendation_service = RecommendationService()

@recommendation_bp.route('/', methods=['GET'])
def get_recommendations():
    main_product = request.args.get('product')
    user_city = request.args.get('city')

    if not main_product or not user_city:
        return jsonify({"error": "Missing 'product' or 'city' query parameters"}), 400

    recommendations = recommendation_service.get_distance_based_recommendations(main_product, user_city)
    
    if "error" in recommendations:
         return jsonify(recommendations), 400 if "geocode" in recommendations["error"] else 500
         
    return jsonify(recommendations), 200
