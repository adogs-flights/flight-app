import sqlite3
import os

db_path = "backend/data/flight.db"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, email, hashed_password FROM users")
        users = cursor.fetchall()
        print(f"Total users found: {len(users)}")
        for user in users:
            print(f"ID: {user[0]}, Email: {user[1]}, Hashed Password: {user[2][:15]}...")
    except sqlite3.OperationalError as e:
        print(f"Error accessing users table: {e}")
    conn.close()
else:
    print(f"Database not found at {db_path}")
