from flask import Blueprint, request, jsonify
from services.budget_service import BudgetService  # Changed from relative to absolute import

budget_bp = Blueprint('budget_bp', __name__, url_prefix='/api/budget')
budget_service = BudgetService()

@budget_bp.route('/questionnaire', methods=['GET'])
def get_questionnaire():
    schema = budget_service.get_questionnaire_schema()
    return jsonify(schema), 200

@budget_bp.route('/plan', methods=['POST'])
def create_budget_plan():
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    # Basic validation (can be more thorough)
    required_fields = ["age_group", "monthly_budget", "top_categories", "shopping_behavior", "unplanned_purchases", "primary_goal"]
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing fields in questionnaire answers"}), 400

    recommendation = budget_service.get_budget_recommendation(data)
    if not recommendation:
        return jsonify({"error": "Failed to generate budget recommendation"}), 500
    
    if budget_service.save_budget_plan(data, recommendation):
        return jsonify({
            "message": "Budget plan created and saved successfully",
            "questionnaire_answers": data,
            "budget_plan": recommendation
        }), 201
    else:
        return jsonify({"error": "Failed to save budget plan"}), 500

@budget_bp.route('/plan', methods=['GET'])
def get_budget_plan():
    plan = budget_service.load_budget_plan()
    if plan:
        return jsonify(plan), 200
    return jsonify({"message": "No budget plan found. Please create one first."}), 404

@budget_bp.route('/plan', methods=['DELETE'])
def reset_budget_plan():
    if budget_service.reset_budget_file():
        return jsonify({"message": "Budget plan reset successfully."}), 200
    return jsonify({"error": "Failed to reset budget plan."}), 500
