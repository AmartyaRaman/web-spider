import { readFile, writeFile } from 'node:fs'
import { dirname } from 'node:path'
import { exists, get, recursiveMkdir, urlToFilename, getPageLinks } from './utils.js'

function saveFile(filename, content, cb) {
  recursiveMkdir(dirname(filename), err => {
    if (err) {
      return cb(err);
    }
    writeFile(filename, content, cb);
  })
}

function download(url, filename, cb) {
  console.log(`Downlaoding ${url} into ${filename}`)
  get(url, (err, content) => {
    if (err) {
      return cb(err)
    }
    saveFile(filename, content, err => {
      if (err) {
        return cb(err)
      }
      cb(null, content)
    })
  })
}

function spiderLinks(currentUrl, body, maxDepth, cb) {
  if (maxDepth === 0) {
    // To prevent Zalgo, this function is designed to always
    // invoke its callback asynchronously.
    return process.nextTick(cb)
  }

  const links = getPageLinks(currentUrl, body)
  if (links.length === 0) {
    return process.nextTick(cb)
  }

  // function iterate(index) {
  //   if (index === links.length) {
  //     return cb()
  //   }

  //   spider(links[index], maxDepth - 1, err => {
  //     if (err) {
  //       return cb(err)
  //     }
  //     iterate(index + 1)
  //   })
  // }

  let completed = 0
  let hasErrors = false

  function done(err) {
    if (err) {
      hasErrors = true
      return cb(err)
    }

    if (++completed === links.length && !hasErrors) {
      return cb()
    }

  }

  for (const link of links) {
    spider(link, maxDepth - 1, done)
  }
}

const spidering = new Set()

export function spider(url, maxDepth, cb) {
  if (spidering.has(url)) {
    return process.nextTick(cb)
  }
  spidering.add(url)

  const filename = urlToFilename(url)

  exists(filename, (err, alreadyExists) => {
    if (err) {
      // error checking the file
      return cb(err)
    }

    if (alreadyExists) {
      if (!filename.endsWith('.html')) {
        return cb()
      }
      return readFile(filename, 'utf8', (err, fileContent) => {
        if (err) {
          // error reading the file
          return cb(err)
        }
        return spiderLinks(url, fileContent, maxDepth, cb)
      })
    }

    // The file does not exist, download it
    download(url, filename, (err, fileContent) => {
      if (err) {
        // error downloading the file
        return cb(err)
      }
      // if the file is an HTML file, spider it
      if (filename.endsWith('.html')) {
        return spiderLinks(url, fileContent.toString('utf8'), maxDepth, cb)
      }
      // otherwise, stop here
      return cb()
    })
  })
}