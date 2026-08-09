from pathlib import Path 
from langchain_community.document_loaders import PyPDFLoader

def load_pdf(file_path : str):
    """
    Load a pdf file and return a list of Langchain Documents objects
    """
    pdf_path = Path(file_path)
    
    if not pdf_path.exists():
        raise FileNotFoundError(f"File not Found{pdf_path}")

    else:
        loader = PyPDFLoader(str(pdf_path))
        documents = loader.load()
        
        return documents