import datetime
import json
import os
import re
from datetime import datetime as dt

import networkx as nx
from dotenv import load_dotenv

from ..logger import logging


def extract_data():
    load_dotenv()
    return transform_data(build_graph())


def build_graph():
    graph = nx.MultiDiGraph()
    graph = extract_files(graph)
    graph = remove_unnecessary_nodes(graph)
    graph = collapse_graph_new(graph)
    return nx.node_link_data(graph)


def transform_data(graph_data):
    transcript = extract_transcript()
    graph_data = find_chronological_order(graph_data, transcript)
    graph_data = distribute_transcript(graph_data, transcript)
    graph_data = compute_timestamps(graph_data)
    return graph_data


def extract_files(graph):
    json_folder_path = os.getenv("FOLDER_PATH")
    imc_file_path = os.getenv("imc_file_path")
    file_part_mapping = create_file_part_mapping()
    for filename in os.listdir(json_folder_path):
        if filename.endswith('.json'):
            json_file_path = os.path.join(json_folder_path, filename)
            if os.path.getsize(json_file_path) != 0:
                extract_file(graph, json_file_path, file_part_mapping)
    extract_imc_file(graph, imc_file_path)
    return graph


def create_file_part_mapping():
    file_part_map_path = os.getenv("FILE_PART_MAP_PATH")
    file_part_mapping = {}
    with open(file_part_map_path, 'r') as file:
        lines = file.readlines()
        for line in lines:
            parts = line.strip().split()
            file = parts[0]
            part = int(parts[1])
            file_part_mapping[file] = part
    return file_part_mapping


def extract_file(graph, json_file_path, file_part_mapping):
    with open(json_file_path, "r") as json_file:
        file_data = json.load(json_file)
        for node in file_data["nodes"]:
            node_id = node["nodeID"]
            node_type = node["type"]
            text = node["text"]
            if node_type != "TA" and text != "Analysing":
                graph.add_node(node_id, text=text, type=node_type,
                               part=file_part_mapping[json_file_path], speaker=None)
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
    return graph


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
    for edge in edges_to_add:  # Add the new edges
        s, t, text, conn_type = edge
        collapsed_graph.add_edge(s, t, text_additional=text, conn_type=conn_type)
    return collapsed_graph


def create_locution_proposition_mapping(graph):
    node_id_mapping = {}
    locutions = [n for n in graph.nodes if graph.nodes[n][
        "type"] == "L"]
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


def extract_transcript():
    transcript = {1: []}
    transcript_path = os.getenv("TRANSCRIPT_PATH")
    new_part_pattern = re.compile(r'^Part \d+$')
    text_pattern = re.compile(r"\[([\d:]+)]\s*(.*)")
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


def find_chronological_order(graph_data, transcript):
    speakers = extract_speaker_file()
    nodes_to_delete = []
    for node in graph_data["nodes"]:
        node_text = node["text"]
        part = node["part"]
        adapted_text = node_text.split(":", 1)[1].strip()
        part_index, statement_index, start_index = find_transcript_position(adapted_text, part, transcript)

        if part_index != -1:
            part_data = transcript[part][part_index]
            node.update({
                "part_index": part_index,
                "statement_index": statement_index,
                "start_index": start_index,
                "part_time": part_data[0],
                "speaker": part_data[1] if part_data[1] in speakers else "Public"
            })
        else:
            nodes_to_delete.append(node)

    nodes_to_delete_ids = set(node["id"] for node in nodes_to_delete)
    graph_data["links"] = [link for link in graph_data["links"] if
                           link["source"] not in nodes_to_delete_ids and link["target"] not in nodes_to_delete_ids]
    for node in nodes_to_delete:
        graph_data["nodes"].remove(node)
    graph_data["nodes"] = sorted(graph_data["nodes"],
                                 key=lambda x: (x["part"], x["part_index"], x["statement_index"], x["start_index"]))
    return graph_data


