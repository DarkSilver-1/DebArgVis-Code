import json
import os
from datetime import datetime

import networkx as nx

json_folder_path = 'C:/Users/Martin Gruber/OneDrive - gw.uni-passau.de/Studium/7. Semester/Bachelorarbeit/Data/qt30'  # may not stay here

def build_graph_x():
    graph = nx.MultiDiGraph()
    json_file_path = 'C:/Users/Martin Gruber/OneDrive - gw.uni-passau.de/Studium/7. Semester/Bachelorarbeit/Data/qt30/nodeset17930.json'
    #for filename in os.listdir(json_folder_path):
    #    if filename.endswith('.json'):
    #        json_file_path = os.path.join(json_folder_path, filename)
    #        if os.path.getsize(json_file_path) != 0 and os.path.getsize(json_file_path) != 68:
    extract_file(graph, json_file_path)
    remove_isolated(graph)
    collapse_nodes(graph)
    collapse_edges(graph)
    newgraph = filter_date(graph, datetime.strptime("2020-05-21", '%Y-%m-%d').date())
    return newgraph


def extract_file(graph, json_file_path):
    # json_file_path = 'C:/Users/Martin Gruber/OneDrive - gw.uni-passau.de/Studium/7. Semester/Bachelorarbeit/Data/qt30/nodeset17932.json'
    with open(json_file_path, 'r') as json_file:
        graph_data = json.load(json_file)

        for node in graph_data["nodes"]:
            node_id = node["nodeID"]
            text = node["text"]
            node_type = node["type"]

            # Check if there is a matching locution for the node
            matching_locution = next(
                (locution for locution in graph_data["locutions"] if locution["nodeID"] == node_id), None)

            if matching_locution:
                if matching_locution.get("start"):
                    start_time = datetime.strptime(matching_locution.get("start"), '%Y-%m-%d %H:%M:%S')
                else:
                    start_time = datetime.strptime("2025-05-28 19:08:43", '%Y-%m-%d %H:%M:%S')  # TODO
                speaker = matching_locution.get("personID")
                graph.add_node(node_id, text=text, type=node_type, start=start_time, speaker=speaker)
            else:
                graph.add_node(node_id, text=text, type=node_type)

        for edge in graph_data["edges"]:
            graph.add_edge(edge["fromID"], edge["toID"])


def remove_isolated(graph):
    nodes_to_remove = [node for node, data in graph.nodes(data=True) if
                       data["type"] == "L" and graph.degree(node) == 0]
    for node in nodes_to_remove:
        graph.remove_node(node)


def collapse_edges(graph):
    l_nodes_to_update = set()

    # Identify "L" nodes connected to other "L" nodes via "TA", "RA", "MA", or "CA" nodes
    for node, attributes in graph.nodes(data=True):
        if attributes["type"] == "L":
            neighbors = set(graph.neighbors(node))
            additional_info_neighbors = {n for n in neighbors if graph.nodes[n]["type"] in {"TA", "RA", "MA", "CA"}}
            l_neighbors = {n for additional_info_node in additional_info_neighbors for n in
                           graph.neighbors(additional_info_node)}
            if l_neighbors:
                l_nodes_to_update.add(node)

    # Create a list to store edges and nodes to remove
    edges_to_remove = []
    nodes_to_remove = []

    # Update "L" to "L" edges
    for l_node in l_nodes_to_update:
        neighbors = set(graph.neighbors(l_node))
        additional_info_neighbors = {n for n in neighbors if graph.nodes[n]["type"] in {"TA", "RA", "MA", "CA"}}

        # Iterate over "TA", "RA", "MA", or "CA" nodes connected to the "L" node
        for additional_info_node in additional_info_neighbors:
            l_neighbors = {n for n in graph.neighbors(additional_info_node) if graph.nodes[n]["type"] == "L"}
            ya_neighbors = {n for n in graph.predecessors(additional_info_node) if graph.nodes[n]["type"] == "YA"}

            for l_neighbor in l_neighbors:
                # Replace the old edge with a new edge containing additional information
                if ya_neighbors:
                    ya_neighbor = ya_neighbors.pop()
                    conn_type = graph.nodes[ya_neighbor]["text"]
                    graph.add_edge(l_node, l_neighbor, text_additional=graph.nodes[additional_info_node]["text"],
                                   connType=conn_type)
                    edges_to_remove.append((ya_neighbor, additional_info_node))
                    nodes_to_remove.append(ya_neighbor)
                else:
                    graph.add_edge(l_node, l_neighbor, text_additional=graph.nodes[additional_info_node]["text"])

                # Add the old edge and node to the removal lists
                edges_to_remove.append((additional_info_node, l_neighbor))
                nodes_to_remove.append(additional_info_node)

    # Remove the old edges and nodes
    for edge_to_remove in edges_to_remove:
        if graph.has_edge(*edge_to_remove):
            graph.remove_edge(*edge_to_remove)
    for node_to_remove in nodes_to_remove:
        if graph.has_node(node_to_remove):
            graph.remove_node(node_to_remove)


def collapse_nodes(graph):
    nodes_to_collapse = set()

    # Identify nodes to collapse
    for node, attributes in graph.nodes(data=True):
        if attributes["type"] == "L":
            neighbors = set(graph.neighbors(node))
            ya_neighbors = {n for n in neighbors if graph.nodes[n]["type"] == "YA"}
            if ya_neighbors:
                nodes_to_collapse.add(node)

    edges_to_remove = []
    nodes_to_remove = []
    # Collapse nodes
    for l_node in nodes_to_collapse:
        # Find "YA" and "I" nodes connected to "L"
        neighbors = set(graph.neighbors(l_node))
        ya_nodes = {n for n in neighbors if graph.nodes[n]["type"] == "YA"}
        if ya_nodes:
            ya_node = ya_nodes.pop()
            i_nodes = list(graph.neighbors(ya_node))
            if i_nodes:
                i_node = i_nodes[0]

                # Create a new node with the attributes of the L node
                graph.add_node(l_node, paraphrasedtext=graph.nodes[i_node]["text"])

                # Add edges from "L" and "I" nodes to the new node
                for neighbor in set(graph.neighbors(l_node)) | set(graph.neighbors(i_node)):
                    if neighbor != ya_node:
                        graph.add_edge(l_node, neighbor)

                # Remove nodes and edges
                # graph.remove_node(ya_node)
                nodes_to_remove.append(ya_node)

                predecessors_list = list(graph.predecessors(i_node))
                for predecessor in predecessors_list:
                    # Convert keys to strings
                    edge_attributes = {str(key): value for key, value in graph[predecessor][i_node].items()}
                    graph.add_edge(predecessor, l_node, **edge_attributes)
                    # graph.remove_edge(predecessor, i_node)
                    edges_to_remove.append((predecessor, i_node))
                # graph.remove_node(i_node)
                nodes_to_remove.append(i_node)

    for edge_to_remove in edges_to_remove:
        if graph.has_edge(*edge_to_remove):
            graph.remove_edge(*edge_to_remove)
    for node_to_remove in nodes_to_remove:
        if graph.has_node(node_to_remove):
            graph.remove_node(node_to_remove)


def filter_date(graph, target_date):
    subgraph = nx.MultiDiGraph()

    for node, data in graph.nodes(data=True):
        if "start" in data and data["start"].date() == target_date and data.get("type") == "L":
            subgraph.add_node(node, **data)

    for from_node, to_node, data in graph.edges(data=True):
        if from_node in subgraph.nodes and to_node in subgraph:
            subgraph.add_edge(from_node, to_node, **data)
    return subgraph