# SCF Reply Package

This package turns the SCF prescreening feedback into a direct response, a tighter $50k scope, and a reviewer-friendly evidence set grounded in public URLs plus the additional Verifik credibility points you want to surface.

## Claim Audit: what to say, what to reframe

The current internal proposal text in `zelf/planning/zelf_stellar.md` includes claims that are likely too loose for SCF review, especially where a reviewer expects one-click public proof.

### Claims to avoid repeating as-is

| Current wording in internal draft | Why SCF pushed back | Safer replacement |
| --- | --- | --- |
| "trusted by Circle, Ar.io, Pinata, ID R&D, and OffChain Labs" | Reads like formal partnerships or endorsements | "integrates with public infrastructure and has experience across USDC, IPFS, Arweave, liveness tooling, and multi-chain wallet infrastructure" |
| "Enterprise Partnerships" list | Suggests signed or publicly verifiable commercial relationships | "technical integrations and prior ecosystem work" |
| "Circle: USDC integration and trust validation" | USDC usage is not the same as a Circle partnership | "USDC integration on prior chain experiments" |
| "Ar.io: Decentralized storage integration" | May be confused with Arweave or interpreted as a formal partner | "Arweave/IPFS-based decentralized storage design" |
| "ID R&D: Liveness detection technology partnership" | Partnership wording is hard to verify from public pages | "liveness detection technology incorporated into our verification stack" |
| "OffChain Labs: Infrastructure collaboration" | Unverifiable without an announcement or official listing | Remove unless you can attach proof |

### Claims you can say confidently

