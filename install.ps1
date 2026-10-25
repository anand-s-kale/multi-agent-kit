# multi-agent-kit installer (Windows, PowerShell 7+)
# Copies the shared multi-agent rules into the global config of Claude Code,
# Codex and Antigravity, installs the pinned Antigravity bridge, and registers
# it as a user-scope MCP server. Safe to re-run: every step replaces its own
# earlier output instead of appending a duplicate.

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

claude mcp get antigravity *> $null
if ($LASTEXITCODE -ne 0) {
    claude mcp add --scope user antigravity -e "AGY_BIN=$agy" -- node (Join-Path $bridgeDest 'bin\cli.mjs')
} else {
    Write-Host "  MCP server 'antigravity' already registered"
}

Write-Host "`nDone. Start a new Claude Code session to load the rules, agents and MCP tools."
