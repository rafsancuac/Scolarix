import "server-only";

import Link from "next/link";

import { db } from "@/server/db";

/**
 * Account overview — every number is a live query scoped to `userId` (rule 13).
 * Zero is shown as zero with an honest empty state, never a placeholder figure.
 */
export async function AccountOverview({ userId, name }: { userId: string; name: string }) {
  const [orders, subscriptions, tickets, wishlist] = await Promise.all([
    db.order.count({ where: { userId } }),
    db.subscription.count({ where: { userId } }),
    db.ticket.count({ where: { userId } }),
    db.wishlistItem.count({ where: { userId } }),
  ]);

  const cards = [
    { label: "Orders", value: orders, empty: "No orders yet.", href: "/explore", cta: "Browse the catalogue" },
    { label: "Active subscriptions", value: subscriptions, empty: "You have no subscriptions.", href: "/explore", cta: "Find a plan" },
    { label: "Support tickets", value: tickets, empty: "No open tickets.", href: "/support", cta: "Contact support" },
    { label: "Saved items", value: wishlist, empty: "Nothing saved yet.", href: "/explore", cta: "Explore" },
  ];

  return (
    <section aria-labelledby="overview" className="container-page pt-10">
      <h2 id="overview" className="text-h3 font-semibold text-primary">Welcome, {name}</h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <li key={card.label} className="card p-5">
            <p className="text-caption text-muted">{card.label}</p>
            <p className="tnum mt-1 text-h2 font-bold text-primary">{card.value}</p>
            {card.value === 0 ? (
              <p className="mt-2 text-caption text-secondary">
                {card.empty}{" "}
                <Link href={card.href} className="font-medium text-accent underline underline-offset-2">{card.cta}</Link>
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
