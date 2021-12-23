# Local Testing
A toy Verifier express server for local testing. The server requires a credential and a DPoP to return a photo acting as a protected resourses. Neither the credential or the DPoP are actually validated, the toyVerifier just checks if there are present. This server is -**Only**- used for testing the extension locally.

## Usage
From inside the IssuerServer install dependencies with
```bash
npm install
```
and start the server with
```bash
node server.js
```
You can then visit http://localhost:3001 and request to see a photo by clicking the ```Get!``` button. If there is a saved credential for that protected resource (i.e., with audience http://localhost:3001/photos/) the extension will ask for permission to use it. If the user presses OK, the extension will add the authorization and dpop headers to the request. If the headers are not present the server will answer with a 401.