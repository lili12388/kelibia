import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/navbar";

export default function TestAnalyticsPage() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (test: string, result: any) => {
    setResults(prev => [...prev, { test, result, timestamp: new Date().toLocaleTimeString() }]);
  };

  const testClientTracking = async () => {
    setLoading(true);
    try {
      console.log('🧪 Testing client-side analytics tracking...');
      
      const response = await fetch('/api/analytics/pageview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          pageUrl: '/test-analytics',
          referrer: document.referrer,
        }),
      });
      
      const result = await response.json();
      addResult('Client Tracking', { status: response.status, data: result });
    } catch (error) {
      addResult('Client Tracking', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
    setLoading(false);
  };

  const testForceData = async () => {
    setLoading(true);
    try {
      console.log('🧪 Testing force data insertion...');
      
      const response = await fetch('/api/admin/analytics/force-test-data', {
        method: 'POST',
        credentials: 'include',
      });
      
      const result = await response.json();
      addResult('Force Test Data', { status: response.status, data: result });
    } catch (error) {
      addResult('Force Test Data', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
    setLoading(false);
  };

  const testAnalyticsSummary = async () => {
    setLoading(true);
    try {
      console.log('🧪 Testing analytics summary...');
      
      const response = await fetch('/api/admin/analytics/summary', {
        credentials: 'include',
      });
      
      const result = await response.json();
      addResult('Analytics Summary', { status: response.status, data: result });
    } catch (error) {
      addResult('Analytics Summary', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
    setLoading(false);
  };

  const testHeartbeat = async () => {
    setLoading(true);
    try {
      console.log('🧪 Testing heartbeat...');
      
      const response = await fetch('/api/analytics/heartbeat', {
        method: 'POST',
        credentials: 'include',
      });
      
      const result = await response.json();
      addResult('Heartbeat', { status: response.status, data: result });
    } catch (error) {
      addResult('Heartbeat', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
    setLoading(false);
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-4xl mx-auto p-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>🧪 Analytics Testing Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Button 
                onClick={testClientTracking} 
                disabled={loading}
                variant="outline"
              >
                Test Client Tracking
              </Button>
              
              <Button 
                onClick={testForceData} 
                disabled={loading}
                variant="outline"
              >
                Force Test Data
              </Button>
              
              <Button 
                onClick={testAnalyticsSummary} 
                disabled={loading}
                variant="outline"
              >
                Get Analytics
              </Button>
              
              <Button 
                onClick={testHeartbeat} 
                disabled={loading}
                variant="outline"
              >
                Test Heartbeat
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={clearResults} variant="secondary" size="sm">
                Clear Results
              </Button>
              <Button 
                onClick={() => window.location.reload()} 
                variant="secondary" 
                size="sm"
              >
                Refresh Page
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <p className="text-muted-foreground">No tests run yet. Click the buttons above to test analytics.</p>
            ) : (
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div key={index} className="border rounded p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold">{result.test}</h3>
                      <span className="text-sm text-muted-foreground">{result.timestamp}</span>
                    </div>
                    <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                      {JSON.stringify(result.result, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>📋 Testing Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">🎯 What to Test & Report:</h4>
              <ol className="space-y-2 text-sm">
                <li><strong>1. Test Client Tracking</strong> - Should return status 200 with "success: true"</li>
                <li><strong>2. Force Test Data (as admin)</strong> - Should insert test analytics data</li>
                <li><strong>3. Get Analytics</strong> - Should show numbers greater than 0 instead of all zeros</li>
                <li><strong>4. Test Heartbeat</strong> - Should return "success: true"</li>
              </ol>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">🔍 What to Check:</h4>
              <ul className="space-y-1 text-sm">
                <li>• <strong>Browser Console (F12):</strong> Look for messages starting with 🔵 CLIENT</li>
                <li>• <strong>Test Results:</strong> Copy any error messages from the results above</li>
                <li>• <strong>Analytics Page:</strong> Check if numbers change from 0 to actual values</li>
              </ul>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">📤 What to Report Back:</h4>
              <ul className="space-y-1 text-sm">
                <li>• Screenshot of test results (especially any errors)</li>
                <li>• Copy-paste any error messages</li>
                <li>• Whether analytics page still shows all zeros</li>
                <li>• Any console error messages (F12 → Console tab)</li>
              </ul>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">🚨 Common Issues to Check:</h4>
              <ul className="space-y-1 text-sm">
                <li>• <strong>Network errors:</strong> "Failed to fetch" = server connection issue</li>
                <li>• <strong>404 errors:</strong> API endpoints not found</li>
                <li>• <strong>500 errors:</strong> Server/database issues</li>
                <li>• <strong>No console logs:</strong> Client tracking not running</li>
              </ul>
            </div>
          </CardContent>
        </Card>
        
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>🔧 Server Commands (if needed)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-100 p-4 rounded font-mono text-sm space-y-2">
              <p># Check server logs:</p>
              <p>pm2 logs darna</p>
              <p></p>
              <p># Restart server:</p>
              <p>pm2 restart darna</p>
              <p></p>
              <p># Check if server is running:</p>
              <p>pm2 status</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
