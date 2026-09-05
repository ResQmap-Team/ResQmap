import os
import uvicorn

if __name__ == '__main__':
    port = int(os.getenv('PORT', os.getenv('SERVER_PORT', '8000')))
    host = os.getenv('SERVER_HOST', '0.0.0.0')
    uvicorn.run('backend.main:app', host=host, port=port, reload=False)
