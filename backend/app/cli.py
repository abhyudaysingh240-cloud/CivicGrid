import sys
import secrets
import argparse
from pathlib import Path

# Add project root directory to sys.path
root_dir = Path(__file__).resolve().parent.parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from backend.app.core.database import SessionLocal, Base, engine
from backend.app.core.security import get_password_hash
from backend.app.models.models import User, AuditLog

def create_admin(username: str, email: str, password: str = None):
    db = SessionLocal()
    try:
        pwd = password or secrets.token_urlsafe(16)
        user = db.query(User).filter(User.username == username).first()
        if not user:
            user = User(
                username=username,
                email=email,
                hashed_password=get_password_hash(pwd),
                role="ADMIN",
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"[SUCCESS] Admin user '{username}' created successfully.")
        else:
            user.role = "ADMIN"
            user.is_active = True
            user.hashed_password = get_password_hash(pwd)
            db.commit()
            print(f"[SUCCESS] Existing user '{username}' promoted to ADMIN and password updated.")

        print(f"[CREDENTIALS] Username: {username}")
        print(f"[CREDENTIALS] Password: {pwd}")
        print("Note: Store these credentials securely. They will not be displayed again.")
    finally:
        db.close()

def reset_password(username: str, password: str = None):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            print(f"[ERROR] User with username '{username}' not found.")
            sys.exit(1)

        pwd = password or secrets.token_urlsafe(16)
        user.hashed_password = get_password_hash(pwd)
        db.commit()

        print(f"[SUCCESS] Password for user '{username}' has been reset.")
        print(f"[CREDENTIALS] Username: {username}")
        print(f"[CREDENTIALS] New Password: {pwd}")
        print("Note: Previous credentials for this account are invalidated.")
    finally:
        db.close()

def main():
    parser = argparse.ArgumentParser(description="CivicGrid Administration CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # create-admin
    admin_parser = subparsers.add_parser("create-admin", help="Create or elevate an administrator account")
    admin_parser.add_argument("--username", default="admin", help="Admin username (default: admin)")
    admin_parser.add_argument("--email", default="admin@civicgrid.internal", help="Admin email")
    admin_parser.add_argument("--password", default=None, help="Admin password (generated if omitted)")

    # reset-password
    reset_parser = subparsers.add_parser("reset-password", help="Reset password for an existing user")
    reset_parser.add_argument("username", help="Target username to reset")
    reset_parser.add_argument("--password", default=None, help="New password (generated if omitted)")

    args = parser.parse_args()

    Base.metadata.create_all(bind=engine)

    if args.command == "create-admin":
        create_admin(args.username, args.email, args.password)
    elif args.command == "reset-password":
        reset_password(args.username, args.password)

if __name__ == "__main__":
    main()
