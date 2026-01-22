from app.db.database import SessionLocal
from app.db.models import User
from app.core.security import get_password_hash

db = SessionLocal()
email = "shop1admin@gmail.com"
user = db.query(User).filter(User.email == email).first()

if user:
    print(f"Resetting password for {user.email}")
    user.password_hash = get_password_hash("password123")
    db.commit()
    print("Password reset successful.")
else:
    print(f"User {email} not found")

db.close()
