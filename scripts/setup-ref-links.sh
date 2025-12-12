#!/bin/bash
# Setup script to create symlinks to the 5 core Obsidian projects
# Run this from anywhere: ./scripts/setup-ref-links.sh

# Change to project root (parent of scripts folder)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "Setting up symlinks to core Obsidian projects..."

# Central .ref location (one level up from project)
CENTRAL_REF="../.ref"

# Create central .ref if it doesn't exist
if [ ! -d "$CENTRAL_REF" ]; then
    mkdir -p "$CENTRAL_REF"
    echo "Created central .ref directory"
fi

# Ensure plugins and themes folders exist
mkdir -p "$CENTRAL_REF/plugins"
mkdir -p "$CENTRAL_REF/themes"

# Clone the 5 core repos if they don't exist
if [ ! -d "$CENTRAL_REF/obsidian-api" ]; then
    echo "Cloning obsidian-api..."
    (cd "$CENTRAL_REF" && git clone https://github.com/obsidianmd/obsidian-api.git obsidian-api)
fi

if [ ! -d "$CENTRAL_REF/obsidian-sample-plugin" ]; then
    echo "Cloning obsidian-sample-plugin..."
    (cd "$CENTRAL_REF" && git clone https://github.com/obsidianmd/obsidian-sample-plugin.git obsidian-sample-plugin)
fi

if [ ! -d "$CENTRAL_REF/obsidian-developer-docs" ]; then
    echo "Cloning obsidian-developer-docs..."
    (cd "$CENTRAL_REF" && git clone https://github.com/obsidianmd/obsidian-developer-docs.git obsidian-developer-docs)
fi

if [ ! -d "$CENTRAL_REF/obsidian-plugin-docs" ]; then
    echo "Cloning obsidian-plugin-docs..."
    (cd "$CENTRAL_REF" && git clone https://github.com/obsidianmd/obsidian-plugin-docs.git obsidian-plugin-docs)
fi

if [ ! -d "$CENTRAL_REF/obsidian-sample-theme" ]; then
    echo "Cloning obsidian-sample-theme..."
    (cd "$CENTRAL_REF" && git clone https://github.com/obsidianmd/obsidian-sample-theme.git obsidian-sample-theme)
fi

# Ensure project .ref directory exists
mkdir -p .ref

# Define the 5 core projects
CORE_PROJECTS=(
    "obsidian-api"
    "obsidian-sample-plugin"
    "obsidian-developer-docs"
    "obsidian-plugin-docs"
    "obsidian-sample-theme"
)

# Create symlinks for each core project
for project in "${CORE_PROJECTS[@]}"; do
    link_path=".ref/$project"
    target_path="$CENTRAL_REF/$project"
    
    # Check if target exists
    if [ ! -d "$target_path" ]; then
        echo "WARNING: Target not found: $target_path"
        echo "  Skipping $project"
        continue
    fi
    
    # Remove existing link if it exists
    if [ -L "$link_path" ] || [ -d "$link_path" ]; then
        rm -rf "$link_path"
    fi
    
    # Create symlink
    ln -s "$target_path" "$link_path"
    if [ $? -eq 0 ]; then
        echo "✓ Created symlink: $link_path -> $target_path"
    else
        echo "ERROR: Failed to create symlink for $project"
    fi
done

echo ""
echo "Setup complete!"
echo ""
echo "Verifying symlinks..."

# Verify symlinks
for project in "${CORE_PROJECTS[@]}"; do
    link_path=".ref/$project"
    if [ -L "$link_path" ]; then
        echo "✓ $project : Symlink"
    elif [ -d "$link_path" ]; then
        echo "✗ $project : Regular directory (not a symlink)"
    else
        echo "✗ $project : Missing"
    fi
done

