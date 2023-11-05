from .graph_builder import build_graph
from .graph_algorithms import group_elements

static_param1 = "value1"
static_param2 = "value2"

# Create the graph during package initialization
graph = build_graph(static_param1, static_param2)
graph = group_elements(graph)

for start_time, globalNodeID, graphEdges, speaker, text, texts in graph:
    print(start_time, speaker, text, texts)
    print("")