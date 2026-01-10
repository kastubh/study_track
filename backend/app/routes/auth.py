from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from app.models.user import User
from app.extensions import mongo
from bson.objectid import ObjectId

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    # Basic validation
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({"message": "Missing email or password"}), 400
    
    if User.find_by_email(data['email']):
        return jsonify({"message": "User already exists"}), 400

    try:
        user_id = User.create(data)
        
        # Create tokens
        access_token = create_access_token(identity=user_id, additional_claims={"role": data['role']})
        refresh_token = create_refresh_token(identity=user_id)

        return jsonify({
            "message": "User registered successfully",
            "user": {
                "id": user_id,
                "name": data['name'],
                "email": data['email'],
                "role": data['role'],
                "hasSeenWizard": False
            },
            "accessToken": access_token,
            "refreshToken": refresh_token
        }), 201
    except Exception as e:
        return jsonify({"message": str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({"message": "Missing email or password"}), 400

    user_data = User.find_by_email(data['email'])
    
    if not user_data:
        return jsonify({"message": "Invalid credentials"}), 401
    
    # Verify password (using the User class method would require instantiating, 
    # but for checking we can just use bcrypt directly or helper)
    # Let's instantiate a temporary user object to use the method or just check directly
    # Since we stored the hash in the DB
    
    import bcrypt
    if not bcrypt.checkpw(data['password'].encode('utf-8'), user_data['passwordHash'].encode('utf-8')):
         return jsonify({"message": "Invalid credentials"}), 401

    user_id = str(user_data['_id'])
    access_token = create_access_token(identity=user_id, additional_claims={"role": user_data['role']})
    refresh_token = create_refresh_token(identity=user_id)

    return jsonify({
        "user": {
            "id": user_id,
            "name": user_data['name'],
            "email": user_data['email'],
            "role": user_data['role'],
            "hasSeenWizard": user_data.get('hasSeenWizard', False)
        },
        "accessToken": access_token,
        "refreshToken": refresh_token
    }), 200

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    current_user_id = get_jwt_identity()
    user_data = mongo.db.users.find_one({"_id": ObjectId(current_user_id)})
    
    if not user_data:
        return jsonify({"message": "User not found"}), 404
        
    return jsonify({
        "id": str(user_data['_id']),
        "name": user_data['name'],
        "email": user_data['email'],
        "role": user_data['role'],
        "hasSeenWizard": user_data.get('hasSeenWizard', False)
    }), 200

@auth_bp.route('/update-wizard', methods=['PUT'])
@jwt_required()
def update_wizard_status():
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data or 'hasSeenWizard' not in data:
        return jsonify({"message": "Missing hasSeenWizard field"}), 400
        
    try:
        mongo.db.users.update_one(
            {"_id": ObjectId(current_user_id)},
            {"$set": {"hasSeenWizard": data['hasSeenWizard']}}
        )
        return jsonify({"message": "Wizard status updated successfully"}), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500
