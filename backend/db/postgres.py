import os
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

if __name__ == "__main__":
    # Quick test/ping
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            print("PostgreSQL connection successful:", result.fetchone()[0] == 1)
    except Exception as e:
        print("PostgreSQL connection failed:", e)
