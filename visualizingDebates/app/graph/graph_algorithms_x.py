import datetime
import os
import re

import networkx as nx

from ..logger import logging
transcript_path = os.getenv("TRANSCRIPT_PATH")


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
                found = [False] * len(data)
                transcript[current_line].append([time_stamp, current_speaker, data, found])
    #for t in transcript:
    #    print(t)
    #    for it in transcript[t]:
    #        print(it)
    return transcript
def order_graph_x(graph_data):
    transcript = extract_transcript()
    graph_data = nx.node_link_data(graph_data)
    graph_data["nodes"] = sorted(graph_data["nodes"], key=lambda x: (x["part"], x["part_index"], x["statement_index"]))
    part = 1
    part_index = 0
    statement_index = 0
    for node in graph_data["nodes"]:
        if node["part"] == part and node["part_index"] == part_index:
            #TODO test if multiplte statements use this text
            if node["statement_index"] >= statement_index:
                while statement_index <= node["statement_index"]:
                    node["transcript_text"] += transcript[node["part"]["part_index"][2]["statement_index"]]
                    statement_index += 1
        else:
            statement_index = 0
        part = node["part"]
        part_index = node["part_index"]


        #print(f"Part: {node["part"]}, Part_Index: {node["part_index"]}, Statement: {node["statement_index"]}, Time: {node["part_time"]}")
        #print(node["text"])


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
