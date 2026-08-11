import os

from qdrant_client import QdrantClient
from langchain_qdrant import QdrantVectorStore


COLLECTION_NAME = "research_docs"


def get_qdrant_client():

    url = os.getenv("QDRANT_URL")
    api_key = os.getenv("QDRANT_API_KEY")

    if not url:
        raise ValueError("QDRANT_URL is not set")

    if not api_key:
        raise ValueError("QDRANT_API_KEY is not set")

    return QdrantClient(
        url=url,
        api_key=api_key
    )


def create_vector_store(chunks, embedding_model):

    client = get_qdrant_client()

    # This project currently supports one active PDF.
    # Remove the previous PDF's vectors before indexing a new one.
    if client.collection_exists(COLLECTION_NAME):

        print("Deleting previous Qdrant collection...")

        client.delete_collection(
            collection_name=COLLECTION_NAME
        )

    print("Creating Qdrant collection...")

    vector_store = QdrantVectorStore.from_documents(
        documents=chunks,
        embedding=embedding_model,
        url=os.getenv("QDRANT_URL"),
        api_key=os.getenv("QDRANT_API_KEY"),
        collection_name=COLLECTION_NAME
    )

    return vector_store


def get_retriever_from_store(vector_store):

    return vector_store.as_retriever(
        search_type="similarity",
        search_kwargs={
            "k": 5
        }
    )