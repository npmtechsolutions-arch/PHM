"""
Test script to check what role is in the JWT token for the super admin user
"""
import os
from jose import jwt

# Get the SECRET_KEY from environment
SECRET_KEY = "JkptKiwNvmPSQp0RTvJ-oJTu6yNImBt1asojGjo3xtYe5H8y4qE331muMdj7Xa4E1WaIZKjD8ZK4g-FrRxDMOA"
ALGORITHM = "HS256"

# This is a sample - you'll need to get the actual token from the browser
# Instructions: 
# 1. Open browser dev tools (F12)
# 2. Go to Application > Local Storage
# 3. Find the auth token
# 4. Copy it and paste it below

print("To test, you need to:")
print("1. Log in as super admin in the browser")
print("2. Open DevTools (F12) > Application > Local Storage")
print("3. Copy the 'access_token' value")
print("4. Paste it in this script and run again")
print()

# Example of how to decode (uncomment and add your token):
# token = "YOUR_TOKEN_HERE"
# try:
#     payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
#     print("Token payload:")
#     print(f"  user_id: {payload.get('user_id')}")
#     print(f"  email: {payload.get('sub')}")
#     print(f"  role: {payload.get('role')}")
#     print(f"  role_id: {payload.get('role_id')}")
#     print(f"  permissions: {payload.get('permissions', [])}")
#     print(f"  warehouse_id: {payload.get('warehouse_id')}")
#     print(f"  shop_id: {payload.get('shop_id')}")
# except Exception as e:
#     print(f"Error decoding token: {e}")
