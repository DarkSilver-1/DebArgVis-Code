import json
import os
from datetime import datetime
import matplotlib.pyplot as plt


# Specify the path to your JSON file on Google Drive
# json_folder_path = 'C:/Users/grube/OneDrive - gw.uni-passau.de/Studium/7. Semester/Bachelorarbeit/Data/qt30'

option = 7
givenDate = datetime.strptime("2020-05-28 19:08:43", '%Y-%m-%d %H:%M:%S').date()
speakers = ["3831", "3881", "3812", "3880", "3912"]

speaker_timelines = {}
date_speaker_data = {}
topic_data = {}
texts_with_rephrase = []
texts_with_inference = []

match option:

    # Sort the data by speaker. Every speaker is associated with the things they said and the corresponding timestamp.
    case 1:
        processed_node_ids = set()
        speaker_timelines["0"] = []
        json_file_path = 'C:/Users/Martin Gruber/OneDrive - gw.uni-passau.de/Studium/7. Semester/Bachelorarbeit/Data/qt30/nodeset17929.json'

        date = givenDate  # This type of sorting only makes sense for a specific day
        # for filename in os.listdir(json_folder_path):
        #    if filename.endswith('.json'):
        #        json_file_path = os.path.join(json_folder_path, filename)
        #       if (os.path.getsize(json_file_path) != 0 and os.path.getsize(
        #                json_file_path) != 68):  # The fcked files all seem to have a size of 68 Bytes
        with open(json_file_path, 'r') as json_file:
            data = json.load(json_file)
            locutions = data.get("locutions")
            texts = data.get("nodes")

            # Iterate through the 'locutions' data
            for locution in locutions:
                person_id = locution.get("personID")
                globalConnectionID = locution.get("nodeID")
                text = None

                # Find the corresponding text from 'texts' data based on 'nodeID'
                for text_item in texts:
                    if text_item.get("nodeID") == globalConnectionID and text_item.get(
                            "type") == "L" and locution.get("start") is not None:
                        text = text_item.get("text")
                        break

                if person_id and text:
                    if person_id not in speaker_timelines:
                        # if person_id in speakers:
                        speaker_timelines[person_id] = []

                    # Check if the node ID has been processed before
                    if globalConnectionID not in processed_node_ids and locution.get("start") is not None:
                        # if person_id in speakers:
                        speaker_timelines[person_id].append(
                            (datetime.strptime(locution.get("start"), '%Y-%m-%d %H:%M:%S'), text))
                        processed_node_ids.add(globalConnectionID)  # Mark the node ID as processed
                    # else:
                    # speaker_timelines["0"].append(
                    #    (datetime.strptime(locution.get("start"), '%Y-%m-%d %H:%M:%S'), text))
                    # processed_node_ids.add(node_id)  # Mark the node ID as processed

    case 2:
        for filename in os.listdir(json_folder_path):
            if filename.endswith('.json'):
                json_file_path = os.path.join(json_folder_path, filename)
                if (os.path.getsize(json_file_path) != 0 and os.path.getsize(
                        json_file_path) != 68):  # The fcked files all seem to have a size of 68 Bytes
                    with open(json_file_path, 'r') as json_file:
                        data = json.load(json_file)
                        locutions = data.get("locutions")
                        texts = data.get("nodes")

                        for node in texts:
                            if node.get("type") == "L":
                                starttime = None
                                globalConnectionID = node.get("nodeID")
                                text = node.get("text")
                                speaker = None

                                for locution in locutions:
                                    if locution.get("nodeID") == globalConnectionID:
                                        if locution.get("start") is not None:
                                            starttime = datetime.strptime(locution.get("start"), '%Y-%m-%d %H:%M:%S')
                                            date = starttime.date()
                                        else:
                                            starttime = datetime.today()
                                            date = datetime.today().date()
                                        speaker = locution.get("personID")
                                        if speaker not in speakers:
                                            speaker = "0"
                                        break

                                if speaker is not None:
                                    if date not in date_speaker_data:
                                        date_speaker_data[date] = []
                                    date_speaker_data[date].append((starttime, speaker, text))
        for date in date_speaker_data:
            date_speaker_data[date] = sorted(date_speaker_data[date], key=lambda x: x[0])

    case 3:
        date = givenDate  # This type of sorting only makes sense for a specific day
        for filename in os.listdir(json_folder_path):
            if filename.endswith('.json'):
                json_file_path = os.path.join(json_folder_path, filename)
                if (os.path.getsize(json_file_path) != 0 and os.path.getsize(
                        json_file_path) != 68):  # The fcked files all seem to have a size of 68 Bytes
                    with open(json_file_path, 'r') as json_file:
                        data = json.load(json_file)
                        locutions = data.get("locutions")
                        texts = data.get("nodes")

                        for node in texts:
                            if node.get("type") == "L":
                                if datetime.strptime(node.get("timestamp"), '%Y-%m-%d %H:%M:%S').date() == date:
                                    globalConnectionID = node.get("nodeID")
                                    text = node.get("text")
                                    timestamp = datetime.strptime(node.get("timestamp"), '%Y-%m-%d %H:%M:%S')
                                    topic = node.get("topic")
                                    speaker = None

                                    for locution in locutions:
                                        if locution.get("nodeID") == globalConnectionID:
                                            speaker = locution.get("personID")
                                            break

                                    if speaker is not None:
                                        if topic not in topic_data:
                                            topic_data[topic] = []
                                        topic_data[topic].append((timestamp, speaker, text))
        for date in topic_data:
            topic_data[date] = sorted(topic_data[topic], key=lambda x: x[0])
        print(topic_data)

    case 4:
        # json_file_path = 'C:/Users/Martin Gruber/OneDrive - gw.uni-passau.de/Studium/7. Semester/Bachelorarbeit/Data/qt30/nodeset17921.json'
        processed_node_ids = set()
        for filename in os.listdir(json_folder_path):
            if filename.endswith('.json'):
                json_file_path = os.path.join(json_folder_path, filename)
                if (os.path.getsize(json_file_path) != 0 and os.path.getsize(
                        json_file_path) != 68):
                    with (open(json_file_path, 'r') as json_file):
                        data = json.load(json_file)
                        locutions = data.get("locutions")
                        texts = data.get("nodes")
                        edges = data.get("edges")

                        for locution in locutions:
                            person_id = locution.get("personID")
                            globalConnectionID = locution.get("nodeID")
                            if locution.get("start") is None:
                                start_time = datetime.today()
                            else:
                                start_time = datetime.strptime(locution.get("start"), '%Y-%m-%d %H:%M:%S')
                            text = None
                            paraphrased = None
                            paraphrasedID = []

                            assertingNodeID = None
                            for node in texts:
                                if node.get("nodeID") == globalConnectionID:
                                    if node.get("type") == "L":
                                        text = node.get("text")
                                        break

                            for edge in edges:
                                if edge.get("fromID") == globalConnectionID:
                                    for node in texts:
                                        if node.get("nodeID") == edge.get("toID") and node.get(
                                                "type") == "YA" and node.get("text") in ["Asserting",
                                                                                         "Rhetorical Questioning"]:
                                            assertingNodeID = edge.get("toID")
                                            break

                            for node in texts:
                                # if node.get("type") == "I":
                                for edge in edges:
                                    if edge.get("fromID") == assertingNodeID and edge.get("toID") == node.get(
                                            "nodeID"):
                                        paraphrased = node.get("text")
                                        paraphrasedID.append(node.get("nodeID"))
                                        break
                            if person_id and text:
                                if start_time not in speaker_timelines:
                                    speaker_timelines[start_time] = []

                            if globalConnectionID not in processed_node_ids:
                                speaker_timelines[start_time].append(
                                    (start_time, text, paraphrased, paraphrasedID))
                                processed_node_ids.add(globalConnectionID)

    case 5:
        processed_node_ids = set()
        json_file_path = 'C:/Users/Martin Gruber/OneDrive - gw.uni-passau.de/Studium/7. Semester/Bachelorarbeit/Data/qt30/nodeset18265.json'
        # for filename in os.listdir(json_folder_path):
        #    if filename.endswith('.json'):
        #        json_file_path = os.path.join(json_folder_path, filename)
        #        if (os.path.getsize(json_file_path) != 0 and os.path.getsize(
        #                json_file_path) != 68):
        with (open(json_file_path, 'r') as json_file):
            data = json.load(json_file)
            locutions = data.get("locutions")
            texts = data.get("nodes")
            edges = data.get("edges")

            globalConnectionID = None

            for node in texts:

                if node.get("type") == "I":
                    globalConnectionID = node.get("nodeID")
                    text = node.get("text")
                    rephrased = []
                    rephrasedNodeID = []
                    rephrasingID = []
                    inferenceIDs = []
                    inferenceNodeIDs = []
                    inferenceTexts = []
                    for edge in edges:
                        if edge.get("fromID") == globalConnectionID:
                            for betweenNode in texts:
                                if betweenNode.get("nodeID") == edge.get("toID"):
                                    if betweenNode.get("type") == "MA":
                                        rephrasingID.append(betweenNode.get("nodeID"))
                                    elif betweenNode.get("type") == "RA":
                                        inferenceIDs.append(betweenNode.get("nodeID"))
                    for targetNode in texts:
                        if targetNode.get("type") == "I":
                            for edge in edges:
                                if edge.get("fromID") in rephrasingID and edge.get(
                                        "toID") == targetNode.get("nodeID"):
                                    rephrased.append(targetNode.get("text"))
                                    rephrasedNodeID.append(targetNode.get("nodeID"))
                                if edge.get("fromID") in inferenceIDs and edge.get(
                                        "toID") == targetNode.get("nodeID"):
                                    inferenceTexts.append(targetNode.get("text"))
                                    inferenceNodeIDs.append(targetNode.get("nodeID"))
                    if globalConnectionID and rephrasedNodeID:
                        if globalConnectionID not in processed_node_ids:
                            texts_with_rephrase.append(
                                (globalConnectionID, text, rephrasedNodeID, rephrased))
                            processed_node_ids.add(globalConnectionID)
                    if globalConnectionID and inferenceNodeIDs:
                        if globalConnectionID not in processed_node_ids:
                            texts_with_inference.append(
                                (globalConnectionID, text, inferenceNodeIDs, inferenceTexts))
                            processed_node_ids.add(globalConnectionID)

    case 6:
        # json_file_path = 'C:/Users/Martin Gruber/OneDrive - gw.uni-passau.de/Studium/7. Semester/Bachelorarbeit/Data/qt30/nodeset17932.json'
        json_file_path = 'C:/Users/Martin Gruber/OneDrive - gw.uni-passau.de/Studium/7. Semester/Bachelorarbeit/Data/qt30/nodeset17925.json'
        graphNodes = []
        processed_node_ids = set()
        # for filename in os.listdir(json_folder_path):
        #    if filename.endswith('.json'):
        #        json_file_path = os.path.join(json_folder_path, filename)
        #        if (os.path.getsize(json_file_path) != 0 and os.path.getsize(
        #                json_file_path) != 68):
        with open(json_file_path, 'r') as json_file:
            data = json.load(json_file)
            locutions = data.get("locutions")
            nodes = data.get("nodes")
            edges = data.get("edges")
            node_id = None
            nodeIdMapping = {}

            # creating a mapping between the actual text ("L") and the paraphrased text ("I") for every node
            for node in nodes:
                if node.get("type") == "I":
                    node_id = node.get("nodeID")
                    nodeIdMapping[node_id] = []
                    betweenId = None
                    # finding the id of the assertion
                    for edge in edges:
                        if edge.get("toID") == node_id:
                            for betweenNode in nodes:
                                if betweenNode.get("nodeID") == edge.get("fromID") and betweenNode.get(
                                        "type") == "YA" and betweenNode.get("text") in ["Asserting",
                                                                                        "Rhetorical Questioning",
                                                                                        "Pure Questioning"]:
                                    betweenId = betweenNode.get("nodeID")
                    # finding the id of the corresponding node
                    for targetNode in nodes:
                        if targetNode.get("type") == "L":
                            for edge in edges:
                                if edge.get("fromID") == targetNode.get("nodeID") and edge.get("toID") == betweenId:
                                    nodeIdMapping[node_id].append(targetNode.get("nodeID"))

            for node in nodes:
                if node.get("type") == "I":
                    node_id = node.get("nodeID")
                    message = node.get("text")
                    text = None
                    start_time = None
                    speaker = None
                    if nodeIdMapping[node_id]:
                        globalNodeID = nodeIdMapping[node_id][0]

                    outgoingEdges = {}
                    connectionIDs = {}
                    graphEdges = {}

                    for edge in edges:
                        # find the outgoing connections of this node. There are two types:
                        # (1) connections to other "I" nodes and (2) connections to "L" nodes
                        if edge.get("fromID") == node_id:
                            for betweenNode in nodes:
                                if betweenNode.get("nodeID") == edge.get("toID"):
                                    if betweenNode.get("type") not in outgoingEdges:
                                        outgoingEdges[betweenNode.get("type")] = []
                                    outgoingEdges[betweenNode.get("type")].append(betweenNode.get("nodeID"))
                        if edge.get("fromID") == globalNodeID:
                            for betweenNode in nodes:
                                if betweenNode.get("nodeID") == edge.get("toID") and betweenNode.get("type") == "TA":
                                    if betweenNode.get("type") not in outgoingEdges:
                                        outgoingEdges[betweenNode.get("type")] = []
                                    outgoingEdges[betweenNode.get("type")].append(betweenNode.get("nodeID"))

                    # find the corresponding nodes to the outgoing edges
                    for targetNode in nodes:
                        if targetNode.get("type") == "I":
                            for edge in edges:
                                for connType in outgoingEdges:
                                    if edge.get("fromID") in outgoingEdges[connType] and edge.get(
                                            "toID") == targetNode.get("nodeID"):
                                        if connType not in connectionIDs:
                                            connectionIDs[connType] = []
                                        connectionIDs[connType].append(
                                            (targetNode.get("nodeID"), edge.get("fromID")))

                        elif targetNode.get("nodeID") == globalNodeID:
                            text = targetNode.get("text")
                        elif targetNode.get("type") == "L":
                            for edge in edges:

                                if "TA" in outgoingEdges and edge.get("fromID") in outgoingEdges["TA"] and edge.get(
                                        "toID") == targetNode.get("nodeID"):
                                    if "TA" not in graphEdges:
                                        graphEdges["TA"] = []
                                    graphEdges["TA"].append(targetNode.get("nodeID"))

                        elif targetNode.get("type") == "YA":
                            for edge in edges:

                                for connType, conn in connectionIDs.items():
                                    for c in conn:
                                        if edge.get("toID") in c[1] and edge.get("fromID") == targetNode.get("nodeID"):
                                            if c[1] == edge.get("toID"):
                                                if connType not in graphEdges:
                                                    graphEdges[connType] = []
                                                graphEdges[connType].append(
                                                    (nodeIdMapping[c[0]], targetNode.get("text")))

                    # find the speaker and the start time
                    for locution in locutions:
                        if locution.get("nodeID") == globalNodeID:
                            if (locution.get("start")) is None:
                                start_time = datetime.strptime("2025-05-28 19:08:43", '%Y-%m-%d %H:%M:%S')
                            else:
                                start_time = datetime.strptime(locution.get("start"), '%Y-%m-%d %H:%M:%S')
                            speaker = locution.get("personID")

                    if globalNodeID:
                        graphNodes.append((globalNodeID, graphEdges, speaker, text))

