import os

from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

from rag.loader import load_pdf
from rag.splitter import split_documents
from rag.embeddings import get_embedding_model
from rag.vector_store import create_vector_store, get_retriever_from_store
from rag.chain import ask_question


load_dotenv()

app = Flask(__name__)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER



vector_store = None


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/upload", methods=["POST"])
def upload_pdf():

    global vector_store

    if "pdf" not in request.files:
        return jsonify({
            "success": False,
            "error": "No PDF uploaded"
        }), 400

    file = request.files["pdf"]

    if file.filename == "":
        return jsonify({
            "success": False,
            "error": "No file selected"
        }), 400

    save_path = os.path.join(
        app.config["UPLOAD_FOLDER"],
        file.filename
    )

    try:

        file.save(save_path)

        print(f"\nUploading: {file.filename}")

        print("Loading PDF...")
        documents = load_pdf(save_path)

        print("Splitting document...")
        chunks = split_documents(documents)

        print("Creating embeddings...")
        embedding_model = get_embedding_model()

        print("Creating Qdrant vector store...")
        vector_store = create_vector_store(
            chunks,
            embedding_model
        )

        print("PDF indexed successfully!")

        return jsonify({
            "success": True,
            "message": "PDF indexed successfully"
        }), 200

    except Exception as e:

        print("ERROR while indexing PDF:")
        print(e)

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/ask", methods=["POST"])
def ask():

    global vector_store

    if vector_store is None:
        return jsonify({
            "success": False,
            "error": "Upload a PDF first"
        }), 400

    data = request.get_json(silent=True) or {}

    question = data.get("question", "").strip()

    if not question:
        return jsonify({
            "success": False,
            "error": "Question is required"
        }), 400

    try:

        retriever = get_retriever_from_store(vector_store)

        answer = ask_question(
            retriever,
            question
        )

        return jsonify({
            "success": True,
            "answer": answer
        }), 200

    except Exception as e:

        print("ERROR while answering:")
        print(e)

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=False
    )