# History in Cards public project pages — P6-17 through P6-21

Status: approved in chat on 2026-11-01; implemented and verified locally.

## Purpose

Explain History in Cards to visitors, researchers, students and institutions: why the archive exists, what it covers, how information reaches publication, what the project aims to document and how someone can prepare a useful contribution.

## Confirmed requirements

- Professional About, Methodology & Sources, Our Work, and Contact & Contribution pages.
- Desktop/mobile navigation and footer links to the major archive and project destinations.
- Plain public explanations of trust tiers and evidence, without internal implementation details.
- The user has confirmed that public contact details are unavailable and should be postponed.

## Existing project constraints

The application uses React, Vite, a custom History API router, shared PageHeader/SmartLink components and an established paper/ink/terracotta visual identity. Site records come from local JSON through the normalization service. Project documentation and verified model resources have existing data-driven selectors. Current About content includes a useful card specimen and age-type explanation.

The source registry defines Tier 1 official sources (UNESCO, official Iraqi heritage authorities and KRG) and Tier 2 Wikimedia Commons image sources. A lower tier number represents higher priority for an applicable claim. Conflicting claims are retained for review; source priority is not automatic proof or publication approval. Images require independent association, licensing and publication review.

## Approaches

Recommended: four separate pages within the existing application, with shared editorial styling and grouped navigation. This matches the requested destinations, supports direct links and keeps the current architecture.

A single long About page would reduce routes but make methodology, work and contribution content harder to find independently. A CMS or contact submission service would introduce infrastructure and moderation requirements beyond the requested pages. Neither is recommended.

The user approved proceeding with this approach in chat.

## Page content and behavior

### About — /about

Lead with the mission of connecting people with Iraqi heritage through accessible digital records. Explain research, public learning, responsible documentation and digital preservation goals. State the present northern and central Iraqi focus: Nineveh, Erbil, Duhok, Sulaymaniyah, Kirkuk, Baghdad and Salah al-Din. Avoid suggesting comprehensive coverage. Preserve card-reading and card-type/deck guidance as secondary sections. Link to the map, methodology and Our Work.

### Methodology & Sources — /methodology

Describe the public workflow: identify a site, collect relevant trusted sources, retain evidence and provenance, compare claims, review records and images, approve publication, and accept subsequent corrections. Explain the two currently configured trust tiers in ordinary language. Distinguish confirmed facts, uncertainty and conflicting claims; unknown UNESCO/model availability must not be described as a negative. Explain that tentative UNESCO entries are distinct from inscribed properties. Explain attribution, image rights and explicit editorial approval. Refer visitors to the citations on site records. Do not display filesystem paths, review commands, internal identifiers or automation details. No claims of UNESCO or government affiliation.

### Our Work — /our-work

Present photogrammetry, digital reconstruction, 3D documentation, research and preservation as areas of work or intended practice, without inventing completed projects, partners, field campaigns or models. Use existing approved, first-hand documentation records for any actual project listing. Require approved records before displaying work as published. Provide an honest empty state if none qualify, plus links to Our Documentation and the 3D Archive. Existing /decks/our-work remains the collection route.

### Contact & Contribution — /contact

Explain who can contribute and the kinds of information useful to the archive: corrections, source-backed research, alternative names, location context, photographs with authorship/permission and documented digital assets. Provide a checklist for preparing a contribution, including the site name, supporting references, explanation of changes and image rights. State that official contact details will be added later and submissions are not currently accepted through this page. No email, social profile, submission form or success message will be invented. A future contact channel remains outside this implementation.

## Navigation and footer

Keep Explore Cards, Map, Decks, UNESCO and 3D Archive prominent. Group About, Methodology, Our Work and Contact & Contribution as Project navigation using an accessible disclosure on desktop and clear sections on mobile. Keep global search and Draw a Card available. Preserve existing deep links and aliases. Reflect the current route correctly, including UNESCO/3D aliases, site pages and the project pages.

Menus must support keyboard activation and Escape, restore focus when dismissed by Escape and close after navigation. Mobile navigation must occupy document flow and avoid horizontal overflow. The footer groups Explore and Project destinations, includes Home and Our Documentation, and replaces the outdated blanket prototype disclaimer with an accurate note about sources, review and continuing corrections. Omit social links until official URLs exist.

## Implementation choices left to the builder

Use current components and CSS variables. Add shared page/layout components only when they remove actual repetition. Choose section copy, responsive breakpoints and semantic markup to fit the existing visual language. Avoid new runtime dependencies. Do not change heritage records, pipeline behavior, card rendering, models or collection membership.

## Validation and completion

Run the existing JavaScript suite, lint and production build. Add focused behavioral coverage for new route rendering, internal destinations, current-route navigation, menu keyboard/focus behavior, navigation closure and truthful unavailable contact/work states. Check desktop and mobile layout in a browser where available; report any browser-validation limitation explicitly. No deployment, commit or push is part of the requested delivery.
