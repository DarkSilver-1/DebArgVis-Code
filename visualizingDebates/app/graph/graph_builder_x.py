import os
import json
import networkx as nx

json_folder_path = 'C:/Users/Martin Gruber/OneDrive - gw.uni-passau.de/Studium/7. Semester/Bachelorarbeit/Data/qt30'  # may not stay here

graph = nx.DiGraph()


def build_graph():
    for filename in os.listdir(json_folder_path):
        if filename.endswith('.json'):
            json_file_path = os.path.join(json_folder_path, filename)
            if os.path.getsize(json_file_path) != 0 and os.path.getsize(json_file_path) != 68:
                print(filename)
                extract_file(json_file_path)


def extract_file(json_file_path):
    json_file_path = 'C:/Users/Martin Gruber/OneDrive - gw.uni-passau.de/Studium/7. Semester/Bachelorarbeit/Data/qt30/nodeset17932.json'
    with open(json_file_path, 'r') as json_file:
        graph_data = json.load(json_file)

        for node in graph_data["nodes"]:
            graph.add_node(node["nodeID"], text=node["text"], type=node["type"])

        for edge in graph_data["edges"]:
            graph.add_edge(edge["fromID"], edge["toID"])


def remove_isolated(graph):
    nodes_to_remove = [node for node, data in graph.nodes(data=True) if
                       data["type"] == "L" and graph.degree(node) == 0]

    for node in nodes_to_remove:
        graph.remove_node(node)


def collapse_edges(graph):
    i_nodes_to_update = set()
    l_nodes_to_update = set()

    # Identify "I" nodes connected to other "I" nodes via "RA", "MA", or "CA" nodes
    for node, attributes in graph.nodes(data=True):
        if attributes["type"] == "I":
            neighbors = set(graph.neighbors(node))
            additional_info_neighbors = {n for n in neighbors if graph.nodes[n]["type"] in {"RA", "MA", "CA"}}
            i_neighbors = {n for additional_info_node in additional_info_neighbors for n in
                           graph.neighbors(additional_info_node)}
            if i_neighbors:
                i_nodes_to_update.add(node)
        elif attributes["type"] == "L":
            neighbors = set(graph.neighbors(node))
            additional_info_neighbors = {n for n in neighbors if graph.nodes[n]["type"] == "TA"}
            l_neighbors = {n for additional_info_node in additional_info_neighbors for n in
                           graph.neighbors(additional_info_node)}
            if l_neighbors:
                l_nodes_to_update.add(node)

    # Create a list to store edges and nodes to remove
    edges_to_remove = []
    nodes_to_remove = []

    # Update "I" to "I" edges
    for i_node in i_nodes_to_update:
        neighbors = set(graph.neighbors(i_node))
        additional_info_neighbors = {n for n in neighbors if graph.nodes[n]["type"] in {"RA", "MA", "CA"}}

        # Iterate over "RA", "MA", or "CA" nodes connected to the "I" node
        for additional_info_node in additional_info_neighbors:
            i_neighbors = {n for n in graph.neighbors(additional_info_node) if graph.nodes[n]["type"] == "I"}
            for i_neighbor in i_neighbors:
                # Replace the old edge with a new edge containing additional information
                graph.add_edge(i_node, i_neighbor, text_additional=graph.nodes[additional_info_node]["text"])

                # Add the old edge and node to the removal lists
                edges_to_remove.append((additional_info_node, i_neighbor))
                nodes_to_remove.append(additional_info_node)
    for l_node in l_nodes_to_update:
        neighbors = set(graph.neighbors(l_node))
        additional_info_neighbors = {n for n in neighbors if graph.nodes[n]["type"] == "TA"}

        # Iterate over "TA" nodes connected to the "L" node
        for additional_info_node in additional_info_neighbors:
            l_neighbors = {n for n in graph.neighbors(additional_info_node) if graph.nodes[n]["type"] == "L"}
            for l_neighbor in l_neighbors:
                # Replace the old edge with a new edge containing additional information
                graph.add_edge(l_node, l_neighbor, text_additional=graph.nodes[additional_info_node]["text"])

                # Add the old edge and node to the removal lists
                edges_to_remove.append((additional_info_node, l_neighbor))
                nodes_to_remove.append(additional_info_node)

    # Remove the old edges and nodes
    for edge_to_remove in edges_to_remove:
        graph.remove_edge(*edge_to_remove)
    for node_to_remove in nodes_to_remove:
        graph.remove_node(node_to_remove)

def collapse_edgesX(graph):
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

            print(l_neighbors)
            for l_neighbor in l_neighbors:
                # Replace the old edge with a new edge containing additional information
                graph.add_edge(l_node, l_neighbor, text_additional=graph.nodes[additional_info_node]["text"])

                # Add the old edge and node to the removal lists
                edges_to_remove.append((additional_info_node, l_neighbor))
                nodes_to_remove.append(additional_info_node)

    # Remove the old edges and nodes
    for edge_to_remove in edges_to_remove:
        graph.remove_edge(*edge_to_remove)
    for node_to_remove in nodes_to_remove:
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

    # Collapse nodes
    for l_node in nodes_to_collapse:
        # Find "YA" and "I" nodes connected to "L"
        ya_node = next(graph.neighbors(l_node), None)
        i_node = next(graph.neighbors(ya_node), None)

        if ya_node is not None and i_node is not None:
            # Create a new node with the attributes of the L node
            graph.add_node(l_node, text=graph.nodes[l_node]["text"], paraphrasedtext=graph.nodes[i_node]["text"],
                           type="L")

            # Add edges from "L" and "I" nodes to the new node
            for neighbor in set(graph.neighbors(l_node)) | set(graph.neighbors(i_node)):
                if neighbor != ya_node:
                    graph.add_edge(l_node, neighbor)

            # Remove nodes and edges
            graph.remove_node(ya_node)
            graph.remove_node(i_node)


extract_file(None)
remove_isolated(graph)
#collapse_edges(graph)
collapse_nodes(graph)
collapse_edgesX(graph)

for node_id, attributes in graph.nodes(data=True):
    print(f"Node {node_id}: {attributes}")

print(graph.edges(data=True))
