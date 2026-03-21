import ollama 

response = ollama.chat( 
    model='mistral', 
    messages=[{'role': 'user', 'content': 'Reply with just: Mistral is working.'}] 
) 
print(response['message']['content'])
