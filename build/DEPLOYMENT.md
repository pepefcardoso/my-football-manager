# 🚀 Football Manager 2D - Guia de Deployment

## Visão Geral

Este documento descreve o processo completo de build, teste e distribuição da aplicação **Football Manager 2D** para Windows, macOS e Linux.

---

## 📋 Índice

1. [Pré-requisitos](#-pré-requisitos)
2. [Estrutura de Build](#-estrutura-de-build)
3. [Processo de Build](#-processo-de-build)
4. [Validação e Testes](#-validação-e-testes)
5. [Distribuição](#-distribuição)
6. [CI/CD Automation](#-cicd-automation)
7. [Troubleshooting](#-troubleshooting)

---

## 🛠️ Pré-requisitos

### Ferramentas Obrigatórias

| Ferramenta | Versão Mínima | Propósito                     |
| ---------- | ------------- | ----------------------------- |
| Node.js    | v20.0.0       | Runtime JavaScript            |
| npm        | v10.0.0       | Gerenciador de pacotes        |
| Python     | v3.11+        | Compilação de módulos nativos |
| Git        | v2.40+        | Controle de versão            |

### Ferramentas de Build por Plataforma

#### Windows

```powershell
# Visual Studio Build Tools (obrigatório)
npm install --global --production windows-build-tools

# Ou instalar Visual Studio 2022 Community com:
# - "Desktop development with C++"
# - "MSVC v143 - VS 2022 C++ x64/x86 build tools"
# - "Windows 10/11 SDK"
```

#### macOS

```bash
# Xcode Command Line Tools
xcode-select --install

# Homebrew (opcional, para ImageMagick)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install imagemagick
```

#### Linux (Ubuntu/Debian)

```bash
sudo apt-get update
sudo apt-get install -y \
    build-essential \
    libsqlite3-dev \
    rpm \
    fakeroot \
    dpkg
```

---

## 🏗️ Estrutura de Build

### Diretórios de Build

```
football-manager-2d/
├── build/                    # Assets de build
│   ├── icon.ico             # Ícone Windows (256x256)
│   ├── icon.icns            # Ícone macOS (512x512@2x)
│   ├── icons/               # PNG multi-size (Linux)
│   │   ├── 16x16.png
│   │   ├── 32x32.png
│   │   ├── ...
│   │   └── 512x512.png
│   ├── entitlements.mac.plist
│   └── README.md
├── release/                  # Output dos builds
│   └── {version}/
│       ├── win-unpacked/
│       ├── linux-unpacked/
│       ├── mac/
│       ├── *.exe
│       ├── *.dmg
│       └── *.AppImage
├── dist/                     # Build do frontend (Vite)
├── dist-electron/            # Build do backend (Electron)
└── data/                     # Banco de dados e migrações
    ├── database.sqlite
    └── migrations/
```

### Dependências Críticas

#### Módulos Nativos (Requerem Rebuild)

- **better-sqlite3**: Banco de dados SQLite nativo
  - Rebuild obrigatório: `npm run rebuild`
  - Usado via `asarUnpack` no build final

#### Recursos Embarcados

- **data/migrations/**: Migrações do Drizzle ORM
  - Incluídos via `extraResources` no Electron Builder

---

## 🔨 Processo de Build

### 1️⃣ Preparação

```bash
# Clone o repositório
git clone https://github.com/your-org/football-manager-2d.git
cd football-manager-2d

# Instale dependências
npm install

# Rebuild módulos nativos para Electron
npm run rebuild

# Valide assets obrigatórios
ls -la build/
# Deve conter: icon.ico, icon.icns, icons/
```

### 2️⃣ Geração de Ícones (Primeira Vez)

Se você tem apenas uma imagem PNG de alta resolução:

```bash
# Dar permissão de execução ao script
chmod +x scripts/generate-icons.sh

# Gerar todos os ícones
./scripts/generate-icons.sh path/to/your/icon-1024x1024.png
```

**Resultado esperado:**

```
build/
├── icon.ico          ✅
├── icon.icns         ✅
└── icons/
    ├── 16x16.png     ✅
    ├── 32x32.png     ✅
    ├── ...
    └── 512x512.png   ✅
```

### 3️⃣ Validação Pré-Build

```bash
# Executar testes automatizados
chmod +x scripts/test-build.sh
./scripts/test-build.sh

# Validação manual
npm run lint           # Sem erros
npm run deps:validate  # Sem dependências circulares
npm audit              # Sem vulnerabilidades críticas
```

### 4️⃣ Build Local (Teste)

#### Unpacked (Mais Rápido)

```bash
npm run build:dir
```

**Output:** `release/{version}/win-unpacked/` (ou mac/linux)

#### Build Completo

```bash
# Todas as plataformas
npm run build

# Plataforma específica
npm run build:win      # Windows
npm run build:mac      # macOS
npm run build:linux    # Linux
npm run build:portable # Windows Portable apenas
```

### 5️⃣ Outputs Esperados

#### Windows

| Arquivo                                  | Tamanho Esperado | Descrição       |
| ---------------------------------------- | ---------------- | --------------- |
| `Football Manager 2D-1.0.0-x64.exe`      | ~80MB            | Instalador NSIS |
| `Football Manager 2D-1.0.0-Portable.exe` | ~78MB            | Versão portátil |

#### macOS

| Arquivo                                   | Tamanho Esperado | Descrição                              |
| ----------------------------------------- | ---------------- | -------------------------------------- |
| `Football Manager 2D-1.0.0-universal.dmg` | ~85MB            | Instalador DMG (Intel + Apple Silicon) |

#### Linux

| Arquivo                               | Tamanho Esperado | Descrição           |
| ------------------------------------- | ---------------- | ------------------- |
| `Football Manager 2D-1.0.0.AppImage`  | ~75MB            | Executável portátil |
| `football-manager-2d_1.0.0_amd64.deb` | ~73MB            | Pacote Debian       |

---

## ✅ Validação e Testes

### Teste em Ambiente Limpo (Obrigatório)

#### Windows (VM ou Máquina Limpa)

1. **Instalar via NSIS**:

   ```powershell
   ./Football_Manager_2D-1.0.0-x64.exe
   ```

   - ✅ Instalador executa sem erros
   - ✅ Atalho criado no Desktop
   - ✅ Atalho criado no Menu Iniciar

2. **Executar Aplicação**:

   - ✅ Aplicação abre em <5 segundos
   - ✅ Banco de dados criado em:
     ```
     %APPDATA%\football-manager-2d\database.sqlite
     ```
   - ✅ Criar novo save funciona
   - ✅ Fechar e reabrir carrega save corretamente

3. **Testar Portable**:

   ```powershell
   ./Football_Manager_2D-1.0.0-Portable.exe
   ```

   - ✅ Executa sem instalação
   - ✅ Cria pasta `data/` no mesmo diretório do .exe
   - ✅ Saves funcionam sem permissões especiais

4. **Desinstalar**:
   - ✅ Desinstalador remove aplicação completamente
   - ✅ Opção de manter/remover saves funciona

#### macOS (VM ou Máquina Teste)

1. **Instalar via DMG**:

   ```bash
   open Football_Manager_2D-1.0.0-universal.dmg
   # Arrastar para /Applications
   ```

   - ✅ DMG monta sem erros
   - ✅ Instalação via drag-and-drop funciona

2. **Primeira Execução**:

   ```bash
   open /Applications/Football\ Manager\ 2D.app
   ```

   - ✅ Aplicação abre sem avisos de Gatekeeper
   - ✅ Banco de dados criado em:
     ```
     ~/Library/Application Support/football-manager-2d/
     ```

3. **Teste de Arquitetura**:
   - ✅ Funciona em **Intel** (x64)
   - ✅ Funciona em **Apple Silicon** (arm64)

#### Linux (Ubuntu 22.04 / Debian 12)

1. **AppImage**:

   ```bash
   chmod +x Football_Manager_2D-1.0.0.AppImage
   ./Football_Manager_2D-1.0.0.AppImage
   ```

   - ✅ Executa sem dependências extras
   - ✅ Banco criado em `~/.config/football-manager-2d/`

2. **Pacote Debian**:
   ```bash
   sudo dpkg -i football-manager-2d_1.0.0_amd64.deb
   # Ou via Software Center
   ```
   - ✅ Instalação via dpkg funciona
   - ✅ Atalho aparece no menu de aplicações

### Checklist de Testes Funcionais

#### Críticos (Obrigatórios)

- [ ] **Novo Jogo**: Selecionar time → Começar jogo funciona
- [ ] **Persistência**: Save → Fechar → Reabrir → Load funciona
- [ ] **Simulação**: Simular partida não trava
- [ ] **Transferências**: Comprar/vender jogadores funciona
- [ ] **Avançar Dia**: Processar dia sem erros
- [ ] **Performance**: Uso de RAM <500MB

#### Desejáveis

- [ ] **Múltiplos Saves**: Criar 3+ saves diferentes
- [ ] **Nomes Especiais**: Saves com caracteres especiais (ç, ã, é)
- [ ] **Saves Grandes**: Saves >5MB carregam sem lag
- [ ] **Alt+Tab**: Aplicação não trava ao minimizar/restaurar

---

## 📦 Distribuição

### GitHub Release (Recomendado)

#### 1. Criar Tag de Versão

```bash
git tag -a v1.0.0 -m "Release v1.0.0 - Initial Production Build"
git push origin v1.0.0
```

#### 2. Gerar Checksums

```bash
cd release/1.0.0/

# Windows (PowerShell)
Get-FileHash *.exe -Algorithm SHA256 | Format-List

# macOS/Linux
shasum -a 256 * > checksums.txt
```

#### 3. Criar Release no GitHub

1. Ir para **Releases** → **Draft a new release**
2. Tag: `v1.0.0`
3. Title: `Football Manager 2D - v1.0.0`
4. Body (Markdown):

   ```markdown
   ## 🎮 Football Manager 2D - v1.0.0

   ### Features

   - ⚽ Simulador de partidas minuto a minuto
   - 💰 Sistema completo de transferências e finanças
   - 📊 Estatísticas detalhadas de jogadores e competições
   - 🏟️ Gestão de infraestrutura do clube

   ### Downloads

   | Plataforma       | Arquivo                                   | Tamanho |
   | ---------------- | ----------------------------------------- | ------- |
   | Windows          | `Football Manager 2D-1.0.0-x64.exe`       | 80MB    |
   | Windows Portable | `Football Manager 2D-1.0.0-Portable.exe`  | 78MB    |
   | macOS            | `Football Manager 2D-1.0.0-universal.dmg` | 85MB    |
   | Linux            | `Football Manager 2D-1.0.0.AppImage`      | 75MB    |
   | Linux            | `football-manager-2d_1.0.0_amd64.deb`     | 73MB    |

   ### SHA256 Checksums
   ```

   abc123... Football Manager 2D-1.0.0-x64.exe
   def456... Football Manager 2D-1.0.0-Portable.exe
   ghi789... Football Manager 2D-1.0.0-universal.dmg
   jkl012... Football Manager 2D-1.0.0.AppImage
   mno345... football-manager-2d_1.0.0_amd64.deb

   ```

   ```

5. Anexar todos os arquivos `.exe`, `.dmg`, `.AppImage`, `.deb`
6. Marcar como **Pre-release** inicialmente
7. Após validação final, desmarcar e publicar

---

## 🤖 CI/CD Automation

### GitHub Actions (Configurado)

**Trigger:**

- Push de tags `v*` (ex: `v1.0.0`)
- Manualmente via "Run workflow"

**Jobs:**

1. `build-windows`: Build Windows em `windows-latest`
2. `build-macos`: Build macOS em `macos-latest`
3. `build-linux`: Build Linux em `ubuntu-latest`
4. `create-release`: Cria release no GitHub com artifacts

**Uso:**

```bash
# Criar tag e push
git tag v1.0.0
git push origin v1.0.0

# GitHub Actions irá:
# 1. Buildar todas as plataformas em paralelo
# 2. Fazer upload dos artifacts
# 3. Criar draft release com todos os arquivos
```

**Monitorar:**

- GitHub → Actions → Build & Release
- Logs detalhados de cada job

---

## 🔧 Troubleshooting

### Erro: `better-sqlite3` não encontrado

**Sintoma:** Aplicação trava ao abrir banco de dados

**Solução:**

```bash
npm run rebuild
npm run postinstall
```

**Verificar:**

```bash
ls -la node_modules/better-sqlite3/build/Release/
# Deve existir: better_sqlite3.node
```

---

### Erro: `spawn ENOENT` (Windows)

**Sintoma:** Build falha com erro de spawn

**Solução:**

```powershell
# Instalar ferramentas de build
npm install --global --production windows-build-tools

# Ou Visual Studio 2022 Community
# https://visualstudio.microsoft.com/downloads/
```

---

### Erro: Ícones não aparecem no executável

**Sintoma:** Executável tem ícone padrão do Electron

**Solução:**

```bash
# Verificar se ícones existem
ls -la build/icon.ico build/icon.icns build/icons/

# Regenerar ícones se necessário
./scripts/generate-icons.sh path/to/source.png

# Rebuild
npm run build:win
```

---

### Erro: Build muito grande (>300MB)

**Sintoma:** Executável final >300MB

**Solução:**

1. Verificar se `node_modules` não está sendo incluído:

   ```json
   // electron-builder.json5
   "files": [
     "dist/**/*",
     "dist-electron/**/*",
     "package.json"
     // NÃO incluir "node_modules/**/*"
   ]
   ```

2. Excluir dev dependencies do build:

   ```json
   "asarUnpack": [
     "node_modules/better-sqlite3/**/*"
     // Apenas módulos nativos necessários
   ]
   ```

3. Otimizar assets:
   ```bash
   # Comprimir imagens PNG
   optipng build/icons/*.png
   ```

---

### Erro: macOS Gatekeeper bloqueia aplicação

**Sintoma:** "App can't be opened because it is from an unidentified developer"

**Solução Temporária (Usuário Final):**

```bash
xattr -cr /Applications/Football\ Manager\ 2D.app
```

**Solução Permanente (Desenvolvedor):**

- Assinar aplicação com Apple Developer Certificate
- Configurar `entitlements.mac.plist`
- Notarizar aplicação via `xcrun notarytool`

---

### Erro: Linux AppImage não executa

**Sintoma:** `Permission denied` ao executar AppImage

**Solução:**

```bash
chmod +x Football_Manager_2D-1.0.0.AppImage
./Football_Manager_2D-1.0.0.AppImage
```

---

## 📊 Métricas de Sucesso

### Build

- ✅ Tempo de build <10 minutos por plataforma
- ✅ Tamanho executável <100MB
- ✅ 0 warnings críticos no build

### Performance

- ✅ Tempo de inicialização <5 segundos
- ✅ Uso de RAM <500MB em idle
- ✅ Simulação de partida <60ms/minuto

### Distribuição

- ✅ 100% dos executáveis funcionam em máquinas limpas
- ✅ 0 bugs críticos reportados nas primeiras 24h
- ✅ Downloads bem-sucedidos em todas as plataformas

---

## 📝 Changelog

### v1.0.0 (2025-01-XX)

- 🎉 Versão inicial de produção
- ⚽ Motor de simulação de partidas
- 💼 Sistema de transferências
- 💰 Gestão financeira completa
- 🏟️ Infraestrutura de clube
- 📊 Estatísticas e rankings

---

## 🆘 Suporte

**Documentação:**

- [BUILD.md](BUILD.md) - Guia de build detalhado
- [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) - Checklist de pré-lançamento

**Issues:**

- GitHub Issues: https://github.com/your-org/football-manager-2d/issues

**Contato:**

- Email: dev@footballmanager.example
