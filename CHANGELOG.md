# Changelog

## [1.8.1](https://github.com/CourtHive/courthive-components/compare/v1.8.0...v1.8.1) (2026-05-23)


### Bug Fixes

* **modal:** raise default modal padding from .5 to 1em ([445bdce](https://github.com/CourtHive/courthive-components/commit/445bdce37a428beb7a129c67c79ede9674ecf79b))

## [1.8.0](https://github.com/CourtHive/courthive-components/compare/v1.7.1...v1.8.0) (2026-05-21)


### Features

* **schedule-page:** prominent time header on matchUp card ([2145639](https://github.com/CourtHive/courthive-components/commit/2145639b25bd82bf5cd6dc5b22cdeca776581262))
* **scheduling-profile:** split chips, placement chips, remove inspector ([66dcd3f](https://github.com/CourtHive/courthive-components/commit/66dcd3fdf9dc7750af8d08ceac8c8c2653567283))

## [1.7.1](https://github.com/CourtHive/courthive-components/compare/v1.7.0...v1.7.1) (2026-05-20)


### Bug Fixes

* **deps:** update dependency tods-competition-factory to v4.0.0 ([8c16502](https://github.com/CourtHive/courthive-components/commit/8c1650258a212c85877d14e6d080e81066c86b65))
* **forms:** always emit option value attribute, even for empty string ([cb2c0d3](https://github.com/CourtHive/courthive-components/commit/cb2c0d313787a4270a9a14a1a5633b8394aba87c))

## [1.7.0](https://github.com/CourtHive/courthive-components/compare/v1.6.0...v1.7.0) (2026-05-19)


### Features

* **competitivenessBar:** lift segmented bar primitive from TMX ([42b5041](https://github.com/CourtHive/courthive-components/commit/42b504147f41f739ea824d8c531fb35afec203fe))
* **competitiveness:** buildCompetitivenessDonut companion to the bar ([caac0d5](https://github.com/CourtHive/courthive-components/commit/caac0d59db0d7a98f38668df390c210ef3085561))
* **composition-editor:** show connector lines in preview ([69b349d](https://github.com/CourtHive/courthive-components/commit/69b349d5a6a5918604250f5fbf0f23061857303f))
* **composition:** per-composition color overrides + TYPTI preset ([06c49f4](https://github.com/CourtHive/courthive-components/commit/06c49f46b4d2e8ef93f1dd48690e05488a8f54b4))
* **compositions:** pass through colors in resolvePublishedComposition ([49dff99](https://github.com/CourtHive/courthive-components/commit/49dff996cfb1bb90d3a5b6e1d4ef7824b57eaf43))
* **court-card:** surface-based tint for the image zone ([f4e158a](https://github.com/CourtHive/courthive-components/commit/f4e158a9cbbc24c6fd463fa1a6a0a0fa6f4d31c5))
* **draw-card:** add draw card primitive ([0811b73](https://github.com/CourtHive/courthive-components/commit/0811b73d1b0cd7b15eb007f3801a1a675d986b14))
* **draw-card:** viz zone for histogram / competitiveness / sunburst ([bef3c75](https://github.com/CourtHive/courthive-components/commit/bef3c75a56ef38f854337008e8cb36366e0b696a))


### Bug Fixes

* **ci:** drop pnpm version input — it conflicts with packageManager ([78ac44c](https://github.com/CourtHive/courthive-components/commit/78ac44c083e5e6b09b08b1823a42c12b4c4f6011))
* **court-card:** resolve surface category from surfaceType fallback ([bfdf414](https://github.com/CourtHive/courthive-components/commit/bfdf41438e735e0c8f5eefbecc37eedf70420525))
* **draw-card:** keep title text from clipping under corner badges ([b9351af](https://github.com/CourtHive/courthive-components/commit/b9351af7828d13e8e49f177cb8b5d8594e881f57))
* **venue-card:** enable pointer events on OSM map iframe ([2b44422](https://github.com/CourtHive/courthive-components/commit/2b44422c3b8033be57bc284e3e00748a292e7c72))
* **venue-card:** scope click handler to body + footer when map renders ([3106107](https://github.com/CourtHive/courthive-components/commit/31061071b1d87b17cfc54cda1889e77a5fd04424))


### Documentation

* **stories:** add Competitiveness Donut storybook gallery ([47fb1d6](https://github.com/CourtHive/courthive-components/commit/47fb1d6e3c0e0a4344878cbbc48f08f8b91f0100))

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
