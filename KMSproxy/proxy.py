import boto3
from jwcrypto.common import base64url_encode
import json
from werkzeug.wrappers import Request, Response

# TODO
def app(request):
    return

kms_client = boto3.client('kms')

key_id = 'arn:aws:kms:us-east-2:356972581671:key/2a00b08b-5b7f-4798-a058-edb3a318672e'
jws_header = {"alg": "RS256", "typ": "JWT"}
jws_body = {"jti":"testoken"}
header = base64url_encode(json.dumps(jws_header))
body = base64url_encode(json.dumps(jws_body))
Message =  str.encode(header + "." + body)

response = kms_client.sign(
    KeyId=key_id,
    Message =Message,
    SigningAlgorithm='RSASSA_PKCS1_V1_5_SHA_256',
     MessageType='RAW'
)

signature = base64url_encode(response['Signature'])

print(header + "." + body + "." + signature)