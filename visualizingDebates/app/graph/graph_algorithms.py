import datetime


def group_elements(graph_nodes):
    extended_graph_nodes = []

    current_speaker = None
    current_group = []
    temp_data = []

    for start_time, globalNodeID, graphEdges, speaker, text in graph_nodes:
        if speaker != current_speaker:
            if current_group:
                for i in range(len(current_group)):
                    extended_graph_nodes.append((temp_data[i][0], temp_data[i][1], temp_data[i][2], current_speaker,
                                                 current_group[i], current_group))
                current_group = []
                temp_data = []

            current_speaker = speaker
        current_group.append(text)
        temp_data.append((start_time, globalNodeID, graphEdges))

    if current_group:
        for i in range(len(current_group)):
            extended_graph_nodes.append(
                (temp_data[i][0], temp_data[i][1], temp_data[i][2], current_speaker, current_group[i], current_group))

    return extended_graph_nodes


def determine_end(graph_nodes):
    for i in range(len(graph_nodes)):
        if i < len(graph_nodes) - 1:
            # For elements except the last one, use the starttime of the next element
            end_time = graph_nodes[i + 1][0]
        else:
            # For the last element, add 15 seconds to the starttime
            end_time = graph_nodes[i][0] + datetime.timedelta(seconds=15)

        # Convert the end_time to your desired format (e.g., datetime object)
        graph_nodes[i] = (graph_nodes[i][0], graph_nodes[i][1], graph_nodes[i][2], graph_nodes[i][3], graph_nodes[i][4],
                          graph_nodes[i][5], end_time)
    return graph_nodes
