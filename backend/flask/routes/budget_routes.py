from flask import Blueprint, request, jsonify
from services.budget_service import BudgetService  # Changed from relative to absolute import
import os  # Import os module
import json  # Import json module

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

@budget_bp.route('/file-path', methods=['GET'])
def get_budget_file_path():
    """Debug endpoint to check file paths"""
    return jsonify({
        "current_directory": os.getcwd(),
        "budget_file_path": budget_service.budget_file_path,
        "file_exists": os.path.exists(budget_service.budget_file_path),
        "is_writable": os.access(os.path.dirname(budget_service.budget_file_path), os.W_OK)
    })

@budget_bp.route('/update-file', methods=['POST'])
def update_budget_file():
    """Direct endpoint to update budget_plan.json file"""
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        # Get absolute path to budget_plan.json
        file_path = budget_service.budget_file_path
        
        # Write the data to the file
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2)
            
        return jsonify({
            "success": True,
            "message": f"Budget file updated successfully at {file_path}"
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@budget_bp.route('/update-category', methods=['POST'])
def update_budget_category():
    """Update a specific budget category - used by chatbot"""
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        category = data.get('category')
        amount = data.get('amount')
        
        if not category or amount is None:
            return jsonify({"error": "Category and amount are required"}), 400
        
        # Load current budget
        current_plan = budget_service.load_budget_plan()
        if not current_plan or 'budget_plan' not in current_plan:
            return jsonify({"error": "No existing budget plan found"}), 404
        
        # Update the category
        current_plan['budget_plan'][category] = int(amount)
        
        # Recalculate total
        new_total = 0
        for key, value in current_plan['budget_plan'].items():
            if key not in ['total_budget', 'recommendations']:
                new_total += int(value)
        
        current_plan['budget_plan']['total_budget'] = new_total
        
        # Save updated plan
        if budget_service.save_budget_plan(
            current_plan.get('questionnaire_answers', {}),
            current_plan['budget_plan']
        ):
            return jsonify({
                "success": True,
                "message": f"Successfully updated {category} to ₹{amount:,}",
                "new_total": new_total,
                "updated_category": category,
                "updated_amount": amount
            }), 200
        else:
            return jsonify({"error": "Failed to save budget update"}), 500
            
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@budget_bp.route('/file-info', methods=['GET'])
def get_budget_file_info():
    """Get budget file information including last modified time"""
    try:
        import os
        import time
        
        file_path = budget_service.budget_file_path
        
        if os.path.exists(file_path):
            # Get file modification time
            mtime = os.path.getmtime(file_path)
            last_modified = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(mtime))
            file_size = os.path.getsize(file_path)
            
            return jsonify({
                "exists": True,
                "last_modified": last_modified,
                "modification_timestamp": mtime,
                "size": file_size,
                "path": file_path
            }), 200
        else:
            return jsonify({
                "exists": False,
                "last_modified": None,
                "modification_timestamp": 0,
                "size": 0,
                "path": file_path
            }), 200
            
    except Exception as e:
        return jsonify({
            "error": f"Failed to get file info: {str(e)}",
            "exists": False
        }), 500
