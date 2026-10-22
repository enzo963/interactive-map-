
```text
docs/
│
├── 00-PROJECT-OVERVIEW.md
├── 01-SCOPE-AND-GOALS.md
├── 02-WEBSITE-STRUCTURE.md
├── 03-CARD-SYSTEM.md
├── 04-DECK-SYSTEM.md
├── 05-INTERACTIVE-MAP.md
├── 06-HERITAGE-SITE-PAGES.md
├── 07-DATA-STRUCTURE.md
├── 08-CONTENT-AND-SOURCES.md
├── 09-3D-AND-DIGITAL-ASSETS.md
├── 10-ANIMATION-AND-UX.md
├── 11-TECHNICAL-ARCHITECTURE.md
└── 12-DEVELOPMENT-ROADMAP.md
```

---

# 00 — Project Overview

**Project Type:** Interactive Digital Heritage Platform

### Concept

The project is an interactive web platform for discovering historical and archaeological heritage sites across the targeted Iraqi governorates.

Instead of presenting heritage information as a traditional archive, each heritage site is represented by a collectible-style **Heritage Card**.

The platform combines:

```text
Heritage Cards
Interactive Iraq Map
Collections / Decks
Historical Information
Image Galleries
3D Models
Digital Documentation
Random Discovery
Interactive Animations
```

### Core Principle

> **Design once, populate from data.**

The team should never manually create a separate webpage for every heritage site.

One reusable Card component and one reusable Heritage Site page will display information dynamically from the database.

---

# 01 — Scope and Goals

### Primary Goal

Create an accessible and visually engaging digital platform for exploring heritage sites in the targeted governorates of Iraq.

### Geographic Scope

The initial phase focuses on selected governorates in northern and central-northern Iraq.

The exact governorate list must be finalized before large-scale data collection begins.

### Main Objectives

```text
Document heritage sites
↓
Organize them geographically
↓
Represent them as Heritage Cards
↓
Create thematic Decks
↓
Connect them to an interactive map
↓
Provide historical information
↓
Display available digital documentation
↓
Encourage users to discover more sites
```

The system must remain expandable so additional Iraqi governorates can be introduced later without redesigning the platform.

---

# 02 — Website Structure

Initial website architecture:

```text
Website
│
├── Home
│
├── Explore
│   ├── All Cards
│   ├── Search
│   ├── Filters
│   └── Random Card
│
├── Interactive Map
│
├── Decks
│   ├── Governorate Decks
│   ├── UNESCO Deck
│   ├── Lost Heritage Deck
│   ├── Our Work Deck
│   └── Special Decks
│
├── Heritage Site
│   ├── Overview
│   ├── History
│   ├── Gallery
│   ├── Location
│   ├── 3D
│   └── Sources
│
├── 3D Collection
│
└── About / Methodology
```

---

# 03 — Card System

This is one of the central systems of the project.

Every documented heritage site receives a Heritage Card.

## Five Card Types

Cards are divided into **five types according to the historical age of the heritage site**.

```text
TYPE 1
Newest Heritage
        ↓
TYPE 2
        ↓
TYPE 3
        ↓
TYPE 4
        ↓
TYPE 5
Oldest / Legendary Heritage
```

The five types must use the same overall Card layout but have different visual identities.

Differences may include:

```text
Border
Frame details
Historical patterns
Texture
Emblem
Rarity indicator
Small decorative elements
```

The design should become gradually more prestigious and historically inspired as the age increases.

### Important

**Card Type and Deck are two completely different systems.**

Card Type represents:

> How old is this heritage site?

Deck represents:

> Which collection does this heritage site belong to?

For example:

```text
Hatra

Card Type:
Type 5 — Ancient / Legendary

Decks:
Nineveh
UNESCO
Ancient Cities
```

---

## Card Front

Every Card should display:

```text
┌──────────────────────────────┐
│                              │
│          MAIN IMAGE          │
│                              │
│                       TYPE V │
├──────────────────────────────┤
│ SITE NAME                    │
│ City • Governorate           │
│                              │
│ Short two-line description   │
│ about the heritage site.     │
│                              │
│ 3D ●                         │
│                              │
│                MORE DETAILS →│
└──────────────────────────────┘
```

