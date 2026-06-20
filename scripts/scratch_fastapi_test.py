from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import io
import uvicorn

app = FastAPI()

@app.get("/pdf")
def get_pdf():
    buffer = io.BytesIO(b"Fake PDF Content")
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf")

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
