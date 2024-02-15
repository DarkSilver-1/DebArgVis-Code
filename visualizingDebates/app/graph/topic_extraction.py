import os
import re

from dotenv import load_dotenv
from sklearn.decomposition import LatentDirichletAllocation
from sklearn.feature_extraction.text import CountVectorizer

load_dotenv()
transcript_path = os.getenv("TRANSCRIPT_PATH")


def extract_documents():
    documents = []
    text_pattern = re.compile(r"\[([\d:]+)]\s*(.*)")
    with open(transcript_path, 'r') as file:
        for line in file:
            if text_pattern.match(line):
                match = text_pattern.match(line)
                data = re.findall(r'[^.!?]+[.!?]?', match.group(2))
                document_text = ''.join(data)
                documents.append(document_text)
    return documents


def extract_topics():
    documents = extract_documents()
    vectorizer = CountVectorizer(stop_words='english')
    x = vectorizer.fit_transform(documents)
    num_topics = 10
    lda = LatentDirichletAllocation(n_components=num_topics, random_state=42)
    lda.fit(x)
    feature_names = vectorizer.get_feature_names_out()
    topic_words = {}
    for topic_idx, topic in enumerate(lda.components_):
        topic_words[topic_idx] = [feature_names[i] for i in topic.argsort()[::-1][:7]]
    return topic_words


topics = extract_topics()
for topic_num in topics:
    print(topic_num)
    print(topics[topic_num])
    print()
