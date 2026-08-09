import os
from dotenv import load_dotenv
from openai import OpenAI
from rag.prompt import build_prompt

load_dotenv()

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
    base_url="https://openrouter.ai/api/v1"
)

def ask_question(retriever, question: str):
    """
    Retrieve relevant content from Qdrant and ask the LLM.
    """

    documents = retriever.invoke(question)
    print("=" * 80)
    print("Retrieved Documents")
    print("=" * 80)

    for i, doc in enumerate(documents):
        print(f"\nDocument {i+1}")
        print(doc.page_content[:700])
        print("-" * 60)

    context = "\n\n".join(
        [doc.page_content for doc in documents]
    )

    prompt = build_prompt(
        context=context,
        question=question
    )

    response = client.chat.completions.create(
        model="openai/gpt-oss-20b:free",
        messages=[
            {
                "role": "system",
                "content": "Answer the question using only the provided document context. If the answer is not present in the document, say you don't know."
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    return response.choices[0].message.content