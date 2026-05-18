# Changelog

## [1.6.0](https://github.com/CourtHive/courthive-components/compare/v1.5.0...v1.6.0) (2026-05-18)


### Features

* **cards:** introduce card primitives family with shared helpers ([35914f6](https://github.com/CourtHive/courthive-components/commit/35914f6027598ac9093f819cae05fb9ae208906b))
* **schedule-page:** add initialCatalogState seed to SchedulePageConfig ([d500f3a](https://github.com/CourtHive/courthive-components/commit/d500f3a5b517a04a5ddb312364f36bc2911bd4bb))
* **schedule-page:** add titleSlot option to replace the "Court Grid" label ([51da6ef](https://github.com/CourtHive/courthive-components/commit/51da6ef5093562edc77f9fb25f2da35b3a9762a1))
* **schedule-page:** highlight active filter selects in the catalog popover ([f9c96d6](https://github.com/CourtHive/courthive-components/commit/f9c96d6510da220892a0de9c1cfa5727e6f87f17))
* **schedule-page:** pulse the catalog filter button orange when active ([2790301](https://github.com/CourtHive/courthive-components/commit/279030102acade48e864823037774390b0e60473))
* **schedule:** add titleLeadingActions slot to Court Grid and Day Plan headers ([09ee1b3](https://github.com/CourtHive/courthive-components/commit/09ee1b35bdcf242a68f4ac1fdc4e7cbb5cf53847))
* **search:** add (x) clear button to matchUp + rounds catalog search fields ([30c134c](https://github.com/CourtHive/courthive-components/commit/30c134c73afd29cae38649d3d6f5a5bc30c307f1))


### Bug Fixes

* **controlBar:** hide the search (x) clear icon when the input is empty ([8662ec0](https://github.com/CourtHive/courthive-components/commit/8662ec01a9d2174378614a3696ab551130de622d))
* **ratingDistributionChart:** dark-mode-aware count labels ([ecc3bbc](https://github.com/CourtHive/courthive-components/commit/ecc3bbc33535e0267aae84d18de1ab0391fc3dd8))
* **ratingDistributionChart:** de-clutter axis when bins compress, add hover tooltip ([92c24f9](https://github.com/CourtHive/courthive-components/commit/92c24f9ef0c7cb779df2c7920026a4b78dc5e97e))
* **searchClearButton:** use WeakMap instead of unsafe HTMLElement cast ([182058c](https://github.com/CourtHive/courthive-components/commit/182058cd696cfc91ced361ff1c8360d7be333afd))

## [1.5.0](https://github.com/CourtHive/courthive-components/compare/v1.4.1...v1.5.0) (2026-05-16)


### Features

* **scoring:** Phase 2.5 format verification stories (pickleball, badminton, squash, no-ad) ([b79f32c](https://github.com/CourtHive/courthive-components/commit/b79f32cc53e97df7fbfd00e2cbbbc631a448f1a1))


### Bug Fixes

* **schedule-page:** readable grid-cell time and active-strip pill colors ([7524132](https://github.com/CourtHive/courthive-components/commit/75241329349b4d657702b0481d7d9df82ca7e86f))

## [1.4.1](https://github.com/CourtHive/courthive-components/compare/v1.4.0...v1.4.1) (2026-05-13)


### Bug Fixes

* **renderSideScore:** show tiebreak points for match-tiebreak final sets ([#370](https://github.com/CourtHive/courthive-components/issues/370)) ([7443e32](https://github.com/CourtHive/courthive-components/commit/7443e32ac808b0c03e01a78382479a77f5cf6866))

## [1.4.0](https://github.com/CourtHive/courthive-components/compare/v1.3.1...v1.4.0) (2026-05-12)


### Features

* **schedule-page:** consumer-injected header actions in court grid slot ([190b1e9](https://github.com/CourtHive/courthive-components/commit/190b1e944f3d1f412fbb337a7c5d91e68cb522df))
* **scheduling-profile:** consumer-injected header actions in Day Plan ([3b6a8b1](https://github.com/CourtHive/courthive-components/commit/3b6a8b1fd0fda189ed46d51cd9e7319b3bc6715e))


### Bug Fixes

* **scheduling-profile:** expand venue board when sidebar is collapsed ([3709e02](https://github.com/CourtHive/courthive-components/commit/3709e021718bba13514df53a342e4364c1658049))

## [1.3.1](https://github.com/CourtHive/courthive-components/compare/v1.3.0...v1.3.1) (2026-05-10)


### Bug Fixes

* consolidate pnpm config into workspace.yaml with allowBuilds ([b02ef22](https://github.com/CourtHive/courthive-components/commit/b02ef22b8c85077b591cc3ac614ca7492517f984))
* pnpm 11 install — kebab-case .npmrc + ignoredBuiltDependencies ([cea2c00](https://github.com/CourtHive/courthive-components/commit/cea2c006f832642d19adcb17c47e3b7069901c10))

## [1.3.0](https://github.com/CourtHive/courthive-components/compare/v1.2.0...v1.3.0) (2026-05-06)


### Features

* **courts:** promote courtSvgUtil to public API ([d681762](https://github.com/CourtHive/courthive-components/commit/d6817625763c540a6d8f32452d871650833dd102))
* **rating-distribution-chart:** SVG histogram + donut for format wizard ([7d1556e](https://github.com/CourtHive/courthive-components/commit/7d1556e0124d68b6c0a59ff29a76e04a9ad696f3))

## [1.2.0](https://github.com/CourtHive/courthive-components/compare/v1.1.1...v1.2.0) (2026-05-03)


### Features

* **schedule-page:** active courts strip above the grid ([0111048](https://github.com/CourtHive/courthive-components/commit/01110486dc8400eed16125b79685ff399e70ed4b))


### Bug Fixes

* **schedule-page:** sticky-left the active strip spacer ([1a9cdce](https://github.com/CourtHive/courthive-components/commit/1a9cdce425700c523b67dc766e5639d5e8edb8ce))

## [1.1.1](https://github.com/CourtHive/courthive-components/compare/v1.1.0...v1.1.1) (2026-05-01)


### Bug Fixes

* **print-composition-editor:** use canonical chc theme variables for dark mode ([9348151](https://github.com/CourtHive/courthive-components/commit/9348151bedfbc2f22aa6b6ba463d1d81a5af4d43))

## [1.1.0](https://github.com/CourtHive/courthive-components/compare/v1.0.4...v1.1.0) (2026-04-30)


### Features

* **print-composition-editor:** MVP editor for pdf-factory CompositionConfig ([6b2060a](https://github.com/CourtHive/courthive-components/commit/6b2060a4dfdcbc0399226637516be2a45907e9c8))
