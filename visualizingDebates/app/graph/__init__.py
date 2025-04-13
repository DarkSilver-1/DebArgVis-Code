import logging
import json
from datetime import datetime

from .topic_extraction import extract_topics
from .data_extraction import extract_data

logging.info("Starting to extract the data")
graph_data = extract_data()
logging.info("Finished data extraction")
logging.info("Starting to extract topics")
topics = extract_topics()
graph_data["topics"] = topics
logging.info("Finished topic extraction")

# save results into a JSON file
with open("analysis_results/analysis_results.json", "w") as f:
    f.write(json.dumps(graph_data, default=str))


def convert(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")


# Convert and save as a JS file for local (serverless) inspection via opening the html in the results folder
with open("analysis_results/graph_data_test.js", "w") as f:
    f.write("const graphData = ")
    json.dump(graph_data, f, default=convert)
    f.write(";")
