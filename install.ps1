# multi-agent-kit installer (Windows, PowerShell 7+)
# Installs the `mak` status tool and agent adapters to ~/.multi-agent-kit,
# sets Claude Code's status line so Claude's usage limits get recorded, copies
# the shared multi-agent rules into the global config of Claude Code, Codex and
# Antigravity, and registers the pinned Antigravity bridge as a user-scope MCP
# server. Safe to re-run: every step replaces its own earlier output.

$ErrorActionPreference = 'Stop'
$Kit = $PSScriptRoot
$Start = '<!-- multi-agent-kit-start -->'
$End = '<!-- multi-agent-kit-end -->'

function Set-ManagedBlock {
    param([string]$Path, [string]$SourceFile)
    $block = "$Start`n" + (Get-Content -Raw $SourceFile).TrimEnd() + "`n$End"
    $text = if (Test-Path $Path) { Get-Content -Raw $Path } else { '' }
    if ($null -eq $text) { $text = '' }

    $pattern = [regex]::Escape($Start) + '[\s\S]*?' + [regex]::Escape($End)
    if ($text -match $pattern) {
        $text = [regex]::Replace($text, $pattern, [System.Text.RegularExpressions.MatchEvaluator] { $block })
    } else {
        # Drop an unmarked copy written before the kit existed.
        $legacy = $text.IndexOf("# Multi-Agent Development")
        if ($legacy -ge 0) { $text = $text.Substring(0, $legacy) }
        $text = $text.TrimEnd()
        $text = if ($text) { "$text`n`n$block" } else { $block }
    }
    New-Item -ItemType Directory -Force (Split-Path $Path) | Out-Null
    Set-Content -Path $Path -Value ($text + "`n") -NoNewline
    Write-Host "  updated $Path"
}

Write-Host "mak (status tool)"
$makHome = Join-Path $HOME '.multi-agent-kit'
foreach ($sub in 'bin', 'adapters') {
    New-Item -ItemType Directory -Force (Join-Path $makHome $sub) | Out-Null
    Copy-Item (Join-Path $Kit "$sub\*") (Join-Path $makHome $sub) -Recurse -Force
}
Copy-Item (Join-Path $Kit 'package.json') $makHome -Force
Write-Host "  copied bin\, adapters\ and package.json to $makHome"
# node-pty lets mak read Antigravity's interactive /usage screen.
Push-Location $makHome
npm install --omit=dev --no-fund --no-audit --loglevel=error | Out-Null
Pop-Location
if ($LASTEXITCODE -eq 0) { Write-Host "  installed npm dependencies" } else { Write-Warning "npm install failed in $makHome; Antigravity usage will be unavailable" }
node (Join-Path $makHome 'bin\mak.mjs') setup-statusline | ForEach-Object { "  $_" }

Write-Host "Claude Code"
$claudeHome = Join-Path $HOME '.claude'
foreach ($sub in 'rules', 'agents') {
    $dest = Join-Path $claudeHome $sub
    New-Item -ItemType Directory -Force $dest | Out-Null
    Get-ChildItem (Join-Path $Kit "claude\$sub") -Filter *.md | ForEach-Object {
        Copy-Item $_.FullName $dest -Force
        Write-Host "  copied $sub\$($_.Name)"
    }
}

Write-Host "Codex"
Set-ManagedBlock -Path (Join-Path $HOME '.codex\AGENTS.md') -SourceFile (Join-Path $Kit 'codex\AGENTS.md')
$npmCodex = Join-Path $env:APPDATA 'npm\codex.cmd'
if (Test-Path $npmCodex) {
    Write-Host "  $(& $npmCodex --version)  ($npmCodex)"
} else {
    Write-Warning "Codex CLI not found at $npmCodex. Install it: npm install -g @openai/codex@latest, then: codex login"
}

Write-Host "Antigravity"
Set-ManagedBlock -Path (Join-Path $HOME '.gemini\GEMINI.md') -SourceFile (Join-Path $Kit 'antigravity\GEMINI.md')

$bridgeName = 'antigravity-claude-mcp-0.1.0'
$bridgeDest = Join-Path $claudeHome "mcp\$bridgeName"
New-Item -ItemType Directory -Force $bridgeDest | Out-Null
Copy-Item (Join-Path $Kit "bridges\$bridgeName\*") $bridgeDest -Recurse -Force
Write-Host "  bridge copied to $bridgeDest"

$agy = Join-Path $env:LOCALAPPDATA 'agy\bin\agy.exe'
if (-not (Test-Path $agy)) {
    Write-Warning "agy CLI not found. Install: irm https://antigravity.google/cli/install.ps1 | iex ; then sign in: & `"$agy`" -p ping --print-timeout 5m"
}

# The bridge's built-in default model ("Gemini 3.1 Pro (High)") is not offered
# on every account, so pick the first model id `agy models` lists.
$agyModel = $env:AGY_MODEL
if (-not $agyModel -and (Test-Path $agy)) {
    $agyModel = (& $agy models 2>$null | Where-Object { $_ -match '^\S+\t' } | Select-Object -First 1) -replace '\t.*$', ''
}
if (-not $agyModel) { $agyModel = 'gemini-3.8-flash-high' }

# Re-register every time so changes to the bridge env take effect.
# add-json, not `add ... -- node ...`: PowerShell drops the `--`, and then the
# variadic -e option swallows the command.
$server = @{
    type    = 'stdio'
    command = 'node'
    args    = @((Join-Path $bridgeDest 'bin\cli.mjs'))
    env     = @{ AGY_BIN = $agy; AGY_MODEL = $agyModel }
} | ConvertTo-Json -Compress
claude mcp remove antigravity -s user *> $null
claude mcp add-json --scope user antigravity $server | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  MCP server 'antigravity' registered (model $agyModel)"
} else {
    Write-Warning "Could not register the antigravity MCP server (claude mcp add-json exited $LASTEXITCODE)"
}

Write-Host "`nAgents on this machine:"
node (Join-Path $makHome 'bin\mak.mjs') status

Write-Host "`nDone. Start a new Claude Code session to load the rules, agents and MCP tools."
