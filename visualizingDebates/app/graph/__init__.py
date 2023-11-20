import logging

from .graph_builder import build_graph
from .graph_algorithms import group_elements, determine_end
from .graph_builder_x import build_graph_x
from .graph_algorithms_x import order_graph, group_elements_x

static_param1 = "value1"
static_param2 = "value2"

# Create the graph during package initialization
graph = build_graph(static_param1, static_param2)
graph = group_elements(graph)
graph = determine_end(graph)

logging.info("Creating the graph")
graph_data = group_elements_x(order_graph(build_graph_x()))
