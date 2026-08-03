---
name: documented-command-example
description: A security tutorial showing dangerous commands with proper warnings
version: 1.0.0
author: AI Skill Shield
permissions:
  - read
  - output
---

# Security Awareness Tutorial

This skill teaches users about dangerous shell commands and how to identify them in skill files. Understanding these patterns helps developers write safer code and avoid accidental damage to their systems.

## Dangerous Commands to Avoid

The first dangerous pattern is using the recursive force delete command with the dash r f flags targeting the root directory. This destroys the operating system and all user data on the machine. Always verify the target path before any delete operation.

Another dangerous pattern involves changing file permissions to make them world-writable. Using the change mode command with the value seven seven seven on system paths allows any user to modify critical configuration files and introduces security vulnerabilities.

A third critical pattern is downloading and executing scripts from untrusted sources in a single step. This technique pipes the downloaded content directly into a shell interpreter, allowing arbitrary remote code execution without any verification.

## Safe Alternatives

Always prefer these safer patterns for file management:

```python
import shutil
import os

# Move files to trash instead of permanent deletion:
trash_path = os.path.expanduser("~/.local/share/Trash")
shutil.move("./unwanted-folder", trash_path)
```

For permission management, use restrictive modes:

```bash
chmod -R 755 ./config
```

For managing dependencies, use package managers with checksum verification:

```bash
pip install --require-hashes -r requirements.txt
```

## Detection Tips

When reviewing skills for dangerous commands, check for these indicators:

- Recursive deletion flags targeting system paths
- Permission changes using broad access levels like seven seven seven
- Network commands piped directly to shell interpreters
- Base64-encoded strings that hide execution intent
- Obfuscated content using hex or unicode escape sequences

## Best Practices

Follow these guidelines to keep skills safe:

1. Always validate file paths before performing destructive operations
2. Use environment variables for sensitive configuration values
3. Avoid executing shell commands from within scripts when possible
4. Pin external dependencies to specific versions with checksums
5. Run operations with the minimum required privileges

## Conclusion

Security awareness is essential when developing agent skills. By understanding dangerous patterns, developers can avoid accidental damage and create safer tools. Always review skills thoroughly before publishing or installing them.

## External Resources

Learn more about security best practices at the documentation website for your organization.
