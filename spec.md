# 1\. Core Primitives

## Identity \- `User`

A user is defined entirely by their Ed25519 keypair:

* **Private key:** 32 bytes, kept secret, used to sign messages  
* **Public key:** 32 bytes, shared openly, used to verify signatures  
* **Fingerprint:** `SHA-512(public_key)[0:8]` — 8 byte stable identifier

The fingerprint is a *convenience reference*, not a security boundary. Full public keys must be exchanged out-of-band or embedded in messages for verification.

## Attestation \- `Message`

A message is a signed, directed link from one user to another, carrying an arbitrary structured payload.

* **From**: user fingerprint — encodes the signer’s fingerprint  
* **To:** user fingerprint — encodes the target’s fingerprint  
* **Payload**: arbitrary key-value data — duplicate keys are allowed  
* **Nonce**: 16 bytes — random value to prevent duplicate messages  
* **Fingerprint:** `SHA-512(Message)[0:8]` — 8 byte stable identifier  
* **Signature:** 64 bytes — Ed25519 signature over the above properties

Message payloads are open-ended by design. To prevent collisions, all property keys follow the format of `<namespace>:<key>`. Namespaces are short, lowercase identifiers. The `a.*` namespace family is reserved for the standard protocols defined below. Unofficial namespaces should be in reverse domain name notation.

# 2\. General Properties

| Name | Type | Description |
| :---- | :---- | :---- |
| a:msg | string | human-readable string description or note |
| a:ts | timestamp | claimed issuance timestamp |

# 3\. Blockchain

The blockchain protocol allows arbitrary messages to be linked together, making deletion detectable by any verifier who holds the chain. Each message in a chain carries an `a.ch:prev` key whose value is the fingerprint of the previous message issued by the same sender. A message with no `a.ch:prev` key is treated as the root of its chain.

| Name | Type | Description |
| :---- | :---- | :---- |
| a.ch:prev | message fingerprint | previous message |

Chain participation is optional. Messages without `a.ch:prev` are standalone and make no integrity guarantees. However, if a chain is formed, the order and integrity of the inner messages is guaranteed. In the event that a gap or fork is detected, a verifier should treat the entire chain as untrustworthy.

# 4\. Identity

The identity protocol encodes verified real-world identity attributes as a signed attestation. Rather than requiring users to self-assert their identity — which would carry no more weight than any unverifiable claim — the protocol delegates verification to a trusted third party. The verifier conducts whatever out-of-band verification is appropriate for the identity outlet in question, such as an OAuth flow with ORCID or an email confirmation, and then enshrines the result by issuing a signed message from themselves to the user being attested. The payload of that message contains the verified attributes as `a.id:*` properties.

| Name | Type | Description |
| :---- | :---- | :---- |
| a.id:first\_name | string | Legal first name |
| a.id:middle\_name | string | Legal middle name |
| a.id:last\_name | string | Legal last name |
| a.id:email | string | Attested email |

