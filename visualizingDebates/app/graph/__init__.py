import datetime

import networkx as nx

from .graph_builder import build_graph
from .graph_algorithms import group_elements, determine_end
from .graph_builder_x import build_graph_x
from .graph_algorithms_x import order_graph

static_param1 = "value1"
static_param2 = "value2"

# Create the graph during package initialization
graph = build_graph(static_param1, static_param2)
graph = group_elements(graph)
graph = determine_end(graph)

print("--------------------------------------")
for start_time, globalNodeID, graphEdges, speaker, text, texts, end_time in graph:
    print(start_time, speaker, text)
print("--------------------------------------")


print("----------------####------------------")
graph_data = order_graph(build_graph_x())
#for data in graph_data["nodes"]:
    #print(data["start"], data["speaker"], data["text"])
print("----------------####------------------")
#print("----------------ÖÖ--------------------")
#for data in graph_data["links"]:
#    print(data["source"], data["text_additional"])
#print("----------------ÖÖ--------------------")



#print("--------------------------------------")
#for data in graph_data["nodes"]:
#    print(data["start"], data["speaker"], data["text"])
#print("--------------------------------------")

