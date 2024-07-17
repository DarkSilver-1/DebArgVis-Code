from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.responses import HTMLResponse
from app.graph import graph_data
import uvicorn

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
def get_welcome_page():
    return HTMLResponse(content=open("static/welcome_page.html").read(), status_code=200)


@app.get("/visualisation")
def get_graph_slider():
    return graph_data


if __name__ == "__main__":
    uvicorn.run(app)
