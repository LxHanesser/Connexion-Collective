---
slug: binance-63b-incident
title: "No zero-day in the chain: how $6.34 billion left Binance"
authors: [lxhanesser]
tags: [Security, Crypto]
date: 2026-11-06T12:00:00+08:00
description: "Binance says about $6.34 billion was affected after a fake interview, an internal AI tool and an EIP-7702 delegation. No zero-day was used."
---

In the twenty minutes after 20:05 UTC on 29 October, wallets belonging to Binance lost roughly $6.36 billion across ten blockchains. The FBI pinned it on North Korea on 1 November. Binance published its own preliminary findings two days later.

My first reaction was not "this was impossible to stop". There is no zero-day anywhere in that chain. No memory corruption, no protocol implementation bug. What the attackers used was three unremarkable things: a job posting, an internal AI tool that acts on people's behalf, and a container deployment token sitting on an engineer's laptop.

{/* truncate */}

<img src="/img/blog/binance-63b/fig1-chain-en.svg" alt="The five-stage Binance attack chain: two delivery attempts reach developer endpoints, an internal AI tool is used to pivot to wallet team members, a deployment token left on a laptop opens the signing service, and a persistent delegation is written on-chain" width="1000" height="300" loading="lazy" />

Three words need separating before anything else, or the rest of this gets muddy. **Affected** is Binance's framing: assets the incident touched. **Moved** is what actually left on-chain. **Lost** is who ends up paying. Binance says it absorbs the hit and customers lose nothing, so the customer-side loss is close to zero. For the company and the industry, the accounting is different.

## 1. Pin the numbers down first

The easiest thing to get wrong in an incident like this is the amount, because every organisation is counting something different.

| Figure | Source | What it measures |
| --- | --- | --- |
| ~$6.36 bn | TRM Labs | Estimated value moved out of Binance wallets on 29 October, across ten chains |
| ~$6.34 bn | Binance, 3 Nov | "digital assets affected" — not the same as everything that left |
| Over $6 bn | FBI alert, 1 Nov | Loose description of the same event |
| ~$2.85 bn | Binance, 3 Nov | Frozen or intercepted |
| ~$2.7 bn | Sum of Tether, Circle, Ripple, WLFI and Arbitrum freezes | Issuer- and governance-level actions |
| ~$2.4 bn | TRM | ETH and BTC the attackers still hold, beyond any issuer's reach |

Those six lines **do not add up**, and should not be added. They are measured at different moments against different things. The $2.85 bn is Binance's own tally as of 3 November; the $2.7 bn is a press-roundup sum of individual freezes; the $2.4 bn is the on-chain balance marked to market. Anyone turning them into a single "recovery rate" chart is inventing data.

The timeline is cleaner, because Binance described it day by day:

| Time (UTC) | Event |
| --- | --- |
| 2026-06 | A wallet DevOps engineer, call him A, downloads a tampered Homebrew installer while looking for an AI coding tool. Binance spots it, replaces the device, rotates credentials |
| 2026-09 | Engineer B is approached on a legitimate job platform. After two fake interviews, he downloads a "technical assignment" onto his work machine; the malicious code runs during setup |
| 2026-10-20 | Attackers use B's machine to abuse an internal AI tool, gaining access to A and a second wallet engineer, C. They find a container deployment token on A's machine |
| 2026-10-29 20:05 | Transfers begin; most complete within about twenty minutes |
| 2026-10-29 23:56 | Last unauthorised transfer, 2,961.9 ETH, is finalised |
| 2026-10-30 00:10 | The malicious on-chain authorisation is cleared |
| 2026-11-01 | FBI attributes the theft to TraderTraitor (Lazarus, APT38) |
| 2026-11-03 | Binance publishes preliminary findings |
| 2026-11-04 | Binance reports 98% of assets replenished and a new proof-of-reserves snapshot covering 44 tokens |

