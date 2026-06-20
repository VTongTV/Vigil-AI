import httpx
import asyncio

async def test_pdf():
    async with httpx.AsyncClient() as client:
        # Get violation id
        res = await client.get("http://localhost:8000/api/v1/violations")
        if res.status_code == 200:
            data = res.json()
            if data and "items" in data and len(data["items"]) > 0:
                vid = data["items"][0]["id"]
                print(f"Using violation {vid}")
                pdf_res = await client.post(f"http://localhost:8000/api/v1/evidence/{vid}/fir-pdf")
                print("PDF Status:", pdf_res.status_code)
                print("PDF Content:", pdf_res.text[:500])
            else:
                print("No violations found")
        else:
            print("Failed to get violations:", res.text)

if __name__ == "__main__":
    asyncio.run(test_pdf())
