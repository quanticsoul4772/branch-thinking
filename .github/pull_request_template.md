# Pull Request

## Description

<!-- Provide a brief description of the changes in this PR -->

### Problem
<!-- What problem does this PR solve? Reference any related issues. -->

Fixes #<!-- issue number -->

### Solution
<!-- How does this PR solve the problem? Include key implementation details. -->

### Changes Made
<!-- List the main changes made in this PR -->

- [ ] <!-- Change 1 -->
- [ ] <!-- Change 2 -->
- [ ] <!-- Change 3 -->

## Type of Change

<!-- Mark the relevant option(s) with an "x" -->

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update
- [ ] 🎨 Code style/formatting changes
- [ ] ♻️ Refactoring (no functional changes)
- [ ] ⚡ Performance improvements
- [ ] 🧪 Test changes

## Testing

### Test Coverage
<!-- Describe the testing performed -->

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated  
- [ ] Manual testing completed
- [ ] Performance benchmarks included (if applicable)

### Manual Testing Checklist
<!-- Check all that apply -->

- [ ] Tested in Claude Desktop
- [ ] Verified MCP protocol compatibility
- [ ] Validated JSON output format
- [ ] Confirmed no performance regression
- [ ] Error handling works correctly

### Test Commands
<!-- List commands used for testing -->

```bash
npm test
npm run test:integration
npm run build
# Add any other test commands used
```

## Code Quality

### Quality Checks
<!-- Ensure code meets quality standards -->

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Code is well-documented
- [ ] No new linting errors
- [ ] Maintains or improves code quality score

### Performance Impact
<!-- Describe any performance implications -->

- **Memory Usage**: <!-- Impact on memory consumption -->
- **Processing Speed**: <!-- Impact on key operations -->
- **Startup Time**: <!-- Impact on initialization -->

## Architecture Impact

### Core Components Affected
<!-- Check components modified by this PR -->

- [ ] BranchGraph (core storage)
- [ ] DifferentialEvaluator (incremental processing)
- [ ] Detection Systems (Bloom filters, similarity, circular reasoning)
- [ ] BranchManagerAdapter (MCP compatibility)
- [ ] Command handlers
- [ ] Configuration/utilities

### Breaking Changes
<!-- List any breaking changes -->

- [ ] No breaking changes
- [ ] API changes (describe below)
- [ ] Configuration changes (describe below)
- [ ] Output format changes (describe below)

<!-- If breaking changes exist, describe them here -->

## Deployment Notes

### Migration Required
- [ ] No migration needed
- [ ] Database/storage migration required
- [ ] Configuration update required

### Rollback Plan
<!-- Describe how to rollback if issues arise -->

## Checklist

<!-- Ensure all requirements are met before requesting review -->

- [ ] Code builds successfully (`npm run build`)
- [ ] All tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Documentation updated (if needed)
- [ ] CHANGELOG.md updated (if applicable)
- [ ] Self-review completed
- [ ] Ready for review

## Additional Notes

<!-- Any additional information for reviewers -->

---

**For Reviewers:**
- Focus on code quality, performance impact, and Claude Desktop compatibility
- Verify test coverage is adequate
- Check for potential architectural concerns