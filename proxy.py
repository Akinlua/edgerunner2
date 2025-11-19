import requests
url = 'https://ip.decodo.com/json'
username = 'spunpat7r0'
password = 'o6H1g7i8tKWzcjKk=y'
proxy = f"http://spunpat7r0:o6H1g7i8tKWzcjKk=y@ng.decodo.com:42001"
result = requests.get(url, proxies = {
    'http': proxy,
    'https': proxy
})
print(result.text)