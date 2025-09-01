import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, context } = await req.json();

    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured');
    }

    // Build context for the AI
    let systemPrompt = `You are an expert full-stack developer assistant that helps users build web applications. You generate complete, working code for React applications with modern best practices.

When a user describes an app they want to build, you should:
1. Generate a complete file structure for a React application
2. Include all necessary files (package.json, src files, etc.)
3. Use modern React with TypeScript and Tailwind CSS
4. Ensure the code is production-ready and follows best practices
5. Include proper error handling and responsive design

Always respond with:
1. A brief explanation of what you're building
2. The complete file structure as a JSON object with file paths as keys and file contents as values
3. Any additional setup instructions if needed

File structure should include:
- package.json with all necessary dependencies
- index.html
- src/main.tsx
- src/App.tsx
- Other component files as needed
- src/index.css with Tailwind imports

Use Vite as the build tool and include these dependencies in package.json:
- react, react-dom
- @types/react, @types/react-dom
- typescript
- vite
- @vitejs/plugin-react
- tailwindcss, autoprefixer, postcss
- lucide-react (for icons)

Make sure all code is complete and functional.`;

    if (context?.currentProject && Object.keys(context.currentProject).length > 0) {
      systemPrompt += `\n\nCurrent project files:\n${JSON.stringify(context.currentProject, null, 2)}`;
    }

    if (context?.messages && context.messages.length > 0) {
      systemPrompt += `\n\nRecent conversation context:\n${context.messages.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n')}`;
    }

    console.log('Calling Gemini API with prompt:', prompt);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\nUser request: ${prompt}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API error:', errorData);
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Gemini API response:', data);

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response from Gemini API');
    }

    const generatedText = data.candidates[0].content.parts[0].text;

    // Try to extract files from the response
    let files = null;
    let projectName = 'My App';
    
    try {
      // Look for JSON in the response that represents files
      const jsonMatch = generatedText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        files = JSON.parse(jsonMatch[1]);
      } else {
        // Try to find file structure in a different format
        const fileMatches = generatedText.match(/```(\w+)?\n([\s\S]*?)\n```/g);
        if (fileMatches) {
          files = {};
          fileMatches.forEach((match) => {
            const lines = match.split('\n');
            const firstLine = lines[0];
            const content = lines.slice(1, -1).join('\n');
            
            // Try to extract filename from comment or context
            let filename = 'index.js';
            if (firstLine.includes('package.json')) filename = 'package.json';
            else if (firstLine.includes('index.html')) filename = 'index.html';
            else if (firstLine.includes('App.tsx') || firstLine.includes('App.js')) filename = 'src/App.tsx';
            else if (firstLine.includes('main.tsx') || firstLine.includes('main.js')) filename = 'src/main.tsx';
            else if (firstLine.includes('index.css')) filename = 'src/index.css';
            
            files[filename] = {
              file: {
                contents: content
              }
            };
          });
        }
      }

      // If we still don't have files, create a basic React app structure
      if (!files) {
        files = createBasicReactApp(prompt);
      }

      // Ensure proper file structure format for WebContainer
      const formattedFiles: any = {};
      for (const [path, content] of Object.entries(files)) {
        if (typeof content === 'string') {
          formattedFiles[path] = {
            file: {
              contents: content
            }
          };
        } else if (content && typeof content === 'object' && 'file' in content) {
          formattedFiles[path] = content;
        } else {
          formattedFiles[path] = {
            file: {
              contents: String(content)
            }
          };
        }
      }

      files = formattedFiles;
    } catch (error) {
      console.error('Error parsing files from response:', error);
      files = createBasicReactApp(prompt);
    }

    return new Response(JSON.stringify({ 
      response: generatedText,
      files,
      projectName
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-app function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      response: "I apologize, but I encountered an error while generating your app. Please try again with a different description."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function createBasicReactApp(prompt: string) {
  return {
    'package.json': {
      file: {
        contents: JSON.stringify({
          "name": "synth-app",
          "private": true,
          "version": "0.0.0",
          "type": "module",
          "scripts": {
            "dev": "vite",
            "build": "tsc && vite build",
            "preview": "vite preview"
          },
          "dependencies": {
            "react": "^18.2.0",
            "react-dom": "^18.2.0",
            "lucide-react": "^0.400.0"
          },
          "devDependencies": {
            "@types/react": "^18.2.66",
            "@types/react-dom": "^18.2.22",
            "@vitejs/plugin-react": "^4.2.1",
            "autoprefixer": "^10.4.19",
            "postcss": "^8.4.38",
            "tailwindcss": "^3.4.4",
            "typescript": "^5.2.2",
            "vite": "^5.2.0"
          }
        }, null, 2)
      }
    },
    'index.html': {
      file: {
        contents: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SynthApp Generated</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`
      }
    },
    'src/main.tsx': {
      file: {
        contents: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`
      }
    },
    'src/App.tsx': {
      file: {
        contents: `import { useState } from 'react'
import { Sparkles } from 'lucide-react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <div className="flex items-center justify-center mb-8">
          <Sparkles className="w-12 h-12 text-purple-500 mr-4" />
          <h1 className="text-4xl font-bold">Your App is Ready!</h1>
        </div>
        <p className="text-xl text-gray-300 mb-8">
          Generated based on: "${prompt}"
        </p>
        <div className="space-y-4">
          <p className="text-lg">Count: {count}</p>
          <button
            onClick={() => setCount(count + 1)}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors"
          >
            Click me!
          </button>
        </div>
      </div>
    </div>
  )
}

export default App`
      }
    },
    'src/index.css': {
      file: {
        contents: `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}`
      }
    },
    'tailwind.config.js': {
      file: {
        contents: `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`
      }
    },
    'postcss.config.js': {
      file: {
        contents: `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`
      }
    },
    'vite.config.ts': {
      file: {
        contents: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000
  }
})`
      }
    },
    'tsconfig.json': {
      file: {
        contents: JSON.stringify({
          "compilerOptions": {
            "target": "ES2020",
            "useDefineForClassFields": true,
            "lib": ["ES2020", "DOM", "DOM.Iterable"],
            "module": "ESNext",
            "skipLibCheck": true,
            "moduleResolution": "bundler",
            "allowImportingTsExtensions": true,
            "resolveJsonModule": true,
            "isolatedModules": true,
            "noEmit": true,
            "jsx": "react-jsx",
            "strict": true,
            "noUnusedLocals": true,
            "noUnusedParameters": true,
            "noFallthroughCasesInSwitch": true
          },
          "include": ["src"],
          "references": [{ "path": "./tsconfig.node.json" }]
        }, null, 2)
      }
    }
  };
}