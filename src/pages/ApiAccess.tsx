import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, Key, RefreshCw, Code, Lock, Zap, Shield } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradePrompt } from "@/components/subscription/UpgradePrompt";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ApiAccess = () => {
  const navigate = useNavigate();
  const { isStudio, loading: subLoading } = useSubscription();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        loadApiKey(user.id);
      }
    });
  }, [navigate]);

  const loadApiKey = async (userId: string) => {
    // For demo, we simulate API key storage
    // In production, this would fetch from a secure api_keys table
    const storedKey = localStorage.getItem(`artistry_api_key_${userId}`);
    setApiKey(storedKey);
    setLoading(false);
  };

  const generateApiKey = async () => {
    setRegenerating(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Generate a secure API key
    const key = `art_${crypto.randomUUID().replace(/-/g, '')}`;
    
    // Store locally (in production, this would be stored securely in the database)
    localStorage.setItem(`artistry_api_key_${user.id}`, key);
    setApiKey(key);
    
    toast.success("API key generated successfully!");
    setRegenerating(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const maskedKey = apiKey ? `${apiKey.slice(0, 8)}${'•'.repeat(24)}${apiKey.slice(-4)}` : null;

  if (loading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-secondary/5">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isStudio) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 p-4">
        <div className="max-w-4xl mx-auto py-16">
          <UpgradePrompt 
            feature="API Access" 
            requiredTier="studio"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 p-4">
      <div className="max-w-4xl mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
            API Access
          </h1>
          <p className="text-muted-foreground">
            Integrate Artistry.ng into your applications with our REST API
          </p>
        </div>

        <div className="grid gap-6">
          {/* API Key Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    Your API Key
                  </CardTitle>
                  <CardDescription>
                    Use this key to authenticate API requests
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="bg-green-500/20 text-green-600">
                  <Shield className="w-3 h-3 mr-1" />
                  Studio Access
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {apiKey ? (
                <div className="flex gap-2">
                  <Input
                    value={showKey ? apiKey : maskedKey || ""}
                    readOnly
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? "Hide" : "Show"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(apiKey)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground">No API key generated yet</p>
              )}
              
              <Button
                onClick={generateApiKey}
                disabled={regenerating}
                variant={apiKey ? "outline" : "hero"}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${regenerating ? 'animate-spin' : ''}`} />
                {apiKey ? "Regenerate Key" : "Generate API Key"}
              </Button>
              
              {apiKey && (
                <p className="text-sm text-muted-foreground">
                  ⚠️ Keep your API key secure. Never expose it in client-side code.
                </p>
              )}
            </CardContent>
          </Card>

          {/* API Documentation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                Quick Start
              </CardTitle>
              <CardDescription>
                Get started with the Artistry.ng API
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="profiles">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="profiles">Profiles</TabsTrigger>
                  <TabsTrigger value="projects">Projects</TabsTrigger>
                  <TabsTrigger value="matches">Matches</TabsTrigger>
                </TabsList>
                
                <TabsContent value="profiles" className="mt-4">
                  <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                    <pre className="text-foreground">{`// Search for creatives
GET /api/v1/profiles?role=producer&location=lagos

// Headers
Authorization: Bearer ${apiKey || 'YOUR_API_KEY'}
Content-Type: application/json

// Response
{
  "data": [
    {
      "id": "uuid",
      "full_name": "Artist Name",
      "roles": ["producer", "musician"],
      "location": "Lagos, Nigeria"
    }
  ],
  "total": 42
}`}</pre>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => copyToClipboard(`curl -X GET "https://api.artistry.ng/v1/profiles?role=producer" -H "Authorization: Bearer ${apiKey || 'YOUR_API_KEY'}"`)}
                  >
                    <Copy className="w-3 h-3 mr-2" />
                    Copy cURL
                  </Button>
                </TabsContent>

                <TabsContent value="projects" className="mt-4">
                  <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                    <pre className="text-foreground">{`// Create a public project
POST /api/v1/projects

// Headers
Authorization: Bearer ${apiKey || 'YOUR_API_KEY'}
Content-Type: application/json

// Body
{
  "title": "New Music Video",
  "description": "Looking for a videographer",
  "looking_for": ["videographer", "dancer"],
  "is_public": true
}

// Response
{
  "id": "uuid",
  "title": "New Music Video",
  "status": "pending"
}`}</pre>
                  </div>
                </TabsContent>

                <TabsContent value="matches" className="mt-4">
                  <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
                    <pre className="text-foreground">{`// Get your matches
GET /api/v1/matches

// Headers
Authorization: Bearer ${apiKey || 'YOUR_API_KEY'}

// Response
{
  "data": [
    {
      "match_id": "uuid",
      "matched_with": {
        "id": "uuid",
        "full_name": "Creative Name",
        "roles": ["musician"]
      },
      "matched_at": "2025-01-10T12:00:00Z"
    }
  ]
}`}</pre>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Rate Limits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Rate Limits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-2xl font-bold text-primary">1,000</p>
                  <p className="text-sm text-muted-foreground">Requests/hour</p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-2xl font-bold text-primary">10,000</p>
                  <p className="text-sm text-muted-foreground">Requests/day</p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-2xl font-bold text-primary">Unlimited</p>
                  <p className="text-sm text-muted-foreground">Read operations</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Endpoints List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Available Endpoints
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { method: "GET", path: "/api/v1/profiles", desc: "Search creative profiles" },
                  { method: "GET", path: "/api/v1/profiles/:id", desc: "Get profile details" },
                  { method: "GET", path: "/api/v1/matches", desc: "List your matches" },
                  { method: "POST", path: "/api/v1/projects", desc: "Create a project" },
                  { method: "GET", path: "/api/v1/projects", desc: "List your projects" },
                  { method: "GET", path: "/api/v1/projects/:id", desc: "Get project details" },
                  { method: "POST", path: "/api/v1/projects/:id/members", desc: "Add project member" },
                  { method: "GET", path: "/api/v1/team", desc: "Get team members" },
                ].map((endpoint, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                    <Badge 
                      variant={endpoint.method === "GET" ? "secondary" : "default"}
                      className={endpoint.method === "GET" ? "bg-blue-500/20 text-blue-600" : "bg-green-500/20 text-green-600"}
                    >
                      {endpoint.method}
                    </Badge>
                    <code className="text-sm font-mono flex-1">{endpoint.path}</code>
                    <span className="text-sm text-muted-foreground">{endpoint.desc}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ApiAccess;
