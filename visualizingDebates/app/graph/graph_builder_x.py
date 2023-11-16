import json
import os
from datetime import datetime

import networkx as nx

json_folder_path = 'C:/Users/Martin Gruber/OneDrive - gw.uni-passau.de/Studium/7. Semester/Bachelorarbeit/Data/qt30'  # may not stay here


def build_graph_x():
    json_file_path = 'C:/Users/Martin Gruber/OneDrive - gw.uni-passau.de/Studium/7. Semester/Bachelorarbeit/Data/qt30/nodeset17934.json'
    graph = nx.MultiDiGraph()
    #for filename in os.listdir(json_folder_path):
    #    if filename.endswith('.json'):
    #        json_file_path = os.path.join(json_folder_path, filename)
    #        if os.path.getsize(json_file_path) != 0 and os.path.getsize(json_file_path) != 68:
    extract_file(graph, json_file_path)
    remove_isolated(graph)
    graph = collapse_nodes(graph)
    collapse_edges(graph)
    new_graph = filter_date(graph, datetime.strptime("2020-05-21", '%Y-%m-%d').date())
    return new_graph


def extract_file(graph, json_file_path):
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


def filter_date(graph, target_date):
    subgraph = nx.MultiDiGraph()

    for node, data in graph.nodes(data=True):
        if "start" in data and data["start"].date() == target_date and data.get("type") == "L":
            subgraph.add_node(node, **data)

    for from_node, to_node, data in graph.edges(data=True):
        if from_node in subgraph.nodes and to_node in subgraph:
            subgraph.add_edge(from_node, to_node, **data)
    return subgraph


def collapse_nodes(graph):
    print("Input:", graph)
    new_graph = nx.MultiDiGraph()
    nodes_to_collapse = set()
    nodes_to_remove = []
    edges_to_add = []

    # Identify nodes to collapse
    for node, attributes in graph.nodes(data=True):
        if attributes["type"] == "L":
            neighbors = set(graph.neighbors(node))
            ya_neighbors = {n for n in neighbors if graph.nodes[n]["type"] == "YA"}
            if ya_neighbors:
                nodes_to_collapse.add(node)
    # create a node id mapping of L nodes and their corresponding I nodes
    node_id_mapping = create_node_mapping(graph, nodes_to_collapse)

    # Merge the nodes that are in the mapping and set their outgoing edge source to the merged node
    for l_node in nodes_to_collapse:
        collapse_node(graph, new_graph, node_id_mapping, edges_to_add, nodes_to_remove, l_node)

    # Fill the graph with the nodes and edges that are not part of the mapping but necessary for connections
    populate_graph(edges_to_add, graph, new_graph, nodes_to_remove)
    return new_graph


def collapse_node(graph, new_graph, node_id_mapping, edges_to_add, nodes_to_remove, l_node):
    neighbors = set(graph.neighbors(l_node))
    ya_nodes = {n for n in neighbors if graph.nodes[n]["type"] == "YA"}
    if ya_nodes:
        ya_node = ya_nodes.pop()
        i_nodes = list(graph.neighbors(ya_node))
        if i_nodes:
            i_node = i_nodes[0]
            incoming_from_ya = any(
                graph.nodes[predecessor]["type"] == "YA" for predecessor in graph.predecessors(l_node))
            if not incoming_from_ya:
                new_graph.add_node(l_node, **graph.nodes[l_node], paraphrasedtext=graph.nodes[i_node]["text"])
                adapt_edge_source(edges_to_add, graph, i_node, l_node, new_graph, node_id_mapping)

            nodes_to_remove.append(ya_node)
            nodes_to_remove.append(i_node)


def populate_graph(edges_to_add, graph, new_graph, nodes_to_remove):
    for node in graph.nodes():
        if node not in nodes_to_remove:
            new_graph.add_node(node, **graph.nodes[node])
    for edge in edges_to_add:
        s, t = edge
        new_graph.add_edge(s, t)
    for edge in graph.edges():
        source, target = edge
        if source in new_graph.nodes and target in new_graph.nodes:
            edge_attributes = {str(key): value for key, value in graph[source][target].items()}
            new_graph.add_edge(source, target, **edge_attributes)


def adapt_edge_source(edges_to_add, graph, i_node, l_node, new_graph, node_id_mapping):
    for edge in graph.out_edges(i_node):
        s, t = edge
        if graph.nodes[t]["type"] != "YA":
            edges_to_add.append((l_node, t))
            for e in graph.out_edges(t):
                source, target = e
                edges_to_add.append((t, node_id_mapping[target]))
        else:
            for e in graph.out_edges(t):
                source, target = e
                new_graph.nodes[l_node]["quote"] = graph.nodes[target]["text"]
                if graph.nodes[target]["type"] == "I":
                    for en in graph.out_edges(target):
                        so, ta = en
                        edges_to_add.append((l_node, ta))
                        for end in graph.out_edges(ta):
                            sou, tar = end
                            edges_to_add.append((ta, node_id_mapping[tar]))


def create_node_mapping(graph, nodes_to_collapse):
    node_id_mapping = {}
    for l_node in nodes_to_collapse:
        neighbors = set(graph.neighbors(l_node))
        ya_nodes = {n for n in neighbors if graph.nodes[n]["type"] == "YA"}
        if ya_nodes:
            ya_node = ya_nodes.pop()
            i_nodes = {n for n in graph.neighbors(ya_node) if graph.nodes[n]["type"] == "I"}
            if i_nodes:
                i_node = i_nodes.pop()
                predecessors = set(graph.predecessors(l_node))
                predecessor_ya_node = next((p for p in predecessors if graph.nodes[p]["type"] == "YA"), None)
                if predecessor_ya_node:
                    predecessors = set(graph.predecessors(predecessor_ya_node))
                    predecessor_l_node = next((p for p in predecessors if graph.nodes[p]["type"] == "L"), None)
                    if i_node not in node_id_mapping and predecessor_l_node:
                        node_id_mapping[i_node] = predecessor_l_node
                else:
                    node_id_mapping[i_node] = l_node
        else:
            print("Error")
    return node_id_mapping

