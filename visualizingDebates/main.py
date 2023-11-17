from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.responses import HTMLResponse
from app.graph import graph_data
from app.graph import graph
import uvicorn
from app.logger import logging

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")


# /static/index.html
@app.get("../data")
async def get_data():
    return graph


@app.get("/")
def get_graph_page():
    logging.info("Showing graph")  # Log message for application logs
    return HTMLResponse(content=open("static/graph_page.html").read(), status_code=200)


@app.get("/graph-data")
def get_graph_data():
    return graph_data


if __name__ == "__main__":
    uvicorn.run(app)
