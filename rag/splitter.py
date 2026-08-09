from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

def split_documents(documents:list[Document]) -> list[Document]:
    """
     Split Langchain Docs objects into smaller overlapping chunks
     
     
     args:
     documents: List of langchain docs object
     
     return:
     List of chunked Documents Objects
    """
    
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len,
        separators=[
            "\n\n",
            "\n",
            ". ",
            " ",
            ""
        ]
    )
    chunks = text_splitter.split_documents(documents)
    
    return chunks

