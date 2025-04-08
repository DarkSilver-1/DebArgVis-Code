from fastapi import FastAPI,Request, Response
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from starlette.responses import HTMLResponse
from app.graph import graph_data
import uvicorn
import os

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
def get_welcome_page():
    return HTMLResponse(content=open("static/welcome_page.html").read(), status_code=200)


@app.get("/visualisation")
def get_visualization():
    return graph_data


@app.get("/old")
def get_old():
    return graph_data


@app.get("/video")
async def get_video(request: Request):
    file_path = "static/Question_Time.mp4"
    file_size = os.path.getsize(file_path)
    range_header = request.headers.get("range")

    if range_header:
        byte1, byte2 = 0, None
        m = range_header.strip().split("=")[-1]
        if "-" in m:
            parts = m.split("-")
            byte1 = int(parts[0])
            if parts[1]:
                byte2 = int(parts[1])

        length = (byte2 or file_size - 1) - byte1 + 1
        with open(file_path, "rb") as f:
            f.seek(byte1)
            data = f.read(length)
        return Response(
            content=data,
            status_code=206,
            headers={
                "Content-Range": f"bytes {byte1}-{byte1 + length - 1}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(length),
                "Content-Type": "video/mp4",
            },
        )
    else:
        return StreamingResponse(open(file_path, "rb"), media_type="video/mp4")


if __name__ == "__main__":
    uvicorn.run(app)
