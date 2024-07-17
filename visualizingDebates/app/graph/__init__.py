import logging

from .topic_extraction import extract_topics
from .data_extraction import extract_data

logging.info("Creating the graph")
graph_data = extract_data()
topics = extract_topics()
graph_data["topics"] = topics
