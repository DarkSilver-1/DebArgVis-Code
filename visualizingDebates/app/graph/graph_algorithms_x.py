import datetime

import networkx as nx

from ..logger import logging


def order_graph(graph_data):
    graph_data = nx.node_link_data(graph_data)
    graph_data["nodes"] = sorted(graph_data["nodes"], key=lambda x: x["start"])
    logging.info("Sorted Graph")
    for i in range(len(graph_data["nodes"])):
        if i < len(graph_data["nodes"]) - 1:
            if graph_data["nodes"][i + 1]["start"] == graph_data["nodes"][i]["start"]:
                graph_data["nodes"][i + 1]["start"] = graph_data["nodes"][i + 1]["start"] + datetime.timedelta(
                    seconds=1)
            end_time = graph_data["nodes"][i + 1]["start"]
        else:
            end_time = graph_data["nodes"][i]["start"] + datetime.timedelta(seconds=15)
        graph_data["nodes"][i]["end_time"] = end_time.strftime('%Y-%m-%dT%H:%M:%S')
        graph_data["nodes"][i]["start_time"] = graph_data["nodes"][i]["start"].strftime('%Y-%m-%dT%H:%M:%S')
    logging.info("Added end_time attribute to the nodes")
    return graph_data


def group_elements_x(graph_data_nodes):
    current_speaker = None
    current_group = []
    logging.info("Grouping Elements")
    extended_graph_nodes = [node.copy() for node in graph_data_nodes["nodes"]]
    for i, node in enumerate(extended_graph_nodes):
        if node["speaker"] != current_speaker:
            if current_group:
                for j in range(i - len(current_group), i):
                    extended_graph_nodes[j]["grouped_texts"] = current_group
                current_group = []
            current_speaker = node["speaker"]
        current_group.append(node["text"])
    if current_group:
        for j in range(len(extended_graph_nodes) - len(current_group), len(extended_graph_nodes)):
            extended_graph_nodes[j]["grouped_texts"] = current_group
    graph_data_nodes["nodes"] = extended_graph_nodes
    return graph_data_nodes
