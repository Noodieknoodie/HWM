#!/usr/bin/env node

import { spawn, exec } from 'child_process';
import os from 'os';

console.log('\n🚀 Starting development server...\n');
console.log('📝 Note: A mock login page will open in 7 seconds\n');
console.log('   Enter "authenticated" in the Roles field and click Login\n');

// Start the SWA dev server
const swa = spawn('swa', [
  'start', 
  'http://localhost:5173',
  '--run', 
  'vite --host',
  '--data-api-location',
  'swa-db-connections',
  '--port',
  '4280'
], { 
  stdio: 'inherit',
  shell: true 
});

// Wait for server to start, then open login page
setTimeout(() => {
  const url = 'http://localhost:4280/.auth/login/testing';
  console.log('\n🔐 Opening mock login page...\n');
  
  // Cross-platform open command
  const platform = os.platform();
  let command;
  
  if (platform === 'win32') {
    command = `start ${url}`;
  } else if (platform === 'darwin') {
    command = `open ${url}`;
  } else {
    command = `xdg-open ${url}`;
  }
  
  exec(command, (err) => {
    if (err) {
      console.log(`\n⚠️  Couldn't auto-open browser. Please manually navigate to:\n   ${url}\n`);
    }
  });
}, 7000);

// Handle exit
process.on('SIGINT', () => {
  swa.kill();
  process.exit();
});