# Print the timelines for each speaker
match option:
    case 1:
        for person_id, timeline in speaker_timelines.items():
            print(f"Speaker {person_id} Timeline:")
            for start, text in timeline:
                print(f"{start}: {text}")
    case 2:
        for date, data in date_speaker_data.items():
            print(f"Date: {date}")
            for timestamp, speaker, text in data:
                formatted_timestamp = timestamp.strftime('%Y-%m-%d %H:%M:%S')
                print(f"{formatted_timestamp}: {speaker}: {text}")
    case 3:
        for topic, data in topic_data.items():
            print(f"Topic: {topic}")
            for timestamp, speaker, text in data:
                formatted_timestamp = timestamp.strftime('%Y-%m-%d %H:%M:%S')
                print(f"{formatted_timestamp}: {speaker}: {text}")
    case 4:
        for date, data in speaker_timelines.items():
            print(f"Date: {date}")
            for timestamp, text, paraphrased, iID in data:
                print(f"{timestamp}: {text}")
                print(f"{timestamp}: {paraphrased}: {iID}")
                print("\n")

    case 5:
        for ID, text, reID, reText in texts_with_rephrase:
            print(f"{ID} || {reID}")
        print("---------------------------------------------------------")
        for ID, text, inIDs, inTexts in texts_with_inference:
            print(f"{ID}|| {inIDs}")

    case 6:
        for nodeID, timeline, speaker, text in graphNodes:
            print(f"{nodeID} {timeline} {speaker}")
            print("")