def find_transcript_position(adapted_text, part, transcript):
    part_index = -1
    statement_index = 0
    index = 0
    start_index = 0
    for line in transcript[int(part)]:
        inner_index = 0
        for sentence in line[2]:
            compare_text = sentence
            if adapted_text in compare_text:
                first_char_index = compare_text.find(adapted_text)
                last_char_index = first_char_index + len(adapted_text)
                start_index = first_char_index
                if len(line[3][inner_index]) == 0:
                    line[3][inner_index] = [(adapted_text, first_char_index, last_char_index)]
                    part_index = index
                    statement_index = inner_index
                    break
                else:
                    distinct = True
                    for match in line[3][inner_index]:
                        if match[2] > first_char_index and match[1] < last_char_index:
                            distinct = False
                    if distinct:
                        line[3][inner_index].append((adapted_text, first_char_index, last_char_index))
                        line[3][inner_index] = sorted(line[3][inner_index], key=lambda x: x[1])
                        part_index = index
                        statement_index = inner_index
                        break
            inner_index += 1
        index += 1
    return part_index, statement_index, start_index


def distribute_transcript(graph_data, transcript):
    speakers = extract_speaker_file()
    nodes = graph_data["nodes"]
    node_index = 0
    new_nodes = []
    for part in transcript:
        for sub_part in transcript[part]:
            assigned_sentence = ""
            for index, sentence in enumerate(sub_part[2]):
                assigned = False
                current_sentence = sub_part[2][index]
                matches = sub_part[3][index]
                if matches:
                    for i, sentence_part in enumerate(matches):
                        current_node = nodes[node_index]
                        start = 0 if i == 0 else matches[i - 1][
                            2]  # Zero in the first iteration, the ending index of the previous match otherwise
                        end = sentence_part[2] if i < len(matches) - 1 else len(
                            current_sentence)  # The last match goes until the end of the sentence
                        assigned_sentence += current_sentence[start:end]
                        new_nodes.append({"id": current_node["id"], "speaker": current_node["speaker"],
                                          "part_time": current_node["part_time"], "text": assigned_sentence})
                        assigned_sentence = ""
                        node_index += 1
                    assigned = True
                else:
                    assigned_sentence += current_sentence
                if index == len(sub_part[2]) - 1 and assigned_sentence != "" and not assigned:
                    new_nodes.append({"speaker": sub_part[1] if sub_part[1] in speakers else "Public",
                                      "part_time": sub_part[0],
                                      "text": assigned_sentence,
                                      "id": 12})  # create new node at the end of section if text left
    graph_data["nodes"] = new_nodes
    return graph_data


def compute_timestamps(graph_data):
    time_parts = []
    datetime_pattern = "%H:%M:%S"
    prev_time = None
    time_stamp = None
    for node in graph_data["nodes"]:
        time_stamp = dt.strptime(node["part_time"], datetime_pattern)

        if prev_time != time_stamp and prev_time is not None:
            compute_group_time_stamps(time_parts, time_stamp)
            time_parts.clear()
        time_parts.append(node)
        prev_time = time_stamp

    compute_group_time_stamps(time_parts, time_stamp + datetime.timedelta(seconds=30))
    return graph_data


def compute_group_time_stamps(time_parts, next_time):
    time = dt.strptime(time_parts[0]["part_time"], "%H:%M:%S")
    timedelta = next_time - time
    mean_duration = timedelta.seconds / len(time_parts)
    start_time = 0
    for node in time_parts:
        node["part_time"] = time + datetime.timedelta(seconds=start_time)
        node["end_part_time"] = node["part_time"] + datetime.timedelta(seconds=mean_duration)
        start_time += mean_duration


def extract_speaker_file():
    speaker_file_path = os.getenv("SPEAKER_FILE_PATH_SIMPLE")
    speakers = []
    with open(speaker_file_path, 'r') as file:
        lines = file.readlines()
        for line in lines:
            speakers.append(line.strip())
    return speakers
