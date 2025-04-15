import { google } from 'googleapis';

const credentials = {
  type: 'service_account',
  project_id: 'academic-works-423313-m9',
  private_key_id: '6c838f28a0491aaad6c54618fd37627602e8e2fe',
  private_key:
    '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDNZOh8a2om2Woh\n2tSH4pLdPH+ZRLFP7NuSb9ncghYNhxkdHo7TKsBmniPufztDC0oKtengEixjvPgB\noyUuDEhoqlITlD0kWRMduh79LGUYOjh1A1pM87bu3IXnrXn0Ae4fCYLxvssIcnsU\nMukb6nvaYoc2TssZ8kJls82h66PbX2GnBpRgVrG+0Z+kg76NFew/19qLSFCqGxZ3\nEDn5CPs4g9r4F4Fmj7C2uDZgPLJ9S+mEE7jz60xj6Guxwk45s4qj7DnDg1RN6rT5\n7LXcaH3SgXJETnWE722isKaHAsGI1V26TypIeM+bBa/PlHcxJ1XUJXBZPJCrmlhR\nX3C/brLXAgMBAAECggEAXMGH3nxx3WaNMAnPtigj1AaYx0JG4wXf6SNbG2KiC+zp\ncgWVUZb6eb1ME85gmHf2MZ0SqA78/fPeenrPdRq17pKQa2gkLpCNefzONt6ALy9H\nxMxFUQA1KmzrigOFUiU3AMw+VucncMKmg6o0LNe5pBef4W42+Zo20xAeutOcVZpP\n8Qhk8F2p8M3o3fKg8dDNwLlsBiafOVwbHFKFrDFI+cpQ5xM4Z36nrOmQ6RVv4282\n1LFS8TWUyVEGLk3ajPsf7Wm0DJpfy6WbLmxITYfsO/K+y5Mv02iMAB9OAxsaxKeT\nmjAqM4139xegN6eVzRsnGf9Vh86zZ1Ob0kKUeki8LQKBgQDoksyf8azlfcq3n59e\n/sqa+eVTrv02wb7yh9l2sew++ZjznlJJqrltla94Q72EOJOr6RXBtwnBWX3Wi0Za\nfhS+RZoPTC6ZnaOa85D2Djnzhfxgh3WoKiY6yHwNCX/SYToLwOVqaP7GIK9qKMm7\nw0by+wc2G35bEfeRaqwV2pjZLQKBgQDiFUHSako70DyPCopUxA70hKtAWQdtYIxv\nofVOdBYqGatp2Em+a5SZ4V28XxZt24wlivi1vgHn6cCjYoVxKKyBJ6dmay7kY3Ko\nl8FfTXkFL5dV1XJbN5Hkt+pgJeb6Ngkkkv1xj6+0KUwlG+odEKaXb9OAtFqcZIFQ\nfh0sTtS2kwKBgA/TzbEk1UtY4C7W4hWo6UjasMydIAZV8RS4Qghd22H9wnbx00/I\nGo5mnWZl1cPlxcbxOdXRCwzpdjLfj44g/nBkdDOOT62MmNG2uarFFRSJjb9T+KHV\nHHzrn+WTO+upSjX6jqJLOuto1gc3d2MbyvxGMRtxi4vPETYIOGXUVoqRAoGBAJ5c\nqXiMP2daW7EOfwsVMiyQ6avvMMaqxHRFjCDiK8xdorZHbJBXpwWK2S/jo0BccvSx\nPbmAWLFsCSXpEvPKu9rUPev91CDikCQL+MWa7NR3G5hiJPJEIIuHUEL9CafmRc06\nsRDkxvx5mP69aOXnDeoxyIL00iuOMw6A6EprBZDFAoGBAOVcZ9N/wlBi8On2lW+m\n0jB2fSHIGb/+IwHT0WKL4xdVZiDjEBfzj4Hv0lUIDgNFULg/7Es8OkDLyxTxxKUN\nmmdaZngZEXFOx+qRTM3+LXnwFQvz427KFe0/kOt6T5B3T46ZHAle8p63qNC0DXQy\nR4lF4uSCbeQVBi50KgMbi3G/\n-----END PRIVATE KEY-----\n',
  client_email: 'dodobot@academic-works-423313-m9.iam.gserviceaccount.com',
  client_id: '117705407104864410371',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url:
    'https://www.googleapis.com/robot/v1/metadata/x509/dodobot%40academic-works-423313-m9.iam.gserviceaccount.com',
  universe_domain: 'googleapis.com',
};

const auth = new google.auth.JWT(credentials.client_email, undefined, credentials.private_key.replace(/\\n/g, '\n'), [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
]);

export const sheetsApi = google.sheets({ version: 'v4', auth });
