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
import logging
import argparse

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

def setup_logging(log_level='INFO'):
    """Configure logging with specified level"""
    level = getattr(logging, log_level.upper(), logging.INFO)
    logging.basicConfig(
        level=level,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler()
        ]
    )
    return logging.getLogger(__name__)

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
            logger.info("✅ Connected to MCP OSM server")
        except Exception as e:
            logger.error(f"❌ Failed to connect to MCP server: {e}")
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
        logger.debug(f"📤 Sending: {request_json.strip()}")
        self.process.stdin.write(request_json.encode())
        await self.process.stdin.drain()
        
        # Read response
        response_line = await self.process.stdout.readline()
        response = json.loads(response_line.decode())
        logger.debug(f"📥 Received: {json.dumps(response, indent=2)}")
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
            logger.debug(f"📤 Sending notification: {notification_json.strip()}")
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
            logger.warning("⚠️  MISTRAL_API_KEY not found in .env file - skipping Mistral integration")
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
        logger.info("🔌 Initializing MCP connection...")
        init_response = await osm_client.initialize()
        logger.debug(f"Initialization: {init_response}")
        
        # List available tools
        logger.info("🛠️  Listing available tools...")
        tools_response = await osm_client.list_tools()
        
        available_tools = tools_response.get('result', {}).get('tools', [])
        logger.info(f"Available tools ({len(available_tools)}):")
        for tool in available_tools:
            logger.info(f"  - {tool['name']}: {tool.get('description', 'No description')}")
        
        if not available_tools:
            logger.error("❌ No tools available - something might be wrong with the MCP server")
            return
        
        # Use hardcoded coordinates: 52°21'40.8"N 4°55'05.1"E
        lat = 52.3613333  # 52°21'40.8"N
        lon = 4.9180833   # 4°55'05.1"E
        logger.info(f"📍 Using coordinates: {lat}, {lon}")
        
        # Find nearby restaurants
        logger.info("🍽️  Finding nearby restaurants...")
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
            if 'amenity' in places_data.get('categories', {}):
                for subcategory, places in places_data['categories']['amenity'].items():
                    if subcategory in ['restaurant', 'cafe', 'fast_food', 'bar', 'pub']:
                        restaurants.extend(places)
            
            
            # Enhance restaurants with phone and website info
            enhanced_restaurants = []
            for restaurant in restaurants:
                # Extract phone and website from tags
                tags = restaurant.get('tags', {})
                phone = tags.get('phone') or tags.get('contact:phone')
                website = tags.get('website') or tags.get('contact:website')
                
                # Add phone and website to restaurant data
                enhanced_restaurant = restaurant.copy()
                enhanced_restaurant['phone'] = phone
                enhanced_restaurant['website'] = website
                enhanced_restaurants.append(enhanced_restaurant)
            
            result = {
                "status": "success",
                "location": {
                    "latitude": lat,
                    "longitude": lon
                },
                "restaurants_found": len(enhanced_restaurants),
                "restaurants": enhanced_restaurants
            }
            
            print(json.dumps(result, indent=2))
            return result
        else:
            result = {
                "status": "success",
                "location": {
                    "latitude": lat,
                    "longitude": lon
                },
                "restaurants_found": 0,
                "restaurants": []
            }
            print(json.dumps(result, indent=2))
            return result
            
    except Exception as e:
        result = {
            "status": "error",
            "error": str(e)
        }
        print(json.dumps(result, indent=2))
        return result
    finally:
        # Clean up
        await osm_client.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='MCP OSM server client with Mistral AI integration')
    parser.add_argument('--log-level', default='INFO', 
                       choices=['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'],
                       help='Set the logging level (default: INFO)')
    args = parser.parse_args()
    
    logger = setup_logging(args.log_level)
    asyncio.run(main())