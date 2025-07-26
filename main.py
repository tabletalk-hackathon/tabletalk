#!/usr/bin/env python3
"""
Script to interact with MCP OSM server and Mistral AI
MCP servers communicate via stdio, not HTTP
"""

import os
import json
import asyncio
import subprocess
from pathlib import Path
import httpx

def load_env_file(filename=".env"):
    """Load environment variables from .env file directly"""
    env_vars = {}
    env_path = Path(filename)
    
    if env_path.exists():
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip().strip('"').strip("'")
    return env_vars

# Load environment variables from .env file
env_vars = load_env_file()

class MCPOSMClient:
    def __init__(self):
        self.process = None
        
    async def connect_to_server(self):
        """Connect to existing MCP OSM server"""
        try:
            # Start a new connection to the MCP server
            self.process = await asyncio.create_subprocess_exec(
                'uvx', 'osm-mcp-server',
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            print("✅ Connected to MCP OSM server")
        except Exception as e:
            print(f"❌ Failed to connect to MCP server: {e}")
            return False
        return True
    
    async def send_request(self, method: str, params: dict, request_id: int = None):
        """Send a JSON-RPC request to the MCP server"""
        if not self.process:
            raise RuntimeError("MCP server not started")
        
        if request_id is None:
            request_id = getattr(self, '_request_id', 0) + 1
            self._request_id = request_id
            
        request = {
            "jsonrpc": "2.0",
            "id": request_id,
            "method": method,
            "params": params
        }
        
        request_json = json.dumps(request) + '\n'
        print(f"📤 Sending: {request_json.strip()}")
        self.process.stdin.write(request_json.encode())
        await self.process.stdin.drain()
        
        # Read response
        response_line = await self.process.stdout.readline()
        response = json.loads(response_line.decode())
        print(f"📥 Received: {json.dumps(response, indent=2)}")
        return response
    
    async def initialize(self):
        """Initialize the MCP connection"""
        init_request = {
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "tools": {}
            },
            "clientInfo": {
                "name": "osm-mistral-client",
                "version": "1.0.0"
            }
        }
        response = await self.send_request("initialize", init_request, 1)
        
        # Send initialized notification after successful init
        if 'result' in response:
            initialized_notification = {
                "jsonrpc": "2.0",
                "method": "notifications/initialized",
                "params": {}
            }
            notification_json = json.dumps(initialized_notification) + '\n'
            print(f"📤 Sending notification: {notification_json.strip()}")
            self.process.stdin.write(notification_json.encode())
            await self.process.stdin.drain()
        
        return response
    
    async def list_tools(self):
        """List available tools"""
        return await self.send_request("tools/list", {})
    
    async def call_tool(self, name: str, arguments: dict):
        """Call a specific tool"""
        return await self.send_request("tools/call", {
            "name": name,
            "arguments": arguments
        })
    
    async def close(self):
        """Close the MCP server connection"""
        if self.process:
            self.process.terminate()
            await self.process.wait()

class MistralClient:
    def __init__(self, env_vars):
        self.api_key = env_vars.get("MISTRAL_API_KEY")
        if not self.api_key:
            print("⚠️  MISTRAL_API_KEY not found in .env file - skipping Mistral integration")
            self.api_key = None
        
        self.base_url = "https://api.mistral.ai/v1"
    
    async def chat_completion(self, messages: list):
        """Send chat completion request to Mistral"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "mistral-small-latest",
                    "messages": messages
                }
            )
            return response.json()

async def main():
    """Main function demonstrating MCP OSM + Mistral integration"""
    
    # Initialize clients
    osm_client = MCPOSMClient()
    mistral_client = MistralClient(env_vars)
    
    try:
        # Connect to MCP server
        if not await osm_client.connect_to_server():
            return
        
        # Initialize MCP connection
        print("🔌 Initializing MCP connection...")
        init_response = await osm_client.initialize()
        print(f"Initialization: {init_response}")
        
        # List available tools
        print("🛠️  Listing available tools...")
        tools_response = await osm_client.list_tools()
        
        available_tools = tools_response.get('result', {}).get('tools', [])
        print(f"Available tools ({len(available_tools)}):")
        for tool in available_tools:
            print(f"  - {tool['name']}: {tool.get('description', 'No description')}")
        
        if not available_tools:
            print("❌ No tools available - something might be wrong with the MCP server")
            return
        
        # Use hardcoded coordinates: 52°21'40.8"N 4°55'05.1"E
        lat = 52.3613333  # 52°21'40.8"N
        lon = 4.9180833   # 4°55'05.1"E
        print(f"📍 Using coordinates: {lat}, {lon}")
        
        # Find nearby restaurants
        print("🍽️  Finding nearby restaurants...")
        restaurants_response = await osm_client.call_tool(
            "find_nearby_places",
            {
                "latitude": lat,
                "longitude": lon,
                "radius": 500,
                "categories": ["amenity"],
                "limit": 10
            }
        )
        
        if 'result' in restaurants_response and restaurants_response['result']['content']:
            places_data = json.loads(restaurants_response['result']['content'][0]['text'])
            
            # Filter for restaurants specifically
            restaurants = []
            if 'amenity' in places_data.get('results', {}):
                for subcategory, places in places_data['results']['amenity'].items():
                    if subcategory in ['restaurant', 'cafe', 'fast_food', 'bar', 'pub']:
                        restaurants.extend(places)
            
            print(f"🍴 Found {len(restaurants)} restaurants:")
            for restaurant in restaurants[:5]:  # Show first 5
                name = restaurant.get('name', 'Unnamed restaurant')
                cuisine = restaurant.get('tags', {}).get('cuisine', 'Unknown cuisine')
                print(f"  - {name} ({cuisine})")
            
            # Ask Mistral to analyze the restaurants (if API key available)
            if mistral_client.api_key and restaurants:
                messages = [
                    {
                        "role": "user",
                        "content": f"""
                        Here are some restaurants near coordinates {lat}, {lon}:
                        {json.dumps(restaurants[:5], indent=2)}
                        
                        Provide a brief recommendation about which restaurant might be most interesting to visit and why.
                        """
                    }
                ]
                
                print("\n🤖 Asking Mistral to analyze the restaurants...")
                mistral_response = await mistral_client.chat_completion(messages)
                
                if 'choices' in mistral_response and mistral_response['choices']:
                    analysis = mistral_response['choices'][0]['message']['content']
                    print(f"\n📝 Mistral's Restaurant Recommendation:\n{analysis}")
                else:
                    print("❌ Failed to get response from Mistral")
            else:
                print("\n💡 Skipping Mistral analysis (no API key provided or no restaurants found)")
        else:
            print("❌ Failed to find nearby restaurants")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        # Clean up
        await osm_client.close()

if __name__ == "__main__":
    asyncio.run(main())