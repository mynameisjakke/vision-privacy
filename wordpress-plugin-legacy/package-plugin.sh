#!/bin/bash

# Vision Privacy Legacy Plugin - Distribution Package Script
# This script creates a production-ready ZIP file for distribution

set -e  # Exit on error

# Configuration
PLUGIN_SLUG="vision-privacy-legacy"
PLUGIN_VERSION="1.0.5-legacy"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="${SCRIPT_DIR}/build"
RELEASES_DIR="${SCRIPT_DIR}/releases"
TEMP_DIR="${BUILD_DIR}/${PLUGIN_SLUG}"
ZIP_FILE="${RELEASES_DIR}/${PLUGIN_SLUG}-${PLUGIN_VERSION}.zip"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print colored message
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Print section header
print_header() {
    echo ""
    print_message "${GREEN}" "===================================="
    print_message "${GREEN}" "$1"
    print_message "${GREEN}" "===================================="
}

# Check if required commands exist
check_requirements() {
    print_header "Checking Requirements"
    
    local missing_commands=()
    
    if ! command -v zip &> /dev/null; then
        missing_commands+=("zip")
    fi
    
    if ! command -v sha256sum &> /dev/null && ! command -v shasum &> /dev/null; then
        missing_commands+=("sha256sum or shasum")
    fi
    
    if [ ${#missing_commands[@]} -ne 0 ]; then
        print_message "${RED}" "Error: Missing required commands: ${missing_commands[*]}"
        exit 1
    fi
    
    print_message "${GREEN}" "✓ All required commands are available"
}

# Clean previous build
clean_build() {
    print_header "Cleaning Previous Build"
    
    if [ -d "${BUILD_DIR}" ]; then
        rm -rf "${BUILD_DIR}"
        print_message "${GREEN}" "✓ Removed previous build directory"
    fi
    
    mkdir -p "${BUILD_DIR}"
    mkdir -p "${RELEASES_DIR}"
    print_message "${GREEN}" "✓ Created build directories"
}

# Copy plugin files
copy_files() {
    print_header "Copying Plugin Files"
    
    mkdir -p "${TEMP_DIR}"
    
    # Copy main plugin file
    cp "${SCRIPT_DIR}/vision-privacy-legacy.php" "${TEMP_DIR}/"
    print_message "${GREEN}" "✓ Copied main plugin file"
    
    # Copy includes directory
    if [ -d "${SCRIPT_DIR}/includes" ]; then
        cp -r "${SCRIPT_DIR}/includes" "${TEMP_DIR}/"
        print_message "${GREEN}" "✓ Copied includes directory"
    fi
    
    # Copy uninstall script
    if [ -f "${SCRIPT_DIR}/uninstall.php" ]; then
        cp "${SCRIPT_DIR}/uninstall.php" "${TEMP_DIR}/"
        print_message "${GREEN}" "✓ Copied uninstall script"
    fi
    
    # Copy README.txt (WordPress plugin directory format)
    if [ -f "${SCRIPT_DIR}/README.txt" ]; then
        cp "${SCRIPT_DIR}/README.txt" "${TEMP_DIR}/"
        print_message "${GREEN}" "✓ Copied README.txt"
    fi
    
    print_message "${GREEN}" "✓ All necessary files copied"
}

# Set file permissions
set_permissions() {
    print_header "Setting File Permissions"
    
    # Set directory permissions to 755 (rwxr-xr-x)
    find "${TEMP_DIR}" -type d -exec chmod 755 {} \;
    print_message "${GREEN}" "✓ Set directory permissions to 755"
    
    # Set file permissions to 644 (rw-r--r--)
    find "${TEMP_DIR}" -type f -exec chmod 644 {} \;
    print_message "${GREEN}" "✓ Set file permissions to 644"
    
    # Make PHP files readable and executable (if needed by some hosts)
    find "${TEMP_DIR}" -type f -name "*.php" -exec chmod 644 {} \;
    print_message "${GREEN}" "✓ Set PHP file permissions to 644"
}

# Create ZIP file
create_zip() {
    print_header "Creating ZIP Archive"
    
    # Remove existing ZIP if present
    if [ -f "${ZIP_FILE}" ]; then
        rm "${ZIP_FILE}"
        print_message "${YELLOW}" "⚠ Removed existing ZIP file"
    fi
    
    # Create ZIP file (change to build directory to avoid including full path)
    cd "${BUILD_DIR}"
    zip -r -q "${ZIP_FILE}" "${PLUGIN_SLUG}"
    cd "${SCRIPT_DIR}"
    
    if [ -f "${ZIP_FILE}" ]; then
        local zip_size=$(du -h "${ZIP_FILE}" | cut -f1)
        print_message "${GREEN}" "✓ Created ZIP file: ${ZIP_FILE}"
        print_message "${GREEN}" "  Size: ${zip_size}"
    else
        print_message "${RED}" "✗ Failed to create ZIP file"
        exit 1
    fi
}

# Generate checksums
generate_checksums() {
    print_header "Generating Checksums"
    
    local checksum_file="${RELEASES_DIR}/${PLUGIN_SLUG}-${PLUGIN_VERSION}.sha256"
    
    # Generate SHA256 checksum
    cd "${RELEASES_DIR}"
    
    if command -v sha256sum &> /dev/null; then
        sha256sum "$(basename "${ZIP_FILE}")" > "$(basename "${checksum_file}")"
    elif command -v shasum &> /dev/null; then
        shasum -a 256 "$(basename "${ZIP_FILE}")" > "$(basename "${checksum_file}")"
    fi
    
    cd "${SCRIPT_DIR}"
    
    if [ -f "${checksum_file}" ]; then
        print_message "${GREEN}" "✓ Generated checksum file: ${checksum_file}"
        print_message "${GREEN}" "  Content:"
        cat "${checksum_file}" | while read line; do
            print_message "${GREEN}" "    ${line}"
        done
    else
        print_message "${RED}" "✗ Failed to generate checksum"
        exit 1
    fi
}

# Verify ZIP contents
verify_zip() {
    print_header "Verifying ZIP Contents"
    
    print_message "${YELLOW}" "Files in archive:"
    unzip -l "${ZIP_FILE}" | grep -E "\.php$|\.txt$" | awk '{print "  " $4}'
    
    # Check for required files
    local required_files=(
        "${PLUGIN_SLUG}/vision-privacy-legacy.php"
        "${PLUGIN_SLUG}/uninstall.php"
        "${PLUGIN_SLUG}/README.txt"
        "${PLUGIN_SLUG}/includes/admin-page.php"
    )
    
    local all_present=true
    for file in "${required_files[@]}"; do
        if unzip -l "${ZIP_FILE}" | grep -q "${file}"; then
            print_message "${GREEN}" "  ✓ ${file}"
        else
            print_message "${RED}" "  ✗ Missing: ${file}"
            all_present=false
        fi
    done
    
    if [ "$all_present" = true ]; then
        print_message "${GREEN}" "✓ All required files are present"
    else
        print_message "${RED}" "✗ Some required files are missing"
        exit 1
    fi
    
    # Check for excluded files (should not be present)
    local excluded_patterns=(".git" ".gitignore" "COMPATIBILITY_CHECKLIST" "MUTUAL_EXCLUSION" "PHP73_COMPATIBILITY_AUDIT" "TASK_7_VERIFICATION" "package-plugin.sh")
    
    local none_present=true
    for pattern in "${excluded_patterns[@]}"; do
        if unzip -l "${ZIP_FILE}" | grep -q "${pattern}"; then
            print_message "${RED}" "  ✗ Found excluded file: ${pattern}"
            none_present=false
        fi
    done
    
    if [ "$none_present" = true ]; then
        print_message "${GREEN}" "✓ No excluded files found in archive"
    else
        print_message "${YELLOW}" "⚠ Warning: Some excluded files are present in archive"
    fi
}

# Print summary
print_summary() {
    print_header "Package Summary"
    
    print_message "${GREEN}" "Plugin: ${PLUGIN_SLUG}"
    print_message "${GREEN}" "Version: ${PLUGIN_VERSION}"
    print_message "${GREEN}" "ZIP File: ${ZIP_FILE}"
    
    if [ -f "${ZIP_FILE}" ]; then
        local zip_size=$(du -h "${ZIP_FILE}" | cut -f1)
        print_message "${GREEN}" "Size: ${zip_size}"
    fi
    
    local checksum_file="${RELEASES_DIR}/${PLUGIN_SLUG}-${PLUGIN_VERSION}.sha256"
    if [ -f "${checksum_file}" ]; then
        print_message "${GREEN}" "Checksum: ${checksum_file}"
    fi
    
    echo ""
    print_message "${GREEN}" "✓ Package created successfully!"
    echo ""
    print_message "${YELLOW}" "Next steps:"
    print_message "${YELLOW}" "  1. Test the plugin by installing ${ZIP_FILE} on a WordPress site"
    print_message "${YELLOW}" "  2. Verify the checksum matches before distribution"
    print_message "${YELLOW}" "  3. Upload to distribution server or provide to clients"
}

# Main execution
main() {
    print_message "${GREEN}" "Vision Privacy Legacy Plugin - Package Builder"
    print_message "${GREEN}" "Version: ${PLUGIN_VERSION}"
    echo ""
    
    check_requirements
    clean_build
    copy_files
    set_permissions
    create_zip
    generate_checksums
    verify_zip
    print_summary
    
    # Clean up build directory
    rm -rf "${BUILD_DIR}"
}

# Run main function
main
