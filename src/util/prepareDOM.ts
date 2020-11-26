const root = document.createElement('div')
root.setAttribute('id', 'root')
document.body.appendChild(root)

const contentSecurityPolicy = document.createElement('meta')
contentSecurityPolicy.setAttribute('http-equiv', 'Content-Security-Policy')
contentSecurityPolicy.setAttribute('content', "default-src 'self'")
document.head.appendChild(contentSecurityPolicy)

export default root