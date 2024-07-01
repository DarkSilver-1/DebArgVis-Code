import json
import os
import re
from datetime import datetime

import networkx as nx
from dotenv import load_dotenv

from ..logger import logging

newTopicQuestionTimes = ["2020-05-21 22:52:01", "2020-05-21 23:08:18", "2020-05-21 23:31:20", "2020-05-21 23:43:08"]

load_dotenv()
datetime_format = os.getenv("DATETIME_FORMAT")
date_format = os.getenv("DATE_FORMAT")
filtering_date = os.getenv("FILTER_DATE")
transcript_path = os.getenv("TRANSCRIPT_PATH")


def build_graph_x():
    graph = nx.MultiDiGraph()
    json_folder_path = os.getenv("FOLDER_PATH")
    speaker_file_path = os.getenv("SPEAKER_FILE_PATH")
    personIDMapping = extract_speaker_file(speaker_file_path)
    transcript = extract_transcript()
    imc_file_path = os.getenv("imc_file_path")
    found_files = []
    for filename in os.listdir(json_folder_path):
        if filename.endswith('.json'):
            json_file_path = os.path.join(json_folder_path, filename)
            if os.path.getsize(json_file_path) != 0 and os.path.getsize(json_file_path) != 68 and os.path.getsize(
                    json_file_path) != 69:
                extract_file(graph, json_file_path, transcript, found_files, personIDMapping)

    build_graph_new()
    transform_data(graph)

    extract_imc(graph, imc_file_path)
    logging.info("Extracted the files")
    remove_isolated(graph)
    logging.info("Removed isolated nodes")
    graph = collapse_graph(graph)
    logging.info("Collapsed the corresponding I and L nodes")
    new_graph = graph #filter_nodes_with_locution(graph)
    logging.info("Mapped back to transcript")
    complete_transcript_mapping(new_graph, transcript)
    #complete_transcript_mapping2(new_graph, transcript)
    logging.info("Filtered nodes")
    delete_unmapped_nodes(new_graph)
    return new_graph

def build_graph_new():
    graph2 = nx.MultiDiGraph()
    json_folder_path = os.getenv("FOLDER_PATH")
    imc_file_path = os.getenv("imc_file_path")
    for filename in os.listdir(json_folder_path):
        if filename.endswith('.json'):
            json_file_path = os.path.join(json_folder_path, filename)
            if os.path.getsize(json_file_path) != 0 and os.path.getsize(json_file_path) != 68 and os.path.getsize(
                    json_file_path) != 69:
                extract_file_simple(graph2, json_file_path)
    extract_imc_file(graph2, imc_file_path)
    remove_unnecessary_nodes(graph2)
    graph2 = collapse_graph_new(graph2)
    print(graph2)
    return graph2

def transform_data(graph):
    #find_chronological_order()
    #distribute_transcript()
    #compute_timestamps
    pass



def extract_file_simple(graph, json_file_path):
    with open(json_file_path, "r") as json_file:
        file_data = json.load(json_file)
        for node in file_data["nodes"]:
            node_id = node["nodeID"]
            node_type = node["type"]
            text = node["text"]
            if node_type != "TA" and text != "Analysing":
                graph.add_node(node_id, text=text, type=node_type)
        for edge in file_data["edges"]:
            graph.add_edge(edge["fromID"], edge["toID"])

def extract_imc_file(graph, imc_file_path):
    with open(imc_file_path, "r") as imc_file:
        file_data = json.load(imc_file)
        for node in file_data["nodes"]:
            node_id = node["nodeID"]
            node_type = node["type"]
            text = node["text"]
            if node_type != "L" and node_type != "I" and node_type != "TA" and text != "Analysing":
                graph.add_node(node_id, text=text, type=node_type)
    for edge in file_data["edges"]:
        graph.add_edge(edge["fromID"], edge["toID"])


