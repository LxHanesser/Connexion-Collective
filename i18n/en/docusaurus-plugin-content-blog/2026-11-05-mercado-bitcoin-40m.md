---
slug: mercado-bitcoin-40m
title: "$40 million across ten chains: the operational problem behind Mercado Bitcoin"
authors: [lxhanesser]
tags: [Security, Crypto]
date: 2026-11-05T21:30:00+08:00
description: On 2 November, Brazil's Mercado Bitcoin lost roughly $40 million, paused withdrawals and promised to cover users. Reports still disagree on the exact chains and amount, but this was not a smart-contract bug — it looks like hot-wallet, signing or multi-chain operations.
---

On 2 November, Brazil's Mercado Bitcoin saw abnormal outflows. Public reports do not fully agree: the figure is around $40 million, spread across roughly ten chains including Bitcoin, Ethereum, Solana, TRON, Polygon and Arbitrum. The exchange paused withdrawals and said it would cover user losses.

Let us be precise about what is known: the exact per-chain amounts and the identity of the attacker are still moving. What can be discussed at the architecture level is that this was not a smart-contract bug. It looks like a failure in **hot wallets, signing, or multi-chain operations**.

{/* truncate */}

<img src="/img/blog/mercado-bitcoin/fig1-flow-en.svg" alt="Withdrawal path at a multi-chain exchange: hot wallet, signing service and broadcast across ten chains — any layer failing becomes an outflow" width="1000" height="300" loading="lazy" />

## The complexity of multi-chain exchanges is underestimated

A single-chain exchange has a fairly simple withdrawal path: one hot wallet, one signing setup, one broadcast. A multi-chain exchange simultaneously maintains:

- nodes and confirmation policies for ten chains
- address formats, fees, and memo/tag rules per chain
- sweeping and hot-to-cold transfers
- contract calls and token approvals on different chains

Every additional chain adds a set of keys, an RPC provider, and a place to misconfigure. Security teams often organise by chain. An attacker only needs one entry point.

## Which layer probably failed

Three areas stand out from public information:

**Hot wallets with too much authority.** If a hot wallet can move large balances directly, one compromised signing service or ops account drains everything. The usual control is to keep only daily liquidity hot and move the rest to cold storage, multisig or MPC.

**Signing without human review.** Automation is normal in multi-chain operations. "Auto-sign plus no limit" is a dangerous combination, especially at night, at weekends, or when monitoring alerts are ignored.

**Slow on-chain monitoring.** Abnormal transfers across ten chains, watched only on a dashboard, are usually discovered after funds reach a mixer. Address clustering, frequency anomalies and large-outflow alerts should fire automatically.

## A checklist for exchanges and custodians

If you hold assets for users, these matter more than which WAF you buy:

1. **Withdrawal limits and delays** — above a threshold, manual review; large amounts wait 24 hours.
2. **Multisig or MPC** — signing authority split across people and systems, so one compromise is not total loss.
3. **Address allowlists** — extra verification for first-time destinations, reducing damage from stolen accounts.
4. **On-chain monitoring** — automatic alerts by address, chain and amount; auto-pause withdrawals on anomaly.
5. **Proof of reserves** — publish reserves regularly so users can verify.
6. **Drills** — assume the hot wallet is already gone; cold-wallet movement, comms, support and regulatory contact should run within an hour.

## What ordinary users can do

- Do not keep everything on one exchange.
- Enable withdrawal allowlists; test with a small amount first.
- Follow official channels only; "support" in your DMs is not support.
- Keep large balances in self-custody, with seed phrases offline.

## Closing

The exchange has promised to cover the loss, so users will probably not pay directly. The real issue for the industry is not how much was refunded, but that **the security cost of multi-chain operations is systematically underestimated**.

Every chain added requires more security budget, more monitoring coverage and more training. If those costs are not reflected in the product design, the next incident is just a different name over a different set of chains.
