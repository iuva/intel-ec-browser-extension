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
    const pkg = readJsonFile("package.json")
    const appVersion = `V${pkg.version}`
    // Load environment variables
    const env = loadEnv(mode, process.cwd(), '')

    console.log('Environment variables::::', env)
    console.log('Target browser:', env.TARGET || 'chrome')

    // Validate browser parameter, default to chrome
    const validBrowsers = ['chrome', 'firefox', 'edge']
    const targetBrowser = validBrowsers.includes(env.TARGET) ? env.TARGET : 'chrome'

    return {
        define: {
            "import.meta.env.VITE_APP_VERSION": JSON.stringify(appVersion),
        },
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
            chunkSizeWarningLimit: 1000,
            // Content script 无法引用相对资源路径，小图标资源需内联为 data URL（默认 4096 仅够小图）
            assetsInlineLimit: 20480,
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