Two deliveries, three lateral moves, twenty minutes of draining — spread over five months. That is not a smash and grab. That is a dwell-then-wait pattern.

## 2. The entry point was a job ad; the miss was scope

The June compromise deserves its own look. Engineer A wanted an AI coding assistant and got a tampered Homebrew package instead. Note the choice of ecosystem: not npm, not pip — Homebrew. On macOS it is treated as plumbing. People audit their `package.json` far more readily than they audit a formula they installed a year ago.

Binance's response was not slow: it detected the activity, replaced the device and rotated credentials. But that covers two thirds of the job. The missing third is that **the engineer's identity had already leaked** — which team he sits in, who he works with, what he is allowed to touch. The published findings mention this in one flat sentence. That sentence is the hinge of the whole incident.

Three months later, the attackers went shopping with that org chart. Same team, wallet software engineering. Same channel, a legitimate job platform. They posed as a project director and ran two interviews: in the first, the "HR representative" volunteered a social media account full of personal photos and videos to build credibility; the second moved to a mainstream chat app and ended with a request to download the "assignment" onto the candidate's work laptop.

None of this is new tradecraft. Line the decade up and the entry point barely moves:

| Year | Incident | Amount | Entry point |
| --- | --- | --- | --- |
| 2016 | Bangladesh Bank SWIFT fraud | $81 m | Malicious attachments disguised as job applications, sent to central bank staff |
| 2022 | Axie Infinity / Ronin bridge | ~$600 m | A fake offer on LinkedIn; an engineer downloaded the file |
| 2025 | Bybit multisig cold wallet | ~$1.5 bn | A wallet vendor's developer environment was compromised and malicious code reached the signing interface |
| 2026 | Binance | ~$6.3 bn | A fake interview's take-home repository |

Ten years, four incidents, a near-eightyfold increase. Only the packaging of the "file" changed: attachment, PDF, Docker project, code repository. What never changed is that somebody had to open it by hand.

What interests me more is the endpoint detail. The malicious repository executed during `setup`, replaced a component of a legitimate developer tool, obfuscated itself and called back to an attacker-controlled server. **Endpoint security did not catch it.** That is not an argument for buying a better EDR. A swapped developer tool component can differ from the real one by a few lines of network code, and only at the moment it is invoked. The detection that matters is not "does this binary look malicious" but "should this binary exist at this path at all".

## 3. The internal AI tool: not a model flaw, a confused deputy

The 20 October step is the part I would put in front of every platform team. Using B's machine, the attackers operated Binance's internal AI tool and, through it, obtained access to the machines of A and C. The findings are careful about this: no vulnerability was found in the AI model itself.

That distinction carries the whole lesson. The problem is not whether a model can be talked into misbehaving. It is **whose authority the tool acts under**.

I do not know the capability boundary of Binance's tool — what it can read, what it can write, whether it can execute actions on another person's machine. That has not been published. So what follows is a general argument about this class of system, not a claim about Binance's.

Every internal assistant that "does things for you" has to answer one question: when it performs an action, does it carry the caller's permissions, or its own service identity?

- If it carries **the caller's permissions**, it is a privilege amplifier. Compromise the caller and the tool becomes a lateral movement path — a faster one than the human, because ten clicks become one API call.
- If it carries **a service identity**, it is a high-privilege machine that anyone who can reach it may borrow. That is the classic confused deputy: the delegate holds more power than the delegator and cannot tell who is really asking.

Both designs can be made safe, but not the same way. The first needs high-risk actions gated behind confirmation, and the tool treated as untrusted whenever it runs from a compromised endpoint. The second needs the service identity cut down to what is required, not what is convenient.

In practice a third design turns up more often: nobody decided, the thing was shipped to work, and it ended up with part of the caller's context and part of a service role. That system will not be flagged red in a penetration test, because there is no vulnerability in it. Only **surplus trust**.

## 4. EIP-7702: why pausing withdrawals did not help

