from .graph_builder import build_graph
from .graph_algorithms import group_elements, determine_end

static_param1 = "value1"
static_param2 = "value2"

# Create the graph during package initialization
graph = build_graph(static_param1, static_param2)
graph = group_elements(graph)
graph = determine_end(graph)

for start_time, globalNodeID, graphEdges, speaker, text, texts, end_time in graph:
    print(start_time, speaker, text)
