# Contributing to EUDR Compliance Assistant

Thank you for your interest in contributing to the EUDR Compliance Assistant! This document outlines the process for contributing to this project.

## Getting Started

### Prerequisites

- Node.js 20+
- Git
- A PostgreSQL database (for local development)
- Basic understanding of React, TypeScript, and Next.js

### Development Setup

1. Fork the repository on GitHub
2. Clone your fork locally:
```bash
git clone https://github.com/YOUR-USERNAME/eudr-compliance-assistant.git
cd eudr-compliance-assistant
```

3. Set up the development environment:
```bash
npm install
cp .env.example .env
# Edit .env with your local credentials
npm run db:generate
npm run db:push
```

4. Create a feature branch:
```bash
git checkout -b feature/amazing-new-feature
```

5. Make your changes and test them:
```bash
npm run dev
npm test
npm run lint
```

6. Commit your changes:
```bash
git add .
git commit -m "Add amazing new feature"
```

7. Push to GitHub:
```bash
git push origin feature/amazing-new-feature
```

8. Open a Pull Request

## Coding Standards

### TypeScript

- All code must be written in TypeScript
- Enable `strict` mode in tsconfig.json
- Use proper type annotations
- Avoid `any` type - use `unknown` when necessary

### Code Style

- Follow the existing code style
- Use ESLint and Prettier for formatting
- Run `npm run lint` before committing
- Use meaningful variable and function names
- Add comments for complex logic

### Git Commits

- Use conventional commit messages
- Keep commits atomic (one feature per commit)
- Write clear commit descriptions

```
feat: Add new supplier invitation feature
fix: Resolve geolocation validation issue
docs: Update API documentation
refactor: Improve GeoJSON validation performance
test: Add tests for production place form
```

### Testing

- Write tests for all new functionality
- Aim for 80%+ code coverage
- Use meaningful test descriptions
- Follow the AAA pattern (Arrange, Act, Assert)

## Pull Request Process

1. Ensure all tests pass
2. Ensure linting passes
3. Update documentation as needed
4. Request review from maintainers
5. Address feedback and push updates
6. Squash commits before merging

## Testing Guidelines

### Unit Tests

Place tests in `__tests__` directories next to the files they test:

```
src/
  lib/
    utils.ts
    __tests__/
      utils.test.ts
  components/
    Button.tsx
    __tests__/
      Button.test.tsx
```

### Test Coverage

Run coverage reports:
```bash
npm run test:coverage
```

Maintain or improve coverage percentages.

## Security Considerations

- Never commit secrets or credentials
- Use environment variables for sensitive data
- Follow OWASP security guidelines
- Report security vulnerabilities privately

## Reporting Bugs

When reporting bugs, include:

1. Clear description of the issue
2. Steps to reproduce
3. Expected behavior
4. Actual behavior
5. Screenshots (if applicable)
6. Browser/OS information
7. Error messages and stack traces

## Feature Requests

Before submitting feature requests:

1. Check existing issues and PRs
2. Provide clear use cases
3. Explain the expected implementation
4. Consider backward compatibility

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct.html). By participating, you are expected to uphold this code.

## Questions?

If you have questions, please open an issue for discussion.
