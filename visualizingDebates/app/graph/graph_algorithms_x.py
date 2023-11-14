import datetime
import networkx as nx


def order_graph(graph_data):
    graph_data = nx.node_link_data(graph_data)
    for g in graph_data["nodes"]:
        print(g)

    graph_data["nodes"] = sorted(graph_data["nodes"], key=lambda x: x["start"])
    for i in range(len(graph_data["nodes"])):
        if i < len(graph_data["nodes"]) - 1:
            end_time = graph_data["nodes"][i + 1]["start"]
        else:
            end_time = graph_data["nodes"][i]["start"] + datetime.timedelta(seconds=15)
        graph_data["nodes"][i]["end_time"] = end_time.strftime('%Y-%m-%dT%H:%M:%S')
        graph_data["nodes"][i]["start_time"] = graph_data["nodes"][i]["start"].strftime('%Y-%m-%dT%H:%M:%S')
    return graph_data
