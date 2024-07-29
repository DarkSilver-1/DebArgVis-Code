import datetime
import json
import os
import re
from datetime import datetime as dt

import networkx as nx
from dotenv import load_dotenv

from ..logger import logging


#  Extracts the IAT json files into a graph, simplifies the graph, and adds data taken from the transcript
def extract_data():
    load_dotenv()
    return transform_data(build_graph())


#  Creates and simplifies the graph
def build_graph():
    graph = nx.MultiDiGraph()
    graph = extract_files(graph)
    logging.info("Extracted the files")
    graph = remove_unnecessary_nodes(graph)
    logging.info("Removed unnecessary nodes")
    graph = collapse_graph(graph)
    logging.info("Simplified the graph structure")
    return nx.node_link_data(graph)  # Returns the graph in node-link format which allows e.g. ordering.


#  Adds data to the former graph nodes. Takes the data in node-link format.
def transform_data(graph_data):
    transcript = extract_transcript()
    graph_data = find_chronological_order(graph_data, transcript)
    logging.info("Ordered the data chronologically")
    graph_data = distribute_transcript(graph_data, transcript)
    logging.info("Distributed the transcript")
    graph_data = compute_timestamps(graph_data)
    logging.info("Assigned unique timestamps")
    return graph_data


#  Iterates over all the json files and extracts them into one big graph. Additionally, annotates the nodes of each file
#  with the number of the part in the transcript respective to the file to increase efficiency in chronological ordering
#  afterward. Then  the IMC file is extracted, ensuring that it doesn't overwrite existing nodes.
def extract_files(graph):
    json_folder_path = os.getenv("FOLDER_PATH")
    imc_file_path = os.getenv("imc_file_path")
    file_part_mapping = create_file_part_mapping()

    for filename in os.listdir(json_folder_path):
        if filename.endswith('.json'):
            json_file_path = os.path.join(json_folder_path, filename)
            if os.path.getsize(json_file_path) != 0:
                extract_file(graph, json_file_path, file_part_mapping)
    extract_file(graph, imc_file_path, file_part_mapping)
    return graph


#  Extracts the file for the file-part-mapping
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


#  Extracts a single file by taking the valuable information, including the already existing node ID and creates a new
#  node in the graph, given the data is valuable for the visualization. Then adds the edges. This may produce new nodes
#  without data for the already deleted nodes but is easy to filter afterward. Nodes that are already in the graph are
#  not added (hence updated) again, as this only happens for the IMC file which cannot be associated with a part
#  number
def extract_file(graph, json_file_path, file_part_mapping):
    with open(json_file_path, "r") as json_file:
        file_data = json.load(json_file)
        for node in file_data["nodes"]:
            node_id = node["nodeID"]
            node_type = node["type"]
            text = node["text"]
            if node_type != "TA" and text != "Analysing" and node_id not in graph.nodes:
                graph.add_node(node_id, text=text, type=node_type,
                               part=file_part_mapping[json_file_path], speaker=None)
        for edge in file_data["edges"]:
            graph.add_edge(edge["fromID"], edge["toID"])


#  Deletes all the nodes that are either isolated or cannot be used.
def remove_unnecessary_nodes(graph):
    nodes_to_remove = []
    for node, data in graph.nodes(data=True):
        if graph.degree(node) == 0 or "type" not in data:
            nodes_to_remove.append(node)
    for node in nodes_to_remove:
        graph.remove_node(node)
    return graph


#  Simplifies the graph by merging corresponding "I" and "L" type nodes and replacing the connections between "I" nodes
#  that have a node in between (for Inference, Rephrase or Conflict) with direct connections where the link carries
#  additional data. Also, the data is taken that describes the connection more detailed (like "Arguing") as this might
#  be used in the future.
def collapse_graph(graph):
    collapsed_graph = nx.MultiDiGraph()
    node_id_mapping = create_locution_proposition_mapping(graph)
    edges_to_add = []

    for i_node in node_id_mapping:  # start at an "I" type node and create a new node with the id and all the data of
        # the corresponding "L" node
        collapsed_graph.add_node(node_id_mapping[i_node], **graph.nodes[node_id_mapping[i_node]])
        for edge in graph.out_edges(i_node):
            source, target = edge
            ya_neighbors = {n for n in graph.predecessors(target) if graph.nodes[n]["type"] == "YA"}
            conn_type = ""  # The more detailed information about the connection
            if ya_neighbors:
                conn_type = graph.nodes[ya_neighbors.pop()]["text"]
            else:
                logging.error("Missing detailed connection information")
            for e in graph.out_edges(target):
                s, t = e
                if graph.nodes[t]["type"] == "L":  # Implies a backward edge from an "I" to an "L" node
                    logging.error("Forbidden edge in graph " + graph.nodes[t]["text"])
                else:
                    if t not in node_id_mapping:
                        logging.error("Accessing not mapped node: " + graph.nodes[t]["text"])
                    else:
                        edges_to_add.append(
                            (node_id_mapping[i_node], node_id_mapping[t], graph.nodes[s]["text"], conn_type))
    for edge in edges_to_add:  # Add the new edges to the new graph
        s, t, text, conn_type = edge
        collapsed_graph.add_edge(s, t, text_additional=text, conn_type=conn_type)
    return collapsed_graph