Once inside the wallet signing environment, the attackers did two things: used stolen credentials to reach another engineer's machine, deployed a container and ran a malicious script; then bypassed the normal withdrawal path and submitted transactions straight to the signing service.

What made containment hard was the on-chain step. Binance says the attackers used Ethereum's EIP-7702 to give a malicious contract **partial execution rights** over one of its hot wallets.

EIP-7702 arrived with Pectra. It lets an externally owned account behave like a smart contract wallet without changing address or migrating funds. Mechanically it adds a `0x04` transaction type carrying an `authorizationList`, where each entry is a signed `(chain_id, contract_address, nonce)` tuple. Once included, the account's bytecode points at the delegated contract — every subsequent call to that address executes the contract's code in the account's own context.

The operative detail is that **the delegation is persistent**. It does not expire after one transaction. It stays until explicitly revoked, and revoking means sending another `0x04` transaction that points the delegation at `address(0)`, which clears the bytecode and returns the account to a plain EOA.

That is why "pause withdrawals" changed nothing. Withdrawal is an **off-chain workflow**: validation, risk checks, signing, broadcast. Pausing it closes the front door of that workflow. But once a delegation lands in state, it is an authorisation that exists independently of exchange infrastructure — the attacker calls the contract and never touches Binance's withdrawal queue. Binance put it plainly: suspending withdrawals was not enough to stop the transfers, because the malicious authorisations were already on-chain and operating outside the normal withdrawal path.

Revocation was not instant either. Binance's wallets run on multi-party computation, so there is no single private key and no single action that voids the delegation. Clearing it required a full MPC signing round, and a scope assessment first. The same design pays for itself elsewhere: Binance says it found no evidence that any wallet private key was stolen. What the attackers obtained was the ability to make keys turn, not the keys. The timestamps tell the story: the last unauthorised transfer finalised at 23:56 UTC, the malicious authorisation cleared at 00:10 UTC. Fourteen minutes.

For anyone running infrastructure, the transferable rule is this: **revoking on-chain state is its own incident-response playbook**, not a variant of "stop the service". It is a different kind of action from draining traffic or rolling back a deploy, and it cannot be improvised at 3 a.m. Before EIP-7702 shipped, there was a lot of discussion about phishing a single delegation signature and losing an account permanently. That risk has now shown up in a real loss, with an exchange's signing service as the signer.

## 5. What you can freeze is decided by the asset

Of the transfers disclosed so far, the XRP portion came from five hot wallets and totalled 233.46 million XRP. Add roughly 970,500 SOL, 44.2 million OP and 18,270 BTC. Those do not come close to $6.34 billion. Binance has not broken the remainder down by asset, but the freezes that followed point at stablecoins and ETH for the bulk of it.

The freeze numbers look decent. Tether, Circle, Ripple and World Liberty Financial froze about $2.67 billion of stablecoins between them. Arbitrum's Security Council froze 8,426 ETH and 74.6 million ARB. Call it $2.7 billion.

Then it stops.

**You can only freeze an asset that has an issuer.** USDT and USDC have an entity holding a blacklist switch. XRP has an issuer. Assets on Arbitrum have a governance layer. Native ETH and BTC have neither. The attackers clearly understood the difference: they sold USDT to market makers and borrowed ETH against USDT on Aave, changing the shape of the assets before the freezes landed. TRM puts what remains at more than 420,000 ETH and 18,270 BTC — roughly $2.4 billion sitting where no issuer can reach it.

So "can a stolen exchange balance be recovered" is mostly answered by the asset list, not by response speed. An exchange holding mostly stablecoins has a structurally higher recovery ceiling than one holding mostly BTC and ETH. That is a design property, not a measure of competence.

The FBI alert asks THORChain node operators, RPC providers, instant swap services, DeFi protocols and analytics firms to block the identified addresses, including funds "derived from" them. That request is itself an admission of the problem: once the money is in a bearer asset with no issuer, all that is left is closing the exits.

## 6. What other teams can take from this

