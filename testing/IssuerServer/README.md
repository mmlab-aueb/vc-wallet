# Local Testing
A toy Issuer express server for local testing. The server does not require any authentication and always responds with the same Verifiable Credential. This server is -**Only**- used for testing the extension locally.

## Usage
From inside the IssuerServer install dependencies with
```bash
npm install
```
and start the server with
```bash
node server.js
```
You can then send Credential requests by adding http://localhost:3000/getvc/ as the Issuers URL in the extension (leaving the wallet password empty).
