# ArtistrySynk Competition Platform

The competition system is a platform capability inside ArtistrySynk, not a
separate ZGT product.

## Current domain

- CREATIVE
- TALENT_HUNT
- First implementation: ArtistrySynk Creative Talent Hunt

## Future domains

The core competition model intentionally leaves room for:

- SPORTS
- Football competitions and trials
- GAMING
- Other competition formats

## Identity rule

A competition participant references an ArtistrySynk identity/profile. A
competition must not create a second independent identity ecosystem.

## Separation of concerns

- Directory: who the person/entity is and what they do.
- Competition: what they are participating in and their competition status.
- Domain adapter: rules specific to creative, sports, football, gaming, etc.

Do not add football-specific fields to the creative talent-hunt model. When
sports is introduced, add a sports/football domain adapter and the required
athlete/team concepts around the generic competition participant model.
