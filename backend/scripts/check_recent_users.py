"""
Simple script to check the current logged-in user's permissions
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from app.core.database import get_db
from app.models.user import User
from app.models.role import Role, RolePermission, Permission

async def check_permissions():
    async for db in get_db():
        # Get the most recently logged in user (based on the logs, it seems to be the one with 403s)
        result = await db.execute(
            select(User, Role)
            .join(Role, User.role_id == Role.id, isouter=True)
            .order_by(User.updated_at.desc())
            .limit(5)
        )
        users = result.all()
        
        print("Recent users:")
        for user, role in users:
            print(f"\nEmail: {user.email}")
            print(f"Active: {user.is_active}")
            if role:
                print(f"Role: {role.name}")
                
                # Count permissions
                perm_count = await db.execute(
                    select(Permission.id)
                    .join(RolePermission, Permission.id == RolePermission.permission_id)
                    .where(RolePermission.role_id == role.id)
                )
                count = len(perm_count.all())
                print(f"Permission count: {count}")
            else:
                print("NO ROLE!")
        
        break

if __name__ == "__main__":
    asyncio.run(check_permissions())
