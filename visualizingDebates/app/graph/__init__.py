import logging

from .graph_algorithms_x import order_graph, group_elements_x, order_graph_x
from .graph_builder_x import build_graph_x
from .graph_builder_x_old import build_graph_x_old
from .topic_extraction import extract_topics

logging.info("Creating the graph")
graph_data_old = group_elements_x(order_graph(build_graph_x_old()))
graph_data = order_graph_x(build_graph_x())
topics = extract_topics()