def remove_unnecessary_nodes(graph):
    nodes_to_remove = []
    for node, data in graph.nodes(data=True):
        if graph.degree(node) == 0 or "type" not in data:
            nodes_to_remove.append(node)
    for node in nodes_to_remove:
        graph.remove_node(node)


def create_locution_proposition_mapping(graph):
    node_id_mapping = {}
    locutions = [n for n in graph.nodes if graph.nodes[n]["type"] == "L"] #and not set(graph.predecessors(n))] #only use l nodes without predecessor (i.e. actual locutions instead of quoted ones)
    for locution in locutions:
        predecessor = set(graph.predecessors(locution))
        if predecessor and graph.nodes[predecessor.pop()]["text"] == "Asserting":
            continue
        successors = set(graph.successors(locution))
        for successor in successors:
            target_node = set(graph.successors(successor)).pop()
            node_type = graph.nodes[target_node]["type"]
            if node_type == "I":
                node_id_mapping[target_node] = locution
            elif node_type == "L":
                quote_successor = set(graph.successors(target_node)).pop()
                quote_target_node = set(graph.successors(quote_successor)).pop()
                node_type = graph.nodes[quote_target_node]["type"]
                if node_type == "I":
                    node_id_mapping[quote_target_node] = locution
    return node_id_mapping


def collapse_graph_new(graph):
    collapsed_graph = nx.MultiDiGraph()
    node_id_mapping = create_locution_proposition_mapping(graph)
    edges_to_add = []

    for i_node in node_id_mapping:
        collapsed_graph.add_node(node_id_mapping[i_node], **graph.nodes[node_id_mapping[i_node]])
        for edge in graph.out_edges(i_node):
            source, target = edge
            ya_neighbors = {n for n in graph.predecessors(target) if graph.nodes[n]["type"] == "YA"}
            conn_type = ""
            if ya_neighbors:
                conn_type = graph.nodes[ya_neighbors.pop()]["text"]
            for e in graph.out_edges(target):
                s, t = e
                if graph.nodes[t]["type"] == "L":
                    logging.error("Forbidden edge in graph")
                else:
                    if t not in node_id_mapping:
                        logging.error("Accessing not mapped node")
                    else:
                        edges_to_add.append(
                            (node_id_mapping[i_node], node_id_mapping[t], graph.nodes[s]["text"], conn_type))
    populate_graph(edges_to_add, collapsed_graph)
    return collapsed_graph

def delete_unmapped_nodes(new_graph):
    nodes_to_delete = []
    for node, data in new_graph.nodes(data=True):
        if data["transcript_text"] == "":
            nodes_to_delete.append(node)
    for node in nodes_to_delete:
        new_graph.remove_node(node)


def extract_imc(graph, imc_file_path):
    with open(imc_file_path, "r") as imc_file:
        file_data = json.load(imc_file)
        for node in file_data["nodes"]:
            node_id = node["nodeID"]
            node_type = node["type"]
            text = node["text"]
            if node_type != "L" and node_type != "I":
                graph.add_node(node_id, text=text, type=node_type)
    for edge in file_data["edges"]:
        graph.add_edge(edge["fromID"], edge["toID"])


