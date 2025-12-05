from sqlalchemy import create_engine, text
import os

DATABASE_URL = "mysql+pymysql://trex:trexpass@127.0.0.1:3306/trexdb"

def check_priority():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        try:
            result = conn.execute(text("SELECT id, title, priority FROM projects ORDER BY created_at DESC LIMIT 5"))
            print("--- DB Content ---")
            for row in result:
                print(f"ID: {row.id}, Title: {row.title}, Priority: {row.priority}")
            print("------------------")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    check_priority()
