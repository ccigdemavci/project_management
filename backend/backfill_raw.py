from sqlalchemy import create_engine, text

DATABASE_URL = "mysql+pymysql://trex:trexpass@127.0.0.1:3306/trexdb"

def backfill():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        try:
            # Update completed_at with updated_at for completed items where completed_at is NULL
            result = conn.execute(text("""
                UPDATE phase_details 
                SET completed_at = updated_at 
                WHERE is_completed = 1 AND completed_at IS NULL
            """))
            conn.commit()
            print(f"Backfill complete. Rows affected: {result.rowcount}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    backfill()
