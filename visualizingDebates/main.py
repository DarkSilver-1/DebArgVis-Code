from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.graph import graph
import uvicorn

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

# Access the graph in your FastAPI routes

@app.get("/")
async def get_data():
    return graph


if __name__ == "__main__":
    uvicorn.run(app)