def complete_transcript_mapping(graph, transcript):
    graph_data = nx.node_link_data(graph)
    graph_data["nodes"] = sorted(graph_data["nodes"], key=lambda x: (x["part"], x["part_index"], x["statement_index"]))
    part = 1
    part_index = 0
    statement_index = 0
    count = 0
    for node in graph_data["nodes"]:
        if node["part"] != part or node["part_index"] != part_index:
            part = node["part"]
            part_index = node["part_index"]
            statement_index = 0
        if node["part"] == part and node["part_index"] == part_index:
            statement_number = len(transcript[part][part_index][3][node["statement_index"]])
            last_statement = ""
            if statement_number > 1:
                c = 0
                for statement in transcript[part][part_index][3][node["statement_index"]]:
                    if statement[0] == node["text"].lower():
                        if c == 0:
                            start = 0
                        else:
                            start = transcript[part][part_index][3][node["statement_index"]][c - 1][2]
                        last_statement = transcript[part][part_index][2][node["statement_index"]][start:statement[2]]
                    c += 1
            else:
                last_statement = transcript[part][part_index][2][node["statement_index"]]
            while statement_index < node["statement_index"]:
                if "transcript_text" in graph.nodes[node["id"]]:
                    graph.nodes[node["id"]]["transcript_text"] += transcript[part][part_index][2][statement_index]
                else:
                    graph.nodes[node["id"]]["transcript_text"] = transcript[part][part_index][2][statement_index]
                statement_index += 1
                count += 1

            if statement_index == node["statement_index"]:
                if "transcript_text" in graph.nodes[node["id"]]:
                    graph.nodes[node["id"]]["transcript_text"] += last_statement
                else:
                    graph.nodes[node["id"]]["transcript_text"] = last_statement
                count += 1

            if count == 0:
                if not graph.has_node(node["id"]):
                    graph.add_node(node["id"])
                graph.nodes[node["id"]]["transcript_text"] = ""
                logging.error("Unmapped Statement: " + last_statement)

            if count >= statement_number:
                statement_index += 1
                count = 0

def complete_transcript_mapping2(graph, transcript):
    graph_data = nx.node_link_data(graph)
    graph_data["nodes"] = sorted(graph_data["nodes"], key=lambda x: (x["part"], x["part_index"], x["statement_index"]))
    result = []
    part = 1
    part_index = 0
    statement_index = 0
    count = 0
    previous_node = None
    for node in graph_data["nodes"]:
        current_text = ""
        if node["part"] != part or node["part_index"] != part_index:
            if previous_node and previous_node["statement_index"] < len(transcript[part][part_index][2]) - 1:
                while statement_index <= len(transcript[part][part_index][2]) - 1:
                    graph.nodes[previous_node["id"]]["transcript_text"] += transcript[part][part_index][2][statement_index]
                    statement_index += 1
                #print(graph.nodes[previous_node["id"]]["transcript_text"])
            part = node["part"]
            part_index = node["part_index"]
            statement_index = 0
        if node["part"] == part and node["part_index"] == part_index:
            statement_number = len(transcript[part][part_index][3][node["statement_index"]])
            last_statement = ""
            if statement_number > 1:
                c = 0
                for statement in transcript[part][part_index][3][node["statement_index"]]:
                    if statement[0] == node["text"].lower():
                        if c == 0:
                            start = 0
                        else:
                            start = transcript[part][part_index][3][node["statement_index"]][c - 1][2]
                        last_statement = transcript[part][part_index][2][node["statement_index"]][start:statement[2]]
                    c += 1
            else:
                last_statement = transcript[part][part_index][2][node["statement_index"]]
            while statement_index < node["statement_index"]:
                current_text += transcript[part][part_index][2][statement_index]
                statement_index += 1
                count += 1

            if statement_index == node["statement_index"]:
                current_text += last_statement
                count += 1

            if count == 0:
                if not graph.has_node(node["id"]):
                    graph.add_node(node["id"])
                current_text = ""
                #print("Unmapped Statement: " + last_statement)

            previous_node = node
            if count >= statement_number:
                statement_index += 1
                count = 0
            result.append(current_text)
    for r in graph_data["nodes"]:
        print(r["transcript_text"])


