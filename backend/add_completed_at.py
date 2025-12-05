from sqlalchemy import create_engine, text
import os

DATABASE_URL = "mysql+pymysql://trex:trexpass@127.0.0.1:3306/trexdb"

def add_column():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        try:
            # Check if column exists
            result = conn.execute(text("SHOW COLUMNS FROM phase_details LIKE 'completed_at'"))
            if result.fetchone():
                print("Column 'completed_at' already exists.")
            else:
                print("Adding 'completed_at' column...")
                conn.execute(text("ALTER TABLE phase_details ADD COLUMN completed_at DATETIME NULL"))
                print("Column added successfully.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    add_column()
