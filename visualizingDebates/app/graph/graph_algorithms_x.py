import datetime
from datetime import datetime as dt
import networkx as nx

from ..logger import logging


def order_graph_x(graph_data):
    graph_data = nx.node_link_data(graph_data)
    graph_data["nodes"] = sorted(graph_data["nodes"], key=lambda x: (x["part"], x["part_index"], x["statement_index"]))
    time_parts = []
    datetime_pattern = "%H:%M:%S"
    prev_time = None
    time_stamp = None
    for node in graph_data["nodes"]:
        time_stamp = dt.strptime(node["part_time"], datetime_pattern)

        if prev_time != time_stamp and prev_time is not None:
            compute_time_stamps(time_parts, time_stamp)
            time_parts.clear()
        time_parts.append(node)
        prev_time = time_stamp

    compute_time_stamps(time_parts, time_stamp + datetime.timedelta(seconds=30))
    return graph_data


def compute_time_stamps(time_parts, next_time):
    time = dt.strptime(time_parts[0]["part_time"], "%H:%M:%S")
    timedelta = next_time - time
    mean_duration = timedelta.seconds / len(time_parts)
    start_time = 0
    for node in time_parts:
        node["part_time"] = time + datetime.timedelta(seconds=start_time)
        node["end_part_time"] = node["part_time"] + datetime.timedelta(seconds=mean_duration)
        start_time += mean_duration


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