Required information:

```text
Main Image
English Name
Arabic Name
Governorate
City
Short Description
Card Type
Available Digital Assets
More Details
```

---

# 04 — Deck System

Decks are collections of Heritage Cards.

Unlike Card Types, a Card may belong to **multiple Decks simultaneously**.

## Governorate Decks

Every targeted governorate receives its own Deck.

Example:

```text
Nineveh Deck
Duhok Deck
Erbil Deck
Kirkuk Deck
Salah al-Din Deck
...
```

Each Governorate Deck can have its own:

```text
Card Back
Pattern
Symbol
Accent Color
Visual Identity
```

while maintaining the project's overall design language.

## UNESCO Deck

Contains sites with an appropriate UNESCO classification.

The database must distinguish between official World Heritage Sites and other UNESCO statuses.

## Lost Heritage Deck

Dedicated to heritage that has been:

```text
Destroyed
Lost
Severely damaged
Disappeared
Reconstructed after destruction
```

The exact status must always be recorded rather than treating all of these cases as equivalent.

## Our Work Deck

Contains sites directly documented or studied by the project team.

Examples:

```text
Field Documentation
Photography
Photogrammetry
LiDAR
3D Reconstruction
Research
VR/AR
Digital Twin
```

## Future Decks

The architecture must support adding collections without changing the core code.

Potential examples:

```text
Assyrian Heritage
Babylonian Heritage
Islamic Heritage
Christian Heritage
Yazidi Heritage
Ancient Cities
Churches
Mosques
Monasteries
Castles
3D Collection
```

---

# 05 — Interactive Map

The Interactive Map is one of the project's primary interfaces.

The page displays the map of Iraq.

Target governorates are visually highlighted.

Each governorate displays the number of currently available Heritage Cards.

Example:

```text
          DUHOK
        [28 Cards]

        NINEVEH
        [47 Cards]

                  ERBIL
                [34 Cards]

                   KIRKUK
                 [21 Cards]
```

These numbers **must never be entered manually**.

They are calculated directly from the database.

```text
Database
    ↓
Count sites by governorate
    ↓
Interactive Map
    ↓
"47 Cards"
```

Adding a new Nineveh site automatically changes:

```text
47 → 48
```

## Map Interaction

Clicking a governorate should:

```text
Select Governorate
        ↓
Highlight Area
        ↓
Display Information
        ↓
Show Number of Cards
        ↓
Show Heritage Cards
```

Potential panel:

```text
NINEVEH

47 Heritage Sites

Ancient Sites       14
Religious Heritage  12
Architecture         8
Other                13

[ Explore Nineveh ]
```

---

# 06 — Heritage Site Page

Every Card leads to a dedicated dynamic page.

Example URL:

```text
/sites/hatra
```

The page should support:

```text
Hero Image

Site Name
Arabic Name
Location

Overview

Historical Background

Timeline

Gallery

Interactive Map Location

3D Model

Videos

Digital Documentation

Related Sites

Sources

Image Credits
```

Sections should be conditional.

For example:

```text
has3D = true
→ Show 3D section

has3D = false
→ Hide 3D section
```

The same applies to videos, virtual tours, research papers, etc.

---

# 07 — Data Structure

Every heritage site should have a structured record.

```text
SITE

Identity
├── ID
├── Slug
├── English Name
└── Arabic Name

Location
├── Governorate
├── City
├── Latitude
└── Longitude

Classification
├── Site Type
├── Historical Period
├── Civilization
├── Construction Date
└── Card Type (1–5)

Content
├── Short Description
├── Full Description
├── Historical Background
└── Timeline

Media
├── Main Image
├── Gallery
├── Videos
└── 3D Models

Collections
└── Deck IDs []

Status
├── UNESCO Status
├── Heritage Status
└── Preservation Status

Project
├── Documented By Us?
└── Documentation Type []

Sources
├── References []
├── Image Credits []
└── Licenses []

Verification
├── Status
└── Last Verified
```

---

# 08 — Content and Sources

