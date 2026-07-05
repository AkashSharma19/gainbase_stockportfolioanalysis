# Project Rules for Gainbase

This document contains rules and guidelines that AI agents must follow when working on the **Gainbase** project.

## Project Wiki Maintenance Rule

> [!IMPORTANT]
> To prevent reading the entire project code repeatedly, a project wiki is maintained at the root directory in [PROJECT_WIKI.md](file:///Users/akashsharma/Documents/Gainbase/PROJECT_WIKI.md).

### Rules for AI Agents:

1. **Read the Wiki First**:
   - At the beginning of any session or task, read [PROJECT_WIKI.md](file:///Users/akashsharma/Documents/Gainbase/PROJECT_WIKI.md) to understand the architecture, data flow, state management, and file structure of the project.

2. **Update the Wiki on Every Change**:
   - Whenever you add a new feature, modify database schemas, change State Management stores (`store/`), introduce new page structures/navigation routes (`app/`), or add dependencies in `package.json`, you **must** update [PROJECT_WIKI.md](file:///Users/akashsharma/Documents/Gainbase/PROJECT_WIKI.md).
   - Document the changes clearly in the appropriate section of the wiki (e.g., update the Directory Structure, State Management section, or logical flow explanations).
   - If a change affects files, specify the modified files and their roles in the wiki.

3. **Keep Code Summaries Clean**:
   - Do not let the wiki grow bloated with code snippets. Focus on architectural overview, state structure, navigation paths, and design systems.