def extract_transcript():
    transcript = {
        1: []
    }
    new_part_pattern = re.compile(r'^Part \d+$')
    text_pattern = re.compile(r"\[([\d:]+)\]\s*(.*)")
    speaker_pattern = re.compile(r"^[a-zA-Z]+ [a-zA-Z0-9-]+$")
    current_line = 1
    current_speaker = ""
    with open(transcript_path, 'r') as file:
        for line in file:
            if new_part_pattern.match(line):
                current_line = int(line.strip().split()[1])
                transcript[current_line] = []
            elif speaker_pattern.match(line):
                current_speaker = line.strip()
            elif text_pattern.match(line):
                match = text_pattern.match(line)
                time_stamp = match.group(1)
                data = re.findall(r'[^.!?]+[.!?]?', match.group(2))
                found = [[]] * len(data)
                transcript[current_line].append([time_stamp, current_speaker, data, found])
    return transcript


def find_transcript_part(transcript, adapted_text, found_files):
    for transcript_part in transcript:
        if transcript_part not in found_files:
            for line in transcript[transcript_part]:
                for sentence in line[2]:
                    if adapted_text in sentence.lower():
                        found_files.append(transcript_part)
                        return transcript_part
    return 0


def extract_file(graph, json_file_path, transcript, found_files, personIDMapping):
    with open(json_file_path, 'r') as json_file:
        graph_data = json.load(json_file)
        part = 0
        for node in graph_data["nodes"]:
            node_id = node["nodeID"]
            text = node["text"]
            node_type = node["type"]

            matching_locution = next(
                (locution for locution in graph_data["locutions"] if locution["nodeID"] == node_id), None)
            if matching_locution:
                if ":" in text:
                    adapted_text = text.split(":", 1)[1].strip()
                else:
                    continue
                if len(adapted_text) > 5:  # yes and no should directly match
                    adapted_text = adapted_text.lower()
                if part == 0:
                    part = find_transcript_part(transcript, adapted_text, found_files)
                part_index = 0
                statement_index = 0
                index = 0
                found = False
                for line in transcript[part]:
                    inner_index = 0
                    for sentence in line[2]:
                        compare_text = sentence
                        if len(adapted_text) > 5:
                            compare_text = sentence.lower()
                        if adapted_text in compare_text:
                            first_char_index = compare_text.find(adapted_text)
                            last_char_index = first_char_index + len(adapted_text)
                            if len(line[3][inner_index]) == 0:
                                line[3][inner_index] = [(adapted_text, first_char_index, last_char_index)]
                                part_index = index
                                statement_index = inner_index
                                found = True
                                break
                            else:
                                distinct = True
                                for match in line[3][inner_index]:
                                    if match[2] > first_char_index and match[1] < last_char_index:
                                        distinct = False
                                if distinct:
                                    line[3][inner_index].append((adapted_text, first_char_index, last_char_index))
                                    line[3][inner_index] = sorted(line[3][inner_index], key=lambda x: match[1])
                                    count = 0
                                    for match in line[3][inner_index]:
                                        match = (match[0], match[1], match[2], count)
                                        count += 1
                                    part_index = index
                                    statement_index = inner_index
                                    found = True
                                    break
                        inner_index += 1
                    index += 1
                if found:
                    add_node_with_locution(graph, node_id, adapted_text, node_type, matching_locution,
                                           part, part_index, statement_index, transcript, personIDMapping)
                else:
                    logging.error("Statement could not be found in the transcript: " + adapted_text)
            else:
                graph.add_node(node_id, text=text, type=node_type, file=json_file_path)
        for edge in graph_data["edges"]:
            graph.add_edge(edge["fromID"], edge["toID"])


def add_node_with_locution(graph, node_id, text, node_type, locution, transcript_part, part_index,
                           statement_index, transcript, personIDMapping):
    speaker = locution.get("personID")
    if speaker not in personIDMapping:
        speaker = "Public"
    graph.add_node(node_id, text=text, type=node_type, speaker=personIDMapping[speaker],
                   part=transcript_part, part_index=part_index, statement_index=statement_index,
                   part_time=transcript[transcript_part][part_index][0])


