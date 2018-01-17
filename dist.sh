#!/bin/bash

commitId=$(git rev-parse HEAD)

pkgName=$(cat metadata.json|grep uuid|cut -d'"' -f4|cut -d'@' -f1)
pkgFileName="${pkgName}.zip"

url=$(cat metadata.json|grep url|cut -d'"' -f4)

echo "Now packaging version ${commitId} into ${pkgFileName}"
echo -e "Repository url: ${url}\nCommit ID: ${commitId}" > VERSION

zip -j ${pkgFileName} VERSION metadata.json extension.js
