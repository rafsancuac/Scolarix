/**
 * Legal content — spec §8.2 policy routes and §20 (Bangladesh legal baseline).
 *
 * These documents are the platform's own draft policy text. They are NOT a
 * substitute for counsel review: §20 requires sign-off recorded at
 * `docs/architecture/compliance/legal-review.md` before launch, and every page
 * rendered from this file carries that notice.
 *
 * Content is data, not markup, so a CMS adapter can replace it in Phase 4
 * without touching the route.
 */

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LegalDocument {
  slug: string;
  title: string;
  updated: string;
  summary: string;
  sections: LegalSection[];
}

export const LEGAL_REVIEW_NOTICE =
  "This is draft platform policy text prepared for internal review. It has not yet been reviewed by Bangladeshi counsel, and it does not constitute legal advice. Section 20 of the master specification requires a recorded counsel sign-off before launch.";

export const legalDocuments: LegalDocument[] = [
  {
    slug: "terms",
    title: "Terms of Service",
    updated: "2026-11-04",
    summary:
      "The agreement between you and the platform: what we sell, how orders and licences work, what each side is responsible for, and how disputes are handled in Bangladesh.",
    sections: [
      {
        heading: "1. Who we are",
        paragraphs: [
          "This site is operated by an independent Bangladeshi marketplace and digital services business. We resell or refer subscriptions to third-party software products through authorized channels, and we perform original academic support services with our own specialists and vetted contractors.",
          "We are not affiliated with, endorsed by, or sponsored by any third-party product owner whose name, logo or trademark appears on this site. All such names and marks are the property of their respective owners and are used for identification only.",
        ],
      },
      {
        heading: "2. What you are buying",
        paragraphs: [
          "Every listing states its offering type. These are different kinds of transaction and are never interchangeable:",
        ],
        bullets: [
          "Personal subscription — a licence for one named user, provisioned to you.",
          "Gift voucher — a redemption code you apply to your own account with the provider.",
          "Institutional licence — a seat assigned by an organization, not by us.",
          "Education referral — we send you the provider's official education programme link. The provider grants the discount and is the seller of record; we collect nothing for that item.",
          "Our own service — work performed by our specialists under a fixed quotation.",
        ],
      },
      {
        heading: "3. Authorization and sourcing",
        paragraphs: [
          "We list a third-party subscription only where we hold a current reseller or distribution agreement, or where the provider operates a public referral or education programme. Where authorization evidence expires, the listing is automatically made unpurchasable — it may remain visible for information, but the purchase control is disabled.",
          "We do not sell shared accounts, resold credentials, stolen or fraudulently obtained subscriptions, or any entitlement acquired in breach of a provider's terms. If we discover that a delivered item was not legitimately sourced, we revoke it and refund you.",
        ],
      },
      {
        heading: "4. Orders, prices and payment",
        paragraphs: [
          "All prices are in Bangladeshi Taka and are maintained in our catalogue, not in the page you are viewing. The price shown on a listing at the moment you add it to your cart is the price recorded on your order line; it does not change afterwards, even if we later change the catalogue price.",
          "Discounts are applied in a fixed order: any active sale price, then a bundle saving, then a verified student discount, then a coupon. A price floor applies, so stacked discounts can never take a line below the configured minimum.",
          "Payment is processed by licensed Bangladeshi payment service providers (SSLCommerz, bKash, Nagad, Rocket). We never ask for and never store your card number, PIN, OTP or full mobile-wallet credentials. Payment happens on the gateway's own page.",
          "An order is created only when the gateway's server-to-server confirmation verifies that payment succeeded. A browser redirect, a screenshot or a client-side claim of success never creates an order or triggers delivery.",
        ],
      },
      {
        heading: "5. Delivery and licence keys",
        paragraphs: [
          "Automated lines are released from our code vault the moment payment is verified. Manual lines are delivered within the business-hour SLA stated on the listing.",
          "A delivered licence key or voucher code is for your own use by a single named user unless the listing states otherwise. Reselling, sharing publicly, or transferring a delivered code is prohibited and voids any refund entitlement.",
          "Downloads are released through short-lived signed URLs from a private store, and every access is recorded. You may not share a download link.",
        ],
      },
      {
        heading: "6. Services",
        paragraphs: [
          "A service request creates an obligation to review, not to perform. We review every request against our permitted scope before issuing a quotation, and we decline work that falls outside it.",
          "A quotation is fixed once issued: price, turnaround and revision allowance do not change after you accept it. Work begins only after payment is verified.",
          "Our academic integrity boundary is set out in the Services Policy and is a condition of every request. You must acknowledge it, and we record the acknowledgement with a timestamp and your IP address.",
        ],
      },
      {
        heading: "7. Your responsibilities",
        bullets: [
          "Provide accurate account and contact details, and keep your credentials secure.",
          "Use purchased licences in accordance with the provider's own terms of service.",
          "Do not use our services to deceive an institution, evade a plagiarism or AI-detection system, or submit work that is not yours where your institution forbids it.",
          "Do not attempt to interfere with, probe, or gain unauthorized access to this platform or its APIs.",
          "Comply with the Acceptable Use Policy, which forms part of these terms.",
        ],
      },
      {
        heading: "8. Refunds",
        paragraphs: [
          "Refund eligibility is stated per listing and per service. Digital licence keys and voucher codes that have been delivered and revealed are generally non-refundable, because they cannot be resold. Lines that fail to deliver, or that were not legitimately sourced, are refunded in full.",
          "The full conditions, time limits and the process for requesting a refund are in the Refund Policy.",
        ],
      },
      {
        heading: "9. Availability and changes",
        paragraphs: [
          "We aim for high availability but do not guarantee uninterrupted service. Third-party products may change their own features, pricing or terms at any time; where a change materially affects a subscription you hold, we will notify you.",
          "We may update these terms. Material changes are notified by email and by a notice on the site before they take effect.",
        ],
      },
      {
        heading: "10. Liability",
        paragraphs: [
          "Our total liability for any claim arising out of an order is limited to the amount you paid for that order, except where Bangladeshi law provides otherwise. We are not liable for indirect or consequential loss, or for a provider's own change to a product you hold.",
          "Nothing in these terms limits liability that cannot lawfully be limited, including for fraud, death or personal injury caused by negligence, or for rights granted under the Consumer Rights Protection Act 2009.",
        ],
      },
      {
        heading: "11. Governing law and disputes",
        paragraphs: [
          "These terms are governed by the laws of the People's Republic of Bangladesh. The courts of Chattogram have jurisdiction.",
          "Before any proceedings, both sides will attempt in good faith to resolve a dispute through our support channel within 14 days. You also retain your statutory right to complain to the Directorate of National Consumer Rights Protection.",
        ],
      },
      {
        heading: "12. Contact",
        paragraphs: [
          "Questions about these terms should be sent to our support address, quoted with your order or request reference so we can find the record quickly.",
        ],
      },
    ],
  },

  {
    slug: "privacy",
    title: "Privacy Policy",
    updated: "2026-11-04",
    summary:
      "What personal data we collect, why we collect it, where it is stored, how long we keep it, who we share it with, and the rights you have under Bangladeshi law.",
    sections: [
      {
        heading: "1. What we collect",
        bullets: [
          "Account data: name, email address, hashed password, phone number, and your role.",
          "Order data: what you bought, the price snapshot at the time, payment reference from the gateway, invoice details, delivery records.",
          "Service-request data: your brief, institution, deadline, your integrity declaration with its timestamp and IP address.",
          "Verification data: student or institutional status, document type, issue and expiry dates, and a reference to the uploaded image.",
          "Technical data: IP address, user agent, pages visited, error reports, and security-relevant events.",
        ],
      },
      {
        heading: "2. What we never collect",
        paragraphs: [
          "We do not collect, request or store your card number, card security code, mobile-wallet PIN, or one-time password at any point. Those values exist only between you and the licensed payment provider. If anyone claiming to represent us asks you for a PIN or OTP, it is a fraud attempt — report it to us immediately.",
        ],
      },
      {
        heading: "3. Why we process it",
        bullets: [
          "To fulfil an order: verify payment, deliver the entitlement, issue an invoice.",
          "To perform a service: review scope, quote, deliver, handle revisions.",
          "To meet legal obligations: VAT records, accounting retention, consumer-rights response.",
          "To protect the platform and our customers: fraud prevention, rate limiting, audit logging.",
          "To operate features you asked for: renewal reminders, subscription expiry notices, support tickets.",
        ],
      },
      {
        heading: "4. Legal basis",
        paragraphs: [
          "Processing is necessary for the performance of a contract with you, for compliance with a legal obligation (tax and consumer-protection law), or for our legitimate interests in operating and securing the platform. Marketing email is sent only with your consent, and every message carries a working unsubscribe link.",
        ],
      },
      {
        heading: "5. How we store and protect it",
        bullets: [
          "Passwords are hashed with Argon2id. We never store a plaintext password.",
          "Sessions are stored server-side in the database, not as self-contained tokens that survive revocation.",
          "Cookies carrying a session are HttpOnly, Secure and SameSite=Lax.",
          "Uploaded documents live in a private object-storage bucket, released only through short-lived signed URLs, with per-file access control.",
          "Every access to a sensitive record — supplier cost, authorization evidence, another person's file — is written to an append-only audit log.",
          "Customer files and downloads are scoped to the owning customer. One customer can never retrieve another customer's file, even by guessing an identifier.",
        ],
      },
      {
        heading: "6. Who we share it with",
        bullets: [
          "Licensed payment service providers (SSLCommerz, bKash, Nagad, Rocket) — the minimum needed to process a payment.",
          "Suppliers and authorized resellers — only where needed to provision a licence you ordered.",
          "Email delivery and object-storage providers, under data-processing terms.",
          "Law enforcement or a regulator, only where we are legally compelled, and recorded in the audit log.",
        ],
        paragraphs: [
          "We do not sell personal data. We do not share it with advertisers for profiling.",
        ],
      },
      {
        heading: "7. Retention",
        bullets: [
          "Order and invoice records: retained for the period required by Bangladeshi tax law, then archived.",
          "Verification documents: the image is deleted once verification is decided; only the outcome and expiry date are kept.",
          "Service requests and the integrity declaration: retained with the order record for the same period.",
          "Audit log: append-only, retained for the compliance period, never edited or deleted.",
          "Failed or abandoned carts: purged on a short cycle.",
        ],
      },
      {
        heading: "8. Your rights",
        bullets: [
          "Access — request a copy of the personal data we hold about you.",
          "Correction — ask us to fix inaccurate data.",
          "Erasure — ask us to delete data, except where we must retain it for tax or legal reasons.",
          "Restriction and objection — ask us to limit processing, particularly for marketing.",
          "Portability — request your order history in a structured, machine-readable format.",
          "Complaint — complain to us first, and to the competent Bangladeshi authority if unresolved.",
        ],
        paragraphs: [
          "Requests are answered within 30 days. We verify identity before releasing any data, because the alternative would leak your information to whoever asked.",
        ],
      },
      {
        heading: "9. International transfers",
        paragraphs: [
          "Where a processor operates outside Bangladesh, we transfer only the minimum necessary data under contractual protections. Product provisioning may require a provider to receive the email address you supply for the licence.",
        ],
      },
      {
        heading: "10. Children",
        paragraphs: [
          "The platform is not directed at children under 13, and we do not knowingly collect their data. Student verification confirms enrolment at a recognised institution, not age.",
        ],
      },
      {
        heading: "11. Applicable framework",
        paragraphs: [
          "This policy is drafted against the Cyber Security Act 2023, the ICT Act 2006, the draft Data Protection Act and the Digital National Consumer Rights Protection Framework, and will be revised as those instruments are finalised.",
        ],
      },
    ],
  },

  {
    slug: "refunds",
    title: "Refund Policy",
    updated: "2026-11-04",
    summary:
      "When a refund is due, when it is not, how long you have, and exactly how to request one. Written to be operable, not to be decorative.",
    sections: [
      {
        heading: "1. The principle",
        paragraphs: [
          "A refund is due whenever you did not receive what you paid for, or what you received was not legitimately sourced. A refund is not due when you received a working, legitimately sourced digital entitlement and simply changed your mind — because a revealed licence key or voucher code cannot be un-revealed or resold.",
        ],
      },
      {
        heading: "2. Always refunded in full",
        bullets: [
          "Payment succeeded but delivery failed, and we cannot deliver within the stated SLA.",
          "The item was not legitimately sourced, or the authorization behind it lapsed before delivery.",
          "We cancelled a listing or a bundle after you paid and cannot supply an equivalent.",
          "A duplicate payment was taken for the same order.",
          "A service was accepted and paid for, but we decline it during scope review.",
        ],
      },
      {
        heading: "3. Refunded before delivery only",
        paragraphs: [
          "For listings marked refundable-before-delivery, you may cancel at any point up to the moment the code is revealed or the entitlement is provisioned. After that point the listing becomes non-refundable, and the checkout page tells you which state you are in before you pay.",
        ],
      },
      {
        heading: "4. Not refundable",
        bullets: [
          "A delivered licence key, voucher or redemption code that has been revealed to you.",
          "A subscription you activated and used, where the provider's own terms make it non-refundable.",
          "An education referral — the provider is the seller of record and sets its own terms.",
          "Service work already delivered and accepted, including work where you used your included revisions.",
          "A request refused because it fell outside our permitted scope after work had already begun at your instruction.",
        ],
      },
      {
        heading: "5. Services: revisions and partial refunds",
        paragraphs: [
          "Every service quotation states a revision allowance. Revisions within that allowance are included at no cost, provided the request stays within the originally quoted scope.",
          "Work outside the quoted scope is a change request: we quote it separately and you decide. We do not silently expand scope and charge later.",
          "Where delivered work materially fails the agreed specification and cannot be fixed within the revision allowance, we refund the affected portion. The amount is proportionate to the part that failed, not automatically the whole fee.",
        ],
      },
      {
        heading: "6. Time limits",
        bullets: [
          "Delivery failure: report within 14 days of the order.",
          "Refundable-before-delivery cancellation: any time before the code is revealed.",
          "Service quality: within 7 days of delivery and before you mark the request complete.",
          "Duplicate charge: as soon as you notice it — there is no deadline for money we took twice.",
        ],
      },
      {
        heading: "7. How to request a refund",
        paragraphs: [
          "Open the order or request in your dashboard and use the refund action, or contact support with your reference number. Tell us what went wrong and what you expected. We will acknowledge within one business day.",
        ],
        bullets: [
          "We review the order record, the payment confirmation and the delivery log.",
          "We tell you the decision and the reason in writing.",
          "An approved refund is written to the ledger and reverses the revenue it originally recognised.",
          "Money returns by the original payment method. Mobile-wallet refunds typically arrive within 3–7 business days; card refunds depend on the issuer and can take up to 15 business days.",
        ],
      },
      {
        heading: "8. Effect on our reporting",
        paragraphs: [
          "Refunds are not hidden. Every approved refund creates a ledger entry and reduces net revenue in the period it is issued. Our financial reporting always separates gross revenue from net revenue (gross minus refunds and gateway fees) and from contribution margin (net minus cost of goods and direct fulfilment cost).",
        ],
      },
      {
        heading: "9. Escalation",
        paragraphs: [
          "If you are not satisfied with our decision, reply to the decision email and ask for escalation to a manager; we will respond within 5 business days. You also retain your statutory right to complain to the Directorate of National Consumer Rights Protection under the Consumer Rights Protection Act 2009, and that right is not affected by anything in this policy.",
        ],
      },
      {
        heading: "10. Chargebacks",
        paragraphs: [
          "Please talk to us first. A chargeback through your bank or wallet freezes the order and the entitlement while the provider investigates, which is slower for everyone. We would rather fix the problem directly.",
        ],
      },
    ],
  },

  {
    slug: "acceptable-use",
    title: "Acceptable Use Policy",
    updated: "2026-11-04",
    summary:
      "What you may and may not do with an account, a purchased licence, a delivered file and our APIs. Includes the practices we will never support, and what happens if this policy is breached.",
    sections: [
      {
        heading: "1. Scope",
        paragraphs: [
          "This policy applies to every account holder, every purchased entitlement, every delivered file, and every request made to our APIs. It forms part of the Terms of Service.",
        ],
      },
      {
        heading: "2. Never permitted",
        bullets: [
          "Selling, buying, sharing or distributing stolen, shared, cracked or otherwise unauthorized accounts or subscription credentials.",
          "Reselling a licence key or voucher delivered to you, or publishing it anywhere.",
          "Using a purchased subscription in breach of the provider's own terms of service.",
          "Circumventing a licence limit, seat count, device limit or regional restriction.",
          "Using our services to ghost-write assessed work, complete an examination or graded assessment, or produce work intended for submission as your own where your institution forbids it.",
          "Using our services to evade plagiarism detection or AI-detection systems, including any 'undetectable AI' or 'beat Turnitin' purpose.",
          "Asking us to fabricate data, citations, references, sources, survey responses or results.",
          "Uploading malicious code, or attempting to probe, disrupt or gain unauthorized access to the platform or its APIs.",
          "Scraping the catalogue at volume, or reselling our pricing data as your own.",
          "Impersonating another person, or submitting another person's verification documents.",
          "Using the platform for any purpose unlawful in Bangladesh.",
        ],
      },
      {
        heading: "3. Payment conduct",
        bullets: [
          "Never share your wallet PIN, OTP or card details with anyone, including anyone claiming to be our staff. We will never ask.",
          "Do not use stolen, borrowed or unauthorized payment instruments.",
          "Do not exploit a pricing error. If we mis-price an item we will cancel and refund rather than hold you to it, and repeated exploitation is a breach of this policy.",
          "Do not submit fraudulent chargebacks after receiving a delivered entitlement.",
        ],
      },
      {
        heading: "4. Content you upload",
        paragraphs: [
          "You may upload your own academic work for a service request. You must hold the right to share it. Do not upload another person's work as your own, confidential institutional material you are not permitted to share, or anything unlawful.",
          "Uploads are stored in a private bucket, released only to the specialist assigned to your request through short-lived signed URLs, and every access is logged. Uploaded material is deleted after the retention period in the Privacy Policy.",
        ],
      },
      {
        heading: "5. Rate limits and automation",
        paragraphs: [
          "Public endpoints are rate limited. If you need programmatic access at volume, contact us about an arrangement rather than working around the limit.",
        ],
      },
      {
        heading: "6. Enforcement",
        bullets: [
          "First, we may remove the offending content or request and explain why.",
          "For a serious or repeated breach we may suspend the account, cancel outstanding orders and refuse a refund where the entitlement was already delivered and misused.",
          "Where we believe a criminal offence has occurred, we may report it to the competent authority and preserve the relevant records.",
          "Every enforcement action is written to the audit log with its reason, so a decision can be reviewed rather than simply asserted.",
        ],
      },
      {
        heading: "7. Appeals",
        paragraphs: [
          "If your account or request is restricted, you may appeal in writing within 14 days. An appeal is reviewed by a person who was not involved in the original decision, and you receive the outcome with reasons.",
        ],
      },
    ],
  },

  {
    slug: "services-policy",
    title: "Services Policy & Academic Integrity",
    updated: "2026-11-04",
    summary:
      "The boundary our academic support services operate inside: what we do, what we refuse, how a request is screened, how quotations and revisions work, and why this is a hard rule rather than a guideline.",
    sections: [
      {
        heading: "1. Why this policy exists",
        paragraphs: [
          "A marketplace that sells study tools and also offers 'academic help' sits next door to contract cheating. The only defensible position is a bright line, published in advance, applied to every request without exception. This is that line.",
          "It protects you: work produced outside it can be penalised by your institution, up to expulsion. It protects the specialists who work with us. And it protects the credibility of the qualifications that everyone else is earning honestly.",
        ],
      },
      {
        heading: "2. Permitted scope — what we do",
        bullets: [
          "Document formatting to a university, department or journal template, including margins, heading hierarchy, tables, figures, captions and front matter.",
          "Citation and reference management: building, correcting and converting reference lists in APA, IEEE, MLA, Chicago, Harvard or a house style, from sources you supply.",
          "Editing, proofreading and restructuring of work you have written — clarity, grammar, flow, academic register — without changing the substance or the argument you are making.",
          "Research strategy and source discovery: search strings, database selection, systematic-review screening support, and annotated bibliographies of real, verifiable sources.",
          "Data cleaning, transformation and visualization of a dataset you hold the right to use.",
          "Statistics guidance: choosing an appropriate test, running it on your data, interpreting the output, and explaining it to you so you can defend it.",
          "Presentation and poster design built from content you provide.",
          "Tutoring, and setup of AI workflows or prompts on tools you are entitled to use.",
        ],
      },
      {
        heading: "3. Prohibited scope — what we refuse",
        bullets: [
          "Ghost-writing any work intended for submission as your own.",
          "Completing a graded assessment, examination, quiz, viva or lab report on your behalf.",
          "Plagiarism evasion, including rewriting specifically to defeat a similarity checker, and any 'undetectable AI' or 'beat Turnitin' service.",
          "Fabricating data, results, citations, references, sources, survey responses or ethical approvals.",
          "Producing an original research contribution for you to present as your own.",
          "Anything your institution's academic regulations prohibit.",
        ],
        paragraphs: [
          "We refuse these regardless of price, deadline pressure, or how the request is phrased. If a request is ambiguous we will ask you to clarify the scope before quoting — and if the clarification shows it falls outside the permitted scope, we decline and explain why.",
        ],
      },
      {
        heading: "4. How a request is screened",
        bullets: [
          "You must tick an academic-integrity declaration before a request can be submitted. The acknowledgement is stored with a timestamp and your IP address.",
          "The brief is screened against the prohibited-scope phrase list. A match never auto-rejects — it routes the request to a human integrity review before any quotation is issued, because phrase matching produces false positives in both directions.",
          "A specialist reviews the scope. Anything outside the permitted list is declined in writing.",
          "Review outcomes are recorded so a decision can be audited rather than merely asserted.",
        ],
      },
      {
        heading: "5. Quotations",
        bullets: [
          "A quotation states the scope, the price, the turnaround and the number of included revisions.",
          "Once you accept it, the quotation is immutable. We do not raise the price later because the work turned out to be harder than expected — that is our risk, not yours.",
          "A quotation has an expiry. If it lapses we issue a fresh one; we never charge you against an expired figure.",
          "Work outside the quoted scope is a change request, quoted separately, and only started with your written agreement.",
        ],
      },
      {
        heading: "6. Revisions",
        paragraphs: [
          "Every quotation includes a stated revision allowance. Revisions are included at no cost where the request stays inside the originally quoted scope. A request to change the scope is a change request, not a revision.",
          "Where delivered work materially fails the agreed specification and cannot be corrected within the allowance, the Refund Policy applies to the affected portion.",
        ],
      },
      {
        heading: "7. Files and confidentiality",
        bullets: [
          "Uploads are stored in a private bucket with per-file access control and released only through short-lived signed URLs.",
          "Only the specialist assigned to your request can access your material, and every access is logged.",
          "We do not reuse your work, add it to a corpus, submit it anywhere, or share it with another customer.",
          "Your material is deleted after the retention period in the Privacy Policy.",
        ],
      },
      {
        heading: "8. Use of AI tools in our work",
        paragraphs: [
          "Our specialists may use AI tools for research assistance, formatting and language polishing where your institution permits it, and we will tell you on request which tools were used on your file. We never use them to fabricate sources or data, and we never present AI output as verified fact without checking it.",
          "Where your institution requires a declaration of AI use, we will provide the information you need to make it accurately.",
        ],
      },
      {
        heading: "9. Specialist standards",
        bullets: [
          "Specialists are vetted for subject competence and trained on this policy before taking work.",
          "A specialist may decline a request that makes them uncomfortable, and will not be penalised for doing so.",
          "Repeated breaches by a specialist end the engagement.",
        ],
      },
      {
        heading: "10. Reporting a concern",
        paragraphs: [
          "If you believe a request, a delivery or a specialist has breached this policy, tell us. Reports are reviewed by someone independent of the work, and the outcome is recorded in the audit log.",
        ],
      },
    ],
  },
];

export function getLegalDocument(slug: string): LegalDocument | undefined {
  return legalDocuments.find((document) => document.slug === slug);
}
