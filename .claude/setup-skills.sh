#!/bin/bash
# Auto-install last30days skill for Claude Code sessions
# This runs on SessionStart to ensure the skill is available

SKILL_DIR="$HOME/.claude/skills/last30days"

# Clone if not already installed
if [ ! -d "$SKILL_DIR" ]; then
  git clone --quiet https://github.com/mvanhorn/last30days-skill.git "$SKILL_DIR" 2>/dev/null
fi

# Configure API keys from environment variables (if set)
CONFIG_DIR="$HOME/.config/last30days"
CONFIG_FILE="$CONFIG_DIR/.env"
mkdir -p "$CONFIG_DIR"

if [ ! -f "$CONFIG_FILE" ] || [ -z "$(grep -v '^#' "$CONFIG_FILE" | grep -v '^$' | grep '=.' )" ]; then
  cat > "$CONFIG_FILE" <<EOF
# last30days skill API keys (auto-configured from environment)
OPENAI_API_KEY=${OPENAI_API_KEY:-}
XAI_API_KEY=${XAI_API_KEY:-}
EOF
fi
