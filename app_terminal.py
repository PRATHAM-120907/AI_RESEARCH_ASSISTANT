from dotenv import load_dotenv

from rag.loader import load_pdf
from rag.splitter import split_documents
from rag.embeddings import get_embedding_model
from rag.vector_store import create_vector_store
from rag.retriever import get_retriever
from rag.chain import ask_question



load_dotenv()

print("=" * 60)
print("AI Research Assistant")
print("=" * 60)


documents = load_pdf("uploads/Node.js_pdf.pdf")

print(f"\n PDF Loaded Successfully")
print(f"Total Pages: {len(documents)}")



chunks = split_documents(documents)

print(f" Total Chunks Created: {len(chunks)}")
embedding_model = get_embedding_model()

print(" Embedding Model Loaded")

vector_store = create_vector_store(
    chunks,
    embedding_model
)

print(" Qdrant Vector Store Ready")
retriever = get_retriever(vector_store)

print(" Retriever Ready")

print("\n" + "=" * 60)
print("Ask questions about your PDF")
print("Type 'exit' to quit.")
print("=" * 60)

while True:

    question = input("\nYou: ")

    if question.lower() == "exit":
        print("\n Goodbye!")
        break

    answer = ask_question(
        retriever,
        question
    )

    print("\nAI:")
    print(answer)
    
    
