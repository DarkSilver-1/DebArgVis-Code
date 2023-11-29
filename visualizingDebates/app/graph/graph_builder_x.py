import json
import os
from datetime import datetime
import networkx as nx
from dotenv import load_dotenv
from ..logger import logging

personIDMapping = {
    '3866': "Claire Cooper",
    '3812': 'Fiona Bruce',
    '3862': 'Andy Burnham',
    '3861': 'Chris Philip',
    '3863': 'Helle Thorning-Schmidt',
    '3864': 'James Graham',
}
newTopicQuestionTimes=["2020-05-21 22:52:01", "2020-05-21 23:08:18", "2020-05-21 23:31:20", "2020-05-21 23:43:08"]

load_dotenv()
datetime_format = os.getenv("DATETIME_FORMAT")
date_format = os.getenv("DATE_FORMAT")
replacement_date = os.getenv("REPLACEMENT_DATE")
filtering_date = os.getenv("FILTER_DATE")


def build_graph_x():
    graph = nx.MultiDiGraph()
    json_file_path = 'C:/Users/Martin Gruber/OneDrive - gw.uni-passau.de/Studium/7. Semester/Bachelorarbeit/Data/qt30/nodeset17930.json'
    json_folder_path = os.getenv("FOLDER_PATH")
    for filename in os.listdir(json_folder_path):
        if filename.endswith('.json'):
            json_file_path = os.path.join(json_folder_path, filename)
            if os.path.getsize(json_file_path) != 0 and os.path.getsize(json_file_path) != 68 and os.path.getsize(json_file_path) != 69:
                extract_file(graph, json_file_path)
    logging.info("Extracted the files")
    print("Extracted the files")
    remove_isolated(graph)
    logging.info("Removed isolated nodes")
    print("Removed isolated nodes")
    graph = collapse_nodes(graph)
    logging.info("Collapsed the corresponding I and L nodes")
    print("Collapsed the corresponding I and L nodes")
    collapse_edges(graph)
    logging.info("Collapsed the edges")
    print("Collapsed the edges")
    new_graph = filter_date(graph, datetime.strptime(filtering_date, date_format).date())
    logging.info(f"Filtered nodes of the day: {filter_date}")
    print(f"Filtered nodes of the day: {filter_date}")
    return new_graph


def extract_file(graph, json_file_path):
    with open(json_file_path, 'r') as json_file:
        #print(json_file_path)
        graph_data = json.load(json_file)

        for node in graph_data["nodes"]:
            node_id = node["nodeID"]
            text = node["text"]
            node_type = node["type"]

            # Check if there is a matching locution for the node
            matching_locution = next(
                (locution for locution in graph_data["locutions"] if locution["nodeID"] == node_id), None)

            if matching_locution:
                add_node_with_locution(graph, node_id, text, node_type, matching_locution)
            else:
                graph.add_node(node_id, text=text, type=node_type)

        for edge in graph_data["edges"]:
            graph.add_edge(edge["fromID"], edge["toID"])


def add_node_with_locution(graph, node_id, text, node_type, locution):
    new_question = False
    if locution.get("start"):
        start_time = datetime.strptime(locution.get("start"), datetime_format)
        if locution.get("start") in newTopicQuestionTimes:
            new_question = True
            print(locution.get("start"))
    else:
        start_time = datetime.strptime(replacement_date, datetime_format)
    speaker = locution.get("personID")
    if speaker in personIDMapping:
        if new_question:
            graph.add_node(node_id, text=text, type=node_type, start=start_time, speaker=personIDMapping[speaker],
                           newQuestion=new_question)
        else:
            graph.add_node(node_id, text=text, type=node_type, start=start_time, speaker=personIDMapping[speaker])
    else:
        graph.add_node(node_id, text=text, type=node_type, start=start_time, speaker="Public")



def remove_isolated(graph):
    nodes_to_remove = [node for node, data in graph.nodes(data=True) if
                       data["type"] == "L" and graph.degree(node) == 0]
    for node in nodes_to_remove:
        graph.remove_node(node)


def collapse_nodes(graph):
    new_graph = nx.MultiDiGraph()
    nodes_to_collapse = find_nodes_to_collapse(graph)
    node_id_mapping = create_node_id_mapping(graph, nodes_to_collapse)

    nodes_to_remove = []
    edges_to_add = []

    for l_node in nodes_to_collapse:
        # Find "YA" and "I" nodes connected to "L"
        neighbors = set(graph.neighbors(l_node))
        ya_nodes = {n for n in neighbors if graph.nodes[n]["type"] == "YA"}
        if not ya_nodes:
            continue
        ya_node = ya_nodes.pop()

        i_nodes = list(graph.neighbors(ya_node))
        if not i_nodes:
            logging.error("Missing connection")
            continue

        i_node = i_nodes[0]
        incoming_from_ya = any(graph.nodes[predecessor]["type"] == "YA" for predecessor in graph.predecessors(l_node))
        if not incoming_from_ya:
            new_graph.add_node(l_node, **graph.nodes[l_node], paraphrasedtext=graph.nodes[i_node]["text"])
            identify_edges_to_update(graph, new_graph, i_node, l_node, edges_to_add, node_id_mapping)
            nodes_to_remove.append(ya_node)
            nodes_to_remove.append(i_node)
    populate_graph(edges_to_add, nodes_to_remove, new_graph, graph)
    print("finished populating")
    for no in nx.node_link_data(new_graph)["nodes"]:
        print(no)
    return new_graph


