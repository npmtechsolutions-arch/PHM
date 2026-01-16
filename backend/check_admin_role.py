from app.db.database import SessionLocal
from app.db.models import User

def check_admin():
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.email == "admin@pharmaec.com").first()
        if admin:
            print(f"User: {admin.email}")
            print(f"Role (raw): {admin.role}")
            print(f"Role type: {type(admin.role)}")
            if hasattr(admin.role, 'value'):
                print(f"Role value: {admin.role.value}")
        else:
            print("Admin user not found")
    finally:
        db.close()

if __name__ == "__main__":
    check_admin()
