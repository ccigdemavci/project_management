from sqlalchemy import create_engine, text
from app.models import PhaseDetail
from app.db import SessionLocal
import sys
import os

# Add the current directory to sys.path to make imports work
sys.path.append(os.getcwd())

def backfill():
    db = SessionLocal()
    try:
        # Find completed details with no completed_at
        details = db.query(PhaseDetail).filter(
            PhaseDetail.is_completed == True,
            PhaseDetail.completed_at == None
        ).all()
        
        print(f"Found {len(details)} items to backfill.")
        
        for d in details:
            # Use updated_at as a proxy for completed_at
            # If updated_at is also null (unlikely), use created_at
            d.completed_at = d.updated_at or d.created_at
            
        db.commit()
        print("Backfill complete.")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    backfill()
