#!/bin/bash

# Vision Privacy WordPress Plugin Packager
# Creates a production-ready .zip file for WordPress installation

echo "📦 Packaging Vision Privacy WordPress Plugin..."
echo ""

# Set variables
PLUGIN_DIR="wordpress-plugin"
PLUGIN_NAME="vision-privacy"
VERSION="1.0.2"
OUTPUT_FILE="${PLUGIN_NAME}-v${VERSION}.zip"

# Check if plugin directory exists
if [ ! -d "$PLUGIN_DIR" ]; then
    echo "❌ Error: Plugin directory not found: $PLUGIN_DIR"
    exit 1
fi

# Remove old package if exists
if [ -f "$OUTPUT_FILE" ]; then
    echo "🗑️  Removing old package..."
    rm "$OUTPUT_FILE"
fi

# Create temporary directory for packaging
TEMP_DIR=$(mktemp -d)
PACKAGE_DIR="$TEMP_DIR/$PLUGIN_NAME"

echo "📁 Creating package structure..."
mkdir -p "$PACKAGE_DIR"

# Copy plugin files
echo "📄 Copying plugin files..."
cp -r "$PLUGIN_DIR"/* "$PACKAGE_DIR/"

# Remove development files and directories
echo "🧹 Cleaning up development files..."
rm -rf "$PACKAGE_DIR/.git"
rm -rf "$PACKAGE_DIR/.gitignore"
rm -rf "$PACKAGE_DIR/node_modules"
rm -rf "$PACKAGE_DIR/.DS_Store"
rm -rf "$PACKAGE_DIR/tests"
rm -f "$PACKAGE_DIR"/*.log

# Create the zip file
echo "🗜️  Creating zip archive..."
cd "$TEMP_DIR"
zip -r -q "$OUTPUT_FILE" "$PLUGIN_NAME"
cd - > /dev/null

# Move zip to current directory
mv "$TEMP_DIR/$OUTPUT_FILE" .

# Clean up temp directory
rm -rf "$TEMP_DIR"

# Get file size
FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)

echo ""
echo "✅ Package created successfully!"
echo ""
echo "📦 Package Details:"
echo "   File: $OUTPUT_FILE"
echo "   Size: $FILE_SIZE"
echo "   Version: $VERSION"
echo ""
echo "🚀 Ready to install on WordPress!"
echo ""
echo "Installation Instructions:"
echo "1. Go to WordPress Admin → Plugins → Add New"
echo "2. Click 'Upload Plugin'"
echo "3. Choose file: $OUTPUT_FILE"
echo "4. Click 'Install Now'"
echo "5. Activate the plugin"
echo ""
