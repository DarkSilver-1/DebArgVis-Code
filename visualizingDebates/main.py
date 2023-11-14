import json

import networkx as nx
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.responses import HTMLResponse, JSONResponse

from app.graph import graph
from app.graph import graphData
import uvicorn

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")


# Access the graph in your FastAPI routes
# /static/index.html
@app.get("/data")
async def get_data():
    return graph

@app.get("/")
def get_graph_page():
    # Assuming 'graph_page.html' is the name of your HTML file
    return HTMLResponse(content=open("static/graph_page.html").read(), status_code=200)

@app.get("/graph-data")
def get_graph_data():
    graph_data = nx.node_link_data(graphData)
    return graph_data

if __name__ == "__main__":
    uvicorn.run(app)
