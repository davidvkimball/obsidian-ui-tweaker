#!/bin/bash
# Simple setup script to create symlink to central .agents directory
# Run this from anywhere: ./scripts/setup-agents-link.sh

# Change to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo ""
echo "========================================"
echo "  Setting up .agents symlink"
echo "========================================"
echo ""
echo "Current directory: $PROJECT_ROOT"
echo ""

# Check if we're in the template repository (has real .agents directory, not symlink)
CURRENT_DIR="$(basename "$PROJECT_ROOT")"
if [ -d ".agents" ]; then
    if [ ! -L ".agents" ]; then
        # It's a real directory - we're in the template
        IS_CENTRAL_REPO=true
        echo "Detected: Template repository ($CURRENT_DIR)"
    else
        # It's a symlink - we're in a plugin project
        IS_CENTRAL_REPO=false
        echo "Detected: Plugin project ($CURRENT_DIR)"
    fi
else
    # .agents doesn't exist - check if central location exists to determine context
    if [ -d "../.ref/obsidian-dev/.agents" ] || [ -L "../.ref/obsidian-dev/.agents" ]; then
        # Central location exists, so we're in a plugin project
        IS_CENTRAL_REPO=false
        echo "Detected: Plugin project ($CURRENT_DIR)"
    else
        # No .agents and no central location - assume we're in template (will create central)
        IS_CENTRAL_REPO=true
        echo "Detected: Template repository ($CURRENT_DIR)"
    fi
fi

if [ "$IS_CENTRAL_REPO" = true ]; then
    # We're in the template repository - create symlink from central location to local .agents
    echo ""
    echo "Step 1: Checking local .agents directory exists..."
    if [ ! -d ".agents" ]; then
        echo "  ERROR: .agents directory not found!"
        echo "  The template repository must have a real .agents directory."
        echo "  Please ensure .agents exists before running this script."
        exit 1
    fi
    echo "  Local .agents directory found"
    echo ""
    echo "Step 2: Ensuring central location exists..."
    CENTRAL_PARENT="../.ref/obsidian-dev"
    if [ ! -d "$CENTRAL_PARENT" ]; then
        echo "  Creating $CENTRAL_PARENT directory..."
        mkdir -p "$CENTRAL_PARENT"
    fi
    
    CENTRAL_PARENT="../.ref/obsidian-dev"
    if [ ! -d "$CENTRAL_PARENT" ]; then
        echo "  Creating $CENTRAL_PARENT directory..."
        mkdir -p "$CENTRAL_PARENT"
    fi
    
    echo ""
    echo "Step 3: Removing existing central symlink (if any)..."
    CENTRAL_AGENTS="../.ref/obsidian-dev/.agents"
    if [ -L "$CENTRAL_AGENTS" ] || [ -d "$CENTRAL_AGENTS" ]; then
        rm -rf "$CENTRAL_AGENTS"
        if [ $? -ne 0 ]; then
            echo "  ERROR: Could not remove existing $CENTRAL_AGENTS"
            echo "  Please remove it manually and re-run this script"
            exit 1
        fi
    fi
    
    echo ""
    echo "Step 4: Creating symlink..."
    echo "  Source: $PROJECT_ROOT/.agents"
    echo "  Target: $CENTRAL_AGENTS"
    ln -s "$PROJECT_ROOT/.agents" "$CENTRAL_AGENTS"
    if [ $? -ne 0 ]; then
        echo ""
        echo "ERROR: Failed to create symlink"
        exit 1
    fi
    
    echo ""
    echo "SUCCESS: Central symlink created!"
    echo ""
    echo "Verification: Checking central symlink..."
    if [ -L "$CENTRAL_AGENTS" ]; then
        echo "  Central symlink verified"
        echo "  Target: $(readlink "$CENTRAL_AGENTS")"
    elif [ -d "$CENTRAL_AGENTS" ]; then
        echo "  WARNING: Central location exists but may not be a symlink"
    else
        echo "  ERROR: Central symlink is missing!"
        exit 1
    fi
else
    # We're in a plugin project - create symlink from local .agents to central location
    echo ""
    echo "Step 1: Checking central location exists..."
    CENTRAL_AGENTS="../.ref/obsidian-dev/.agents"
    if [ ! -d "$CENTRAL_AGENTS" ] && [ ! -L "$CENTRAL_AGENTS" ]; then
        echo ""
        echo "ERROR: Central .agents location not found!"
        echo "  Expected: $CENTRAL_AGENTS"
        echo ""
        echo "  Please run this script from the template repository first"
        echo "  (the repository that contains the real .agents directory)"
        echo ""
        exit 1
    fi
    echo "  Central location found: $CENTRAL_AGENTS"
    
    echo ""
    echo "Step 2: Removing existing .agents (if any)..."
    LOCAL_AGENTS=".agents"
    if [ -L "$LOCAL_AGENTS" ] || [ -d "$LOCAL_AGENTS" ]; then
        if [ -L "$LOCAL_AGENTS" ]; then
            rm "$LOCAL_AGENTS"
            echo "  Removed existing symlink"
        else
            echo "  .agents is a real directory - backing up..."
            if [ -d ".agents.backup" ]; then
                rm -rf ".agents.backup"
            fi
            mv "$LOCAL_AGENTS" ".agents.backup"
            if [ $? -ne 0 ]; then
                echo "  ERROR: Could not move .agents to .agents.backup"
                echo "  Please remove .agents manually and re-run this script"
                exit 1
            fi
            echo "  Backed up to .agents.backup"
        fi
    else
        echo "  No existing .agents found"
    fi
    
    echo ""
    echo "Step 3: Creating symlink..."
    echo "  Source: .agents"
    echo "  Target: $CENTRAL_AGENTS"
    ln -s "$CENTRAL_AGENTS" "$LOCAL_AGENTS"
    if [ $? -ne 0 ]; then
        echo ""
        echo "ERROR: Failed to create symlink"
        if [ -d ".agents.backup" ]; then
            echo ""
            echo "Restoring backup..."
            mv ".agents.backup" "$LOCAL_AGENTS"
        fi
        exit 1
    fi
    
    echo ""
    echo "SUCCESS: Project symlink created!"
fi

# Verify (only for plugin projects)
if [ "$IS_CENTRAL_REPO" = false ]; then
    echo ""
    echo "========================================"
    echo "  Verification"
    echo "========================================"
    if [ -L ".agents" ]; then
        echo ".agents is a symlink"
        echo "  Target: $(readlink .agents)"
    elif [ -d ".agents" ]; then
        echo "WARNING: .agents exists but may not be a symlink"
    else
        echo "ERROR: .agents is missing!"
        exit 1
    fi
fi

echo ""
echo "========================================"
echo "  Setup complete!"
echo "========================================"
echo ""
