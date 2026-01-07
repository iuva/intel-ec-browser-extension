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
    // 加载环境变量
    const env = loadEnv(mode, process.cwd(), '')

    console.log('环境变量：：：：', env)
    console.log('目标浏览器：', env.TARGET || 'chrome')

    // 验证浏览器参数，默认为chrome
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
            // 防止ECONNRESET错误
            hmr: {
                overlay: false, // 禁用错误覆盖层
                protocol: 'ws',
                host: 'localhost'
            },
            watch: {
                // 减少文件监视频率，降低内存使用
                usePolling: false,
                interval: 1000
            }
        },
        build: {
            // 优化构建配置
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
