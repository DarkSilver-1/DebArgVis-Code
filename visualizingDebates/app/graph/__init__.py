import logging
import json

from .topic_extraction import extract_topics
from .data_extraction import extract_data

logging.info("Starting to extract the data")
graph_data = extract_data()
logging.info("Finished data extraction")
logging.info("Starting to extract topics")
topics = extract_topics()
graph_data["topics"] = topics
logging.info("Finished topic extraction")

# save results into a file
with open("analysis_reults/analysis_results.json", "w") as f:
    f.write(json.dumps(graph_data, default=str))
