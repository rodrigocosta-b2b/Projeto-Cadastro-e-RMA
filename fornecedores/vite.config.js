import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
// Plataforma de Cadastro de Fornecedores — build separado do Service Desk (raiz do repo).
// Usa as dependências do package.json da raiz. Saída em fornecedores/dist/.
const root = fileURLToPath(new URL('.', import.meta.url))
export default defineConfig({ root, plugins: [react()], build: { outDir: 'dist', emptyOutDir: true } })
