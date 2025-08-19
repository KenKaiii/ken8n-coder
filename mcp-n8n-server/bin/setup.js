#!/usr/bin/env node

import readline from 'readline';
import fs from 'fs';
import path from 'path';
import os from 'os';

// ANSI color codes for better UX
const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

class N8nSetup {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async question(prompt) {
    return new Promise((resolve) => {
      this.rl.question(prompt, resolve);
    });
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async testConnection(baseUrl, apiKey) {
    try {
      const url = `${baseUrl.replace(/\/$/, '')}/api/v1/workflows`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-N8N-API-KEY': apiKey,
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please check your API key.');
        } else if (response.status === 404) {
          throw new Error('n8n API not found. Please check your n8n URL.');
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      const data = await response.json();
      return {
        success: true,
        workflowCount: data.data?.length || 0
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Connection timed out. Please check your n8n URL and network connection.');
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error('Cannot connect to n8n. Is it running at the specified URL?');
      } else {
        throw error;
      }
    }
  }

  generateClaudeMcpConfig(baseUrl, apiKey) {
    const mcpConfig = {
      "mcpServers": {
        "ken8n": {
          "command": "npx",
          "args": ["-y", "@kenkaiii/ken8n-mcp"],
          "env": {
            "N8N_BASE_URL": baseUrl,
            "N8N_API_KEY": apiKey
          }
        }
      }
    };
    
    return JSON.stringify(mcpConfig, null, 2);
  }

  showClaudeMcpConfig(baseUrl, apiKey) {
    this.log('\n📋 Add this to your Claude Desktop config (~/.config/claude-desktop/claude_mcp.json):', 'bold');
    const configText = this.generateClaudeMcpConfig(baseUrl, apiKey);
    console.log(colors.blue + configText + colors.reset);
    
    this.log('\n💡 If you already have other MCP servers, add just the "n8n" entry to your existing "mcpServers" section.', 'yellow');
    this.log('💡 The -y flag ensures the latest version is always used from NPM.', 'yellow');
  }

  async run() {
    try {
      this.log('🚀 n8n MCP Server Setup', 'bold');
      this.log('='.repeat(50), 'blue');
      
      // Get n8n URL
      this.log('\n📡 Enter your n8n instance details:', 'bold');
      const defaultUrl = 'http://localhost:5678';
      const baseUrl = await this.question(`n8n URL (${defaultUrl}): `) || defaultUrl;
      
      // Get API key
      this.log('\n🔑 Get your API key from n8n: Settings → n8n API → Create new key', 'yellow');
      let apiKey = '';
      while (!apiKey.trim()) {
        apiKey = await this.question('API Key: ');
        if (!apiKey.trim()) {
          this.log('❌ API key is required!', 'red');
        }
      }

      // Test connection
      this.log('\n🔍 Testing connection...', 'blue');
      try {
        const testResult = await this.testConnection(baseUrl, apiKey);
        this.log(`✅ Connection successful! Found ${testResult.workflowCount} workflows.`, 'green');
      } catch (error) {
        this.log(`❌ Connection failed: ${error.message}`, 'red');
        const retry = await this.question('\nWould you like to try different settings? (y/n): ');
        if (retry.toLowerCase() === 'y') {
          return this.run(); // Restart
        } else {
          this.log('Setup cancelled.', 'yellow');
          return;
        }
      }

      // Show Claude MCP setup instructions with actual values
      this.log('\n💾 Configuration ready!', 'green');
      this.showClaudeMcpConfig(baseUrl, apiKey);

      this.log('\n🎉 Setup complete!', 'green');
      this.log('\nYou can now use the n8n MCP server in Claude Desktop.', 'blue');
      this.log('\n💡 Pro tip: Restart Claude Desktop after updating the config file.', 'yellow');

    } catch (error) {
      this.log(`\n❌ Setup failed: ${error.message}`, 'red');
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Setup cancelled.');
  process.exit(0);
});

// Run setup
const setup = new N8nSetup();
setup.run();