from app.extensions import mongo
import bcrypt
from datetime import datetime

class User:
    def __init__(self, name, email, password, role, phone_number=None, linked_parent_id=None):
        self.name = name
        self.email = email
        self.password_hash = self._hash_password(password)
        self.role = role
        self.phone_number = phone_number
        self.linked_parent_id = linked_parent_id
        self.created_at = datetime.utcnow()

    @staticmethod
    def _hash_password(password):
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def check_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))

    def to_dict(self):
        return {
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "passwordHash": self.password_hash,
            "phoneNumber": self.phone_number,
            "linkedParentId": self.linked_parent_id,
            "createdAt": self.created_at
        }

    @staticmethod
    def find_by_email(email):
        return mongo.db.users.find_one({"email": email})

    @staticmethod
    def create(user_data):
        user = User(
            name=user_data['name'],
            email=user_data['email'],
            password=user_data['password'],
            role=user_data['role'],
            phone_number=user_data.get('phoneNumber'),
            linked_parent_id=user_data.get('linkedParentId')
        )
        result = mongo.db.users.insert_one(user.to_dict())
        return str(result.inserted_id)