The project should **not rely on manually searching Google and downloading images**.

Content should come from reliable and legally reusable sources where possible.

Potential sources include [Wikidata](https://www.wikidata.org/?utm_source=chatgpt.com), [Wikimedia Commons](https://commons.wikimedia.org/?utm_source=chatgpt.com), [UNESCO World Heritage Centre](https://whc.unesco.org/?utm_source=chatgpt.com), academic publications, government heritage sources, and original team documentation.

Every image should ideally store:

```text
Image
Source
Original URL
Creator / Photographer
License
Attribution
```

Every important historical claim should have a reference.

### Content Workflow

```text
External Sources
       ↓
Automated / Manual Collection
       ↓
Candidate Record
       ↓
Human Review
       ↓
Verification
       ↓
Database
       ↓
Public Website
```

AI may assist with collecting, organizing and summarizing information.

**AI-generated historical information must not automatically become published information.**

---

# 09 — 3D and Digital Assets

3D is an optional enhancement, not a requirement for creating a Card.

A site can therefore have:

```text
Information     ✓
Images          ✓
Map             ✓
Sources         ✓

3D              ✕
Video           ✕
VR              ✕
```

and still be a complete valid Card.

Supported digital assets may eventually include:

```text
3D Model
Photogrammetry
LiDAR
Virtual Tour
VR Experience
AR Experience
Video
Digital Reconstruction
Research Documents
```

---

# 10 — Animation and UX

Animations are an important part of the visual experience.

Potential animations:

```text
Card Hover
Card Flip
Deck Opening
Card Draw
Map Hover
Map Selection
Page Transitions
Gallery Transitions
3D Entrance
```

However:

> **Animation must enhance the experience, not prevent access to it.**

Users must be able to reduce or disable animations.

Example:

```text
Experience Settings

Animations
● Full
○ Reduced
○ Off
```

The website should also respect the operating system's `prefers-reduced-motion` accessibility preference.

---

# 11 — Random Discovery

The platform should contain a discovery feature.

Possible label:

**Draw a Card**

```text
DRAW A CARD
     ↓
Deck Animation
     ↓
Card Selected
     ↓
Card Flip
     ↓
Heritage Site
```

Random discovery can eventually support:

```text
Random Site

Random Nineveh Site

Random UNESCO Site

Random Lost Heritage

Random 3D Site

Random Ancient Site
```

This transforms browsing into an exploration experience.

---

# 12 — Technical Architecture

Current proposed technology:

```text
GitHub
   │
   ▼
React + Vite
   │
   ├── Components
   ├── Pages
   ├── Router
   └── API
         │
         ▼
      Database
         │
 ┌───────┼────────┐
 ▼       ▼        ▼
Sites   Decks    Media
```

Possible component structure:

```text
src/
│
├── components/
│   ├── cards/
│   ├── decks/
│   ├── map/
│   ├── gallery/
│   ├── search/
│   └── common/
│
├── pages/
│   ├── Home/
│   ├── Explore/
│   ├── Map/
│   ├── Deck/
│   └── Site/
│
├── data/
├── services/
├── hooks/
├── assets/
├── styles/
└── utils/
```

---

# 13 — Development Roadmap


### Phase 1 — Foundation

```text
Project Documentation
Card Classification
Deck Rules
Data Schema
Repository Structure
```

### Phase 2 — Prototype

  **5 Heritage Sites**.


```text
5 Records
5 Cards
1 Explore Page
1 Site Template
1 Deck
```

### Phase 3 — Map

```text
Iraq Map
Governorate Selection
Dynamic Card Count
Governorate Filtering
```

### Phase 4 — Collections

```text
Governorate Decks
UNESCO
Lost Heritage
Our Work
```

### Phase 5 — Experience

```text
Animations
Card Flip
Draw a Card
Deck Animation
Transitions
Reduced Motion
```

### Phase 6 — Digital Heritage

```text
3D Viewer
Photogrammetry
Videos
VR/AR Links
```

### Phase 7 — Content Expansion

```text
5 Sites
 ↓
20
 ↓
50
 ↓
100+
```

---
