# Modeling Guide

## Domain Language

- Vehicle: real-world car represented by a token.
- VIN: unique vehicle identifier. Treat as public unless a spec says otherwise.
- Milestone: immutable technical history record.
- Quality seal: public computed summary for QR checks.
- Actor: account with a role granted through AccessControl.

## Contract Modeling Order

1. Define structs and enums.
2. Define custom errors.
3. Define events.
4. Define role constants.
5. Define read methods required by QR and frontend.
6. Define write methods and validations.
7. Document acceptance and rejection cases in the SDD before implementation.

## Frontend Modeling Order

1. Define contract ABI dependency.
2. Define wallet and network state.
3. Define public read flow.
4. Define role-gated write flows.
5. Define error mapping.
6. Do not add frontend validations, tests or e2e checks unless the user explicitly asks.

## Data Rules To Preserve

- VIN uniqueness.
- Mileage cannot go backwards.
- Role checks must happen before state mutation.
- Public QR reads must not require wallet connection.
- Every meaningful write should emit an event.
