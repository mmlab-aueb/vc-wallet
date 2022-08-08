# VC Wallet
The development of VC wallet continues [here](https://github.com/excid-io/vc-wallet)

A wallet for handling Verifiable Credentials implemented by the [ZeroTrustVC](https://mm.aueb.gr/projects/zerotrustvc) project. The wallet is implemented as a Firefox browser extension.

### Usage
You can use the extension by loading it as a temporary add-on from the `about:debugging` Firefox page (`about:debugging` -> `This Firefox` -> `Load Temporary Add-on` and click to any file on the directory of the extension).

To request a credential, click in the "Get Credential" button and supply the issuers end-point and the wallet credentials as `username:password`.

Each credential will have an `Aud` value, representing the RP for which this credential is intended. After the credential is successfully received from the Issuer, the wallet will insert it as a bearer token in each HTTP request made to the URL that this credential has as an `Aud` value.

You can view and delete credentials from the credentials tab of the wallet extension pop-up.
