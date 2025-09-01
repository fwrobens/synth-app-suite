import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { 
  Send, 
  Play, 
  Save, 
  Code, 
  FileText, 
  Folder, 
  FolderOpen,
  LogOut,
  User,
  Plus,
  Sparkles
} from "lucide-react";
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { WebContainer } from '@webcontainer/api';

interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface FileNode {
  name: string;
  type: 'file' | 'directory';
  content?: string;
  children?: FileNode[];
}

const AppBuilder = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [webContainer, setWebContainer] = useState<WebContainer | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [currentProject, setCurrentProject] = useState<any>(null);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check authentication
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session?.user) {
          navigate('/auth');
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    // Initialize WebContainer
    const initWebContainer = async () => {
      try {
        const container = await WebContainer.boot();
        setWebContainer(container);
        
        // Listen for server ready event
        container.on('server-ready', (port, url) => {
          setPreviewUrl(url);
        });
      } catch (error) {
        console.error('Failed to initialize WebContainer:', error);
        toast({
          title: "Error",
          description: "Failed to initialize the development environment.",
          variant: "destructive",
        });
      }
    };

    initWebContainer();
  }, [toast]);

  useEffect(() => {
    // Auto scroll to bottom of messages
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputMessage,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setLoading(true);

    try {
      // Call Gemini AI edge function
      const { data, error } = await supabase.functions.invoke('generate-app', {
        body: { 
          prompt: inputMessage,
          context: {
            currentProject: currentProject?.files || {},
            messages: messages.slice(-5) // Send last 5 messages for context
          }
        }
      });

      if (error) throw error;

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        role: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // If files were generated, update the WebContainer
      if (data.files && webContainer) {
        await updateWebContainer(data.files);
        await saveProject(data.files, data.projectName || 'My App');
      }

    } catch (error: any) {
      console.error('Error generating app:', error);
      toast({
        title: "Generation Error",
        description: error.message || "Failed to generate app. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateWebContainer = async (files: any) => {
    if (!webContainer) return;

    try {
      // Mount the files to the WebContainer
      await webContainer.mount(files);
      
      // Install dependencies if package.json exists
      if (files['package.json']) {
        const installProcess = await webContainer.spawn('npm', ['install']);
        await installProcess.exit;
      }

      // Start the development server
      const startProcess = await webContainer.spawn('npm', ['run', 'dev']);
      
      // Update file tree for display
      setFileTree(convertFilesToTree(files));
      
    } catch (error) {
      console.error('Error updating WebContainer:', error);
      toast({
        title: "Error",
        description: "Failed to update the preview.",
        variant: "destructive",
      });
    }
  };

  const convertFilesToTree = (files: any): FileNode[] => {
    const tree: FileNode[] = [];
    
    for (const [path, content] of Object.entries(files)) {
      const parts = path.split('/');
      let current = tree;
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1;
        
        let existing = current.find(item => item.name === part);
        
        if (!existing) {
          existing = {
            name: part,
            type: isFile ? 'file' : 'directory',
            content: isFile ? (content as any)?.file?.contents || content : undefined,
            children: isFile ? undefined : []
          };
          current.push(existing);
        }
        
        if (!isFile) {
          current = existing.children!;
        }
      }
    }
    
    return tree;
  };

  const saveProject = async (files: any, name: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .upsert({
          id: currentProject?.id,
          user_id: user.id,
          name,
          files,
          framework: 'react',
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentProject(data);
      toast({
        title: "Project Saved",
        description: "Your project has been saved successfully.",
      });
    } catch (error: any) {
      console.error('Error saving project:', error);
      toast({
        title: "Save Error",
        description: "Failed to save project.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const toggleFolder = (folderName: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderName)) {
      newExpanded.delete(folderName);
    } else {
      newExpanded.add(folderName);
    }
    setExpandedFolders(newExpanded);
  };

  const renderFileTree = (nodes: FileNode[], level = 0) => {
    return nodes.map((node, index) => (
      <div key={`${node.name}-${level}-${index}`} style={{ paddingLeft: `${level * 16}px` }}>
        <div 
          className="flex items-center gap-2 py-1 px-2 hover:bg-muted/50 rounded cursor-pointer text-sm"
          onClick={() => node.type === 'directory' && toggleFolder(node.name)}
        >
          {node.type === 'directory' ? (
            expandedFolders.has(node.name) ? 
              <FolderOpen className="w-4 h-4 text-primary" /> : 
              <Folder className="w-4 h-4 text-primary" />
          ) : (
            <FileText className="w-4 h-4 text-muted-foreground" />
          )}
          <span>{node.name}</span>
        </div>
        {node.type === 'directory' && expandedFolders.has(node.name) && node.children && (
          <div>
            {renderFileTree(node.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="h-screen bg-background flex">
      {/* Left Sidebar - Chat */}
      <div className="w-1/2 border-r border-border flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-hero rounded-lg flex items-center justify-center">
                <Code className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-gradient">SynthApp Studio</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/')}>
                <Plus className="w-4 h-4 mr-1" />
                New
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Welcome to SynthApp Studio!</h3>
                <p className="text-muted-foreground mb-4">
                  Describe the app you want to build and I'll create it for you.
                </p>
                <div className="text-left max-w-sm mx-auto space-y-2 text-sm text-muted-foreground">
                  <p>Try saying:</p>
                  <ul className="space-y-1 pl-4">
                    <li>• "Create a React todo app with dark theme"</li>
                    <li>• "Build a portfolio website with contact form"</li>
                    <li>• "Make a dashboard with charts and tables"</li>
                  </ul>
                </div>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border/40'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  <div className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-card border border-border/40 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
                    <span>Generating your app...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Describe the app you want to build..."
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              disabled={loading}
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={loading || !inputMessage.trim()}
              variant="hero"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Right Side - File Explorer & Preview */}
      <div className="w-1/2 flex flex-col">
        {/* File Explorer */}
        <div className="h-1/3 border-b border-border">
          <div className="p-3 border-b border-border/40 bg-muted/20">
            <h3 className="font-medium text-sm">Project Files</h3>
          </div>
          <ScrollArea className="h-full p-2">
            {fileTree.length > 0 ? (
              <div className="space-y-1">
                {renderFileTree(fileTree)}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                No files yet. Start by describing your app!
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Preview */}
        <div className="flex-1 flex flex-col">
          <div className="p-3 border-b border-border/40 bg-muted/20 flex items-center justify-between">
            <h3 className="font-medium text-sm">Live Preview</h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={!previewUrl}>
                <Play className="w-3 h-3 mr-1" />
                Preview
              </Button>
              <Button variant="outline" size="sm" disabled={!currentProject}>
                <Save className="w-3 h-3 mr-1" />
                Save
              </Button>
            </div>
          </div>
          <div className="flex-1">
            {previewUrl ? (
              <iframe
                ref={iframeRef}
                src={previewUrl}
                className="w-full h-full border-0"
                title="App Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <div className="w-16 h-16 border-2 border-dashed border-border rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Play className="w-8 h-8" />
                  </div>
                  <p>Your app preview will appear here</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppBuilder;