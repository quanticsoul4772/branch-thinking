#!/bin/bash

# Comprehensive Migration Script for Branch-Thinking Refactoring
# This script automates the removal of hardcoded values

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="/Users/russellsmith/Projects/mcp-servers/branch-thinking"
BACKUP_DIR="$PROJECT_ROOT/backup_$(date +%Y%m%d_%H%M%S)"
LOG_FILE="$PROJECT_ROOT/migration.log"
REPORT_FILE="$PROJECT_ROOT/migration_report.md"

# Files to migrate
declare -a FILES_TO_MIGRATE=(
  "src/evaluator.ts"
  "src/toolSuggester.ts"
  "src/differentialEvaluator.ts"
  "src/circularReasoningDetector.ts"
  "src/index.ts"
  "src/branchGraph.ts"
  "src/sparseMatrix.ts"
  "src/toolRegistry.ts"
  "src/branchManagerAdapter.ts"
)

# Initialize log
echo "Migration started at $(date)" > "$LOG_FILE"
echo "# Migration Report" > "$REPORT_FILE"
echo "Generated on $(date)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Function to log messages
log() {
    echo -e "$1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Function to add to report
report() {
    echo "$1" >> "$REPORT_FILE"
}

# Create backup
create_backup() {
    log "${BLUE}Creating backup in $BACKUP_DIR${NC}"
    mkdir -p "$BACKUP_DIR"
    cp -r "$PROJECT_ROOT/src" "$BACKUP_DIR/"
    log "${GREEN}Backup created successfully${NC}"
    report "## Backup"
    report "- Location: $BACKUP_DIR"
    report ""
}

# Check prerequisites
check_prerequisites() {
    log "${BLUE}Checking prerequisites...${NC}"
    
    if [ ! -d "$PROJECT_ROOT" ]; then
        log "${RED}Error: Project root not found at $PROJECT_ROOT${NC}"
        exit 1
    fi
    
    if [ ! -d "$PROJECT_ROOT/src/config" ]; then
        log "${YELLOW}Config directory not found. Creating...${NC}"
        mkdir -p "$PROJECT_ROOT/src/config"
    fi
    
    log "${GREEN}Prerequisites check passed${NC}"
}

# Replace stopwords in a file
replace_stopwords() {
    local file=$1
    local filename=$(basename "$file")
    
    if grep -q "const stopwords = \[" "$file" || grep -q "const STOPWORDS = \[" "$file"; then
        log "  ${YELLOW}Replacing stopwords in $filename${NC}"
        
        # Add import at the top of the file
        sed -i '' '1s/^/import { STOPWORDS } from '"'"'.\/config\/textUtils'"'"';\n/' "$file"
        
        # Remove the hardcoded stopwords array
        sed -i '' '/const [sS][tT][oO][pP][wW][oO][rR][dD][sS] = \[/,/\];/d' "$file"
        
        # Replace usage
        sed -i '' 's/stopwords/STOPWORDS/g' "$file"
        
        report "- Replaced stopwords in $filename"
        return 0
    fi
    return 1
}

# Replace evaluation weights
replace_evaluation_weights() {
    local file=$1
    local filename=$(basename "$file")
    
    if grep -q "coherence: 0.2" "$file"; then
        log "  ${YELLOW}Replacing evaluation weights in $filename${NC}"
        
        # Add config import
        if ! grep -q "import { CONFIG }" "$file"; then
            sed -i '' '1s/^/import { CONFIG } from '"'"'.\/config\/config'"'"';\n/' "$file"
        fi
        
        # Replace weight object
        sed -i '' 's/coherence: 0.2.*repetition: 0.1/...CONFIG.evaluation.weights/g' "$file"
        
        report "- Replaced evaluation weights in $filename"
        return 0
    fi
    return 1
}

# Replace thresholds
replace_thresholds() {
    local file=$1
    local filename=$(basename "$file")
    local changes=0
    
    # Similarity threshold
    if grep -q "similarity.*0\.7" "$file"; then
        log "  ${YELLOW}Replacing similarity threshold in $filename${NC}"
        sed -i '' 's/similarity.*[:=].*0\.7/similarity: CONFIG.evaluation.thresholds.similarity/g' "$file"
        ((changes++))
    fi
    
    # Redundancy threshold
    if grep -q "redundancy.*0\.5" "$file"; then
        log "  ${YELLOW}Replacing redundancy threshold in $filename${NC}"
        sed -i '' 's/redundancy.*[:=].*0\.5/redundancy: CONFIG.evaluation.thresholds.redundancy/g' "$file"
        ((changes++))
    fi
    
    if [ $changes -gt 0 ]; then
        report "- Replaced $changes threshold(s) in $filename"
        return 0
    fi
    return 1
}

# Replace patterns
replace_patterns() {
    local file=$1
    local filename=$(basename "$file")
    
    if [ "$filename" == "circularReasoningDetector.ts" ]; then
        log "  ${YELLOW}Replacing patterns in $filename${NC}"
        
        # Add patterns import
        sed -i '' '1s/^/import { PATTERNS, PatternMatchers } from '"'"'.\/config\/patterns'"'"';\n/' "$file"
        
        # Mark for manual review (patterns are complex)
        sed -i '' '1s/^/\/\/ TODO: Manually review and replace hardcoded patterns with PATTERNS object\n/' "$file"
        
        report "- Marked patterns for manual replacement in $filename"
        return 0
    fi
    return 1
}

# Replace magic numbers
replace_magic_numbers() {
    local file=$1
    local filename=$(basename "$file")
    local changes=0
    
    # Cache size
    if grep -q "1000.*cache" "$file"; then
        log "  ${YELLOW}Replacing cache size in $filename${NC}"
        sed -i '' 's/1000/CONSTANTS.CACHE_SIZE/g' "$file"
        ((changes++))
    fi
    
    # Bloom filter size
    if grep -q "10000.*bloom" "$file"; then
        log "  ${YELLOW}Replacing bloom filter size in $filename${NC}"
        sed -i '' 's/10000/CONSTANTS.BLOOM_FILTER_SIZE/g' "$file"
        ((changes++))
    fi
    
    if [ $changes -gt 0 ]; then
        # Add constants import
        if ! grep -q "import { CONSTANTS }" "$file"; then
            sed -i '' '1s/^/import { CONSTANTS } from '"'"'.\/config\/constants'"'"';\n/' "$file"
        fi
        report "- Replaced $changes magic number(s) in $filename"
        return 0
    fi
    return 1
}

# Process each file
process_files() {
    report "## Files Processed"
    report ""
    
    for file in "${FILES_TO_MIGRATE[@]}"; do
        local full_path="$PROJECT_ROOT/$file"
        if [ -f "$full_path" ]; then
            log "${BLUE}Processing $file${NC}"
            local changes_made=false
            
            replace_stopwords "$full_path" && changes_made=true
            replace_evaluation_weights "$full_path" && changes_made=true
            replace_thresholds "$full_path" && changes_made=true
            replace_patterns "$full_path" && changes_made=true
            replace_magic_numbers "$full_path" && changes_made=true
            
            if [ "$changes_made" = false ]; then
                log "  ${GREEN}No automated changes needed${NC}"
                report "- $file: No automated changes needed"
            fi
        else
            log "${RED}File not found: $file${NC}"
            report "- $file: **NOT FOUND**"
        fi
    done
}

# Create summary
create_summary() {
    report ""
    report "## Summary"
    report ""
    report "### Automated Changes"
    report "- Stopwords imports added"
    report "- Configuration imports added"
    report "- Basic threshold replacements"
    report "- Magic number replacements"
    report ""
    report "### Manual Tasks Required"
    report "1. Review and fix import paths"
    report "2. Replace complex patterns in circularReasoningDetector.ts"
    report "3. Handle context-specific replacements"
    report "4. Test all changes"
    report "5. Remove TODO comments after review"
    report ""
    report "### Next Steps"
    report "1. Run \`npm test\` to check for errors"
    report "2. Review each file for TODO comments"
    report "3. Test the application thoroughly"
    report "4. Remove the backup directory once verified"
}

# Main execution
main() {
    log "${GREEN}=== Branch-Thinking Migration Script ===${NC}"
    
    check_prerequisites
    create_backup
    process_files
    create_summary
    
    log ""
    log "${GREEN}Migration completed!${NC}"
    log "Check the report at: $REPORT_FILE"
    log "Review the log at: $LOG_FILE"
    log ""
    log "${YELLOW}IMPORTANT: This script makes basic replacements.${NC}"
    log "${YELLOW}Manual review and testing is required!${NC}"
}

# Run the script
main