#  Maps "L" type nodes with their corresponding "I" type nodes, taking the "I" type node ID as key. Searches along the
#  connections, starting at the "L" type nodes. If the "L" type node has a predecessor, it is implied that this node is
#  the "middle part" (L->*L*->I) of a quotation and therefore not a valid value for the mapping. Thus, those nodes are
#  being skipped
def create_locution_proposition_mapping(graph):
    node_id_mapping = {}
    locutions = [n for n in graph.nodes if graph.nodes[n][
        "type"] == "L"]  # filter all the "L" type nodes
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
            elif node_type == "L":  # The locution node is the beginning part of a quotation
                quote_successor = set(graph.successors(target_node)).pop()
                quote_target_node = set(graph.successors(quote_successor)).pop()
                node_type = graph.nodes[quote_target_node]["type"]
                if node_type == "I":
                    node_id_mapping[quote_target_node] = locution
                else:
                    logging.error("Illegal connection: " + graph.nodes[quote_target_node]["text"])
    return node_id_mapping


#  Creates a code representation of the transcript by matching patterns. The transcript is split into parts and further
#  into documents(/sub-parts). Each subpart contains the name of the speaker, a timestamp and a list of sentences as
#  well as a list of empty lists that will be used for the mapping for the chronological ordering.
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
                data = re.findall(r'[^.!?]+[.!?]?', match.group(2))  # Splits the document into sentences
                found = [[]] * len(data)
                transcript[current_line].append([time_stamp, current_speaker, data, found])
    return transcript


#  Iterates over the nodes as list and searches for a matching string in the transcript. It is only searched in the
#  transcript part respective to the file the node('s data) originates from. After the position (identified by part
#  number, subpart number, sentence number and the starting index within the sentence) is found, the node is updated
#  with this information, including the time and speaker of the subpart. If a node('s text) could not be found within
#  the transcript it is deleted as well as all of its edges.
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
            logging.error("Could not find in transcript: " + adapted_text)

    nodes_to_delete_ids = set(node["id"] for node in nodes_to_delete)
    graph_data["links"] = [link for link in graph_data["links"] if
                           link["source"] not in nodes_to_delete_ids and link["target"] not in nodes_to_delete_ids]
    for node in nodes_to_delete:
        graph_data["nodes"].remove(node)
    graph_data["nodes"] = sorted(graph_data["nodes"],
                                 key=lambda x: (x["part"], x["part_index"], x["statement_index"], x["start_index"]))
    return graph_data


#  Iterates over the sub-parts and their sentences in the transcript at the given part. Once it matches, there are
#  several cases. If it is the first to match, it is matched and added at that position to the code representation of
#  the transcript and its position is returned, otherwise it is checked if it matches disjoint, before it is added. If
#  it doesn't, it continues being compared. Matches are saved including the indices of the first and last matching char
#  within the sentence for fast disjoint check and to allow sorting.
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
                    line[3][inner_index] = [(adapted_text, first_char_index, last_char_index)]  # Add new match
                    part_index = index
                    statement_index = inner_index
                    break
                else:
                    disjoint = True
                    for match in line[3][inner_index]:  # Check if disjoint to every other match for this sentence
                        if match[2] > first_char_index and match[1] < last_char_index:
                            disjoint = False
                    if disjoint:
                        line[3][inner_index].append((adapted_text, first_char_index, last_char_index))
                        line[3][inner_index] = sorted(line[3][inner_index], key=lambda x: x[1])  # re-sort the list of
                        # matches
                        part_index = index
                        statement_index = inner_index
                        break
            inner_index += 1
        index += 1
    return part_index, statement_index, start_index


#  Distributes the whole transcript over the existing nodes. Iterates over the code representation of the transcript (in
#  which the nodes should already be matched to the sentences) and if there is no matching node to a sentence it is
#  concatenated to every not assigned string before and the next iteration starts. Once there is a locution for a
#  sentence, the node is assigned the previous text as well as the text at its position. If there are several nodes for
#  one sentence, the amount of assigned text is from the max of the sentence beginning and the end of the previous node
#  text to the min of the end of the previous node text and the end of sentence.
#  If at the end of a subpart there is no more matching node but not assigned text, a new node is created representing
#  that text.
def distribute_transcript(graph_data, transcript):
    speakers = extract_speaker_file()
    nodes = graph_data["nodes"]
    node_index = 0
    new_nodes = []
    id_count = 0
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
                                      "part_time": sub_part[0],  # create new node at the end of section if text left
                                      "text": assigned_sentence,
                                      "id": "0000" + str(id_count)})  # unique as normal ids never start with a 0
                    id_count += 1
    graph_data["nodes"] = new_nodes
    return graph_data


#  Iterates over the nodes as a list and finds nodes that share their subpart time (and hence their subpart). After all
#  nodes of a subpart are identified, they are assigned unique timestamps depending on their own timestamp, the next
#  timestamp, and the number of nodes.
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


#  Takes a group of nodes and assigns unique timestamps depending on their own timestamp, the next
#  timestamp, and the number of nodes.
def compute_group_time_stamps(time_parts, next_time):
    time = dt.strptime(time_parts[0]["part_time"], "%H:%M:%S")
    timedelta = next_time - time
    mean_duration = timedelta.seconds / len(time_parts)
    start_time = 0
    for node in time_parts:
        node["part_time"] = time + datetime.timedelta(seconds=start_time)
        node["end_part_time"] = node["part_time"] + datetime.timedelta(seconds=mean_duration)
        start_time += mean_duration


#  Extracts the speaker file into a list of speaker
def extract_speaker_file():
    speaker_file_path = os.getenv("SPEAKER_FILE_PATH_SIMPLE")
    speakers = []
    with open(speaker_file_path, 'r') as file:
        lines = file.readlines()
        for line in lines:
            speakers.append(line.strip())
    return speakers
