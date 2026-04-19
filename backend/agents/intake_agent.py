import os
from dotenv import load_dotenv, find_dotenv

# Try importing LangChain components.
# If they are not installed, the user will see a ModuleNotFoundError, and we should install them.
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import PydanticOutputParser

# Import the JobProfile Pydantic model we created
from backend.models.job import JobProfile

# Load environment variables (like OPENAI_API_KEY)
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(env_path)

def process_job_description(job_description: str) -> JobProfile:
    """
    Receive the raw job description.
    Send a prompt to GPT-4o to extract [Title, Skills, Experience, Priorities].
    Return the structured Pydantic model.
    """
    # 1. Initialize the LLM
    llm = ChatOpenAI(model="gpt-4o", temperature=0)
    
    # 2. Set up the Pydantic Output Parser using our model
    parser = PydanticOutputParser(pydantic_object=JobProfile)
    
    # 3. Create the Prompt Template as requested
    prompt = PromptTemplate(
        template=(
            "You are an HR Assistant. Extract these fields [Title, Skills, Experience, Priorities] "
            "from the provided text.\n\n"
            "{format_instructions}\n\n"
            "Job Description:\n{job_description}\n"
        ),
        input_variables=["job_description"],
        partial_variables={"format_instructions": parser.get_format_instructions()},
    )
    
    # 4. Chain them together
    chain = prompt | llm | parser
    
    # 5. Execute and return the extracted profile
    result = chain.invoke({"job_description": job_description})
    return result

if __name__ == "__main__":
    # Test script to run locally with a dummy job description
    dummy_job_desc = """
    We are looking for a Software Engineer with at least 3 years of experience.
    The ideal candidate should have strong skills in Python, React, and PostgreSQL.
    Your main priorities will be building scalable web applications, optimizing database queries,
    and ensuring the frontend is responsive and user-friendly.
    """
    print("--- Testing Intake Agent ---")
    print("Input Description:", dummy_job_desc)
    print("Calling GPT-4o...")
    
    try:
        profile = process_job_description(dummy_job_desc)
        print("\nSuccess! Structured JSON Output:")
        # Print the fields to reflect the target format
        print(profile.model_dump_json(indent=4))
    except Exception as e:
        print("\nError occurred:", e)
