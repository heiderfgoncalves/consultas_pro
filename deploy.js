#!/usr/bin/env node

/**
 * Script de Automação de Deploy - Consultas PRO
 * 
 * Lógica:
 * 1. Detecta alterações usando git status
 * 2. Agrupa os arquivos modificados/novos por temas inteligentes
 * 3. Commita cada tema separadamente
 * 4. Faz git push
 * 5. Dispara as requisições GET para os webhooks do Easypanel correspondentes
 */

const { execSync } = require('child_process');
const http = require('http');

const WEBHOOKS = {
  frontend: 'http://69.62.98.167:3000/api/deploy/c37bac2b8bbe093e81bc706a3451271c1c16c5211a9a2677',
  backend: 'http://69.62.98.167:3000/api/deploy/8452be1b3670670ee7b1c4b348d7d94d1ed752bfd9f270a8'
};

// Captura argumentos da linha de comando
const target = process.argv[2] ? process.argv[2].toLowerCase() : 'all';

// Função auxiliar para rodar comando de shell síncrono
function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch (err) {
    console.error(`❌ Erro ao executar: "${cmd}"`);
    console.error(err.stdout || err.stderr || err.message);
    process.exit(1);
  }
}

// Função para classificar o tema baseado no caminho do arquivo
function getTheme(filePath) {
  // Ajuste especial para Dockerfiles e configurações Nginx
  if (filePath.includes('Dockerfile') || filePath.includes('nginx.conf')) {
    if (filePath.startsWith('frontend')) return 'frontend/docker';
    if (filePath.startsWith('backend')) return 'backend/docker';
  }

  const parts = filePath.split('/');
  if (parts.length === 1) return 'root';

  const rootDir = parts[0]; // frontend ou backend
  if (rootDir === 'frontend' || rootDir === 'backend') {
    // Se estiver em features (ex: frontend/src/features/templates-drawer/...)
    if (parts.includes('features')) {
      const featIndex = parts.indexOf('features');
      if (parts[featIndex + 1]) {
        return `${rootDir}/${parts[featIndex + 1]}`;
      }
    }
    // Outras pastas diretas (ex: backend/prisma -> backend/prisma)
    if (parts[1] && parts[1] !== 'src') {
      return `${rootDir}/${parts[1]}`;
    }
    if (parts[2]) {
      return `${rootDir}/${parts[1]}/${parts[2]}`;
    }
    return rootDir;
  }

  return parts[0];
}

// Envia uma requisição HTTP GET de forma nativa e retorna uma Promise
function sendGet(url) {
  return new Promise((resolve) => {
    console.log(`📡 Disparando webhook: ${url}`);
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`✅ Resposta recebida (Status: ${res.statusCode})`);
        resolve({ success: res.statusCode >= 200 && res.statusCode < 300, data });
      });
    }).on('error', (err) => {
      console.error(`❌ Falha ao conectar ao webhook: ${err.message}`);
      resolve({ success: false, error: err.message });
    });
  });
}

async function main() {
  console.log('🚀 Iniciando processo automatizado de deploy...');

  // 1. Obter lista de arquivos alterados e não rastreados
  const gitStatus = run('git status --porcelain');
  if (!gitStatus) {
    console.log('ℹ️ Nenhuma alteração pendente no repositório. Pulando commits...');
  } else {
    const lines = gitStatus.split('\n').filter(Boolean);
    const groups = {};

    // Mapeia cada arquivo para seu respectivo grupo temático
    for (const line of lines) {
      const status = line.slice(0, 2).trim();
      const filePath = line.slice(2).trim().replace(/^"|"$/g, ''); // Usa slice(2) de forma correta e robusta

      const theme = getTheme(filePath);
      if (!groups[theme]) {
        groups[theme] = [];
      }
      groups[theme].push({ filePath, status });
    }

    console.log(`📦 Alterações detectadas agrupadas em ${Object.keys(groups).length} tema(s):`);
    for (const theme in groups) {
      console.log(`   📂 [${theme}]: ${groups[theme].map(f => f.filePath).join(', ')}`);
    }

    // 2. Realizar os commits por tema
    for (const theme in groups) {
      console.log(`\n⚙️ Commitando alterações para o tema: [${theme}]...`);
      const files = groups[theme].map(f => `"${f.filePath}"`).join(' ');
      
      // Adiciona apenas os arquivos do tema
      run(`git add ${files}`);

      // Determina mensagem de commit semântica
      let type = 'feat';
      if (theme.includes('docker') || theme.includes('nginx') || theme === 'root') {
        type = 'chore';
      } else if (groups[theme].every(f => f.filePath.endsWith('.css') || f.filePath.endsWith('.scss'))) {
        type = 'style';
      } else if (groups[theme].every(f => f.filePath.endsWith('.spec.ts') || f.filePath.endsWith('.test.tsx'))) {
        type = 'test';
      }

      const commitMessage = `${type}(${theme}): sync and deploy changes automatically`;
      run(`git commit -m "${commitMessage}"`);
      console.log(`   ↳ Commit realizado: "${commitMessage}"`);
    }

    // 3. Executar o Push para o GitHub
    console.log('\n📤 Enviando commits para o repositório remoto (git push)...');
    run('git push');
    console.log('✅ Sincronização com o GitHub concluída com sucesso!');
  }

  // 4. Disparar webhooks de deploy
  console.log('\n⚡ Acionando webhooks do Easypanel para deploy...');
  if (target === 'frontend') {
    await sendGet(WEBHOOKS.frontend);
  } else if (target === 'backend') {
    await sendGet(WEBHOOKS.backend);
  } else {
    // Default: 'all'
    await sendGet(WEBHOOKS.frontend);
    await sendGet(WEBHOOKS.backend);
  }

  console.log('\n🎉 Processo de deploy concluído com sucesso total!');
}

main().catch(err => {
  console.error('🔥 Erro crítico na execução do deploy:', err);
  process.exit(1);
});
