# import ogdf_python
import json
import os
from datetime import datetime
import matplotlib.pyplot as plt

# Specify the path to your JSON file on Google Drive
# json_folder_path = 'C:/Users/Martin Gruber/OneDrive - gw.uni-passau.de/Studium/7. Semester/Bachelorarbeit/Data/qt30'
json_folder_path = 'C:/Users/grube/OneDrive - gw.uni-passau.de/Studium/7. Semester/Bachelorarbeit/Data/qt30'

option = 1
givenDate = datetime.strptime("2020-05-28 19:08:43", '%Y-%m-%d %H:%M:%S').date()

speaker_timelines = {}
date_speaker_data = {}
topic_data = {}

match option:

    # Sort the data by speaker. Every speaker is associated with the things they said and the corresponding timestamp.
    case 1:
        processed_node_ids = set()
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
                                        "type") == "L" and datetime.strptime(text_item.get("timestamp"),
                                                                             '%Y-%m-%d %H:%M:%S').date() == date:
                                    text = text_item.get("text")
                                    break

                            if person_id and text:
                                if person_id not in speaker_timelines:
                                    speaker_timelines[person_id] = []

                                # Check if the node ID has been processed before
                                if node_id not in processed_node_ids:
                                    speaker_timelines[person_id].append(
                                        (datetime.strptime(text_item.get("timestamp"), '%Y-%m-%d %H:%M:%S'), text))
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
                                timestamp = datetime.strptime(node.get("timestamp"), '%Y-%m-%d %H:%M:%S')
                                date = timestamp.date()
                                node_id = node.get("nodeID")
                                text = node.get("text")
                                speaker = None

                                for locution in locutions:
                                    if locution.get("nodeID") == node_id:
                                        speaker = locution.get("personID")
                                        break

                                if speaker is not None:
                                    if date not in date_speaker_data:
                                        date_speaker_data[date] = []

                                    date_speaker_data[date].append((timestamp, speaker, text))
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
# Print the timelines for each speaker
match option:
    case 1:
        for person_id, timeline in speaker_timelines.items():
            print(f"Speaker {person_id} Timeline:")
            for timestamp, text in timeline:
                print(f"{timestamp}: {text}")
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
        print("well")

    case 3:
        print("meh")