def remove_isolated(graph):
    nodes_to_remove = [node for node, data in graph.nodes(data=True) if
                       "type" not in data or data["type"] == "L" and graph.degree(node) == 0]

    for n in graph.nodes:
        for p in graph.predecessors(n):
            for l in graph.predecessors(p):
                predecessor = graph.nodes(data=True)[l]
                if predecessor and predecessor["text"] == "Analysing":
                    for m in graph.predecessors(l):
                        if m not in nodes_to_remove:
                            nodes_to_remove.append(m)
                            nodes_to_remove.append(l)

    for node in nodes_to_remove:
        graph.remove_node(node)


def filter_nodes_with_locution(graph):
    subgraph = nx.MultiDiGraph()

    for node, data in graph.nodes(data=True):
        if "speaker" in data and data.get(
                "type") == "L":  # The first check is to check if there has even been a matching locution
            subgraph.add_node(node, **data)

    for from_node, to_node, data in graph.edges(data=True):
        if from_node in subgraph.nodes and to_node in subgraph:
            subgraph.add_edge(from_node, to_node, **data)
    return subgraph


def create_node_id_mapping(graph):
    node_id_mapping = {}
    i_nodes = [n for n in graph.nodes if graph.nodes[n]["type"] == "I"]
    for i_node in i_nodes:
        predecessors = set(graph.predecessors(i_node))
        ya_nodes = {n for n in predecessors if graph.nodes[n]["type"] == "YA"}
        while ya_nodes:
            ya_node = ya_nodes.pop()
            l_nodes = {n for n in graph.predecessors(ya_node) if graph.nodes[n]["type"] == "L"}
            if l_nodes:
                l_node = l_nodes.pop()
                predecessors = set(graph.predecessors(l_node))
                predecessor_ya_node = next((p for p in predecessors if
                                            graph.nodes[p]["type"] == "YA" and graph.nodes[p]["text"] == "Asserting"),
                                           None)
                if predecessor_ya_node:
                    predecessors = set(graph.predecessors(predecessor_ya_node))
                    predecessor_l_node = next((p for p in predecessors if graph.nodes[p]["type"] == "L"), None)
                    if predecessor_l_node:
                        node_id_mapping[i_node] = predecessor_l_node
                    else:
                        logging.error("Missing L node in quotation")
                else:
                    node_id_mapping[i_node] = l_node
            else:
                logging.error("Missing L node")
    return node_id_mapping


def collapse_graph(graph):
    new_graph = nx.MultiDiGraph()
    node_id_mapping = create_node_id_mapping(graph)
    edges_to_add = []

    for i_node in node_id_mapping:
        new_graph.add_node(node_id_mapping[i_node], **graph.nodes[node_id_mapping[i_node]])
        for edge in graph.out_edges(i_node):
            source, target = edge
            ya_neighbors = {n for n in graph.predecessors(target) if graph.nodes[n]["type"] == "YA"}
            conn_type = ""
            if ya_neighbors:
                conn_type = graph.nodes[ya_neighbors.pop()]["text"]
            for e in graph.out_edges(target):
                s, t = e
                if graph.nodes[t]["type"] == "L":
                    logging.error("Forbidden edge in graph")
                else:
                    if t not in node_id_mapping:
                        logging.error("Accessing not mapped node")
                    else:
                        edges_to_add.append(
                            (node_id_mapping[i_node], node_id_mapping[t], graph.nodes[s]["text"], conn_type))
    populate_graph(edges_to_add, new_graph)
    return new_graph


def populate_graph(edges_to_add, new_graph):
    for edge in edges_to_add:
        s, t, text, conn_type = edge
        new_graph.add_edge(s, t, text_additional=text, conn_type=conn_type)


def extract_speaker_file(speaker_file_path):
    personIDMapping = {}
    with open(speaker_file_path, 'r') as file:
        lines = file.readlines()
        for line in lines:
            parts = line.strip().split()
            person_id = parts[0]
            speaker = ' '.join(parts[1:])
            personIDMapping[person_id] = speaker
    return personIDMapping

