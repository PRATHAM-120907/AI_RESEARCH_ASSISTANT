import os
from flask import Flask , render_template , request , jsonify
from dotenv import load_dotenv
from rag.loader import load_pdf
from rag.splitter import split_documents
from rag.embeddings import get_embedding_model
from rag.vector_store import create_vector_store
from rag.retriever import get_retriever
from rag.chain import ask_question

load_dotenv()
# Global retriever
retriever  = None



app = Flask(__name__)
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER , exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER



@app.route('/')
def home():
     return render_template('index.html')

@app.route("/upload", methods=["POST"])
def upload_pdf():

    global retriever

    if "pdf" not in request.files:
        return jsonify({"error": "No PDF uploaded"}), 400

    file = request.files["pdf"]

    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    save_path = os.path.join(
        app.config["UPLOAD_FOLDER"],
        file.filename
    )

    file.save(save_path)

    print(f"\nUploading: {file.filename}")

    # Load PDF
    documents = load_pdf(save_path)

    # Split
    chunks = split_documents(documents)

    # Embeddings
    embedding_model = get_embedding_model()

    # Vector Store
    vector_store = create_vector_store(
        chunks,
        embedding_model
    )

    # Retriever
    retriever = get_retriever(vector_store)

    return jsonify({
        "success": True,
        "message": "PDF Indexed Successfully"
    })




@app.route("/ask" , methods=["POST"])
def ask():
    global retriever
    
    if retriever is None:
        return jsonify({"Success":False, "error":"Upload a PDF first"}), 400
    
    data = request.get_json()
    
    question = data.get("question")
    if not question:
        return jsonify({"success":False , "error":"Qestion is required to process"}), 400
    
    
    answer = ask_question(retriever , question)
    return jsonify({"success":True , "answer":answer}),200
    

    

if __name__ == '__main__':
    app.run(host='0.0.0.0',port=5000,debug=False)