Ignore the dollar figure. The attack generalises precisely because every ingredient is ordinary. In rough priority order:

1. **Deployment credentials should not live on developer endpoints.** A token that can deploy containers, sitting on a wallet engineer's laptop, is the production key hanging on a personal machine. Short-lived credentials, workload identity binding and on-demand issuance buy you more than another endpoint agent.
2. **Run technical assignments in disposable environments.** That recruitment is an attack surface is settled; the gap is that most programmes stop at "remind staff to be careful". The actual control is mechanical: external code only ever executes in a throwaway VM or sandbox, never on a host that can reach production. This rule needs no judgement, only enforcement.
3. **Write down whose authority internal AI tools run under.** If the answer is "the caller's", assume the caller will be compromised and gate high-risk actions. If it is "a service identity", cut that identity to the minimum. A system that is vague about this will not show up in a pen test and will be the first hop in a real intrusion.
4. **Put on-chain authorisation revocation into the drill schedule.** Fourteen minutes is fast, and that was Binance. Most playbooks have no entry for it at all, because whoever wrote them assumed stopping the service stops everything. EIP-7702 delegations, EIP-2612 `permit` signatures and every flavour of `approve` are the same shape: sign once, and it becomes state.
5. **Detect developer tooling that has been swapped.** Homebrew formulae, npm packages, IDE extensions, shell config, fonts — all of it is a supply channel. The detection point is not the file hash; it is "did the binary at this path change".
6. **Protect the recruiting identity too.** Attackers impersonate companies to reach candidates, and they impersonate candidates to reach companies. Your recruiters and hiring managers are running the first filter on the attacker's behalf, whether they know it or not.

### What each step should leave behind

All six points above reduce the chance of being useful to an attacker. That is half of defence. The other half is **noticing that it is happening**. Spread the chain out and the five stages leave quite different traces:

| Stage | Suspicious signal | Log source or detection logic |
| --- | --- | --- |
| Delivery | Installers or repositories pulled from a non-allowlisted domain; unsigned, unnotarised binaries on a developer endpoint | Process trees under `brew`, `git`, `curl`; download origin disagreeing with the formula's declared source; endpoint file integrity baseline |
| Tool swapped | Binary hash changes under a toolchain path; a tool process opening outbound connections it never normally opens | File integrity monitoring on developer endpoints; egress allowlist; DNS entropy and beacon periodicity |
| Pivot via the AI tool | A service identity producing (caller → target) pairs it has never produced before | `actor`, `on_behalf_of` and `target` in the application audit log; alerts on permission changes |
| Container deploy | A human identity rather than CI creating a workload; image outside the registry allowlist; `privileged` or `hostPath` in the pod spec | Kubernetes audit log on `create pods` and `create serviceaccounts/token`; admission controller rejections |
| Signing request | A signing event with no matching business record; requests from a workload outside the approved set | Reconcile the signing service audit log against the ledger; alert on missing dual control |

That table is generic detection design, not a reconstruction of Binance's telemetry. Their log coverage has not been published.

One distribution problem is easy to miss: detection for the first two stages sits almost entirely on **developer endpoints**, while the last three sit on **the cluster and the signing service**. Most teams spend their detection budget on the latter, because that is what counts as production. On this chain, though, the cheapest place to intercept is stage one — a binary that should not exist at that path.

### What point one looks like on Kubernetes

"Deployment credentials should not live on developer endpoints" comes down to three settings in practice: nothing auto-mounted, a token that expires, and permissions narrowed to a single name.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: wallet-deployer
  namespace: payments
automountServiceAccountToken: false          # nothing mounted by default; ask for a token explicitly
---
apiVersion: v1
kind: Pod
metadata:
  name: deploy-runner
  namespace: payments
