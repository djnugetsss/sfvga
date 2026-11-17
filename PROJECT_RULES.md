# SFVGA App Project Rules

## Purpose

The SFVGA App is designed to make life easier for approximately 500 members of the San Fernando Valley Gujarati Association. The app should improve organization, simplify event registration, and provide a modern experience without adding unnecessary complexity.

## Core Philosophy

- Simplicity is the highest priority.
- Every feature should solve a real problem for members or admins.
- The organization already functions well without an app; this app is meant to enhance the experience, not replace existing processes.
- Avoid enterprise-level features unless they are specifically requested.
- Prefer straightforward solutions over overly complex architectures.

## Development Rules

- Follow the Architecture, Technical Design, Project Structure, and UI/UX documents exactly.
- Do not invent new features unless explicitly asked.
- Reuse components whenever possible.
- Keep the code clean, modular, and maintainable.
- Build for long-term readability rather than cleverness.
- Ask for clarification if requirements are unclear instead of making assumptions.

## Technology Stack

- React Native
- Expo
- TypeScript
- Firebase Authentication
- Firestore
- Firebase Storage
- Firebase Cloud Functions
- Firebase Cloud Messaging
- Stripe
- React Navigation
- Zustand
- React Query

## UI Guidelines

- Clean, modern, and easy to use.
- Large touch targets.
- Senior-friendly.
- Consistent spacing and typography.
- Minimal screens.
- Minimal taps to complete common actions.
- Mobile-first design.

## Project Scale

This application is intended for a nonprofit organization with approximately 500 members.

Optimize for:
- simplicity
- maintainability
- reliability
- ease of use

Do not optimize for tens of thousands of users unless specifically requested in the future.

## When Unsure

Never guess.

Ask questions before implementing anything not covered by the project documentation.