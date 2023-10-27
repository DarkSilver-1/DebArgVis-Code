# import ogdf_python
import json
import os
from datetime import datetime
import matplotlib.pyplot as plt

# Specify the path to your JSON file on Google Drive
json_folder_path = 'C:/Users/Martin Gruber/OneDrive - gw.uni-passau.de/Studium/7. Semester/Bachelorarbeit/Data/qt30'
# json_folder_path = 'C:/Users/grube/OneDrive - gw.uni-passau.de/Studium/7. Semester/Bachelorarbeit/Data/qt30'

option = 4
givenDate = datetime.strptime("2020-05-28 19:08:43", '%Y-%m-%d %H:%M:%S').date()
speakers = ["3831", "3881", "3812", "3880", "3912"]

speaker_timelines = {}
date_speaker_data = {}
topic_data = {}

match option:

    # Sort the data by speaker. Every speaker is associated with the things they said and the corresponding timestamp.
    case 1:
        processed_node_ids = set()
        speaker_timelines["0"] = []
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

                        # Iterate through the 'locutions' data
                        for locution in locutions:
                            person_id = locution.get("personID")
                            node_id = locution.get("nodeID")
                            text = None

                            # Find the corresponding text from 'texts' data based on 'nodeID'
                            for text_item in texts:
                                if text_item.get("nodeID") == node_id and text_item.get(
                                        "type") == "L" and locution.get("start") is not None and datetime.strptime(
                                    locution.get("start"), '%Y-%m-%d %H:%M:%S').date() == date:
                                    text = text_item.get("text")
                                    break

                            if person_id and text:
                                if person_id not in speaker_timelines:
                                    if person_id in speakers:
                                        speaker_timelines[person_id] = []

                                # Check if the node ID has been processed before
                                if node_id not in processed_node_ids and locution.get("start") is not None:
                                    if person_id in speakers:
                                        speaker_timelines[person_id].append(
                                            (datetime.strptime(locution.get("start"), '%Y-%m-%d %H:%M:%S'), text))
                                        processed_node_ids.add(node_id)  # Mark the node ID as processed
                                    else:
                                        speaker_timelines["0"].append(
                                            (datetime.strptime(locution.get("start"), '%Y-%m-%d %H:%M:%S'), text))
                                        processed_node_ids.add(node_id)  # Mark the node ID as processed

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
                                node_id = node.get("nodeID")
                                text = node.get("text")
                                speaker = None

                                for locution in locutions:
                                    if locution.get("nodeID") == node_id:
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
                                    node_id = node.get("nodeID")
                                    text = node.get("text")
                                    timestamp = datetime.strptime(node.get("timestamp"), '%Y-%m-%d %H:%M:%S')
                                    topic = node.get("topic")
                                    speaker = None

                                    for locution in locutions:
                                        if locution.get("nodeID") == node_id:
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
        json_file_path = 'C:/Users/Martin Gruber/OneDrive - gw.uni-passau.de/Studium/7. Semester/Bachelorarbeit/Data/qt30/nodeset17921.json'
        with (open(json_file_path, 'r') as json_file):
            data = json.load(json_file)
            locutions = data.get("locutions")
            texts = data.get("nodes")
            edges = data.get("edges")

            for locution in locutions:
                person_id = locution.get("personID")
                node_id = locution.get("nodeID")
                start_time = locution.get("start")
                text = None
                paraphrased = None
                paraphrasedID = None

                assertingNodeID = None
                for node in texts:
                    if node.get("nodeID") == node_id:
                        if node.get("type") == "L":
                            text = node.get("text")
                            break
                for node in texts:
                    if node.get("type") == "YA" and node.get("text") == "Asserting":
                        for edge in edges:
                            if edge.get("fromID") == node_id:
                                assertingNodeID = edge.get("toID")
                                break
                print(assertingNodeID)

                for node in texts:
                    if node.get("type") == "I":
                        for edge in edges:
                            if edge.get("fromID") == assertingNodeID and edge.get("toID") == node.get("nodeID"):
                                paraphrased = node.get("text")
                                paraphrasedID = node.get("nodeID")
                                break
                print(paraphrased)

                if person_id and text and paraphrased:
                    if person_id not in speaker_timelines:
                        speaker_timelines[start_time] = []

                # if person_id in speakers:
                speaker_timelines[start_time].append(
                    (datetime.strptime(locution.get("start"), '%Y-%m-%d %H:%M:%S'), text, paraphrased, paraphrasedID))
                # else:
                #    speaker_timelines["0"].append(
                #        (datetime.strptime(locution.get("start"), '%Y-%m-%d %H:%M:%S'), text, paraphrased))

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
