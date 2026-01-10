import os
from groq import Groq

# Load environment variable
GROQ_API_KEY = os.getenv('GROQ_API_KEY')

class GroqService:
    def __init__(self):
        self.client = None
        if GROQ_API_KEY and GROQ_API_KEY != 'your_groq_api_key_here':
            self.client = Groq(api_key=GROQ_API_KEY)

    def get_response(self, system_prompt, user_message, model="llama-3.1-8b-instant"):
        """
        Generates a response using the Groq API.
        Default model is llama-3.1-8b-instant.
        """
        if not self.client:
            return "Groq API Key is not configured correctly."

        try:
            completion = self.client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.7,
                max_tokens=1024,
                top_p=1,
                stream=False,
                stop=None,
            )
            return completion.choices[0].message.content
        except Exception as e:
            print(f"Groq API Error: {e}")
            return f"Error: {str(e)}"

# Singleton instance
groq_service = GroqService()
