from app.db.database import SessionLocal
from app.db.models import User
import sys

db = SessionLocal()
email = "shop1admin@gmail.com" # Target user
user = db.query(User).filter(User.email == email).first()

if user:
    print(f"User: {user.email}")
    print(f"Role: {user.role}")
    print(f"Assigned Shop ID: {user.assigned_shop_id}")
    print(f"Assigned Warehouse ID: {user.assigned_warehouse_id}")
else:
    print(f"User {email} not found")

# List all users with their shop IDs
print("\n--- All Users ---")
users = db.query(User).all()
for u in users:
    print(f"{u.email[:20].ljust(25)} | Role: {str(u.role).ljust(15)} | Shop: {u.assigned_shop_id} | Warehouse: {u.assigned_warehouse_id}")

db.close()