# Print the diagram
match option:
    case 1:
        fig, ax = plt.subplots(figsize=(50, 5))
        y_coord = 0

        # Iterate through the speaker timelines
        for speaker, timeline_data in speaker_timelines.items():
            timeline_data.sort(key=lambda x: x[0])  # Sort by timestamp
            timestamps = [item[0] for item in timeline_data]
            text_labels = [item[1] for item in timeline_data]

            line_style = ""
            ax.plot(timestamps, [y_coord] * len(timestamps), marker='o', linestyle=line_style, label=speaker)
            y_coord += 1

        ax.set_yticks(range(len(speaker_timelines)))
        ax.set_yticklabels(speaker_timelines.keys())
        plt.gcf().autofmt_xdate()
        ax.set_xlabel("Timestamp")
        ax.set_title("Speaker Timelines")

        plt.tight_layout()
        plt.legend(loc='upper left', bbox_to_anchor=(1, 1))
        plt.show()

    case 2:
        fig, ax = plt.subplots(figsize=(50, 5))
        y_coord = 0

        # Iterate through the speaker timelines
        for day, timeline_data in date_speaker_data.items():
            timestamps = [item[0] for item in timeline_data]
            speaker = [item[1] for item in timeline_data]
            text_labels = [item[2] for item in timeline_data]

            line_style = ""
            ax.plot(timestamps, [y_coord] * len(timestamps), marker='o', linestyle=line_style, label=day)
            y_coord += 1

        ax.set_yticks(range(len(date_speaker_data)))
        ax.set_yticklabels(date_speaker_data.keys())
        plt.gcf().autofmt_xdate()
        ax.set_xlabel("Timestamp")
        ax.set_title("Speaker Timelines")

        plt.tight_layout()
        plt.legend(loc='upper left', bbox_to_anchor=(1, 1))
        plt.show()
    case 3:
        print("meh")

    case 4:
        print("nah")
