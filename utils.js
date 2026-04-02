// constants - flags pass to access() { like modes: exists, read, write, execute }
// extname - gets the extension from a path (.txt, .png, .html)
// join - joins path segments together (like /home/user/file.txt)
// mkdirp - creates a directory and all its parent directories if they don't exist
// slug - converts a string to a slug (like /home/user/file.txt -> home-user-file-txt)
import { constants, access } from 'fs'
import { extname, join } from 'path'
import { mkdirp } from 'mkdirp'
import slug from 'slug'
import { Parser } from 'htmlparser2'

export function exists(filePath, cb) {
  access(filePath, constants.F_OK, err =>{
    if (err) {
      if (err.code === 'ENOENT') {
        // file does not exist
        return cb(null, false)
      } 
      // unexpected error checking the file
      return cb(err)
    }

    // the file exists
    return cb(null, true)
  })
}

export function urlToFilename(url) {
  // returns an object with href, origin, ..., pathname, hostname, etc.
  const parsedUrl = new URL(url)

  // returns an array of strings from the pathname 
  // for https://www.github.com/AmartyaRaman, pathname is /AmartyaRaman
  // splitting by '/' gives ['', 'AmartyaRaman']
  const urlComponents = parsedUrl.pathname.split('/')

  const originalFileName = urlComponents.pop()
  const urlPath = urlComponents
    .filter(component => component !== '')
    .map(component => slug(component, { remove: null }))
    .join('/')

  const basePath = join(parsedUrl.hostname, urlPath)
  const missingExtension = !originalFileName || extname(originalFileName) === ''
  if (missingExtension) {
    return join('downloaded', basePath, originalFileName, 'index.html')
  } 
  
  return join('downloaded', basePath, originalFileName)
}

export function get(url, cb) {
  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.statusText}`)
      }
      // NOTE: this loads all the content in memory and therefore is not suitable
      // to handle large payloads.
      // For large payloads, we would need to use a stream-based approach

      // response.arrayBuffer() takes the stream of data from the network and turns it into a raw binary chunk (ArrayBuffer), which you then wrap in a Node.js Buffer to make it usable with other Node.js functions (like fs.writeFile)
      return response.arrayBuffer()
    })
    .then(content => cb(null, Buffer.from(content)))
    .catch(err => cb(err))
}

// NOTE: this function is just for illustrative purposes. We are wrapping
// mkdirp in a callback-based API because at this point of the book we want
// to demonstrate callback based patterns
export function recursiveMkdir(path, cb) {
  mkdirp(path)
    .then(() => cb(null))
    .catch(e => cb(e))
}

export function getPageLinks(currentUrl, body) {
  const url = new URL(currentUrl)
  const internalLinks = []

  const parser = new Parser({
    onopentag(name, attr) {
      if (name === 'a' && attr.href) {
        const newUrl = new URL(attr.href, url)
        if (
          newUrl.pathname !== url.pathname &&
          newUrl.hostname === url.hostname
        ) {
          internalLinks.push(newUrl.href)
        }
      } 
    }
  })
  parser.end(body)

  return internalLinks
}