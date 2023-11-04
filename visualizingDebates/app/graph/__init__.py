from .graph_builder import build_graph

static_param1 = "value1"
static_param2 = "value2"

# Create the graph during package initialization
graph = build_graph(static_param1, static_param2)