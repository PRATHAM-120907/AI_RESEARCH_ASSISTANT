from langchain_huggingface import HuggingFaceEmbeddings



def get_embedding_model():
    
    embedding_model = HuggingFaceEmbeddings(
        model_name="BAAI/bge-small-en-v1.5"
    )
    
    return embedding_model


