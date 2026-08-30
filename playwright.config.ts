import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./tests/e2e',use:{baseURL:'http://127.0.0.1:5173',trace:'retain-on-failure',channel:'chrome'},webServer:{command:'npm run dev:e2e',url:'http://127.0.0.1:5173',reuseExistingServer:false,timeout:120000}});
