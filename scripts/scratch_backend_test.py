import httpx
import asyncio

async def main():
    async with httpx.AsyncClient() as client:
        # Assuming the backend is running, wait, I can just test the python function directly
        pass

if __name__ == "__main__":
    asyncio.run(main())
