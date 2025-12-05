from app.db import engine, Base
from app.models import *  # Import all models to ensure they are registered

def init_db():
    print("Creating all tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created.")

if __name__ == "__main__":
    init_db()
