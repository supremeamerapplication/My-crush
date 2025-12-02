{
  "name": "primemar-social",
  "version": "1.0.0",
  "description": "Complete Social Media Platform",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js",
    "build": "echo 'No build step required for static site'",
    "test": "echo 'No tests yet'"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.7",
    "socket.io": "^4.7.2",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {},
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  },
  "keywords": ["social-media", "real-time", "chat", "video-call"],
  "author": "PrimeMar Team",
  "license": "MIT"
}