def collapse_edges(graph):
    l_nodes_to_update = find_l_nodes_to_update(graph)
    edges_to_remove, nodes_to_remove = update_l_to_l_edges(graph, l_nodes_to_update)
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


def find_nodes_to_collapse(graph):
    nodes_to_collapse = set()
    for node, attributes in graph.nodes(data=True):
        if attributes["type"] == "L":
            neighbors = set(graph.neighbors(node))
            ya_neighbors = {n for n in neighbors if graph.nodes[n]["type"] == "YA"}
            if ya_neighbors:
                nodes_to_collapse.add(node)
    return nodes_to_collapse


def create_node_id_mapping(graph, nodes_to_collapse):
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
    return node_id_mapping


def identify_edges_to_update(graph, new_graph, i_node, l_node, edges_to_add, node_id_mapping):
    for edge in graph.out_edges(i_node):
        s, t = edge
        if graph.nodes[t]["type"] != "YA":
            edges_to_add.append((l_node, t))
            for e in graph.out_edges(t):
                source, target = e
                if graph.nodes[target]["type"] == "L":
                    logging.error("Forbidden edge in graph")
                else:
                    if target not in node_id_mapping:
                        logging.error("Accessing not mapped node")
                    else:
                        edges_to_add.append((t, node_id_mapping[target]))
        elif graph.nodes[s]["type"] == "L":
            for e in graph.out_edges(t):
                source, target = e
                new_graph.nodes[l_node]["quote"] = graph.nodes[target]["text"]
                if graph.nodes[target]["type"] == "I":
                    for en in graph.out_edges(target):
                        so, ta = en
                        edges_to_add.append((l_node, ta))
                        for end in graph.out_edges(ta):
                            sou, tar = end
                            if tar not in node_id_mapping:
                                logging.error("Accessing not mapped secondary node")
                                print("nooooooooooooooooooooooo")
                            else:
                                edges_to_add.append((ta, node_id_mapping[tar]))
        else:
            logging.error("Double connected Assertion")


def populate_graph(edges_to_add, nodes_to_remove, new_graph, graph):
    nodes_to_remove_set = set(nodes_to_remove)
    for node in graph.nodes():
        if node not in nodes_to_remove_set and graph.nodes[node]["type"] not in ["I", "L"]:
            new_graph.add_node(node, **graph.nodes[node])
    for edge in edges_to_add:
        s, t = edge
        new_graph.add_edge(s, t)
    for edge in graph.edges():
        source, target = edge
        if source in new_graph.nodes and target in new_graph.nodes:
            edge_attributes = {str(key): value for key, value in graph[source][target].items()}
            new_graph.add_edge(source, target, **edge_attributes)


def find_l_nodes_to_update(graph):
    l_nodes_to_update = set()
    for node, attributes in graph.nodes(data=True):
        if attributes["type"] == "L":
            neighbors = set(graph.neighbors(node))
            additional_info_neighbors = {n for n in neighbors if graph.nodes[n]["type"] in {"TA", "CA", "MA", "RA"}}
            l_neighbors = {n for additional_info_node in additional_info_neighbors for n in
                           graph.neighbors(additional_info_node)}
            if l_neighbors:
                l_nodes_to_update.add(node)
    return l_nodes_to_update


def update_l_to_l_edges(graph, l_nodes_to_update):
    edges_to_remove = []
    nodes_to_remove = []

    for l_node in l_nodes_to_update:
        neighbors = set(graph.neighbors(l_node))
        additional_info_neighbors = {n for n in neighbors if graph.nodes[n]["type"] in {"TA", "CA", "MA", "RA"}}

        # About 1-3 in the average case
        for additional_info_node in additional_info_neighbors:
            # A Transition or Default Inference, etc. can have multiple sources and possibly even multiple targets
            l_neighbors = {n for n in graph.neighbors(additional_info_node) if graph.nodes[n]["type"] == "L"}
            # check if there is a connection like 'Arguing'. This also indicates that the nodes type is CA, MA or RA
            ya_neighbors = {n for n in graph.predecessors(additional_info_node) if graph.nodes[n]["type"] == "YA"}
            # 1-2 in most cases
            for l_neighbor in l_neighbors:
                if ya_neighbors:
                    ya_neighbor = ya_neighbors.pop()
                    conn_type = graph.nodes[ya_neighbor]["text"]
                    graph.add_edge(l_node, l_neighbor, text_additional=graph.nodes[additional_info_node]["text"],
                                   connType=conn_type)
                    edges_to_remove.append((ya_neighbor, additional_info_node))
                    nodes_to_remove.append(ya_neighbor)
                else:
                    graph.add_edge(l_node, l_neighbor, text_additional=graph.nodes[additional_info_node]["text"])

                edges_to_remove.append((additional_info_node, l_neighbor))
                nodes_to_remove.append(additional_info_node)

    return edges_to_remove, nodes_to_remove
