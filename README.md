# CS4353 - Final Prototype

Shared repository for the CS4353 final prototype.

## Getting started

Clone this repository, then add the prototype source code and setup instructions as the project takes shape.

## Database

The Supabase schema supports profiles, sprites, two-user chats and friendships,
item locations and images, and non-overlapping dated loans with four verification
images and borrower reviews. See [database setup and app operations](docs/database.md).
The schema is deployed to the **CS4353 Final Project** Supabase project
(`ejgvfgvrmcwrixxdvwwt`). Migration `20261030000200` implements the revised model;
database integration checks passed on 30 October 2026.

## Collaboration

- Create a branch for each feature or fix.
- Open a pull request to merge changes into `main`.
- Use GitHub Issues to track tasks and bugs.
- Keep passwords, API keys, and other secrets out of the repository.