- Zelf Legacy already has a public product narrative and roadmap at [https://zelf.world/legacy-stellar](https://zelf.world/legacy-stellar).
- The full SCF-style technical proposal is already public at [https://zelf.world/zelf-legacy-stellar#tranche-1](https://zelf.world/zelf-legacy-stellar#tranche-1).
- The public docs explain the underlying Zelf proof model and no-biometric-storage design at [https://docs.zelf.world](https://docs.zelf.world).
- The public GitHub organization exists at [https://github.com/Open-Verifik](https://github.com/Open-Verifik), with live repositories for the extension, SDKs, docs, and related apps.
- Verifik publicly states platform scale and coverage at [https://verifik.co/en/](https://verifik.co/en/) and [https://docs.verifik.co/intro/](https://docs.verifik.co/intro/).

### How to handle the named Verifik customers

You asked to explicitly mention London Stock Exchange, Mercado Libre, and Cabify. Because SCF specifically called out unverifiable claims, the strongest formulation is:

> "Through Verifik, our identity infrastructure company, we have a five-year operating track record and have served enterprise customers including London Stock Exchange Group, Mercado Libre, Cabify, and multiple KYC providers. If helpful, we can provide additional context or references privately."

That keeps the names in the email, while acknowledging that the supporting detail may need to be shared directly rather than assumed from a public landing page.

## Evidence Pack

Use these links in roughly this order so reviewers see the most relevant proof first.

| URL | Why it matters |
| --- | --- |
| [https://zelf.world/legacy-stellar](https://zelf.world/legacy-stellar) | Product-facing Zelf Legacy page with the user flow, Soroban heartbeat framing, and three-tranche roadmap |
| [https://zelf.world/zelf-legacy-stellar#tranche-1](https://zelf.world/zelf-legacy-stellar#tranche-1) | Full SCF-style proposal mirror: executive summary, architecture, integration plan, risks, open-source commitment |
| [https://docs.zelf.world](https://docs.zelf.world) | Public technical documentation for Zelf proof architecture and seed phrase protection model |
| [https://github.com/Open-Verifik](https://github.com/Open-Verifik) | Public source organization with active repos |
| [https://zelf.world/download/](https://zelf.world/download/) | Download page showing live distribution surface |
| [https://chromewebstore.google.com/detail/zelf-name-service/ennoagncbcpgikfajeeakjolikjmindc](https://chromewebstore.google.com/detail/zelf-name-service/ennoagncbcpgikfajeeakjolikjmindc) | Live browser extension listing |
| [https://play.google.com/store/apps/details?id=co.verifik.wallet&hl=en_GB](https://play.google.com/store/apps/details?id=co.verifik.wallet&hl=en_GB) | Android app listing |
| [https://verifik.co/en/](https://verifik.co/en/) | Verifik company site with public metrics like 10M+ checks, 20+ countries, 99.7% accuracy |
| [https://docs.verifik.co/intro/](https://docs.verifik.co/intro/) | Verifik public product and API documentation |

## Revised $50k Budget

The original public roadmap is still valuable, but the ask should be reframed as a tighter, back-loaded execution plan that makes trust easier for SCF.

### Recommended funding structure

| Milestone | Scope | Acceptance criteria | Amount |
| --- | --- | --- | ---: |
| Milestone 1: Soroban MVP | Soroban inheritance registry contract, policy creation flow, biometric binding path, heartbeat logic on testnet | Public repo, testnet deployment, unit and integration tests, simulated inheritance flow demo | $10,000 |
| Milestone 2: Claim pipeline + Guardian Oracle | Oracle notification flow, lawyer fallback path, beneficiary claim verification, documented security model | End-to-end testnet walkthrough, public docs, reproducible demo from policy creation to claim eligibility | $15,000 |
| Milestone 3: SDK + integration + launch readiness | Wallet SDK, contract SDK, demo integrations, mainnet deployment package, developer docs | Public code, installation docs, demo app coverage across web extension and mobile surfaces, mainnet-ready release materials | $25,000 |

**Total:** $50,000

### Why this structure works

- It directly answers the "budget seems inflated/not well scoped" concern.
- It puts the largest payment at the end, which reinforces trust.
- It still preserves the full product vision instead of cutting core functionality.
- It matches your message that the hard part already exists and the Stellar-specific work is what remains.

### Optional stronger trust concession

If you want to push harder, use this wording in the email:

> "We are also comfortable with a heavily back-loaded payment structure, including settling the majority of compensation only after the final deliverables are live, reviewable, and accepted."

That says what you mean without sounding reckless.

## Final Email Draft

**Subject:** SCF Build Award prescreening - Zelf Legacy revised scope, stronger evidence, and milestone-based delivery

Dear Stellar Community Fund team,

Thank you for the prescreening feedback on our Zelf Legacy submission. We appreciate the directness, and we took the comments seriously.

We understand the core concerns: the budget felt too large for the level of evidence presented, the traction and validation were not explicit enough, the integration partners were not clearly tied to architecture and deliverables, and some of our wording around external names was not sufficiently verifiable. That is fair feedback.

We want to address that directly.

First, we are prepared to reduce the request from **$90,000 to $50,000** for the next round. We are also willing to align the structure around clear milestones and back-load compensation significantly if needed so trust comes from delivered work, not promises. A structure we are comfortable with is:

- $10,000 for the Soroban MVP on testnet
- $15,000 for the Guardian Oracle and claim pipeline
- $25,000 for SDKs, integration deliverables, and launch readiness

If helpful, we are also open to an even more back-loaded structure where most of the compensation is settled only after final deliverables are live and reviewable.

Second, we agree that our submission should have led with verifiable public evidence. We already have two public pages that explain the product and technical scope in much more detail:

- [https://zelf.world/legacy-stellar](https://zelf.world/legacy-stellar)
- [https://zelf.world/zelf-legacy-stellar#tranche-1](https://zelf.world/zelf-legacy-stellar#tranche-1)

These pages cover the user flow, the inheritance model, the Soroban heartbeat concept, the architecture, the Stellar-specific building blocks, the phased roadmap, and the open-source commitment. We should have made those much more prominent in the original submission.

Third, on execution credibility, we are not a new team starting from zero. The proposal is backed by technology and infrastructure we have already built and operate today. Zelf already has a public documentation surface at [https://docs.zelf.world](https://docs.zelf.world), a public code organization at [https://github.com/Open-Verifik](https://github.com/Open-Verifik), and live distribution surfaces including our browser extension and mobile app presence at [https://zelf.world/download/](https://zelf.world/download/).

In parallel, this work is backed by **Verifik** ([https://verifik.co/en/](https://verifik.co/en/)), our identity infrastructure company. Verifik has a five-year operating track record in identity verification and KYC/AML, with public product documentation at [https://docs.verifik.co/intro/](https://docs.verifik.co/intro/). Through Verifik, we have served enterprise customers including **London Stock Exchange Group, Mercado Libre, Cabify, and multiple KYC providers**, and we can provide additional context or references privately if that is useful for a future review.

Fourth, on the integration point: we agree that the original submission did not make the relationship between integrations, deliverables, and architecture explicit enough. In the resubmission we will make that mapping much clearer. The public technical page already identifies the specific components we plan to use on Stellar, including:

- Soroban smart contracts
- Soroban storage tiers
- `require_auth()` authorization flow
- Soroban events for heartbeat emissions
- BLS12-381 native support
- Stellar wallet integration examples
- IPFS and Arweave for off-chain policy and proof payloads
- Verifik for the identity verification layer where applicable

We will also remove or tighten any wording that could be interpreted as a formal partnership claim unless it is backed by a public, third-party-verifiable source.

Our intent with Zelf Legacy is straightforward: we are trying to bring a real inheritance solution to self-custody without locking user funds in contracts and without relying on custodial trust assumptions. We believe Stellar is the right place to build that because the economics, account model, and Soroban primitives are a better fit for this design than the chains we explored previously.

If the main concern was trust in execution relative to scope, then our answer is simple: we are happy to reduce the ask, scope it more tightly, tie everything to auditable milestones, and let the work speak for itself.

Thank you again for the feedback and for the chance to improve the submission.

Best regards,  
Miguel  
Founder, Zelf World

## Shorter Version

If you want a more compact reply for the same thread, use this version:

Dear Stellar Community Fund team,

Thank you for the feedback. We understand the concerns around scope, validation, traction, partner clarity, and execution credibility.

We are prepared to reduce our request from **$90,000 to $50,000** and tie it to milestone-based delivery, with the majority of compensation back-loaded if necessary. We want the project to be judged on shipped outputs, not only on narrative.

We also agree that our previous submission did not surface the strongest public evidence clearly enough. These two pages explain the proposal in much more detail:

- [https://zelf.world/legacy-stellar](https://zelf.world/legacy-stellar)
- [https://zelf.world/zelf-legacy-stellar#tranche-1](https://zelf.world/zelf-legacy-stellar#tranche-1)

They show the full inheritance flow, Soroban design, integration plan, roadmap, and deliverables.

On execution credibility, this proposal is backed by existing Zelf technology and by **Verifik** ([https://verifik.co/en/](https://verifik.co/en/)), our identity infrastructure company with a five-year operating track record. Through Verifik, we have served customers including London Stock Exchange Group, Mercado Libre, Cabify, and multiple KYC providers, and we can provide additional context privately if helpful.

We will resubmit with a tighter budget, clearer milestone mapping, stronger evidence links, and more precise wording around integrations and partnerships.

Thank you again for the review.

Best regards,  
Miguel  
Founder, Zelf World
