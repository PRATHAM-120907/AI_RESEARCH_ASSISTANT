import os 
from langchain_qdrant import QdrantVectorStore


def create_vector_store(chunks, embedding_model):

    qdrant_url = os.getenv("QDRANT_URL" , "http://localhost:6333")




    vector_store = QdrantVectorStore.from_documents(
        documents=chunks,
        embedding=embedding_model,
        url=qdrant_url,
        collection_name="research_docs",
    )

    return vector_store