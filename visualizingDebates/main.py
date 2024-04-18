from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.responses import HTMLResponse
from app.graph import graph_data, topics, graph_data_old
import uvicorn

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

# /static/slider.html


@app.get("/")
def get_welcome_page():
    return HTMLResponse(content=open("static/welcome_page.html").read(), status_code=200)


@app.get("/slider")
def get_graph_slider():
    return graph_data


@app.get("/slider")
def get_graph_slider():
    return HTMLResponse(content=open("static/slider.html").read(), status_code=200)

@app.get("/slider_old")
def get_graph_slider():
    return graph_data_old


@app.get("/slider_old")
def get_graph_slider():
    return HTMLResponse(content=open("static/slider_old.html").read(), status_code=200)


if __name__ == "__main__":
    uvicorn.run(app)