spec:
  serviceAccountName: wallet-deployer
  containers:
    - name: runner
      image: registry.internal/deploy-runner:1.4.2
      volumeMounts:
        - name: token
          mountPath: /var/run/secrets/tokens
          readOnly: true
  volumes:
    - name: token
      projected:
        sources:
          - serviceAccountToken:
              path: token
              audience: deploy.internal
              expirationSeconds: 900         # 15 minutes; 600 is the floor
```

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deploy-wallet
  namespace: payments
rules:
  - apiGroups: ["apps"]
    resources: ["deployments"]
    resourceNames: ["wallet-api"]            # exactly one Deployment, by name
    verbs: ["patch", "get"]
```

Two things happen here: the scope of "what can be deployed" narrows from a namespace to a name, and the token's lifetime drops from indefinite to fifteen minutes.

Neither touches the delivery stage — that needs isolation. What it does is compress the usable window at stage four from "until somebody notices and rotates" to "fifteen minutes". In this incident, credentials were rotated in June, and yet on 20 October a token with container deployment permissions was still found on an engineer's machine. Whether it survived the June rotation or was issued afterwards is not disclosed. Either way the conclusion is the same: **rotation is an event; expiry is a state.**

## 7. What I still cannot confirm

A few things I am not sure about, which I would rather list than paper over:

- **How the signature was obtained.** The findings say the attackers reached the signing service and initiated unauthorised transactions. They do not say whether the signing API was called directly or a plausible authorisation request was constructed. An EIP-7702 delegation needs a signature from that account; this is the most important and least transparent link in the chain.
- **What makes up the gap between $6.34 bn and $6.36 bn.** A difference in valuation timing, or "affected" including assets that never moved? Binance has not broken it down.
- **The basis for the 98% figure.** Binance says it is measured against 31 October data. Prices move, so the same percentage maps to a different dollar amount on a different day. Treat it as a progress indicator, not a loss figure.
- **The capability boundary of the internal AI tool.** Information aggregation, or an agent that can execute actions on other machines? That decides whether step three was "read something it should not have" or "acted as a person against someone else's machine" — a difference of an order of magnitude.
- **Whether anything else happened between 20 and 29 October.** Nine quiet days look like reconnaissance and staging from the attacker's side. The findings do not cover them.
- **The attribution itself.** The FBI and TRM both point at TraderTraitor. Binance does not name anyone. Attribution is an intelligence judgement, not technical proof: on-chain flows can support it without settling it.

## 8. Closing

Three boundaries drawn in the wrong place produced the $6.34 billion.

**Production authority ended up on developer endpoints** — a deployment token and a reachable signing service, both entered through one engineer's laptop. **Containment stopped at remediation and never covered scope** — the device was replaced and the credentials rotated, but the org chart in the attacker's hands still worked. **On-chain state was decoupled from off-chain controls** — pausing withdrawals closed the workflow's entrance and did nothing about a delegation already in state.

None of that is new technology. EIP-7702 simply moved an old problem — authorisation — onto a ledger, where undoing it becomes an incident of its own.

The expensive part was not the $6.34 billion.

It was the three months between June and September, when **the response was considered complete.**

---

**Primary sources**: Binance's 3 November preliminary findings and 4 November recovery update (via [SecurityAffairs](https://securityaffairs.com/202369/cyber-crime/binance-hack-how-fake-job-interviews-and-ai-abuse-led-to-a-6-34-billion-attack.html)); the [FBI alert](https://securityaffairs.com/202221/apt/fbi-blames-north-korea-for-6-billion-binance-crypto-theft.html) and [FBI original](https://www.fbi.gov/investigate/cyber/alerts/2026/north-korea-responsible-for-6-billion-binance-attack); [TRM Labs on-chain analysis](https://www.trmlabs.com/resources/blog/north-korea-steals-usd-6-36-billion-from-binance-in-the-largest-hack-in-history); [EIP-7702 mechanics](https://docs.linea.build/protocol/eip-7702); [ThaiCERT summary](https://www.thaicert.or.th/en/2026/11/04/binance-discloses-cyberattack-affecting-billions-of-dollars-in-digital-assets/).
