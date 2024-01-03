from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.responses import HTMLResponse
from app.graph import graph_data, graph_data_old, graph
import uvicorn

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")


# /static/index.html
@app.get("/data")
def get_data():
    return graph


@app.get("/data")
def get_graph_slider():
    return HTMLResponse(content=open("static/index.html").read(), status_code=200)


@app.get("/")
def get_graph_page():
    return HTMLResponse(content=open("static/graph_page.html").read(), status_code=200)


@app.get("/graph-data")
def get_graph_data():
    return graph_data


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
