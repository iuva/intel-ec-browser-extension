import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import webExtension, { readJsonFile } from "vite-plugin-web-extension";

function generateManifest() {
  const manifest = readJsonFile("src/manifest.json");
  const pkg = readJsonFile("package.json");
  return {
    name: pkg.name,
    description: pkg.description,
    version: pkg.version,
    ...manifest,
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    // Load environment variables
    const env = loadEnv(mode, process.cwd(), '')

    console.log('Environment variables::::', env)
    console.log('Target browser:', env.TARGET || 'chrome')

    // Validate browser parameter, default to chrome
    const validBrowsers = ['chrome', 'firefox', 'edge']
    const targetBrowser = validBrowsers.includes(env.TARGET) ? env.TARGET : 'chrome'

    return {
        resolve: {
            alias: [
                {
                    find: /\/@\//,
                    replacement: '/src/',
                },
            ],
        },
        server: {
            // Prevent ECONNRESET errors
            hmr: {
                overlay: false, // Disable error overlay
                protocol: 'ws',
                host: 'localhost'
            },
            watch: {
                // Reduce file watching frequency to lower memory usage
                usePolling: false,
                interval: 1000
            }
        },
        build: {
            // Optimize build configuration
            minify: 'esbuild',
            sourcemap: false,
            chunkSizeWarningLimit: 1000
        },
        plugins: [
            vue(),
            webExtension({
                manifest: generateManifest,
                watchFilePaths: ["package.json", "manifest.json"],
                browser: targetBrowser
            }),
        ],
    }
});
