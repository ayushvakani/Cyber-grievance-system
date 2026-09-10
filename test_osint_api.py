import asyncio
from backend.services.osint_service import osint_service

async def main():
    print("Testing Debounce.io (safe email)...")
    res1 = await osint_service.check_email("bill@microsoft.com")
    print(res1)
    
    print("\nTesting Debounce.io (burner/disposable email)...")
    res2 = await osint_service.check_email("test@yopmail.com")
    print(res2)
    
    print("\nTesting Google Safe Browsing (safe url)...")
    res3 = await osint_service.check_url("https://google.com")
    print(res3)

if __name__ == "__main__":
    import dotenv
    dotenv.load_dotenv()
    asyncio.run(main())
