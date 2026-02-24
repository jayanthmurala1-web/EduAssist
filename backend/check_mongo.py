import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check_db():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["eduassist_db"]
    
    print("--- Syllabus Collection ---")
    cursor = db.syllabus.find({})
    async for doc in cursor:
        print(f"ID: {doc.get('id')} | Subject: {doc.get('subject')} | Title: {doc.get('title')}")

if __name__ == "__main__":
    asyncio.run(check_db())