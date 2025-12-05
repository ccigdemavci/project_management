from sqlalchemy import create_engine, text
import os

# Hardcoded for simplicity as seen in previous steps, or could load from env
DATABASE_URL = "mysql+pymysql://trex:trexpass@127.0.0.1:3306/trexdb"

def add_column():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        try:
            # Check if column exists first to avoid error if run multiple times
            result = conn.execute(text("SHOW COLUMNS FROM projects LIKE 'priority'"))
            if result.fetchone():
                print("Column 'priority' already exists.")
                return

            print("Adding 'priority' column...")
            conn.execute(text("ALTER TABLE projects ADD COLUMN priority ENUM('High', 'Medium', 'Normal') DEFAULT 'Normal'"))
            conn.commit()
            print("Successfully added priority column.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    add_column()
