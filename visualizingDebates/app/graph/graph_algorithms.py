def group_elements(graph_nodes):
    extended_graph_nodes = []

    current_speaker = None
    current_group = []
    temp_data = []

    for start_time, globalNodeID, graphEdges, speaker, text in graph_nodes:
        if speaker != current_speaker:
            if current_group:
                for i in range(len(current_group)):
                    extended_graph_nodes.append((temp_data[i][0], temp_data[i][1], temp_data[i][2], current_speaker, current_group[i], current_group))
                current_group = []
                temp_data = []

            current_speaker = speaker
        current_group.append(text)
        temp_data.append((start_time, globalNodeID, graphEdges))

    if current_group:
        for i in range(len(current_group)):
            extended_graph_nodes.append((temp_data[i][0], temp_data[i][1], temp_data[i][2], current_speaker, current_group[i], current_group))

    return extended_graph_nodes